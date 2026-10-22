-- Seed: mantenimenti fittizi per test dello stato del personale
-- Eseguire in SQL Editor. Ripetibile: cancella i seed precedenti prima di ricreare.
-- Pulizia completa: delete from mantenimenti where note_seed is true;
--                alter table mantenimenti drop column if exists note_seed;

alter table mantenimenti add column if not exists note_seed boolean;

delete from mantenimenti where note_seed is true;

-- distribuzione realistica: alcuni in regola (>=36h), alcuni quasi, alcuni sotto
insert into mantenimenti (operatore_id, data, tipo, argomento, ore, stato, validato_da, validato_il, note_seed)
select
  p.id,
  (now() - (random() * 200 || ' days')::interval)::date,
  (array['Mantenimento','Manovra','Intervento','Lavorazione','Tutor Mantenimento','Tutor Corso','Altra formazione'])[1 + floor(random() * 7)],
  (array['Taglio e puntellazione','Ricerca tecniche K9','NBCR base','Sicurezza sito','Movimentazione carichi','Primo soccorso','Uso strumentazione'])[1 + floor(random() * 7)],
  round((2 + random() * 6)::numeric, 1),
  'approvato',
  null,
  now(),
  true
from profili p
where p.email like 'prova.%'
  and random() < 0.55;  -- circa metà degli operatori di prova ha storico

-- per gli "in regola": aggiunge un blocco di ore concentrate (simula anno svolto)
insert into mantenimenti (operatore_id, data, tipo, argomento, ore, stato, validato_da, validato_il, note_seed)
select
  p.id,
  (now() - (random() * 150 || ' days')::interval)::date,
  'Mantenimento',
  'Esercitazione modulo completo',
  12,
  'approvato',
  null,
  now(),
  true
from profili p
where p.email like 'prova.%'
  and random() < 0.35;

-- alcuni mantenimenti IN VALIDAZIONE (per la coda admin)
insert into mantenimenti (operatore_id, data, tipo, argomento, ore, stato, note_seed)
select
  p.id,
  (now() - (random() * 30 || ' days')::interval)::date,
  'Manovra',
  'Manovra con mezzi',
  4,
  'in_validazione',
  true
from profili p
where p.email like 'prova.%'
  and random() < 0.15;
