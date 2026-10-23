# App-Usar-Veneto

Gestione squadre, mantenimenti e attivazioni di emergenza per il **Nucleo USAR Veneto** (~250 operatori).

**App online:** https://lucianosbrau.github.io/App-Usar-Veneto/

## Cos'è

Sistema per la gestione operativa del nucleo:
- **Programmazione mensile** dei manifesti Alpha e Bravo (38 unità su modello USAR Medium, rotazione del personale, ricerca nominativi, ferie, contatori, **PDF nativo del manifesto scaricabile da mobile** — jsPDF; layout a sezioni: Direzione blu, Valutazione oro #FFD700, Operazioni rosso #FF0000, Logistica giallo)
- **Calendario turni** ciclico (salti turno giorno/notte, vista personale, ferie con inserimento a click e avviso di conferma, range 2024-2028)
- **Mantenimenti**: registro ore con validazione admin (anche da Telegram), soglia annua (24 h) configurabile
- **Attivazioni di emergenza** ✅ collaudate end-to-end: allerta ALPHA/BRAVO/**personalizzata** → gruppo Telegram "Allerta USAR VENETO" + chat private → risposte ✅/❌ dai pulsanti → **tempo reale** nella pagina admin (contatori, copertura requisiti, nomi), compilazione automatica/manuale del manifesto, PDF
- **Dashboard**: contatori mantenimenti (in linea / sotto soglia) e grafici a torta per Comando e Turno
- **Operatori** (admin): ricerca per nome/cognome, filtro sotto-soglia, schede complete con icone specializzazioni e abilitazioni, foto profilo, simbolo vigile per grado
- **Squadre**: composizioni pubblicate (da Programmazione → PUBBLICA SU SQUADRE), attivazione rapida, modifica e **generazione PDF** per admin
- **Calendario/Resoconti**: ferie in giorni distinti, turni di ferie effettivi (solo quelli che l'operatore avrebbe lavorato)
- **Bot Telegram** (`bot/telegram-bot.mjs`, @Usar_veneto_bot su Render): collegamento account con codice a 6 cifre, pulsanti inline, /ferie, mantenimenti con procedura guidata, **allerte di attivazione con risposta ✅SÌ/❌NO in tempo reale**
- **Report/statistiche** con export Excel/CSV e **PDF** del Manifesto — in parte da sviluppare
- **Internazionale**: abilitazioni missioni e vaccinazioni — da sviluppare

## Privacy

- **Informativa privacy** (`INFORMATIVA-PRIVACY.md`, bozza da validare dal Corpo): alla registrazione è richiesta l'accettazione con spunta; consenso registrato sul profilo (`privacy_consenso_il`)
- **Dati sensibili** (ICE, gruppo sanguigno, indirizzo, vaccinazioni): visibili solo agli admin, con **log delle consultazioni**; l'operatore vede chi ha consultato la propria scheda dal Profilo
- **L'admin non può modificare i dati degli operatori** (solo promuovere/revocare admin ed eliminare account): ogni modifica la fa l'operatore dal proprio Profilo
- **Registro azioni admin** (promozioni, revocabili, eliminazioni account): tabella append-only, consultabile dalla scheda operatore

## Sicurezza

- **Ruolo admin protetto**: trigger DB che impedisce l'auto-promozione (solo un admin esistente può promuovere/revocare)
- **Profili leggibili solo da utenti autenticati** (RLS su tutte le tabelle)
- **Eliminazione account**: richiede la password dell'admin, avviene via RPC lato server, con log
- Dati sensibili (service key, token bot) solo su Render/variabili d'ambiente, mai nel repo
- Prima dei dati reali: eliminare gli account di prova (v. Convenzioni)

## Architettura

| Componente | Scelta |
|---|---|
| Frontend | **PWA** (Vite, installabile, aggiornamento automatico) |
| PDF | **jsPDF** (generazione lato client, mobile-friendly) |
| Database/Auth/Realtime | **Supabase** — regione Frankfurt (UE) |
| Comunicazioni | **Bot Telegram** con keep-alive (le notifiche push PWA sono escluse: richiederebbero account Apple a pagamento) |
| Foto profilo | **Supabase Storage** (bucket privato `foto-profili`, URL firmati) |
| Hosting | **GitHub Pages** (deploy automatico via GitHub Actions a ogni push su `main`) |

## Struttura del repository

```
app/                 codice dell'app (main.js, style.css, supabase.js)
test-app.mjs         test automatici (20 check) — da eseguire prima di ogni pubblicazione
verifica-build.mjs   verifica del pacchetto costruito — gira anche su GitHub prima di ogni deploy
db/schema.sql        schema completo del database (primo setup)
db/migrazione-*.sql  migrazioni successive (vedi CONTINUITA per lo stato di esecuzione)
db/FASE1-*.sql       migrazione FASE 1 import (eseguire SOLO secondo il runbook in CONTINUITA sez. 15)
db/VERIFICA-*.sql    script di verifica in sola lettura
import-fase1.py      script di import FASE 1 dal foglio Google (simulazione: --simula COGNOME)
db/seed-*.sql        dati di prova (operatori fittizi, email prova.*, cancellabili)
bot/telegram-bot.mjs bot Telegram (collegamento account, /ferie, mantenimenti, allerte)
public/              file statici pubblicati (logo, manifest PWA, service worker, screenshot)
index-extra/         pagine informative HTML (infografiche, presentazione) — copiate nel build
.github/workflows/   deploy automatico su GitHub Pages
CONTINUITA.md        documento di continuità (leggere PRIMA di riprendere il lavoro)
README.md            questo file
INFORMATIVA-PRIVACY.md  informativa privacy operatori (bozza da validare dal Corpo)
MIGRAZIONE-ACCOUNT.md    guida migrazione account personali → nucleo
MIGRAZIONE-SERVER-CORPO.md  guida futura migrazione sui server del Corpo
Link del progetto.txt    elenco di tutti i link (app, infografiche, documenti)
```

## Setup (nuovo ambiente)

> ⚠️ L'ambiente attuale è già configurato: queste istruzioni servono solo per ricreare il progetto da zero (es. migrazione sui server del Corpo, vedi `MIGRAZIONE-SERVER-CORPO.md`).

1. Creare un progetto Supabase (regione Frankfurt)
2. Eseguire `db/schema.sql` nella SQL Editor
3. Seguire, in ordine di data, le migrazioni `db/migrazione-*.sql`
4. Impostare i secrets GitHub `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions)
5. In locale: file `.env` con le stesse due variabili (già in `.gitignore`)
6. Authentication → URL Configuration → Site URL = URL di GitHub Pages; redirect URL `<url>/**`; **"Confirm email" disattivato** (accesso immediato — se si riacquisisce, i link di conferma portano a pagine vuote)
7. Bot Telegram: creare con @BotFather, eseguire su piattaforma Node (es. Render) con variabili `TELEGRAM_BOT_TOKEN`, `SUPABASE_URL` (solo dominio, senza `/rest/v1/`), `SUPABASE_SERVICE_KEY` e `ALERT_GROUP_CHAT_ID` (ID del gruppo allerte, si scopre col comando /idgruppo nel gruppo dopo aver aggiunto il bot come admin)
8. Storage: il bucket `foto-profili` è **privato** (URL firmati); le policy sono create da `db/migrazione-foto-log.sql` + `db/fix-bucket-foto.sql`

## Documentazione

- `CONTINUITA.md` — decisioni, regole di business, stato del lavoro (documento operativo principale)
- `Link del progetto.txt` — tutti i link (app, infografiche, PDF, documenti, pannelli)
- Le pagine informative (`index-extra/`: presentazione, anteprima schermate, infografiche, informativa privacy) vengono copiate nel build e pubblicate su Pages
- `MIGRAZIONE-ACCOUNT.md` — guida passo-passo per passare dagli account personali a quelli del nucleo (GitHub/Supabase/Render)
- `MIGRAZIONE-SERVER-CORPO.md` — guida futura migrazione sui server del Corpo

## Convenzioni

- Ogni decisione e azione importante va registrata in `CONTINUITA.md` (consolidando, senza accumulare appendici); README e CONTINUITA vanno aggiornati nello stesso commit delle modifiche
- **Prima di ogni push**: `npx vite build && node verifica-build.mjs && node test-app.mjs` (il deploy su GitHub si blocca da solo se la verifica fallisce)
- Commit in italiano, stile: "Area: cosa è cambiato"
- La chiave anonima Supabase è pubblica per progetto; i valori sensibili (service key, token bot) non vanno mai committati
- Dati di prova: email con prefisso `prova.`, eliminabili con `delete from profili where email like 'prova.%'; delete from auth.users where email like 'prova.%'; delete from mantenimenti where note_seed is true;`
