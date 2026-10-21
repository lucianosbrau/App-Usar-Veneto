# Documento di continuità del progetto — App USAR Veneto

> **Scopo di questo documento**: consentire a chiunque (persona o AI) di riprendere il lavoro esattamente da dove siamo arrivati, anche in caso di crash di una sessione di lavoro. Aggiornarlo a ogni nuova decisione importante.

Ultimo aggiornamento: 20 ottobre 2026

---

## 1. Cos'è il progetto

**Nucleo USAR Veneto** — sistema per gestire ~250 operatori organizzati mensilmente in due squadre operative:

- **Team Alpha**
- **Team Bravo**

Composizione basata su disponibilità, specializzazioni, abilitazioni, patenti e altri requisiti.

Il progetto include gestione mantenimenti, attivazioni di emergenza con risposta SÌ/NO, resoconti, statistiche e generazione PDF del Manifesto del personale.

## 2. Architettura decisa

| Componente | Scelta | Note |
|---|---|---|
| Frontend | **PWA** (Progressive Web App) | Installabile su home screen, notifiche push, offline base, optimistic UI |
| Backend/DB | **Supabase** — regione Frankfurt (UE) | PostgreSQL + auth + Realtime + API auto. Piano Free da inizio; **non è gratis per sempre** (Pro ~25$/mese). Architettura anti lock-in |
| Comunicazioni | **Bot Telegram + Mini App** | Attivazioni con risposta ✅ SÌ / ❌ NO, calendario, doppio canale di notifica (push PWA + Telegram) |
| PDF | Manifesto del personale | Generato quando l'attivazione è confermata e coerente con la composizione prevista, sul modello grafico che l'utente fornirà |
| Report | Export **Excel e CSV** | Statistiche personali, resoconti attivazioni, mantenimenti |
| Hosting | GitHub Pages (già attivo) | https://lucianosbrau.github.io/App-Usar-Veneto/ |

Futuro opzionale: `.exe` Windows, `.apk` Android, iOS.

## 3. Pagine dell'app (11)

| Pagina | Chi la vede | Cosa fa |
|---|---|---|
| Dashboard | Tutti | Panoramica generale, attivazione rapida (admin) |
| Operatori | Admin | Gestione completa: ricerca, filtri, dettaglio, modifica, inserimento |
| Squadre | Tutti (consultazione) / Admin (modifica) | Composizione Alpha/Bravo del mese in corso |
| Calendario | Tutti | Turni mensili, pubblicazione e invio via Telegram |
| Programmazione mensile | Admin | Compilazione manuale del manifesto programmato Alpha/Bravo del mese successivo (38 posti) con rotazione del personale |
| Disponibilità | Operatore | Disponibilità, ferie, indisponibilità |
| Attivazione | Admin | Lancio emergenza ALPHA/BRAVO, messaggio modificabile prima dell'invio |
| Mantenimenti | Operatore (propri) + Admin (validazione) | Inserimento ore con tipo (Mantenimento, Manovra, Intervento, Lavorazione, Tutor Mantenimento, Tutor Corso, Altra formazione); stato In validazione/Approvato; operatore cancella solo i propri in validazione; evidenziazione sotto-soglia, storico per anno |
| Internazionale | Admin + Operatore (proprio) | Operatori **abilitati alle missioni internazionali** e relative **vaccinazioni** (registro abilitazioni, stato vaccinazioni e scadenze) |
| Report/Statistiche | Admin | Statistiche personali e di intervento, export Excel/CSV |
| Resoconti | Admin | Storico attivazioni: allertati, SÌ, NO, nessuna risposta, orari |
| Profilo | Tutti | Dati personali, specializzazioni e abilitazioni |

**Dashboard — grafici a torta (deciso dall'utente)**: nella pagina principale, prima dell'attivazione, due torte:
- **Personale per Comando** (numero, diviso per provincia — i Comandi sono le province del Veneto: Venezia, Verona, Padova, Vicenza, Treviso, Belluno, Rovigo)
- **Personale per turno** (A, B, C, D — a prescindere dal Comando)
- Palette **varia** (non solo rossa): rosso #B22222, blu #2563EB, verde #059669, ambra #F59E0B, viola #7C3AED, teal #0D9488, grigio #94A3B8 — già applicata nel mockup dashboard di `anteprima-schermate.html`

## 4. Ruoli

**Operatore**: modifica dati propri consentiti; modifica specializzazioni e abilitazioni; inserisce disponibilità e ferie; consulta il proprio calendario; riceve comunicazioni Telegram; risponde alle attivazioni; inserisce i propri mantenimenti (autocertificati).

**Amministratore**: gestisce operatori; definisce requisiti Alpha/Bravo; usa proposta automatica di composizione + modifica manuale; crea e invia calendario mensile via Telegram; attiva ALPHA o BRAVO; consulta report e resoconti; **approva/rifiuta i mantenimenti** degli operatori; genera il Manifesto PDF; configura le impostazioni (soglia ore).

## 5. Attivazione di emergenza (specifica dettagliata)

1. Admin seleziona **ATTIVA ALPHA** o **ATTIVA BRAVO**, modifica il messaggio di emergenza, invia.
2. Allertamento via gruppo Telegram + notifica push PWA (doppio canale).
3. Ogni operatore risponde ✅ SÌ / ❌ NO; il sistema registra risposta e orario.
4. Dashboard aggiornata in **tempo reale** (Supabase Realtime).

### Schermata di attivazione — layout deciso (simulato in `anteprima-schermate.html`)

1. Selezione squadra + messaggio modificabile + pulsante INVIA ALLERTA
2. **Risposte in tempo reale**: nome, orario risposta, risposta SÌ/NO/in attesa — con **icone specializzazioni** accanto a ogni nome (🚛 Autista, 🏗️ Strutturista, ☣️ NBCR, 🐕 Cinofilo, 🧯 SAF, ⛑️ Caposquadra/elmo rosso)
3. **Copertura requisiti del modulo — Team ALPHA**: il conteggio pesca *prioritariamente* dagli operatori Alpha che hanno risposto SÌ. Per ogni specializzazione: omini verdi (coperti) / grigi (carenze), conteggio colorato, barra di progresso. Righe: Autisti, Strutturisti, Capisquadra, NBCR, Cinofili, SAF, Personale generico, Totale modulo. I numeri nell'anteprima (6 autisti, 2 strutturisti, 4 capisquadra, 3 NBCR, 3 cinofili, 2 SAF, resto generico fino a 32 unità) sono **esempi, non vincoli reali**
4. **Sezione SQUADRA BRAVO**: operatori inseriti in Bravo con risposta positiva — nome per riga + icone specializzazioni
5. **Sezione RISERVE**: risposta positiva ma non inseriti in nessuna squadra — stesso formato

### Requisito registrato (da implementare)

> Nella web app e app mobile, durante un'attivazione l'admin potrà **cliccare sul nome** di un operatore di **Squadra Bravo** o **Riserve** e **attivarlo per spostarlo in squadra Alpha** in caso di necessità (carenze di qualifica). Il conteggio di copertura si aggiorna in tempo reale.

## 6. Mantenimenti (ex "addestramenti")

**Ridefinito dall'utente**: la funzione un tempo chiamata "addestramenti" ora si chiama **MANTENIMENTI**.

- Registro ore per operatore, totale annuale
- **Soglia minima: 36 ore annue** per operatore (decisa dall'utente)
- Evidenziazione automatica rosso/giallo di chi è sotto soglia
- Dettaglio: data, tipo, ore
- Storico confrontabile anno per anno
- Export Excel/CSV

### Inserimento e validazione dei mantenimenti (deciso dall'utente, aggiornato)

- Ogni operatore inserisce da solo i propri mantenimenti, ma **ogni inserimento richiede l'approvazione dell'admin** (niente più autocertificazione automatica):
  - **Stato "In validazione"**: appena inserito dall'operatore, in attesa dell'admin
  - **Stato "Approvato"**: confermato dall'admin (icona verde, pollice in su / faccina che ride — icona definitiva da scegliere)
  - Nell'area Mantenimenti dell'operatore: elenco dei **solo approvati** (con conteggio ore valide) e dei **propri in validazione**
  - **L'operatore può cancellare un suo mantenimento solo se è ancora in validazione** (gli approvati non sono eliminabili da lui)
  - L'admin vedrà la coda dei mantenimenti da validare e potrà approvare o respingere
  - **Rifiuto con note facoltative**: quando l'admin rifiuta, può scrivere un motivo (campo `note_rifiuto`) che l'operatore vedrà
- Nella sezione Mantenimenti dell'operatore: funzione **"Aggiungi ore mantenimento"** con campi:
  - **Cognome, Nome** — in automatico dal login utente (non editabili)
  - **Data mantenimento**
  - **Tipo mantenimento** — elenco a discesa con causali fisse: **Mantenimento, Manovra, Intervento, Lavorazione, Tutor Mantenimento, Tutor Corso, Altra formazione**
  - **Argomento/Attività svolta**
  - **Ore prestate**
- **Validazione obbligatoria**: se manca un dato, l'inserimento dà **errore** e **evidenzia i campi mancanti**
- **La soglia la definisce l'Admin**. In un secondo momento sarà strutturata la sezione **"Impostazioni"** (riservata all'Admin) dove cambiare le ore soglia senza modificare il codice (valore iniziale: 36)

### Admin multipli (deciso dall'utente)

- Gli admin saranno **4-5** su ~250 utenti, ognuno con le proprie credenziali e nome
- **Un admin può promuovere altri utenti ad admin** (e, di conseguenza, revocare) dalla pagina di gestione operatori o da Impostazioni — nessuna modifica al codice o al database per creare un admin
- Nel database: il campo `ruolo` del profilo ('operatore' | 'admin') aggiornabile da un admin tramite apposita policy di sicurezza

### Registrazione dell'operatore al bot Telegram (decisa, illustrata in `presentazione.html`)

1. L'operatore accede alla web app → pagina **Profilo** → voce "Collega Telegram"
2. L'app mostra un **codice numerico** (es. 48-21) valido 15 minuti, con pulsante di copia
3. Su Telegram cerca il bot ufficiale (es. @usarveneto_bot) e preme AVVIA
4. Invia il codice al bot → "✅ Account collegato"

Il codice dimostra la titolarità dell'account (impedisce a estranei di ricevere le allerte), scade in 15 minuti e non viene mai inviato in giro. Dopo il collegamento: conferme delle risposte, calendario, comunicazioni, accesso Mini App senza login. Gestione errori: nuovo codice da Profilo se scaduto/errato; procedura da ripetere su nuovo telefono; l'admin vede chi è collegato.

### Internazionale — indicazione dell'utente

La sezione conterrà gli **operatori abilitati alle missioni internazionali** e le relative **vaccinazioni**. I dettagli (quali vaccinazioni tracciare, scadenze/booster, tipi di abilitazione) verranno definiti più avanti: **l'utente fornirà uno schema preciso**, e gran parte della struttura sarà tratta dal **database esistente** da verificare (vedi sez. 10).

### Autenticazione — indicazione dell'utente (per la messa in produzione)

Una volta validata l'app, sarebbe opportuno che **tutti gli utenti accedano con credenziali già in possesso: nome utente e password degli applicativi del Corpo Nazionale** (SSO / integrazione con il sistema di autenticazione istituzionale del corpo). Da verificare in fase di validazione: che sistema di identità usa il corpo (LDAP/Active Directory, SSO, altro) e se/come Supabase Auth possa integrarcisi. Nella fase di sviluppo iniziale si procederà comunque con l'autenticazione nativa di Supabase (email + password), progettata per essere sostituibile.

### Dati anagrafici nel database (deciso dall'utente)

Oltre a cognome e nome, il database conterrà:
- **Codice fiscale**
- **Comando di appartenenza** (diviso per provincia)
- **Sede di servizio**
- **Turno** (A, B, C, D)
- **Salto turno** (ogni lettera del turno affiancata da un numero da 1 a 8, es. A2, A5, C3)

## 7. Report e resoconti

- **Statistiche del personale**: assegnazioni Alpha/Bravo per operatore, totale impieghi, media mensile, operatore con più/meno interventi, storico filtrabile per periodo e squadra
- **Resoconto attivazioni**: personale allertato, SÌ/NO/nessuna risposta, orari delle risposte, storico filtrabile
- Tutto esportabile **Excel e CSV**

## 8. Stile visivo (mockup già validati)

**AGGIORNAMENTO FINALE (dettato dall'utente, sui due screenshot nel Drive cartella USAR VENETO)**: la palette dei veri applicativi VVF è:
- **Rosso principale: #B22222** (chiaro #CD3A3A, scuro #8B1A1A) — deciso dall'utente
- **Banda tricolore italiana** (verde #008C45, bianco, rosso #CD212A) sotto l'intestazione
- **Sfondo tutto bianco**
Il blu è stato eliminato come colore principale. Header rosso, riga tricolore, sfondo bianco.

**Palette secondaria** (per icone stato, grafici a torta variati, dettagli — decisa dall'utente per i grafici):
- Rosso principale `#B22222` (chiaro #CD3A3A, scuro #8B1A1A); per i grafici a torta: palette varia (blu `#2563EB`, verde `#059669`, ambra `#F59E0B`, viola `#7C3AED`, teal `#0D9488`, arancione `#EA580C`, grigio `#94A3B8`)
- Stato: verde `#D1FAE5`/`#065F46`, giallo `#FEF3C7`/`#92400E`, rosso `#FEE2E2`/`#991B1B`
- Login: sfondo rosso (gradiente #B22222→#CD3A3A), card bianca 420px, angoli 20px, campi 52px arrotondati 10px
- Dashboard: sidebar 260px scura, card squadre con bordo sinistro colorato e badge PRONTA/PARZIALE, pulsanti grandi ATTIVA
- Font: Inter/Roboto, ombre morbide, angoli arrotondati 10-16px
- Simulazioni complete in `anteprima-schermate.html`; panoramica in `presentazione.html`

## 9. Stato del repository

**Infografica del flusso operativo**: richiesta dall'utente un'infografica simile a "BUSSOLA ONLINE" (Drive, cartella BUSSOLA DISTRIBUITA) che descriva il workflow dell'app — ma con **meno elementi** (l'originale è troppo confusionaria) e **stile essenziale** con i colori del progetto (rosso #B22222, tricolore, bianco; solo logo USAR in `assets/logo-usar.jpg` — **logo VVF rimosso su richiesta dell'utente: meglio senza**). File: `infografica-flusso.html`.

**Realizzata e validata dall'utente**. Struttura: 8 fasi numerate in 4 sezioni (Attivazione 1-3, Composizione 4-5, Manifesto 6-7, Post intervento 8); ogni scheda ha un **badge dispositivo** (📱 mobile, 🖥️ PC, ☁️ server esterno); in fondo la tabella **"Dove risiede cosa"** (codice→GitHub, interfaccia→GitHub Pages, DB/auth/realtime→Supabase, bot→Telegram, PDF ed export→nel browser, loghi→GitHub/Drive, documentazione→GitHub+skill). Header simmetrico a griglia con solo logo USAR.

- File: `README.md`, `presentazione.html` (panoramica progetto), `anteprima-schermate.html` (mockup 5 schermate con dati finti), `CONTINUITA.md` (questo documento)
- GitHub Pages attivo su `main`: ogni file HTML committato è visibile a https://lucianosbrau.github.io/App-Usar-Veneto/<file>
- Ramo predefinito: `main` (già verificato corretto)
- Esiste una **base applicativa iniziale** (`app/main.js` login e dashboard base, `app/supabase.js` strato dati, `db/schema.sql` tabelle con RLS, PWA con service worker) — da completare con le funzioni delle pagine. Documentazione e mockup: `presentazione.html`, `anteprima-schermate.html`, `infografica-flusso.html`, `MIGRAZIONE-SERVER-CORPO.md` (guida futura migrazione sui server del Corpo)

## 10. Note legali / privacy

- Dati personali e potenzialmente delicati (vaccinazioni, abilitazioni): prima della messa in produzione serve verifica specifica **GDPR** (ruoli di accesso, conservazione, backup). Server UE aiuta ma **non è conformità automatica**
- Da verificare: database attualmente utilizzato dall'utente (Google Sheets / Excel / SQL / AppSheet) per riutilizzare i dati esistenti senza reinserirli

### Pausa inattività Supabase — soluzione decisa (keep-alive)

Il piano Free sospende il progetto dopo **7 giorni di inattività** (nessuna richiesta/login/API). In emergenza la riattivazione richiede pochi minuti — inaccettabile. Soluzione: **keep-alive con GitHub Actions cron** nel repo dell'app — un workflow gira ogni 5-6 giorni e fa una lettura semplice al database (es. `SELECT count(*)`), impedendo la pausa. Gratuito, zero manutenzione, disattivabile se si passa al Pro. Alternativa da valutare: il bot Telegram in polling tocca il DB a ogni giro. Da implementare quando si crea il progetto Supabase.

## 11. Stato della sessione e prossimi passi

**Situazione a fine sessione del 19 ottobre 2026**: tutte le decisioni fino a qui sono registrate; l'utente sta creando il **progetto Supabase** (URL + chiave anonima). Il codice vera inizia al suo arrivo.

**Decisioni prese in questa sessione** (già riflesse sopra e nei file):
- ~250 operatori (aggiornato ovunque); nessun problema tecnico: Supabase Free ampiamente sufficiente
- Grafici a torta in dashboard con palette varia
- Campi anagrafici DB: codice fiscale, comando (provincia), sede, turno A-D, salto turno (lettera+numero 1-8)
- Soglia mantenimenti 36 ore/anno, definita dall'admin, configurabile da futura sezione **Impostazioni**
- Mantenimenti con **flusso di validazione**: in_validazione → approvato/rifiutato dall'admin; note di rifiuto facoltative; operatore cancella solo i propri in validazione
- **4-5 admin** su ~250; un admin può promuovere/revocare altri admin dall'app
- Colori schede manifesto: blu/senape/rosso/giallo limone
- Logo VVF rimosso da tutti i documenti (richiesta utente)
- Guida migrazione predisposta: `MIGRAZIONE-SERVER-CORPO.md`; con migrazione fatta, il keep-alive non serve più
- Icona disposititvo per fase nell'infografica; header allineato

**Ordine di sviluppo concordato**: autenticazione/ruoli → operatori → disponibilità → squadre → attivazione realtime → mantenimenti (con validazione) → report/export → PDF manifesto → bot Telegram → Impostazioni admin.

**Da chiedere all'utente quando si presenta l'occasione**:
- Icona definitiva per mantenimenti approvati (pollice in sù vs faccina)
- Se l'admin può anche revocare un mantenimento già approvato
- Schema sezione Internazionale (vaccinazioni)
- Database esistente da importare

1. Ottenere dall'utente: **progetto Supabase (URL + chiave anonima)** — l'utente lo sta creando; poi: database esistente da importare, elenco definitivo requisiti Alpha/Bravo, schema sezione Internazionale (vaccinazioni)
2. Impostare il progetto della web app (PWA) e lo schema del database Supabase
3. Sviluppare per priorità (dettagliato sopra in "Ordine di sviluppo concordato")

## 12. Skill di conoscenza: `vvf-usar`

Esiste una **skill persistente** (documenti di conoscenza collegati all'account utente, disponibili in ogni sessione tramite `list_skills` → `read_skill`):

- **Nome**: `vvf-usar` (v4) — *Caricare sempre questa skill all'inizio di ogni sessione di lavoro sul progetto.*
- **Contenuto**: struttura e composizione del modulo USAR Medium CNVVF (38 unità operative + 5 sanitarie), ruoli e specializzazioni obbligatorie (2 strutturisti, 2 NBCR, 4 K9, 2 capisquadra, 2 SAF 2A), squadra assessment, UCC/SCC, e il **modello del documento "COMPOSIZIONE TEAM USAR VENETO"** (sezioni 1-38, regole di impaginazione e compilazione per il PDF Manifesto)
- Fonti: Manuale Formazione USAR Medium CNVVF 2024, SGO USAR 2021, INSARAG 2020

**Conseguenze per l'app**:
- La "copertura requisiti" dell'attivazione si basa sulle specializzazioni obbligatorie del modulo Medium
- Il PDF Manifesto segue il modello a 38 voci progressivi per sezioni (Direz. e Comando 1-6, Valut. e Sicurezza 7-10, Ricerca 11-16, Soccorso 2 turnazioni 17-32, Logistica 33-38); nomi in MAIUSCOLO, ordine logico 33-38
- **Chiarito dall'utente**: Alpha e Bravo sono **due squadre da 38 unità ciascuna**. Bravo è la seconda, che parte quando Alpha è già stata attivata.

### Manifesto — flusso di compilazione deciso (in linea di massima, da rifinire)

1. L'admin verifica il raggiungimento delle 38 unità (eventualmente spostando personale da Bravo o dalle Riserve ad Alpha, come da requisito del click sul nome)
2. All'apertura della maschera di compilazione, l'app **chiede se effettuare compilazione automatica o manuale**
3. Se **automatica**: l'app precompila le 38 funzioni partendo dalle risposte SÌ e dalle specializzazioni di ciascuno; l'admin corregge solo dove serve. Se **manuale**: elenco a discesa per ogni funzione
4. **Elenchi a discesa intelligenti**: escludono automaticamente chi è già inserito in altre funzioni e mostrano **prima gli idonei** alla specifica funzione (strutturisti per "Strutturista", K9 per "Unità cinofila", ecc.). Le funzioni obbligatorie (2 strutturisti, 2 NBCR, 4 K9, 2 capisquadra, 2 SAF 2A) sono evidenziate: il manifesto non è completo finché non sono coperte
5. **Validazione in tempo reale**: indicatore tipo "34/38 — mancano: 1 NBCR, 2 soccorritori, 1 logista"; esportazione incompleta possibile solo con conferma esplicita
6. **Modifica post-compilazione automatica** (requisito importante, registrato dall'utente): dopo una compilazione automatica, per correggere un singolo posto **non si deve prima liberare il nominativo** che serve (es. non si deve prima toglierlo dal posto dove l'auto-compilatore lo ha messo per trovarlo nell'elenco di un altro posto). Gli elenchi a discesa devono mostrare **tutti i nomi ancora disponibili** (non ancora assegnati ad alcun posto). Ogni posto ha accanto un **pulsante "clear"** che toglie il nominativo da quel posto e lo rimette tra i disponibili. **Chiarito dall'utente**: se si seleziona direttamente dall'elenco a discesa un nominativo già assegnato ad altro posto (senza prima fare clear), l'app lo **sposta automaticamente**: il nuovo posto riceve il nominativo e il posto precedente si svuota da solo. In sintesi: auto-compilazione → correzioni facili: clear sul posto sbagliato + scelta del nome giusto nell'elenco a discesa (che mostra tutti i liberi)
7. **No drag & drop** nella maschera manifesto (scartato dall'utente — su mobile i menu a discesa sono più affidabili)

**Colori delle schede sezione del manifesto (decisi dall'utente)**:
- **Direzione e Comando**: blu (#2563EB)
- **Valutazione e Sicurezza**: senape (#C99700)
- **Operazioni (Ricerca e Soccorso)**: rosso (#B22222)
- **Logistica**: giallo limone (#EDE614, testo scuro)
8. Esportazione **PDF** secondo il modello `modello-team-alpha.md` (38 voci, sezioni, maiuscolo, ordine logico 33-38)
9. Invio del PDF su chat Telegram: **opzionale, da verificare** (l'utente non è sicuro di volerla). Tecnica: fattibile — il bot può inviare documenti a chat/gruppi —; si deciderà se attivarla per gruppo, solo admin, o disattivata

## 13. Come lavorare con l'utente

- L'utente **non è programmatore**: gestire GitHub in autonomia (commit, merge, PR) e spiegare in linguaggio semplice cosa è stato fatto
- L'utente deve dare **OK esplicito** prima di toccare codice o procedere con sviluppi; registrare requisiti senza implementare quando chiede solo di "registrare"
- Comunicazione in italiano
- Ogni nuova decisione importante va riportata in questo documento
- **Ogni azione svolta** (sviluppi, commit, modifiche a schema o config, verifiche) va registrata in questo documento con commit di riferimento, così un crash della sessione non perde nulla

---

## 14. Stato dell'applicazione (aggiornato al 20 ottobre 2026)

### Sistema operativo ✅
- **App online**: https://lucianosbrau.github.io/App-Usar-Veneto/ — deploy automatico a ogni push su `main` (GitHub Actions: build Vite con secrets `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, pubblicazione GitHub Pages)
- **Database Supabase collegato** (regione Frankfurt): schema completo `db/schema.sql` eseguito + migrazioni (`migrazione-policy-profili.sql`, `migrazione-programmazione.sql`) — 9 tabelle base + `programmi_mensili`/`programmi_membri` + colonna `patente`
- **Utente admin attivo**: Luciano Di Lorenzo (lucianosbrau@gmail.com)
- Configurazioni Supabase fatte: confirm email OFF, Site URL = GitHub Pages, redirect URLs impostati
- Versione visibile nell'app: v. 20/10/2026 (in sidebar e menù mobile)
- Aggiornamenti automatici: service worker riscritto (pagina sempre dal server, reload automatico su nuova versione, controllo orario)

### Pagine sviluppate
| Pagina | Stato |
|---|---|
| Login + Registrazione | ✅ completa (placeholder `nome.cognome@vigilfuoco.it`, box verde successo, creazione automatica profilo) |
| Mantenimenti | ✅ completa (inserimento con validazione, coda admin approva/rifiuta con note, storico, soglia 36 h configurabile) |
| Programmazione mensile | ✅ completa (38 posti del modulo, tendine rotazione 6 mesi, ROS 17/25 con capi prima, conteggi e autisti) |
| Operatori | ⚙️ base (elenco; da fare: dettaglio, modifica, promozione admin, reimposta password) |
| Dashboard | ⚙️ base (benvenuto; da fare: card team, grafici torta, attivazione rapida) |
| Attivazione | ⚙️ mockup (da collegare al DB e al bot) |
| Profilo | ⚙️ base (codice Telegram finto; da collegare al bot) |
| Squadre, Calendario, Internazionale, Report, Resoconti | ❌ da sviluppare |

### Regole di business fissate (NON reinventare)
- **Modulo USAR Medium**: 38 unità operative (+5 sanitarie); obbligatorie 2 strutturisti (posti 7, 9), 2 NBCR (8, 10), 4 K9 (11, 12, 14, 15), 2 ROS/caposquadra (17, 25), 2 SAF (22, 30); tecnici strumentista 13, 16; soccorritori 18-21, 26-29; addetti sicurezza 23, 31; sentinelle 24, 32; logistica 33-38. Valori in tabella `impostazioni` (modulo_totale, modulo_strutturisti, modulo_nbcr, modulo_k9, modulo_capisquadra, modulo_saf)
- **ROS = Caposquadra/Caporeparto**, attributo non sezione; nei posti 17/25 la tendina mostra **prima i capi** (⭐), poi gli altri; se un capo è anche K9/NBCR/SAF la specializzazione vince
- **Generico** = chi NON è strutturista/K9/NBCR 3°/SAF 2A; solo in posti senza requisito obbligatorio
- **Autista**: non è un ruolo; patente nel profilo, solo conteggio (numero e grado)
- **Tendine**: prima i meno recenti («IL MESE SCORSO»/«N MESI FA»/«MAI INSERITI»), finestra storico 6 mesi
- **Un operatore = un posto per programma** (DB); squadre diverse nello stesso mese: permesso
- **Admin**: 4-5, promuovibili dall'app (da sviluppare in Operatori); può sempre modificare/ripubblicare i programmi (pubblicazione Telegram: placeholder fino al bot)

### Interfaccia mobile (regole fissate)
- Barra in basso — **admin**: Dashboard, Squadre, Programmazione, Attivazione; **operatore**: Calendario, Squadre, Mantenimenti — più ☰ Menù
- Menù ☰: TUTTE le voci del ruolo + 🚪 Esci
- Sidebar (PC): tutte le voci + Esci + versione in basso
- Titoli pagina: maiuscola iniziale

### Note operative
- **Posta VVF filtra le email Supabase** (GML le riceve): per ora si registra con mail personale; Custom SMTP (es. Brevo/SMTP2GO) prima dell'apertura al nucleo; si risolve col futuro SSO VVF
- **Recupero password** (finché non c'è SMTP): via SQL `update auth.users set encrypted_password = crypt('Temp', gen_salt('bf')) where email='...'`; poi sviluppare funzione admin in Operatori
- **DB NON definitivo**: in attesa dell'export dati da AppSheet; lo schema potrà adattarsi
- Rimossi i file di prova `v2.html` e `reset.html` (serviti per il debug cache, non più necessari col service worker nuovo)

### Database di prova (20/10/2026)
- Creati `db/migrazione-anagrafica.sql` (campi: grado, comando, sede, turno, salto_turno, nbcr, saf, tpss, tas su `profili`) e `db/seed-prova.sql` (50 operatori fittizi, email `prova.*@usarveneto.test`, distribuzione: 8 ROS da grado CRE/CR/CSE/CS, 6 strutturisti, 5 NBCR 3°, 5 SAF 1A, 6 K9, 10 autisti, 10 generici; tutti i comandi del Veneto)
- **L'utente deve eseguire in SQL Editor**: migrazione-anagrafica.sql poi seed-prova.sql (o l'equivalente unico file)
- Quando arrivano i dati reali dal Google Sheet: `delete from profili where email like 'prova.%'; delete from auth.users where email like 'prova.%';` — il seed non tocca dati veri. NOTA: il seed crea anche gli utenti di login fittizi in `auth.users` (password `Prova2026!` per tutti) perché `profili.id` è vincolato a `auth.users` (foreign key) — la prima versione del seed falliva con errore 23503 per questo
- Gradi: D, VD, IA, CRE, CR, CSE, CS, VC, VE, VF — **CRE/CR/CSE/CS = ROS** (caposquadra/caporeparto); l'app identifica i ROS dal campo `grado`
- **Patente = GRADO di patente (chiarito dall'utente)**: valori **1°, 2°, 3°, 4°** + **estensioni** (Autoscala, Autogru, Anfibio) in `estensioni_patente` (migrazione anagrafica aggiornata — **da eseguire**: `alter table profili add column if not exists estensioni_patente text[];`). Nelle tendine: 🚚4°+AS / +AG / +AN; nel riepilogo autisti grado ed estensioni per esteso (NON le categorie europee B/C/D che erano un'ipotesi errata del seed). Il seed ora usa i gradi; per i 50 già caricati eseguire: `update profili set patente = case patente when 'B' then '1°' when 'D' then '2°' when 'C' then '3°' when 'C+E' then '4°' else patente end where email like 'prova.%';`
- **SAF (chiarito dall'utente)**: valori possibili 1A, 2A, Basico, Avanzato; **per il modulo contano SOLO 2A e Avanzato** — nel seed ora ci sono 10 SAF (5×2A + 5×Avanzato); il posto 22/30 va occupato da un SAF 2A o Avanzato

### Calendario turni sviluppato (20/10/2026, richiesta utente)
- **Regola ciclica salti turno** (fissata — NON reinventare): riferimento **01/11/2026 = B2 giorno / A2 notte**; lettera avanza ogni giorno (B→C→D→A), numero sale dopo 4 giorni, **ciclo completo di 32 coppie (A1..D8)**; la notte del giorno n ha il salto del giorno n-1 (sfalsata). Chi ha il salto turno del giorno/notte è in **riposo**
- Formula verificata: 01/11/2024 = D3/C3; 01/03/2027 = B8/A8 (l'utente deve confermarle sul calendario reale)
- Pagina Calendario: navigazione mesi, range **01/01/2024–31/12/2028**, gestione anni bisestili (calcolo su giorni reali UTC); **vista personalizzata**: le due caselle del proprio salto turno evidenziate in **giallo**
- Pagina Profilo: l'operatore modifica da solo **turno, salto turno, comando, sede** (salvataggio su profili)
- **Disponibilità/ferie**: la programmazione mensile NON ha vincoli di salto turno; l'operatore inserirà solo causale **"Ferie"** dall'app Telegram (dettagli futuri); tabella `disponibilita` pronta
- **Ferie inseribili dal Calendario** (richiesta utente): click sulla cella ☀️ = ferie **diurna**, click su 🌙 = ferie **notturna** (nuovo campo `turno_ferie` in `disponibilita` — migrazione `db/migrazione-ferie-turno.sql` **da eseguire**: aggiunge colonna + policy delete proprie); click di nuovo = cancella. Ricap admin nel badge: nomi con ☀️/🌙 per turno. Bot /ferie aggiornato: registra **giorno** di default; con la parola **"continuative"** registra giorno+notte per ogni data. Recap admin nel Calendario: sezioni **GIORNO/NOTTE** con nominativi sotto la data. Aggiunta pagina **Resoconti**: contatore ferie del mese (giorni diurni, notti, operatori coinvolti, dettaglio per persona). Titoli pagine in costruzione ora con maiuscola (Squadre, Internazionale, Report e Statistiche)
- **Ferie nel Calendario** (aggiunto dopo richiesta utente): riga del giorno con **sfondo blu chiaro** se è il TUO periodo di ferie; per l'admin **badge «🏖 N in ferie»** su ogni giorno (nomi nel tooltip al tocco). In Programmazione: «N gg ferie» nelle tendine + avviso dopo inserimento

### Ferie nella Programmazione (20/10/2026, richiesta utente)
- Nelle tendine della Programmazione chi ha ferie nel mese programmato mostra **«🏖 N gg ferie»** nell'etichetta
- Dopo l'inserimento di chi è in ferie: **avviso** «Attenzione, Cognome Nome è in ferie dal gg/mm al gg/mm (N giorni)»
- Dati dalla tabella `disponibilita` (tipo='ferie', range del mese programmato); **nessun blocco**, solo informazione — decisione dell'admin
- Aggiunta policy RLS: operatore inserisce le proprie disponibilita/ferie (in schema.sql e migrazione-anagrafica.sql — **da eseguire la riga policy se già migrato**)

### Bot Telegram — avviato (21/10/2026)
- Creato `bot/telegram-bot.mjs` (Node): comandi /start, collegamento account via **codice** (es. 48-21, 15 min, monouso), **/ferie gg/mm/aaaa - gg/mm/aaaa** (registra in `disponibilita` tipo 'ferie'); scrittura DB con chiave **service_role** (SEGRETA, solo server)
- Creata `db/migrazione-telegram.sql`: tabella `codici_telegram` (codice, scadenza, usato) + policy RLS. **Da eseguire in SQL Editor**
- App aggiornata: il "Collega Telegram" del Profilo ora genera un **codice vero** salvato in `codici_telegram` (prima era finto)
- **Da fare utente**: 1) creare il bot con **@BotFather** su Telegram (/newbot) e prendere il **token**; 2) scegliere dove farlo girare sempre acceso (consiglio Railway/Render, piano gratuito); 3) fornire token + SUPABASE_SERVICE_KEY (Settings → API keys) alla piattaforma scelta
- Keep-alive GitHub Actions (anti pausa Supabase free): ancora da creare (cron che tocca il DB ogni 5-6 giorni)

### Tendine Programmazione rinnovate (21/10/2026, richieste utente)
- **Etichette con icone specializzazioni**: 🏗️ strutturista, ☣️ NBCR, 🐕 K9, 🧗 SAF, ⭐ caposquadra — oltre a 🚚patente, [grado], 🏖 ferie
- **Ricerca nominativo**: la select nativa è sostituita da **casella di ricerca + tendina filtrabile** (si scrive, la lista si restringe in tempo reale); gruppi «N MESI FA»/«MAI INSERITI» e regole ROS (capi prima, ⭐) conservati; click sul nome seleziona e riempie la casella; ➕ conferma

### Inserimento cumulativo Programmazione (21/10/2026, richiesta utente)
- Pulsante **«➕ INSERISCI TUTTI»** in cima: inserisce in un colpo tutti i nomi scelti nelle caselle di ricerca; i pulsanti ➕ singoli per posto restano e fanno la stessa cosa (inserisce solo quella riga)
- **Rapporto cumulativo unico** dopo l'inserimento: ✅ N inseriti; ❌ posti già occupati (numeri); 🏖 ferie per operatore con date e posto; ⚔️ presenti anche nell'altra squadra dello stesso mese (nome + squadra) — un solo alert, non uno per persona

### Ultime migliorie Programmazione (21/10/2026)
- **✕ accanto a ogni casella** di ricerca: svuota la casella e la selezione (necessaria per l'inserimento massivo: permettere di togliere un nome scelto senza doverlo ricliccare)
- **Fix click/tocco sui nomi della tendina**: selezione con evento `pointerdown` (il vecchio `onclick` veniva annullato dall'onblur della casella su touchpad/tocco)
- **🗑 Elimina programma**: pulsante rosso nella testata del programma aperto (con conferma) + cestino in ogni riga della lista "Programmi esistenti" — cancella membri e programma

### Contatori, tendine esclusive e PDF manifesto (21/10/2026)
- **Tendine esclusive in tempo reale**: un nominativo già scritto in una casella (prima dell'inserimento) NON compare più nelle tendine degli altri posti
- **Contatori in testata programma**: 🏗️ Strutturisti, ☣️ NBCR 3°, 🐕 Unità cinofile, 🧗 SAF 2A/Avanzato, 🚚 Autisti accanto alla barra di avanzamento
- **📄 GENERA PDF**: pulsante accanto a Pubblica su Telegram; apre una pagina con **logo USAR + «Nucleo USAR Veneto» + squadra (ALPHA/BRAVO) e mese**, banda tricolore, **tutti i 38 posti** nella struttura del modello COMPOSIZIONE TEAM (Direzione 1-6, Valutazione 7-10, Ricerca 11-16, Soccorso turnazioni 17-24/25-32, Logistica 33-38), nomi in MAIUSCOLO, e si apre la finestra di stampa → «Salva come PDF». Futuro: export diretto PDF via libreria se la stampa non basta

### Riepilogo con icone (21/10/2026)
- Nel riepilogo dei posti compilati, accanto a ogni nome ora compaiono **tutte le icone delle specializzazioni** (🏗️ ☣️ 🐕 🧗 ⭐) oltre al 🚚patente
- **Confermato dall'utente**: il modello grafico definitivo del manifesto è il PDF «COMPOSIZIONE TEAM USAR VENETO - ALPHA (2).pdf» — l'implementazione GENERA PDF lo segue già (struttura 38 posti, intestazione logo + Nucleo USAR Veneto + squadra)

### PDF nativo mobile (21/10/2026, requisito operativo dell'utente)
- **L'utente genera il manifesto da mobile in emergenza** — la finestra di stampa non è affidabile su telefono (e su PWA iOS può essere bloccata): sostituita con **jsPDF** (libreria nel bundle, ~150KB): il pulsante GENERA PDF ora produce un **file PDF vero** (`manifesto-alpha-2026-11-01.pdf`) scaricato direttamente, identico su Android/iPhone/PC
- Layout PDF A4: logo USAR, «Nucleo USAR Veneto» + squadra e mese, banda tricolore, 6 sezioni con i 38 posti (nomi MAIUSCOLO, righe alternate, paginazione automatica), piè data generazione
- Dipendenza aggiunta: `jspdf` in package.json

### PDF organigramma sul modello COMPOSIZIONE (21/10/2026, da screenshot utente in assets/)
- Screenshot modello letto: **TEAM ALPHA + mese** centrati, loghi ai lati; sezioni con **sfondi colorati**: Direzione=blu (TL riquadro blu scuro, Vice/Ufficiale stile proprio, Staff celesti), Valutazione=giallo (4 box), OPERAZIONI=rosso con Ricerca (2 colonne da 3: 11-13 | 14-16) e Soccorso (turnazione 1 | turnazione 2), Logistica=giallo (33-34 + 35-38)
- **Nessuna linea di collegamento** gerarchica; le specializzazioni obbligatorie si riconoscono solo dal ruolo scritto (conferme utente: 1 sì colori, 2 solo ruolo, 3 sì stile capo)
- PDF jsPDF riscritto a organigramma: sezioni colorate, riquadri arrotondati con numero/ruolo/nome, Team Leader in blu scuro con nome bianco; le 2 turnazioni su righe da 4 box
- Screenshot del modello tenuto in `assets/` come riferimento grafico (Screenshot_2026-10-21-18-42-02-87_*.jpg)

### Prossimi passi (in ordine proposto)
1. Primo utilizzo reale della Programmazione (Novembre — Alpha o Bravo) con verifica tendine e ferie
2. **Bot Telegram online** (utente: BotFather + hosting; poi testare collegamento e /ferie end-to-end)
3. Pagina Operatori completa: dettaglio, modifica, **promozione/revoca admin da app**, reimposta password, campo patente
4. Dashboard completa: card team, grafici torta (palette varia), attivazione rapida
5. Attivazione reale (allerta da manifesto programmato via bot, risposte SÌ/NO in tempo reale, copertura requisiti)
6. Report/Resoconti con export, PDF manifesto, Internazionale, Squadre
7. Keep-alive cron + Mini App Telegram
