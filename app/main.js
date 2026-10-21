import { jsPDF } from 'jspdf';
import { supabase, isConfigured } from './supabase.js';

const app = document.getElementById('app');
let utente = null;
let pagina = 'dashboard';
let progMese = null;
let progTeam = null;
let progId = null;
let SPEC_IDS = {};
let mieFerieGlobali = {};

async function caricaSpecializzazioni() {
  const [specs, ops] = await Promise.all([
    supabase.from('specializzazioni').select('id, nome'),
    supabase.from('operatori_specializzazioni').select('operatore_id, specializzazione_id')
  ]);
  SPEC_IDS = {};
  (specs.data || []).forEach(s => { SPEC_IDS[s.nome] = []; });
  (ops.data || []).forEach(o => {
    const nome = (specs.data || []).find(s => s.id === o.specializzazione_id)?.nome;
    if (nome) SPEC_IDS[nome].push(o.operatore_id);
  });
}

const TIPI_MAN = ['Mantenimento', 'Manovra', 'Intervento', 'Lavorazione', 'Tutor Mantenimento', 'Tutor Corso', 'Altra formazione'];

function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function iniziali(nome, cognome) {
  return ((nome?.[0] || '') + (cognome?.[0] || '')).toUpperCase() || '?';
}
function fmtData(d) {
  if (!d) return '';
  const [y, m, g] = String(d).split('-');
  return `${g}/${m}/${y}`;
}

async function init() {
  if (!isConfigured) {
    app.innerHTML = `
      <div class="login-page">
        <div class="login-card">
          <img class="logo" src="assets/logo-usar.jpg" alt="USAR Veneto">
          <h1>Nucleo USAR Veneto</h1>
          <p class="sub">Configurazione necessaria</p>
          <div class="errore" style="display:block;">
            Il database Supabase non è ancora configurato.<br><br>
            Crea un file <b>.env</b> con le variabili:<br>
            VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
          </div>
        </div>
      </div>`;
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await caricaUtente(session.user);
    await caricaSpecializzazioni();
    render();
  } else {
    renderLogin();
  }
}

async function caricaUtente(user) {
  utente = user;
  const { data: prof } = await supabase.from('profili').select('*').eq('id', utente.id).single();
  if (!prof) {
    const nome = utente.user_metadata?.nome || '';
    const cognome = utente.user_metadata?.cognome || '';
    await supabase.from('profili').insert({ id: utente.id, nome, cognome, email: utente.email });
    utente.nome = nome; utente.cognome = cognome; utente.ruolo = 'operatore';
  } else {
    utente.nome = prof.nome; utente.cognome = prof.cognome; utente.ruolo = prof.ruolo || 'operatore';
  utente.salto_turno = prof.salto_turno; utente.turno = prof.turno; utente.comando = prof.comando; utente.sede = prof.sede;
  }
}

function renderLogin() {
  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <img class="logo" src="assets/logo-usar.jpg" alt="Logo USAR Veneto">
        <h1>Nucleo USAR Veneto</h1>
        <p class="sub">Gestione squadre e attivazioni emergenze</p>
        <div class="errore" id="err"></div>
        <div class="campo"><input id="email" type="email" placeholder="nome.cognome@vigilfuoco.it" autocomplete="username"></div>
        <div class="campo">
          <input id="pw" type="password" placeholder="Password" autocomplete="current-password">
          <button class="toggle-pw" id="toggle">👁</button>
        </div>
        <button class="btn-primary" id="accedi">ACCEDI</button>
        <button class="link" id="registrati">Primo accesso? Registrati</button>
        <button class="link" id="reset">Password dimenticata?</button>
      </div>
    </div>`;
  document.getElementById('toggle').onclick = () => {
    const pw = document.getElementById('pw');
    pw.type = pw.type === 'password' ? 'text' : 'password';
  };
  document.getElementById('accedi').onclick = accedi;
  document.getElementById('pw').onkeydown = e => { if (e.key === 'Enter') accedi(); };
  document.getElementById('registrati').onclick = renderRegistrazione;
  document.getElementById('reset').onclick = async () => {
    const email = document.getElementById('email').value;
    if (!email) return mostraErrore('Inserisci la tua email');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    mostraErrore(error ? error.message : 'Email di recupero inviata');
  };
}

function renderRegistrazione() {
  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <img class="logo" src="assets/logo-usar.jpg" alt="Logo USAR Veneto">
        <h1>Registrazione</h1>
        <p class="sub">Crea il tuo account operatore</p>
        <div class="errore" id="err"></div>
        <div class="successo" id="ok"></div>
        <div class="campo"><input id="nome" type="text" placeholder="Nome" autocomplete="given-name"></div>
        <div class="campo"><input id="cognome" type="text" placeholder="Cognome" autocomplete="family-name"></div>
        <div class="campo"><input id="email" type="email" placeholder="nome.cognome@vigilfuoco.it" autocomplete="email"></div>
        <div class="campo">
          <input id="pw" type="password" placeholder="Password (minimo 6 caratteri)" autocomplete="new-password">
          <button class="toggle-pw" id="toggle">👁</button>
        </div>
        <button class="btn-primary" id="reg">REGISTRATI</button>
        <button class="link" id="indietro">← Torna al login</button>
      </div>
    </div>`;
  document.getElementById('toggle').onclick = () => {
    const pw = document.getElementById('pw');
    pw.type = pw.type === 'password' ? 'text' : 'password';
  };
  document.getElementById('indietro').onclick = renderLogin;
  document.getElementById('reg').onclick = registrati;
}

function evidenzia(ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.borderColor = 'var(--rosso)';
  });
}

async function registrati() {
  const nome = document.getElementById('nome').value.trim();
  const cognome = document.getElementById('cognome').value.trim();
  const email = document.getElementById('email').value.trim();
  const pw = document.getElementById('pw').value;
  const mancanti = [];
  ['nome', 'cognome', 'email', 'pw'].forEach(id => {
    const el = document.getElementById(id);
    el.style.borderColor = 'var(--bordo)';
    if (!el.value.trim()) mancanti.push(id);
  });
  if (mancanti.length) {
    evidenzia(mancanti);
    return mostraErrore('Compila tutti i campi evidenziati');
  }
  if (pw.length < 6) return mostraErrore('La password deve avere almeno 6 caratteri');
  const { data, error } = await supabase.auth.signUp({
    email, password: pw,
    options: { data: { nome, cognome } }
  });
  if (error) return mostraErrore(error.message);
  if (!data.session) {
    mostraSuccesso('Registrazione riuscita: conferma l\'email ricevuta, poi torna qui ad accedere.');
  } else {
    await caricaUtente(data.user);
    render();
  }
}

function mostraErrore(msg) {
  const err = document.getElementById('err');
  err.style.display = 'block';
  err.textContent = msg;
}

function mostraSuccesso(msg) {
  const ok = document.getElementById('ok');
  ok.style.display = 'block';
  ok.textContent = msg;
}

async function accedi() {
  const email = document.getElementById('email').value.trim();
  const pw = document.getElementById('pw').value;
  if (!email || !pw) return mostraErrore('Inserisci email e password');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
  if (error) return mostraErrore('Credenziali non valide');
  await caricaUtente(data.user);
  await caricaSpecializzazioni();
  render();
}

async function esci() {
  await supabase.auth.signOut();
  utente = null;
  renderLogin();
}

function render() {
  const menu = [
    { id: 'dashboard', ic: '🏠', t: 'Dashboard' },
    { id: 'operatori', ic: '👥', t: 'Operatori', admin: true },
    { id: 'squadre', ic: '⚔️', t: 'Squadre' },
    { id: 'calendario', ic: '📅', t: 'Calendario' },
    { id: 'attivazione', ic: '🚨', t: 'Attivazione', admin: true },
    { id: 'programmazione', ic: '🗓️', t: 'Programmazione', admin: true },
    { id: 'mantenimenti', ic: '🎓', t: 'Mantenimenti' },
    { id: 'internazionale', ic: '🌍', t: 'Internazionale' },
    { id: 'report', ic: '📊', t: 'Report', admin: true },
    { id: 'resoconti', ic: '📄', t: 'Resoconti', admin: true },
    { id: 'profilo', ic: '👤', t: 'Profilo' },
  ];
  const voci = menu.filter(v => !v.admin || utente.ruolo === 'admin');
  const nomeCompleto = esc(`${utente.cognome || ''} ${utente.nome || ''}`.trim() || utente.email);
  app.innerHTML = `
    <div class="layout">
      <div class="sidebar">
        <div class="brand"><img src="assets/logo-usar.jpg" alt=""> USAR Veneto</div>
        <div class="tricolore"><div class="verde"></div><div class="bianco"></div><div class="rosso"></div></div>
        <div class="menu">
          ${voci.map(v => `<button class="voce ${pagina === v.id ? 'attiva' : ''}" data-p="${v.id}"><span>${v.ic}</span> ${v.t}</button>`).join('')}
          <div class="separatore"></div>
          <button class="voce" id="logout">🚪 Esci</button>
        </div>
        <div style="padding:16px 20px; font-size:12px; color:#94A3B8;">
          ${nomeCompleto}<br>${utente.ruolo === 'admin' ? 'Amministratore' : 'Operatore'}<br>
          <span style="font-size:10px; opacity:0.7;">v. 20/10/2026</span>
        </div>
      </div>
      <div class="contenuto" id="contenuto"></div>
    </div>
    <div class="mobile-nav" id="mobile-nav">
      ${(utente.ruolo === 'admin'
        ? [['dashboard','🏠','Dashboard'], ['squadre','⚔️','Squadre'], ['programmazione','🗓️','Programmazione'], ['attivazione','🚨','Attivazione']]
        : [['calendario','📅','Calendario'], ['squadre','⚔️','Squadre'], ['mantenimenti','🎓','Mantenimenti']]
      ).map(([id, ic, t]) => `<button data-p="${id}" class="${pagina === id ? 'attiva' : ''}"><span class="ic">${ic}</span>${t}</button>`).join('')}
      <button id="menu-btn"><span class="ic">☰</span>Menù</button>
    </div>
    <div class="menu-overlay" id="overlay"></div>
    <div class="menu-mobile" id="menu-mobile">
      <div class="menu-mobile-testata">
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="assets/logo-usar.jpg" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">
          <div style="font-weight:800;">USAR Veneto</div>
        </div>
        <button id="chiudi-menu" style="background:none;border:none;font-size:22px;cursor:pointer;">✕</button>
      </div>
      <div style="padding:0 16px; font-size:12px; color:#64748B; margin-bottom:8px;">
        ${nomeCompleto} — ${utente.ruolo === 'admin' ? 'Amministratore' : 'Operatore'} — v. 20/10/2026
      </div>
      <div class="menu-mobile-lista">
        ${voci.map(v => `<button class="menu-mobile-voce" data-p="${v.id}" data-menu><span>${v.ic}</span> ${v.t}</button>`).join('')}
        <div style="border-top:1px solid var(--bordo); margin:10px 0;"></div>
        <button class="menu-mobile-voce" data-esci><span>🚪</span> Esci</button>
      </div>
    </div>`;
  app.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { pagina = b.dataset.p; render(); });
  document.getElementById('logout').onclick = esci;
  const barraMobile = document.getElementById('mobile-nav');
  const aggiornaBarra = () => {
    if (!barraMobile) return;
    barraMobile.style.display = window.innerWidth < 900 ? 'flex' : 'none';
  };
  aggiornaBarra();
  window.onresize = aggiornaBarra;
  const overlay = document.getElementById('overlay');
  const menuMobile = document.getElementById('menu-mobile');
  const apriMenu = () => { overlay.classList.add('aperto'); menuMobile.classList.add('aperto'); };
  const chiudiMenu = () => { overlay.classList.remove('aperto'); menuMobile.classList.remove('aperto'); };
  document.getElementById('menu-btn').onclick = apriMenu;
  document.getElementById('chiudi-menu').onclick = chiudiMenu;
  overlay.onclick = chiudiMenu;
  menuMobile.querySelectorAll('[data-esci]').forEach(b => b.onclick = async () => { chiudiMenu(); await esci(); });
  menuMobile.querySelectorAll('[data-menu]').forEach(b => b.onclick = () => { chiudiMenu(); pagina = b.dataset.p; render(); });
  renderPagina();
}

function renderPagina() {
  const c = document.getElementById('contenuto');
  switch (pagina) {
    case 'dashboard': return pagDashboard(c);
    case 'mantenimenti': return pagMantenimenti(c);
    case 'operatori': return pagOperatori(c);
    case 'attivazione': return pagAttivazione(c);
    case 'programmazione': return pagProgrammazione(c);
    case 'calendario': return pagCalendario(c);
    case 'profilo': return pagProfilo(c);
    case 'resoconti': return pagResoconti(c);
    default: {
      const TITOLI = { squadre: 'Squadre', internazionale: 'Internazionale', report: 'Report e Statistiche' };
      c.innerHTML = `<div class="pagina-titolo">${TITOLI[pagina] || esc(pagina)}</div><div class="pagina-sotto">Pagina in costruzione</div>
        <div class="card">Questa sezione sarà sviluppata nei prossimi passi.</div>`;
    }
  }
}

function pagDashboard(el) {
  el.innerHTML = `
    <div class="pagina-titolo">Dashboard</div>
    <div class="pagina-sotto">Panoramica operativa — ${new Date().toLocaleDateString('it-IT')}</div>
    <div class="card">Benvenuto, ${esc(utente.nome || '')} ${esc(utente.cognome || '')}. Le card dei team Alpha/Bravo e l'attivazione rapida saranno sviluppate nei prossimi passi.</div>`;
}

async function pagOperatori(el) {
  el.innerHTML = `<div class="pagina-titolo">👥 Gestione Operatori</div><div class="pagina-sotto">Caricamento…</div>`;
  const { data: operatori, error } = await supabase.from('profili').select('*').order('cognome');
  if (error) {
    el.innerHTML += `<div class="card">Errore: ${esc(error.message)}</div>`;
    return;
  }
  el.innerHTML += `
    <div class="grid" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:20px;">
      ${operatori.map(o => `
        <div class="card" style="border-left:4px solid var(--royal);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div class="avatar" style="width:56px;height:56px;font-size:18px;">${esc(iniziali(o.nome, o.cognome))}</div>
            <span class="pill ${o.ruolo === 'admin' ? 'rosso' : 'verde'}">${o.ruolo === 'admin' ? '⭐ Admin' : '🟢 Attivo'}</span>
          </div>
          <div style="font-size:18px; font-weight:700;">${esc(o.cognome)} ${esc(o.nome)}</div>
          <div style="font-size:14px; color:var(--grigio);">${esc(o.ruolo)}</div>
        </div>`).join('')}
    </div>`;
}



/* ============ RESOCONTI ============ */

async function pagResoconti(el) {
  el.innerHTML = `
    <div class="pagina-titolo">📄 Resoconti</div>
    <div class="pagina-sotto">Sintesi operativa</div>
    <div id="res-cont">Caricamento…</div>`;
  const cont = document.getElementById('res-cont');
  const now = new Date();
  const inizioMese = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const fineMese = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  const { data: ferie } = await supabase.from('disponibilita').select('operatore_id, data, turno_ferie, profili(cognome, nome)')
    .eq('tipo', 'ferie').gte('data', inizioMese).lte('data', fineMese);

  const perOp = {};
  (ferie || []).forEach(f => {
    const nome = `${f.profili?.cognome} ${f.profili?.nome}`;
    perOp[nome] = perOp[nome] || { g: 0, n: 0 };
    if (f.turno_ferie === 'notte') perOp[nome].n++;
    else perOp[nome].g++;  // giorno o intera giornata
  });
  const totaleG = Object.values(perOp).reduce((s, v) => s + v.g, 0);
  const totaleN = Object.values(perOp).reduce((s, v) => s + v.n, 0);
  const nomi = Object.keys(perOp).sort();

  cont.innerHTML = `
    <div class="card" style="margin-bottom:20px;">
      <div style="font-weight:700; margin-bottom:10px;">🏖 Ferie di ${['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'][now.getMonth()]} ${now.getFullYear()}</div>
      <div style="display:flex; gap:20px; margin-bottom:14px;">
        <div><div style="font-size:32px; font-weight:800; color:var(--royal);">${totaleG}</div>☀️ Giorni ferie diurne</div>
        <div><div style="font-size:32px; font-weight:800; color:var(--royal);">${totaleN}</div>🌙 Notti ferie</div>
        <div><div style="font-size:32px; font-weight:800;">${nomi.length}</div>👥 Operatori coinvolti</div>
      </div>
      ${nomi.length ? `
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <tr style="text-align:left; color:var(--grigio); font-size:12px;"><th style="padding:6px 0;">Operatore</th><th>☀️ Giorno</th><th>🌙 Notte</th></tr>
        ${nomi.map(n => `<tr style="border-top:1px solid var(--bordo);"><td style="padding:7px 0;">${esc(n)}</td><td>${perOp[n].g}</td><td>${perOp[n].n}</td></tr>`).join('')}
      </table>` : '<div style="color:var(--grigio);">Nessuna ferie registrata questo mese.</div>'}
    </div>
    <div class="card"><div style="font-weight:700; margin-bottom:8px;">📋 Resoconti attivazioni</div><div style="color:var(--grigio); font-size:14px;">Saranno disponibili con lo sviluppo delle attivazioni di emergenza.</div></div>`;
}

/* ============ CALENDARIO TURNI ============ */
/* Ciclo salti turno: parte da 01/11/2026 (B2 giorno / A2 notte).
   Lettera avanza ogni giorno (B,C,D,A), numero sale dopo 4 giorni, ciclo 32 coppie (A1..D8).
   La notte del giorno n ha il salto del giorno n-1. */

const RIFERIMENTO = Date.UTC(2026, 10, 1); // 01/11/2026
const GIORNO_MS = 86400000;
const LETTERE = ['B', 'C', 'D', 'A'];

function saltoGiorno(n) {
  const idx = ((n % 4) + 4) % 4;
  const L = 2 + Math.floor((n + 1) / 4);
  const numero = (((L - 1) % 8) + 8) % 8 + 1;
  return LETTERE[idx] + numero;
}
function nGiorno(anno, mese, giorno) {
  return Math.round((Date.UTC(anno, mese, giorno) - RIFERIMENTO) / GIORNO_MS);
}
function coppiaGiorno(anno, mese, giorno) {
  const n = nGiorno(anno, mese, giorno);
  return { giorno: saltoGiorno(n), notte: saltoGiorno(n - 1) };
}

async function pagCalendario(el) {
  const oggi = new Date();
  let anno = oggi.getFullYear(), mese = oggi.getMonth();
  const meseSalvato = localStorage.getItem('cal-mese');
  if (meseSalvato) { anno = Number(meseSalvato.slice(0, 4)); mese = Number(meseSalvato.slice(5)) - 1; }
  await disegnaCalendario(el, anno, mese);
}

async function disegnaCalendario(el, anno, mese) {
  localStorage.setItem('cal-mese', `${anno}-${String(mese + 1).padStart(2, '0')}`);
  const mioSalto = utente.salto_turno || '';
  const inizioMese = `${anno}-${String(mese + 1).padStart(2, '0')}-01`;
  const fineMese = `${anno}-${String(mese + 1).padStart(2, '0')}-${String(new Date(anno, mese + 1, 0).getDate()).padStart(2, '0')}`;
  const [fe] = await Promise.all([
    supabase.from('disponibilita').select('id, operatore_id, data, tipo, turno_ferie, profili(nome, cognome)')
      .eq('tipo', 'ferie').gte('data', inizioMese).lte('data', fineMese)
  ]);
  const ferieGiorno = {};
  const mieFerieId = {};
  mieFerieGlobali = {};
  (fe.data || []).forEach(f => {
    const nome = `${f.profili?.cognome} ${f.profili?.nome}`;
    (ferieGiorno[f.data] = ferieGiorno[f.data] || []).push(nome + (f.turno_ferie ? ` (${f.turno_ferie === 'giorno' ? '☀️' : '🌙'})` : ''));
    if (f.operatore_id === utente.id) {
      const chiave = f.data + '|' + (f.turno_ferie || 'intera');
      mieFerieId[chiave] = f.id;
      mieFerieGlobali[chiave] = f.id;
    }
  });
  const nomiMesi = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const primaValida = Date.UTC(2024, 0, 1), ultimaValida = Date.UTC(2028, 11, 31);

  el.innerHTML = `
    <div class="pagina-titolo">📅 Calendario</div>
    <div class="pagina-sotto">Turni e salti turno — il tuo salto è evidenziato in giallo — clicca sul turno per inserire/eliminare le tue ferie.</div>
    <div class="card" style="margin-bottom:18px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <button class="pill" id="cal-indietro" style="border:1px solid var(--bordo); cursor:pointer; background:#fff;">◀ Mese prima</button>
        <div style="font-size:20px; font-weight:800;">${nomiMesi[mese]} ${anno}</div>
        <button class="pill" id="cal-avanti" style="border:1px solid var(--bordo); cursor:pointer; background:#fff;">Mese dopo ▶</button>
      </div>
      ${mioSalto ? `<div style="text-align:center; margin-top:10px; font-size:13px; color:var(--grigio);">Il tuo salto turno: <b style="background:var(--giallo-bg); color:var(--giallo-tx); padding:2px 10px; border-radius:99px;">${esc(mioSalto)}</b> — riposo quando compare in giallo</div>` : '<div style="text-align:center; margin-top:10px; font-size:13px; color:var(--rosso-tx);">⚠️ Imposta il tuo salto turno nella pagina Profilo per vedere le evidenziazioni.</div>'}
    </div>
    <div class="card">
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <tr style="color:var(--grigio); font-size:12px;">
          <th style="padding:8px 4px; text-align:left;">Data</th>
          <th style="padding:8px 4px;">☀️ Giorno</th>
          <th style="padding:8px 4px;">🌙 Notte</th>
        </tr>
        ${Array.from({length: new Date(anno, mese + 1, 0).getDate()}, (_, i) => {
          const giorno = i + 1;
          if (Date.UTC(anno, mese, giorno) < primaValida || Date.UTC(anno, mese, giorno) > ultimaValida) return '';
          const cp = coppiaGiorno(anno, mese, giorno);
          const clsG = cp.giorno === mioSalto ? 'background:var(--giallo-bg); color:var(--giallo-tx); font-weight:800;' : '';
          const clsN = cp.notte === mioSalto ? 'background:var(--giallo-bg); color:var(--giallo-tx); font-weight:800;' : '';
          const [gg, sett] = [new Date(anno, mese, giorno).getDate(), ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'][new Date(anno, mese, giorno).getDay()]];
          const dataIso = `${anno}-${String(mese + 1).padStart(2, '0')}-${String(gg).padStart(2, '0')}`;
          const inFerie = ferieGiorno[dataIso] || [];
          const mieFerie = inFerie.some(n => n.startsWith(`${utente.cognome || ''} ${utente.nome || ''}`.trim()));
          const elencoGiorno = inFerie.filter(n => n.includes('☀️') || (!n.includes('☀️') && !n.includes('🌙'))).map(n => n.replace(' (☀️)','').replace(' (🌙)',''));
          const dettaglio = inFerie.length
            ? `<div style="font-size:11px; color:var(--giallo-tx); text-align:left; padding:4px 0 0 28px;">GIORNO: ${elencoGiorno.join(', ') || '—'}<br>NOTTE: ${inFerie.filter(n => n.includes('🌙')).map(n => n.replace(' (🌙)','')).join(', ') || '—'}</div>`
            : '';
          const dicituraFerie = mieFerie ? '<span class="pill" style="font-size:10px; background:#DBEAFE; color:#1E40AF; margin-left:6px;">Ferie</span>' : '';
          const sfondo = mieFerie ? 'background:#DBEAFE;' : '';
          const settCompleto = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'][new Date(anno, mese, giorno).getDay()];
          const miaG = mieFerieId[dataIso + '|giorno'] || mieFerieId[dataIso + '|intera'];
          const miaN = mieFerieId[dataIso + '|notte'] || mieFerieId[dataIso + '|intera'];
          const cellaG = miaG ? 'background:#DBEAFE; color:#1E40AF; font-weight:800; cursor:pointer; border-radius:6px;' : 'cursor:pointer;';
          const cellaN = miaN ? 'background:#DBEAFE; color:#1E40AF; font-weight:800; cursor:pointer; border-radius:6px;' : 'cursor:pointer;';
          return `<tr style="border-top:1px solid var(--bordo); text-align:center; ${sfondo}">
            <td style="text-align:left; padding:8px 4px;"><b>${gg}</b> <span style="color:var(--grigio); font-size:12px;">${settCompleto}</span> ${inFerie.length ? `<span class="pill giallo" style="font-size:10px;">🏖 ${inFerie.length}</span>` : ''}${dettaglio}</td>
            <td data-ferie-g="${dataIso}" style="padding:8px 4px; ${clsG} ${cellaG}" title="Ferie diurna: clicca per toglierla / metterla">${cp.giorno}</td>
            <td data-ferie-n="${dataIso}" style="padding:8px 4px; ${clsN} ${cellaN}" title="Ferie notturna: clicca per toglierla / metterla">${cp.notte}</td>
          </tr>`;
        }).join('')}
      </table>
    </div>
    <p style="color:var(--grigio); font-size:12px; margin-top:10px;">Calendario disponibile dal 01/01/2024 al 31/12/2028. Turno di riposo = salto turno del giorno (☀️) o della notte (🌙). Ferie e permessi: gestione in arrivo con l'app Telegram.</p>`;

  el.querySelectorAll('[data-ferie-g]').forEach(td => td.onclick = () => toggleFerie(td.dataset.ferieG, 'giorno', el, anno, mese));
  el.querySelectorAll('[data-ferie-n]').forEach(td => td.onclick = () => toggleFerie(td.dataset.ferieN, 'notte', el, anno, mese));
  document.getElementById('cal-indietro').onclick = () => {
    let a = anno, m = mese - 1;
    if (m < 0) { m = 11; a--; }
    disegnaCalendario(el, a, m);
  };
  document.getElementById('cal-avanti').onclick = () => {
    let a = anno, m = mese + 1;
    if (m > 11) { m = 0; a++; }
    disegnaCalendario(el, a, m);
  };
}

async function toggleFerie(data, turno, el, anno, mese) {
  const chiave = data + '|' + turno;
  const esistenteId = mieFerieGlobali[chiave] || mieFerieGlobali[data + '|intera'];
  if (esistenteId) {
    await supabase.from('disponibilita').delete().eq('id', esistenteId);
  } else {
    const { error } = await supabase.from('disponibilita').insert({ operatore_id: utente.id, data, tipo: 'ferie', turno_ferie: turno });
    if (error) { alert('Errore: ' + error.message); return; }
  }
  await disegnaCalendario(el, anno, mese);
}

/* ============ PROGRAMMAZIONE MENSILE ============ */

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

const SEZIONI_MODULO = [
  { t: 'DIREZIONE E COMANDO', posti: [
    { n: 1, t: 'Team Leader' }, { n: 2, t: 'Vice Team Leader' }, { n: 3, t: 'Ufficiale di Collegamento' },
    { n: 4, t: 'Staff Comando' }, { n: 5, t: 'Staff' }, { n: 6, t: 'Staff' }
  ]},
  { t: 'VALUTAZIONE E SICUREZZA', posti: [
    { n: 7, t: 'Strutturista', spec: 'strutturista' }, { n: 8, t: 'NBCR', spec: 'nbcr' },
    { n: 9, t: 'Strutturista', spec: 'strutturista' }, { n: 10, t: 'NBCR', spec: 'nbcr' }
  ]},
  { t: 'SOCCORSO — TURNAZIONE 1', posti: [
    { n: 11, t: "Unità cinofila", spec: 'k9' }, { n: 12, t: "Unità cinofila", spec: 'k9' },
    { n: 13, t: 'Tecnico strumentista' }, { n: 14, t: "Unità cinofila", spec: 'k9' },
    { n: 15, t: "Unità cinofila", spec: 'k9' }, { n: 16, t: 'Tecnico strumentista' },
    { n: 17, t: 'ROS (Caposquadra/Caporeparto)', ros: true },
    { n: 18, t: 'Soccorritore tecnico' }, { n: 19, t: 'Soccorritore tecnico' },
    { n: 20, t: 'Soccorritore tecnico' }, { n: 21, t: 'Soccorritore tecnico' },
    { n: 22, t: 'SAF', spec: 'saf' }, { n: 23, t: 'Addetto sicurezza' }, { n: 24, t: 'Sentinella' }
  ]},
  { t: 'SOCCORSO — TURNAZIONE 2', posti: [
    { n: 25, t: 'ROS (Caposquadra/Caporeparto)', ros: true },
    { n: 26, t: 'Soccorritore tecnico' }, { n: 27, t: 'Soccorritore tecnico' },
    { n: 28, t: 'Soccorritore tecnico' }, { n: 29, t: 'Soccorritore tecnico' },
    { n: 30, t: 'SAF', spec: 'saf' }, { n: 31, t: 'Addetto sicurezza' }, { n: 32, t: 'Sentinella' }
  ]},
  { t: 'LOGISTICA', posti: [
    { n: 33, t: 'Responsabile logistica' }, { n: 34, t: 'Vice resp. logistica' },
    { n: 35, t: 'Logista' }, { n: 36, t: 'Logista' }, { n: 37, t: 'Logista' }, { n: 38, t: 'Logista' }
  ]}
];
const TUTTI_POSTI = SEZIONI_MODULO.flatMap(s => s.posti);
const SPEC_DB = { strutturista: 'Strutturista', nbcr: 'NBCR 3° livello', k9: 'Unità cinofila K9', saf: 'SAF 2A (corda)' };

function meseIt(d) {
  const dt = new Date(d + 'T00:00:00');
  return `${MESI[dt.getMonth()]} ${dt.getFullYear()}`;
}

async function pagProgrammazione(el) {
  el.innerHTML = `
    <div class="pagina-titolo">🗓️ Programmazione Mensile</div>
    <div class="pagina-sotto">Manifesto programmato Alpha e Bravo — 38 unità</div>
    <div id="prog-cont">Caricamento…</div>`;
  const cont = document.getElementById('prog-cont');
  const prog = await supabase.from('programmi_mensili').select('*, programmi_membri(*)').order('mese', { ascending: false });

  if (!progMese) {
    const now = new Date();
    cont.innerHTML = `
      <div class="card" style="max-width:520px;">
        <div style="font-weight:700; margin-bottom:14px;">1️⃣ Quale mese vuoi inserire?</div>
        <div style="display:flex; gap:12px;">
          <select id="prog-mese" style="flex:1; height:48px; border:1px solid var(--bordo); border-radius:10px; padding:0 12px; background:#fff;">
            ${Array.from({length: 12}, (_, i) => {
              const d = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
              const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
              return `<option value="${v}">${MESI[d.getMonth()]} ${d.getFullYear()}</option>`;
            }).join('')}
          </select>
          <button class="btn-primary" id="prog-vai" style="width:130px; height:48px;">VAI</button>
        </div>
      </div>
      ${(prog.data || []).length ? `
      <div class="card" style="margin-top:20px;">
        <div style="font-weight:700; margin-bottom:10px;">📅 Programmi esistenti</div>
        ${(prog.data || []).map(p => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--bordo);">
            <div>${meseIt(p.mese)} — <b>${p.team === 'alpha' ? 'ALPHA' : 'BRAVO'}</b> (${p.programmi_membri.length}/38)</div>
            <span style="display:flex; gap:6px;">
              <button class="pill ${p.pubblicato ? 'verde' : 'giallo'}" data-apri="${p.mese}|${p.team}" style="border:none; cursor:pointer;">${p.pubblicato ? '✅ Pubblicato' : '✏️ Bozza'} — Apri</button>
              <button class="pill rosso" data-elimina-prog="${p.id}" style="border:none; cursor:pointer;">🗑</button>
            </span>
          </div>`).join('')}
      </div>` : ''}`;
    document.getElementById('prog-vai').onclick = () => { progMese = document.getElementById('prog-mese').value; renderPagina(); };
    cont.querySelectorAll('[data-apri]').forEach(b => b.onclick = () => {
      const [m, t] = b.dataset.apri.split('|');
      progMese = m; progTeam = t; renderPagina();
    });
    return;
  }

  if (!progTeam) {
    cont.innerHTML = `
      <div class="card" style="max-width:520px;">
        <button class="link" id="prog-indietro" style="padding:0; margin:0 0 14px;">← Cambia mese</button>
        <div style="font-weight:700; margin-bottom:14px;">2️⃣ Squadra per ${meseIt(progMese)}?</div>
        <div style="display:grid; gap:12px;">
          <button class="btn-primary" data-team="alpha" style="height:64px; font-weight:800;">🚨 SQUADRA ALPHA</button>
          <button class="btn-primary" data-team="bravo" style="height:64px; font-weight:800;">🚨 SQUADRA BRAVO</button>
        </div>
      </div>`;
    document.getElementById('prog-indietro').onclick = () => { progMese = null; renderPagina(); };
    cont.querySelectorAll('[data-team]').forEach(b => b.onclick = () => { progTeam = b.dataset.team; renderPagina(); });
    return;
  }

  await apriProgramma(cont, prog.data || []);
}

async function apriProgramma(cont, programmi) {
  cont.innerHTML = 'Caricamento…';
  let prog = programmi.find(p => p.mese === progMese && p.team === progTeam);
  if (!prog) {
    const { data: nuovo, error } = await supabase.from('programmi_mensili')
      .insert({ mese: progMese, team: progTeam }).select('*, programmi_membri(*)').single();
    if (error) { cont.innerHTML = `<div class="card">Errore: ${esc(error.message)}</div>`; return; }
    prog = nuovo;
  }
  progId = prog.id;

  const meseInizio = progMese;
  const [y, mo] = progMese.split('-').map(Number);
  const meseFine = `${y}-${String(mo).padStart(2, '0')}-${String(new Date(y, mo, 0).getDate()).padStart(2, '0')}`;
  const [pers, membri, storico, ferie] = await Promise.all([
    supabase.from('profili').select('id, nome, cognome, patente, grado, comando, estensioni_patente').order('cognome'),
    supabase.from('programmi_membri').select('*, profili(nome, cognome, patente, grado, estensioni_patente)').eq('programma_id', prog.id),
    supabase.from('programmi_membri').select('operatore_id, programmi_mensili!inner(mese)')
      .lt('programmi_mensili.mese', progMese).order('programmi_mensili.mese', { ascending: true }),
    supabase.from('disponibilita').select('operatore_id, data').eq('tipo', 'ferie')
      .gte('data', meseInizio).lte('data', meseFine)
  ]);
  const feriePerOp = {};
  (ferie.data || []).forEach(f => {
    (feriePerOp[f.operatore_id] = feriePerOp[f.operatore_id] || []).push(f.data);
  });
  const tutti = pers.data || [];
  const occupati = new Set((membri.data || []).map(m => m.operatore_id));
  const perPosto = {};
  (membri.data || []).forEach(m => { perPosto[m.posto] = m; });

  const ultimoUso = {};
  (storico.data || []).forEach(r => { if (!ultimoUso[r.operatore_id]) ultimoUso[r.operatore_id] = r.programmi_mensili.mese; });
  const [y1, m1] = progMese.split('-').map(Number);
  const diffMesi = (m) => {
    const [y2, m2] = m.split('-').map(Number);
    return (y1 - y2) * 12 + (m1 - m2);
  };
  const gruppoDi = (opId) => {
    const u = ultimoUso[opId];
    if (!u) return { n: 99, t: 'MAI INSERITI' };
    const d = diffMesi(u);
    if (d === 1) return { n: 1, t: 'IL MESE SCORSO' };
    return { n: d, t: `${d} MESI FA` };
  };

  const idCapi = new Set(SPEC_IDS['Caposquadra/Capireparto'] || []);
  const idSpec = (s) => new Set(SPEC_IDS[SPEC_DB[s]] || []);

  const patenteSigla = (o) => {
    if (!o.patente) return '';
    return ' 🚚' + o.patente + (o.estensioni_patente?.length ? '+' + o.estensioni_patente.map(e => e === 'Autoscala' ? 'AS' : e === 'Autogru' ? 'AG' : e === 'Anfibio' ? 'AN' : e).join('') : '');
  };
  const iconeSpecPdf = (opId) => {
    let icone = '';
    if ((SPEC_IDS['Strutturista'] || []).includes(opId)) icone += ' \u{1F3D7}\u{FE0F}';
    if ((SPEC_IDS['NBCR 3° livello'] || []).includes(opId)) icone += ' \u{2623}\u{FE0F}';
    if ((SPEC_IDS['Unità cinofila K9'] || []).includes(opId)) icone += ' \u{1F415}';
    if ((SPEC_IDS['SAF 2A (corda)'] || []).includes(opId)) icone += ' \u{1F9D7}';
    if ((SPEC_IDS['Caposquadra/Capireparto'] || []).includes(opId)) icone += ' \u{2B50}';
    return icone;
  };
  const iconeSpec = (opId) => {
    let icone = '';
    if ((SPEC_IDS['Strutturista'] || []).includes(opId)) icone += '🏗️';
    if ((SPEC_IDS['NBCR 3° livello'] || []).includes(opId)) icone += '☣️';
    if ((SPEC_IDS['Unità cinofila K9'] || []).includes(opId)) icone += '🐕';
    if ((SPEC_IDS['SAF 2A (corda)'] || []).includes(opId)) icone += '🧗';
    if ((SPEC_IDS['Caposquadra/Capireparto'] || []).includes(opId)) icone += '⭐';
    return icone ? ' ' + icone : '';
  };
  const candidato = (o) => ({
    ...o,
    giorniFerie: (feriePerOp[o.id] || []).length,
    etichetta: `${o.cognome} ${o.nome}`.trim() + iconeSpec(o.id) + patenteSigla(o) + (o.grado ? ` [${o.grado}]` : '') + ((feriePerOp[o.id] || []).length ? ` 🏖 ${(feriePerOp[o.id] || []).length} gg ferie` : ''),
    gruppo: gruppoDi(o.id)
  });

  const compilati = (membri.data || []).length;
  const autisti = (membri.data || []).filter(m => m.profili?.patente);
  const inSquadra = (set) => (membri.data || []).filter(m => set.has(m.operatore_id)).length;
  const nStrutt = inSquadra(new Set(SPEC_IDS['Strutturista'] || []));
  const nNbcr = inSquadra(new Set(SPEC_IDS['NBCR 3° livello'] || []));
  const nK9 = inSquadra(new Set(SPEC_IDS['Unità cinofila K9'] || []));
  const nSaf = inSquadra(new Set(SPEC_IDS['SAF 2A (corda)'] || []));

  cont.innerHTML = `
    <button class="link" id="prog-indietro" style="padding:0; margin-bottom:10px;">← Cambia squadra</button>
    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div>
          <div style="font-size:22px; font-weight:800;">${meseIt(progMese)} — SQUADRA ${progTeam === 'alpha' ? 'ALPHA' : 'BRAVO'}</div>
          <div style="font-size:13px; color:var(--grigio);">${prog.pubblicato ? '✅ Pubblicato' : '✏️ Bozza'} · ${compilati}/38 unità · 🚚 ${autisti.length} autisti</div>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn-primary" id="prog-inserisci-tutti" style="height:44px;">➕ INSERISCI TUTTI</button>
          <button class="btn-primary" id="prog-elimina" style="height:44px; background:var(--rosso);">🗑 ELIMINA PROGRAMMA</button>
          <button class="btn-primary" id="prog-genera-pdf" style="height:44px;">📄 GENERA PDF</button>
          <button class="btn-primary" id="prog-pubblica" style="max-width:210px; height:44px; background:${prog.pubblicato ? 'var(--verde)' : 'var(--rosso)'};">${prog.pubblicato ? 'RIPUBBLICA' : 'PUBBLICA'} SU TELEGRAM</button>
        </div>
      </div>
      <div class="barra" style="margin-top:12px;"><div style="width:${compilati / 38 * 100}%;"></div></div>
      <div style="display:flex; gap:22px; margin-top:14px; flex-wrap:wrap; font-size:13px;">
        <span>🏗️ Strutturisti: <b>${nStrutt}</b></span>
        <span>☣️ NBCR 3°: <b>${nNbcr}</b></span>
        <span>🐕 Unità cinofile: <b>${nK9}</b></span>
        <span>🧗 SAF 2A/Avanzato: <b>${nSaf}</b></span>
        <span>🚚 Autisti: <b>${autisti.length}</b></span>
      </div>
    </div>

    ${SEZIONI_MODULO.map(s => `
      <div class="card" style="margin-bottom:14px;">
        <div style="font-weight:800; font-size:13px; letter-spacing:0.5px; color:var(--grigio); margin-bottom:10px;">${s.t}</div>
        ${s.posti.map(p => {
          const occ = perPosto[p.n];
          const idonei = tutti.filter(o => {
            if (occupati.has(o.id)) return false;
            if (p.spec) return idSpec(p.spec).has(o.id);
            return true;
          }).map(candidato);
          (window.__idoneiPosto = window.__idoneiPosto || {})[p.n] = idonei;
          return `
          <div style="display:flex; gap:10px; align-items:center; padding:7px 0; border-top:1px solid var(--bordo);">
            <span style="width:28px; font-weight:800; color:${p.spec || p.ros ? 'var(--rosso)' : 'var(--grigio)'};">${p.n}</span>
            <span style="flex:1; font-size:14px;">${esc(p.t)}${p.spec || p.ros ? ' <span style="color:var(--rosso); font-size:11px;">● OBBL.</span>' : ''}</span>
            ${occ
              ? `<span style="font-weight:700;">${esc(occ.profili?.cognome)} ${esc(occ.profili?.nome)}${iconeSpec(occ.operatore_id)}${occ.profili?.patente ? ` <span class="pill giallo" style="font-size:10px;">🚚 ${esc(occ.profili.patente)}</span>` : ''}</span>
                 <button class="pill rosso" data-vuota="${occ.id}" style="border:none; cursor:pointer;">✕</button>`
              : `<div style="display:flex; gap:6px; align-items:center; max-width:300px;">
                   <div style="position:relative; flex:1;">
                     <input id="cerca-${p.n}" placeholder="Cerca nome…" autocomplete="off"
                       style="width:100%; height:40px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; font-size:13px;">
                     <div id="lista-${p.n}" data-lista="${p.n}" style="display:none; position:absolute; top:42px; left:0; right:0; background:#fff; border:1px solid var(--bordo); border-radius:10px; box-shadow:0 8px 20px rgba(0,0,0,0.15); z-index:30; max-height:260px; overflow-y:auto;"></div>
                   </div>
                   <button data-x="${p.n}" title="Svuota" style="border:none; background:none; font-size:16px; cursor:pointer; color:var(--rosso);">✕</button>
                 </div>
                 <input type="hidden" id="posto-${p.n}">
                 <button class="btn-primary" data-posto="${p.n}" style="width:90px; height:40px; font-size:13px;">➕</button>`}
          </div>`;
        }).join('')}
      </div>`).join('')}`;

  document.getElementById('prog-indietro').onclick = () => { progTeam = null; progId = null; renderPagina(); };
  const giaSceltiLive = () => {
    const s = new Set();
    cont.querySelectorAll('input[id^="posto-"]').forEach(c => { if (c.value) s.add(c.value); });
    return s;
  };
  cont.querySelectorAll('input[id^="cerca-"]').forEach(inp => {
    const n = inp.id.replace('cerca-', '');
    const lista = document.getElementById(`lista-${n}`);
    const ros = TUTTI_POSTI.find(pp => pp.n === Number(n))?.ros;
    const disegnaLista = () => {
      const q = inp.value.trim().toLowerCase();
      const scelti = giaSceltiLive();
      const idonei = (window.__idoneiPosto[n] || []).filter(o => !scelti.has(o.id));
      const filtrati = idonei.filter(o => !q || o.etichetta.toLowerCase().includes(q));
      if (ros) filtrati.sort((a, b) => (idCapi.has(b.id) - idCapi.has(a.id)) || (b.gruppo.n - a.gruppo.n) || a.etichetta.localeCompare(b.etichetta));
      else filtrati.sort((a, b) => (b.gruppo.n - a.gruppo.n) || a.etichetta.localeCompare(b.etichetta));
      let html = '';
      let ultimoG = null;
      filtrati.forEach(o => {
        if (o.gruppo.t !== ultimoG) {
          const colore = o.gruppo.t === 'MAI INSERITI' ? '#94A3B8' : (o.gruppo.n === 1 ? '#059669' : o.gruppo.n <= 3 ? '#2563EB' : '#F59E0B');
          html += `<div style="padding:5px 10px; font-size:11px; font-weight:700; color:${colore};">${o.gruppo.t}</div>`;
          ultimoG = o.gruppo.t;
        }
        const pref = ros && idCapi.has(o.id) ? '⭐ ' : '';
        html += `<div data-scelta="${o.id}" data-n="${n}" style="padding:8px 10px; font-size:13px; cursor:pointer; border-top:1px solid #F1F5F9;">${pref}${esc(o.etichetta)}</div>`;
      });
      lista.innerHTML = html || '<div style="padding:10px; color:var(--grigio); font-size:13px;">Nessun risultato</div>';
      lista.querySelectorAll('[data-scelta]').forEach(d => {
        d.addEventListener('pointerdown', (ev) => {
          ev.preventDefault();
          document.getElementById(`posto-${n}`).value = d.dataset.scelta;
          inp.value = d.textContent.trim();
          lista.style.display = 'none';
        });
      });
    };
    inp.onfocus = () => { disegnaLista(); lista.style.display = 'block'; };
    inp.oninput = () => { disegnaLista(); lista.style.display = 'block'; };
    inp.onblur = () => setTimeout(() => lista.style.display = 'none', 200);
  });
  const inserisciSelezionati = async () => {
    const avvisi = [];
    const errorePosti = [];
    const doppioniScelti = [];
    let fatti = 0;
    const giaScelti = new Set();
    const celle = Array.from(cont.querySelectorAll('input[id^="posto-"]'));
    for (const cella of celle) {
      const n = Number(cella.id.replace('posto-', ''));
      const opId = cella.value;
      if (!opId) continue;
      if (giaScelti.has(opId)) {
        const op = (pers.data || []).find(p => p.id === opId);
        doppioniScelti.push(`${op?.cognome} ${op?.nome} (posto ${n}): già scelto nel posto ${celle.find(c => c.value === opId)?.id?.replace('posto-','')})`);
        continue;
      }
      giaScelti.add(opId);
      const { error } = await supabase.from('programmi_membri')
        .insert({ programma_id: progId, operatore_id: opId, posto: n });
      if (error) { errorePosti.push(n); continue; }
      cella.value = '';
      const cerca = document.getElementById(`cerca-${n}`);
      if (cerca) cerca.value = '';
      fatti++;
      const gf = (feriePerOp[opId] || []).sort();
      if (gf.length) {
        const op = (pers.data || []).find(p => p.id === opId);
        const fmt = (d) => { const [y, m, g] = d.split('-'); return `${g}/${m}`; };
        avvisi.push(`🏖 ${op?.cognome} ${op?.nome} (posto ${n}): ferie dal ${fmt(gf[0])} al ${fmt(gf[gf.length - 1])}`);
      }
    }
    // doppioni nell'altra squadra dello stesso mese
    const inseriti = (membri.data || []);
    const { data: altroProg } = await supabase.from('programmi_mensili').select('id, team').eq('mese', progMese).neq('team', progTeam).maybeSingle();
    if (altroProg && fatti) {
      const { data: altriMembri } = await supabase.from('programmi_membri').select('operatore_id, profili(cognome, nome)').eq('programma_id', altroProg.id);
      const inAltro = new Set((altriMembri || []).map(m => m.operatore_id));
      for (const m of inseriti) {
        if (inAltro.has(m.operatore_id)) {
          const op = (pers.data || []).find(p => p.id === m.operatore_id);
          avvisi.push(`⚔️ ${op?.cognome} ${op?.nome} è presente anche nell'altra squadra (${altroProg.team === 'alpha' ? 'ALPHA' : 'BRAVO'})`);
        }
      }
    }
    let messaggio = '';
    if (fatti) messaggio += `✅ Inseriti ${fatti} operatori.`;
    if (doppioniScelti.length) messaggio += `\n⚠️ Scelto due volte:\n` + doppioniScelti.join('\n');
    if (errorePosti.length) messaggio += `\n❌ Posti già occupati: ${errorePosti.join(', ')}.`;
    if (avvisi.length) messaggio += `\n` + avvisi.join('\n');
    if (messaggio) alert(messaggio);
    if (fatti || errorePosti.length) renderPagina();
  };
  cont.querySelectorAll('[data-x]').forEach(b => b.onclick = () => {
    const n = b.dataset.x;
    document.getElementById(`cerca-${n}`).value = '';
    document.getElementById(`posto-${n}`).value = '';
  });
  cont.querySelectorAll('[data-x]').forEach(b => b.onclick = () => {
    const n = b.dataset.x;
    document.getElementById(`cerca-${n}`).value = '';
    document.getElementById(`posto-${n}`).value = '';
  });
  cont.querySelectorAll('[data-posto]').forEach(b => b.onclick = inserisciSelezionati);
  const btnTutti = document.getElementById('prog-inserisci-tutti');
  if (btnTutti) btnTutti.onclick = inserisciSelezionati;
  cont.querySelectorAll('[data-vuota]').forEach(b => b.onclick = async () => {
    await supabase.from('programmi_membri').delete().eq('id', b.dataset.vuota);
    renderPagina();
  });
  cont.querySelectorAll('[data-elimina-prog]').forEach(b => b.onclick = async () => {
    if (!confirm('Eliminare questo programma con tutti i nominativi inseriti?')) return;
    await supabase.from('programmi_membri').delete().eq('programma_id', b.dataset.eliminaProg);
    await supabase.from('programmi_mensili').delete().eq('id', b.dataset.eliminaProg);
    renderPagina();
  });
  const btnElimina = document.getElementById('prog-elimina');
  if (btnElimina) btnElimina.onclick = async () => {
    if (!confirm('Eliminare il programma ' + meseIt(progMese) + ' ' + (progTeam === 'alpha' ? 'ALPHA' : 'BRAVO') + ' con tutti i nominativi?')) return;
    await supabase.from('programmi_membri').delete().eq('programma_id', progId);
    await supabase.from('programmi_mensili').delete().eq('id', progId);
    progMese = null; progTeam = null; progId = null;
    renderPagina();
  };
  document.getElementById('prog-pubblica').onclick = async () => {
    await supabase.from('programmi_mensili').update({ pubblicato: true }).eq('id', prog.id);
    alert('Programma pubblicato (invio Telegram con il bot).');
    renderPagina();
  };
  document.getElementById('prog-genera-pdf').onclick = () => generaPdfManifesto(prog, membri.data || []);
}

function generaPdfManifesto(prog, membri) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const perPosto = {};
  membri.forEach(m => {
    perPosto[m.posto] = `${(m.profili?.cognome || '').toUpperCase()} ${(m.profili?.nome || '').toUpperCase()}`.trim();
  });
  const team = prog.team === 'alpha' ? 'TEAM ALPHA' : 'TEAM BRAVO';

  const BIANCO = [255,255,255];
  const BLU_SCURO = [30,64,120];
  const BLU = [219,234,254];
  const CELESTE = [240,247,255];
  const GIALLO = [254,249,195];
  const ROSSO = [254,226,226];
  const GRIGIO_TX = [71,85,105];
  const ANTRACITE = [30,41,59];

  function box(x, y, w, h, n, ruolo, nome, sfondo, stile) {
    doc.setFillColor(...sfondo);
    doc.setDrawColor(148,163,184);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(178,34,34);
    doc.text(String(n), x + 2.5, y + 4);
    doc.setFontSize(7);
    doc.setTextColor(...GRIGIO_TX);
    doc.text(ruolo.toUpperCase(), x + 2.5, y + 8);
    doc.setFontSize(9.5);
    if (stile === 'capo') { doc.setTextColor(...BLU_SCURO); } else { doc.setTextColor(...ANTRACITE); }
    doc.text(nome || '—', x + 2.5, y + 13.5);
    if (!nome) { doc.setTextColor(148,163,184); }
  }

  function sezioneBg(y1, y2, colore) {
    doc.setFillColor(...colore);
    doc.rect(12, y1, 186, y2 - y1, 'F');
  }
  function titoloSezione(y, testo) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...ANTRACITE);
    doc.text(testo, 15, y);
  }

  // ===== INTESTAZIONE =====
  doc.addImage('/App-Usar-Veneto/assets/logo-usar.jpg', 'JPEG', 14, 10, 16, 16);
  doc.addImage('/App-Usar-Veneto/assets/logo-usar.jpg', 'JPEG', 180, 10, 16, 16);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...ANTRACITE);
  doc.text(team, 105, 17, { align: 'center' });
  doc.setFontSize(13); doc.setTextColor(37,99,235);
  doc.text(meseIt(progMese).toUpperCase(), 105, 24, { align: 'center' });
  doc.setDrawColor(178,34,34); doc.setLineWidth(0.6); doc.line(12, 29, 198, 29);

  let y = 34;

  // ===== DIREZIONE E COMANDO (sfondo blu) =====
  sezioneBg(y, y + 34, BLU);
  titoloSezione(y + 5, 'DIREZIONE E COMANDO');
  box(15, y + 8, 55, 18, 1, 'Team Leader', perPosto[1], BLU_SCURO, 'capo');
  doc.setTextColor(255,255,255);
  // nomi bianchi nel box capo: riscrivo
  doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(255,255,255);
  doc.text(perPosto[1] || '—', 17.5, y + 21.5);
  box(74, y + 8, 40, 18, 2, 'Vice Team Leader', perPosto[2], BIANCO, 'capo');
  box(117, y + 8, 36, 18, 3, 'Uff. di Collegamento', perPosto[3], BIANCO, 'capo');
  box(156, y + 8, 28, 18, 4, 'Staff Comando', perPosto[4], CELESTE, null);
  box(15, y + 8 + 20, 40, 18, 5, 'Staff', perPosto[5], CELESTE, null);
  box(58, y + 8 + 20, 40, 18, 6, 'Staff', perPosto[6], CELESTE, null);
  y += 38;

  // ===== VALUTAZIONE E SICUREZZA (sfondo giallo) =====
  sezioneBg(y, y + 30, GIALLO);
  titoloSezione(y + 5, 'VALUTAZIONE E SICUREZZA');
  const wV = 43;
  [[7,'Strutturista'],[8,'NBCR'],[9,'Strutturista'],[10,'NBCR']].forEach(([n, r], i) => {
    box(15 + i * (wV + 2.5), y + 8, wV, 18, n, r, perPosto[n], BIANCO, null);
  });
  y += 34;

  // ===== OPERAZIONI (sfondo rosso): RICERCA + SOCCORSO =====
  sezioneBg(y, y + 96, ROSSO);
  titoloSezione(y + 5, 'OPERAZIONI');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...GRIGIO_TX);
  doc.text('RICERCA', 15, y + 10);
  // Ricerca: 2 colonne da 3
  const colR1 = [[11,'Unit\u00e0 Cinofila'],[12,'Unit\u00e0 Cinofila'],[13,'Tecnico Strum.']];
  const colR2 = [[14,'Unit\u00e0 Cinofila'],[15,'Unit\u00e0 Cinofila'],[16,'Tecnico Strum.']];
  colR1.forEach(([n, r], i) => box(15, y + 12 + i * 20, 85, 18, n, r, perPosto[n], BIANCO, null));
  colR2.forEach(([n, r], i) => box(104, y + 12 + i * 20, 85, 18, n, r, perPosto[n], BIANCO, null));
  const colS1 = [[17,'ROS'],[18,'Socc. Tecnico'],[19,'Socc. Tecnico'],[20,'Socc. Tecnico'],[21,'Socc. Tecnico'],[22,'SAF'],[23,'Add. Sicurezza'],[24,'Sentinella']];
  const colS2 = [[25,'ROS'],[26,'Socc. Tecnico'],[27,'Socc. Tecnico'],[28,'Socc. Tecnico'],[29,'Socc. Tecnico'],[30,'SAF'],[31,'Add. Sicurezza'],[32,'Sentinella']];
  // due pagine: colonne lunghe -> le turnazioni in righe compatte sotto Ricerca
  y += 96;

  // SOCCORSO: righe compatte a 4 box (2 pagine se serve)
  sezioneBg(y - 2, y + 46, ROSSO);
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...ANTRACITE);
  doc.text('SOCCORSO — TURNAZIONE 1', 15, y + 5);
  const wS = 43;
  colS1.forEach(([n, r], i) => {
    const xx = 15 + (i % 4) * (wS + 2.5);
    const yy = y + 8 + Math.floor(i / 4) * 20;
    box(xx, yy, wS, 18, n, r, perPosto[n], BIANCO, null);
  });
  y += 50;
  sezioneBg(y - 2, y + 46, ROSSO);
  doc.text('SOCCORSO — TURNAZIONE 2', 15, y + 5);
  colS2.forEach(([n, r], i) => {
    const xx = 15 + (i % 4) * (wS + 2.5);
    const yy = y + 8 + Math.floor(i / 4) * 20;
    box(xx, yy, wS, 18, n, r, perPosto[n], BIANCO, null);
  });
  y += 50;

  // ===== LOGISTICA (sfondo giallo) =====
  sezioneBg(y, y + 46, GIALLO);
  titoloSezione(y + 5, 'LOGISTICA');
  box(15, y + 8, 55, 18, 33, 'Resp. Logistica', perPosto[33], BIANCO, null);
  box(73, y + 8, 55, 18, 34, 'Vice Resp. Log.', perPosto[34], BIANCO, null);
  [35,36,37,38].forEach((n, i) => {
    box(15 + i * 46, y + 28, 44, 15, n, 'Logista', perPosto[n], BIANCO, null);
  });
  y += 50;

  doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(148,163,184);
  doc.text(`Generato il ${new Date().toLocaleString('it-IT')} — Nucleo USAR Veneto`, 105, y, { align: 'center' });

  doc.save(`manifesto-${prog.team}-${progMese}.pdf`);
}

function pagAttivazione(el) {
  el.innerHTML = `
    <div class="pagina-titolo">🚨 Attivazione Emergenza</div>
    <div class="pagina-sotto">Seleziona il team da allertare</div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; max-width:600px;">
      <button class="btn-primary" style="height:80px; font-size:18px; font-weight:800;">🚨 ATTIVA ALPHA</button>
      <button class="btn-primary" style="height:80px; font-size:18px; font-weight:800;">🚨 ATTIVA BRAVO</button>
    </div>
    <div class="card" style="margin-top:20px; max-width:600px;">
      <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--grigio); margin-bottom:6px;">Messaggio di emergenza (modificabile)</div>
      <textarea id="msg" rows="4" style="width:100%; border:1.5px solid var(--grigio-ch); border-radius:10px; padding:12px; font-family:inherit; font-size:14px;">🚨 ATTIVAZIONE TEAM — Emergenza USAR. Ritrovo: Centrale VVF Mestre. Confermare la propria disponibilità.</textarea>
      <button class="btn-primary" style="margin-top:12px;">📡 INVIA ALLERTA</button>
    </div>
    <p style="color:var(--grigio); font-size:12px; margin-top:12px;">L'invio reale richiede il bot Telegram configurato (in sviluppo).</p>`;
}

/* ============ MANTENIMENTI ============ */

async function pagMantenimenti(el) {
  el.innerHTML = `
    <div class="pagina-titolo">🎓 Mantenimenti</div>
    <div class="pagina-sotto">Registro ore e validazione</div>
    <div id="man-cont">Caricamento…</div>`;
  const anno = new Date().getFullYear();
  const [impo, tutti] = await Promise.all([
    supabase.from('impostazioni').select('valore').eq('chiave', 'soglia_ore_mantenimenti').single(),
    supabase.from('mantenimenti').select('*, profili(nome, cognome)').order('data', { ascending: false })
  ]);
  const soglia = Number(impo?.data?.valore) || 36;
  const cont = document.getElementById('man-cont');

  const miei = (tutti.data || []).filter(m => m.operatore_id === utente.id);
  const approvatiAnno = miei.filter(m => m.stato === 'approvato' && String(m.data).startsWith(anno));
  const totOre = approvatiAnno.reduce((s, m) => s + Number(m.ore), 0);
  const inVal = miei.filter(m => m.stato === 'in_validazione');
  const rifiutati = miei.filter(m => m.stato === 'rifiutato');
  const storico = miei.filter(m => m.stato === 'approvato');
  const coda = utente.ruolo === 'admin'
    ? (tutti.data || []).filter(m => m.stato === 'in_validazione')
    : [];

  const pct = Math.min(100, Math.round(totOre / soglia * 100));
  const coloreStato = totOre >= soglia ? 'var(--verde)' : (totOre >= soglia / 2 ? 'var(--ambra)' : 'var(--rosso)');

  cont.innerHTML = `
    ${utente.ruolo === 'admin' ? `
      <div class="card" style="margin-bottom:24px; border-left:4px solid var(--ambra);">
        <div style="font-weight:700; margin-bottom:12px;">⏳ Coda di validazione (${coda.length})</div>
        ${coda.length === 0 ? '<div style="color:var(--grigio); font-size:14px;">Nessun mantenimento da validare.</div>' : `
          <div id="coda-lista">${coda.map(m => rigaCoda(m)).join('')}</div>`}
      </div>` : ''}

      <div class="card" style="margin-bottom:24px;">
        <div style="font-weight:700; margin-bottom:6px;">➕ Aggiungi ore mantenimento</div>
        <div style="font-size:12px; color:var(--grigio); margin-bottom:16px;">Ogni inserimento richiede l'approvazione dell'admin.</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; max-width:700px;">
          <div>
            <label style="font-size:12px; font-weight:600; color:var(--grigio);">Cognome, Nome</label>
            <input value="${esc(utente.cognome)} ${esc(utente.nome)}" disabled
              style="width:100%; height:44px; background:var(--bg-input); border:1px solid var(--bordo); border-radius:10px; padding:0 12px;">
          </div>
          <div>
            <label style="font-size:12px; font-weight:600; color:var(--grigio);">Data mantenimento *</label>
            <input id="f-data" type="date" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 12px;">
          </div>
          <div>
            <label style="font-size:12px; font-weight:600; color:var(--grigio);">Tipo mantenimento *</label>
            <select id="f-tipo" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 12px; background:#fff;">
              <option value="">— Seleziona —</option>
              ${TIPI_MAN.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:12px; font-weight:600; color:var(--grigio);">Ore prestate *</label>
            <input id="f-ore" type="number" min="0.5" step="0.5" placeholder="es. 4" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 12px;">
          </div>
          <div style="grid-column:1 / -1;">
            <label style="font-size:12px; font-weight:600; color:var(--grigio);">Argomento / Attività svolta *</label>
            <input id="f-argomento" type="text" placeholder="es. taglio e puntellazione" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 12px;">
          </div>
        </div>
        <div class="errore" id="f-err" style="margin-top:14px;"></div>
        <button class="btn-primary" id="f-salva" style="max-width:220px; height:46px; margin-top:14px;">SALVA</button>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px;">
          <div style="font-weight:700;">Ore valide ${anno}</div>
          <div style="font-weight:800; font-size:22px; color:${coloreStato};">${totOre} / ${soglia} h</div>
        </div>
        <div class="barra"><div style="width:${pct}%; background:${coloreStato};"></div></div>
        ${totOre < soglia ? `<div style="font-size:12px; color:var(--rosso-tx); margin-top:6px;">⚠️ Sotto soglia: mancano ${soglia - totOre} ore.</div>` : `<div style="font-size:12px; color:var(--verde-tx); margin-top:6px;">✅ Soglia raggiunta.</div>`}
      </div>

      ${inVal.length ? `
      <div class="card" style="margin-bottom:24px; border-left:4px solid var(--ambra);">
        <div style="font-weight:700; margin-bottom:12px;">⏳ In validazione (${inVal.length})</div>
        ${inVal.map(m => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--bordo);">
            <div>
              <div style="font-weight:600;">${esc(m.tipo)} — ${Number(m.ore)} h</div>
              <div style="font-size:13px; color:var(--grigio);">${fmtData(m.data)} · ${esc(m.argomento)}</div>
            </div>
            <button class="pill rosso" data-del="${m.id}" style="border:none;">🗑 Elimina</button>
          </div>`).join('')}
      </div>` : ''}

      ${rifiutati.length ? `
      <div class="card" style="margin-bottom:24px; border-left:4px solid var(--rosso);">
        <div style="font-weight:700; margin-bottom:12px;">❌ Rifiutati (${rifiutati.length})</div>
        ${rifiutati.map(m => `
          <div style="padding:10px 0; border-bottom:1px solid var(--bordo);">
            <div style="font-weight:600;">${esc(m.tipo)} — ${Number(m.ore)} h · ${fmtData(m.data)}</div>
            <div style="font-size:13px; color:var(--grigio);">${esc(m.argomento)}</div>
            ${m.note_rifiuto ? `<div style="font-size:13px; color:var(--rosso-tx); margin-top:4px;">💬 Nota admin: ${esc(m.note_rifiuto)}</div>` : ''}
          </div>`).join('')}
      </div>` : ''}

      <div class="card">
        <div style="font-weight:700; margin-bottom:12px;">✅ Approvati — storico (${storico.length})</div>
        ${storico.length === 0 ? '<div style="color:var(--grigio); font-size:14px;">Nessun mantenimento approvato.</div>' : `
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <tr style="text-align:left; color:var(--grigio); font-size:12px;">
              <th style="padding:8px 0;">Data</th><th>Tipo</th><th>Argomento</th><th style="text-align:right;">Ore</th>
            </tr>
            ${storico.map(m => `
              <tr style="border-top:1px solid var(--bordo);">
                <td style="padding:8px 0;">${fmtData(m.data)}</td>
                <td>${esc(m.tipo)}</td>
                <td>${esc(m.argomento)}</td>
                <td style="text-align:right; font-weight:700;">${Number(m.ore)}</td>
              </tr>`).join('')}
          </table>`}
      </div>`;

  document.getElementById('f-salva').onclick = salvaMantenimento;
  cont.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('Eliminare questo mantenimento?')) return;
    await supabase.from('mantenimenti').delete().eq('id', b.dataset.del);
    pagMantenimenti(el);
  });
  cont.querySelectorAll('[data-approva]').forEach(b => b.onclick = async () => {
    await supabase.from('mantenimenti').update({
      stato: 'approvato', validato_da: utente.id, validato_il: new Date().toISOString(), note_rifiuto: null
    }).eq('id', b.dataset.approva);
    pagMantenimenti(el);
  });
  cont.querySelectorAll('[data-rifiuta]').forEach(b => b.onclick = () => {
    const id = b.dataset.rifiuta;
    const riga = document.getElementById(`coda-${id}`);
    riga.innerHTML = `
      <div style="padding:12px 0;">
        <div style="font-size:13px; color:var(--grigio); margin-bottom:8px;">Motivo del rifiuto (facoltativo — visibile all'operatore):</div>
        <textarea id="nota-${id}" rows="2" style="width:100%; border:1.5px solid var(--grigio-ch); border-radius:10px; padding:10px; font-family:inherit;"></textarea>
        <div style="display:flex; gap:10px; margin-top:10px;">
          <button class="btn-primary" data-conferma="${id}" style="max-width:180px; height:44px; background:var(--rosso);">CONFERMA RIFIUTO</button>
          <button class="pill" data-annulla style="border:1px solid var(--bordo); background:#fff;">Annulla</button>
        </div>
      </div>`;
    riga.querySelector('[data-annulla]').onclick = () => {
      riga.innerHTML = rigaCoda(tutti.data.find(m => m.id == id));
      pagMantenimenti(el);
    };
    riga.querySelector('[data-conferma]').onclick = async () => {
      const nota = document.getElementById(`nota-${id}`).value.trim();
      await supabase.from('mantenimenti').update({
        stato: 'rifiutato', validato_da: utente.id, validato_il: new Date().toISOString(), note_rifiuto: nota || null
      }).eq('id', id);
      pagMantenimenti(el);
    };
  });
}

function rigaCoda(m) {
  return `
    <div id="coda-${m.id}" style="padding:10px 0; border-bottom:1px solid var(--bordo);">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <div>
          <div style="font-weight:600;">${esc(m.profili?.cognome)} ${esc(m.profili?.nome)}</div>
          <div style="font-size:13px; color:var(--grigio);">${fmtData(m.data)} · ${esc(m.tipo)} · ${Number(m.ore)} h — ${esc(m.argomento)}</div>
        </div>
        <div style="display:flex; gap:8px; flex-shrink:0;">
          <button class="pill verde" data-approva="${m.id}" style="border:none;">✅ Approva</button>
          <button class="pill rosso" data-rifiuta="${m.id}" style="border:none;">❌ Rifiuta</button>
        </div>
      </div>
    </div>`;
}

async function salvaMantenimento() {
  const campi = { data: 'f-data', tipo: 'f-tipo', ore: 'f-ore', argomento: 'f-argomento' };
  const valori = {};
  const mancanti = [];
  for (const [k, id] of Object.entries(campi)) {
    const el = document.getElementById(id);
    el.style.borderColor = 'var(--bordo)';
    valori[k] = el.value.trim();
    if (!valori[k]) mancanti.push(id);
  }
  const err = document.getElementById('f-err');
  if (mancanti.length) {
    mancanti.forEach(id => document.getElementById(id).style.borderColor = 'var(--rosso)');
    err.style.display = 'block';
    err.textContent = 'Compila tutti i campi evidenziati.';
    return;
  }
  if (Number(valori.ore) <= 0) {
    err.style.display = 'block';
    err.textContent = 'Le ore devono essere maggiori di zero.';
    return;
  }
  const { error } = await supabase.from('mantenimenti').insert({
    operatore_id: utente.id,
    data: valori.data,
    tipo: valori.tipo,
    argomento: valori.argomento,
    ore: Number(valori.ore),
    stato: 'in_validazione'
  });
  if (error) {
    err.style.display = 'block';
    err.textContent = 'Errore del database: ' + error.message;
    return;
  }
  pagMantenimenti(document.getElementById('contenuto'));
}

function pagProfilo(el) {
  const TURNI = ['A', 'B', 'C', 'D'];
  const SALTI = [];
  for (const t of TURNI) for (let n = 1; n <= 8; n++) SALTI.push(t + n);
  el.innerHTML = `
    <div class="pagina-titolo">👤 Profilo</div>
    <div class="pagina-sotto">${esc(utente.email)} — ruolo: ${esc(utente.ruolo)}</div>
    <div class="card" style="max-width:600px; margin-bottom:20px;">
      <div style="font-weight:700; margin-bottom:14px;">📌 Dati di servizio</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Turno</label>
          <select id="p-turno" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
            <option value="">—</option>
            ${TURNI.map(t => `<option ${utente.turno === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Salto turno</label>
          <select id="p-salto" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
            <option value="">—</option>
            ${SALTI.map(s => `<option ${utente.salto_turno === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Comando</label>
          <select id="p-comando" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
            <option value="">—</option>
            ${['Venezia','Verona','Padova','Vicenza','Treviso','Belluno','Rovigo'].map(c => `<option ${utente.comando === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Sede di servizio</label>
          <input id="p-sede" value="${esc(utente.sede || '')}" placeholder="es. Mestre" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px;">
        </div>
      </div>
      <div class="successo" id="p-ok" style="margin-top:14px;">Dati salvati.</div>
      <button class="btn-primary" id="p-salva" style="max-width:200px; height:46px; margin-top:14px;">SALVA</button>
    </div>
    <div class="card" style="max-width:600px;">
      <div style="font-weight:700; margin-bottom:10px;">🤖 Collega Telegram</div>
      <p style="font-size:14px; color:var(--grigio);">Apri il bot su Telegram, premi AVVIA e invia il codice che compare qui sotto.</p>
      <div id="tg-box" style="margin-top:16px; text-align:center;">
        <button class="btn-primary" id="gen-codice" style="max-width:280px;">Genera codice di collegamento</button>
      </div>
    </div>`;
  document.getElementById('p-ok').style.display = 'none';
  document.getElementById('p-salva').onclick = async () => {
    const { error } = await supabase.from('profili').update({
      turno: document.getElementById('p-turno').value,
      salto_turno: document.getElementById('p-salto').value,
      comando: document.getElementById('p-comando').value,
      sede: document.getElementById('p-sede').value.trim()
    }).eq('id', utente.id);
    if (error) { alert('Errore: ' + error.message); return; }
    utente.turno = document.getElementById('p-turno').value;
    utente.salto_turno = document.getElementById('p-salto').value;
    utente.comando = document.getElementById('p-comando').value;
    utente.sede = document.getElementById('p-sede').value.trim();
    document.getElementById('p-ok').style.display = 'block';
    setTimeout(() => document.getElementById('p-ok').style.display = 'none', 2500);
  };
  document.getElementById('gen-codice').onclick = async () => {
    const n = String(Math.floor(1000 + Math.random() * 9000));
    const codice = `${n.slice(0,2)}-${n.slice(2)}`;
    const scade = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await supabase.from('codici_telegram').insert({ operatore_id: utente.id, codice, scade_il: scade });
    document.getElementById('tg-box').innerHTML = `
      <div style="font-size:40px; font-weight:800; color:var(--royal); letter-spacing:3px;">${codice}</div>
      <p style="font-size:12px; color:var(--grigio);">Scade tra 15 minuti — invialo al bot su Telegram</p>`;
  };
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/App-Usar-Veneto/sw.js').then(reg => {
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) location.reload();
      });
    });
  }).catch(() => {});
}
init();
