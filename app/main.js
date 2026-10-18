import { supabase, isConfigured } from './supabase.js';

const app = document.getElementById('app');

let utente = null;
let pagina = 'dashboard';

function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function iniziali(nome, cognome) {
  return ((nome?.[0] || '') + (cognome?.[0] || '')).toUpperCase() || '?';
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
            VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY<br><br>
            L'app funziona intanto in <b>modalità dimostrativa</b>.
          </div>
          <button class="btn-primary" id="demo">Entra in modalità demo</button>
        </div>
      </div>`;
    document.getElementById('demo').onclick = () => { utente = { email: 'demo@usarveneto.it', ruolo: 'admin' }; render(); };
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    utente = session.user;
    const { data } = await supabase.from('profili').select('ruolo').eq('id', utente.id).single();
    utente.ruolo = data?.ruolo || 'operatore';
    render();
  } else {
    renderLogin();
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
        <div class="campo"><input id="email" type="email" placeholder="nome@esempio.it" autocomplete="username"></div>
        <div class="campo">
          <input id="pw" type="password" placeholder="Password" autocomplete="current-password">
          <button class="toggle-pw" id="toggle">👁</button>
        </div>
        <button class="btn-primary" id="accedi">ACCEDI</button>
        <button class="link" id="reset">Password dimenticata?</button>
      </div>
    </div>`;

  document.getElementById('toggle').onclick = () => {
    const pw = document.getElementById('pw');
    pw.type = pw.type === 'password' ? 'text' : 'password';
  };
  document.getElementById('accedi').onclick = accedi;
  document.getElementById('pw').onkeydown = e => { if (e.key === 'Enter') accedi(); };
  document.getElementById('reset').onclick = async () => {
    const email = document.getElementById('email').value;
    if (!email) return mostraErrore('Inserisci la tua email');
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    mostraErrore(error ? error.message : 'Email di recupero inviata');
  };
}

function mostraErrore(msg) {
  const err = document.getElementById('err');
  err.style.display = 'block';
  err.textContent = msg;
}

async function accedi() {
  const email = document.getElementById('email').value.trim();
  const pw = document.getElementById('pw').value;
  if (!email || !pw) return mostraErrore('Inserisci email e password');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
  if (error) return mostraErrore('Credenziali non valide');
  utente = data.user;
  const { data: prof } = await supabase.from('profili').select('ruolo').eq('id', utente.id).single();
  utente.ruolo = prof?.ruolo || 'operatore';
  render();
}

function render() {
  const menu = [
    { id: 'dashboard', ic: '🏠', t: 'Dashboard' },
    { id: 'operatori', ic: '👥', t: 'Operatori', admin: true },
    { id: 'squadre', ic: '⚔️', t: 'Squadre', admin: true },
    { id: 'calendario', ic: '📅', t: 'Calendario' },
    { id: 'attivazione', ic: '🚨', t: 'Attivazione', admin: true },
    { id: 'addestramento', ic: '🎓', t: 'Addestramento' },
    { id: 'internazionale', ic: '🌍', t: 'Internazionale' },
    { id: 'report', ic: '📊', t: 'Report', admin: true },
  ];
  const voci = menu.filter(v => !v.admin || utente.ruolo === 'admin');

  app.innerHTML = `
    <div class="layout">
      <div class="sidebar">
        <div class="brand"><img src="assets/logo-usar.jpg" alt="USAR"> USAR Veneto</div>
        <div class="menu">
          ${voci.map(v => `<button class="voce ${v.id === pagina ? 'attiva' : ''}" data-p="${v.id}">${v.ic} ${v.t}</button>`).join('')}
          <div class="separatore"></div>
          <button class="voce" data-p="profilo">👤 Profilo</button>
          <button class="voce" id="logout">🚪 Esci</button>
        </div>
      </div>
      <div class="contenuto" id="contenuto"></div>
    </div>
    <div class="mobile-nav">
      ${voci.slice(0, 3).map(v => `<button data-p="${v.id}"><span class="ic">${v.ic}</span>${v.t}</button>`).join('')}
    </div>`;

  app.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { pagina = b.dataset.p; render(); });
  document.getElementById('logout').onclick = esci;
  renderPagina();
}

async function esci() {
  if (supabase) await supabase.auth.signOut();
  utente = null;
  renderLogin();
}

function renderPagina() {
  const c = document.getElementById('contenuto');
  switch (pagina) {
    case 'dashboard': return pagDashboard(c);
    case 'operatori': return pagOperatori(c);
    case 'attivazione': return pagAttivazione(c);
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
    <div class="card">Benvenuto, ${esc(utente.email)}. Le card dei team Alpha/Bravo e l'attivazione rapida saranno sviluppate con il database collegato.</div>`;
}

async function pagOperatori(el) {
  el.innerHTML = `<div class="pagina-titolo">👥 Gestione Operatori</div><div class="pagina-sotto">Caricamento…</div>`;
  if (!supabase) {
    el.innerHTML += `<div class="card">Modalità demo: connettere Supabase per l'elenco operatori reale.</div>`;
    return;
  }
  const { data: operatori, error } = await supabase.from('profili').select('*').order('cognome');
  if (error) {
    el.innerHTML += `<div class="card">Errore: ${esc(error.message)}. Verificare che le tabelle siano state create.</div>`;
    return;
  }
  el.innerHTML += `
    <div class="grid" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:20px;">
      ${operatori.map(o => `
        <div class="card" style="border-left:4px solid var(--royal);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div class="avatar" style="width:56px;height:56px;font-size:18px;">${esc(iniziali(o.nome, o.cognome))}</div>
            <span class="pill verde">🟢 Attivo</span>
          </div>
          <div style="font-size:18px; font-weight:700;">${esc(o.cognome)} ${esc(o.nome)}</div>
          <div style="font-size:14px; color:var(--grigio);">${esc(o.ruolo || 'operatore')}</div>
        </div>`).join('')}
    </div>`;
}

function pagAttivazione(el) {
  el.innerHTML = `
    <div class="pagina-titolo">🚨 Attivazione emergenza</div>
    <div class="pagina-sotto">Seleziona il team da allertare</div>
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; max-width:600px;">
      <button class="btn-primary" style="height:80px; font-size:18px; font-weight:800;">🚨 ATTIVA ALPHA</button>
      <button class="btn-primary" style="height:80px; font-size:18px; font-weight:800; background:var(--arancio); box-shadow:0 10px 15px -3px rgba(234,88,12,0.4);">🚨 ATTIVA BRAVO</button>
    </div>
    <div class="card" style="margin-top:20px; max-width:600px;">
      <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--grigio); margin-bottom:6px;">Messaggio di emergenza (modificabile)</div>
      <textarea id="msg" rows="4" style="width:100%; border:1.5px solid var(--grigio-ch); border-radius:10px; padding:12px; font-family:inherit; font-size:14px;">🚨 ATTIVAZIONE TEAM ALPHA — Emergenza USAR. Ritrovo: Centrale VVF Mestre. Confermare la propria disponibilità.</textarea>
      <button class="btn-primary" style="margin-top:12px; background:var(--rosso); box-shadow:0 10px 15px -3px rgba(220,38,38,0.4);">📡 INVIA ALLERTA</button>
    </div>
    <p style="color:var(--grigio); font-size:12px; margin-top:12px;">L'invio reale richiede il bot Telegram configurato (in sviluppo).</p>`;
}

function pagProfilo(el) {
  el.innerHTML = `
    <div class="pagina-titolo">👤 Profilo</div>
    <div class="pagina-sotto">${esc(utente.email)} — ruolo: ${esc(utente.ruolo)}</div>
    <div class="card" style="max-width:600px;">
      <div style="font-weight:700; margin-bottom:10px;">🤖 Collega Telegram</div>
      <p style="font-size:14px; color:var(--grigio);">Apri il bot su Telegram, premi AVVIA e invia il codice che compare qui sotto.</p>
      <div id="tg-box" style="margin-top:16px; text-align:center;">
        <button class="btn-primary" id="gen-codice" style="max-width:280px;">Genera codice di collegamento</button>
      </div>
    </div>`;
  document.getElementById('gen-codice').onclick = () => {
    const n = String(Math.floor(1000 + Math.random() * 9000));
    const codice = `${n.slice(0,2)}-${n.slice(2)}`;
    document.getElementById('tg-box').innerHTML = `
      <div style="font-size:40px; font-weight:800; color:var(--royal); letter-spacing:3px;">${codice}</div>
      <p style="font-size:12px; color:var(--grigio);">Scade tra 15 minuti</p>`;
  };
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

init();
