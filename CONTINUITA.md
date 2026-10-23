# Documento di continuità del progetto — App USAR Veneto

> **Scopo**: consentire a chiunque (persona o AI) di riprendere il lavoro esattamente da dove siamo arrivati, anche dopo un crash di sessione. Aggiornarlo a ogni nuova decisione o azione importante.

Ultimo aggiornamento: 23/10/2026 — revisione completa (stato consolidato)

---

## 1. Cos'è il progetto

**Nucleo USAR Veneto** — sistema per gestire ~250 operatori organizzati mensilmente in due squadre da 38 unità: **Team Alpha** e **Team Bravo** (Bravo parte quando Alpha è già attivata). Composizione basata su disponibilità, specializzazioni, abilitazioni, patenti e mantenimenti.

Funzioni: programmazione mensile, calendario turni, mantenimenti con validazione, attivazioni di emergenza con risposta SÌ/NO in tempo reale, resoconti, PDF del Manifesto, bot Telegram.

**Stato attuale**: l'app è COMPLETA nelle funzioni operative principali e collaudata end-to-end (attivazione reale testata). Gli account di tutti gli operatori reali sono stati inseriti. Restano da sviluppare: sezione Internazionale, Report/export, Impostazioni admin, keep-alive Supabase.

## 2. Architettura

| Componente | Scelta | Note |
|---|---|---|
| Frontend | **PWA** (Vite) | Installabile su home screen, aggiornamento automatico (service worker) |
| Backend/DB | **Supabase** — Frankfurt (UE) | PostgreSQL + auth + Realtime + Storage (foto profili, bucket privato). Piano Free: pausa dopo 7 giorni di inattività (keep-alive da creare). Anti lock-in: tutte le chiamate DB passano da `app/supabase.js` |
| Comunicazioni | **Bot Telegram** @Usar_veneto_bot su **Render** (Free) | Allerte gruppo "Allerta USAR VENETO" + chat private. **Notifiche push PWA ESCLUSE** (richiederebbero account Apple Developer 99€/anno — decisione utente: non spendere) |
| PDF | **jsPDF** lato client | Manifesto a 38 posti scaricabile da mobile |
| Hosting | **GitHub Pages** | Deploy automatico a ogni push su `main` (GitHub Actions: build Vite → pubblica `dist`) |

**Come funziona la pubblicazione**: il sito pubblica SOLO la cartella `dist` del build. Le pagine informative HTML vivono in `index-extra/` e `vite.config.js` le copia in `dist`; le immagini da pubblicare vanno in `public/assets/`. **REGOLA: un nuovo file HTML/immagine messo nella radice del repo NON viene pubblicato.**

Account attuali (tutti personali di Luciano Di Lorenzo, lucianosbrau@gmail.com): GitHub `lucianosbrau`, Supabase personale, Render via GitHub personale. Le migrazioni future: `MIGRAZIONE-ACCOUNT.md` (fase 1, Gmail nucleo) e `MIGRAZIONE-SERVER-CORPO.md` (fase 2, server CNVVF), riassunte in `index-extra/infografica-migrazione-2fasi.html`.

## 3. Pagine dell'app (stato reale)

| Pagina | Chi la vede | Stato |
|---|---|---|
| Login/Registrazione | Tutti | ✅ completa (form HTML vero per salvataggio password; spunta privacy obbligatoria) |
| Dashboard | Tutti | ✅ contatori mantenimenti + 2 grafici a torta (Comando, Turno) con etichette nome+numero e leader lines |
| Operatori | Admin | ✅ completa: ricerca per nome/cognome con ✕ di cancellazione, filtro sotto-soglia, card cliccabili → scheda dettaglio completa, foto profilo, simbolo vigile per grado, promozione/revoca admin, eliminazione account (con password), registro attività admin |
| Squadre | Tutti / Admin (modifica) | ✅ card compatte con dettaglio a tendina; pulsanti ATTIVA (preselezione in Attivazione), VISUALIZZA, MODIFICA |
| Calendario | Tutti | ✅ turni 2024-2028, ferie a click (giorno/notte), conteggio ferie, proprio salto turno evidenziato |
| Programmazione | Admin | ✅ 38 posti, tendine con ricerca e rotazione 6 mesi, conteggi (autisti per grado 3°/4°), INSERISCI TUTTI, PDF |
| Attivazione | **Tutti** (era solo admin — fix 23/10) | ✅ admin: allerta + realtime; operatore: allerta aperta con pulsanti SÌ/NO e "Cambia risposta" |
| Mantenimenti | Operatore + Admin (validazione) | ✅ inserimento, coda validazione admin, rifiuto con note, storico |
| Resoconti | Admin | ✅ ferie in GIORNI, turni di ferie effettivi, navigazione mesi, "Le mie ferie" |
| Profilo | Tutti | ✅ dati di servizio, foto profilo (upload), "Chi ha consultato la tua scheda", collegamento Telegram |
| Internazionale | — | ❌ da sviluppare (abilitazioni missioni + vaccinazioni; serve schema dall'utente) |
| Report/Statistiche | — | ❌ da sviluppare (export Excel/CSV) |

## 4. Ruoli e regole di accesso

**Operatore**: modifica solo i PROPRI dati dal Profilo (turno, salto, comando, sede, foto); inserisce ferie e mantenimenti; risponde alle attivazioni; vede chi ha consultato la propria scheda.

**Amministratore** (4-5 sul nucleo): vede l'anagrafica completa di tutti (inclusi dati sensibili), ma **NON può modificare i dati degli operatori** — solo:
- promuovere/revocare amministratore (con conferma; trigger anti-escalation; non può revocare se stesso)
- eliminare un account (con conferma + propria password; RPC lato server; log)
- validare mantenimenti, gestire squadre/programmazione, lanciare allerte

Ogni consultazione di una scheda da parte di un admin è REGISTRATA (tabella `log_consultazioni`): l'operatore la vede dal Profilo (trasparenza privacy). Le azioni admin su utenti (promozioni/revocabili/eliminazioni) finiscono in `log_admin` (append-only, consultabile dalla scheda operatore con "📋 Registro attività admin").

## 5. Attivazione di emergenza (flusso collaudato ✅)

1. Admin: ATTIVA ALPHA / BRAVO / PERSONALIZZATA (anche rapida da Squadre), messaggio precompilato modificabile, INVIA ALLERTA
2. Il bot invia l'allerta al **gruppo "Allerta USAR VENETO"** (ID `-1004443017442`, var `ALERT_GROUP_CHAT_ID` su Render) E in chat privata a tutti i collegati, con pulsanti ✅/❌
3. Le risposte (da Telegram o da pagina Attivazione) arrivano in **tempo reale** nella pagina admin: contatori, copertura requisiti, nomi con foto e orari
4. Compilazione del manifesto: AUTOMATICA (dal programma del mese) o MANUALE (tendine con idonei per specializzazione, sotto-soglia in fondo)
5. GENERA PDF (jsPDF) → l'admin lo inoltra manualmente nel gruppo
6. Chiusura attivazione → risposte bloccate

Il PDF del manifesto NON viene pubblicato online né inviato dal bot: contiene nominativi, si gira a mano nel gruppo.

## 6. Regole di business — NON REINVENTARE

### Modulo e specializzazioni
- **USAR Medium: 38 unità operative** (+5 sanitarie). Obbligatorie: 2 strutturisti (posti 7, 9), 2 NBCR (8, 10), 4 K9 (11, 12, 14, 15), 2 ROS/caposquadra (17, 25), 2 SAF 2A/Avanzato (22, 30). Valori in tabella `impostazioni`
- **ROS = Caposquadra/Caporeparto**, identificati dal grado (CRE, CR, CSE, CS); nei posti 17/25 i capi compaiono prima (⭐)
- **SAF**: per il modulo contano SOLO 2A e Avanzato
- **Autista**: non è un ruolo; patente nel profilo con **grado 1°/2°/3°/4°** + estensioni (Autoscala, Autogru, Anfibio). I contatori autisti contano SOLO 3° e 4° grado (estensioni escluse)
- **Gradi**: D, VD, IA, CRE, CR, CSE, CS, VC, VE, VF. Simbolo vigile per grado: grigio=D/VD/IA, rosso=CRE/CR/CSE/CS, nero=VC/VE/VF (`public/assets/vigile-*.png`, helper `simboloVigile`)
- TPSS = soccorso sanitario (icona solo in pagina Operatori); TAS = livello 1/2 (in tendine)

### Calendario turni
- Riferimento **01/11/2026 = B2 giorno / A2 notte**; lettera avanza ogni giorno, numero sale ogni 4 giorni, ciclo completo 32 coppie; la notte del giorno n ha il salto del giorno n-1. Chi ha il salto del giorno è in RIPOSO. Range 2024-2028
- Ferie: inseribili a click dal Calendario (☀️ giorno / 🌙 notte) o da bot `/ferie` (parola "continuative" = giorno+notte)

### Ferie — conteggi (REGOLA FISSA)
- All'utente interessa sempre il conteggio in **GIORNI** (date distinte); i turni sono dettaglio secondario, mostrati separati, MAI sommati ai giorni
- **Resoconti — turni di ferie EFFETTIVI**: conta solo i turni che l'operatore avrebbe effettivamente lavorato: (1) la lettera del salto corrisponde alla lettera del proprio turno; (2) il salto NON è il proprio salto turno (quello è riposo). Senza turno nel profilo: escluso; con turno ma senza salto: contato su tutte le sue lettere

### Mantenimenti
- Soglia **36 ore annue** (in `impostazioni`, `soglia_ore_mantenimenti`); chi è sotto: badge giallo, in fondo a TUTTE le tendine con "⚠️ MAN." — informazione, decisione dell'admin
- Flusso: operatore inserisce (app o bot) → **in_validazione** → admin approva (solo approvati contano per la soglia) o rifiuta con note facoltative. L'operatore cancella solo i propri in validazione
- 7 causali: Mantenimento, Manovra, Intervento, Lavorazione, Tutor Mantenimento, Tutor Corso, Altra formazione

### Tendine Programmazione/Attivazione
- Prima i meno recenti (gruppi «N MESI FA»/«MAI INSERITI»), finestra 6 mesi; capi prima nei ROS; chi ha ferie mostra «🏖️ N gg ferie»; sotto-soglia in fondo in rosso; un operatore = un posto per programma; nomi già in casella esclusi dalle altre tendine
- Selezione mobile: tap = seleziona, trascinamento = scroll (soglia 8px) — `sezioneTouch`
- Dopo inserimento: avviso ferie, rapporto cumulativo unico con INSERISCI TUTTI

### Bot Telegram
- Collegamento con **codice a 6 cifre** (es. 482-193), 15 minuti, monouso, generato da Profilo; le risposte dal gruppo identificano l'operatore via `cb.from.id`
- Nel gruppo si risponde solo a /idgruppo; i dialoghi (ferie, mantenimenti) solo in privata
- **Inserimento nel gruppo: SOLO da parte di un admin** (regola Telegram) — l'operatore chiede al proprio amministratore
- Bot online su Render (Build `npm install`, Start `node bot/telegram-bot.mjs`, HTTP minimo sulla porta per Render). **Ogni modifica al bot richiede Manual Deploy → Deploy latest commit su Render**
- SUPABASE_URL su Render = solo il dominio, SENZA `/rest/v1/` in coda

### Database e migrazioni
- Schema in `db/schema.sql` + 14 migrazioni + 5 seed. **TUTTE ESEGUITE** sull'ambiente attuale, incluso: `db/migrazione-foto-log.sql` (foto, log admin, eliminazione), `db/fix-bucket-foto.sql` (bucket privato — fix "new row violates row-level security"), `db/migrazione-policy-cambia-risposta.sql`, `db/migrazione-privacy-consenso-log.sql` (consenso, log consultazioni, blocco modifiche admin)
- **REGOLA dopo ogni intervento nel pannello Authentication di Supabase**: ricontrollare che "Confirm email" resti SPENTO (la registrazione deve dare accesso immediato; se si riacquisisce, i link di conferma portano a pagine vuote). Redirect URL: `https://lucianosbrau.github.io/App-Usar-Veneto/**` (non cambiare)
- Utente bloccato da conferma rimasta attiva: `update auth.users set email_confirmed_at = now() where email = '<email>';`
- Recupero password (finché non c'è SMTP): via SQL `update auth.users set encrypted_password = crypt('Temp', gen_salt('bf')) where email='...'`
- Foto profilo: bucket privato `foto-profili`, path `<id-utente>/foto`, upload solo nella PROPRIA cartella, app con URL firmati in cache 1h
- Posta VVF filtra le email di terze parti (già successo con Supabase): per ora registrazione con email personale; futuro SSO VVF

## 7. Privacy (decisioni prese, 23/10/2026)

- Analisi GDPR fatta: cellulare/indirizzo = dati personali; **ICE = dati di TERZI** (il familiare va informato dall'operatore); **gruppo sanguigno e vaccinazioni = dati sanitari** (categoria speciale, base giuridica = sicurezza sul lavoro)
- **Informativa privacy**: bozza in `INFORMATIVA-PRIVACY.md` + pagina web `index-extra/informativa-privacy.html`. **DA VALIDARE dal responsabile privacy del Corpo.** Alla registrazione: spunta obbligatoria di accettazione + marca temporale (`privacy_consenso_il`)
- Dati sensibili visibili solo ad admin, **ogni consultazione registrata** e visibile all'operatore ("Chi ha consultato la tua scheda")
- L'admin NON modifica i dati degli operatori (trigger `trg_blocca_modifiche_admin`): solo promozione/revoca, eliminazione account, validazione mantenimenti
- Il PDF del manifesto: solo nomi e ruoli, mai dati sensibili

## 8. Stile visivo

- Rosso principale **#B22222** (chiaro #CD3A3A, scuro #8B1A1A); **banda tricolore** sotto l'intestazione; sfondo bianco. Il blu NON è colore principale
- Palette grafici a torta: blu #2563EB, verde #059669, ambra #F59E0B, viola #7C3AED, teal #0D9488, arancione #EA580C, grigio #94A3B8
- PDF manifesto: sezioni con contorno nero, box colorati (Direzione blu chiaro, Valutazione oro #FFD700, Operazioni rosso #FF0000 con testo bianco, Logistica giallo limone), TL blu #0066CC testo bianco, testo centrato, UNA pagina A4. **Simboli dei gradi tolti dal PDF** (si sfalsavano)
- Font Inter/Roboto, angoli 10-16px, ombre morbide. Logo VVF RIMOSSO (richiesta utente) — solo logo USAR
- Versione app visibile in sidebar/menù: v. 23/10/2026

## 9. Documentazione e materiali

- `Link del progetto.txt` — TUTTI i link; **da tenere aggiornato**; copia aggiornata sul Drive dell'utente (cartella del progetto, file "Link del progetto (aggiornato 23-10-2026)")
- `index-extra/infografica-telegram.html` + **`.pdf` stampabile** — guida collegamento bot (6 fasi con screenshot veri in `public/assets/Pagina*.png`, sezione gruppo "Allerta USAR VENETO" con inserimento via admin, sezione allerte in silenzioso). Il codice esempio è oscurato (XXX-XXX)
- `index-extra/infografica-migrazione-2fasi.html` — piano migrazione (fase 1 account nucleo / fase 2 server CNVVF)
- `index-extra/infografica-flusso.html` — flusso operativo; `infografica-migrazione.html` — versione vecchia (solo fase 1); `presentazione.html`; `anteprima-schermate.html`
- Screenshot del modello manifesto in `assets/Screenshot_*.jpg` (riferimento grafico)

## 10. Prossimi passi (in ordine)

1. **Verifica utente in sospeso**: back telefono dalla scheda, foto profilo ovunque, cambia risposta, registro attività (dopo migrazione privacy-consenso-log ESEGUITA dall'utente)
2. **Validazione informativa privacy dal Corpo** → poi eventuale alert per gli utenti già registrati
3. **Internazionale**: serve schema dall'utente (vaccinazioni, abilitazioni missioni)
4. **Report/Statistiche** con export Excel/CSV
5. **Impostazioni admin** (soglia ore senza toccare il codice)
6. **Keep-alive Supabase** (workflow cron GitHub Actions, anti-pausa 7 giorni)
7. Primo utilizzo reale della Programmazione di un mese pieno con i dati veri
8. Domande aperte: icona mantenimenti approvati (pollice vs faccina); se l'admin può revocare un mantenimento già approvato

## 11. Skill di conoscenza: `vvf-usar`

Skill persistente (v4) collegata all'account utente: struttura del modulo USAR Medium CNVVF (38+5), specializzazioni obbligatorie, modello del documento "COMPOSIZIONE TEAM USAR VENETO" (sezioni 1-38 per il PDF). **Caricarla all'inizio di ogni sessione di lavoro.** Fonti: Manuale Formazione USAR Medium CNVVF 2024, SGO USAR 2021, INSARAG 2020.

## 12. Come lavorare con l'utente — REGOLE OPERATIVE

- L'utente **NON è programmatore** e **non lavora su GitHub**: chi gli parla gestisce Git (commit/push/merge) in autonomia e spiega in italiano semplice, senza tecnicismi
- L'utente esegue le query SQL su Supabase (sa farlo): a ogni migrazione dirgli chiaramente quale file eseguire
- Ogni decisione/azione va registrata in questo documento
- **LEZIONI TECNICHE (dopo 3 incidenti)**: (1) un replace fallito in silenzio ha perso blocchi di codice — dopo ogni replace VERIFICARE con grep che i blocchi collegati esistano ancora; (2) i file pubblicati vanno in `index-extra/` o `public/`, mai nella radice; (3) dopo ogni intervento nel pannello Supabase Authentication ricontrollare "Confirm email" spento
- Comunicazione in italiano; chiedere OK esplicito prima di sviluppi non richiesti; registrare i requisiti senza implementare quando l'utente chiede solo di registrarli

## 13. Registro azioni (cronologia sintetica)

- 19-20/10/2026: progetto Supabase creato e collegato; schema + seed di prova (50 operatori `prova.*`, password `Prova2026!`); login, mantenimenti, programmazione, calendario
- 21/10/2026: bot Telegram scritto; PDF manifesto jsPDF sul modello COMPOSIZIONE TEAM (4 iterazioni di layout); tendine rinnovate con ricerca
- 22/10/2026: bot ONLINE su Render; gruppo "Allerta USAR VENETO" configurato; allerte con pulsanti ✅/❌; COLLAUDO END-TO-END dell'attivazione; resoconti con turni di ferie effettivi; simbolo vigile per grado; scheda operatore con promozione admin; migrazioni e seed completati (DB in pari)
- 23/10/2026: fix back del telefono (pushState perduto); foto profilo (bucket privato con URL firmati dopo fix RLS); eliminazione account con password; log azioni admin; pagina Attivazione visibile a tutti; pulsante cambia risposta; ricerca in Operatori con ✕; revisione codice (pulsanti bot duplicati); infografica Telegram (HTML+PDF) e piano migrazione 2 fasi; fix registrazione (Confirm email spento); informativa privacy bozza + consenso registrato + log consultazioni + admin non modifica profili; file "Link del progetto" (repo + Drive)

### Segnalazione "schede non si aprono" (23/10/2026, verificata)
- Riprodotta l'apertura scheda con test automatico (jsdom + DB simulato): il codice CORRENTE funziona — click → hash #/operatori/<id> → scheda renderizzata con tutti i dati
- Se l'utente vede l'hash cambiare ma la scheda non aprirsi: quasi certamente CACHE del telefono con versione precedente. Istruzioni: chiudere l'app, riaprire e ricaricare; se persiste, svuotare la cache del browser o reinstallare la PWA
- Test eseguito con jsdom: script temporaneo non committato

### FIX SERVICE WORKER: PC bloccato su versione vecchia (23/10/2026, segnalazione utente)
- SINTOMO: da PC le schede operatori non si aprivano (cambiava solo l'indirizzo) nemmeno dopo svuotare la cache del browser; da MOBILE funzionava MA mancava la ✕ della ricerca → il PC e il telefono erano entrambi su una versione vecchia, ma il PC non si aggiornava MAI
- CAUSA RADICE: il service worker metteva in CACHE anche la pagina principale dell'app (index.html) e la serviva dalla memoria senza mai ricontrollare il server — svuotare la cache del browser NON basta perché il service worker ha una MEMORIA PROPRIA separata
- FIX (public/sw.js v4): la pagina principale arriva SEMPRE dal server (solo offline usa la cache); gli asset con nome-impronta (index-XXXX.js) restano in cache (immutabili); foto/logo cache con aggiornamento in sottofondo. skipWaiting + clients.claim già presenti → al primo reload dopo il deploy la nuova versione prende il comando
- **ISTRUZIONI per chi ha il problema adesso**: fare F5/ricarica UNA volta (il service worker nuovo si installa e prende il comando), poi una SECONDA ricarica per vedere la versione nuova. In alternativa: DevTools (F12) → Application → Service Workers → Unregister, poi ricarica
- LEZIONE: qualunque modifica al comportamento di aggiornamento dell'app va fatta nel service worker tenendo presente che la sua cache è SEPARATA da quella del browser

### FIX VERO: schede non si aprivano da PC (23/10/2026, console utente)
- CONSOLE utente: "Uncaught TypeError: Ee.rpc(...).catch is not a function" — la riga del log consultazioni (`supabase.rpc('registra_consultazione').catch(()=>{})`) bloccava TUTTA la scheda: le query della libreria supabase sono "thenable" SENZA .catch concatenabile — il .catch non esiste e l'eccezione ammazzava la funzione prima del rendering
- Il telefono funzionava perché aveva una versione anteriore a quella riga (quindi anche la ✕ della ricerca mancava: era la versione di ieri)
- FIX: `.then(() => {}, () => {})` al posto di `.catch(() => {})` su rpc e storage.remove (l'altro punto con la stessa forma fragile)
- VERIFICA: test automatico jsdom con supabase simulato REALISTICO (rpc senza .catch, esattamente come la libreria vera) → click card → scheda APERTA. Il test simula ora anche le forme di risposta della libreria: utile come riferimento per i test futuri
- LEZIONE (4ª): le query supabase sono thenable ma NON Promise complete — MAI concatenare .catch; usare .then(ok, ko) oppure await con try/catch

### Piano import dati reali (23/10/2026, in definizione)
- Scenario: l'utente ha un elenco di nominativi con nome, cognome e tutte le informazioni (specializzazioni, turno, ecc.) da importare in Supabase
- **COLLEGAMENTO ACCOUNT ← SCHEDA: via EMAIL** (deciso): l'elenco importato conterrà anche l'email di ogni persona; chi si registra con quell'email "raccatta" automaticamente la propria scheda già piena (dati, specializzazioni, turno) — nessuno reinserisce nulla, nessun collegamento manuale admin
- Utente dice che le email probabilmente ci sono già nell'elenco (da confermare alla consegna del file)
- **DA DECIDERE (domande aperte all'utente)**: (1) chi si registra con email NON presente nell'elenco: bloccato / registrato con validazione admin / libero come oggi; (2) ok a cancellare i 50 operatori di prova prima dell'import vero
- Da costruire quando arriva l'elenco: script di import da CSV → righe profili con email + marker "in attesa di registrazione"; collegamento email→profilo alla registrazione

### Import dati reali — decisioni chiuse (23/10/2026)
- **Email di collegamento**: confermato il piano (email nell'elenco → chi si registra "raccatta" la propria scheda piena)
- **Chi si registra con email NON in elenco**: COME OGGI — entra e l'app crea la scheda vuota che riempie da solo dal Profilo (nessun blocco, nessuna coda di validazione admin)
- **Pulizia pre-import**: cancellare TUTTI i 50 operatori di prova TRANNE l'account admin DI LORENZO LUCIANO (lucianosbrau@gmail.com) — query di pulizia da preparare CON exclude per quell'account: NOTA: i seed attuali usano email 'prova.*' e l'account admin reale NON è un seed, quindi la pulizia `where email like 'prova.%'` lo tocca comunque NO — verificare con l'utente l'email esima: la cancellazione deve escludere esplicitamente l'id dell'admin
- Prossimo passo: l'utente consegna l'elenco (colonne da definire insieme) → costruire lo script di import + il collegamento email→scheda alla registrazione

### Lettura esportazione database (23/10/2026 — SOLO ANALISI, nessuna modifica)
- File Drive: "Copia di DB ANAGRAFICA PERSONALE" (foglio Google, ~825KB) nella cartella "Esportazione database"
- Lettura possibile foglio per foglio via link pubblico gviz (CSV per nome foglio): confermato che esistono i fogli APP GENERALE (email divise per gruppi G1-G18, ~140 email Gmail) e SPECIALIZZAZIONI (ID_SPECIALIZZAZIONI, ID_ANAGRAFICA, CODICE FISCALE, COGNOME, NOME, FUNZIONARIO, STAFF, LOGISTA, NBCR con livelli "Liv. 2/Liv. 3/NR/LPG/LNG", SPECIALIZZAZIONE NBCR, CINOFILO, SAF con valori tipo "1B - BASICO"/"2A - AVANZATO", TAS, SAPR, MEDICO, INFERMIERE)
- FOGLI DA LEGGERE ANCORA: ANAGRAFICA (il nome del foglio potrebbe essere diverso — provare "ANAGRAFICA", "ANAGRAFICA PERSONALE", ecc.), i fogli delle unità cinofile (cane + vaccinazioni), eventuali altri
- OSSERVAZIONI finora: (1) email tutte Gmail/iCloud già presenti nel foglio APP GENERALE ma NON collegate ai nominativi (divise per gruppo G1-G18, senza cognome accanto); (2) i codici fiscali presenti → ottime chiavi per collegare email↔anagrafica via cognome+nome desunti dal CF; (3) NBCR ha livelli (Liv. 2/3) e codici LPG/LNG — da chiarire con l'utente la mappa verso "NBCR 3° livello" dell'app; (4) SAF ha valori multipli separati da trattini ("1B - BASICO", "2A - AVANZATO") — l'app conta solo 2A/Avanzato; (5) ci sono RUOLI nuovi per l'app: FUNZIONARIO, STAFF, LOGISTA, MEDICO, INFERMIERE, SAPR; (6) DOPPIONI presenti (es. MORFINO ALESSIO due righe con NBCR Liv. 2 e Liv. 3; GRIFONI MATTIA due righe; SCARPINO MATTIA due righe; LEBAN ANDREA due righe; CAIOPRPIC due volte nel gruppo email) → servirà una pulizia/dedup con regola da concordare (tenere il livello più alto?)
- Il piano utente per l'app: sezioni apribili a pulsante sia in PROFILO (modificabili dall'operatore) sia nella scheda OPERATORE (solo consultazione), con i nomi delle pagine del foglio; icone specializzazioni invariate ma nomi nuovi; sezione unica CINOFILI con anagrafica cane + vaccinazioni
- PROCEDURA SICUREZZA concordata: nessuna modifica/push prima di aver fatto backup completo (codice + dati) e simulato qui la mappa dei dati; decisioni mano a mano con l'utente (es. mappatura gradi)

### Foglio DATI ANAGRAFICI letto (23/10/2026 — analisi, nessuna modifica)
- COLONNE: ID_ANAGRAFICA, CODICE FISCALE, COGNOME, NOME, NASCITA DATA, LUOGO, TELEFONO (USATO/SERVIZIO/CASA), e-MAIL USATA + e-MAIL SERVIZIO (@vigilfuoco.it), GRADO/RUOLO, COMANDO, SEDE, TURNO (A-D, anche G=FF.TT.? e M, "Giornaliero", "ALTRO"), SALTO (1-8, anche "NON ASSEGNATO"), CORSO USAR (data), CONTATTO ICE NOME + TEL, MISSIONI INT. (SI/NO), ULTIMO AGG, PDF_Path
- ~150 righe: quasi tutte con email Gmail nella riga — il collegamento email→scheda ALLA REGISTRAZIONE è Confermato fattibile da questo foglio (non serve APP GENERALE)
- Il campo GRADO/RUOLO contiene valori tipo VF, VE, CR, CS, CRE, FF.TT., C+S, M — da mappare sui gradi dell'app (D, VD, IA, CRE, CR, CSE, CS, VC, VE, VF) col puntello dell'utente
- COMANDO contiene anche province fuori Veneto (UDINE, PORDENONE, TRIESTE, GORIZIA, BELLUNO…) e la colonna sembra più "provincia del comando" che i 7 comandi veneti dell'app → da chiarire con l'utente la mappa COMANDO/sede (l'app ha comando=provincia veneta + sede libera)
- TURNI: quasi tutti A-D con salto 1-8, ma anche "G" con salto NON ASSEGNATO (probabile fuori organico turno), "M", "Giornaliero", "ALTRO" → come li trattiamo? (l'app assume A-D)
- ICE presente con nome+telefono nella maggior parte delle righe
- MISSIONI INT. SI/NO presente — ottimo per la futura sezione Internazionale
- REGOLA DECISA DALL'UTENTE: doppi = tenere il LIVELLO PIÙ ALTO (dedup durante l'import con unione dei dati, prevale il valore più alto per NBCR/SAF)
- L'utente fornirà a breve l'elenco completo delle specializzazioni con le regole di gestione in un messaggio dedicato

### Decisioni import (23/10/2026) + foglio MANTENIMENTI letto
- GRADI: l'utente scriverà la tabella di corrispondenza (forniti ora i valori attuali dell'app: D, VD, IA, CRE, CR, CSE, CS, VC, VE, VF)
- COMANDI: si aggiungono le province del FRIULI VENEZIA GIULIA a quelle venete (elenco a tendina; aggiornare la torta Dashboard che conta per comando) — SEDE = sede distaccata precisa, anche a tendina per evitare errori di scrittura
- TURNI: G = GIORNALIERO (uniformare in menù a tendina: A, B, C, D, G/Giornaliero); per i G valgono SOLO le ferie che inseriscono, niente turno nel calendario; M → G; chi ha più turni (es. Contesso) → inserirne UNO solo, confermerà l'operatore; ALTRO → non importare nulla, conferma manuale dell'operatore
- DOCUMENTI: nel PROFILO possibilità di caricare 2 FOTO DEL DOCUMENTO per operatore; visibili SOLO in Profilo e nella scheda OPERATORE sotto una card "DOCUMENTI" (bucket foto-profili, stessa infrastruttura, path <id>/doc1 e <id>/doc2)
- CINOFILI: per chi è CINOFILO (dal foglio SPECIALIZZAZIONI): colonne DB aggiuntive per anagrafica del CANE + VACCINAZIONI; CARD dedicate in PROFILO e OPERATORI
- MANTENIMENTI (foglio letto): PERFETTAMENTE integrabile — colonne: ID, ID_ANAGRAFICA, CODICE FISCALE, COGNOME, NOME, TIPO MANTENIMENTO (= le 7 causali dell'app, ma con varianti "TUTOR MANTENIMENTI" e "TUTOR CORSI" → normalizzare in "Tutor Mantenimento"/"Tutor Corso"), DATA (gg/mm/aaaa), ARGOMENTO, ORE PRESTATE, ORE REALI (→ usare ORE REALI come ore valide? CHIEDERE), APPROVATO SI (= approvato), MOTIVAZIONE (= note_rifiuto). Riferimento via CODICE FISCALE o ID_ANAGRAFICA
- FOGLI DEL DATABASE EXCEL CONOSCIUTI: APP GENERALE (email per gruppi G1-G18), DATI ANAGRAFICI (anagrafica completa), SPECIALIZZAZIONI (abilitazioni/corsi), MANTENIMENTI (storico ore). Da leggere ancora: fogli cinofili (nome esatto da chiedere)

### Nuovi fogli letti + decisioni definitive gradi (23/10/2026)
- FOGLI DEL DATABASE (elenco completo trovato): GRUPPI APP, RUBRICA, DATI ANAGRAFICI, DOCUMENTI, MEDICA, VACCINAZIONI, ALLEGATI, VACCINI, SPECIALIZZAZIONI, ANAGRAFICA CANI, VACCINAZIONI CANI, RILEVAZIONE TAGLIE, MANTENIMENTI, Richieste_Stampa
- GRADI DEFINITIVI (deciso utente, icona vigile grigia per tutti i dirigenti): DVD = Direttore vice dirigente · D = Direttore · VD = Vice Direttore · IA = Ispettore antincendi (tutti GRIGI); CRE rosso Capo reparto esperto · CR rosso Capo reparto · CSE rosso Capo squadra esperto · CS rosso Capo squadra; VC/VE/VF neri (Vigile coordinatore / esperto / vigile). FF.TT. ELIMINATO: nel foglio va sostituito con D (Direttore), il personale correggerà
- COMANDI: aggiungere Pordenone, Gorizia, Udine, Trieste (FVG) alle province venete; sedi a tendina
- ANAGRAFICA CANI: ID_CANE, ID_ANAGRAFICA, CF, cognome, nome, NOME CANE, RAZZA, SESSO, NASCITA, COLORE, MICROCHIP, DATA IMPIANTO, LOCALIZZAZIONE, foto cane/libretto/passaporto (path su Drive — da decidere se importare le foto). NB: Contesso ha un cane (MARILYN) ma nel foglio SPECIALIZZAZIONI non è CINOFILO → il legame cinofilo va preso da ANAGRAFICA CANI (chi ha il cane) oltre a CINOFILO=SI
- VACCINAZIONI CANI: ID_VACCINICANE, ID_CANE, NOME, MICROCHIP, TIPO VACCINO (RABBIA, POLIVALENTE, LESHMANIOSI, LEPTOSPIROSI), DATA SOMMINISTRAZIONE, SCADENZA → tabella cani_vaccini legata al cane
- RILEVAZIONE TAGLIE: taglia TUTA, ELMO (NORMALE/FUORI MISURA), INTIMO TERMICO (S-XXL), SCARPONI (numero), GUANTI (numero) → card "TAGLIE DPI" in Profilo e scheda Operatore; vita propria, solo informativa
- SPECIALIZZAZIONI (colonne del foglio): FUNZIONARIO, STAFF, LOGISTA, NBCR (Liv. 2/Liv. 3/NR/LPG/LNG), SPECIALIZZAZIONE NBCR, CINOFILO (SI), SAF (1B - BASICO / 2A - AVANZATO / combinati), TAS (2), SAPR, MEDICO, INFERMIERE → in attesa delle regole di gestione dall'utente
