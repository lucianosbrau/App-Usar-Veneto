-- Migrazione: foto profilo, eliminazione account da parte dell'admin, log attività admin
-- Eseguire in SQL Editor.

-- =====================================================================
-- 1) FOTO PROFILO
-- Campo sul profilo + bucket Storage pubblico (URL non indovinabile: percorso
-- con l'uuid dell'utente), upload SOLO nella PROPRIA cartella: <id-utente>/foto
-- (l'app mostra l'immagine con un semplice <img> senza URL firmati)
-- =====================================================================

alter table profili add column if not exists foto_path text;

insert into storage.buckets (id, name, public)
values ('foto-profili', 'foto-profili', true)
on conflict (id) do nothing;

drop policy if exists "foto upload propria cartella" on storage.objects;
create policy "foto upload propria cartella" on storage.objects for insert
  with check (bucket_id = 'foto-profili' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "foto update propria cartella" on storage.objects;
create policy "foto update propria cartella" on storage.objects for update
  using (bucket_id = 'foto-profili' and (storage.foldername(name))[1] = auth.uid()::text);

-- =====================================================================
-- 2) LOG ATTIVITÀ ADMIN
-- Tabella append-only: nessuna policy di insert/update/delete dal client.
-- Le righe sono scritte SOLO dai trigger/funzioni security definer.
-- Lettura consentita solo agli admin.
-- =====================================================================

create table if not exists log_admin (
  id bigserial primary key,
  admin_id uuid constraint log_admin_admin_fkey references profili(id) on delete set null,
  azione text not null check (azione in ('promozione_admin', 'revoca_admin', 'elimina_account')),
  dettaglio text,
  creato_il timestamptz not null default now()
);

alter table log_admin enable row level security;

drop policy if exists "admin legge log" on log_admin;
create policy "admin legge log" on log_admin for select
  using (exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));

-- Log automatico di promozioni/revocabili ruolo (trigger: impossibile aggirare)
create or replace function log_ruolo() returns trigger as $$
begin
  if auth.uid() is not null and new.ruolo <> old.ruolo then
    insert into log_admin (admin_id, azione, dettaglio)
    values (auth.uid(),
            case when new.ruolo = 'admin' then 'promozione_admin' else 'revoca_admin' end,
            coalesce(old.cognome, '') || ' ' || coalesce(old.nome, ''));
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_log_ruolo on profili;
create trigger trg_log_ruolo after update of ruolo on profili
  for each row execute function log_ruolo();

-- =====================================================================
-- 3) ELIMINAZIONE ACCOUNT (chiamata RPC dall'app admin)
-- Il client NON può cancellare righe di auth.users: la funzione
-- security definer verifica che il chiamante sia admin e registra il log.
-- Profili e dati collegati vengono rimossi a cascata.
-- =====================================================================

create or replace function elimina_operatore(target uuid) returns void as $$
declare
  admin_ruolo text;
  nominativo text;
begin
  if auth.uid() is null then
    raise exception 'Non autenticato';
  end if;
  if auth.uid() = target then
    raise exception 'Non puoi eliminare il tuo account';
  end if;
  select ruolo into admin_ruolo from profili where id = auth.uid();
  if coalesce(admin_ruolo, '') <> 'admin' then
    raise exception 'Solo un amministratore puo'' eliminare account';
  end if;
  select cognome || ' ' || nome into nominativo from profili where id = target;
  insert into log_admin (admin_id, azione, dettaglio)
  values (auth.uid(), 'elimina_account', coalesce(nominativo, target::text));
  delete from auth.users where id = target;
end;
$$ language plpgsql security definer;

revoke all on function elimina_operatore(uuid) from public;
grant execute on function elimina_operatore(uuid) to authenticated;
