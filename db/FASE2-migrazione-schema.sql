-- ================================================================
-- FASE 2 MIGRAZIONE SCHEMA — sezioni Profilo: DOCUMENTI, MEDICA, VACCINAZIONI
-- 24/10/2026 — eseguire nel SQL Editor di Supabase (idempotente: rilanciabile)
-- Le tabelle CANI, CANI_VACCINI, TAGLIE_DPI esistono già (FASE1-migrazione)
-- ================================================================

-- 1) DOCUMENTI (foglio DOCUMENTI): patenti, documenti d'identità, passaporti
create table if not exists documenti (
  operatore_id uuid primary key references profili(id) on delete cascade,
  patente_civile_cat text,
  patente_civile_scadenza date,
  patente_min_cat text,                            -- I°/II°/III°/IV° (grado massimo; in profili.patente per l'operatività)
  patente_min_scadenza date,
  patente_nautica_cat text,
  patente_nautica_scadenza date,
  carta_identita_num text,
  carta_identita_scadenza date,
  tessera_ate_num text,
  tessera_ate_scadenza date,
  passaporto_civile_num text,
  passaporto_civile_scadenza date,
  passaporto_min_num text,
  passaporto_min_scadenza date
);
alter table documenti enable row level security;
drop policy if exists "proprietario legge documenti" on documenti;
create policy "proprietario legge documenti" on documenti for select
  using (operatore_id = auth.uid() or exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));
drop policy if exists "proprietario scrive documenti" on documenti;
create policy "proprietario scrive documenti" on documenti for all
  using (operatore_id = auth.uid()) with check (operatore_id = auth.uid());

-- 2) MEDICA (foglio MEDICA): gruppo sanguigno resta in profili (no doppioni)
create table if not exists scheda_medica (
  operatore_id uuid primary key references profili(id) on delete cascade,
  medico_base text,
  medico_telefono text,
  intolleranze text,
  alimentazione text,
  allergie text,
  problemi_medici text
);
alter table scheda_medica enable row level security;
drop policy if exists "proprietario e admin leggono medica" on scheda_medica;
create policy "proprietario e admin leggono medica" on scheda_medica for select
  using (operatore_id = auth.uid() or exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));
drop policy if exists "proprietario scrive medica" on scheda_medica;
create policy "proprietario scrive medica" on scheda_medica for all
  using (operatore_id = auth.uid()) with check (operatore_id = auth.uid());

-- 3) VACCINI — SCHEDA DI COPERTURA (foglio VACCINI: una riga per persona, ultimo richiamo per vaccino)
create table if not exists vaccini_copertura (
  operatore_id uuid not null references profili(id) on delete cascade,
  vaccino text not null,                           -- es. ANTIEPATITE A
  data_somministrazione date,                     -- data ultimo richiamo
  scadenza_anni int,                              -- scadenza consigliata dal foglio (2/5/10 anni, null se nessuna)
  primary key (operatore_id, vaccino)
);
alter table vaccini_copertura enable row level security;
drop policy if exists "proprietario e admin leggono copertura" on vaccini_copertura;
create policy "proprietario e admin leggono copertura" on vaccini_copertura for select
  using (operatore_id = auth.uid() or exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));
drop policy if exists "proprietario scrive copertura" on vaccini_copertura;
create policy "proprietario scrive copertura" on vaccini_copertura for all
  using (operatore_id = auth.uid()) with check (operatore_id = auth.uid());

-- 4) VACCINAZIONI — STORICO (foglio VACCINAZIONI: una riga per singola somministrazione)
create table if not exists vaccini_storico (
  id text primary key,                             -- ID_VACCINI del foglio
  operatore_id uuid not null references profili(id) on delete cascade,
  tipo_vaccino text,
  data_somministrazione date,
  scadenza date
);
alter table vaccini_storico enable row level security;
drop policy if exists "proprietario e admin leggono storico" on vaccini_storico;
create policy "proprietario e admin leggono storico" on vaccini_storico for select
  using (operatore_id = auth.uid() or exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));
drop policy if exists "proprietario scrive storico" on vaccini_storico;
create policy "proprietario scrive storico" on vaccini_storico for all
  using (operatore_id = auth.uid()) with check (operatore_id = auth.uid());
