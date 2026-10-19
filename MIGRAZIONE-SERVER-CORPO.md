# Migrazione verso i server del Corpo Nazionale — guida passo passo

> **Scopo**: trasferire l'app USAR Veneto dall'attuale infrastruttura (GitHub Pages + Supabase) ai server interni del Corpo Nazionale, senza perdere dati e senza riscrivere l'app.
>
> **A chi è rivolto**: tecnico che gestisce server, con conoscenze di base di Linux, PostgreSQL e web server. Non serve conoscere il progetto: questa guida è autosufficiente.
>
> **Stato**: documento predisposto in anticipo. La migrazione avverrà in futuro, quando il Corpo metterà a disposizione i server. Nel frattempo l'app vive su GitHub Pages + Supabase (piano Free).

---

## 0. Come è fatta l'app (quadro generale, 2 minuti)

L'app ha 3 componenti:

| Componente | Dove vive oggi | Cosa contiene |
|---|---|---|
| **Interfaccia (PWA)** | GitHub Pages | File statici: HTML, CSS, JavaScript. Cartelle `app/`, `index.html`, `manifest.webmanifest`, `sw.js` |
| **Database + Auth + Realtime** | Supabase (regione Frankfurt, piano Free) | PostgreSQL: dati operatori, attivazioni, mantenimenti, squadre. Schema in `db/schema.sql` |
| **Bot Telegram** | Servizio esterno (Telegram) | Bot che invia allerte e riceve risposte SÌ/NO |

**Principio architetturale**: l'interfaccia NON parla direttamente con Supabase in punti sparsi. Tutte le chiamate al database passano da **un solo file**: `app/supabase.js`. Questo significa che in migrazione si sostituisce solo quello strato: tutto il resto non si tocca.

---

## 1. Cosa serve sul server del Corpo

Prima di iniziare, verificare/ottenere:

- [ ] Un server Linux (o Windows Server) raggiungibile dagli smartphone degli operatori (dominio interno o esterno, es. `https://usar.corpo.it`)
- [ ] **PostgreSQL 14 o superiore** installato (software libero: www.postgresql.org)
- [ ] Un web server per i file statici (nginx, Apache, o IIS su Windows)
- [ ] **Certificato HTTPS** (obbligatorio: le PWA e le notifiche push non funzionano su HTTP)
- [ ] Un runtime **Node.js 18+** (per il bot Telegram e per l'eventuale servizio Realtime)
- [ ] Accesso al sistema di autenticazione istituzionale (LDAP / Active Directory) se si vuole il login con le credenziali del Corpo
- [ ] Un referente tecnico interno che manutenga il server nel tempo (backup, aggiornamenti)

**Nota**: se sul server è già presente un PostgreSQL aziendale condiviso, va bene anche quello — basta un database dedicato (es. `usar_veneto`) con un utente proprietario.

---

## 2. Esportare i dati da Supabase

**Quando**: poco prima della migrazione definitiva (i dati cambiano ogni mese).

1. Accedere alla dashboard Supabase → progetto USAR → **Database → Backups**, oppure usare `pg_dump` da riga di comando.
2. Esportare **solo lo schema** (struttura tabelle, senza dati):
   ```bash
   pg_dump -h <host-supabase> -U postgres -s -d postgres -F p -f schema_usar.sql
   ```
3. Esportare **schema + dati**:
   ```bash
   pg_dump -h <host-supabase> -U postgres -d postgres -F p -f usar_completo.sql
   ```
4. Conservare entrambi i file. Il primo serve se si vuole ripartire puliti; il secondo per portarsi dietro gli operatori, lo storico attivazioni e i mantenimenti.

**Credenziali**: l'host e la password sono nel pannello Supabase → Settings → Database. Non scriverli mai in file committati nel repository.

---

## 3. Ricreare il database sul server del Corpo

1. Creare il database:
   ```sql
   CREATE DATABASE usar_veneto;
   CREATE USER usar_app WITH PASSWORD '<password-forte-e-lunga>';
   ```
2. Importare lo dump completo:
   ```bash
   psql -h localhost -U usar_app -d usar_veneto -f usar_completo.sql
   ```
3. Verificare i conteggi minimi (devono corrispondere a Supabase):
   ```sql
   SELECT count(*) FROM operatori;         -- es. 250
   SELECT count(*) FROM mantenimenti;
   SELECT count(*) FROM attivazioni;
   ```
4. **Crittografia password**: Supabase Auth conserva le password in formato argon2/pgcrypt. Se si passa all'autenticazione del Corpo (LDAP/SSO, sez. 6), le vecchie password non servono più e questo punto si salta. Se invece si mantiene l'auth interna, far resettare la password a ogni utente al primo login (procedura standard, una volta sola).

---

## 4. Sostituire lo strato dati (`app/supabase.js`)

È l'**unica parte di codice che si riscrive**. Il file espone un elenco di funzioni (es. `login()`, `listaOperatori()`, `salvaRisposta()`, `composizioneSquadra()`…). Il nuovo file deve esporre **le stesse funzioni con gli stessi nomi e gli stessi valori di ritorno**, cambiando solo l'implementazione interna: invece delle chiamate a Supabase, query SQL al database interno tramite un piccolo servizio API (consigliato: una API REST leggera in Node.js/Express o FastAPI Python, davanti al PostgreSQL — mai far interrogare il database direttamente dal browser).

**Cosa NON si tocca**: `app/main.js`, `app/style.css`, `index.html`, il manifest, il service worker, la logica del manifesto.

**Test di parità**: dopo la sostituzione, provare in ordine — login → lettura operatori → risposta a una attivazione di prova → export Excel/CSV. Se questi 4 passano, la migrazione dati è riuscita.

---

## 5. Ricreare il Realtime (aggiornamenti in tempo reale)

**Il punto tecnico più delicato.** Oggi la dashboard si aggiorna da sola durante un'attivazione grazie a Supabase Realtime. Su PostgreSQL interno non esiste "out of the box". Opzioni:

1. **WebSocket con NOTIFY/LISTEN** (consigliata): il servizio API del punto 4 apre un canale WebSocket; il database PostgreSQL segnala i cambiamenti con `NOTIFY`; il server li inoltra a tutti i browser collegati. In Node.js: `pg` + `ws`. È la soluzione più fedele al comportamento attuale.
2. **Polling**: l'interfaccia rilegge le risposte ogni 3-5 secondi. Più semplice, funziona sempre, leggero ritardo. Piano B accettabile.
3. **Rete interna con broker**: se il Corpo ha già RabbitMQ/Kafka/altro, usarlo per gli eventi.

Documentare qui la scelta fatta: ________________

---

## 6. Pubblicare l'interfaccia sul server del Corpo

1. Copiare sul web server i file statici: `index.html`, `manifest.webmanifest`, `sw.js`, cartelle `app/` e `assets/` (e i file HTML di documentazione solo se servono).
2. Configurare il web server perché serva tutto da una cartella radice con HTTPS.
3. **Service worker e cache**: gli operatori che avevano già installato la PWA hanno sul telefono la cache con il vecchio indirizzo GitHub. Predisporre:
   - un messaggio via Telegram che comunica il nuovo indirizzo;
   - la versione della PWA con un numero di versione incrementato (`sw.js`, cache name), così al primo accesso al nuovo dominio l'app si aggiorna da sola.
4. **Notifiche push**: le notifiche PWA sono vincolate al dominio (VAPID keys). Sul nuovo dominino si generano nuove chiavi VAPID e si registra un nuovo endpoint. I token Telegram invece restano validi: il bot non cambia.
5. **Vecchio dominio**: tenere attivo GitHub Pages ancora 2-4 settimane con un banner "L'app si è trasferita: <nuovo indirizzo>".

---

## 7. Autenticazione con le credenziali del Corpo

Obiettivo già registrato: login con **nome utente e password degli applicativi del Corpo**.

1. Chiedere al reparto IT del Corpo: quale sistema usano (LDAP, Active Directory, ADFS, altro SSO)?
2. Collegamento tipico: il servizio API del punto 4 valida le credenziali contro LDAP/AD (libreria `ldapts` su Node o `ldap3` su Python) ed emette un token di sessione per l'app. Nessuna password viene conservata nel database USAR.
3. Il mapping utente→operatore resta nella tabella `operatori` (campo username/cognome-nome o matricola).
4. Fallback: se l'integrazione ritarda, si parte con l'auth interna (password resettate, punto 3) e si passa a LDAP in un secondo momento senza toccare il resto.

---

## 8. Bot Telegram

Il bot **non cambia host**: Telegram è un servizio esterno, il bot continua a funzionare. Cambia solo dove gira il processo che lo alimenta:

1. Spostare il runtime del bot sul server del Corpo (stesso servizio API del punto 4 o processo Node dedicato).
2. La token del bot resta la stessa (@usarveneto_bot) — gli operatori **non si accorgono di nulla**, non va rifatta la procedura di collegamento dei codici.
3. Verificare che il server del Corpo abbia **accesso in uscita a internet verso api.telegram.org** (spesso i server istituzionali hanno firewall restrittivi: è la cosa da verificare per prima!).

---

## 9. Cose che si eliminano dopo la migrazione

- [ ] **Keep-alive GitHub Actions** (workflow cron): il progetto Supabase verrà chiuso, non serve più.
- [ ] Account Supabase: esportare un ultimo backup completo prima della chiusura definitiva e conservarlo.
- [ ] Il file `.github/workflows/keep-alive.yml` nel repository si può archiviare (non cancellare: serve come riferimento se mai si tornasse a un piano gestito).

---

## 10. Checklist finale di collaudo

- [ ] Un operatore con telefono nuovo installa la PWA dal nuovo indirizzo e risponde SÌ/NO a un'attivazione di test
- [ ] L'admin vede le risposte arrivare in tempo reale (o con il ritardo accettato del punto 5)
- [ ] I dati sono integri: stesso numero di operatori, mantenimenti e storico attivazioni di prima
- [ ] Il PDF del Manifesto si genera correttamente con i loghi
- [ ] L'export Excel/CSV funziona
- [ ] Il bot Telegram invia l'allerta al gruppo e riceve le risposte
- [ ] Backup automatici del nuovo database configurati (almeno giornalieri, conservazione 30 giorni)
- [ ] Un operatore che aveva la vecchia PWA riceve il messaggio di trasferimento e migra
- [ ] Login testato: admin + operatore

---

## Riepilogo per il tecnico in una frase

> Si copiano i file statici sul web server del Corpo, si importa il dump PostgreSQL nel database interno, si riscrive solo `app/supabase.js` verso la nuova API, si ricrea il canale Realtime (WebSocket NOTIFY/LISTEN) e si sposta il runtime del bot Telegram. Nessun dato va reinserito a mano; l'interfaccia non si riscrive.

Ultimo aggiornamento: 19 ottobre 2025 — predisposto in anticipo, da rivedere al momento della migrazione effettiva.
