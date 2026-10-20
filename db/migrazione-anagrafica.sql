-- Migrazione: campi anagrafici e qualifiche dei profili
-- Eseguire nella SQL Editor di Supabase.

alter table profili add column if not exists grado text;
alter table profili add column if not exists comando text;
alter table profili add column if not exists sede text;
alter table profili add column if not exists turno text;
alter table profili add column if not exists salto_turno text;
alter table profili add column if not exists nbcr int default 0;
alter table profili add column if not exists saf text;
alter table profili add column if not exists tpss boolean not null default false;
alter table profili add column if not exists tas int;

comment on column profili.grado is 'D, VD, IA, CRE, CR, CSE, CS, VC, VE, VF — CRE/CR/CSE/CS sono ROS (capisquadra/caporeparto)';
comment on column profili.nbcr is 'Livello NBCR: 0-3 (3 = specializzazione obbligatoria del modulo)';
comment on column profili.saf is 'SAF: 1A, 2A, Basico, Avanzato — per il modulo contano solo 2A e Avanzato';
comment on column profili.tas is 'TAS: null, 1, 2';
