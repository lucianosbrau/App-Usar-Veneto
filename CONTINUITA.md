# Documento di continuità del progetto — App USAR Veneto

> **Scopo di questo documento**: consentire a chiunque (persona o AI) di riprendere il lavoro esattamente da dove siamo arrivati, anche in caso di crash di una sessione di lavoro. Aggiornarlo a ogni nuova decisione importante.

Ultimo aggiornamento: 19 ottobre 2025

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
| Squadre | Admin | Composizione Alpha/Bravo: proposta automatica + drag & drop (dnd-kit) |
| Calendario | Tutti | Turni mensili, pubblicazione e invio via Telegram |
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

**Situazione a fine sessione del 19 ottobre 2025**: tutte le decisioni fino a qui sono registrate; l'utente sta creando il **progetto Supabase** (URL + chiave anonima). Il codice vera inizia al suo arrivo.

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
