-- ============================================================
-- BACKUP IN SOLO LETTURA (piano Free, da SQL Editor)
-- Eseguire, poi copiare TUTTO l'output e incollarlo in chat
-- (se troppo lungo per un messaggio, mandarlo in più parti).
-- Non modifica nulla: legge e restituisce il contenuto delle tabelle.
-- ============================================================

-- 1) Elenco tabelle con conteggio righe (il "sommario" del backup)
select '=== SOMMARIO TABELLE ===' as sezione;
select table_name, (select count(*) from information_schema.columns c where c.table_name = t.table_name and c.table_schema='public') as colonne
from information_schema.tables t where table_schema = 'public' and table_type='BASE TABLE' order by table_name;
select '=== CONTAGGIO RIGHE ===' as sezione;
select 'profili' tabella, count(*) righe from profili
union all select 'mantenimenti', count(*) from mantenimenti
union all select 'disponibilita', count(*) from disponibilita
union all select 'programmi_mensili', count(*) from programmi_mensili
union all select 'programmi_membri', count(*) from programmi_membri
union all select 'attivazioni', count(*) from attivazioni
union all select 'risposte_attivazione', count(*) from risposte_attivazione
union all select 'sedi', count(*) from sedi
union all select 'impostazioni', count(*) from impostazioni
union all select 'operatori_specializzazioni', count(*) from operatori_specializzazioni
union all select 'specializzazioni', count(*) from specializzazioni;

-- 2) PROFILI — l'anagrafica: LA PARTE PIÙ IMPORTANTE
select '=== PROFILI (json) ===' as sezione;
select row_to_json(p)::text from profili p order by cognome;

-- 3) SPECIALIZZAZIONI e collegamenti
select '=== SPECIALIZZAZIONI (json) ===' as sezione;
select row_to_json(s)::text from specializzazioni s order by id;
select '=== OPERATORI_SPECIALIZZAZIONI (json) ===' as sezione;
select row_to_json(os)::text from operatori_specializzazioni os order by operatore_id;

-- 4) MANTENIMENTI — lo storico ore
select '=== MANTENIMENTI (json) ===' as sezione;
select row_to_json(m)::text from mantenimenti m order by operatore_id, data;

-- 5) DISPONIBILITA — le ferie
select '=== DISPONIBILITA (json) ===' as sezione;
select row_to_json(d)::text from disponibilita d order by operatore_id, data;

-- 6) PROGRAMMI — le squadre composte
select '=== PROGRAMMI_MENSILI (json) ===' as sezione;
select row_to_json(p)::text from programmi_mensili p order by mese;
select '=== PROGRAMMI_MEMBRI (json) ===' as sezione;
select row_to_json(m)::text from programmi_membri m order by programma_id, posto;

-- 7) ATTIVAZIONI — lo storico
select '=== ATTIVAZIONI (json) ===' as sezione;
select row_to_json(a)::text from attivazioni a order by id;
select '=== RISPOSTE_ATTIVAZIONE (json) ===' as sezione;
select row_to_json(r)::text from risposte_attivazione r order by attivazione_id;

-- 8) IMPOSTAZIONI + SEDI
select '=== IMPOSTAZIONI (json) ===' as sezione;
select row_to_json(i)::text from impostazioni i order by chiave;
select '=== SEDI (json) ===' as sezione;
select row_to_json(s)::text from sedi s order by comando, sede;

-- 9) CODICI COLLEGAMENTO TELEGRAM (i codici scaduti non servono, li escludiamo)
select '=== CODICI_TELEGRAM (solo attivi) ===' as sezione;
select row_to_json(c)::text from codici_telegram c where usato = false;

-- 10) TABELLE FASE 2 (documenti, medica, vaccini, taglie, cani) — aggiunte 24/10
select '=== DOCUMENTI (json) ===' as sezione;
select row_to_json(d)::text from documenti d order by operatore_id;
select '=== SCHEDA_MEDICA (json) ===' as sezione;
select row_to_json(m)::text from scheda_medica m order by operatore_id;
select '=== VACCINI_COPERTURA (json) ===' as sezione;
select row_to_json(v)::text from vaccini_copertura v order by operatore_id, vaccino;
select '=== VACCINI_STORICO (json) ===' as sezione;
select row_to_json(v)::text from vaccini_storico v order by operatore_id, data_somministrazione;
select '=== TAGLIE_DPI (json) ===' as sezione;
select row_to_json(t)::text from taglie_dpi t order by operatore_id;
select '=== CANI (json) ===' as sezione;
select row_to_json(c)::text from cani c order by operatore_id;
select '=== CANI_VACCINI (json) ===' as sezione;
select row_to_json(v)::text from cani_vaccini v order by cane_id, data_somministrazione;
select '=== MANIFESTI (json) ===' as sezione;
select row_to_json(m)::text from manifesti m order by id;
select '=== MANIFESTI_MEMBRI (json) ===' as sezione;
select row_to_json(m)::text from manifesti_membri m order by manifesto_id, posto;
select '=== LOG_CONSULTAZIONI (json) ===' as sezione;
select row_to_json(l)::text from log_consultazioni l order by creato_il;
select '=== LOG_ADMIN (json) ===' as sezione;
select row_to_json(l)::text from log_admin l order by creato_il;

-- 11) STRUTTURA — lo schema per ricreare le tabelle
select '=== SCHEMA TABELLE (definizioni) ===' as sezione;
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema='public' order by table_name, ordinal_position;
