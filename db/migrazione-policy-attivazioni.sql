-- Migrazione: policy di lettura mancanti (fix errore RLS "new row violates")
-- Eseguire in SQL Editor

-- 1) attivazioni: mancava la policy di SELECT — l'insert con .select() di ritorno
--    falliva con "new row violates row-level security policy"
drop policy if exists "lettura attivazioni" on attivazioni;
create policy "lettura attivazioni" on attivazioni for select using (true);

-- 2) aggiornamento attivazioni (chiudi attivazione) per admin
drop policy if exists "admin chiude attivazioni" on attivazioni;
create policy "admin chiude attivazioni" on attivazioni for update using (
  exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));

-- 3) pubblicazione su Squadre: colonna su programmi_mensili
alter table programmi_mensili add column if not exists pubblicato_su_squadre boolean not null default false;
