-- Migrazione MANTENIMENTI v2 (24/10/2026, decisioni utente)
-- 1) Nuova colonna ORE CONTEGGIATE: è il riferimento per la soglia (24h)
-- 2) Nuova causale "Manutenzione e magazzino": conta solo il 50% delle ore
-- Eseguire in SQL Editor.

-- Colonna ore_conteggiate: per i record esistenti = ore (nessuna causale 50% finora)
alter table mantenimenti add column if not exists ore_conteggiate numeric(4,1);
update mantenimenti set ore_conteggiate = ore where ore_conteggiate is null;

-- La causale "Manutenzione e magazzino" entra nel CHECK dei tipi
alter table mantenimenti drop constraint if exists mantenimenti_tipo_check;
alter table mantenimenti add constraint mantenimenti_tipo_check check (tipo in (
  'Mantenimento', 'Manovra', 'Intervento', 'Lavorazione',
  'Tutor Mantenimento', 'Tutor Corso', 'Altra formazione',
  'Manutenzione e magazzino'
));

-- Le PROCEDURE che scrivono mantenimenti calcolano ore_conteggiate:
-- 50% per 'Manutenzione e magazzino', altrimenti = ore
create or replace function calcola_ore_conteggiate() returns trigger as $$
begin
  if new.ore_conteggiate is null then
    new.ore_conteggiate := case when new.tipo = 'Manutenzione e magazzino'
      then round(new.ore * 0.5, 1) else new.ore end;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ore_conteggiate on mantenimenti;
create trigger trg_ore_conteggiate before insert or update of ore, tipo on mantenimenti
  for each row execute function calcola_ore_conteggiate();

-- NB (import): i record importati con ore_conteggiate esplicito NON vengono ricalcolati
-- (il trigger interviene solo se ore_conteggiate is null). L'import scriverà
-- ore = ORE PRESTATE del foglio e ore_conteggiate = ORE REALI PRESTATE.
