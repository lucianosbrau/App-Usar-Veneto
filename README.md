# App-Usar-Veneto

Gestione squadre, mantenimenti e attivazioni di emergenza per il **Nucleo USAR Veneto** (~250 operatori).

**App online:** https://lucianosbrau.github.io/App-Usar-Veneto/

## Cos'è

Sistema per la gestione operativa del nucleo:
- **Programmazione mensile** dei manifesti Alpha e Bravo (38 unità su modello USAR Medium, rotazione del personale, ricerca nominativi, ferie, contatori, **PDF nativo del manifesto scaricabile da mobile** — jsPDF; layout a sezioni: Direzione blu, Valutazione oro #FFD700, Operazioni rosso #FF0000, Logistica giallo)
- **Calendario turni** ciclico (salti turno giorno/notte, vista personale, ferie con inserimento a click, range 2024-2028)
- **Mantenimenti**: registro ore con validazione admin, soglia annua (36 h) configurabile
- **Attivazioni di emergenza** ✅ collaudate end-to-end: allerta ALPHA/BRAVO/**personalizzata** → gruppo Telegram "Allerta USAR VENETO" + chat private → risposte ✅/❌ dai pulsanti → **tempo reale** nella pagina admin (contatori, copertura requisiti, nomi), compilazione automatica/manuale del manifesto, PDF
- **Report/statistiche** con export Excel/CSV e **PDF** del Manifesto
- **Internazionale**: abilitazioni missioni e vaccinazioni — da sviluppare
- **Dashboard**: contatori mantenimenti (in linea / sotto soglia) e grafici a torta per Comando e Turno
- **Operatori** (admin): schede con icone specializzazioni (🏗️☣️🐕🧗⭐) e abilitazioni (🚚 patente, 🎒 TPSS, 📍 TAS livello)
- **Squadre**: composizioni pubblicate (da Programmazione → PUBBLICA SU SQUADRE), modifica rapida per admin
- **Bot Telegram** (`bot/telegram-bot.mjs`, @Usar_veneto_bot su Render): collegamento account con codice a 6 cifre, pulsanti inline, /ferie, mantenimenti con procedura guidata, **allerte di attivazione con risposta ✅SÌ/❌NO in tempo reale**

## Sicurezza
- **Ruolo admin protetto**: trigger DB che impedisce l'auto-promozione (solo un admin esistente può promuovere/revocare)
- **Profili leggibili solo da utenti autenticati** (RLS)
- Dati sensibili (service key, token bot) solo su Render/variabili d'ambiente, mai nel repo
- Prima dei dati reali: eliminare gli account di prova (v. Convenzioni)

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
db/migrazione-*.sql  migrazioni successive (TUTTE GIÀ ESEGUITE sul progetto attuale, incluse realtime, anagrafica estesa, policy attivazioni)
db/seed-prova.sql    50 operatori fittizi per test (email prova.*, cancellabili)
bot/telegram-bot.mjs bot Telegram (collegamento account, /ferie)
public/              file statici pubblicati (logo, manifest PWA, service worker)
index-extra/         pagine informative HTML (infografiche, presentazione) — copiate nel build
.github/workflows/   deploy automatico su GitHub Pages
CONTINUITA.md        documento di continuità (leggere PRIMA di riprendere il lavoro)
```

## Setup (nuovo ambiente)

> ⚠️ L'ambiente attuale è già configurato e tutte le migrazioni sono state eseguite: queste istruzioni servono solo per ricreare il progetto da zero (es. migrazione sui server del Corpo, vedi `MIGRAZIONE-SERVER-CORPO.md`).

1. Creare un progetto Supabase (regione Frankfurt)
2. Eseguire `db/schema.sql` nella SQL Editor
3. Seguire, in ordine di data, le migrazioni `db/migrazione-*.sql`
4. Impostare i secrets GitHub `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions)
5. In locale: file `.env` con le stesse due variabili (già in `.gitignore`)
6. Authentication → URL Configuration → Site URL = URL di GitHub Pages; "Confirm email" disattivato
7. Bot Telegram: creare con @BotFather, eseguire su piattaforma Node (es. Render) con variabili `TELEGRAM_BOT_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` e `ALERT_GROUP_CHAT_ID` (ID del gruppo allerte, si scopre col comando /idgruppo nel gruppo dopo aver aggiunto il bot come admin)

## Documentazione

- `CONTINUITA.md` — decisioni, regole di business, stato del lavoro (documento operativo principale)
- Le pagine informative (`index-extra/`: presentazione, anteprima schermate, infografiche) vengono copiate nel build e pubblicate su Pages
- `MIGRAZIONE-SERVER-CORPO.md` — guida futura migrazione sui server del Corpo
- `MIGRAZIONE-ACCOUNT.md` — guida passo-passo per passare dagli account personali a quelli del nucleo (GitHub/Supabase/Render)
- `infografica-migrazione.html` — infografica della migrazione account

## Convenzioni

- Ogni decisione e azione importante va registrata in `CONTINUITA.md`
- Commit in italiano, stile: "Area: cosa è cambiato"
- La chiave anonima Supabase è pubblica per progetto; i valori sensibili (service key, token bot) non vanno mai committati
- Dati di prova: email con prefisso `prova.`, eliminabili con `delete from profili where email like 'prova.%'; delete from auth.users where email like 'prova.%';`
