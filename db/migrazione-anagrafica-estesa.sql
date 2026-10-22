-- Migrazione: anagrafica estesa (scheda dettaglio operatore)
-- Eseguire in SQL Editor. Campi pronti per l'import dal Google Sheet del nucleo.

alter table profili add column if not exists cellulare text;
alter table profili add column if not exists indirizzo text;
alter table profili add column if not exists contatto_ice_nome text;
alter table profili add column if not exists contatto_ice_telefono text;
alter table profili add column if not exists contatto_ice_relazione text;
alter table profili add column if not exists medico_curante text;
alter table profili add column if not exists gruppo_sanguigno text;

comment on column profili.cellulare is 'Numero di cellulare personale';
comment on column profili.indirizzo is 'Indirizzo di residenza';
comment on column profili.contatto_ice_nome is 'ICE: nome del contatto in emergenza';
comment on column profili.contatto_ice_telefono is 'ICE: telefono del contatto in emergenza';
comment on column profili.contatto_ice_relazione is 'ICE: relazione con l operatore (es. coniuge, figlio)';
comment on column profili.medico_curante is 'Nome del medico curante';
comment on column profili.gruppo_sanguigno is 'Gruppo sanguigno (0-, 0+, A-, A+, B-, B+, AB-, AB+)';

-- NOTA su privacy: questi dati (ICE, medico, indirizzo, gruppo sanguigno) sono
-- visibili SOLO agli admin: la lettura profili è authenticated ma la scheda
-- dettaglio è una pagina admin. Il trigger trg_proteggi_ruolo impedisce
-- modifiche del ruolo da parte di non-admin (già attivo).
