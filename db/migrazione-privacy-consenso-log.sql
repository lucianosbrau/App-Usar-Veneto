-- Migrazione: consenso privacy + log consultazioni admin + admin non modifica profili
-- Eseguire in SQL Editor.

-- =====================================================================
-- 1) CONSENSO PRIVACY
-- Marca temporale dell'accettazione dell'informativa da parte dell'operatore
-- =====================================================================

alter table profili add column if not exists privacy_consenso_il timestamptz;

-- =====================================================================
-- 2) LOG CONSULTAZIONI (sola lettura da parte degli admin)
-- Ogni volta che un admin apre la scheda di un operatore viene registrato
-- CHI ha consultato, CHI è stato consultato e QUANDO. Append-only:
-- nessuna insert/update/delete possibile dal client, solo via RPC.
-- =====================================================================

create table if not exists log_consultazioni (
  id bigserial primary key,
  admin_id uuid constraint log_cons_admin_fkey references profili(id) on delete set null,
  operatore_id uuid constraint log_cons_op_fkey references profili(id) on delete cascade,
  azione text not null default 'scheda_operatore',
  creato_il timestamptz not null default now()
);

alter table log_consultazioni enable row level security;

drop policy if exists "admin legge consultazioni" on log_consultazioni;
create policy "admin legge consultazioni" on log_consultazioni for select
  using (exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));

-- L'OPERATORE PUO' VEDERE CHI HA CONSULTATO LA PROPRIA SCHEDA (trasparenza)
drop policy if exists "operatore legge consultazioni di se stesso" on log_consultazioni;
create policy "operatore legge consultazioni di se stesso" on log_consultazioni for select
  using (operatore_id = auth.uid());

create or replace function registra_consultazione(target uuid, azione text default 'scheda_operatore') returns void as $$
begin
  if auth.uid() is null then raise exception 'Non autenticato'; end if;
  if not exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin') then
    raise exception 'Solo un amministratore puo'' registrare consultazioni';
  end if;
  insert into log_consultazioni (admin_id, operatore_id, azione)
  values (auth.uid(), target, coalesce(azione, 'scheda_operatore'));
end;
$$ language plpgsql security definer;

revoke all on function registra_consultazione(uuid, text) from public;
grant execute on function registra_consultazione(uuid, text) to authenticated;

-- =====================================================================
-- 3) L'ADMIN NON MODIFICA I DATI DEGLI OPERATORI
-- Restano possibili SOLO: promozione/revoca del ruolo (trigger esistente)
-- e l'eliminazione account (RPC elimina_operatore). Ogni altra modifica
-- della riga di un ALTRO utente da parte di un admin viene bloccata.
-- =====================================================================

create or replace function blocca_modifiche_admin() returns trigger as $$
begin
  if auth.uid() is null then return new; end if;
  if auth.uid() = new.id then return new; end if;               -- ognuno modifica se stesso
  if coalesce(current_setting('request.jwt.claims', true), '') like '%"role":"service_role"%' then
    return new;                                                  -- bot/servizi
  end if;
  if new.ruolo is distinct from old.ruolo then return new; end if; -- promozione/revoca: consentita
  if exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin') then
    raise exception 'Gli amministratori non possono modificare i dati degli operatori: l''operatore li aggiorna dal proprio Profilo';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_blocca_modifiche_admin on profili;
create trigger trg_blocca_modifiche_admin before update on profili
  for each row execute function blocca_modifiche_admin();
