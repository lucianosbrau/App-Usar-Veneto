-- Seed: 8 operatori di prova con ruoli D, VD, IA (vigili grigi)
-- Eseguire in SQL Editor. Idempotente: la prima riga pulisce i seed precedenti con gli stessi nomi.

-- pulizia dei seed precedenti (stessi nominativi ricreati a ogni esecuzione)
delete from profili where email in (
  'prova.marin.roberto@usarveneto.test',
  'prova.ferrari.luca@usarveneto.test',
  'prova.sartori.daniele@usarveneto.test',
  'prova.zanetti.andrea@usarveneto.test',
  'prova.moretto.enrico@usarveneto.test',
  'prova.piva.giorgio@usarveneto.test',
  'prova.codarin.matteo@usarveneto.test',
  'prova.bressan.simone@usarveneto.test'
);
delete from auth.users where email like 'prova.%' and id not in (select id from profili);

-- 8 nuovi operatori: 3 D, 3 VD, 2 IA distribuiti sui comandi e turni
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'prova.marin.roberto@usarveneto.test', crypt('Prova2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'prova.ferrari.luca@usarveneto.test', crypt('Prova2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'prova.sartori.daniele@usarveneto.test', crypt('Prova2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'prova.zanetti.andrea@usarveneto.test', crypt('Prova2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'prova.moretto.enrico@usarveneto.test', crypt('Prova2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'prova.piva.giorgio@usarveneto.test', crypt('Prova2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'prova.codarin.matteo@usarveneto.test', crypt('Prova2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'prova.bressan.simone@usarveneto.test', crypt('Prova2026!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}');

insert into profili (id, nome, cognome, email, grado, comando, sede, turno, salto_turno, ruolo)
select u.id,
  split_part(u.email, '.', 3),                              -- nome
  initcap(split_part(u.email, '.', 2)),                      -- cognome
  u.email,
  x.grado, x.comando, x.sede, x.turno, x.salto, 'operatore'
from auth.users u
join (values
  ('prova.marin.roberto@usarveneto.test',   'D',  'Venezia', 'Chioggia',   'C', 'C2'),
  ('prova.ferrari.luca@usarveneto.test',    'D',  'Padova',  'Padova',     'A', 'A5'),
  ('prova.sartori.daniele@usarveneto.test', 'D',  'Verona',  'Borgo Roma','B', 'B7'),
  ('prova.zanetti.andrea@usarveneto.test',  'VD', 'Vicenza', 'Vicenza',    'D', 'D3'),
  ('prova.moretto.enrico@usarveneto.test',  'VD', 'Treviso', 'Treviso',    'C', 'C6'),
  ('prova.piva.giorgio@usarveneto.test',    'VD', 'Belluno', 'Belluno',    'A', 'A1'),
  ('prova.codarin.matteo@usarveneto.test',  'IA', 'Rovigo',  'Rovigo',     'B', 'B4'),
  ('prova.bressan.simone@usarveneto.test',  'IA', 'Venezia', 'Mestre',     'D', 'D8')
) as x(email, grado, comando, sede, turno, salto) on x.email = u.email
where u.email like 'prova.%';

-- verifica: 8 righe con gradi D/VD/IA
-- select cognome, nome, grado, comando, turno, salto_turno from profili where grado in ('D','VD','IA') order by grado, cognome;
