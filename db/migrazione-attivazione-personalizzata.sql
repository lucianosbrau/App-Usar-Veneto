-- Migrazione: attivazione personalizzata
-- Eseguire in SQL Editor (dopo migrazione-manifesti.sql)

-- 1) consenti il team 'personalizzata' nelle attivazioni
alter table attivazioni drop constraint if exists attivazioni_team_check;
alter table attivazioni add constraint attivazioni_team_check
  check (team in ('alpha', 'bravo', 'personalizzata'));

-- 2) il manifesto di un'attivazione personalizzata può non avere team fisso
alter table manifesti drop constraint if exists manifesti_team_check;
alter table manifesti add constraint manifesti_team_check
  check (team in ('alpha', 'bravo', 'personalizzata'));
