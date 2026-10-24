-- Migrazione: esito dell'attivazione (distinguere ANNULLATA da AVVENUTA)
-- 24/10/2026 — da eseguire nel SQL Editor di Supabase

-- 1) nuovo campo esito: 'avvenuta' | 'annullata' (null finche' l'attivazione e' aperta)
alter table attivazioni add column if not exists esito text
  check (esito is null or esito in ('avvenuta', 'annullata'));

-- 2) le attivazioni gia' chiuse in passato contano come AVVENUTE
update attivazioni set esito = 'avvenuta' where chiusa is true and esito is null;

-- 3) indice per il resoconto mensile
create index if not exists attivazioni_creata_il_idx on attivazioni (creata_il);
