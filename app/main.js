import { supabase, isConfigured } from './supabase.js';

const app = document.getElementById('app');
let utente = null;
let pagina = 'dashboard';
let progMese = null;
let progTeam = null;
let progId = null;
let SPEC_IDS = {};

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
    default:
      c.innerHTML = `<div class="pagina-titolo">${esc(pagina)}</div><div class="pagina-sotto">Pagina in costruzione</div>
        <div class="card">Questa sezione sarà sviluppata nei prossimi passi.</div>`;
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
  const nomiMesi = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const primaValida = Date.UTC(2024, 0, 1), ultimaValida = Date.UTC(2028, 11, 31);

  el.innerHTML = `
    <div class="pagina-titolo">📅 Calendario</div>
    <div class="pagina-sotto">Turni e salti turno — il tuo salto è evidenziato in giallo</div>
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
          return `<tr style="border-top:1px solid var(--bordo); text-align:center;">
            <td style="text-align:left; padding:8px 4px;"><b>${gg}</b> <span style="color:var(--grigio); font-size:12px;">${sett}</span></td>
            <td style="padding:8px 4px; ${clsG}">${cp.giorno}</td>
            <td style="padding:8px 4px; ${clsN}">${cp.notte}</td>
          </tr>`;
        }).join('')}
      </table>
    </div>
    <p style="color:var(--grigio); font-size:12px; margin-top:10px;">Calendario disponibile dal 01/01/2024 al 31/12/2028. Turno di riposo = salto turno del giorno (☀️) o della notte (🌙). Ferie e permessi: gestione in arrivo con l'app Telegram.</p>`;

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
    <div class="pagina-sotto">Manifesto programmato Alpha e Bravo — 38 posti</div>
    <div id="prog-cont">Caricamento…</div>`;
  const cont = document.getElementById('prog-cont');
  const prog = await supabase.from('programmi_mensili').select('*, programmi_membri(*)').order('mese', { ascending: false });

  if (!progMese) {
    const now = new Date();
    cont.innerHTML = `
      <div class="card" style="max-width:520px;">
        <div style="font-weight:700; margin-bottom:14px;">1️⃣ Quale mese?</div>
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
            <button class="pill ${p.pubblicato ? 'verde' : 'giallo'}" data-apri="${p.mese}|${p.team}" style="border:none; cursor:pointer;">${p.pubblicato ? '✅ Pubblicato' : '✏️ Bozza'} — Apri</button>
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
    supabase.from('profili').select('id, nome, cognome, patente, grado, comando').order('cognome'),
    supabase.from('programmi_membri').select('*, profili(nome, cognome, patente, grado)').eq('programma_id', prog.id),
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

  const candidato = (o) => ({
    ...o,
    giorniFerie: (feriePerOp[o.id] || []).length,
    etichetta: `${o.cognome} ${o.nome}`.trim() + (o.patente ? ` 🚚${o.patente}` : '') + (o.grado ? ` [${o.grado}]` : '') + ((feriePerOp[o.id] || []).length ? ` 🏖 ${(feriePerOp[o.id] || []).length} gg ferie` : ''),
    gruppo: gruppoDi(o.id)
  });

  const compilati = (membri.data || []).length;
  const autisti = (membri.data || []).filter(m => m.profili?.patente);

  cont.innerHTML = `
    <button class="link" id="prog-indietro" style="padding:0; margin-bottom:10px;">← Cambia squadra</button>
    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div>
          <div style="font-size:22px; font-weight:800;">${meseIt(progMese)} — SQUADRA ${progTeam === 'alpha' ? 'ALPHA' : 'BRAVO'}</div>
          <div style="font-size:13px; color:var(--grigio);">${prog.pubblicato ? '✅ Pubblicato' : '✏️ Bozza'} · ${compilati}/38 posti · 🚚 ${autisti.length} autisti</div>
        </div>
        <button class="btn-primary" id="prog-pubblica" style="max-width:210px; height:44px; background:${prog.pubblicato ? 'var(--verde)' : 'var(--rosso)'};">${prog.pubblicato ? 'RIPUBBLICA' : 'PUBBLICA'} SU TELEGRAM</button>
      </div>
      <div class="barra" style="margin-top:12px;"><div style="width:${compilati / 38 * 100}%;"></div></div>
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
          if (p.ros) idonei.sort((a, b) => (idCapi.has(b.id) - idCapi.has(a.id)) || (b.gruppo.n - a.gruppo.n) || a.etichetta.localeCompare(b.etichetta));
          else idonei.sort((a, b) => (b.gruppo.n - a.gruppo.n) || a.etichetta.localeCompare(b.etichetta));
          let opzioni = `<option value="">— Scegli —</option>`;
          let ultimoG = null;
          idonei.forEach(o => {
            const prefisso = p.ros ? (idCapi.has(o.id) ? '⭐ ' : '') : '';
            if (o.gruppo.t !== ultimoG) {
              const colore = o.gruppo.t === 'MAI INSERITI' ? '#94A3B8' : (o.gruppo.n === 1 ? '#059669' : o.gruppo.n <= 3 ? '#2563EB' : '#F59E0B');
              opzioni += `<option disabled style="color:${colore}; font-weight:700;">── ${o.gruppo.t} ──</option>`;
              ultimoG = o.gruppo.t;
            }
            opzioni += `<option value="${o.id}">${prefisso}${o.etichetta}</option>`;
          });
          return `
          <div style="display:flex; gap:10px; align-items:center; padding:7px 0; border-top:1px solid var(--bordo);">
            <span style="width:28px; font-weight:800; color:${p.spec || p.ros ? 'var(--rosso)' : 'var(--grigio)'};">${p.n}</span>
            <span style="flex:1; font-size:14px;">${esc(p.t)}${p.spec || p.ros ? ' <span style="color:var(--rosso); font-size:11px;">● OBBL.</span>' : ''}</span>
            ${occ
              ? `<span style="font-weight:700;">${esc(occ.profili?.cognome)} ${esc(occ.profili?.nome)}${occ.profili?.patente ? ` <span class="pill giallo" style="font-size:10px;">🚚 ${esc(occ.profili.patente)}</span>` : ''}</span>
                 <button class="pill rosso" data-vuota="${occ.id}" style="border:none; cursor:pointer;">✕</button>`
              : `<select id="posto-${p.n}" style="max-width:220px; height:40px; border:1px solid var(--bordo); border-radius:10px; padding:0 8px; background:#fff; font-size:13px;">${opzioni}</select>
                 <button class="btn-primary" data-posto="${p.n}" style="width:90px; height:40px; font-size:13px;">➕</button>`}
          </div>`;
        }).join('')}
      </div>`).join('')}`;

  document.getElementById('prog-indietro').onclick = () => { progTeam = null; progId = null; renderPagina(); };
  cont.querySelectorAll('[data-posto]').forEach(b => b.onclick = async () => {
    const sel = document.getElementById(`posto-${b.dataset.posto}`);
    if (!sel.value) { alert('Scegli prima un operatore.'); return; }
    const { error } = await supabase.from('programmi_membri').insert({ programma_id: progId, operatore_id: sel.value, posto: Number(b.dataset.posto) });
    if (error) { alert('Posto già occupato.'); return; }
    const gf = (feriePerOp[sel.value] || []).sort();
    if (gf.length) {
      const op = (pers.data || []).find(p => p.id === sel.value);
      const fmt = (d) => { const [y, m, g] = d.split('-'); return `${g}/${m}`; };
      alert(`⚠️ Attenzione: ${op?.cognome} ${op?.nome} è in ferie dal ${fmt(gf[0])} al ${fmt(gf[gf.length - 1])} (${gf.length} giorni).`);
    }
    renderPagina();
  });
  cont.querySelectorAll('[data-vuota]').forEach(b => b.onclick = async () => {
    await supabase.from('programmi_membri').delete().eq('id', b.dataset.vuota);
    renderPagina();
  });
  document.getElementById('prog-pubblica').onclick = async () => {
    await supabase.from('programmi_mensili').update({ pubblicato: true }).eq('id', prog.id);
    alert('Programma pubblicato (invio Telegram con il bot).');
    renderPagina();
  };
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
  document.getElementById('gen-codice').onclick = () => {
    const n = String(Math.floor(1000 + Math.random() * 9000));
    const codice = `${n.slice(0,2)}-${n.slice(2)}`;
    document.getElementById('tg-box').innerHTML = `
      <div style="font-size:40px; font-weight:800; color:var(--royal); letter-spacing:3px;">${codice}</div>
      <p style="font-size:12px; color:var(--grigio);">Scade tra 15 minuti</p>`;
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
