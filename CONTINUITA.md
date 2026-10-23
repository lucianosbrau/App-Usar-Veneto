# Documento di continuità del progetto — App USAR Veneto

> **Scopo**: consentire a chiunque (persona o AI) di riprendere il lavoro esattamente da dove siamo arrivati, anche dopo un crash di sessione. **Va aggiornato con costanza a ogni decisione o intervento** — non accumulare appendici: consolidare le novità nelle sezioni giuste e tenere sintetico il registro.

Ultimo aggiornamento: 23/10/2026 (sera) — revisione completa post-incidente

---

## 1. Cos'è il progetto

**Nucleo USAR Veneto** — sistema per gestire ~250 operatori organizzati mensilmente in due squadre da 38 unità: **Team Alpha** e **Team Bravo**. Composizione basata su disponibilità, specializzazioni, abilitazioni, patenti e mantenimenti.

Funzioni: programmazione mensile, calendario turni, mantenimenti con validazione, attivazioni di emergenza con risposta SÌ/NO in tempo reale, resoconti, PDF del Manifesto, bot Telegram, anagrafica completa con privacy (informativa, log consultazioni).

**Stato**: l'app è COMPLETA nelle funzioni operative e collaudata end-to-end. Gli **account degli operatori reali sono stati inseriti** (fase di test con utenti veri in corso). In definizione: **import dei dati reali** dal foglio Google del nucleo (vedi sez. 10). Da sviluppare: Internazionale, Report/export, Impostazioni admin, sezioni profilo estese (documenti, cani, taglie).

## 2. Architettura

| Componente | Scelta | Note |
|---|---|---|
| Frontend | **PWA** (Vite) | Installabile, aggiornamento automatico (sw v4: pagina principale SEMPRE dal server) |
| Backend/DB | **Supabase** — Frankfurt (UE) | PostgreSQL + auth + Realtime + Storage. Piano Free: pausa dopo 7gg inattivi (keep-alive DB da creare) |
| Comunicazioni | **Bot Telegram** @Usar_veneto_bot su **Render** (Free) | Piano Free sospende dopo 15 min → **keep-alive attivo** (workflow cron 10 min + secret BOT_URL). Notifiche push PWA ESCLUSE (costo Apple) |
| PDF | **jsPDF** lato client | Manifesto scaricabile da mobile |
| Hosting | **GitHub Pages** | Deploy automatico a ogni push su `main`, **con muro di verifica** (vedi sez. 12) |

**Pubblicazione**: il sito pubblica SOLO la cartella `dist`. Le pagine informative HTML vivono in `index-extra/`, le immagini in `public/assets/` (copiate dal build). **Un file nella radice del repo NON viene pubblicato.**

Account attuali (personali di Luciano Di Lorenzo): GitHub `lucianosbrau`, Supabase, Render. Migrazioni future: `MIGRAZIONE-ACCOUNT.md` (fase 1, Gmail nucleo) e `MIGRAZIONE-SERVER-CORPO.md` (fase 2, server CNVVF), riassunte in `index-extra/infografica-migrazione-2fasi.html`.

## 3. Pagine dell'app (stato reale)

| Pagina | Chi la vede | Stato |
|---|---|---|
| Login/Registrazione | Tutti | ✅ form HTML vero (salvataggio password), **spunta privacy obbligatoria** con consenso registrato |
| Dashboard | Tutti | ✅ contatori mantenimenti (**soglia 24h**) + 2 grafici a torta (Comando, Turno) |
| Operatori | Admin | ✅ ricerca con ✕ di cancellazione, filtro sotto-soglia (24h), schede complete con foto, simbolo vigile, promozione/revoca admin, eliminazione account (password), registro attività admin |
| Squadre | Tutti / Admin (modifica) | ✅ card compatte; ATTIVA / VISUALIZZA / MODIFICA / **📄 GENERA PDF** |
| Calendario | Tutti | ✅ turni 2024-2028, ferie a click con **avviso "Ferie inserite"** |
| Programmazione | Admin | ✅ 38 posti, tendine con ricerca e rotazione 6 mesi (storico limitato a 6 mesi), ferie in GIORNI, INSERISCI TUTTI, PDF |
| Attivazione | **Tutti** | ✅ admin: allerta + realtime con contatori (SÌ/NO/**NESSUNA RISPOSTA = allertati − risposte, con nomi**); operatore: pulsanti SÌ/NO e "Cambia risposta" |
| Mantenimenti | Operatore + Admin (validazione) | ✅ soglia **24 h** annue, coda validazione, rifiuto con note, storico |
| Resoconti | Admin | ✅ ferie in GIORNI, turni di ferie effettivi, navigazione mesi, "Le mie ferie" |
| Profilo | Tutti | ✅ dati servizio, foto, "Chi ha consultato la tua scheda", collegamento Telegram |
| Internazionale / Report | — | ❌ da sviluppare |

## 4. Ruoli e accesso

**Operatore**: modifica solo i PROPRI dati dal Profilo; inserisce ferie e mantenimenti; risponde alle attivazioni; vede chi ha consultato la propria scheda.

**Amministratore** (4-5): vede l'anagrafica completa ma **NON modifica i dati degli operatori** (trigger `trg_blocca_modifiche_admin`) — solo: promozione/revoca admin (trigger anti-escalation, mai su se stesso), eliminazione account (con propria password, RPC + log), validazione mantenimenti, gestione squadre/programmazione/allerte.

Ogni consultazione di una scheda da parte di un admin è **registrata** (`log_consultazioni`, visibile all'operatore). Le azioni su utenti finiscono in `log_admin` (append-only, consultabile dalla scheda).

## 5. Attivazione di emergenza (collaudata ✅)

1. Admin: ATTIVA ALPHA / BRAVO / PERSONALIZZATA (o rapida da Squadre), messaggio precompilato, INVIA ALLERTA
2. Il bot allerta il **gruppo "Allerta USAR VENETO"** (ID `-1004443017442`, var `ALERT_GROUP_CHAT_ID`) + chat private dei collegati, con pulsanti ✅/❌
3. Risposte in **tempo reale** nella pagina admin: contatori (SÌ / NO / NESSUNA RISPOSTA con nomi di chi è in attesa), copertura requisiti, nomi con foto
4. Compilazione manifesto AUTOMATICA (dal programma del mese) o MANUALE; **GENERA PDF** (il mese è sempre corretto, da qualunque pagina); il PDF si inoltra a mano nel gruppo
5. Chiusura → il bot annuncia **"✅ ATTIVAZIONE CHIUSA"** sul gruppo e in privata; risposte bloccate

## 6. Regole di business — NON REINVENTARE

### Modulo e specializzazioni (valori attuali dell'app)
- USAR Medium: **38 unità** (+5 sanitarie). Obbligatorie: 2 strutturisti (7, 9), 2 NBCR 3° (8, 10), 4 K9 (11, 12, 14, 15), 2 ROS (17, 25), 2 SAF 2A/Avanzato (22, 30). In tabella `impostazioni`
- ROS = Caposquadra/Caporeparto (gradi CRE/CR/CSE/CS); nei posti 17/25 i capi prima (⭐); SAF: contano SOLO 2A e Avanzato; Autisti = solo patente 3°/4° grado (estensioni escluse, solo conteggio)
- **Gradi definitivi (23/10)**: DVD/D/VD/IA = grigio (dirigenti/IA) · CRE/CR/CSE/CS = rosso · VC/VE/VF = nero. FF.TT. ELIMINATO (→ D nel foglio). Simboli: `public/assets/vigile-*.png`
- TPSS icona solo in Operatori; TAS (livello 1/2) anche in tendine

### Calendario e ferie
- Riferimento **01/11/2026 = B2 giorno / A2 notte**; lettera avanza ogni giorno, numero ogni 4 giorni, ciclo 32 coppie; notte del giorno n = salto del giorno n-1; il proprio salto = RIPOSO. Range 2024-2028
- **FERIE SEMPRE IN GIORNI** (date distinte), ovunque: contatori, tendine Programmazione ("N gg ferie"), resoconti, bot. I turni sono dettaglio separato, MAI sommati
- **Turni di ferie EFFETTIVI (solo Resoconti)**: solo i turni che l'operatore avrebbe lavorato: lettera salto = lettera proprio turno E salto ≠ proprio salto turno

### Mantenimenti
- **Soglia 24 ore annue** (era 36 — deciso 23/10; `impostazioni.soglia_ore_mantenimenti` + hardcoded in main.js: tenere sincronizzati)
- Flusso: inserimento (app/bot) → in_validazione → admin approva/rifiuta (con note). Sotto soglia: badge giallo + in fondo alle tendine con ⚠️ MAN.
- 7 causali: Mantenimento, Manovra, Intervento, Lavorazione, Tutor Mantenimento, Tutor Corso, Altra formazione

### Tendine Programmazione/Attivazione
- Prima i meno recenti: MAI INSERITI → 1 mese fa → … → 6 mesi (finestra storico = 6 mesi dal mese programmato); capi prima nei ROS; ferie "N gg"; sotto-soglia in fondo in rosso; un operatore = un posto per programma; nomi già in casella esclusi
- Selezione mobile: tap = seleziona, trascinamento = scroll (8px) — `sezioneTouch`

### Bot Telegram
- Collegamento con **codice a 6 cifre** (15 min, monouso) da Profilo; risposte dal gruppo identificate via `cb.from.id`; nel gruppo solo /idgruppo
- **Inserimento nel gruppo: SOLO da parte di un admin** (l'operatore chiede al proprio amministratore)
- Render: Build `npm install`, Start `node bot/telegram-bot.mjs`; **SUPABASE_URL senza `/rest/v1/`**; **ogni modifica al bot richiede Manual Deploy su Render**
- **Keep-alive**: workflow cron 10 min che pinga l'URL del bot (secret `BOT_URL`); senza il secret il workflow esce silenziosamente

### Database
- `db/schema.sql` + 16 migrazioni + 5 seed: **TUTTE ESEGUITE** (incluse foto-log, fix-bucket-foto, cambia-risposta, privacy-consenso-log, **fix-soglia-24** — da eseguire se non ancora fatto)
- **REGOLA Supabase Auth**: dopo ogni intervento nel pannello Authentication, ricontrollare "Confirm email" SPENTO; redirect `https://lucianosbrau.github.io/App-Usar-Veneto/**` (non cambiare)
- Utente bloccato: `update auth.users set email_confirmed_at = now() where email='...'`; reset password: `update auth.users set encrypted_password = crypt('Temp', gen_salt('bf')) where email='...'`
- Foto profilo: bucket PRIVATO `foto-profili`, path `<id>/foto`, upload solo propria cartella, URL firmati in cache 1h

## 7. Privacy

- ICE/gruppo sanguigno/vaccinazioni = dati sensibili (ICE = dati di terzi: il familiare va informato dall'operatore); base giuridica = sicurezza sul lavoro
- **Informativa**: `INFORMATIVA-PRIVACY.md` + pagina web `index-extra/informativa-privacy.html` — **bozza da validare dal Corpo**; alla registrazione: spunta obbligatoria + `privacy_consenso_il`
- Dati sensibili solo admin, ogni consultazione registrata e visibile all'operatore; admin non modifica profili altrui; PDF manifesto senza dati sensibili

## 8. Stile

- Rosso #B22222, tricolore, sfondo bianco. Grafici: palette varia (blu #2563EB, verde #059669, ambra #F59E0B, viola #7C3AED, teal #0D9488, arancio #EA580C, grigio #94A3B8)
- PDF manifesto: sezioni con contorno nero, box colorati (Direzione blu chiaro, Valutazione oro #FFD700, Operazioni rosso #FF0000 testo bianco, Logistica giallo), TL blu #0066CC testo bianco, UNA pagina A4, **senza simboli dei gradi**. Font Inter/Roboto. Solo logo USAR. Versione app in menù/sidebar: aggiornarla a ogni sessione di modifiche

## 9. Documentazione e materiali

- `Link del progetto.txt` — tutti i link, **da tenere aggiornato**; copia sul Drive dell'utente
- `index-extra/`: infografica-telegram (**HTML+PDF**, guida collegamento bot: 6 fasi, gruppo, silenzioso; codice oscurato XXX-XXX), infografica-migrazione-2fasi, infografica-flusso, infografica-migrazione (vecchia), presentazione, anteprima-schermate, informativa-privacy
- Guide: MIGRAZIONE-ACCOUNT.md, MIGRAZIONE-SERVER-CORPO.md, INFORMATIVA-PRIVACY.md

## 10. Import dati reali — piano in definizione (foglio Google del nucleo)

**Fonte**: Drive → cartella "Esportazione database" → "Copia di DB ANAGRAFICA PERSONALE". Fogli: GRUPPI APP, RUBRICA, **DATI ANAGRAFICI** (anagrafica completa con email accanto ai nomi — la base dell'import), DOCUMENTI, MEDICA, VACCINAZIONI, ALLEGATI, VACCINI, **SPECIALIZZAZIONI**, **ANAGRAFICA CANI**, **VACCINAZIONI CANI**, **RILEVAZIONE TAGLIE**, **MANTENIMENTI**, Richieste_Stampa.

**Decisioni prese:**
- Collegamento account↔scheda: **via EMAIL** (chi si registra con l'email dell'elenco "raccatta" la scheda piena). Chi non è in elenco: entra come oggi (scheda vuota)
- Pulizia pre-import: cancellare i 50 di prova TRANNE l'admin (escludere esplicitamente lucianosbrau@gmail.com)
- Doppioni: tenere il LIVELLO PIÙ ALTO (es. NBCR Liv. 3 vince su Liv. 2)
- Gradi: vedi sez. 6; FF.TT.→D; C+S→l'operatore correggerà
- Comandi: aggiungere province FVG (Pordenone, Gorizia, Udine, Trieste) + torta aggiornata; SEDE a tendina (estratte dal foglio)
- Turni: G=Giornaliero in tendina (A,B,C,D,G); i G solo ferie, niente calendario; M→G; più turni→uno solo (conferma operatore); ALTRO→niente (conferma manuale)
- Nuove sezioni app: **DOCUMENTI** (2 foto documento, Profilo + scheda Operatore), **CINOFILI** (anagrafica cane + vaccinazioni, da ANAGRAFICA CANI ∪ CINOFILO=SI — NB: Contesso ha cane ma non è CINOFILO nel foglio), **TAGLIE DPI** (tuta/elmo/intimo/scarponi/guanti, card informativa)
- MANTENIMENTI: integrabile (7 causali, normalizzare "TUTOR MANTENIMENTI/CORSI"); **da chiedere: ORE REALI vs ORE PRESTATE come ore valide**
- Piano interfaccia: sezioni apribili a pulsante in PROFILO (modificabili) e scheda OPERATORE (consultazione), con i nomi delle pagine del foglio
- **PROCEDURA DI SICUREZZA**: nessuna modifica prima di BACKUP completo; prima la mappa dati→app, simulazione su campioni, poi import

**In attesa dall'utente**: le regole di gestione delle specializzazioni del foglio (FUNZIONARIO, STAFF, LOGISTA, NBCR Liv.2/3+LPG/LNG/NR, CINOFILO, SAF 1B/BASICO/2A/AVANZATO, TAS, SAPR, MEDICO, INFERMIERE) e la conferma ore reali.

## 11. Skill `vvf-usar`

Skill persistente (v4) sull'account utente: modulo USAR Medium, modello COMPOSIZIONE TEAM (sezioni 1-38 per il PDF). **Caricarla a inizio sessione.**

## 12. Qualità e anti-disaster — PROCEDURA OBBLIGATORIA

**Sistema a 3 livelli (attivo):**
1. **Test blindati** (`test-app.mjs`, 20 check): lavorano su una COPIA temporanea (`.test-run-*`, gitignored) — mai sui file veri. Comando: `node test-app.mjs`
2. **Muro di verifica in CI** (`verifica-build.mjs` nel workflow deploy): su GitHub, dopo build e PRIMA del deploy: supabase.js vero, nessun residuo `globalThis.__SB`, punti vitali nel bundle, index.html coerente, connessione DB se chiavi presenti. **Se fallisce → deploy bloccato, il sito resta com'era**
3. **Procedura manuale prima di OGNI push**: `git status` (file core non modificati senza motivo) → `npx vite build` → `node verifica-build.mjs` → `node test-app.mjs` → push → **aggiornare CONTINUITA e README nello stesso commit**

**LEZIONI IMPARATE (mai più):**
1. Dopo ogni replace sul codice: VERIFICARE con grep che i blocchi collegati esistano ancora (3 volte un replace silenzioso ha rotto il codice)
2. I file da pubblicare vanno in `index-extra/` o `public/`, mai nella radice
3. Dopo interventi nel pannello Auth di Supabase: "Confirm email" resti SPENTO
4. MAI `.catch` concatenato sulle query supabase (thenable incompleti): usare `.then(ok, ko)` o await
5. I test mai sui file veri (incidente 23/10: app bianca per tutti) + verifica build in CI
6. Service worker: la sua cache è SEPARATA da quella del browser (sw v4: pagina principale sempre dal server)

## 13. Come lavorare con l'utente

- L'utente **non è programmatore e non lavora su GitHub**: chi sviluppa gestisce Git in autonomia e spiega in italiano semplice; l'utente esegue le query SQL (indicare SEMPRE chiaramente quale file eseguire)
- Ogni decisione/azione va registrata in questo documento (senza accumulare appendici: consolidare)
- Chiedere OK esplicito prima di sviluppi non richiesti; se l'utente chiede solo di "registrare", non implementare
- A ogni modifica del bot: ricordare il **deploy su Render**; a ogni migrazione SQL: ricordare l'esecuzione

## 14. Registro cronologia

- 19-20/10: Supabase collegato, schema + seed prova, login, mantenimenti, programmazione, calendario
- 21/10: bot Telegram, PDF manifesto (4 iterazioni), tendine con ricerca
- 22/10: bot ONLINE, gruppo allerte, allerte ✅/❌, COLLAUDO END-TO-END, resoconti ferie effettive, simboli grado, scheda operatore, DB in pari
- 23/10 (mattina): back telefono, foto profilo (bucket privato), elimina account, log admin, Attivazione a tutti, cambia risposta, ricerca Operatori, revisione codice, infografica Telegram (HTML+PDF), migrazione 2 fasi, fix registrazione
- 23/10 (pomeriggio): privacy (informativa+consenso+log consultazioni+admin non modifica), test automatici 20 check, file link progetto, lettura esportazione database + decisioni import (gradi, comandi FVG, turni G, documenti, cani, taglie)
- 23/10 (sera): **incidente app bianca (test aveva sovrascritto supabase.js) → risolto + sistema anti-disaster 3 livelli**; soglia 24h; PDF in Squadre; avviso ferie; keep-alive bot; ferie tendine in giorni; finestra storico 6 mesi; fix PDF UNDEFINED NAN; contatore nessuna-risposta reale; avviso ATTIVAZIONE CHIUSA dal bot

### Specializzazioni: TABELLA DEFINITIVA (23/10/2026 — decisioni complete, da implementare)
- FUNZIONARIO: SI/NO — priorità nei posti 1, 2, 3 (Direzione)
- STAFF: SI/NO (modificabile da admin) — simbolo 📝; priorità nei posti 4, 5, 6
- LOGISTA: SI/NO (modificabile da admin) — simbolo muletto/carrello elevatore; priorità nei posti 33-38
- STRUTTURISTA: SI/NO — NON esiste nel foglio: attributo compilato personalmente dall'operatore o dall'ADMIN (con log di modifica, come le altre modifiche admin)
- CAPOSQUADRA/ROS: dai gradi CRE/CR/CSE/CS (confermato); nel menù a tendina della programmazione l'omino ROSSO del simbolo vigile (non la ⭐)
- NBCR: livelli 0, 1, 2, 3 ("Liv. 2"→2, "Liv. 3"→3); icona col numero SOLO per 2 e 3; priorità: prima i 3, poi i 2
- ESTENSIONE NBCR: valori NR/LPG/LNG (la colonna "SPECIALIZZAZIONE NBCR" del foglio è la stessa cosa — un solo campo); MAI nelle tendine
- CINOFILO: SI/NO — nell'app il nome resta "Unità cinofila K9"; nel foglio è la colonna CINOFILO (mappa durante l'import)
- SAF: 1A, 1B-BASICO, 2A-AVANZATO; simbolo 🧗; priorità SOLO 2A-AVANZATO
- TAS: No, 1, 2; icona 🧭 SOLO livello 2
- SAPR: SI/NO — SENZA simbolo (l'emoji drone era un UFO; deciso niente icona)
- MEDICO / INFERMIERE: SI/NO — SENZA simbolo
- ELIMINARE TPSS (sostituito da MEDICO/INFERMIERE)
- Modifiche admin a specializzazioni/attributi: sempre con LOG di modifica

### Tendine più grandi + decisioni SAPR/K9 + strategia import (23/10/2026 sera)
- TENDINE PROGRAMMAZIONE/ATTIVAZIONE: righe più alte (padding 10px 12px), testo 15px (era 13), simbolo vigile 20px (era 16), casella di ricerca leggermente più larga (min(460px,68%))
- UNITÀ CINOFILE K9: già obbligatorie nei posti 11, 12, 14, 15 (tendina mostra solo idonei + "● OBBL.") — confermato dall'utente, nessuna modifica necessaria
- SAPR: SENZA simbolo (decisione finale dell'utente)
- **STRATEGIA IMPORT (CONFERMATA dall'utente)**: FASE 1 = sezioni con IMPATTO sulle funzioni (DATI ANAGRAFICI + SPECIALIZZAZIONI + MANTENIMENTI) — perché cambiano tendine, priorità, badge, conteggi; FASE 2 = sezioni di sola CONSULTAZIONE (DOCUMENTI, MEDICA, VACCINAZIONI, VACCINI, ANAGRAFICA CANI, VACCINAZIONI CANI, RILEVAZIONE TAGLIE) — nessun impatto su programmazione, si importano dopo con le card dedicate
- NB: i fogli MEDICA e VACCINAZIONI (persone) non ancora letti — leggerli in fase 2

### Inizio FASE 1 import (24/10/2026 — PROSSIMO LAVORO)
- Piano CONFERMATO: FASE 1 = DATI ANAGRAFICI + SPECIALIZZAZIONI + MANTENIMENTI (impatto sulle funzioni). FASE 2 = schede consultazione (documenti, medica, vaccinazioni, vaccini, cani, taglie) con le card dedicate
- Procedura: (1) BACKUP completo codice+DB; (2) migrazione schema nuove specializzazioni (livelli NBCR 0-3, SAF 1A/1B-BASICO/2A-AVANZATO, funzionario/staff/logista/sapr/medico/infermiere SI-NO, strutturista compilabile, TPSS eliminato, estensione NBCR informativa); (3) script di import dal foglio Google con dedup livello-più-alto; (4) simulazione su 2-3 operatori campione + verifica utente; (5) pulizia operatori di prova (tranne admin) + import vero; (6) aggiornamento tendine/priorità/badge in base alla tabella definitiva
- **Da chiedere prima di importare i mantenimenti: ORE REALI o ORE PRESTATE come ore valide**

### Mantenimenti v2 + turno G + eccezioni pulizia (24/10/2026 — FATTO, import in attesa)
- **TURNO G (Giornaliero)**: aggiunto nel menù a tendina del PROFILO (A,B,C,D,G). NON impatta il calendario (G non ha salti turno né turni programmati: solo ferie). Al momento dell'import: M→G, "Giornaliero"→G
- **MANTENIMENTI — ORE CONTEGGIATE**: nuova colonna `ore_conteggiate` = riferimento SOGLIA (24h); `ore` = ore inserite dall'operatore (visuali). Nuova causale **"Manutenzione e magazzino"**: il trigger DB conteggia automaticamente il 50% delle ore in ore_conteggiate (per le altre causali ore_conteggiate = ore). Migrazione: `db/migrazione-mantenimenti-v2.sql` (**DA ESEGUIRE in SQL Editor** — aggiunge colonna+causale+trigger; i record esistenti: ore_conteggiate=ore). App aggiornata: dashboard/schede/tendine conteggiano ore_conteggiate; causale presente in app E nel bot (RICHIEDE DEPLOY RENDER)
- **IMPORT MANTENIMENTI (piano confermato)**: azzerare i mantenimenti attuali (di prova) e importare dal foglio: ore = ORE PRESTATE, ore_conteggiate = ORE REALI PRESTATE (scritti espliciti, il trigger non li ricalcola), tipo normalizzato (TUTOR MANTENIMENTI→Tutor Mantenimento ecc.), APPROVATO SI→approvato. L'AZZERAMENTO+IMPORT si esegue insieme all'import anagrafico della FASE 1 (i mantenimenti si collegano via email/codice fiscale alle schede vere)
- **ECCEZIONI PULIZIA operatori di prova**: NON cancellare oltre all'admin anche MICHELE TENAN, ANDREA CONTESSO, CLAUDIO IPPOLITO (sono nel foglio reale: account già creati in Supabase da tenere)

### Regole SEDI definitve (24/10/2026, decisione utente)
- La tendina SEDE in Profilo sarà a CASCATA: scelgo il comando → vedo solo le sedi di quel comando
- **Dir. Reg. Veneto = COMANDO A PARTE** (oltre alle 7 province venete + 4 FVG), con UNICA sede: **Centrale Direzione**
- **Le centrali si chiamano "Centrale + provincia"**: Centrale Padova, Centrale Treviso, Centrale Verona, Centrale Belluno, Centrale Rovigo, Centrale Udine, Centrale Pordenone, Centrale Trieste, Centrale Gorizia — **ECCEZIONE VENEZIA: si chiama "Centrale Mestre"**
- Elenco comandi definitivo (12): DIREZIONE REGIONALE VENETO, VENEZIA, PADOVA, TREVISO, VERONA, VICENZA, BELLUNO, ROVIGO, UDINE, PORDENONE, TRIESTE, GORIZIA (i valori del foglio vanno mappati su questi; es. riga ALFANO con comando DIREZIONE VENETO → DIREZIONE REGIONALE VENETO, sede CENTRALE → Centrale Direzione)
- Procedura: estrarre dal foglio le coppie comando→sede, normalizzarle secondo le regole, far verificare la lista dall'utente, poi caricare nel DB (tabella sedi) e tendina a cascata
- Il turno G NON ha salto (G a tendina → campo salto disabilitato/svuotato)

### SEDI a cascata + comandi 12 + G senza salto (24/10/2026 — FATTO)
- Migrazione `db/migrazione-sedi.sql` (**DA ESEGUIRE in SQL Editor**): tabella `sedi` con la lista UFFICIALE confermata dall'utente (12 comandi: DIREZIONE REGIONALE VENETO + 7 venete + 4 FVG; ~55 sedi). Verona usa "Caldiero" (senza "Distaccamento")
- PROFILO: Comando = tendina con i 12; SEDE = tendina A CASCATA (solo le sedi del comando scelto); l'utente vede la propria sede attuale anche se non in lista (pre-selezionata)
- TURNO G: selezionando G il campo SALTO si svuota e si DISATTIVA (G non ha salto); salvataggio: salto vuoto per G
- MANTENIMENTI: confermato dall'utente che le ore importate si considerano TUTTE APPROVATE
- La torta Dashboard e i filtri comando vanno aggiornati con i 12 comandi al prossimo giro (le tendine programmazione usano il campo comando del profilo, non fisse)

## 15. FASE 1 IMPORT — RUNBOOK COMPLETO (stato: PREPARATA, non ancora eseguita)

> Se la sessione crash: leggere questa sezione per sapere a che punto siamo.
> Stato attuale: PREPARAZIONE COMPLETA. **Non è stato toccato NIENTE nel database online.**

### Cosa è già pronto (verificato 24/10/2026)
- ✅ Codice: tag git `backup-pre-fase1-24-10-2026` (backup completo del codice, pushato su GitHub)
- ✅ Migrazione progettata: `db/FASE1-migrazione-specializzazioni.sql` (**DA NON ESEGUIRE ANCORA**) — aggiunge SOLO colonne/tabelle nuove accanto alle esistenti (sp_* su profili, anagrafici nuovo, cani, cani_vaccini, taglie_dpi, log_modifiche_spec, RPC admin_modifica_spec). Le colonne vecchie NON si toccano finché l'import non è verificato (TPSS rimossa solo a fine fase)
- ✅ Verifiche fatte dall'utente: mantenimenti v2 ✅, sedi ✅, soglia 24 ✅, tendine sedi ✅
- ✅ Tutte le regole decise: specializzazioni (sez. 6 + tabella definitiva), gradi, comandi/sedi (12 + lista), turni G, dedup livello-alto, eccezioni pulizia (admin + TENAN + CONTESSO + IPPOLITO), mantenimenti (ore=prestate, conteggiate=reali, tutti approvati)

### Passi della FASE 1 (in ordine — spuntare man mano)
- [x] 3. **Script di import COMPLETO ✅ (24/10)**: `import-fase1.py` (Python, legge il foglio Google via export XLSX — il CSV gviz fondeva la riga 1 del foglio SPECIALIZZAZIONI con i dati dei primi 19 operatori; XLSX rispetta le righe). Uso: `python3 import-fase1.py --simula COGNOME1,COGNOME2` per la simulazione di uno o più operatori. REGOLE implementate: gradi (FF.TT.→D), comandi (12, DIREZIONE VENETO→DIREZIONE REGIONALE VENETO), turni (M/GIORNALIERO→G, G senza salto, ALTRO→null), sedi (CENTRALE→Centrale+provincia, eccezione Centrale Mestre/Centrale Direzione), NBCR livelli (Liv. 2/3→2/3, dedup livello alto), SAF (1B-BASICO/2A-AVANZATO), TAS (colonna "TAS 2": SI→livello 2), ESTENSIONE NBCR (NR/LPG/LNG), telefoni normalizzati SENZA +39 e senza spazi/punti, CF estratti anche da formule =UPPER(...), corso USAR, missioni int., ICE, telefoni servizio/casa, email login (gmail) + email servizio (@vigilfuoco.it) separate
- [x] 4. **SIMULAZIONI FATTE E VERIFICATE DALL'UTENTE ✅ (24/10)**: BUBOLA (staff+logista+TAS2), ZANAGA (staff+TAS2), RUBIN (logista), BORRELLO (staff+logista+SAF 1B+TAS2), DI DOMENICO (logista+NBCR3, turno G), LUCHIN (NBCR3, CF da formula). L'utente può chiedere altri test con: python3 import-fase1.py --simula COGNOME — o chiederlo all'AI. Test aggiuntivi verificati: DI LORENZO (staff+NBCR2+NR+TAS2), FAVARO (staff+logista+NBCR3+LPG), MORFINO (logista+NBCR3+SAF1B), ANAFI (NBCR2), DE MIN (logista), GAZ (staff+logista)
- [x] **1. BACKUP DATABASE ✅ FATTO (24/10)**: piano Free senza backup nativi → export via query di sola lettura (db/BACKUP-export-letture.sql): 4 CSV su Drive ("Esportazione database - backup supabase": profili 52KB, mantenimenti 43KB, ferie/squadre 6KB, specializzazioni/impostazioni/sedi 4KB) + schema tabelle. Documentazione in backup-db/2026-10-23/. NB: password login non esportabili (ok), disponibilita era vuota all'export
- [x] 2. **Eseguita `db/FASE1-migrazione-specializzazioni.sql` ✅ (24/10)** — l'avviso "query distruttiva" di Supabase è standard (vedi drop policy if exists); nessun dato toccato, solo aggiunte
- [ ] 5. **Pulizia + import** (⏱ FINESTRA DI QUIETE 5-10 MINUTI — unica fase che la richiede: nessun inserimento da parte degli utenti; passi 2/3/4/6 non interrompono l'app): cancellare gli operatori di prova (TRANNE admin, TENAN, CONTESSO, IPPOLITO — via id esplicito), azzerare i mantenimenti di prova, eseguire l'import (anagrafici → specializzazioni → mantenimenti con ore=prestate/conteggiate=reali, tutti approvati)
- [ ] 6. **Aggiornare l'app**: tendine/priorità/badge sulle nuove colonne sp_* (STAFF 📝 nei 4-6, LOGISTA nei 33-38, FUNZIONARIO 1-3, NBCR prima 3 poi 2, SAF solo 2A-AVANZATO, K9 11-15, strutturista 7-9, ROS omino rosso 17-25); Profilo con sezioni apribili; collegamento email→scheda alla registrazione; rimozione TPSS dall'interfaccia
- [ ] 7. **Verifica finale con l'utente**: login con account reale, scheda piena, tendine con priorità, dashboard con numeri veri, mantenimenti importati
- [ ] 8. **Fine FASE 1**: rimozione colonne vecchie non più usate (tpss, vecchio schema specializzazioni se non più referenziato) — SOLO dopo verifica, in una migrazione separata

### Punti di attenzione
- Il trigger `trg_blocca_modifiche_admin` vieta all'admin le modifiche ai profili: le specializzazioni admin passano dalla RPC `admin_modifica_spec` (che logga)
- L'import usa email come chiave; righe senza email: caricare comunque la scheda (l'utente completerà la mail poi)
- Il foglio ha ~150 righe con anomalie già mappate (vedi sez. 10); ogni anomalia non prevista → chiedere all'utente, non improvvisare
- Dopo l'import: i 50 di prova spariscono; i seed non si rieseguono più
