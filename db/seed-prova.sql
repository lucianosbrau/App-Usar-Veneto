-- SEED DATI PROVA — 50 operatori fittizi per testare la Programmazione
-- Eseguire DOPO migrazione-anagrafica.sql
-- CANCELLAZIONE (quando arrivano i dati reali):
--   delete from profili where email like 'prova.%';
--   delete from auth.users where email like 'prova.%';

create extension if not exists "pgcrypto";

-- 50 operatori fittizi: creiamo PRIMA gli utenti di login (auth.users), poi i profili collegati
with dati as (
  select
    v.nome, v.cognome, v.grado, v.comando, v.sede, v.turno, v.salto_turno,
    v.patente, v.nbcr, v.saf, v.tpss, v.tas,
    'prova.' || lower(regexp_replace(v.nome, '[^a-zA-Z]', '', 'g')) || '.' ||
    lower(regexp_replace(v.cognome, '[^a-zA-Z]', '', 'g')) || '@usarveneto.test' as email
  from (values
    ('Marco','Rossi','CRE','Padova','Padova','A','A1','C+E',0,'Basico',false,null),
    ('Luca','Bianchi','CR','Verona','Verona','B','B3','C',2,'Basico',false,null),
    ('Giulia','Ferrari','CS','Venezia','Mestre','A','A5','B',0,'Basico',true,null),
    ('Davide','Rizzo','CSE','Treviso','Treviso','C','C2','C+E',1,'Avanzato',false,null),
    ('Anna','Costa','CR','Vicenza','Vicenza','D','D4','B',0,'Basico',false,1),
    ('Paolo','Gallo','CS','Belluno','Belluno','B','B2','C',3,'Basico',false,null),
    ('Sara','Conti','CRE','Rovigo','Rovigo','A','A2','D',0,'Avanzato',false,null),
    ('Federico','Moretti','CS','Padova','Cittadella','C','C6','C+E',0,'Basico',true,null),
    ('Alessandro','Esposito','VF','Padova','Padova','A','A3','B',0,null,false,null),
    ('Martina','Ricci','VE','Verona','Bussolengo','B','B5','C',1,null,false,null),
    ('Andrea','Marino','VF','Venezia','Mestre','D','D1','B',0,null,true,null),
    ('Chiara','Greco','VC','Vicenza','Schio','A','A7','C+E',0,null,false,null),
    ('Matteo','Bruno','VE','Treviso','Conegliano','C','C3','B',0,null,false,null),
    ('Laura','Rinaldi','VF','Verona','Villafranca','B','B8','D',0,null,false,2),
    ('Roberto','Barbieri','VF','Padova','Abano','B','B4','C',3,'Basico',false,null),
    ('Elisa','Lombardi','VE','Venezia','Chioggia','A','A6','B',3,null,false,null),
    ('Stefano','Moretti','VF','Verona','Legnago','D','D5','C+E',3,'Basico',true,null),
    ('Silvia','Fontana','VC','Belluno','Feltre','C','C8','B',3,null,false,null),
    ('Giorgio','Caruso','VF','Rovigo','Adria','A','A1','D',3,'Avanzato',false,1),
    ('Fabio','Mancini','VF','Vicenza','Valdagno','B','B6','B',0,'2A',false,null),
    ('Valentina','Villa','VE','Treviso','Montebelluna','A','A4','C',1,'2A',true,null),
    ('Riccardo','Serra','VF','Padova','Camposampiero','D','D7','C+E',0,'2A',false,null),
    ('Marta','Rinaldi','VC','Verona','San Bonifacio','C','C5','B',2,'2A',false,null),
    ('Luca','Pellegrini','VE','Venezia','San Donà','B','B1','D',0,'Avanzato',false,null),
    ('Alessio','Fiore','VF','Padova','Abano','C','C1','B',0,'Avanzato',false,null),
    ('Denise','Basso','VE','Treviso','Oderzo','A','A5','C',1,'Avanzato',false,null),
    ('Manuel','Cavalli','VF','Verona','Legnago','D','D6','C+E',0,'2A',false,null),
    ('Elena','Michielin','VC','Vicenza','Schio','B','B7','B',0,'Avanzato',false,null),
    ('Andrea','Boatto','VE','Venezia','Chioggia','A','A2','D',2,'2A',false,null),
    ('Davide','Ferri','VF','Padova','Padova','A','A8','C',0,null,false,null),
    ('Alice','Martini','VE','Vicenza','Vicenza','B','B7','B',0,'Basico',false,null),
    ('Gabriele','Leone','VF','Verona','Verona','D','D3','C+E',0,null,true,null),
    ('Francesca','Sartori','VC','Treviso','Oderzo','A','A2','D',0,null,false,null),
    ('Mirko','Grassi','VF','Belluno','Belluno','C','C1','B',0,'Basico',false,null),
    ('Noemi','Ferraro','VE','Rovigo','Rovigo','B','B2','C',0,null,false,null),
    ('Simone','Basile','VF','Padova','Monselice','A','A5','C+E',0,null,true,1),
    ('Davide','Ferro','VF','Venezia','Mestre','B','B3','C+E',0,null,true,2),
    ('Alessia','Rinaldi','VE','Verona','Verona','C','C4','C',0,null,false,null),
    ('Mauro','Castagna','VF','Treviso','Treviso','D','D6','C+E',0,null,true,1),
    ('Beatrice','Milani','VE','Vicenza','Bassano','A','A3','D',0,null,false,null),
    ('Stefano','Longo','VF','Padova','Piove di Sacco','B','B5','C+E',0,null,true,2),
    ('Claudia','Bernardi','VC','Belluno','Feltre','C','C7','C',0,null,false,null),
    ('Davide','Barbiero','VF','Rovigo','Polesella','D','D2','D',0,null,true,1),
    ('Roberta','Colombo','VE','Treviso','Spresiano','A','A6','C+E',0,null,false,null),
    ('Enrico','Fiore','VF','Verona','Isola della Scala','B','B4','C+E',0,null,true,2),
    ('Alessandro','Riva','VF','Padova','Este','A','A4','B',0,null,false,null),
    ('Martina','Sala','VE','Vicenza','Thiene','B','B1','C',1,'Basico',false,null),
    ('Filippo','Testa','VF','Venezia','Chioggia','C','C2','D',0,null,false,1),
    ('Sofia','Perrone','VC','Verona','Bovolone','D','D8','B',0,null,false,null),
    ('Gabriele','Rizzo','VF','Treviso','Vittorio Veneto','A','A7','C',0,null,false,null),
    ('Chiara','Damon','VE','Belluno','Cortina','B','B6','B',0,null,false,2),
    ('Matteo','Zanetti','VF','Padova','Cittadella','C','C3','D',0,null,false,null),
    ('Laura','Bianchin','VC','Rovigo','Badia','D','D4','C',0,null,false,null),
    ('Andrea','Favaro','VE','Venezia','Mestre','A','A1','B',0,'Basico',false,null),
    ('Valentina','Zanolla','VF','Vicenza','Arzignano','B','B8','C+E',0,null,false,1)
  ) as v(nome, cognome, grado, comando, sede, turno, salto_turno, patente, nbcr, saf, tpss, tas)
),
utenti_inseriti as (
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
         d.email, crypt('Prova2026!', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
  from dati d
  returning id, email
)
insert into profili (id, nome, cognome, email, grado, comando, sede, turno, salto_turno, patente, nbcr, saf, tpss, tas, ruolo)
select u.id, d.nome, d.cognome, u.email, d.grado, d.comando, d.sede, d.turno, d.salto_turno, d.patente, d.nbcr, d.saf, d.tpss, d.tas, 'operatore'
from utenti_inseriti u join dati d on d.email = u.email;

-- Specializzazioni collegate (l'app filtra i posti tramite operatori_specializzazioni)
insert into operatori_specializzazioni (operatore_id, specializzazione_id)
select p.id, s.id
from profili p
join specializzazioni s on true
where p.email like 'prova.%'
  and (
    (s.nome = 'Strutturista' and false)
    or (s.nome = 'NBCR 3° livello' and p.nbcr = 3)
    or (s.nome = 'Unità cinofila K9' and false)
    or (s.nome = 'Caposquadra/Capireparto' and p.grado in ('CRE','CR','CSE','CS'))
    or (s.nome = 'SAF 2A (corda)' and p.saf in ('2A','Avanzato'))
  );

-- Strutturisti e K9: nomi scelti apposta (nessun campo booleano dedicato) — li lego per nome
insert into operatori_specializzazioni (operatore_id, specializzazione_id)
select p.id, s.id
from profili p
join specializzazioni s on s.nome = 'Strutturista'
where p.email in (
  'prova.alessandro.esposito@usarveneto.test','prova.martina.ricci@usarveneto.test',
  'prova.andrea.marino@usarveneto.test','prova.chiara.greco@usarveneto.test',
  'prova.matteo.bruno@usarveneto.test','prova.laura.rinaldi@usarveneto.test'
);

insert into operatori_specializzazioni (operatore_id, specializzazione_id)
select p.id, s.id
from profili p
join specializzazioni s on s.nome = 'Unità cinofila K9'
where p.email in (
  'prova.davide.ferri@usarveneto.test','prova.alice.martini@usarveneto.test',
  'prova.gabriele.leone@usarveneto.test','prova.francesca.sartori@usarveneto.test',
  'prova.mirko.grassi@usarveneto.test','prova.noemi.ferraro@usarveneto.test'
);
