# Documento di continuità del progetto — App USAR Veneto

> **Scopo di questo documento**: consentire a chiunque (persona o AI) di riprendere il lavoro esattamente da dove siamo arrivati, anche in caso di crash di una sessione di lavoro. Aggiornarlo a ogni nuova decisione importante.

Ultimo aggiornamento: 17 ottobre 2025 (sessione 1)

---

## 1. Cos'è il progetto

**Nucleo USAR Veneto** — sistema per gestire ~100 operatori organizzati mensilmente in due squadre operative:

- **Team Alpha**
- **Team Bravo**

Composizione basata su disponibilità, specializzazioni, abilitazioni, patenti e altri requisiti.

Il progetto include gestione addestramenti, attivazioni di emergenza con risposta SÌ/NO, resoconti, statistiche e generazione PDF del Manifesto del personale.

## 2. Architettura decisa

| Componente | Scelta | Note |
|---|---|---|
| Frontend | **PWA** (Progressive Web App) | Installabile su home screen, notifiche push, offline base, optimistic UI |
| Backend/DB | **Supabase** — regione Frankfurt (UE) | PostgreSQL + auth + Realtime + API auto. Piano Free da inizio; **non è gratis per sempre** (Pro ~25$/mese). Architettura anti lock-in |
| Comunicazioni | **Bot Telegram + Mini App** | Attivazioni con risposta ✅ SÌ / ❌ NO, calendario, doppio canale di notifica (push PWA + Telegram) |
| PDF | Manifesto del personale | Generato quando l'attivazione è confermata e coerente con la composizione prevista, sul modello grafico che l'utente fornirà |
| Report | Export **Excel e CSV** | Statistiche personali, resoconti attivazioni, addestramenti |
| Hosting | GitHub Pages (già attivo) | https://lucianosbrau.github.io/App-Usar-Veneto/ |

Futuro opzionale: `.exe` Windows, `.apk` Android, iOS.

## 3. Pagine dell'app (10)

| Pagina | Chi la vede | Cosa fa |
|---|---|---|
| Dashboard | Tutti | Panoramica generale, attivazione rapida (admin) |
| Operatori | Admin | Gestione completa: ricerca, filtri, dettaglio, modifica, inserimento |
| Squadre | Admin | Composizione Alpha/Bravo: proposta automatica + drag & drop (dnd-kit) |
| Calendario | Tutti | Turni mensili, pubblicazione e invio via Telegram |
| Disponibilità | Operatore | Disponibilità, ferie, indisponibilità |
| Attivazione | Admin | Lancio emergenza ALPHA/BRAVO, messaggio modificabile prima dell'invio |
| Addestramento | Admin + Operatore (proprio) | Registro ore annue, evidenziazione sotto-soglia, storico per anno |
| Internazionale | Admin + Operatore (proprio) | Operatori **abilitati alle missioni internazionali** e relative **vaccinazioni** (registro abilitazioni, stato vaccinazioni e scadenze) |
| Report/Statistiche | Admin | Statistiche personali e di intervento, export Excel/CSV |
| Resoconti | Admin | Storico attivazioni: allertati, SÌ, NO, nessuna risposta, orari |
| Profilo | Tutti | Dati personali, specializzazioni e abilitazioni |

## 4. Ruoli

**Operatore**: modifica dati propri consentiti; modifica specializzazioni e abilitazioni; inserisce disponibilità e ferie; consulta il proprio calendario; riceve comunicazioni Telegram; risponde alle attivazioni; consulta il proprio registro addestramento.

**Amministratore**: gestisce operatori; definisce requisiti Alpha/Bravo; usa proposta automatica di composizione + modifica manuale; crea e invia calendario mensile via Telegram; attiva ALPHA o BRAVO; consulta report e resoconti; registra addestramenti; genera il Manifesto PDF.

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

## 6. Addestramento

- Registro ore per operatore, totale annuale
- Requisito minimo ore/anno (es. 40-50 ore) — **numero definitivo da definire**
- Evidenziazione automatica rosso/giallo di chi è sotto soglia
- Dettaglio: data, tipo, ore, partecipante
- Storico confrontabile anno per anno
- Export Excel/CSV

**Domande aperte**:
1. Quante ore minime all'anno per operatore?
2. Gli addestramenti li inserisce l'admin o li autocertifica l'operatore (con approvazione admin)?
3. Esistono tipi di addestramento diversi (NBCR, SAF, cinofilo, guida...) con requisiti diversi?

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

## 7. Report e resoconti

- **Statistiche del personale**: assegnazioni Alpha/Bravo per operatore, totale impieghi, media mensile, operatore con più/meno interventi, storico filtrabile per periodo e squadra
- **Resoconto attivazioni**: personale allertato, SÌ/NO/nessuna risposta, orari delle risposte, storico filtrabile
- Tutto esportabile **Excel e CSV**

## 8. Stile visivo (mockup già validati)

- Palette: blu notte `#0F172A`, blu royal `#2563EB`, arancione `#EA580C`, ambra `#F59E0B`, sfondi `#F1F5F9`/`#F8FAFC`, antracite `#1E293B`, grigi `#64748B`/`#CBD5E1`
- Stato: verde `#D1FAE5`/`#065F46`, giallo `#FEF3C7`/`#92400E`, rosso `#FEE2E2`/`#991B1B`
- Login: gradiente blu notte→royal, card bianca 420px, angoli 20px, campi 52px arrotondati 10px
- Dashboard: sidebar 260px scura, card squadre con bordo sinistro colorato e badge PRONTA/PARZIALE, pulsanti grandi ATTIVA
- Font: Inter/Roboto, ombre morbide, angoli arrotondati 10-16px
- Simulazioni complete in `anteprima-schermate.html`; panoramica in `presentazione.html`

## 9. Stato del repository

- File: `README.md`, `presentazione.html` (panoramica progetto), `anteprima-schermate.html` (mockup 4 schermate con dati finti), `CONTINUITA.md` (questo documento)
- GitHub Pages attivo su `main`: ogni file HTML committato è visibile a https://lucianosbrau.github.io/App-Usar-Veneto/<file>
- Ramo predefinito: `main` (verificare che non sia ancora `vibe/presentazione-progetto-b67a8e`; se sì, cambiarlo da Settings → General → Default branch, poi eliminare il ramo vecchio)
- Non esiste ancora codice applicativo: solo documentazione e mockup

## 10. Note legali / privacy

- Dati personali e potenzialmente delicati (vaccinazioni, abilitazioni): prima della messa in produzione serve verifica specifica **GDPR** (ruoli di accesso, conservazione, backup). Server UE aiuta ma **non è conformità automatica**
- Da verificare: database attualmente utilizzato dall'utente (Google Sheets / Excel / SQL / AppSheet) per riutilizzare i dati esistenti senza reinserirli

## 11. Prossimi passi (in ordine)

1. Ottenere dall'utente: logo ufficiale, modello grafico del Manifesto PDF, database esistente, risposte alle 3 domande dell'addestramento (sez. 6), elenco definitivo requisiti Alpha/Bravo
2. Impostare il progetto della web app (PWA) e lo schema del database Supabase
3. Sviluppare per priorità: autenticazione/ruoli → operatori → disponibilità → squadre → attivazione realtime → addestramento → report/export → PDF → bot Telegram

## 12. Come lavorare con l'utente

- L'utente **non è programmatore**: gestire GitHub in autonomia (commit, merge, PR) e spiegare in linguaggio semplice cosa è stato fatto
- L'utente deve dare **OK esplicito** prima di toccare codice o procedere con sviluppi; registrare requisiti senza implementare quando chiede solo di "registrare"
- Comunicazione in italiano
- Ogni nuova decisione importante va riportata in questo documento
