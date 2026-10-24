# Documento di continuità del progetto — App USAR Veneto

> **Scopo**: consentire a chiunque (persona o AI) di riprendere il lavoro esattamente da dove siamo arrivati, anche dopo un crash di sessione. Aggiornarlo con COSTANZA a ogni decisione o intervento — consolidando nelle sezioni giuste, senza accumulare appendici.

Ultimo aggiornamento: 24/10/2026 sera — **FASE 1 IMPORT COMPLETATA** ✅

---

## 1. Cos'è il progetto

**Nucleo USAR Veneto** — sistema per gestire ~250 operatori organizzati mensilmente in due squadre da 38 unità: **Team Alpha** e **Team Bravo**. Funzioni: programmazione mensile, calendario turni, mantenimenti con validazione, attivazioni di emergenza con risposta SÌ/NO in tempo reale, resoconti, PDF del Manifesto, bot Telegram, anagrafica completa con privacy.

**Stato attuale**: l'app è COMPLETA nelle funzioni operative e collaudata end-to-end. **I DATI REALI DEL NUCLEO SONO NEL DATABASE** (124 profili importati dal foglio Google, 1.873 mantenimenti storici, specializzazioni complete). L'app usa le specializzazioni vere (icone, tendine, contatori). Gli operatori si registrano da soli con la loro email Gmail e ricevono la scheda piena. Restano: collaudo della registrazione con un utente vero, comunicazione al nucleo, piccole code (vedi sez. 10).

## 2. Architettura

| Componente | Scelta | Note |
|---|---|---|
| Frontend | **PWA** (Vite) | Installabile, aggiornamento automatico (sw v4: pagina principale sempre dal server) |
| Backend/DB | **Supabase** — Frankfurt (UE) | Piano Free: backup MANUALI via query di sola lettura (vedi backup-db/), keep-alive DB da creare |
| Comunicazioni | **Bot Telegram** @Usar_veneto_bot su **Render** (Free) | Keep-alive attivo (workflow cron 10 min + secret `BOT_URL`). Notifiche push PWA ESCLUSE (costo Apple) |
| PDF | **jsPDF** lato client | Manifesto scaricabile da mobile |
| Hosting | **GitHub Pages** | Deploy automatico a ogni push su `main`, con muro di verifica (sez. 12) |

**Pubblicazione**: il sito pubblica SOLO `dist`. Le pagine informative in `index-extra/`, le immagini in `public/assets/`. **Un file nella radice NON viene pubblicato.**

Account (personali di Luciano Di Lorenzo): GitHub `lucianosbrau`, Supabase, Render. Migrazioni future: `MIGRAZIONE-ACCOUNT.md` (fase 1, Gmail nucleo) e `MIGRAZIONE-SERVER-CORPO.md` (fase 2, server CNVVF).

## 3. Pagine dell'app (stato reale)

| Pagina | Chi la vede | Stato |
|---|---|---|
| Login/Registrazione | Tutti | ✅ form HTML vero, spunta privacy obbligatoria, **avviso email non in elenco**, **collegamento automatico alla scheda importata** ("✅ Benvenuto! Il tuo profilo è stato caricato") |
| Dashboard | Tutti | ✅ contatori mantenimenti (soglia 24h) + 2 grafici a torta |
| Operatori | Admin (menù); scheda visibile a tutti | ✅ ricerca con ✕, filtro sotto-soglia, schede con **icone sp_* nuove**, **privacy per non-admin** (vedi sez. 4) |
| Squadre | Tutti / Admin (modifica) | ✅ ATTIVA / VISUALIZZA / MODIFICA / 📄 GENERA PDF |
| Calendario | Tutti | ✅ turni 2024-2028, ferie a click con avviso |
| Programmazione | Admin | ✅ 38 posti, **tendine con idoneità dalle colonne sp_*** (SAF solo 2A-AVANZATO, NBCR da livello 2), rotazione 6 mesi, ferie in GIORNI, INSERISCI TUTTI, PDF |
| Attivazione | Tutti | ✅ admin: allerta + realtime (contatori SÌ/NO/NESSUNA RISPOSTA con nomi, copertura requisiti su sp_*); operatore: SÌ/NO e "Cambia risposta" |
| Mantenimenti | Operatore + Admin (validazione) | ✅ soglia 24h su **ore_conteggiate**, causale "Manutenzione e magazzino" (50%), coda validazione |
| Resoconti | Admin | ✅ ferie in GIORNI, turni effettivi, "Le mie ferie" |
| Profilo | Tutti | ✅ dati servizio, **comando a tendina (12) + sede a CASCATA** (solo le sedi del comando), turno A-D-G (**G senza salto**: campo disattivato), foto, "Chi ha consultato la tua scheda", Telegram |
| Internazionale / Report | — | ❌ da sviluppare |

## 4. Ruoli, accesso e PRIVACY

**Operatore**: modifica solo i PROPRI dati dal Profilo; inserisce ferie e mantenimenti; risponde alle attivazioni; vede chi ha consultato la propria scheda.

**Amministratore** (4-5): vede l'anagrafica completa, NON modifica i dati altrui (trigger `trg_blocca_modifiche_admin`) — solo promozione/revoca admin (con log), eliminazione account (con password, RPC + log), validazione mantenimenti. Ogni consultazione di scheda registrata (`log_consultazioni`); azioni su utenti in `log_admin` (append-only).

**PRIVACY SCHEDE OPERATORI (regola 24/10)**: chi **non è admin** nella scheda di un operatore vede SOLO: nome, cognome, grado, turno/salto, comando, sede, specializzazioni, patenti, telefono personale, email, **foto**. NON vede: ICE, gruppo sanguigno, indirizzo, medico, Telegram, mantenimenti; e nessun pulsante admin.

## 5. Attivazione di emergenza (collaudata ✅)

1. Admin: ATTIVA ALPHA / BRAVO / PERSONALIZZATA (o da Squadre), messaggio precompilato, INVIA ALLERTA
2. Bot allerta il gruppo "Allerta USAR VENETO" (ID `-1004443017442`, var `ALERT_GROUP_CHAT_ID` su Render) + chat private, pulsanti ✅/❌
3. Risposte in tempo reale nella pagina admin: contatori SÌ/NO/NESSUNA RISPOSTA (= allertati − risposte, con nomi), copertura requisiti (su sp_*), nomi con foto
4. Compilazione manifesto AUTOMATICA/MANUALE; GENERA PDF (mese sempre corretto); il PDF si gira a mano nel gruppo
5. **NOME MODULO (24/10)**: Squadra ALPHA = **MO.USARM.VEN.01**, Squadra BRAVO = **MO.USARM.VEN.02**. Visibile nella finestra RealTime sotto il titolo e nel PDF (riga “MODULO MO.USARM.VEN.0x” in rosso sotto il titolo squadra). Il PDF del manifesto si chiama ora **“manifesto Composizione”** (nome file: MO.USARM.VEN.0x-manifesto-composizione-team.pdf); il tasto si chiama **GENERA PDF COMPILAZIONE** in Programmazione, Attivazione e Squadre. Attivazione personalizzata: nessun nome modulo
5b. **MANIFESTO USAR.20 (24/10)**: nella pagina Attivazione, tasto **GENERA MANIFESTO — USAR.20**: PDF ORIZZONTALE come l'excel USAR_20_MANIFESTO_DEL_PERSONALE (DCESTAB): colonne MODULO (MO.USARM.VEN.0x) · COMANDO · QUALIFICA (ruolo del posto) · COGNOME · NOME · CODICE FISCALE · TEL. · TEL. EMERGENZA (ICE); 38 righe (vuote se non compilate); nome file MO.USARM.VEN.0x-manifesto-personale-usar20.pdf. La sostituzione dei membri che rispondono NO si fa con COMPILAZIONE MANUALE: tendina di ricerca per posto, con pillola ✅ SÌ su chi ha risposto positivo (anche se quel mese è in Bravo/riserva)
5c. **FACT SHEET USAR.12 (24/10)**: tasto **GENERA FACT SHEET — SCHEDA USAR.12** (blu): PDF verticale a 2 colonne su UNA pagina della Scheda informativa DCESTAB USAR.12 Rev. 1.0. PRECOMPILATI: A0 (MO.USARM.VEN.0x), A1 (DIREZIONE REGIONALE VENETO), A2 (USAR Medium + team), A3 (persone del manifesto), A4 (K9 del manifesto), A5 (MEDIUM), capacità tecniche A7-A14 in base alle sp_* di chi parte (K9/medici/NBCR/strutturisti contati), B6 cani. VUOTI (linea da compilare a penna): A6 INSARAG, arrivo A16-A19, logistica B1-B15, contatti C1-C13, compilato da. Nome file: MO.USARM.VEN.0x-fact-sheet-usar12.pdf
6. Chiusura con ESITO (24/10): due pulsanti — **✔️ CONFERMA ATTIVAZIONE** (conteggiata nei resoconti; il bot invia il messaggio “✅✅✅ CONFERMA ATTIVAZIONE ✅✅✅… Seguiranno il PDF di compilazione squadra e il manifesto del personale”) o **➖ ANNULLA ATTIVAZIONE** (esercitazione/allerta revocata: NON conteggiata, ma registrata). Se ANNULLATA il bot invia “➖➖➖ ATTIVAZIONE ANNULLATA”. Il bot avvisa su gruppo e privata; risposte bloccate. Le attivazioni NON vengono mai cancellate: restano nel DB con tutte le risposte
7. **RESOCONTI → Resoconto attivazioni** (24/10): per mese scelto — contatore avvenute/aperte/annullate, elenco attivazioni avvenute con SÌ/NO, e **tabella operatori attivati** (quante volte han risposto SÌ in attivazioni avvenute). Migrazione: `db/migrazione-attivazione-esito.sql` (campo esito; vecchie chiuse = avvenute)

## 6. Regole di business — NON REINVENTARE

### Modulo e specializzazioni (SCHEMA NUOVO sp_* — attivo)
- USAR Medium: 38 unità. Posti obbligatori: 2 strutturisti (7, 9), 2 NBCR (8, 10), 4 K9 (11, 12, 14, 15), 2 ROS (17, 25), 2 SAF 2A (22, 30). Valori in `impostazioni`
- **Specializzazioni (tabella definitiva 23/10)**: FUNZIONARIO SI/NO (priorità posti 1-3) · STAFF SI/NO 📝 (4-6, modificabile da admin) · LOGISTA SI/NO 🚜 (33-38, admin) · STRUTTURISTA SI/NO (compilabile, admin con log) · NBCR 0-3 (icona col numero solo 2-3; priorità: prima i 3 poi i 2) · ESTENSIONE NBCR NR/LPG/LNG (mai in tendina) · CINOFILO SI/NO ("Unità cinofila K9" nell'app; posti 11-15) · SAF 1A/1B-BASICO/2A-AVANZATO (priorità SOLO 2A-AVANZATO) · TAS No/1/2 (icona solo livello 2) · SAPR SI/NO (senza icona) · MEDICO/INFERMIERE SI/NO (senza icona). TPSS ELIMINATO
- **ROS = dai gradi CRE/CR/CSE/CS**; omino rosso nelle tendine (niente ⭐); simboli vigile: grigio D/DVD/VD/IA, rosso CRE/CR/CSE/CS, nero VC/VE/VF. FF.TT. eliminato (→ D nel foglio)
- Icone generiche: helper globale `specIcone(o)` (🏗️ ☣️N 🐕 🧗 📝 🚜 💼 🧭 ⚕️ 💉) — usato ovunque al posto della vecchia tabella specializzazioni
- Autisti: solo patente 3°/4° grado (estensioni escluse); TPSS tolto; TAS icona 🧭 solo livello 2

### Calendario e ferie
- Riferimento **01/11/2026 = B2 giorno / A2 notte**; ciclo 32 coppie; notte sfalsata; il proprio salto = RIPOSO
- **FERIE SEMPRE IN GIORNI** ovunque; **turni di ferie EFFETTIVI** (solo Resoconti): lettera = proprio turno E salto ≠ proprio salto
- **Turno G (Giornaliero)**: nel Profilo (A-D-G); **G NON ha salto** (campo disattivato al salvataggio); i G non entrano nel calendario, solo ferie. Nel foglio: M→G, "Giornaliero"→G; chi non ha turno lo imposta da sé

### Mantenimenti
- **Soglia 24 ore** su `ore_conteggiate` (import: prestate→ore, reali→ore_conteggiate; causale "Manutenzione e magazzino" conteggia 50% via trigger). Scheda operatore: la riga mantenimenti mostra le **ore conteggiate** (base soglia) e, se diverse, le ore approvate piene tra parentesi — stesso criterio ovunque, niente più "41 ore approvate ⚠️ sotto soglia" apparentemente contraddittorio
- Flusso: in_validazione → admin approva/rifiuta (note); sotto soglia: in fondo alle tendine ⚠️ MAN.
- 8 causali: Mantenimento, Manovra, Intervento, Lavorazione, Manutenzione e magazzino, Tutor Mantenimento, Tutor Corso, Altra formazione

### Comandi e sedi (liste ufficiali)
- **12 comandi**: DIREZIONE REGIONALE VENETO (sede unica: Centrale Direzione), VENEZIA, PADOVA, TREVISO, VERONA, VICENZA, BELLUNO, ROVIGO, UDINE, PORDENONE, TRIESTE, GORIZIA
- **Sedi in tabella `sedi`** (migrazione-sedi.sql, eseguita): tendina a CASCATA nel Profilo. Centrali = "Centrale + provincia" (eccezione: **Centrale Mestre**; DIREZIONE = Centrale Direzione). VERONA usa "Caldiero" senza "Distaccamento"
- Normalizzazione import: "VENEZIA - MESTRE"→Centrale Mestre; "CENTRALE"→Centrale+provincia; il resto resta come scritto (correggibile dal Profilo)

### Tendine
- Prima i meno recenti (MAI INSERITI → … → 6 mesi); capi prima nei ROS (omino rosso); ferie "N gg" (date distinte); sotto-soglia in fondo; idoneità per posto da sp_*; tap vs scroll (8px)

### Bot Telegram
- Codice 6 cifre (15 min, monouso); risposte dal gruppo via `cb.from.id`; nel gruppo solo /idgruppo; **inserimento nel gruppo SOLO via admin**; Render: SUPABASE_URL senza `/rest/v1/`; **ogni modifica al bot = Manual Deploy su Render**; keep-alive: workflow cron 10 min (secret `BOT_URL`)

### Database
- Schema + 20 migrazioni eseguite (incluse mantenimenti-v2, sedi, FASE1, fix-unique-email)
- **REGOLA Supabase Auth**: dopo ogni intervento nel pannello, "Confirm email" resti SPENTO; redirect `<url>/**`
- Utente bloccato: `update auth.users set email_confirmed_at = now() where email='...'`; reset password: `update auth.users set encrypted_password = crypt('Temp', gen_salt('bf')) where email='...'`
- Foto: bucket privato `foto-profili`, path `<id>/foto`, URL firmati in cache 1h

## 7. Privacy

- Informativa: `INFORMATIVA-PRIVACY.md` + pagina web — **bozza da validare dal Corpo**; alla registrazione: spunta obbligatoria + `privacy_consenso_il`
- Dati sensibili solo admin, consultazioni registrate e visibili all'operatore; **schede operatori filtrate per i non-admin** (sez. 4); PDF manifesto senza dati sensibili; ICE = dato di terzi (il familiare va informato dall'operatore)

## 8. Stile

Rosso #B22222, tricolore, sfondo bianco. Grafici: palette varia. PDF: sezioni con contorno nero, box colorati (Direzione blu chiaro, Valutazione oro #FFD700, Operazioni rosso #FF0000 testo bianco, Logistica giallo), TL blu #0066CC, UNA pagina, senza simboli gradi. Font Inter/Roboto. Solo logo USAR. Versione in menù: aggiornare a ogni sessione di modifiche.

## 9. Documentazione e materiali

`Link del progetto.txt` (tutti i link, da tenere aggiornato; copia sul Drive) · `index-extra/`: infografica-telegram (HTML+PDF), infografica-migrazione-2fasi, infografica-flusso, presentazione, anteprima-schermate, informativa-privacy · Guide: MIGRAZIONE-ACCOUNT.md, MIGRAZIONE-SERVER-CORPO.md, INFORMATIVA-PRIVACY.md · Backup: `backup-db/` (export 23/10 pre-import; query in `db/BACKUP-export-letture.sql`)

## 10. FASE 1 IMPORT — COMPLETATA ✅ (24/10/2026)

**Risultato verificato**: **124 profili** (123 importati + admin pre-esistente), **1.873 mantenimenti** (approvati, ore=prestate/conteggiate=reali), specializzazioni sp_* complete. Primi 10 cognomi corretti (Alfano, Anafi, Antoniutti…).

**Meccanismo (Opzione A)**: le 123 schede importate hanno un **utente tecnico** in auth.users (email `.pending@usarveneto.invalid`, inutilizzabile) come portatore. **Alla registrazione** con la STESSA email Gmail del foglio, la RPC `collega_scheda_importata` trasferisce tutto (dati + mantenimenti/ferie/squadre) sull'account vero e cancella la scheda tecnica. **La password la sceglie l'utente alla registrazione.** Avviso se l'email non è in elenco. Script: `import-fase1.py` (lettura XLSX; simulazione: `python3 import-fase1.py --simula COGNOME`; generazione SQL: `--genera`).

**Incidenti risolti durante l'esecuzione** (per memoria): riga log non-SQL in testa al file; vincolo univoco email mancante (`FASE1-fix-unique-email.sql`); vincolo profili_id_fkey per schede senza account (utenti tecnici pending); refuso data 19/025/2021→19/02/2021 (confermato utente: febbraio); 6 righe ore-zero saltate (Ippolito×2, Contesso, Rubin, Garizzo, Casarotto); file vecchio in cache GitHub (commit giusto: 8c49fce).

**CODE A FINE FASE 1**:
1. **RPC da completare**: `collega_scheda_importata` deve eliminare anche l'utente tecnico da auth.users (`delete from auth.users where id = profilo_vecchio`) — ora i 123 .pending restano in Authentication finché non si sistemano
2. **3 mantenimenti non agganciati** (codici fiscali senza scheda) da controllare
3. **Collaudo registrazione**: un collega reale si registra con la sua Gmail → deve ricevere la scheda piena ("✅ Benvenuto!")
4. **Comunicazione al nucleo**: "registratevi con l'email Gmail data all'amministrazione; scegliete la vostra password"
5. Pulizia finale: vecchia tabella `specializzazioni`/`operatori_specializzazioni` e colonna `tpss` non più usate dall'app (rimozione in migrazione separata DOPO collaudo)
6. FASE 2: schede consultazione (documenti, medica, vaccinazioni, cani, taglie) con card dedicate — tabelle già create da FASE1-migrazione

**Domande ancora aperte**: fogli MEDICA e VACCINAZIONI (persone) non ancora letti.

## 11. Skill `vvf-usar`

Skill persistente (v4): modulo USAR Medium, modello COMPOSIZIONE TEAM (sezioni 1-38 per il PDF). **Caricarla a inizio sessione.**

## 11b. Regola di sviluppo (decisione utente 24/10)

Sviluppo in FASE AVANZATA: le modifiche vanno fatte in modo SICURO E VERIFICATO, anche a discapito del tempo. Deve essere tutto RECUPERABILE. In pratica: (1) mai modifiche distruttive senza backup/ripristino possibile (git è la rete di sicurezza: commit frequenti, niente worktree sporco prima di toccare file delicati); (2) prima di editare file grandi (main.js, bot) verificare l'ancora esatta e fare una copia di riferimento (es. git stash o commit prima); (3) dopo ogni edit: sintassi + build + test, SEMPRE; (4) se un edit fallisce a metà, ripristinare dal commit precedente (git checkout HEAD -- file) e rifare con metodo più sicuro, mai lasciare file a metà; (5) le migrazioni SQL sono SEMPRE file versionati, idempotenti (if not exists), testate con SELECT prima di toccare dati; (6) il bot e il DB sono AMBIENTE PRODUTTIVO: ogni modifica va comunicata all'utente con i passi manuali (SQL Editor, Manual Deploy Render)

## 12. Qualità e anti-disaster — PROCEDURA OBBLIGATORIA

1. **Test blindati** (`test-app.mjs`, 20 check, login simulato come ADMIN): su COPIA temporanea del progetto. `node test-app.mjs`
2. **Muro di verifica in CI** (`verifica-build.mjs` nel workflow deploy): build sana o deploy bloccato. `node verifica-build.mjs`
3. **Prima di OGNI push**: `git status` → `npx vite build` → `node verifica-build.mjs` → `node test-app.mjs` → push → **aggiornare README e CONTINUITA nello stesso commit**

**LEZIONI**: (1) verificare i replace con grep; (2) i file pubblicati in index-extra/ o public/; (3) Confirm email spento dopo interventi Auth; (4) mai .catch sulle query supabase; (5) i test mai sui file veri + verifica in CI; (6) cache del service worker separata dal browser; (7) il foglio Google va letto via export XLSX (il CSV gviz fonde la riga 1 di SPECIALIZZAZIONI); (8) i file SQL generati da script non devono contenere print di log.

## 12b. Decisione utente 24/10 — PROFILO e SCHEDA OPERATORI

- **Profilo**: OGNUNO (anche operatore) vede e modifica dal proprio Profilo TUTTI i dati importati: anagrafici (grado, nascita, cellulare, email servizio, dati sensibili/ICE) e **specializzazioni + patenti** (le sp_* sono modificabili dall'operatore — supera la vecchia regola "solo admin con log"; nome/cognome restano fissi, gestiti dall'amministrazione). PATENTE: l'import FASE 1 NON l'ha portata (colonne assenti nell'import) — la compilano gli operatori da sé
- **Scheda Operatori (non-admin)**: vede nome, cognome, grado, comando/sede, telefono, email, patenti, specializzazioni; NON vede ICE, sangue, indirizzo, medico (regola 24/10 invariata)
- **PROSSIME SOTTOSEZIONI PROFILO** (dopo import FASE 2): VACCINAZIONI, RILEVAZIONE TAGLIE, ANAGRAFICA CANINA e VACCINAZIONI CANI (solo chi è CINOFILO) — tutte modificabili dall'operatore

## 13. Come lavorare con l'utente (MODUS OPERANDI — regola confermata 24/10)

- L'utente **non è un tecnico informatico e non è un programmatore**: chi sviluppa gestisce Git e spiega tutto in **parole semplici**, senza gergo tecnico
- **Su GitHub fa tutto chi sviluppa**: commit, PR, merge e verifica del deploy — l'utente non tocca GitHub per nulla
- L'utente esegue solo le query SQL quando serve (indicare SEMPRE il file da eseguire e l'ordine)
- Ogni decisione va registrata consolidando (niente appendici); chiedere OK esplicito prima di sviluppi non richiesti
- A ogni modifica del bot: ricordare il deploy Render; a ogni migrazione SQL: ricordare l'esecuzione

## 14. Registro cronologia

- 19-20/10: Supabase collegato, schema + seed prova, login, mantenimenti, programmazione, calendario
- 21/10: bot Telegram, PDF manifesto, tendine con ricerca
- 22/10: bot ONLINE, gruppo allerte, COLLAUDO END-TO-END, resoconti, simboli grado, scheda operatore, DB in pari
- 23/10: back telefono, foto profilo, elimina account, log admin, Attivazione a tutti, cambia risposta, ricerca Operatori, infografiche Telegram (HTML+PDF) e migrazione 2 fasi, fix registrazione, privacy (informativa+consenso+log), **incidente app bianca → sistema anti-disaster 3 livelli**, soglia 24h, PDF in Squadre, avviso ferie, keep-alive bot, lettura esportazione database + tutte le decisioni import (gradi, comandi, turni G, specializzazioni definitive)
- 24/10: **FASE 1 COMPLETATA**: backup (export drive), migrazione schema, sedi a cascata + G senza salto, script import con simulazioni verificate (Bubola/Zanaga/Rubin/Borrello/DiDomenico/Luchin/DiLorenzo/Favaro/Morfino/Anafi/DeMin/Gaz), import eseguito dopo 6 incidenti risolti (124 profili, 1.873 mantenimenti), **passo 6: app su sp_* (icone/tendine/contatori) + privacy schede non-admin**, 20/20 test
