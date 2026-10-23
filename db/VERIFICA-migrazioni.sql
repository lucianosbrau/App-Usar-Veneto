-- VERIFICA MIGRAZIONI (24/10/2026): eseguire in SQL Editor e mandare il risultato all'assistenza.
-- È SOLO LETTURA: non modifica nulla.

-- 1) Migrazione MANTENIMENTI v2: esiste la colonna ore_conteggiate?
select 'MANTENIMENTI v2' as verifica,
  case when exists (
    select 1 from information_schema.columns
    where table_name = 'mantenimenti' and column_name = 'ore_conteggiate'
  ) then '✅ ESEGUITA (colonna ore_conteggiate presente)'
  else '❌ NON ESEGUITA (manca la colonna ore_conteggiate)'
  end as risultato;

-- 2) Migrazione SEDI: la tabella sedi è popolata?
select 'SEDI' as verifica,
  case when (select count(*) from sedi) > 0
  then '✅ ESEGUITA — ' || (select count(*) from sedi) || ' sedi caricate'
  else '❌ NON ESEGUITA (tabella sedi vuota o inesistente)'
  end as risultato;

-- 3) SOGLIA 24: valore attuale dell'impostazione
select 'SOGLIA MANTENIMENTI' as verifica,
  'valore attuale: ' || valore as risultato
from impostazioni where chiave = 'soglia_ore_mantenimenti';

-- 4) Extra: la causale "Manutenzione e magazzino" è ammessa? (riga visibile solo se v2 eseguita)
select 'CAUSALE MAGAZZINO' as verifica,
  case when exists (
    select 1 from pg_constraint
    where conname = 'mantenimenti_tipo_check'
    and pg_get_constraintdef(oid) like '%Manutenzione e magazzino%'
  ) then '✅ presente nel vincolo dei tipi'
  else '❌ NON presente (vincolo non aggiornato)'
  end as risultato;
