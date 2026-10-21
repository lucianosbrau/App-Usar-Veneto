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
  tpss boolean, tas int, email text
);
insert into tmp_seed values
  ('Marco','Rossi','CRE','Padova','Padova','A','A1','C+E',0,'Basico',false,null,'prova.marco.rossi@usarveneto.test'),
  ('Luca','Bianchi','CR','Verona','Verona','B','B3','C',2,'Basico',false,null,'prova.luca.bianchi@usarveneto.test'),
  ('Giulia','Ferrari','CS','Venezia','Mestre','A','A5','B',0,'Basico',true,null,'prova.giulia.ferrari@usarveneto.test'),
  ('Davide','Rizzo','CSE','Treviso','Treviso','C','C2','C+E',1,'Avanzato',false,null,'prova.davide.rizzo@usarveneto.test'),
  ('Anna','Costa','CR','Vicenza','Vicenza','D','D4','B',0,'Basico',false,1,'prova.anna.costa@usarveneto.test'),
  ('Paolo','Gallo','CS','Belluno','Belluno','B','B2','C',3,'Basico',false,null,'prova.paolo.gallo@usarveneto.test'),
  ('Sara','Conti','CRE','Rovigo','Rovigo','A','A2','D',0,'Avanzato',false,null,'prova.sara.conti@usarveneto.test'),
  ('Federico','Moretti','CS','Padova','Cittadella','C','C6','C+E',0,'Basico',true,null,'prova.federico.moretti@usarveneto.test'),
  ('Alessandro','Esposito','VF','Padova','Padova','A','A3','B',0,null,false,null,'prova.alessandro.esposito@usarveneto.test'),
  ('Martina','Ricci','VE','Verona','Bussolengo','B','B5','C',1,null,false,null,'prova.martina.ricci@usarveneto.test'),
  ('Andrea','Marino','VF','Venezia','Mestre','D','D1','B',0,null,true,null,'prova.andrea.marino@usarveneto.test'),
  ('Chiara','Greco','VC','Vicenza','Schio','A','A7','C+E',0,null,false,null,'prova.chiara.greco@usarveneto.test'),
  ('Matteo','Bruno','VE','Treviso','Conegliano','C','C3','B',0,null,false,null,'prova.matteo.bruno@usarveneto.test'),
  ('Laura','Rinaldi','VF','Verona','Villafranca','B','B8','D',0,null,false,2,'prova.laura.rinaldi@usarveneto.test'),
  ('Roberto','Barbieri','VF','Padova','Abano','B','B4','C',3,'Basico',false,null,'prova.roberto.barbieri@usarveneto.test'),
  ('Elisa','Lombardi','VE','Venezia','Chioggia','A','A6','B',3,null,false,null,'prova.elisa.lombardi@usarveneto.test'),
  ('Stefano','Moretti','VF','Verona','Legnago','D','D5','C+E',3,'Basico',true,null,'prova.stefano.moretti@usarveneto.test'),
  ('Silvia','Fontana','VC','Belluno','Feltre','C','C8','B',3,null,false,null,'prova.silvia.fontana@usarveneto.test'),
  ('Giorgio','Caruso','VF','Rovigo','Adria','A','A1','D',3,'Avanzato',false,1,'prova.giorgio.caruso@usarveneto.test'),
  ('Fabio','Mancini','VF','Vicenza','Valdagno','B','B6','B',0,'2A',false,null,'prova.fabio.mancini@usarveneto.test'),
  ('Valentina','Villa','VE','Treviso','Montebelluna','A','A4','C',1,'2A',true,null,'prova.valentina.villa@usarveneto.test'),
  ('Riccardo','Serra','VF','Padova','Camposampiero','D','D7','C+E',0,'2A',false,null,'prova.riccardo.serra@usarveneto.test'),
  ('Marta','Rinaldi','VC','Verona','San Bonifacio','C','C5','B',2,'2A',false,null,'prova.marta.rinaldi@usarveneto.test'),
  ('Luca','Pellegrini','VE','Venezia','San Donà','B','B1','D',0,'Avanzato',false,null,'prova.luca.pellegrini@usarveneto.test'),
  ('Alessio','Fiore','VF','Padova','Abano','C','C1','B',0,'Avanzato',false,null,'prova.alessio.fiore@usarveneto.test'),
  ('Denise','Basso','VE','Treviso','Oderzo','A','A5','C',1,'Avanzato',false,null,'prova.denise.basso@usarveneto.test'),
  ('Manuel','Cavalli','VF','Verona','Legnago','D','D6','C+E',0,'2A',false,null,'prova.manuel.cavalli@usarveneto.test'),
  ('Elena','Michielin','VC','Vicenza','Schio','B','B7','B',0,'Avanzato',false,null,'prova.elena.michielin@usarveneto.test'),
  ('Andrea','Boatto','VE','Venezia','Chioggia','A','A2','D',2,'2A',false,null,'prova.andrea.boatto@usarveneto.test'),
  ('Davide','Ferri','VF','Padova','Padova','A','A8','C',0,null,false,null,'prova.davide.ferri@usarveneto.test'),
  ('Alice','Martini','VE','Vicenza','Vicenza','B','B7','B',0,'Basico',false,null,'prova.alice.martini@usarveneto.test'),
  ('Gabriele','Leone','VF','Verona','Verona','D','D3','C+E',0,null,true,null,'prova.gabriele.leone@usarveneto.test'),
  ('Francesca','Sartori','VC','Treviso','Oderzo','A','A2','D',0,null,false,null,'prova.francesca.sartori@usarveneto.test'),
  ('Mirko','Grassi','VF','Belluno','Belluno','C','C1','B',0,'Basico',false,null,'prova.mirko.grassi@usarveneto.test'),
  ('Noemi','Ferraro','VE','Rovigo','Rovigo','B','B2','C',0,null,false,null,'prova.noemi.ferraro@usarveneto.test'),
  ('Simone','Basile','VF','Padova','Monselice','A','A5','C+E',0,null,true,1,'prova.simone.basile@usarveneto.test'),
  ('Davide','Ferro','VF','Venezia','Mestre','B','B3','C+E',0,null,true,2,'prova.davide.ferro@usarveneto.test'),
  ('Alessia','Rinaldi','VE','Verona','Verona','C','C4','C',0,null,false,null,'prova.alessia.rinaldi@usarveneto.test'),
  ('Mauro','Castagna','VF','Treviso','Treviso','D','D6','C+E',0,null,true,1,'prova.mauro.castagna@usarveneto.test'),
  ('Beatrice','Milani','VE','Vicenza','Bassano','A','A3','D',0,null,false,null,'prova.beatrice.milani@usarveneto.test'),
  ('Stefano','Longo','VF','Padova','Piove di Sacco','B','B5','C+E',0,null,true,2,'prova.stefano.longo@usarveneto.test'),
  ('Claudia','Bernardi','VC','Belluno','Feltre','C','C7','C',0,null,false,null,'prova.claudia.bernardi@usarveneto.test'),
  ('Davide','Barbiero','VF','Rovigo','Polesella','D','D2','D',0,null,true,1,'prova.davide.barbiero@usarveneto.test'),
  ('Roberta','Colombo','VE','Treviso','Spresiano','A','A6','C+E',0,null,false,null,'prova.roberta.colombo@usarveneto.test'),
  ('Enrico','Fiore','VF','Verona','Isola della Scala','B','B4','C+E',0,null,true,2,'prova.enrico.fiore@usarveneto.test'),
  ('Alessandro','Riva','VF','Padova','Este','A','A4','B',0,null,false,null,'prova.alessandro.riva@usarveneto.test'),
  ('Martina','Sala','VE','Vicenza','Thiene','B','B1','C',1,'Basico',false,null,'prova.martina.sala@usarveneto.test'),
  ('Filippo','Testa','VF','Venezia','Chioggia','C','C2','D',0,null,false,1,'prova.filippo.testa@usarveneto.test'),
  ('Sofia','Perrone','VC','Verona','Bovolone','D','D8','B',0,null,false,null,'prova.sofia.perrone@usarveneto.test'),
  ('Gabriele','Rizzo','VF','Treviso','Vittorio Veneto','A','A7','C',0,null,false,null,'prova.gabriele.rizzo@usarveneto.test'),
  ('Chiara','Damon','VE','Belluno','Cortina','B','B6','B',0,null,false,2,'prova.chiara.damon@usarveneto.test'),
  ('Matteo','Zanetti','VF','Padova','Cittadella','C','C3','D',0,null,false,null,'prova.matteo.zanetti@usarveneto.test'),
  ('Laura','Bianchin','VC','Rovigo','Badia','D','D4','C',0,null,false,null,'prova.laura.bianchin@usarveneto.test'),
  ('Andrea','Favaro','VE','Venezia','Mestre','A','A1','B',0,'Basico',false,null,'prova.andrea.favaro@usarveneto.test'),
  ('Valentina','Zanolla','VF','Vicenza','Arzignano','B','B8','C+E',0,null,false,1,'prova.valentina.zanolla@usarveneto.test');

-- PASSO 1: crea gli utenti di login
insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
  t.email, crypt('Prova2026!', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
from tmp_seed t;

-- PASSO 2: crea i profili collegati agli utenti appena creati
insert into profili (id, nome, cognome, email, grado, comando, sede, turno, salto_turno,
  patente, nbcr, saf, tpss, tas, ruolo)
select u.id, t.nome, t.cognome, t.email, t.grado, t.comando, t.sede, t.turno, t.salto_turno,
  t.patente, t.nbcr, t.saf, t.tpss, t.tas, 'operatore'
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
