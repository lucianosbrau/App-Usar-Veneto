-- ================================================================
-- IMPORT FASE 1 v2 — Opzione A (schede in attesa, registrazione self-service)
-- Meccanismo: le schede importate hanno un ID provvisorio (uuid generato);
-- alla registrazione, l'app collega l'account alla scheda tramite l'EMAIL.
-- Eseguire dopo FASE1-fix-unique-email.sql.
-- ================================================================

begin;

---- PULIZIA operatori di prova (email prova.*)
delete from auth.users where id in (select id from profili where email like 'prova.%');
delete from mantenimenti where note_seed is true;
delete from mantenimenti where operatore_id in (select id from profili where email like 'prova.%');
delete from programmi_membri where operatore_id in (select id from profili where email like 'prova.%');
delete from disponibilita where operatore_id in (select id from profili where email like 'prova.%');
delete from operatori_specializzazioni where operatore_id in (select id from profili where email like 'prova.%');

---- ANAGRAFICHE + SPECIALIZZAZIONI: profili "in attesa" con id generato
-- (l'insert generato da import-fase1.py, con colonna id = gen_random_uuid())

---- MANTENIMENTI: agganciati via codice fiscale alle schede in attesa

commit;
