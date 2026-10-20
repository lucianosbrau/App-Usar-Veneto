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
    { id: 'squadre', ic: '⚔️', t: 'Squadre', admin: true },
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
    <div class="mobile-nav">
      ${voci.slice(0, 4).map(v => `<button data-p="${v.id}" class="${pagina === v.id ? 'attiva' : ''}"><span class="ic">${v.ic}</span>${v.t}</button>`).join('')}
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
        <button class="menu-mobile-voce" data-p="dashboard"><span>🏠</span> Dashboard</button>
        <button class="menu-mobile-voce" data-esci><span>🚪</span> Esci</button>
      </div>
    </div>`;
  app.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { pagina = b.dataset.p; render(); });
  document.getElementById('logout').onclick = esci;
  const overlay = document.getElementById('overlay');
  const menuMobile = document.getElementById('menu-mobile');
  const apriMenu = () => { overlay.classList.add('aperto'); menuMobile.classList.add('aperto'); };
  const chiudiMenu = () => { overlay.classList.remove('aperto'); menuMobile.classList.remove('aperto'); };
  document.getElementById('menu-btn').onclick = apriMenu;
  document.getElementById('chiudi-menu').onclick = chiudiMenu;
  overlay.onclick = chiudiMenu;
  menuMobile.querySelectorAll('[data-esci]').forEach(b => b.onclick = async () => { chiudiMenu(); await esci(); });
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

/* ============ PROGRAMMAZIONE MENSILE ============ */

const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
const RUOLI_MODULO = [
  { id: 'strutturista', t: 'Strutturista', ic: '🏗️', imp: 'modulo_strutturisti' },
  { id: 'nbcr', t: 'NBCR 3° livello', ic: '☣️', imp: 'modulo_nbcr' },
  { id: 'k9', t: 'Unità cinofila K9', ic: '🐕', imp: 'modulo_k9' },
  { id: 'caposquadra', t: 'Caposquadra', ic: '⛑️', imp: 'modulo_capisquadra' },
  { id: 'saf', t: 'SAF 2A', ic: '🧗', imp: 'modulo_saf' },
  { id: 'generico', t: 'Personale generico', ic: '👤' }
];

function meseIt(d) {
  const dt = new Date(d + 'T00:00:00');
  return `${MESI[dt.getMonth()]} ${dt.getFullYear()}`;
}

async function pagProgrammazione(el) {
  el.innerHTML = `
    <div class="pagina-titolo">🗓️ Programmazione mensile</div>
    <div class="pagina-sotto">Composizione dei manifesti Alpha e Bravo del mese successivo</div>
    <div id="prog-cont">Caricamento…</div>`;
  const cont = document.getElementById('prog-cont');

  const [imp, prog] = await Promise.all([
    supabase.from('impostazioni').select('chiave, valore'),
    supabase.from('programmi_mensili').select('*, programmi_membri(*)').order('mese', { ascending: false })
  ]);
  const impostazioni = Object.fromEntries((imp.data || []).map(r => [r.chiave, r.valore]));

  if (!progMese && !progTeam) {
    const now = new Date();
    const prossimo = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const valoreMese = `${prossimo.getFullYear()}-${String(prossimo.getMonth() + 1).padStart(2, '0')}-01`;
    cont.innerHTML = `
      <div class="card" style="max-width:520px;">
        <div style="font-weight:700; margin-bottom:14px;">1️⃣ Quale mese vuoi programmare?</div>
        <div style="display:flex; gap:12px;">
          <select id="prog-mese" style="flex:1; height:48px; border:1px solid var(--bordo); border-radius:10px; padding:0 12px; background:#fff;">
            ${Array.from({length: 12}, (_, i) => {
              const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
              const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
              return `<option value="${v}" ${i === 1 ? 'selected' : ''}>${MESI[d.getMonth()]} ${d.getFullYear()}</option>`;
            }).join('')}
          </select>
          <button class="btn-primary" id="prog-vai" style="width:130px; height:48px;">VAI</button>
        </div>
        ${statoMese(valoreMese, prog.data || [])}
      </div>
      ${(prog.data || []).length ? `
      <div class="card" style="margin-top:20px;">
        <div style="font-weight:700; margin-bottom:10px;">📅 Programmi esistenti</div>
        ${(prog.data || []).map(p => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--bordo);">
            <div>${meseIt(p.mese)} — <b>${p.team === 'alpha' ? 'ALPHA' : 'BRAVO'}</b> (${p.programmi_membri.length} nom.)</div>
            <button class="pill ${p.pubblicato ? 'verde' : 'giallo'}" data-apri="${p.mese}|${p.team}" style="border:none; cursor:pointer;">${p.pubblicato ? '✅ Pubblicato' : '✏️ Bozza'} — Apri</button>
          </div>`).join('')}
      </div>` : ''}`;
    const selMese = document.getElementById('prog-mese');
    cont.querySelector('[data-stato-mese]').outerHTML = '';
    document.getElementById('prog-vai').onclick = () => { progMese = selMese.value; renderPagina(); };
    cont.querySelectorAll('[data-apri]').forEach(b => b.onclick = () => {
      const [m, t] = b.dataset.apri.split('|');
      progMese = m; progTeam = t;
      renderPagina();
    });
    return;
  }

  if (progMese && !progTeam) {
    cont.innerHTML = `
      <div class="card" style="max-width:520px;">
        <button class="link" id="prog-indietro" style="padding:0; margin:0 0 14px;">← Cambia mese</button>
        <div style="font-weight:700; margin-bottom:14px;">2️⃣ Quale squadra vuoi programmare per ${meseIt(progMese)}?</div>
        <div style="display:grid; gap:12px;">
          <button class="btn-primary" data-team="alpha" style="height:64px; font-size:16px; font-weight:800;">🚨 SQUADRA ALPHA</button>
          <button class="btn-primary" data-team="bravo" style="height:64px; font-size:16px; font-weight:800;">🚨 SQUADRA BRAVO</button>
        </div>
        ${statoMese(progMese, prog.data || [])}
      </div>`;
    document.getElementById('prog-indietro').onclick = () => { progMese = null; renderPagina(); };
    cont.querySelectorAll('[data-team]').forEach(b => b.onclick = () => { progTeam = b.dataset.team; renderPagina(); });
    return;
  }

  await apriProgramma(cont, impostazioni, prog.data || []);
}

function statoMese(mese, programmi) {
  const existing = programmi.filter(p => p.mese === mese);
  return `<div data-stato-mese style="margin-top:14px; font-size:13px; color:var(--grigio);">
    ${existing.length ? existing.map(p => `${p.team === 'alpha' ? 'ALPHA' : 'BRAVO'}: ${p.pubblicato ? 'pubblicato' : 'bozza'} (${p.programmi_membri.length})`).join(' · ') : 'Nessun programma per questo mese.'}
  </div>`;
}

async function apriProgramma(cont, impostazioni, programmi) {
  cont.innerHTML = 'Caricamento…';
  let prog = programmi.find(p => p.mese === progMese && p.team === progTeam);
  if (!prog) {
    const { data: nuovo, error } = await supabase.from('programmi_mensili')
      .insert({ mese: progMese, team: progTeam }).select('*, programmi_membri(*)').single();
    if (error) { cont.innerHTML = `<div class="card">Errore: ${esc(error.message)}</div>`; return; }
    prog = nuovo;
  }
  progId = prog.id;

  const [pers, membri] = await Promise.all([
    supabase.from('profili').select('id, nome, cognome, patente'),
    supabase.from('programmi_membri').select('*, profili(nome, cognome, patente)').eq('programma_id', prog.id)
  ]);
  const tutti = pers.data || [];
  const lista = membri.data || [];

  const storico = await supabase.from('programmi_membri')
    .select('operatore_id, programmi_mensili!inner(mese)')
    .lt('programmi_mensili.mese', progMese)
    .order('programmi_mensili.mese', { ascending: true });

  const ultimoUso = {};
  (storico.data || []).forEach(r => {
    if (!ultimoUso[r.operatore_id]) ultimoUso[r.operatore_id] = r.programmi_mensili.mese;
  });

  const diffMesi = (m) => {
    const [y1, m1] = progMese.split('-').map(Number);
    const [y2, m2] = m.split('-').map(Number);
    return (y1 - y2) * 12 + (m1 - m2);
  };

  const gruppoDi = (opId) => {
    const u = ultimoUso[opId];
    if (!u) return { n: 99, t: 'MAI INSERITI' };
    const d = diffMesi(u);
    if (d >= 6) return { n: d, t: `${d} MESI FA` };
    if (d === 1) return { n: 1, t: 'IL MESE SCORSO' };
    return { n: d, t: `${d} MESI FA` };
  };

  const costruttore = (op) => ({
    ...op,
    etichetta: `${op.cognome} ${op.nome}`.trim(),
    gruppo: gruppoDi(op.id)
  });

  const totReq = Number(impostazioni.modulo_totale) || 38;
  const conteggi = RUOLI_MODULO.map(r => ({
    ...r,
    n: lista.filter(m => m.ruolo === r.id).length,
    req: r.imp ? (Number(impostazioni[r.imp]) || 0) : null
  }));
  const nGenerici = lista.filter(m => m.ruolo === 'generico').length;
  const autisti = lista.filter(m => m.profili?.patente);
  const totale = lista.length;

  cont.innerHTML = `
    <button class="link" id="prog-indietro" style="padding:0; margin-bottom:10px;">← Cambia squadra</button>
    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div>
          <div style="font-size:22px; font-weight:800;">${meseIt(progMese)} — SQUADRA ${progTeam === 'alpha' ? 'ALPHA' : 'BRAVO'}</div>
          <div style="font-size:13px; color:var(--grigio);">${prog.pubblicato ? '✅ Pubblicato su Telegram' : '✏️ Bozza — l\'admin può sempre modificare'} · ${totale}/${totReq} unità</div>
        </div>
        <button class="btn-primary" id="prog-pubblica" style="max-width:200px; height:44px; background:${prog.pubblicato ? 'var(--verde)' : 'var(--rosso)'};">${prog.pubblicato ? 'RIPUBBLICA' : 'PUBBLICA'} SU TELEGRAM</button>
      </div>
      <div class="barra" style="margin-top:12px;"><div style="width:${Math.min(100, totale / totReq * 100)}%;"></div></div>
    </div>

    ${conteggi.map(r => `
      <div class="card" style="margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div style="font-weight:700;">${r.ic} ${r.t}</div>
          <div style="font-weight:800; ${r.req && r.n < r.req ? 'color:var(--rosso);' : 'color:var(--verde-tx);'}">
            ${r.n}${r.req ? `/${r.req}` : ''}
          </div>
        </div>
        <div style="display:flex; gap:10px; margin-bottom:10px;">
          <select id="sel-${r.id}" style="flex:1; height:46px; border:1px solid var(--bordo); border-radius:10px; padding:0 12px; background:#fff;">
            ${opzioniPer(r, tutti, lista, costruttore, impostazioni)}
          </select>
          <button class="btn-primary" data-add="${r.id}" style="width:120px; height:46px;">➕ AGGIUNGI</button>
        </div>
        ${lista.filter(m => m.ruolo === r.id).map(m => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-top:1px solid var(--bordo);">
            <div>• ${esc(m.profili?.cognome)} ${esc(m.profili?.nome)} ${m.profili?.patente ? `<span class="pill giallo" style="font-size:10px;">🚚 ${esc(m.profili.patente)}</span>` : ''}</div>
            <button class="pill rosso" data-rimuovi="${m.id}" style="border:none; cursor:pointer;">✕</button>
          </div>`).join('')}
      </div>`).join('')}

    <div class="card" style="border-left:4px solid var(--verde);">
      <div style="font-weight:700; margin-bottom:6px;">🚚 Autisti nella squadra</div>
      <div style="font-size:14px;">${autisti.length} — ${autisti.map(a => `${esc(a.profili?.cognome)} (${esc(a.profili?.patente)})`).join(', ') || 'Nessuno con patente indicata'}</div>
      <div style="font-size:12px; color:var(--grigio); margin-top:6px;">La patente si imposta nel profilo dell'operatore (campo «patente», es. C, C+E, D).</div>
    </div>`;

  document.getElementById('prog-indietro').onclick = () => { progTeam = null; progId = null; renderPagina(); };
  cont.querySelectorAll('[data-add]').forEach(b => b.onclick = () => aggiungiMembro(b.dataset.add));
  cont.querySelectorAll('[data-rimuovi]').forEach(b => b.onclick = async () => {
    await supabase.from('programmi_membri').delete().eq('id', b.dataset.rimuovi);
    renderPagina();
  });
  document.getElementById('prog-pubblica').onclick = async () => {
    await supabase.from('programmi_mensili').update({ pubblicato: true }).eq('id', prog.id);
    alert('Programma pubblicato (l\'invio Telegram verrà attivato con il bot).');
    renderPagina();
  };
}

function opzioniPer(ruolo, tutti, lista, costr, impostazioni) {
  const giaDentro = new Set(lista.map(m => m.operatore_id));
  const specMap = { strutturista: 'Strutturista', nbcr: 'NBCR 3° livello', k9: 'Unità cinofila K9', caposquadra: 'Caposquadra/Capireparto', saf: 'SAF 2A (corda)' };
  const idSpecializzati = SPEC_IDS[specMap[ruolo.id]] || [];
  const SPEC_MODULO = ['Strutturista', 'Unità cinofila K9', 'NBCR 3° livello', 'SAF 2A (corda)'];
  const conSpecModulo = new Set(SPEC_MODULO.flatMap(n => SPEC_IDS[n] || []));
  const nCapiInSquadra = lista.filter(m => m.ruolo === 'caposquadra').length;
  const minCapi = Number(impostazioni.modulo_capisquadra) || 2;
  const capiEccedenti = nCapiInSquadra >= minCapi
    ? (SPEC_IDS['Caposquadra/Capireparto'] || []).filter(id =>
        lista.some(m => m.operatore_id === id && m.ruolo === 'caposquadra') &&
        !lista.some(m => m.operatore_id === id && m.ruolo === 'generico'))
    : [];
  const idonei = tutti.filter(o => {
    if (ruolo.id === 'generico') {
      return !conSpecModulo.has(o.id) || capiEccedenti.includes(o.id);
    }
    return idSpecializzati.includes(o.id);
  });
  const ordinati = idonei
    .map(costr)
    .filter(o => !giaDentro.has(o.id))
    .sort((a, b) => b.gruppo.n - a.gruppo.n || a.etichetta.localeCompare(b.etichetta));
  const gruppiVisibili = {};
  ordinati.forEach(o => { gruppiVisibili[o.gruppo.t] = (gruppiVisibili[o.gruppo.t] || 0) + 1; });
  let html = '<option value="">— Scegli operatore —</option>';
  let ultimoGruppo = null;
  ordinati.forEach(o => {
    if (o.gruppo.t !== ultimoGruppo) {
      const colore = o.gruppo.t === 'MAI INSERITI' ? '#94A3B8' : (o.gruppo.n === 1 ? '#059669' : o.gruppo.n <= 3 ? '#2563EB' : '#F59E0B');
      html += `<option disabled style="color:${colore}; font-weight:700;">── ${o.gruppo.t} ──</option>`;
      ultimoGruppo = o.gruppo.t;
    }
    html += `<option value="${o.id}">${o.etichetta}</option>`;
  });
  return html;
}

async function aggiungiMembro(ruolo) {
  const sel = document.getElementById(`sel-${ruolo}`);
  if (!sel.value) { alert('Scegli prima un operatore dalla tendina.'); return; }
  const { error } = await supabase.from('programmi_membri').insert({
    programma_id: progId, operatore_id: sel.value, ruolo
  });
  if (error) { alert(error.message.includes('duplicate') ? 'Operatore già inserito in questo programma.' : error.message); return; }
  renderPagina();
}

function pagAttivazione(el) {
  el.innerHTML = `
    <div class="pagina-titolo">🚨 Attivazione emergenza</div>
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
