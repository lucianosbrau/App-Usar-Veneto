# App-Usar-Veneto

Gestione squadre, mantenimenti e attivazioni di emergenza per il **Nucleo USAR Veneto** (~250 operatori).

**App online:** https://lucianosbrau.github.io/App-Usar-Veneto/

## Cos'è

Sistema per la gestione operativa del nucleo:
- **Programmazione mensile** dei manifesti Alpha e Bravo (38 unità su modello USAR Medium, rotazione del personale, ricerca nominativi, ferie, contatori, **PDF nativo del manifesto scaricabile da mobile** — jsPDF)
- **Calendario turni** ciclico (salti turno giorno/notte, vista personale, ferie con inserimento a click, range 2024-2028)
- **Mantenimenti**: registro ore con validazione admin, soglia annua (36 h) configurabile
- **Attivazioni di emergenza** con risposta SÌ/NO (doppio canale PWA + Telegram) — in sviluppo
- **Report/statistiche** con export Excel/CSV e **PDF** del Manifesto
- **Internazionale**: abilitazioni missioni e vaccinazioni — da sviluppare
- **Bot Telegram** (`bot/telegram-bot.mjs`): collegamento account con codice, comando /ferie (giorno/notte, continuative)

## Architettura

| Componente | Scelta |
|---|---|
| Frontend | **PWA** (Vite, installabile, aggiornamento automatico) |
| PDF | **jsPDF** (generazione lato client, mobile-friendly) |
| Database/Auth/Realtime | **Supabase** — regione Frankfurt (UE) |
| Comunicazioni | **Bot Telegram + Mini App** |
| Hosting | **GitHub Pages** (deploy automatico via GitHub Actions a ogni push su `main`) |

## Struttura del repository

```
app/                 codice dell'app (main.js, style.css, supabase.js)
db/schema.sql        schema completo del database (primo setup)
db/migrazione-*.sql  migrazioni successive da eseguire in SQL Editor
db/seed-prova.sql    50 operatori fittizi per test (email prova.*, cancellabili)
bot/telegram-bot.mjs bot Telegram (collegamento account, /ferie)
public/              file statici pubblicati (logo, manifest PWA, service worker)
.github/workflows/   deploy automatico su GitHub Pages
CONTINUITA.md        documento di continuità (leggere PRIMA di riprendere il lavoro)
```

## Setup (nuovo ambiente)

1. Creare un progetto Supabase (regione Frankfurt)
2. Eseguire `db/schema.sql` nella SQL Editor
3. Seguire, in ordine di data, le migrazioni `db/migrazione-*.sql`
4. Impostare i secrets GitHub `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions)
5. In locale: file `.env` con le stesse due variabili (già in `.gitignore`)
6. Authentication → URL Configuration → Site URL = URL di GitHub Pages; "Confirm email" disattivato
7. Bot Telegram: creare con @BotFather, eseguire su piattaforma Node (es. Render) con variabili `TELEGRAM_BOT_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`

## Documentazione

- `CONTINUITA.md` — decisioni, regole di business, stato del lavoro (documento operativo principale)
- `presentazione.html` — panoramica del progetto
- `anteprima-schermate.html` — mockup delle schermate
- `infografica-flusso.html` — infografica del flusso operativo
- `MIGRAZIONE-SERVER-CORPO.md` — guida futura migrazione sui server del Corpo

## Convenzioni

- Ogni decisione e azione importante va registrata in `CONTINUITA.md`
- Commit in italiano, stile: "Area: cosa è cambiato"
- La chiave anonima Supabase è pubblica per progetto; i valori sensibili (service key, token bot) non vanno mai committati
- Dati di prova: email con prefisso `prova.`, eliminabili con `delete from profili where email like 'prova.%'; delete from auth.users where email like 'prova.%';`
