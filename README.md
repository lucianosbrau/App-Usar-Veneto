# App-Usar-Veneto

Gestione squadre, mantenimenti e attivazioni di emergenza per il **Nucleo USAR Veneto** (~250 operatori).

**App online:** https://lucianosbrau.github.io/App-Usar-Veneto/

## Cos'è

Sistema per la gestione operativa del nucleo:
- **Programmazione mensile** dei manifesti Alpha e Bravo (38 posti, rotazione del personale)
- **Mantenimenti**: registro ore con validazione admin, soglia annua (36 h) configurabile
- **Attivazioni di emergenza** con risposta SÌ/NO (doppio canale PWA + Telegram)
- **Calendario** turni, disponibilità, ferie
- **Report/statistiche** con export Excel/CSV e **PDF** del Manifesto del personale
- **Internazionale**: abilitazioni missioni e vaccinazioni

## Architettura

| Componente | Scelta |
|---|---|
| Frontend | **PWA** (Vite, installabile, offline base) |
| Database/Auth/Realtime | **Supabase** — regione Frankfurt (UE) |
| Comunicazioni | **Bot Telegram + Mini App** |
| Hosting | **GitHub Pages** (deploy automatico via GitHub Actions a ogni push su `main`) |

## Struttura del repository

```
app/               codice dell'app (main.js, style.css, supabase.js)
db/schema.sql      schema completo del database (primo setup)
db/migrazione-*.sql migrazioni successive da eseguire in SQL Editor
public/            file statici pubblicati (logo, manifest PWA, service worker)
.github/workflows/ deploy automatico su GitHub Pages
index.html         entry point
CONTINUITA.md      documento di continuità del progetto (leggere PRIMA di riprendere il lavoro)
```

## Setup (nuovo ambiente)

1. Creare un progetto Supabase (regione Frankfurt)
2. Eseguire `db/schema.sql` nella SQL Editor
3. Impostare i secrets GitHub `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions)
4. In locale: file `.env` con le stesse due variabili (già in `.gitignore`)
5. Authentication → URL Configuration → Site URL = URL di GitHub Pages; disattivare "Confirm email" se desiderato

## Documentazione

- `CONTINUITA.md` — decisioni, stato del lavoro, regole di collaborazione (il documento operativo principale)
- `presentazione.html` — panoramica del progetto
- `anteprima-schermate.html` — mockup delle schermate
- `infografica-flusso.html` — infografica del flusso operativo
- `MIGRAZIONE-SERVER-CORPO.md` — guida futura migrazione sui server del Corpo

## Convenzioni

- Ogni decisione e azione importante va registrata in `CONTINUITA.md` (commit di riferimento)
- Commit in italiano, stile: "Area: cosa è cambiato"
- La chiave anonima Supabase è pubblica per progetto (anon key); i valori sensibili non vanno mai committati
