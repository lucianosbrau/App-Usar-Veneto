# Migrazione account: da personale a Nucleo/VVF

> Situazione attuale (ottobre 2026): tutto gira sugli account personali di Luciano Di Lorenzo.
> GitHub `lucianosbrau` · Supabase progetto personale (auth via GitHub personale) · Render (accesso con GitHub personale) · bot Telegram @Usar_veneto_bot.
>
> Questo documento descrive **come** passare agli account del Nucleo (Gmail `@gmail.com` del nucleo) o istituzionali VVF (`@dipvvf.it`), quando l'app va in produzione.
> Infografica: `infografica-migrazione.html` (stesso stile del progetto).

## Indice
1. [Principi generali](#1-principi)
2. [Scelta account: Gmail nucleo vs @dipvvf.it](#2-scelta-account)
3. [Fase 0 — preparazione (sul vecchio account)](#3-fase-0)
4. [Fase 1 — GitHub](#4-fase-1-github)
5. [Fase 2 — Supabase (il più delicato)](#5-fase-2-supabase)
6. [Fase 3 — Render (bot)](#6-fase-3-render)
7. [Fase 4 — Telegram](#7-fase-4-telegram)
8. [Fase 5 — dominio e PWA](#8-fase-5-pwa)
9. [Fase 6 — dati e utenti](#9-fase-6-dati)
10. [Checklist finale](#10-checklist)
11. [Costi e piano](#11-costi)
12. [Rischi e mitigazioni](#12-rischi)

---

## 1. Principi

- **Non si smonta il vecchio finché il nuovo non funziona**: parallel run, poi switch.
- **I dati degli operatori non si spostano a mano**: Supabase ha strumenti di trasferimento proprietario (o backup/restore SQL) — mai copiare a mano 250 profili.
- **Il sito cambia URL**: gli operatori dovranno reinstallare la PWA (o usare il redirect automatico, vedi Fase 5).
- **Nessun segreto viaggia in chat o su file**: token e chiavi si reinseriscono a mano nelle piattaforme nuove.
- **Chiave di volta: l'email di accesso**. GitHub, Supabase e Render sono tutti collegati all'identità dell'account personale: la migrazione è in realtà "ricreare la catena sotto una nuova identità".

## 2. Scelta account

| Opzione | Quando usarla | Note |
|---|---|---|
| **Gmail del nucleo** (es. `nucleo.usar.veneto@gmail.com`) | Subito, a costo zero | Gmail normale, nessun vincolo; consigliata per la messa in produzione del nucleo |
| **@dipvvf.it** | Quando il Corpo lo autorizza | GML spesso **filtra le email di terze parti** (già successo con Supabase Auth, v. CONTINUITA "Posta VVF"): verificare PRIMA che riceva le email di GitHub/Supabase/Render; in caso contrario usare il Gmail per gli account e @dipvvf.it solo per le comunicazioni |

**Raccomandazione**: account tecnici su Gmail del nucleo; personale del nucleo usa la propria email (personale o VVF) solo per accedere all'app, non per gli account di servizio. In futuro il SSO VVF sostituirà l'autenticazione degli operatori (già previsto) e la questione si ridimensiona.

## 3. Fase 0 — Preparazione (sul vecchio account, ~30 min)

1. **Inventario segreti** (da reinserire nel nuovo):
   - GitHub: nessun segreto necessario, bastano i diritti di scrittura sul repo
   - Actions secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (le ricalcoli dopo la migrazione Supabase)
   - Render: `TELEGRAM_BOT_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
   - Supabase: Project URL, chiave anon/publishable, service_role/secret
2. **Backup**:
   - Database: Supabase → Database → Backups → scaricare l'ultimo backup (o `Settings → General → Export`)
   - Repo: è già su GitHub, nessun lavoro in più
3. **Elenco degli account admin attivi** (per ricrearli nel nuovo progetto Supabase: la tabella `profili` viaggia col DB, ma `auth.users` va ricreata o transferred)
4. **Congelare le modifiche**: concordare una data in cui nessuno inserisce dati (una finestra di 2-3 ore basta)

## 4. Fase 1 — GitHub

**Obiettivo**: il repo vive sotto l'account (o organizzazione) del nucleo.

1. Creare l'account GitHub con l'email del nucleo (o creare una **GitHub Organization** `nucleo-usar-veneto` — meglio: l'organizzazione sopravvive al ricambio di persona)
2. **Transfer del repository** (via GitHub, non copiando i file):
   - Vecchio account → Settings → General → Danger Zone → **Transfer ownership** → verso l'account/organization nuova
   - GitHub mantiene **storia, issue, stelle e redirect automatico** dal vecchio URL al nuovo (permanente finché non crei un repo con lo stesso nome sul vecchio account)
3. Dopo il transfer:
   - Il workflow Pages continua a funzionare; **riattivare Actions** se sospese
   - Reinserire i secrets (Settings → Secrets and variables → Actions): prima migrare Supabase (Fase 2) e usare i valori NUOVI
   - Reinstallare la **Mistral AI GitHub App** sul nuovo owner per continuare lo sviluppo assistito (io resto collegata al repo)
4. **Il sito cambia URL**: da `lucianosbrau.github.io/App-Usar-Veneto` a `<nuovo>.github.io/App-Usar-Veneto` — aggiornare:
   - Site URL e redirect URLs su Supabase Auth (Fase 2)
   - `vite.config.js` `base` se cambia il path (di solito resta `/App-Usar-Veneto/`)
   - Service worker e manifest (si aggiornano da soli al deploy)

## 5. Fase 2 — Supabase (il più delicato)

**Obiettivo**: nuovo progetto Supabase sotto l'account del nucleo, con gli stessi dati.

Opzione A — **Transfer di progetto** (se Supabase lo offre sul piano attuale, verificare sul pannello: Settings → General → Transfer project):
1. Invitare l'account nuovo come owner del progetto → accettare dal nuovo account
2. Rimuovere l'account personale dall'organizzazione Supabase
3. Il progetto (URL, chiavi, dati) **resta identico**: nient'altro da fare — GitHub Actions e Render vanno aggiornati solo se le chiavi cambiano (nel transfer NON cambiano)

Opzione B — **Progetto nuovo + migrazione dati** (se il transfer non è disponibile o si vuole ripartire puliti):
1. Nuovo account Supabase (email nucleo) → nuovo progetto, regione **Frankfurt** come ora
2. Eseguire su SQL Editor, in ordine: `db/schema.sql` + tutte le migrazioni (elenco in CONTINUITA sez. "Stato dell'applicazione")
3. **Dati**: esportare dal vecchio (Settings → Database → Dump/Export SQL, oppure per il seed di prova rieseguire i seed) e importare nel nuovo. Le tabelle: `profili`, `specializzazioni`, `operatori_specializzazioni`, `programmi_mensili`, `programmi_membri`, `mantenimenti`, `disponibilita`, `attivazioni`, `risposte_attivazione`, `impostazioni`
4. **Utenti di login (`auth.users`)**: NON copiabili direttamente in chiaro. Due strade:
   - con pochi utenti reali: registrarli di nuovo (RESET password via admin) — con 250 operatori è oneroso ma una tantum
   - con Supabase CLI: `supabase db dump` include `auth.users` (le password cifrate viaggiano con il dump) — **consigliato**: verificare che il dump/restore porti anche lo schema `auth`
5. Ricavare i nuovi valori: Project URL + chiave anon/publishable (per GitHub secrets) + service_role/secret (per Render)
6. **Authentication → URL Configuration**: Site URL = nuovo URL GitHub Pages; redirect URLs aggiuntivi

## 6. Fase 3 — Render (bot)

1. Creare account Render **non** con GitHub personale: usare "Sign up with email" e l'email del nucleo (evita la catena con GitHub)
2. New Web Service → repo del nuovo GitHub (autorizza l'account nuovo)
3. Runtime Node · Build `npm install` · Start `node bot/telegram-bot.mjs` · Free · Frankfurt
4. Environment: reinserire `TELEGRAM_BOT_TOKEN` (invariato), `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` **nuovi**
5. Verificare nei log: `bot usar_veneto in ascolto`
6. Spegnete il servizio vecchio SOLO dopo il collaudo del nuovo

## 7. Fase 4 — Telegram

Il bot **non cambia**: @Usar_veneto_bot è legato al token di BotFather (account Telegram di chi l'ha creato). Servono solo:
1. **Token invariato** → nessuna azione, a meno che non si voglia spostare anche BotFather: in tal caso creare un nuovo bot (es. @usar_veneto_bot_ufficiale) con l'account Telegram del nucleo e aggiornare il token su Render. I collegamenti utente (chat_id) restano nel DB, quindi **nessuno deve ricollegare l'account**
2. Se si cambia bot: avvisare gli operatori con messaggio finale sul vecchio bot

## 8. Fase 5 — Dominio e PWA

Con il transfer GitHub l'URL cambia:
1. **Redirect automatico**: GitHub reindirizza il vecchio URL al nuovo (finché non crei un repo omonimo sul vecchio account) — gli operatori con la PWA installata vengono portati al nuovo sito senza fare nulla
2. Comunicazione: messaggio sul gruppo Telegram con il nuovo link + istruzione "Aggiungi di nuovo alla schermata Home" (l'icona PWA punta al vecchio dominio; il redirect la fa funzionare comunque, ma per pulizia meglio reinstallare)
3. **Alternativa consigliata per il futuro**: dominio proprio (es. `usarveneto.it`, ~10 €/anno) come CNAME su GitHub Pages: alla prossima migrazione non cambia più nulla per gli operatori

## 9. Fase 6 — Dati e utenti

1. **Prima della migrazione**: eliminare i seed di prova (CONTINUITA sez. "Database di prova": `delete from profili where email like 'prova.%'; delete from auth.users where email like 'prova.%'; delete from mantenimenti where note_seed is true;`) — a meno che non si voglia testare ancora sul nuovo ambiente
2. **Caricamento dati reali**: export dal Google Sheet/AppSheet del nucleo → import in `profili` (la struttura è già pronta; vedi CONTINUITA "DB NON definitivo: in attesa dell'export dati da AppSheet")
3. **Admin**: 4-5 admin (CONTINUITA); il primo account admin va promosso via SQL sul nuovo progetto (UPDATE profili SET ruolo='admin' con l'utente collegato), poi gli altri dall'app
4. **Keep-alive**: se il nuovo progetto Supabase resta su Free, ricreare il workflow cron (ancora da implementare, v. CONTINUITA "Pausa inattività Supabase")

## 10. Checklist finale

- [ ] Account nuovo creato (Gmail nucleo o VVF, vedi §2)
- [ ] Repo transferito su GitHub nuovo/organization + Actions OK + secrets aggiornati
- [ ] Deploy GitHub Pages funzionante sul NUOVO URL
- [ ] Supabase: transfer (opz. A) o nuovo progetto con dati + auth (opz. B)
- [ ] Supabase Site URL e redirect = nuovo URL Pages
- [ ] Render: nuovo servizio attivo con variabili nuove, log puliti
- [ ] Bot risponde a /start con l'account di prova
- [ ] App: login OK, un operatore di prova risponde a un'allerta end-to-end
- [ ] Vecchi servizi spenti/scollegati SOPO il collaudo
- [ ] Redirect dal vecchio URL verificato da telefono
- [ ] Comunicazione al nucleo (Telegram + email) con nuovo link

## 11. Costi e piano

| Servizio | Ora | Dopo la migrazione |
|---|---|---|
| GitHub | Free (repo pubblico) | Free (se serve il repo privato: Pro $4/mese) |
| GitHub Pages | Free | Free |
| Supabase | Free (pausa dopo 7 giorni di inattività) | Free per iniziare; **Pro $25/mese consigliato in produzione** (no pausa, backup giornalieri, supporto) |
| Render | Free (stop dopo 15 min di inattività) | Free per prova; **Starter $7/mese consigliato** per il bot (sempre attivo) |
| Dominio proprio (opz.) | — | ~€10/anno |

In produzione con 250 operatori la spesa sostenibile è ~$32/mese (Supabase Pro + Render Starter) oppure $0 con i limiti Free (accettando il ritardo di riattivazione del bot e la pausa DB — sconsigliato per le emergenze).

## 12. Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Perdita dati durante il transfer | Backup scaricato in Fase 0 + finestra di congelo inserimenti |
| Vecchio URL smette di reindirizzare | Non creare repo omonimi sul vecchio account; comunicare comunque il nuovo link |
| Email VVF filtra i messaggi (account bloccato) | Preferire Gmail del nucleo per gli account tecnici (già successo con Supabase Auth) |
| Token bot compromesso durante il passaggio | @BotFather → /revoke e nuovo token; aggiornare solo Render |
| Qualcuno resta sul vecchio progetto | Dopo 30 giorni dallo switch, archiviare/sospendere i servizi vecchi |
| Io (AI) perdo l'accesso al repo | Reinstallare la GitHub App Mistral sul nuovo owner (Fase 1.3) |
