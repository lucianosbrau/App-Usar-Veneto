# Documento di continuità del progetto — App USAR Veneto

> **Scopo di questo documento**: consentire a chiunque (persona o AI) di riprendere il lavoro esattamente da dove siamo arrivati, anche in caso di crash di una sessione di lavoro. Aggiornarlo a ogni nuova decisione importante.

Ultimo aggiornamento: 22/10/2026 12:30

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
- **Valutazione e Sicurezza**: senape → **aggiornato a oro #FFD700** (PDF manifesto)
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
- Versione visibile nell'app: v. 22/10/2026 (in sidebar e menù mobile)
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
- **Patente = GRADO di patente (chiarito dall'utente)**: valori **1°, 2°, 3°, 4°** + **estensioni** (Autoscala, Autogru, Anfibio) in `estensioni_patente` (migrazione anagrafica, eseguita). Nelle tendine: 🚚4°+AS / +AG / +AN; nel riepilogo autisti grado ed estensioni per esteso (NON le categorie europee B/C/D che erano un'ipotesi errata del seed). Il seed ora usa i gradi; per i 50 già caricati eseguire: `update profili set patente = case patente when 'B' then '1°' when 'D' then '2°' when 'C' then '3°' when 'C+E' then '4°' else patente end where email like 'prova.%';`
- **SAF (chiarito dall'utente)**: valori possibili 1A, 2A, Basico, Avanzato; **per il modulo contano SOLO 2A e Avanzato** — nel seed ora ci sono 10 SAF (5×2A + 5×Avanzato); il posto 22/30 va occupato da un SAF 2A o Avanzato

### Calendario turni sviluppato (20/10/2026, richiesta utente)
- **Regola ciclica salti turno** (fissata — NON reinventare): riferimento **01/11/2026 = B2 giorno / A2 notte**; lettera avanza ogni giorno (B→C→D→A), numero sale dopo 4 giorni, **ciclo completo di 32 coppie (A1..D8)**; la notte del giorno n ha il salto del giorno n-1 (sfalsata). Chi ha il salto turno del giorno/notte è in **riposo**
- Formula verificata: 01/11/2024 = D3/C3; 01/03/2027 = B8/A8 (l'utente deve confermarle sul calendario reale)
- Pagina Calendario: navigazione mesi, range **01/01/2024–31/12/2028**, gestione anni bisestili (calcolo su giorni reali UTC); **vista personalizzata**: le due caselle del proprio salto turno evidenziate in **giallo**
- Pagina Profilo: l'operatore modifica da solo **turno, salto turno, comando, sede** (salvataggio su profili)
- **Disponibilità/ferie**: la programmazione mensile NON ha vincoli di salto turno; l'operatore inserirà solo causale **"Ferie"** dall'app Telegram (dettagli futuri); tabella `disponibilita` pronta
- **Ferie inseribili dal Calendario** (richiesta utente): click sulla cella ☀️ = ferie **diurna**, click su 🌙 = ferie **notturna** (nuovo campo `turno_ferie` in `disponibilita` — migrazione `db/migrazione-ferie-turno.sql` (eseguita)); click di nuovo = cancella. Ricap admin nel badge: nomi con ☀️/🌙 per turno. Bot /ferie aggiornato: registra **giorno** di default; con la parola **"continuative"** registra giorno+notte per ogni data. Recap admin nel Calendario: sezioni **GIORNO/NOTTE** con nominativi sotto la data. Aggiunta pagina **Resoconti**: contatore ferie del mese (giorni diurni, notti, operatori coinvolti, dettaglio per persona). Titoli pagine in costruzione ora con maiuscola (Squadre, Internazionale, Report e Statistiche)
- **Ferie nel Calendario** (aggiunto dopo richiesta utente): riga del giorno con **sfondo blu chiaro** se è il TUO periodo di ferie; per l'admin **badge «🏖 N in ferie»** su ogni giorno (nomi nel tooltip al tocco). In Programmazione: «N gg ferie» nelle tendine + avviso dopo inserimento

### Ferie nella Programmazione (20/10/2026, richiesta utente)
- Nelle tendine della Programmazione chi ha ferie nel mese programmato mostra **«🏖 N gg ferie»** nell'etichetta
- Dopo l'inserimento di chi è in ferie: **avviso** «Attenzione, Cognome Nome è in ferie dal gg/mm al gg/mm (N giorni)»
- Dati dalla tabella `disponibilita` (tipo='ferie', range del mese programmato); **nessun blocco**, solo informazione — decisione dell'admin
- Aggiunta policy RLS: operatore inserisce le proprie disponibilita/ferie (in schema.sql e migrazione-anagrafica.sql (eseguita))

### Bot Telegram — avviato (21/10/2026)
- Creato `bot/telegram-bot.mjs` (Node): comandi /start, collegamento account via **codice** (es. 48-21, 15 min, monouso), **/ferie gg/mm/aaaa - gg/mm/aaaa** (registra in `disponibilita` tipo 'ferie'); scrittura DB con chiave **service_role** (SEGRETA, solo server)
- Creata `db/migrazione-telegram.sql`: tabella `codici_telegram` (codice, scadenza, usato) + policy RLS (eseguita)
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

### PDF organigramma riscritto sul modello reale (21/10/2026, sessione ripresa)
- **Problema risolto**: il PDF di riferimento non si poteva caricare su GitHub né in chat; letto invece **direttamente da Google Drive** (tool Drive: `read_file_content` sul file "COMPOSIZIONE TEAM USAR VENETO - ALPHA (2).pdf" — dà il testo/ordine dei ruoli) + **analisi visiva dello screenshot** in `assets/` (dà layout, colori, disposizioni)
- **Layout fedele al modello, ora implementato**: header TEAM + mese centrati con loghi ai lati; DIREZIONE E COMANDO (sfondo blu chiaro #A7D4FF) con **Team Leader centrato da solo** (riquadro blu #0066CC, testo bianco), poi Vice + Ufficiale affiancati, poi 3 Staff in riga; VALUTAZIONE E SICUREZZA (giallo) con **4 box in una riga**; OPERAZIONI (rosso deciso #B22222) con sottotitoli RICERCA (2 colonne da 3) e SOCCORSO (2 colonne da 8 = le 2 turnazioni affiancate); LOGISTICA (giallo) con **2 righe da 3** (33-35 sopra, 36-38 sotto — ordine logico). Box bianchi con bordo nero; dentro ogni box: numero+ruolo in alto (rosso), nome sotto
- Tutto in **una pagina A4 portrait**, verificato con rendering locale (pymupdf) + analisi immagine: nessun testo tagliato, nessuna sovrapposizione
- Anteprima aggiornata: `public/manifesto-preview.pdf` (Team Alpha settembre con i nominativi del modello) — per la revisione dell'utente
### Modifiche layout PDF richieste all'utente (21/10/2026, 3ª iterazione)
- **Fix box Valutazione che sbordava**: il 4° box usciva dalla cornice destra; larghezza ridotta (43,6) e riposizionati con margine interno
- **Colori definitivi sui box del PDF** (deciso dall'utente, 4ª iterazione): Valutazione e Sicurezza = **oro #FFD700** (testo scuro automatico), Operazioni (Ricerca e Soccorso) = **rosso vivo #FF0000** (testo bianco), Direzione = blu chiaro, Logistica = giallo limone chiaro, TL = blu #0066CC testo bianco. Regola automatica: fondo scuro → testo bianco, fondo chiaro → testo scuro
- **Testo centrato** in tutti i box (numero+ruolo e nome), non più allineato a sinistra
- **Colori invertiti**: le sezioni ora hanno **sfondo BIANCO** e i **box colorati** (Direzione=blu chiaro, Valutazione/Logistica=giallo, Operazioni=rosso chiaro #FEE2E2; TL resta blu scuro #0066CC testo bianco)
- **Bordo nero alle sezioni**: le 4 sezioni hanno un rettangolo di contorno nero ben visibile (linea 0.7)
- Verificato con rendering: tutto in una pagina, nessun taglio

### Fix GENERA PDF da mobile (21/10/2026, segnalazione utente)
- **Problema**: su telefono il pulsante 📄 GENERA PDF non faceva nulla (su PC funzionava)
- **Causa**: jsPDF non riesce a incorporare i loghi passando solo il percorso file (`addImage('/assets/...')`) — su PC il fetch locale a volte funziona, su browser mobile fallisce in silenzio e bloccava tutta la generazione
- **Soluzione**: i loghi ora vengono **precaricati come data URL** (Image + canvas) prima di generare il PDF; se un logo non carica, il PDF viene generato comunque senza logo (fallback con warning in console). Aggiunto `alert` di errore visibile se la generazione fallisce
- `generaPdfManifesto` ora è **async**; il click gestisce l'errore con messaggio esplicito

### Fix loghi mancanti nel PDF scaricato (21/10/2026)
- **Causa**: `Logo vvf.png` era solo in `assets/` (radice repo, non pubblicata) e non in `public/assets/` — il build Vite pubblica solo `public/`, quindi sul sito il logo VVF non esisteva e il caricamento falliva per entrambi
- **Fix**: copiato `Logo vvf.png` in `public/assets/`. Regola: **tutti i file che l'app scarica a runtime vanno in `public/`** (assets, manifest, sw)

### Modifiche precedenti
- **Logo VVF aggiunto** (caricato dall'utente in `assets/Logo vvf.png`): nell'intestazione del PDF ora VVF a sinistra + USAR a destra, come nel modello. Nota: CONTINUITA sez. 9 diceva "logo VVF rimosso" per i documenti (infografica); nel **manifesto PDF invece ci va**, come da modello COMPOSIZIONE con entrambi i loghi

### Scheda ATTIVAZIONE sviluppata (21/10/2026)
- **Dicitura**: pulsante "ELIMINA PROGRAMMA" → **"ELIMINA COMPILAZIONE"** in Programmazione
- **Pagina Attivazione completa** (sostituisce il mockup):
  - **Admin**: selezione ATTIVA ALPHA/BRAVO + messaggio modificabile + INVIA ALLERTA (crea riga in `attivazioni`; invio Telegram in attesa del bot, ma le risposte arrivano già in tempo reale). Vista attivazione aperta: contatori SÌ/NO, **copertura requisiti** (2 strutturisti, 2 NBCR, 4 K9, 2 capi, 2 SAF, 38 totale — conteggi su chi ha risposto SÌ), elenco risposte con orario e badge IN PROGRAMMA per chi è nel programma del mese, pulsante CHIUDI ATTIVAZIONE
  - **Compilazione del manifesto dell'attivazione** (nuova tabella `manifesti_membri`, migrazione `db/migrazione-manifesti.sql` (eseguita)):
    - **⚡ COMPILAZIONE AUTOMATICA** (chiarimento utente): precompila i 38 posti con i componenti della squadra attivata (Alpha o Bravo) inseriti **nel programma del mese corrente**; **ogni pressione sovrascrive/aggiorna la maschera precedente senza inviare nulla** (nuove conferme → ripremere per aggiornare)
    - **✏️ COMPILAZIONE MANUALE**: stessi criteri della Programmazione (casella ricerca + tendina filtrabile, icone specializzazioni, capi ⭐ prima nei posti ROS, ➕ per inserire, ✖ per liberare un posto)
    - **📄 GENERA PDF**: manifesto dell'attivazione con lo stesso PDF della Programmazione (loghi, sezioni colorate)
  - **Operatore**: vede l'attivazione aperta con il messaggio e risponde **✅ SONO DISPONIBILE / ✖️ NON SONO DISPONIBILE** (scrive in `risposte_attivazione`); le risposte del bot Telegram future finiranno nella stessa tabella
  - **Tempo reale**: canale Supabase Realtime su `attivazioni` e `risposte_attivazione` — admin e operatore vedono aggiornarsi tutto senza ricaricare; canale chiuso quando si esce dalla pagina
- **Da fare**: collegare l'invio allerta al bot Telegram quando online (ora l'allerta si crea nel DB; il bot la leggerà e la inoltrerà)

### Attivazione personalizzata (21/10/2026, richiesta utente)
- Nella pagina Attivazione, oltre ad ATTIVA ALPHA e ATTIVA BRAVO c'è **🎯 ATTIVAZIONE PERSONALIZZATA**: si invia il messaggio di allerta, poi chi fa l'attivazione compila il modulo **ruolo + nominativo a menù** con le **stesse regole della Programmazione** (nomi già inseriti nascosti, specializzazioni idonee mostrate per prime nel ruolo, capi ⭐ prima nei ROS, ✖ per liberare)
- **Nominativi solo da chi ha risposto SÌ** all'attivazione (più chi è già inserito nel manifesto, per non nascondere le scelte fatte)
- Per le attivazioni personalizzate **non esiste COMPILAZIONE AUTOMATICA** (nessun team di riferimento); PDF con titolo "ATTIVAZIONE PERSONALIZZATA"
- **Riquadri vuoti nel PDF** (richiesta utente): nel manifesto di un'attivazione i posti non compilati restano **completamente vuoti** (solo numero-ruolo, niente trattino "—"), mantenendo riquadro e colore — l'impaginazione è la stessa del manifesto completo, mancano solo i nomi
- Migrazione: `db/migrazione-attivazione-personalizzata.sql` (eseguita; consente team='personalizzata' in attivazioni e manifesti)

### Sicurezza: fix escalation admin e privacy profili (21/10/2026, revisione rischi)
- **Rischio risolto — escalation ad admin**: la policy "proprio profilo" (`update using auth.uid() = id`) non limitava le colonne: un operatore poteva aggiornare la PROPRIA riga con `ruolo='admin'` usando la chiave anon. Fix: **trigger `trg_proteggi_ruolo`** (migrazione `db/migrazione-sicurezza-profili.sql`, eseguita) — la modifica di `ruolo` è bloccata a meno che a farla sia un admin esistente (o la service_role del bot). schema.sql aggiornato con la nota per i setup futuri
- **Privacy profili**: la policy di SELECT era `using(true)` (chiunque con la chiave anon leggeva i profili, inclusi i 50 account di prova). Ora: `using (auth.role() = 'authenticated')` — solo utenti autenticati. Stessa migrazione. I dati veri (250 operatori, CF, vaccinazioni) non saranno mai leggibili da non autenticati
- **Bot /ferie rafforzato**: aggiunti limite **max 31 giorni per comando** (evita insert di migliaia di righe con range di anni) e **controllo anno plausibile (2020-2035)**; già presente: date legate solo al chat_id collegato, regex formato, fine≥inizio
- **Reset password / SMTP**: già tracciato alle righe "Posta VVF" e "Recupero password" (CONTINUITA sez. Note operative): SMTP custom (Brevo/SMTP2GO) prima dell'apertura al nucleo, poi funzione admin in pagina Operatori — il SQL con password temporanea è soluzione transitoria
- **Seed di prova**: da eliminare PRIMA del caricamento dati veri (già documentato in README/CONTINUITA): `delete from profili where email like 'prova.%'; delete from auth.users where email like 'prova.%';`
- **Service worker**: verificato network-first con fallback cache — in emergenza con rete si ha sempre l'ultima versione; offline si vede l'ultima cache scaricata (comportamento voluto). Nessuna modifica

### Revisione guidata dall'utente su dati fittizi (22/10/2026)
- **Dashboard completa**: contatori (unità in linea con ≥36h mantenimenti approvati nell'anno, sotto soglia, totale operatori) + **2 grafici a torta** SVG nativi: Personale per Comando e per Turno (A-D), palette varia — come da decisioni vecchie; mostrata a admin E operatori
- **Operatori**: card con comando/sede/turno/salto + righe **Specializzazioni** (icone 🏗️☣️🐕🧗⭐ + badge per le altre) e **Abilitazioni** (🚚patente, 🎒TPSS soccorso sanitario, 📍TAS livello 1/2)
- **TPSS/TAS chiariti dall'utente**: TPSS = soccorso sanitario, icona **🎒 zaino sanitari**; TAS = icona **📍 GPS con numero livello 1 o 2**. Aggiunti anche nelle etichette delle tendine Programmazione/Attivazione
- **Squadre sviluppata**: pagina con i programmi pubblicati su squadre (per mese, Alpha+Bravo affiancati, nomi per sezione); in Programmazione nuovo tasto **PUBBLICA SU SQUADRE** (salva senza Telegram, flag `pubblicato_su_squadre`); per admin pulsante ✏️ Modifica che riporta alla Programmazione del programma scelto. Visibile a tutti, modifica solo admin
- **Calendario**: colonna **Ferie** in mezzo tra Data e Giorno/Notte (nomi per turno ☀️/🌙 nella colonna, non più sotto la data) — evita righe altissime con molti nomi
- **Attivazione — fix errore RLS** ("new row violates row-level security policy"): mancava la policy **SELECT** su `attivazioni` (c'era solo INSERT) — l'insert con select() di ritorno falliva. Migrazione `db/migrazione-policy-attivazioni.sql` (**da eseguire**): select attivazioni per tutti, update (chiudi) per admin, colonna `pubblicato_su_squadre`
- **Mantenimenti**: stato ben visibile — sezione **🟡 IN ATTESA DI APPROVAZIONE** per le proprie richieste (giallo, anche per admin), **🟡 CODA DI VALIDAZIONE** admin, storico approvati con **🟢** per riga; NB: admin vede le proprie richieste tra i "miei" e le altrui in coda — comportamento corretto
- **Resoconti**: aggiunta navigazione **mese prima/dopo** (la pagina mostrava solo il mese corrente — ecco perché i contatori potevano apparire vuoti se le ferie erano in un altro mese)
- Mobile: nessuna modifica mirata necessaria (layout già responsive: grid auto-fit, tabelle scrollabili); da verificare sul telefono

### Mantenimenti nelle selezioni personale (22/10/2026, richiesta utente)
- **TPSS solo in pagina Operatori**: rimossa l'icona 🎒 dalle etichette delle tendine (l'utente la vuole solo lì); 📍TAS rimane nelle tendine perché indica il livello
- **Seed mantenimenti fittizi**: `db/seed-mantenimenti.sql` (**da eseguire in SQL Editor**) — crea storico approvato distribuito (parte del personale in regola, parte sotto), più alcune richieste IN VALIDAZIONE per popolare la coda admin; marcate con colonna `note_seed` per cancellarle pulitamente (`delete from mantenimenti where note_seed is true;`)
- **Sotto soglia nelle selezioni**: in TUTTE le tendine (Programmazione e Attivazione manuale) chi ha **meno di 36 ore** di mantenimenti approvati nell'anno: va **in fondo alla lista**, riga **evidenziata in rosso** (sfondo rosso chiaro) con **⚠️ MAN.** nell'etichetta — decisione sempre dell'admin, solo informazione. L'ordinamento privilegia: 1) in regola coi mantenimenti, 2) poi i criteri esistenti (capi ⭐ nei ROS, meno recenti, ecc.)

### Bot Telegram ONLINE (22/10/2026)
- **Nome bot: @Usar_veneto_bot** — attivo su Render (piano Free), in ascolto
- Config Render: Build `npm install`, Start `node bot/telegram-bot.mjs`, variabili TELEGRAM_BOT_TOKEN / SUPABASE_URL / SUPABASE_SERVICE_KEY
- Account attuali: GitHub personale (lucianosbrau), Supabase personale (linkato al GitHub personale), Render (accesso con GitHub personale)

### Documento e infografica migrazione account (22/10/2026)
- Creati `MIGRAZIONE-ACCOUNT.md` (guida dettagliata: principi, scelta Gmail nucleo vs @dipvvf.it, 6 fasi GitHub/Supabase/Render/Telegram/PWA/dati, checklist, costi, rischi) e `infografica-migrazione.html` (stile progetto: rosso #B22222, tricolore, entrambi i loghi come nel modello manifesto)
- Punti chiave: transfer del repo GitHub (mantiene redirect), transfer progetto Supabase o dump SQL (opz. A/B), Render con email nucleo, bot Telegram invariato, redirect PWA automatico; raccomandato Gmail del nucleo per gli account tecnici (posta VVF filtra terze parti)

### Conteggio giorni (non turni) nelle ferie (22/10/2026, richiesta utente)
- **Bot /ferie**: prima contava le righe del DB (con "continuative" 01/11→05/11 diceva "10 giorni"); ora conta i **giorni distinti del range** (5 giorni) — il dettaglio turno resta tra parentesi ("continuative: giorno e notte")
- **Resoconti**: totali ora in **giorni con ferie** (date distinte del mese, non somme di turni); in tabella per operatore: colonna **Giorni** (date distinte, in evidenza) + colonne informative Turni giorno/Turni notte
- **Calendario**: nessun conteggio esposto (solo nominativi per turno) — nessuna modifica necessaria
- Rimosse dalla risposta del bot le diciture "Massimo 31 giorni per comando" (il limite tecnico resta attivo, il messaggio dedicato esce solo quando serve)
- **Regola fissata (NON reinventare)**: all'utente interessa sempre il conteggio in **GIORNI**, i turni sono dettaglio secondario da mostrare separato, mai sommato ai giorni

### Resoconti: turni di ferie EFFETTIVI (22/10/2026, chiarimento utente, riformulato)
- La pagina Resoconti conta solo i **turni che l'operatore avrebbe effettivamente lavorato** nel suo periodo di ferie. Regola completa per ogni riga ferie: (1) la lettera del salto di calendario (giorno o notte) deve corrispondere alla **lettera del proprio turno** (A-D dal profilo); (2) il salto NON deve essere il **proprio salto turno** (quel turno è riposo, non lavoro)
- Esempi verificati numericamente (ferie 01-05/11/2026 continuative, calendario: 1=B2/A2, 2=C2/B2, 3=D2/C2, 4=A3/D2, 5=B3/A3):
  - turno A salto **A4**: notte A2 dell'1 + giorno A3 del 4 + notte A3 del 5 = **3 turni** (A3 ≠ A4, non è riposo)
  - turno A salto **A3** (esempio utente): giorno A3 del 4 e notte A3 del 5 sono IL SUO RIPOSO → resta solo notte A2 dell'1 = **1 turno**
  - turno B salto B2: giorno B2 dell'1 e notte B2 del 2 = riposo; conta solo giorno B3 del 5 = **1 turno**
  - turno D salto D2: l'unico D (giorno del 3) è riposo = **0 turni**
- Chi non ha il turno impostato nel profilo è escluso dal conteggio; chi ha il turno ma non il salto turno viene contato su tutte le sue lettere (fallback sicuro)
- Per operatore: solo colonna **🕒 Turni di ferie**; totale del mese + operatori coinvolti
- **Verifica di non regressione fatta**: `coppiaGiorno`/`saltoGiorno` NON sono state modificate (usate solo da Calendario e Resoconti); il Calendario continua a evidenziare il proprio salto e a gestire le ferie come prima; il bot resta in giorni distinti del range. La regola "turni effettivi con esclusione riposo" vale SOLO per Resoconti

### Bot Telegram collaudato end-to-end (22/10/2026)
- Collegamento account ✅ (codice 6 cifre es. 482-193, 15 min, monouso), pulsanti **inline sempre visibili** nei messaggi (Inserisci ferie / Come funziona), aiuto con date precompilate (+7/+14 gg)
- Fix durante il collaudo: `.single()`→`.maybeSingle()` su codici multipli; server HTTP minimo per Render (il Web Service esige una porta); causa radice del "codice non trovato": SUPABASE_URL con `/rest/v1/` in coda su Render (forma corretta: solo `https://lwdcrjtbsmqammwpvrhy.supabase.co`)
- Prossima cosa concordata: infografica istruzioni collegamento bot (stile progetto; screenshots reali Telegram servono? — in fase di valutazione)

### Seed mantenimenti "in regola" (22/10/2026, richiesta utente)
- Creato `db/seed-mantenimenti-inregola.sql` (**da eseguire in SQL Editor** dopo seed-mantenimenti.sql): per ogni operatore di prova con meno di 36 ore approvate quest'anno inserisce un "Ciclo di mantenimento annuale" (approvato, 30 gg fa) che lo porta sopra soglia — così in Dashboard la maggioranza del personale risulta in linea, come in un nucleo operativo sano
- Idempotente: rieseguirlo non aggiunge nulla a chi è già in regola; pulibile con `delete from mantenimenti where note_seed is true;`
- NB: la Dashboard calcola la soglia (36) via `caricaOreMantenimenti()` su anno corrente — coerente col seed

### Ritocchi Dashboard e Operatori (22/10/2026)
- **Torte Dashboard** (aggiornato su richiesta utente): etichette con **nome completo + numero assoluto** (niente percentuali, niente sigle troncate), collegate alle fette da **linee guida** (leader lines) colorate come la fetta, testo fuori dalla torta a destra/sinistra; sotto il 4% niente etichetta (solo legenda). Layout SVG allargato (viewBox 84x50) per ospitare i nomi completi; legenda a fianco invariata
- **Icone Operatori**: TPSS = badge quadrato **rosso con croce bianca ✚** (chiara identificazione sanitaria); TAS = badge quadrato **blu con bussola 🧭** seguito dal livello in blu. Le icone restano solo in pagina Operatori (come da regola precedente)

### Simbolo vigile per grado (22/10/2026, richiesta utente)
- Dall'immagine fornita (elmo con fiamma, "Firefighter") ho **ritagliato il solo simbolo** (senza scritte) e creato **3 versioni** in `public/assets/`: `vigile-grigio.png`, `vigile-rosso.png`, `vigile-nero.png` (PNG con sfondo trasparente, ricolorate via luminosità mantenendo l'antialiasing)
- **Correlazione gradi → colore** (regola utente, NON reinventare): grigio = **D, VD, IA** · rosso = **CRE, CR, CSE, CS** · nero = **VC, VE, VF**
- Nelle schede Operatori: simbolo accanto al nome + badge col grado; tooltip con categoria ("Capo (CRE, CR, CSE, CS)" ecc.); nessun simbolo se il grado non è in tabella

### Simbolo vigile ovunque + cronologia browser (22/10/2026)
- **Simbolo vigile per grado** aggiunto anche: tendine Programmazione e Attivazione (16px accanto al nome, con tooltip) e **PDF manifesto** (4,2mm a sinistra del nome, centrato; caricato come immagine con fallback silenzioso). Helper globale `simboloVigile(o, px)` con tabella GRADI_VIGILE
- **Celle tendine più larghe**: caselle di ricerca Programmazione max-width 300→400px, Attivazione min(300px,55%)→min(420px,62%)
- **Frecce del browser (indietro/avanti)**: implementata la cronologia con History API — ogni pagina visitata diventa un hash nell'URL (`#/operatori`, `#/calendario`, ecc.); il tasto indietro torna alla pagina precedente, avanti riavanza; ricaricando l'app si riapre l'ultima pagina (l'hash viene ripristinato al login); URL condivisibile/link diretto alle pagine. I redraw interni (inserimento nomi ecc.) NON creano voci di cronologia
- Limitazione nota: la navigazione interna della Programmazione (mese/squadra) non è nell'hash — il back torna alla pagina, non al passaggio intermedio

### Contatore autisti per grado (22/10/2026, richiesta utente)
- Nel riepilogo della Programmazione i contatori autisti ora sono **separati per grado**: "🚚 Autisti 3° grado: X" e "🚚 Autisti 4° grado: Y" — contano SONO chi ha patente **3° o 4°**; chi ha 1°/2° non è più contato tra gli autisti (prima contava chiunque avesse una patente)
- **Confermato dall'utente**: le estensioni patente (Autoscala, Autogru, Anfibio) NON entrano in questo conteggio — si conta solo il grado (3°/4°)
- Rimosso il conteggio generico "N autisti" dalla riga di stato (Pubblicato/Bozza · N/38)

### Fix Operatori/Programmazione + seed gradi D/VD/IA (22/10/2026, segnalazioni utente)
- **Icona vigile enorme in Operatori**: bug (chiamata senza parametro pixel → dimensioni native); ora 20px
- **Card operatore**: "Venezia · Chioggia · turno C (salto C2)" → se c'è il salto turno mostra solo lui ("turno C2"), altrimenti la lettera del turno
- **Riepilogo Programmazione**: simbolo vigile del grado (16px) accanto ai nominativi già inseriti (con la ✖), oltre alle icone specializzazioni
- **PDF manifesto**: tolti i simboli dei gradi (si sfalsavano/sfondo nero) — il manifesto resta pulito con solo i nomi, come da segnalazione utente
- **Seed gradi**: `db/seed-gradi-d-vd-ia.sql` (**da eseguire**) — 8 operatori di prova: 3×D, 3×VD, 2×IA distribuiti su tutti i comandi e turni diversi; password Prova2026! come gli altri seed; pulibile rieseguendo (cancella e ricrea gli stessi nominativi)

### Mantenimenti da Telegram + ritocchi (22/10/2026)
- **Mantenimenti da Telegram**: pulsante 🎓 "Mantenimento" in tutte le tastiere del bot — procedura guidata passo passo (data gg/mm/aaaa → ore → tipo con pulsanti per le 7 causali → argomento → riepilogo con Conferma/Annulla/Riparti); validazione di ogni campo con messaggi d'errore chiari; salvataggio come in_validazione (l'admin approva dalla PWA). Sessioni per chat: durante l'inserimento i messaggi testuali vanno alla procedura, non ai comandi
- **Calendario**: conteggio a sinistra dei nominativi in ferie ("2 ☀️ Rossi, Verdi / 1 🌎 Bianchi")
- **Operatori**: simboli (vigile, TPSS, TAS) staccati dal nome (margine 6px) e allineati verticalmente (-3px); nuovo **filtro in alto**: "Tutti" / "⚠️ Sotto soglia mantenimenti" con conteggi, persistente (localStorage)
- Fix correlati: query mantenimenti con FK esplicita (PGRST201 per doppia relazione profili), .maybeSingle() su impostazioni

### Resoconti: frecce in evidenza + Ferie personali admin (22/10/2026)
- **Frecce navigazione mesi** spostate subito sotto il titolo della sezione, a sinistra, più grandi e visibili
- **Nuova sezione "Le mie ferie" (solo admin)** in Resoconti: conteggio dei turni di ferie effettivi PROPI (stessa regola del riepilogo generale: solo turni che avresti lavorato, escluso il proprio salto turno) + giorni coinvolti; se il turno non è impostato nel profilo mostra l'avviso; naviga coi mesi insieme al resto della pagina

### Scheda dettaglio operatore + promozione admin (22/10/2026, richiesta utente)
- **Card operatori cliccabili** → aprono la **scheda dedicata**: foto/avatar grande, nome+simbolo grado, e tutti i dati: email, cellulare, comando, sede, turno/salto, grado, patente+estensioni, TPSS, TAS, **gruppo sanguigno, indirizzo, medico curante, contatto ICE (nome+relazione+telefono)**, specializzazioni, Telegram collegato, ore mantenimenti anno (in linea/sotto soglia), ultimi 6 inserimenti in squadra
- **Pulsante ⭐ RENDI AMMINISTRATORE** (o ➖ REVOCA ADMIN per chi lo è già): con conferma esplicita; bloccato dal trigger anti-escalation (errore chiaro se tentato da non-admin); non puoi revocare te stesso
- **REGOLA FISSATA (utente)**: l'admin NON modifica i dati degli operatori dalla scheda (operazione vietata) — solo promozione/revoca; i dati li modifica l'operatore dal proprio Profilo
- Migrazione: `db/migrazione-anagrafica-estesa.sql` (**da eseguire**): nuovi campi cellulare, indirizzo, contatto_ice_nome/telefono/relazione, medico_curante, gruppo_sanguigno — pronti per l'import dal Google Sheet reale
- Seed: `db/seed-anagrafica-estesa.sql` (**da eseguire dopo la migrazione**): valori casuali per gli operatori di prova (sostituibili coi dati veri)

### Bot: allerte di attivazione + risposte SÌ/NO (22/10/2026)
- Il bot ora **invia l'allerta** quando l'admin lancia ALPHA/BRAVO/PERSONALIZZATA dalla PWA: messaggio 🚨 a tutti gli operatori con Telegram collegato, con **pulsanti ✅ SONO DISPONIBILE / ❌ NON SONO DISPONIBILE**
- La risposta finisce in `risposte_attivazione` (upsert: può cambiare risposta) → **appare in tempo reale nella pagina Attivazione dell'admin** (contatori, copertura requisiti, elenco nomi) — stesso canale della risposta da PWA
- Guardie: all'avvio il bot non reinvia allerte di attivazioni già aperte; se l'attivazione è chiusa rifiuta la risposta; conferma con popup e messaggio di riscontro
- NB: su Render serve **Manual Deploy → Deploy latest commit** per attivare questa versione
- **PRIMA PROVA DI ATTIVAZIONE END-TO-END** (proposta all'utente): admin lancia ALPHA dalla PWA → tutti i collegati ricevono l'allerta su Telegram → rispondono coi pulsanti → l'admin vede contatori e copertura aggiornarsi in tempo reale → chiude l'attivazione

### Gruppo ALLERTA USAR VENETO + flusso attivazione completo (22/10/2026, decisione utente)
- **Gruppo Telegram "ALLERTA USAR VENETO"** (da creare: gruppo, non canale — scrittura riservata agli admin, bot come amministratore): il bot manda lì le allerte CONTESTUALMENTE alle chat private dei collegati (doppio canale); le risposte coi pulsanti dal gruppo identificano l'operatore via `cb.from.id` (chat privata) — fix applicato
- **Configurazione gruppo**: variabile d'ambiente `ALERT_GROUP_CHAT_ID` su Render (numero negativo per i gruppi); per scoprirla: aggiungere il bot al gruppo come ADMIN e scrivere `/idgruppo` nel gruppo (il bot risponde con l'ID, che finisce anche nei log)
- **PWA Attivazione**: cornice di selezione **VERDE** (#059669); il messaggio si **precompila dinamicamente** col nome della squadra scelta ("🚨 ATTIVAZIONE TEAM ALPHA — ..."); invio senza alert di conferma → passa subito alla pagina realtime
- **Flusso operativo completo deciso**: INVIA ALLERTA → allerta nel gruppo + private → la pagina Attivazione dell'admin è GIA la schermata realtime (risposte SÌ/NO live, copertura requisiti, compilazione automatica e manuale, GENERA PDF) → il PDF scaricato si inoltra manualmente nel gruppo
- Il PDF NON viene pubblicato su GitHub Pages (nominativi), né generato dal bot per ora (futuro: PDF lato server)

### Notifiche in silenzioso + configurazione gruppo (22/10/2026)
- **Limite tecnico spiegato all'utente**: nessun bot/app può far suonare una notifica col telefono in silenzioso (restrizione iOS/Android). Rimedi possibili: impostazioni Telegram per il gruppo (notifiche attive, suono "Avviso", popup/priorità alta su Android), eccezione Telegram nel "Non disturbare", notifiche sbloccate sulla chat privata del bot; in futuro valutabile la CHIAMATA VoIP (unica che suona in silenzioso su Android se consentito)
- **REQUISITO INFOGRAFICA collegamento Telegram** (da costruire, con screenshots reali o disegnati): includere la sezione "ricevere le allerte anche in silenzioso" con le impostazioni consigliate per Android e iPhone (campanella gruppo → notifiche attive + suono Avviso; popup/priorità; eccezione Non disturbare)
- **Configurazione ALERT_GROUP_CHAT_ID** (istruzioni date all'utente): bot aggiunto al gruppo come ADMIN → `/idgruppo` nel gruppo → il numero (negativo) risposto va in Render → Settings → Environment → ALERT_GROUP_CHAT_ID → save (riavvio automatico)
- **FIX /idgruppo (22/10/2026)**: la gestione dei messaggi nei gruppi non era mai stata applicata (un replace precedente era fallito in silenzio) — il bot rispondeva col benvenuto nel gruppo. Ora: i messaggi nei gruppi sono gestiti PRIMA dei dialoghi privati (solo /idgruppo, che risponde con l'ID in formato copiabile; log di aggiunta al gruppo); gli altri comandi sono disattivati nel gruppo
- **FIX ALERT_GROUP not defined (22/10/2026)**: la dichiarazione `let ALERT_GROUP = process.env...` era stata persa da un replace fallito in silenzio — l'invio al gruppo crashava ("Errore attivazioni"). **Gruppo confermato dai log: ID = -1004443017442** (titolo "Allerta USAR VENETO"); la variabile ALERT_GROUP_CHAT_ID su Render era GIÀ configurata correttamente dall'utente — il mancato funzionamento era SOLO la dichiarazione mancante nel codice (fixato)
- **LEZIONE (per la AI)**: dopo ogni replace fallito con assert, RICONTROLLARE che i blocchi collegati siano coerenti — due replace silenziosi hanno causato due bug consecutivi (gestione gruppi mancante, ALERT_GROUP non dichiarata)

### Cronologia scheda operatore + tooltip grado (22/10/2026, ore 12:30)
- **Frecce del browser**: l'apertura di una scheda operatore ora è una voce di cronologia (hash #/operatori/<id>) — il tasto INDIETRO torna all'elenco degli operatori, AVANTI riapre la scheda; anche il reload mantiene la scheda aperta
- **Tooltip simbolo vigile**: al passaggio mostra SOLO la sigla del grado (es. "VD") — rimossa la dicitura estesa (era anche imprecisa sulla categoria)

### Badge stato operatori (22/10/2026, ore 12:15)
- Nelle card Operatori il vecchio badge "🟢 Attivo" (senza significato) sostituito da: **🟢 In linea** (≥36h mantenimenti approvati nell'anno) / **🟡 Sotto soglia** (<36h) — l'admin vede a colpo d'occhio chi non è in regola; per gli admin resta ⭐ Admin
- REGOLA FISSATA (utente): il badge verde/giallo riflette la regolarità coi mantenimenti, non uno stato generico

### ✅ COLLAUDO END-TO-END COMPLETATO (22/10/2026, ore 12:00)
- **Confermato dall'utente**: allerta da PWA → ricevuta nel gruppo "Allerta USAR VENETO" + chat privata → risposta ✅ dal gruppo → **pagina Attivazione aggiornata in tempo reale** (contatori, copertura, nomi). Schede operatori e filtro funzionanti. Il sistema di attivazione è OPERATIVO
- Funzioni collaudate oggi: allerta gruppo+private, risposte SÌ/NO via pulsanti da gruppo e privata, realtime (dopo migrazione publication), scheda operatore con PGRST100 risolto, mantenimenti da bot

### Fix Operatori (handler dispersi) + migrazione Realtime (22/10/2026, ore 11:20)
- **CAUSA TROVATA (Operatori: schede non si aprivano, filtro muto)**: quando è stato aggiunto il filtro, la funzione pagOperatori si è chiusa PRIMA degli handler, che sono finiti appesi a pagMantenimenti — mai eseguiti sulla pagina Operatori. Fix: handler (fil-tutti, fil-sottosoglia, click card) spostati DENTRO pagOperatori; verificato con controllo posizionale
- **CAUSA TROVATA (Attivazione non si aggiornava in tempo reale)**: mancava l'abilitazione Realtime delle tabelle nel DB. Creata `db/migrazione-realtime.sql` (**da eseguire**): alter publication supabase_realtime add table (attivazioni, risposte_attivazione, programmi_membri, mantenimenti, disponibilita)
- NB utente: la query di test del realtime da SQL Editor fallisce con "Failed to check user auth status" — normale in SQL Editor (non è un client autenticato): eseguire SOLO le alter publication, non testare il realtime da lì
- FK operatori_specializzazioni verificate: profili + specializzazioni (non ambigue, ok)
- **FIX PGRST100 (scheda operatore)**: order su colonna di tabella relazionata (programmi_mensili.mese) non supportato dalla sintassi dell'API — rimosso l'order lato server, ordinamento ora lato client (ultimi 6 per mese)

### Prossimi passi (in ordine proposto)
1. Primo utilizzo reale della Programmazione (Novembre — Alpha o Bravo) con verifica tendine e ferie
2. **Bot Telegram online** (utente: BotFather + hosting; poi testare collegamento e /ferie end-to-end)
3. Pagina Operatori completa: dettaglio, modifica, **promozione/revoca admin da app**, reimposta password, campo patente
4. Dashboard completa: card team, grafici torta (palette varia), attivazione rapida
5. Attivazione reale (allerta da manifesto programmato via bot, risposte SÌ/NO in tempo reale, copertura requisiti)
6. Report/Resoconti con export, PDF manifesto, Internazionale, Squadre
7. Keep-alive cron + Mini App Telegram
