-- Seed: porta in regola con i mantenimenti gli operatori di prova (≥36 ore approvate quest'anno)
-- Eseguire DOPO seed-mantenimenti.sql. Idempotente: se rieseguito non aggiunge nulla
-- a chi è già in regola. Cancellabile con: delete from mantenimenti where note_seed is true;

alter table mantenimenti add column if not exists note_seed boolean;

-- 1) ore approvate quest'anno per operatore di prova
create or replace temp view ore_attuali as
  select m.operatore_id, sum(m.ore) as tot
  from mantenimenti m
  join profili p on p.id = m.operatore_id
  where p.email like 'prova.%'
    and m.stato = 'approvato'
    and m.data >= date_trunc('year', now())
  group by m.operatore_id;

-- 2) per chi è sotto soglia: un mantenimento "corposo" che completa le ore mancanti (+2 di margine)
insert into mantenimenti (operatore_id, data, tipo, argomento, ore, stato, validato_da, validato_il, note_seed)
select
  oa.operatore_id,
  (now() - interval '30 days')::date,
  'Mantenimento',
  'Ciclo di mantenimento annuale',
  greatest(4, ceiling(36 - oa.tot + 2))::numeric(4,1),
  'approvato',
  null,
  now(),
  true
from ore_attuali oa
where oa.tot < 36;

-- 3) verifica finale: operatori di prova ancora sotto soglia (aspettarsi 0)
-- select count(*) from (
--   select m.operatore_id, sum(m.ore) tot from mantenimenti m
--   join profili p on p.id = m.operatore_id
--   where p.email like 'prova.%' and m.stato='approvato' and m.data >= date_trunc('year', now())
--   group by m.operatore_id having sum(m.ore) < 36
-- ) x;
