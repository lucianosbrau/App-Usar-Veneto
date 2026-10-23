-- =====================================================================
-- FASE 1 — MIGRAZIONE SPECIALIZZAZIONI (NUOVO SCHEMA)
-- ATTENZIONE: NON ESEGUIRE ADESSO. Eseguire solo dopo:
--   1) backup del database (Supabase → Database → Backups)
--   2) aver letto il CONTINUITA.md (sez. "FASE 1 runbook")
-- Progettata per NON TOCCARE ciò che esiste: le colonne nuove si
-- aggiungono a fianco di quelle vecchie; le vecchie restano finché
-- l'import non è verificato (rimozione a fine FASE 1, separatamente).
-- =====================================================================

-- 1) NUOVI CAMPI SPECIALIZZAZIONI sul profilo (a fianco dei vecchi)
alter table profili add column if not exists sp_funzionario boolean default false;      -- SI/NO, priorità posti 1-3
alter table profili add column if not exists sp_staff boolean default false;            -- SI/NO (admin), 📝, priorità 4-6
alter table profili add column if not exists sp_logista boolean default false;         -- SI/NO (admin), muletto, priorità 33-38
alter table profili add column if not exists sp_strutturista boolean default false;     -- SI/NO (compilabile, admin con log)
alter table profili add column if not exists sp_nbcr int default 0;                    -- 0,1,2,3; icona con numero per 2 e 3
alter table profili add column if not exists sp_nbcr_est text;                          -- NR/LPG/LNG (mai in tendina)
alter table profili add column if not exists sp_k9 boolean default false;              -- Unità cinofila K9
alter table profili add column if not exists sp_saf text;                               -- 1A | 1B - BASICO | 2A - AVANZATO
alter table profili add column if not exists sp_sapr boolean default false;            -- SI/NO (senza icona)
alter table profili add column if not exists sp_medico boolean default false;          -- SI/NO (senza icona)
alter table profili add column if not exists sp_infermiere boolean default false;      -- SI/NO (senza icona)
-- TAS esiste già (tas int: 1/2); TPSS: COLONNA VECCHIA — non la tocchiamo qui,
-- verrà rimossa a fine FASE 1 dopo verifica (l'app non la userà più)

-- 2) NUOVI CAMPI ANAGRAFICI (dal foglio DATI ANAGRAFICI)
alter table profili add column if not exists codice_fiscale text;
alter table profili add column if not exists data_nascita date;
alter table profili add column if not exists luogo_nascita text;
alter table profili add column if not exists email_servizio text;                      -- @vigilfuoco.it
alter table profili add column if not exists corso_usar date;                          -- data corso USAR
alter table profili add column if not exists missioni_int boolean default false;       -- SI/NO (futura sezione Internazionale)

-- 3) TABELLA CAPI (cane + vaccini) — creata qui, popolata in FASE 2
create table if not exists cani (
  id text primary key,                                  -- ID_CANE del foglio
  operatore_id uuid not null references profili(id) on delete cascade,
  nome text,
  razza text,
  sesso text,
  data_nascita date,
  colore text,
  microchip text,
  microchip_data date,
  microchip_localita text
);
alter table cani enable row level security;
drop policy if exists "lettura cani autenticati" on cani;
create policy "lettura cani autenticati" on cani for select using (auth.role() = 'authenticated');
drop policy if exists "proprietario scrive cane" on cani;
create policy "proprietario scrive cane" on cani for all
  using (operatore_id = auth.uid()) with check (operatore_id = auth.uid());

create table if not exists cani_vaccini (
  id text primary key,                                  -- ID_VACCINICANE
  cane_id text not null references cani(id) on delete cascade,
  tipo_vaccino text,
  data_somministrazione date,
  scadenza date
);
alter table cani_vaccini enable row level security;
drop policy if exists "lettura vaccini autenticati" on cani_vaccini;
create policy "lettura vaccini autenticati" on cani_vaccini for select using (auth.role() = 'authenticated');
drop policy if exists "proprietario scrive vaccini" on cani_vaccini;
create policy "proprietario scrive vaccini" on cani_vaccini for all
  using (exists (select 1 from cani c where c.id = cane_id and c.operatore_id = auth.uid()))
  with check (exists (select 1 from cani c where c.id = cane_id and c.operatore_id = auth.uid()));

-- 4) TABELLA TAGLIE DPI (fogli RILEVAZIONE TAGLIE) — creata qui, popolata in FASE 2
create table if not exists taglie_dpi (
  id serial primary key,
  operatore_id uuid not null references profili(id) on delete cascade unique,
  tuta text, elmo text, intimo_termico text, scarponi text, guanti text,
  aggiornato_il timestamptz not null default now()
);
alter table taglie_dpi enable row level security;
drop policy if exists "lettura taglie autenticati" on taglie_dpi;
create policy "lettura taglie autenticati" on taglie_dpi for select using (auth.role() = 'authenticated');
drop policy if exists "proprietario scrive taglie" on taglie_dpi;
create policy "proprietario scrive taglie" on taglie_dpi for all
  using (operatore_id = auth.uid()) with check (operatore_id = auth.uid());

-- 5) LOG MODIFICHE SPECIALIZZAZIONI (admin modifica STAFF/LOGISTA/STRUTTURISTA ecc. con log)
create table if not exists log_modifiche_spec (
  id bigserial primary key,
  admin_id uuid references profili(id) on delete set null,
  operatore_id uuid references profili(id) on delete cascade,
  campo text not null,
  valore_precedente text,
  valore_nuovo text,
  modificato_il timestamptz not null default now()
);
alter table log_modifiche_spec enable row level security;
drop policy if exists "admin legge log spec" on log_modifiche_spec;
create policy "admin legge log spec" on log_modifiche_spec for select
  using (exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));
drop policy if exists "operatore legge log spec propri" on log_modifiche_spec;
create policy "operatore legge log spec propri" on log_modifiche_spec for select
  using (operatore_id = auth.uid());
-- la scrittura avviene via RPC security definer (come log_consultazioni)

-- 6) RPC per l'admin: modifica specializzazioni con LOG (in aggiunta al trigger
--    trg_blocca_modifiche_admin che vieta le modifiche anagrafiche: qui l'admin
--    può toccare SOLO i campi specializzazioni, con tracciatura)
create or replace function admin_modifica_spec(target uuid, campo text, valore_nuovo text) returns void as $$
declare
  admin_ruolo text; vecchio text; ammesso boolean;
begin
  if auth.uid() is null then raise exception 'Non autenticato'; end if;
  select ruolo into admin_ruolo from profili where id = auth.uid();
  if coalesce(admin_ruolo,'') <> 'admin' then raise exception 'Solo un amministratore'; end if;
  ammesso := campo in ('sp_staff','sp_logista','sp_strutturista','sp_funzionario','sp_sapr','sp_medico','sp_infermiere');
  if not ammesso then raise exception 'Campo non modificabile via questa funzione: %', campo; end if;
  execute format('select %I::text from profili where id = %L', campo, target) into vecchio;
  execute format('update profili set %I = %L where id = %L', campo, valore_nuovo::boolean, target);
  insert into log_modifiche_spec (admin_id, operatore_id, campo, valore_precedente, valore_nuovo)
  values (auth.uid(), target, campo, vecchio, valore_nuovo);
end;
$$ language plpgsql security definer;
revoke all on function admin_modifica_spec(uuid, text, text) from public;
grant execute on function admin_modifica_spec(uuid, text, text) to authenticated;
