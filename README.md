# App-Usar-Veneto

Gestione squadre, mantenimenti e attivazioni di emergenza per il **Nucleo USAR Veneto** (~250 operatori).

**App online:** https://lucianosbrau.github.io/App-Usar-Veneto/

## Cos'è

Sistema per la gestione operativa del nucleo (**dati reali importati — 124 profili, specializzazioni, 1.873 mantenimenti storici**):

- **Programmazione mensile** dei manifesti Alpha e Bravo (38 unità su modello USAR Medium, rotazione del personale, ricerca nominativi con indicazione ✅SÌ nelle attivazioni, ferie, contatori, PDF)
- **Calendario turni** ciclico (salti turno giorno/notte, vista personale, ferie a click, range 2024-2028)
- **Mantenimenti**: registro ore con validazione admin (anche da Telegram), soglia annua 24 h su ore conteggiate, causale "Manutenzione e magazzino" al 50%
- **Attivazioni di emergenza** ✅ collaudate end-to-end: allerta ALPHA/BRAVO/personalizzata → gruppo Telegram + chat private → risposte ✅/❌ in **tempo reale** nella pagina admin (contatori, copertura requisiti, nomi); nome modulo **MO.USARM.VEN.01** (Alpha) / **MO.USARM.VEN.02** (Bravo); chiusura con **CONFERMA ATTIVAZIONE** (conteggiata nei resoconti) o **ANNULLA** (registrata, non conteggiata)
- **Documenti d'emergenza generabili dall'app**: **manifesto Composizione** (PDF del modulo, GENERA PDF COMPILAZIONE), **MANIFESTO USAR.20** (personale, orizzontale, come l'excel DCESTAB), **FACT SHEET USAR.12** (scheda informativa modulo, precompilata)
- **Resoconti**: ferie in giorni, turni effettivi, **resoconto attivazioni mensile** (avvenute/aperte/annullate, operatori attivati con conteggio risposte SÌ)
- **Dashboard**: contatori mantenimenti (in linea / sotto soglia, con ore visibili) e grafici a torta per Comando e Turno
- **Operatori**: ricerca, filtro sotto-soglia, schede con icone specializzazioni sp_*, privacy differenziata per non-admin
- **Profilo**: l'operatore vede e modifica i **propri dati** (anagrafici, specializzazioni, patente ministeriale 1°–4° grado con estensioni, dati sensibili/ICE con consenso informato), **auto-eliminazione account** con conferma e password
- **Bot Telegram** (@Usar_veneto_bot su Render): collegamento con codice a 6 cifre, /ferie, mantenimenti guidati, allerte con risposta in tempo reale, messaggi di CONFERMA ATTIVAZIONE
- **FASE 2 (in corso)**: sezioni Profilo DOCUMENTI, MEDICA, VACCINAZIONI (copertura + storico), RILEVAZIONE TAGLIE, ANAGRAFICA CANI E VACCINAZIONI (solo K9) — import dai fogli del DB anagrafica del nucleo

## Privacy

- **Informativa privacy** pubblica (`index-extra/informativa-privacy.html`), linkata alla registrazione e dal Profilo; accettazione con spunta; consenso registrato (`privacy_consenso_il`)
- **Dati sensibili** (ICE, gruppo sanguigno, indirizzo, dati medici e vaccinali): visibili al proprietario e agli admin, con **log delle consultazioni**; l'operatore vede chi ha consultato la propria scheda
- **Consenso ICE**: spunta nel Profilo con cui l'operatore dichiara che il proprio contatto ICE è informato della registrazione dei suoi dati
- **L'admin non modifica i dati altrui** (trigger DB): ogni modifica la fa l'operatore dal proprio Profilo
- **Ogni utente può eliminare il proprio account** (doppia conferma con password): cancella tutto a cascata, con log

## Sicurezza

- Ruolo admin protetto da trigger DB (niente auto-promozione)
- RLS su tutte le tabelle; sezioni sensibili FASE 2 visibili solo al proprietario e agli admin
- Eliminazione account via RPC lato server con log (auto-eliminazione o admin per altri)
- Segreti (service key, token bot) solo su Render/variabili d'ambiente, mai nel repo

## Architettura

| Componente | Scelta |
|---|---|
| Frontend | **PWA** (Vite, installabile, aggiornamento automatico) |
| PDF | **jsPDF** lato client (manifesto Composizione, USAR.20 orizzontale, USAR.12) |
| Database/Auth/Realtime | **Supabase** — regione Frankfurt (UE), piano Free con **backup via export** (`db/BACKUP-export-letture.sql`) |
| Comunicazioni | **Bot Telegram** su Render con keep-alive |
| Registrazione | Self-service: l'operatore si registra con la sua Gmail e riceve la scheda già compilata |
| Foto profilo | Supabase Storage (bucket privato, URL firmati) |
| Hosting | **GitHub Pages** (deploy automatico a ogni push su `main`, bloccato se i test falliscono) |

## Struttura del repository

```
app/                 codice dell'app (main.js, style.css, supabase.js)
test-app.mjs         test automatici (20 check) — prima di ogni pubblicazione
verifica-build.mjs   verifica del pacchetto — gira anche in CI prima del deploy
db/schema.sql        schema completo (primo setup)
db/migrazione-*.sql  migrazioni successive (stato di esecuzione in CONTINUITA)
db/FASE1-*.sql       FASE 1 import — ESEGUITA (124 profili, 1.873 mantenimenti)
db/FASE2-migrazione-schema.sql  FASE 2 tabelle (documenti, medica, vaccini) — da eseguire
db/FASE2-import.sql  FASE 2 import (1.937 righe verificate) — da eseguire dopo il backup
db/BACKUP-export-letture.sql  backup completo in sola lettura (eseguire PRIMA di ogni import)
import-fase1.py      import FASE 1 dal foglio Google (--simula COGNOME, --genera)
import-fase2.py      import FASE 2 (--simula COGNOME, --genera)
bot/telegram-bot.mjs bot Telegram
public/              statici pubblicati (logo, manifest PWA, service worker)
index-extra/         pagine informative (informativa privacy, infografiche, presentazione)
.github/workflows/   deploy automatico su GitHub Pages
CONTINUITA.md        documento di continuità (leggere PRIMA di riprendere il lavoro)
README.md            questo file
INFORMATIVA-PRIVACY.md · MIGRAZIONE-ACCOUNT.md · MIGRAZIONE-SERVER-CORPO.md · Link del progetto.txt
```

## Backup (piano Free — SUPABASE)

Prima di **ogni** migrazione o import sul database: eseguire `db/BACKUP-export-letture.sql` nel SQL Editor, **copiare tutto l'output** e salvarlo in un file (Drive o PC, es. `backup-db/AAAA-MM-GG.txt`). È il ripristino completo (ogni tabella in JSON + schema).

## Setup (nuovo ambiente)

> ⚠️ L'ambiente attuale è già configurato: queste istruzioni servono solo per ricreare il progetto da zero (vedi `MIGRAZIONE-SERVER-CORPO.md`).

1. Creare un progetto Supabase (regione Frankfurt)
2. Eseguire `db/schema.sql` nel SQL Editor
3. Seguire in ordine di data le migrazioni `db/migrazione-*.sql`
4. Secrets GitHub `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`; in locale `.env` con le stesse
5. Authentication → URL Configuration → Site URL = URL Pages; redirect `<url>/**`; **"Confirm email" disattivato**
6. Bot Telegram su Render con `TELEGRAM_BOT_TOKEN`, `SUPABASE_URL` (solo dominio), `SUPABASE_SERVICE_KEY`, `ALERT_GROUP_CHAT_ID`
7. Storage: bucket `foto-profili` privato (policy da `db/migrazione-foto-log.sql` + `db/fix-bucket-foto.sql`)

## Documentazione

- `CONTINUITA.md` — decisioni, regole di business, stato del lavoro (documento operativo principale)
- `Link del progetto.txt` — tutti i link
- `index-extra/` — pagine informative pubblicate su Pages (informativa privacy inclusa)
- `MIGRAZIONE-ACCOUNT.md` / `MIGRAZIONE-SERVER-CORPO.md` — guide migrazione

## Convenzioni

- Ogni decisione va registrata in `CONTINUITA.md` (consolidando, senza appendici); README e CONTINUITA aggiornati nello stesso commit delle modifiche
- **Prima di ogni push**: `npx vite build && node verifica-build.mjs && node test-app.mjs`
- Sviluppo in fase avanzata: **modifiche sicure e verificate, tutto recuperabile** (regola completa in CONTINUITA sez. 11b)
- Commit in italiano, stile "Area: cosa è cambiato"
- I valori sensibili (service key, token bot) non vanno mai committati
- **Backup prima di ogni import** (v. sopra); dopo ogni migrazione che aggiunge tabelle/colonne: `NOTIFY pgrst, 'reload schema';` nel SQL Editor
