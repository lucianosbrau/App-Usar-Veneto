-- SEED DATI PROVA — 50 operatori fittizi per testare la Programmazione
-- Eseguire DOPO migrazione-anagrafica.sql
-- CANCELLAZIONE (quando arrivano i dati reali):
--   delete from profili where email like 'prova.%';
--   delete from auth.users where email like 'prova.%';
-- Lo script e' IDEMPOTENTE: ripulisce da solo le esecuzioni precedenti di prova

create extension if not exists "pgcrypto";

-- Pulizia preventiva di esecuzioni precedenti parziali
delete from profili where email like 'prova.%';
delete from auth.users where email like 'prova.%';

-- Tabella temporanea con i dati dei 50 operatori
create temp table tmp_seed (
  nome text, cognome text, grado text, comando text, sede text,
  turno text, salto_turno text, patente text, nbcr int, saf text,
  tpss boolean, tas int, email text, estensioni text[]
);
insert into tmp_seed values
  ('Marco','Rossi','CRE','Padova','Padova','A','A1','4°',0,'Basico',false,null,'prova.marco.rossi@usarveneto.test', null),
  ('Luca','Bianchi','CR','Verona','Verona','1°','B3','3°',2,'Basico',false,null,'prova.luca.bianchi@usarveneto.test', null),
  ('Giulia','Ferrari','CS','Venezia','Mestre','A','A5','1°',0,'Basico',true,null,'prova.giulia.ferrari@usarveneto.test', null),
  ('Davide','Rizzo','CSE','Treviso','Treviso','3°','C2','4°',1,'Avanzato',false,null,'prova.davide.rizzo@usarveneto.test', null),
  ('Anna','Costa','CR','Vicenza','Vicenza','2°','D4','1°',0,'Basico',false,1,'prova.anna.costa@usarveneto.test', null),
  ('Paolo','Gallo','CS','Belluno','Belluno','1°','B2','3°',3,'Basico',false,null,'prova.paolo.gallo@usarveneto.test', null),
  ('Sara','Conti','CRE','Rovigo','Rovigo','A','A2','2°',0,'Avanzato',false,null,'prova.sara.conti@usarveneto.test', null),
  ('Federico','Moretti','CS','Padova','Cittadella','3°','C6','4°',0,'Basico',true,null,'prova.federico.moretti@usarveneto.test', null),
  ('Alessandro','Esposito','VF','Padova','Padova','A','A3','1°',0,null,false,null,'prova.alessandro.esposito@usarveneto.test', null),
  ('Martina','Ricci','VE','Verona','Bussolengo','1°','B5','3°',1,null,false,null,'prova.martina.ricci@usarveneto.test', null),
  ('Andrea','Marino','VF','Venezia','Mestre','2°','D1','1°',0,null,true,null,'prova.andrea.marino@usarveneto.test', null),
  ('Chiara','Greco','VC','Vicenza','Schio','A','A7','4°',0,null,false,null,'prova.chiara.greco@usarveneto.test', null),
  ('Matteo','Bruno','VE','Treviso','Conegliano','3°','C3','1°',0,null,false,null,'prova.matteo.bruno@usarveneto.test', null),
  ('Laura','Rinaldi','VF','Verona','Villafranca','1°','B8','2°',0,null,false,2,'prova.laura.rinaldi@usarveneto.test', null),
  ('Roberto','Barbieri','VF','Padova','Abano','1°','B4','3°',3,'Basico',false,null,'prova.roberto.barbieri@usarveneto.test', null),
  ('Elisa','Lombardi','VE','Venezia','Chioggia','A','A6','1°',3,null,false,null,'prova.elisa.lombardi@usarveneto.test', null),
  ('Stefano','Moretti','VF','Verona','Legnago','2°','D5','4°',3,'Basico',true,null,'prova.stefano.moretti@usarveneto.test', null),
  ('Silvia','Fontana','VC','Belluno','Feltre','3°','C8','1°',3,null,false,null,'prova.silvia.fontana@usarveneto.test', null),
  ('Giorgio','Caruso','VF','Rovigo','Adria','A','A1','2°',3,'Avanzato',false,1,'prova.giorgio.caruso@usarveneto.test', null),
  ('Fabio','Mancini','VF','Vicenza','Valdagno','1°','B6','1°',0,'2A',false,null,'prova.fabio.mancini@usarveneto.test', null),
  ('Valentina','Villa','VE','Treviso','Montebelluna','A','A4','3°',1,'2A',true,null,'prova.valentina.villa@usarveneto.test', null),
  ('Riccardo','Serra','VF','Padova','Camposampiero','2°','D7','4°',0,'2A',false,null,'prova.riccardo.serra@usarveneto.test', null),
  ('Marta','Rinaldi','VC','Verona','San Bonifacio','3°','C5','1°',2,'2A',false,null,'prova.marta.rinaldi@usarveneto.test', null),
  ('Luca','Pellegrini','VE','Venezia','San Donà','1°','B1','2°',0,'Avanzato',false,null,'prova.luca.pellegrini@usarveneto.test', null),
  ('Alessio','Fiore','VF','Padova','Abano','3°','C1','1°',0,'Avanzato',false,null,'prova.alessio.fiore@usarveneto.test', null),
  ('Denise','Basso','VE','Treviso','Oderzo','A','A5','3°',1,'Avanzato',false,null,'prova.denise.basso@usarveneto.test', null),
  ('Manuel','Cavalli','VF','Verona','Legnago','2°','D6','4°',0,'2A',false,null,'prova.manuel.cavalli@usarveneto.test', null),
  ('Elena','Michielin','VC','Vicenza','Schio','1°','B7','1°',0,'Avanzato',false,null,'prova.elena.michielin@usarveneto.test', null),
  ('Andrea','Boatto','VE','Venezia','Chioggia','A','A2','2°',2,'2A',false,null,'prova.andrea.boatto@usarveneto.test', null),
  ('Davide','Ferri','VF','Padova','Padova','A','A8','3°',0,null,false,null,'prova.davide.ferri@usarveneto.test', null),
  ('Alice','Martini','VE','Vicenza','Vicenza','1°','B7','1°',0,'Basico',false,null,'prova.alice.martini@usarveneto.test', null),
  ('Gabriele','Leone','VF','Verona','Verona','2°','D3','4°',0,null,true,null,'prova.gabriele.leone@usarveneto.test', null),
  ('Francesca','Sartori','VC','Treviso','Oderzo','A','A2','2°',0,null,false,null,'prova.francesca.sartori@usarveneto.test', null),
  ('Mirko','Grassi','VF','Belluno','Belluno','3°','C1','1°',0,'Basico',false,null,'prova.mirko.grassi@usarveneto.test', null),
  ('Noemi','Ferraro','VE','Rovigo','Rovigo','1°','B2','3°',0,null,false,null,'prova.noemi.ferraro@usarveneto.test', null),
  ('Simone','Basile','VF','Padova','Monselice','A','A5','4°',0,null,true,1,'prova.simone.basile@usarveneto.test', ARRAY['Autoscala']),
  ('Davide','Ferro','VF','Venezia','Mestre','B','B3','4°',0,null,true,2,'prova.davide.ferro@usarveneto.test', ARRAY['Autogru']),
  ('Alessia','Rinaldi','VE','Verona','Verona','3°','C4','3°',0,null,false,null,'prova.alessia.rinaldi@usarveneto.test', null),
  ('Mauro','Castagna','VF','Treviso','Treviso','D','D6','4°',0,null,true,1,'prova.mauro.castagna@usarveneto.test', ARRAY['Anfibio']),
  ('Beatrice','Milani','VE','Vicenza','Bassano','A','A3','2°',0,null,false,null,'prova.beatrice.milani@usarveneto.test', null),
  ('Stefano','Longo','VF','Padova','Piove di Sacco','B','B5','4°',0,null,true,2,'prova.stefano.longo@usarveneto.test', ARRAY['Autoscala','Anfibio']),
  ('Claudia','Bernardi','VC','Belluno','Feltre','3°','C7','3°',0,null,false,null,'prova.claudia.bernardi@usarveneto.test', null),
  ('Davide','Barbiero','VF','Rovigo','Polesella','2°','D2','2°',0,null,true,1,'prova.davide.barbiero@usarveneto.test', null),
  ('Roberta','Colombo','VE','Treviso','Spresiano','A','A6','4°',0,null,false,null,'prova.roberta.colombo@usarveneto.test', null),
  ('Enrico','Fiore','VF','Verona','Isola della Scala','1°','B4','4°',0,null,true,2,'prova.enrico.fiore@usarveneto.test'),
  ('Alessandro','Riva','VF','Padova','Este','A','A4','1°',0,null,false,null,'prova.alessandro.riva@usarveneto.test'),
  ('Martina','Sala','VE','Vicenza','Thiene','1°','B1','3°',1,'Basico',false,null,'prova.martina.sala@usarveneto.test'),
  ('Filippo','Testa','VF','Venezia','Chioggia','3°','C2','2°',0,null,false,1,'prova.filippo.testa@usarveneto.test'),
  ('Sofia','Perrone','VC','Verona','Bovolone','2°','D8','1°',0,null,false,null,'prova.sofia.perrone@usarveneto.test'),
  ('Gabriele','Rizzo','VF','Treviso','Vittorio Veneto','A','A7','3°',0,null,false,null,'prova.gabriele.rizzo@usarveneto.test'),
  ('Chiara','Damon','VE','Belluno','Cortina','1°','B6','1°',0,null,false,2,'prova.chiara.damon@usarveneto.test'),
  ('Matteo','Zanetti','VF','Padova','Cittadella','3°','C3','2°',0,null,false,null,'prova.matteo.zanetti@usarveneto.test'),
  ('Laura','Bianchin','VC','Rovigo','Badia','2°','D4','3°',0,null,false,null,'prova.laura.bianchin@usarveneto.test'),
  ('Andrea','Favaro','VE','Venezia','Mestre','A','A1','1°',0,'Basico',false,null,'prova.andrea.favaro@usarveneto.test'),
  ('Valentina','Zanolla','VF','Vicenza','Arzignano','1°','B8','4°',0,null,false,1,'prova.valentina.zanolla@usarveneto.test', null);

-- PASSO 1: crea gli utenti di login
insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  t.email, crypt('Prova2026!', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
from tmp_seed t;

-- PASSO 2: crea i profili collegati agli utenti appena creati
insert into profili (id, nome, cognome, email, grado, comando, sede, turno, salto_turno,
  patente, nbcr, saf, tpss, tas, ruolo, estensioni_patente)
select u.id, t.nome, t.cognome, t.email, t.grado, t.comando, t.sede, t.turno, t.salto_turno,
  t.patente, t.nbcr, t.saf, t.tpss, t.tas, 'operatore', t.estensioni
from tmp_seed t
join auth.users u on u.email = t.email;

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
