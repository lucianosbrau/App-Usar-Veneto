-- Migrazione: abilita Supabase Realtime sulle tabelle operative
-- Eseguire in SQL Editor. Senza questa, le pagine non ricevono gli aggiornamenti in tempo reale.

alter publication supabase_realtime add table attivazioni;
alter publication supabase_realtime add table risposte_attivazione;
alter publication supabase_realtime add table programmi_membri;
alter publication supabase_realtime add table mantenimenti;
alter publication supabase_realtime add table disponibilita;

-- nota: le policy RLS esistenti valgono anche per il realtime;
-- il bot scrive con service_role (bypassa RLS) quindi le risposte dal gruppo
-- arrivano come eventi realtime leggibili da tutti i client autenticati.
