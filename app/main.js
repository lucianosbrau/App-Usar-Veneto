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

const TIPI_MAN = ['Mantenimento', 'Manovra', 'Intervento', 'Lavorazione', 'Manutenzione e magazzino', 'Tutor Mantenimento', 'Tutor Corso', 'Altra formazione'];

function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

const GRADI_VIGILE = {
  D: 'grigio', VD: 'grigio', IA: 'grigio',
  CRE: 'rosso', CR: 'rosso', CSE: 'rosso', CS: 'rosso',
  VC: 'nero', VE: 'nero', VF: 'nero'
};

// selezione touch-safe: distingue il TAP dallo SCROLL (il dito si muove > 8px = scroll, nessuna selezione)
function selezioneTouch(elLista, selettore, onChoose) {
  elLista.querySelectorAll(selettore).forEach(d => {
    let startX = 0, startY = 0, startEl = null;
    d.addEventListener('pointerdown', (ev) => {
      startX = ev.clientX; startY = ev.clientY; startEl = d;
      ev.preventDefault();
    });
    d.addEventListener('pointerup', (ev) => {
      if (!startEl) return;
      const dx = Math.abs(ev.clientX - startX), dy = Math.abs(ev.clientY - startY);
      startEl = null;
      if (dx < 8 && dy < 8) onChoose(d, ev);
    });
  });
}

function simboloVigile(o, px) {
  const tipo = GRADI_VIGILE[o?.grado];
  if (!tipo) return '';
  const titoli = { grigio: 'Vigile (D, VD, IA)', rosso: 'Capo (CRE, CR, CSE, CS)', nero: 'Vigile scelto (VC, VE, VF)' };
  return `<img src="assets/vigile-${tipo}.png" alt="${esc(o.grado)}" title="${esc(o.grado)} — ${titoli[tipo]}" style="width:${px}px; height:${px}px; vertical-align:-3px; margin-left:6px; margin-right:2px;">`;
}

window.addEventListener('popstate', async () => {
  const st = history.state || {};
  const h = location.hash.replace(/^#\/?/, '');
  const paginaDaHash = h.split('/')[0] || 'dashboard';
  if (paginaDaHash !== pagina) { pagina = paginaDaHash; }
  if (pagina === 'operatori') {
    const c = document.getElementById('contenuto');
    if (st.scheda && !/\/#\/?operatori\/?$/.test(location.hash)) {
      const { data: o } = await supabase.from('profili').select('*').eq('id', st.scheda).limit(1).maybeSingle();
      const ore = await caricaOreMantenimenti();
      if (o) { schedaOperatore(c, o, ore); return; }
    }
    await pagOperatori(c);
    return;
  }
  if (!h && pagina !== 'dashboard') { pagina = 'dashboard'; }
  render();
});


// ============ SPECIALIZZAZIONI (nuovo schema sp_*) ============
const SPEC_SIGLE = { funzionario: 'FUNZ', staff: 'STAFF', logista: 'LOG', strutturista: 'STRUT', k9: 'K9', sapr: 'SAPR', medico: 'MED', infermiere: 'INF' };
function specIcone(o, conTesto) {
  let out = '';
  if (o.sp_strutturista) out += ' 🏗️';
  if (o.sp_nbcr >= 2) out += ` ☣️${o.sp_nbcr}`;
  if (o.sp_k9) out += ' 🐕';
  if (o.sp_saf) out += ' 🧗';
  if (o.sp_staff) out += ' 📝';
  if (o.sp_logista) out += ' 🚜';
  if (o.sp_funzionario) out += ' 💼';
  if (o.tas === 2) out += ' 🧭';
  if (o.sapr) out += ' 🛸';
  if (o.sp_medico) out += ' ⚕️';
  if (o.sp_infermiere) out += ' 💉';
  if (conTesto) {
    const nomi = [];
    if (o.sp_strutturista) nomi.push('Strutturista');
    if (o.sp_nbcr >= 2) nomi.push(`NBCR ${o.sp_nbcr}`);
    if (o.sp_k9) nomi.push('Unità cinofila K9');
    if (o.sp_saf) nomi.push(`SAF ${o.sp_saf}`);
    if (o.sp_staff) nomi.push('Staff');
    if (o.sp_logista) nomi.push('Logista');
    if (o.sp_funzionario) nomi.push('Funzionario');
    if (o.tas === 2) nomi.push('TAS 2');
    if (o.sapr) nomi.push('SAPR');
    if (o.sp_medico) nomi.push('Medico');
    if (o.sp_infermiere) nomi.push('Infermiere');
    return { icone: out, nomi };
  }
  return out;
}

function iniziali(nome, cognome) {
  return ((nome?.[0] || '') + (cognome?.[0] || '')).toUpperCase() || '?';
}
const cacheUrlFoto = {};
async function avatarHtml(o, px, fontPx) {
  let u = null;
  if (o?.foto_path) {
    const c = cacheUrlFoto[o.foto_path];
    if (c && c.scadenza > Date.now() + 60000) {
      u = c.url;
    } else {
      const { data } = await supabase.storage.from('foto-profili').createSignedUrl(o.foto_path, 3600);
      if (data?.signedUrl) {
        cacheUrlFoto[o.foto_path] = { url: data.signedUrl, scadenza: Date.now() + 3600 * 1000 };
        u = data.signedUrl;
      }
    }
  }
  if (u) return `<div class="avatar" style="width:${px}px;height:${px}px; background:#fff; overflow:hidden;"><img src="${u}" alt="" style="width:100%;height:100%;object-fit:cover;"></div>`;
  return `<div class="avatar" style="width:${px}px;height:${px}px;font-size:${fontPx || Math.round(px / 3)}px;">${esc(iniziali(o?.nome, o?.cognome))}</div>`;
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
    const h = location.hash.replace(/^#\/?/, '');
    if (h) pagina = h;
    history.replaceState({ pagina }, '', '#/' + pagina);
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
  utente.foto_path = prof.foto_path;
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
        <form id="login-form" autocomplete="on">
          <div class="campo"><input id="email" name="email" type="email" placeholder="nome.cognome@vigilfuoco.it" autocomplete="username" autocapitalize="off"></div>
          <div class="campo">
            <input id="pw" name="password" type="password" placeholder="Password" autocomplete="current-password">
            <button type="button" class="toggle-pw" id="toggle">👁</button>
          </div>
          <button type="submit" class="btn-primary" id="accedi">ACCEDI</button>
        </form>
        <button class="link" id="registrati">Primo accesso? Registrati</button>
        <button class="link" id="reset">Password dimenticata?</button>
      </div>
    </div>`;
  document.getElementById('toggle').onclick = () => {
    const pw = document.getElementById('pw');
    pw.type = pw.type === 'password' ? 'text' : 'password';
  };
  document.getElementById('login-form').onsubmit = (e) => { e.preventDefault(); accedi(); };
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
        <div class="campo"><input id="email" name="email" type="email" placeholder="nome.cognome@vigilfuoco.it" autocomplete="email" autocapitalize="off"></div>
        <div class="campo">
          <input id="pw" type="password" placeholder="Password (minimo 6 caratteri)" autocomplete="new-password">
          <button class="toggle-pw" id="toggle">👁</button>
        </div>
        <div style="display:flex; align-items:flex-start; gap:8px; margin:4px 0 8px; text-align:left;">
          <input type="checkbox" id="privacy-ok" style="margin-top:3px; width:16px; height:16px;">
          <label for="privacy-ok" style="font-size:12px; color:#475569; line-height:1.5;">
            Ho letto l'<a href="https://lucianosbrau.github.io/App-Usar-Veneto/informativa-privacy.html" target="_blank" style="color:var(--rosso); font-weight:600;">informativa privacy</a>
            e accetto il trattamento dei miei dati come descritto
          </label>
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
  if (!document.getElementById('privacy-ok').checked) return mostraErrore('Devi accettare l\'informativa privacy per registrarti');
  // AVVISO: email non presente nelle schede importate → profilazione vuota
  const { data: esiste } = await supabase.from('profili').select('id').eq('email', email).limit(1);
  if (!esiste || !esiste.length) {
    if (!confirm('Attenzione: questa email NON risulta nell\'elenco del nucleo.\nSe hai un\'altra email (quella data all\'amministrazione), ANNULLA e usa quella: troverai il tuo profilo già compilato.\n\nVuoi continuere comunque con questa email (profilo da compilare a mano)?')) return;
  }
  const { data, error } = await supabase.auth.signUp({
    email, password: pw,
    options: { data: { nome, cognome } }
  });
  if (error) return mostraErrore(error.message);
  if (!data.session) {
    mostraSuccesso('Registrazione riuscita: conferma l\'email ricevuta, poi torna qui ad accedere.');
  } else {
    await caricaUtente(data.user);
    // COLLEGAMENTO SCHEDA IMPORTATA: se esiste una scheda "in attesa" con questa email,
    // l'account appena creato ne prende il posto (aggiorna l'id della riga)
    const { data: scheda } = await supabase.from('profili').select('id').eq('email', email).limit(2);
    const inAttesa = (scheda || []).find(x => x.id !== utente.id);
    if (inAttesa) {
      const { error: errLink } = await supabase.rpc('collega_scheda_importata', { profilo_vecchio: inAttesa.id, utente_nuovo: utente.id });
      if (!errLink) {
        await caricaUtente(data.user);
        alert('✅ Benvenuto! Il tuo profilo è stato caricato: dati, specializzazioni e storico mantenimenti sono già al loro posto.');
      }
    }
    await supabase.from('profili').update({ privacy_consenso_il: new Date().toISOString() }).eq('id', utente.id);
    utente.privacy_consenso_il = new Date().toISOString();
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

function pushStato() {
  const h = '#/' + pagina;
  if (location.hash !== h) history.pushState({ pagina }, '', h);
}

function sincronizzaDaHash() {
  const h = location.hash.replace(/^#\/?/, '');
  if (h && h !== pagina) { pagina = h; render(); }
}

function render() {
  pushStato();
  const menu = [
    { id: 'dashboard', ic: '🏠', t: 'Dashboard' },
    { id: 'operatori', ic: '👥', t: 'Operatori', admin: true },
    { id: 'squadre', ic: '⚔️', t: 'Squadre' },
    { id: 'calendario', ic: '📅', t: 'Calendario' },
    { id: 'attivazione', ic: '🚨', t: 'Attivazione' },
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
          <span style="font-size:10px; opacity:0.7;">v. 24/10/2026</span>
        </div>
      </div>
      <div class="contenuto" id="contenuto"></div>
    </div>
    <div class="mobile-nav" id="mobile-nav">
      ${(utente.ruolo === 'admin'
        ? [['dashboard','🏠','Dashboard'], ['squadre','⚔️','Squadre'], ['programmazione','🗓️','Programmazione'], ['attivazione','🚨','Attivazione']]
        : [['attivazione','🚨','Attivazione'], ['calendario','📅','Calendario'], ['squadre','⚔️','Squadre'], ['mantenimenti','🎓','Mantenimenti']]
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
        ${nomeCompleto} — ${utente.ruolo === 'admin' ? 'Amministratore' : 'Operatore'} — v. 24/10/2026
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
    case 'squadre': return pagSquadre(c);
    default: {
      const TITOLI = { internazionale: 'Internazionale', report: 'Report e Statistiche' };
      c.innerHTML = `<div class="pagina-titolo">${TITOLI[pagina] || esc(pagina)}</div><div class="pagina-sotto">Pagina in costruzione</div>
        <div class="card">Questa sezione sarà sviluppata nei prossimi passi.</div>`;
    }
  }
}

async function pagDashboard(el) {
  el.innerHTML = `
    <div class="pagina-titolo">Dashboard</div>
    <div class="pagina-sotto">Panoramica operativa — ${new Date().toLocaleDateString('it-IT')}</div>
    <div id="dash-cont">Caricamento…</div>`;
  const cont = document.getElementById('dash-cont');
  const anno = new Date().getFullYear();
  const [prof, mant] = await Promise.all([
    supabase.from('profili').select('id, cognome, nome, comando, turno, ruolo, tpss, tas, patente').order('cognome'),
    supabase.from('mantenimenti').select('operatore_id, stato, ore, data').eq('stato', 'approvato')
  ]);
  const tutti = prof.data || [];
  const approvati = mant.data || [];
  const orePerOp = {};
  approvati.forEach(m => {
    if (!String(m.data).startsWith(anno)) return;
    orePerOp[m.operatore_id] = (orePerOp[m.operatore_id] || 0) + Number(m.ore);
  });
  const soglia = 24;
  const inLinea = tutti.filter(o => (orePerOp[o.id] || 0) >= soglia).length;
  const sottoSoglia = tutti.filter(o => (orePerOp[o.id] || 0) < soglia).length;

  // grafici a torta
  const perComando = {};
  tutti.forEach(o => { const c = o.comando || 'Non impostato'; perComando[c] = (perComando[c] || 0) + 1; });
  const perTurno = {};
  tutti.forEach(o => { const t = (o.turno || '?')[0] || '?'; perTurno[t] = (perTurno[t] || 0) + 1; });
  const PALETTE = ['#B22222', '#2563EB', '#059669', '#F59E0B', '#7C3AED', '#0D9488', '#94A3B8', '#EA580C'];
  const torta = (dati, id) => {
    const tot = Object.values(dati).reduce((s, v) => s + v, 0) || 1;
    let angolo = -90;
    const fette = Object.entries(dati).map(([k, v], i) => {
      const perc = v / tot;
      const a1 = angolo, a2 = angolo + perc * 360;
      angolo = a2;
      return { k, v, col: PALETTE[i % PALETTE.length], a1, a2, perc };
    });
    const etichetta = (f) => {
      if (f.perc < 0.04) return '';
      const am = (f.a1 + f.a2) / 2;
      const rad = am * Math.PI / 180;
      const cos = Math.cos(rad), sin = Math.sin(rad);
      const rIn = 15.9;
      const rOut = 23.5;
      const x1 = 42 + rIn * cos;
      const y1 = 25 + rIn * sin;
      const x2 = 42 + rOut * cos;
      const y2 = 25 + rOut * sin;
      const destra = cos >= 0;
      const anchor = destra ? 'start' : 'end';
      const testo = `${esc(f.k)} ${f.v}`;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${f.col}" stroke-width="0.5"></line>
        <text x="${(x2 + (destra ? 0.9 : -0.9)).toFixed(1)}" y="${y2.toFixed(1)}" font-size="3.4" text-anchor="${anchor}" dominant-baseline="central" fill="#1E293B" font-weight="700">${testo}</text>`;
    };
    return `
    <div style="display:flex; gap:24px; flex-wrap:wrap; align-items:center;">
      <svg id="${id}" width="420" height="250" viewBox="0 0 84 50" style="flex-shrink:0; max-width:100%;">
        ${fette.map(f => `<circle r="15.9" cx="42" cy="25" fill="transparent" stroke="${f.col}" stroke-width="9" stroke-dasharray="${f.perc * 99.9} ${99.9 - f.perc * 99.9}" stroke-dashoffset="${25 - (f.a1 + 90) / 360 * 99.9}"></circle>`).join('')}
        ${fette.map(etichetta).join('')}
      </svg>
      <div style="font-size:13px;">
        ${fette.map(f => `<div style="display:flex; align-items:center; gap:8px; padding:3px 0;">
          <span style="width:12px; height:12px; border-radius:3px; background:${f.col}; display:inline-block;"></span>
          <span style="flex:1;">${esc(f.k)}</span><b>${f.v}</b> <span style="color:var(--grigio);">(${Math.round(f.perc * 100)}%)</span>
        </div>`).join('')}
      </div>
    </div>`;
  };

  cont.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; margin-bottom:20px;">
      <div class="card" style="border-left:4px solid var(--verde);">
        <div style="font-size:32px; font-weight:800; color:var(--verde);">${inLinea}</div>
        <div style="font-size:13px; color:var(--grigio);">✅ In linea (≥ ${soglia} h)</div>
      </div>
      <div class="card" style="border-left:4px solid var(--rosso);">
        <div style="font-size:32px; font-weight:800; color:var(--rosso);">${sottoSoglia}</div>
        <div style="font-size:13px; color:var(--grigio);">⚠️ Sotto soglia mantenimenti</div>
      </div>
      <div class="card" style="border-left:4px solid var(--royal);">
        <div style="font-size:32px; font-weight:800; color:var(--royal);">${tutti.length}</div>
        <div style="font-size:13px; color:var(--grigio);">👥 Operatori totali</div>
      </div>
    </div>
    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:16px;">
      <div class="card">
        <div style="font-weight:700; margin-bottom:14px;">🏛️ Personale per Comando</div>
        ${torta(perComando, 'torta-comandi')}
      </div>
      <div class="card">
        <div style="font-weight:700; margin-bottom:14px;">🔄 Personale per turno</div>
        ${torta(perTurno, 'torta-turni')}
      </div>
    </div>`;
}

async function pagOperatori(el) {
  if (/^#\/operatori\/.+/.test(location.hash)) history.replaceState({ pagina: 'operatori' }, '', '#/operatori');
  el.innerHTML = `<div class="pagina-titolo">👥 Gestione Operatori</div><div class="pagina-sotto">Specializzazioni e abilitazioni</div><div id="op-cont">Caricamento…</div>`;
  const cont = document.getElementById('op-cont');
  const [opRes, specRes, mantRes] = await Promise.all([
    supabase.from('profili').select('*, sp_funzionario, sp_staff, sp_logista, sp_strutturista, sp_nbcr, sp_nbcr_est, sp_k9, sp_saf, sp_sapr, sp_medico, sp_infermiere, tas').order('cognome'),
    supabase.from('operatori_specializzazioni').select('operatore_id, specializzazione_id, specializzazioni(nome)'),
    caricaOreMantenimenti()
  ]);
  const oreMan = mantRes || {};
  if (opRes.error) {
    cont.innerHTML = `<div class="card" style="border-left:4px solid var(--rosso);"><b>⚠️ Errore caricamento operatori</b><div style="font-size:13px; color:var(--rosso-tx); margin-top:6px;">${esc(opRes.error.message)}</div><div style="font-size:12px; color:var(--grigio); margin-top:6px;">Codice: ${esc(opRes.error.code || 'n/d')}</div></div>`;
    return;
  }
  const operatori = opRes.data || [];
  const specPerOp = {};
  (specRes.data || []).forEach(s => {
    (specPerOp[s.operatore_id] = specPerOp[s.operatore_id] || []).push(s.specializzazioni?.nome);
  });

  const iconeSpec = (o) => specIcone(o) + (o.grado && ['CRE','CR','CSE','CS'].includes(o.grado) ? ' <span title="Caposquadra/Caporeparto">⭐</span>' : '');
  const simboloVigileImg = (o) => simboloVigile(o, 20);
  const iconeAbilitazioni = (o) => {
    let icone = '';
    if (o.patente) icone += ` <span title="Patente ${esc(o.patente)}">🚚${esc(o.patente)}</span>`;
    if (o.tpss) icone += ' <span title="TPSS — Soccorso sanitario" style="display:inline-block; width:22px; height:22px; border-radius:5px; margin-left:6px; background:#B22222; color:#fff; font-size:13px; font-weight:800; text-align:center; line-height:22px; vertical-align:middle;">✚</span>';
    if (o.tas) icone += ` <span title="TAS livello ${o.tas}" style="display:inline-block; width:22px; height:22px; border-radius:5px; margin-left:6px; background:#2563EB; color:#fff; font-size:13px; text-align:center; line-height:22px; vertical-align:middle;">🧭</span><b style="color:#2563EB; font-size:12px;">${o.tas}</b>`;
    return icone;
  };

  const soloSottoSoglia = localStorage.getItem('op-filtro') === 'sottosoglia';
  let testoCerca = localStorage.getItem('op-cerca') || '';
  const filtraPer = () => {
    let lista = soloSottoSoglia ? operatori.filter(o => (oreMan[o.id] || 0) < 24) : operatori;
    const q = testoCerca.trim().toLowerCase();
    if (q) lista = lista.filter(o => `${o.cognome} ${o.nome}`.toLowerCase().includes(q));
    return lista;
  };
  const daMostrare = filtraPer();

  cont.innerHTML = `
    <div style="position:relative; width:100%; max-width:420px; margin-bottom:12px;">
      <div id="diag-ore" style="display:none; max-width:100%; margin-bottom:12px; padding:10px 14px; background:#FEF2F2; color:#991B1B; border:1px solid #FECACA; border-radius:10px; font-size:13px;"></div>
    <input id="op-cerca" placeholder="🔍 Cerca per nome o cognome…" autocomplete="off"
        style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 38px 0 14px; font-size:14px;">
      <button id="op-cerca-x" title="Cancella la ricerca" style="position:absolute; right:4px; top:50%; transform:translateY(-50%); border:none; background:#F1F5F9; color:#64748B; width:28px; height:28px; border-radius:50%; font-size:15px; font-weight:700; cursor:pointer; display:none; line-height:1;">✕</button>
    </div>
    <div style="display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap;">
      <button class="pill ${!soloSottoSoglia ? 'verde' : ''}" id="fil-tutti" style="border:1px solid var(--bordo); cursor:pointer; background:#fff; padding:8px 16px;">👥 Tutti (${operatori.length})</button>
      <button class="pill ${soloSottoSoglia ? 'rosso' : ''}" id="fil-sottosoglia" style="border:1px solid var(--bordo); cursor:pointer; background:#fff; padding:8px 16px;">⚠️ Sotto soglia mantenimenti (${operatori.filter(o => (oreMan[o.id] || 0) < 24).length})</button>
    </div>
    <div class="grid" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:20px;">
      ${(await Promise.all(daMostrare.map(async o => `
        <div class="card" data-op="${o.id}" style="border-left:4px solid ${o.ruolo === 'admin' ? 'var(--rosso)' : 'var(--royal)'}; cursor:pointer; position:relative;">
          <div style="position:absolute; top:10px; right:12px; font-size:11px; color:var(--grigio);">➤</div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            ${await avatarHtml(o, 56, 18)}
            ${o.ruolo === 'admin'
              ? '<span class="pill rosso">⭐ Admin</span>'
              : ((oreMan[o.id] || 0) >= 24
                ? '<span class="pill verde">🟢 In linea</span>'
                : '<span class="pill giallo">🟡 Sotto soglia</span>')}
          </div>
          <div style="font-size:18px; font-weight:700;">${esc(o.cognome)} ${esc(o.nome)}${simboloVigile(o, 20)}${o.grado ? ` <span class="pill" style="font-size:10px; background:#F1F5F9; color:var(--grigio);">${esc(o.grado)}</span>` : ''}</div>
          <div style="font-size:13px; color:var(--grigio); margin:4px 0 8px;">${esc(o.comando || '')}${o.sede ? ' · ' + esc(o.sede) : ''}${o.salto_turno ? ' · turno ' + esc(o.salto_turno) : (o.turno ? ' · turno ' + esc(o.turno) : '')}</div>
          <div style="font-size:15px; line-height:2;">
            <span style="font-size:11px; font-weight:700; color:var(--grigio); text-transform:uppercase;">Specializzazioni:</span> ${iconeSpec(o) || '<span style="color:var(--grigio); font-size:13px;">—</span>'}
          </div>
          <div style="font-size:15px; line-height:2; margin-top:4px;">
            <span style="font-size:11px; font-weight:700; color:var(--grigio); text-transform:uppercase;">Abilitazioni:</span> ${iconeAbilitazioni(o) || '<span style="color:var(--grigio); font-size:13px;">—</span>'}
          </div>
        </div>`))).join('')}
    </div>`;
  const cercaInput = document.getElementById('op-cerca');
  const cercaX = document.getElementById('op-cerca-x');
  cercaInput.value = testoCerca;
  cercaX.style.display = testoCerca ? 'block' : 'none';
  cercaInput.oninput = () => {
    testoCerca = cercaInput.value;
    localStorage.setItem('op-cerca', testoCerca);
    cercaX.style.display = testoCerca ? 'block' : 'none';
    const lista = filtraPer();
    cont.querySelectorAll('[data-op]').forEach(c => {
      c.style.display = lista.some(o => o.id === c.dataset.op) ? '' : 'none';
    });
  };
  cercaX.onclick = () => {
    cercaInput.value = '';
    testoCerca = '';
    localStorage.setItem('op-cerca', '');
    cercaX.style.display = 'none';
    // riparte dall'elenco GIUSTO: tutti, o solo i sotto-soglia se quel filtro è attivo
    pagOperatori(el);
  };
  document.getElementById('fil-tutti').onclick = () => { localStorage.setItem('op-filtro', 'tutti'); pagOperatori(el); };
  document.getElementById('fil-sottosoglia').onclick = () => { localStorage.setItem('op-filtro', 'sottosoglia'); pagOperatori(el); };
  cont.querySelectorAll('[data-op]').forEach(c => c.onclick = () => {
    const o = operatori.find(x => x.id === c.dataset.op);
    if (o) {
      history.pushState({ pagina: 'operatori', scheda: o.id }, '', '#/operatori/' + o.id);
      schedaOperatore(el, o, oreMan);
    }
  });
}

/* ============ SQUADRE ============ */

async function pagSquadre(el) {
  el.innerHTML = `
    <div class="pagina-titolo">⚔️ Squadre</div>
    <div class="pagina-sotto">Composizione pubblicata dei team Alpha e Bravo</div>
    <div id="sq-cont">Caricamento…</div>`;
  const cont = document.getElementById('sq-cont');
  const { data: programmi } = await supabase.from('programmi_mensili')
    .select('*, programmi_membri(*, profili(nome, cognome, patente))')
    .eq('pubblicato_su_squadre', true).order('mese', { ascending: false });
  const progs = programmi || [];
  if (!progs.length) {
    cont.innerHTML = '<div class="card">Nessuna squadra pubblicata. Compila un programma in Programmazione e premi PUBBLICA SU SQUADRE.</div>';
    return;
  }
  // per ogni mese mostra Alpha e Bravo
  const perMese = {};
  progs.forEach(p => { (perMese[p.mese] = perMese[p.mese] || []).push(p); });
  const dettaglioSquadra = (p) => p.programmi_membri.length ? SEZIONI_MODULO.map(s => {
    const membriSez = s.posti.map(pp => p.programmi_membri.find(m => m.posto === pp.n)).filter(Boolean);
    if (!membriSez.length) return '';
    return `<div style="margin-bottom:8px;">
      <div style="font-size:11px; font-weight:700; color:var(--grigio); text-transform:uppercase;">${s.t}</div>
      ${membriSez.map(m => `<div style="font-size:14px; padding:2px 0; display:flex; gap:6px;">
        <span style="color:var(--rosso); font-weight:700; width:24px;">${m.posto}</span>
        <span style="font-weight:600;">${esc(m.profili?.cognome)} ${esc(m.profili?.nome)}</span>
      </div>`).join('')}
    </div>`;
  }).join('') : '<div style="color:var(--grigio); font-size:14px;">Nessun nominativo.</div>';

  cont.innerHTML = Object.entries(perMese).map(([mese, lista]) => `
    <div style="margin-bottom:24px;">
      <div style="font-weight:800; font-size:16px; margin-bottom:12px;">📅 ${meseIt(mese)}</div>
      ${lista.map(p => `
        <div class="card" data-squadra="${p.id}" style="border-left:4px solid ${p.team === 'alpha' ? 'var(--royal)' : 'var(--verde)'}; margin-bottom:10px; cursor:pointer;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:16px; font-weight:800; color:${p.team === 'alpha' ? 'var(--royal)' : 'var(--verde)'};">TEAM ${p.team === 'alpha' ? 'ALPHA' : 'BRAVO'}</span>
              <span class="pill giallo">${p.programmi_membri.length}/38</span>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              ${utente.ruolo === 'admin' ? `<button class="btn-primary" data-attiva-sq="${p.team}" style="height:38px; font-size:13px; background:var(--rosso);">🚨 ATTIVA</button>` : ''}
              <button class="btn-primary" data-visualizza="${p.id}" style="height:38px; font-size:13px;">👁️ VISUALIZZA</button>
              ${utente.ruolo === 'admin' ? `<button class="btn-primary" data-modifica="${p.id}" style="height:38px; font-size:13px; background:var(--grigio-ch);">✏️ MODIFICA</button>` : ''}
              <button class="btn-primary" data-pdf-sq="${p.id}" style="height:38px; font-size:13px;">📄 GENERA PDF COMPILAZIONE</button>
            </div>
          </div>
          <div class="dettaglio-sq" style="display:none; margin-top:12px; border-top:1px solid var(--bordo); padding-top:12px;">
            ${dettaglioSquadra(p)}
          </div>
        </div>`).join('')}
    </div>`).join('');

  // toggle dettaglio al click sulla card (ma non sui pulsanti)
  cont.querySelectorAll('[data-squadra]').forEach(card => {
    card.onclick = (e) => {
      if (e.target.closest('button')) return;
      const d = card.querySelector('.dettaglio-sq');
      d.style.display = d.style.display === 'none' ? 'block' : 'none';
    };
  });
  // VISUALIZZA: apre il dettaglio (come il click)
  cont.querySelectorAll('[data-visualizza]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const card = b.closest('[data-squadra]');
    const d = card.querySelector('.dettaglio-sq');
    d.style.display = 'block';
  });
  // ATTIVA: porta alla pagina Attivazione con la squadra preselezionata
  cont.querySelectorAll('[data-attiva-sq]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    localStorage.setItem('att-preferita', b.dataset.attivaSq);
    pagina = 'attivazione';
    render();
  });
  // GENERA PDF: manifesto della squadra pubblicata (per admin, come in Programmazione)
  cont.querySelectorAll('[data-pdf-sq]').forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    const p = progs.find(x => x.id === Number(b.dataset.pdfSq));
    if (!p) return;
    const { data: membri } = await supabase.from('programmi_membri')
      .select('posto, profili(nome, cognome, grado)').eq('programma_id', p.id);
    generaPdfManifesto(p, membri || []).catch(err => alert('Errore PDF: ' + err.message));
  });
  // MODIFICA: alla programmazione
  cont.querySelectorAll('[data-modifica]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const p = progs.find(x => x.id === Number(b.dataset.modifica));
    progMese = p.mese; progTeam = p.team; pagina = 'programmazione'; render();
  });
}

/* ============ RESOCONTI ============ */

async function pagResoconti(el) {
  el.innerHTML = `
    <div class="pagina-titolo">📄 Resoconti</div>
    <div class="pagina-sotto">Sintesi operativa</div>
    <div id="res-cont">Caricamento…</div>`;
  const cont = document.getElementById('res-cont');
  const salvato = localStorage.getItem('res-mese');
  let [y, m] = (salvato || '').split('-').map(Number);
  if (!y || !m) { const now = new Date(); y = now.getFullYear(); m = now.getMonth() + 1; }

  const disegna = async () => {
    const inizioMese = `${y}-${String(m).padStart(2, '0')}-01`;
    const fineMese = `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
    const { data: ferie } = await supabase.from('disponibilita').select('operatore_id, data, turno_ferie, profili(cognome, nome, turno, salto_turno)')
      .eq('tipo', 'ferie').gte('data', inizioMese).lte('data', fineMese);

    const perOp = {};
    let totTurni = 0;
    (ferie || []).forEach(f => {
      const nome = `${f.profili?.cognome} ${f.profili?.nome}`;
      const mioTurno = (f.profili?.turno || '')[0];
      if (!mioTurno) return;
      const [fy, fm, fg] = String(f.data).split('-').map(Number);
      const cp = coppiaGiorno(fy, fm - 1, fg);
      const salto = f.turno_ferie === 'notte' ? cp.notte : cp.giorno;
      if (salto[0] !== mioTurno) return;
      if (salto === f.profili?.salto_turno) return;
      perOp[nome] = perOp[nome] || { turni: 0 };
      perOp[nome].turni++;
      totTurni++;
    });
    const nomi = Object.keys(perOp).sort();
    const nomiMesi = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

    let bloccoMieFerie = '';
    if (utente.ruolo === 'admin') {
      const { data: mieFerie } = await supabase.from('disponibilita').select('data, turno_ferie')
        .eq('tipo', 'ferie').eq('operatore_id', utente.id).gte('data', inizioMese).lte('data', fineMese);
      const mioTurno = (utente.turno || '')[0];
      const mioSalto = utente.salto_turno;
      let turniMiei = 0;
      const giorniMiei = new Set();
      (mieFerie || []).forEach(f => {
        const [fy, fm, fg] = String(f.data).split('-').map(Number);
        const cp = coppiaGiorno(fy, fm - 1, fg);
        const salto = f.turno_ferie === 'notte' ? cp.notte : cp.giorno;
        if (mioTurno && salto[0] !== mioTurno) return;
        if (salto === mioSalto) return;
        turniMiei++;
        giorniMiei.add(f.data);
      });
      const dettaglioMio = giorniMiei.size
        ? `<div style="display:flex; gap:20px; flex-wrap:wrap;">
            <div><div style="font-size:32px; font-weight:800; color:var(--royal);">${turniMiei}</div>🕓 Turni di ferie</div>
            <div><div style="font-size:32px; font-weight:800;">${giorniMiei.size}</div>📅 Giorni coinvolti</div>
          </div>
          <div style="font-size:12px; color:var(--grigio); margin-top:10px;">${mioTurno ? 'Turno ' + esc(mioSalto || mioTurno) : '⚠️ Imposta il tuo turno nella pagina Profilo per il conteggio esatto.'}</div>`
        : '<div style="color:var(--grigio);">Nessuna ferie registrata in questo mese.</div>';
      bloccoMieFerie = `
    <div class="card" style="margin-bottom:20px;">
      <div style="font-weight:700; margin-bottom:10px;">🏖 Le mie ferie — ${nomiMesi[m - 1]} ${y}</div>
      <div style="font-size:13px; color:var(--grigio); margin-bottom:12px;">Turni di ferie effettivi del tuo periodo (esclusi i turni che non avresti lavorato).</div>
      ${dettaglioMio}
    </div>`;
    }

    cont.innerHTML = `
    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex; gap:8px; margin-bottom:12px;">
        <button class="pill" id="res-indietro" style="border:1px solid var(--bordo); cursor:pointer; background:#fff; padding:8px 16px;">◀ Mese prima</button>
        <button class="pill" id="res-avanti" style="border:1px solid var(--bordo); cursor:pointer; background:#fff; padding:8px 16px;">Mese dopo ▶</button>
      </div>
      <div style="font-weight:700; margin-bottom:14px;">🏖 Ferie di ${nomiMesi[m - 1]} ${y} — turni effettivi</div>
      <div style="font-size:12px; color:var(--grigio); margin-bottom:12px;">Conteggio dei turni che ciascuno avrebbe effettivamente lavorato (in base al proprio turno A–D e al calendario dei salti turno): le ferie in giorni di riposo o nel proprio salto turno non vengono contate.</div>
      <div style="display:flex; gap:20px; margin-bottom:14px; flex-wrap:wrap;">
        <div><div style="font-size:32px; font-weight:800; color:var(--royal);">${totTurni}</div>🕓 Turni di ferie</div>
        <div><div style="font-size:32px; font-weight:800;">${nomi.length}</div>👥 Operatori coinvolti</div>
      </div>
      ${nomi.length ? `
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <tr style="text-align:left; color:var(--grigio); font-size:12px;"><th style="padding:6px 0;">Operatore</th><th>🕓 Turni di ferie</th></tr>
        ${nomi.map(n => `<tr style="border-top:1px solid var(--bordo);"><td style="padding:7px 0;">${esc(n)}</td><td><b>${perOp[n].turni}</b></td></tr>`).join('')}
      </table>` : '<div style="color:var(--grigio);">Nessun turno di ferie registrato in questo mese.</div>'}
    </div>

    ${bloccoMieFerie}
    <div class="card"><div style="font-weight:700; margin-bottom:8px;">📋 Resoconti attivazioni</div><div style="color:var(--grigio); font-size:14px;">Saranno popolati con le prime attivazioni reali.</div></div>`;
    document.getElementById('res-indietro').onclick = () => { m--; if (m < 1) { m = 12; y--; } localStorage.setItem('res-mese', `${y}-${m}`); disegna(); };
    document.getElementById('res-avanti').onclick = () => { m++; if (m > 12) { m = 1; y++; } localStorage.setItem('res-mese', `${y}-${m}`); disegna(); };
  };
  await disegna();
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
    <div id="avviso-ferie" style="display:none; max-width:420px; margin:0 auto 14px; padding:10px 16px; background:#D1FAE5; color:#065F46; border-radius:10px; font-weight:700; text-align:center;"></div>
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
          const nGiornoFerie = inFerie.filter(n => !n.includes('🌙')).length;
          const nNotteFerie = inFerie.filter(n => n.includes('🌙')).length;
          const colFerie = inFerie.length
            ? `<div style="font-size:11px; color:var(--giallo-tx); text-align:left; line-height:1.6;">
                 <div><b>${nGiornoFerie}</b> ☀️ ${inFerie.filter(n => !n.includes('🌙')).map(n => n.replace(' (☀️)','').replace(' (🌙)','')).join(', ') || '—'}</div>
                 <div><b>${nNotteFerie}</b> 🌙 ${inFerie.filter(n => n.includes('🌙')).map(n => n.replace(' (🌙)','')).join(', ') || '—'}</div>
               </div>`
            : '<span style="color:var(--grigio);">—</span>';
          const sfondo = mieFerie ? 'background:#DBEAFE;' : '';
          const settCompleto = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'][new Date(anno, mese, giorno).getDay()];
          const miaG = mieFerieId[dataIso + '|giorno'] || mieFerieId[dataIso + '|intera'];
          const miaN = mieFerieId[dataIso + '|notte'] || mieFerieId[dataIso + '|intera'];
          const cellaG = miaG ? 'background:#DBEAFE; color:#1E40AF; font-weight:800; cursor:pointer; border-radius:6px;' : 'cursor:pointer;';
          const cellaN = miaN ? 'background:#DBEAFE; color:#1E40AF; font-weight:800; cursor:pointer; border-radius:6px;' : 'cursor:pointer;';
          return `<tr style="border-top:1px solid var(--bordo); text-align:center; ${sfondo}">
            <td style="text-align:left; padding:8px 4px; white-space:nowrap;"><b>${gg}</b> <span style="color:var(--grigio); font-size:12px;">${settCompleto}</span></td>
            <td style="text-align:left; padding:8px 8px; min-width:220px;">${colFerie}</td>
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
  let msg;
  if (esistenteId) {
    await supabase.from('disponibilita').delete().eq('id', esistenteId);
    msg = 'Ferie rimosse (' + fmtData(data) + (turno === 'giorno' ? ' ☀️' : ' 🌙') + ')';
  } else {
    const { error } = await supabase.from('disponibilita').insert({ operatore_id: utente.id, data, tipo: 'ferie', turno_ferie: turno });
    if (error) { alert('Errore: ' + error.message); return; }
    msg = '🏖️ Ferie inserite: ' + fmtData(data) + (turno === 'giorno' ? ' (turno giorno ☀️)' : ' (turno notte 🌙)');
  }
  await disegnaCalendario(el, anno, mese);
  const avviso = document.getElementById('avviso-ferie');
  if (avviso) {
    avviso.textContent = msg;
    avviso.style.display = 'block';
    setTimeout(() => avviso.style.display = 'none', 3000);
  }
}


async function caricaOreMantenimenti() {
  const anno = new Date().getFullYear();
  const { data, error } = await supabase.from('mantenimenti')
    .select('operatore_id, ore, ore_conteggiate, data').eq('stato', 'approvato');
  if (error) {
    // MAI silenzioso: se la query fallisce (es. cache schema PostgREST) si vede subito
    console.error('ERRORE caricamento ore mantenimenti:', error.message, error.code);
    const avviso = document.getElementById('diag-ore');
    if (avviso) {
      avviso.style.display = 'block';
      avviso.textContent = '⚠️ Conteggio ore non caricato (' + error.code + ' ' + error.message + ') — probabilmente la cache dello schema: eseguire in Supabase SQL Editor: NOTIFY pgrst, \'reload schema\';';
    }
    return {};
  }
  const ore = {};
  (data || []).forEach(m => {
    if (!String(m.data).startsWith(anno)) return;
    ore[m.operatore_id] = (ore[m.operatore_id] || 0) + Number(m.ore_conteggiate ?? m.ore);
  });
  return ore;
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
    <div class="pagina-sotto">Manifesto Composizione programmato Alpha e Bravo — 38 unità</div>
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
        ${(prog.data || []).filter(p => !p.pubblicato_su_squadre).map(p => `
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

  const [yS, mS] = progMese.split('-').map(Number);
  const seiMesiFa = new Date(yS, mS - 1 - 6, 1).toISOString().slice(0, 7) + '-01';
  const meseInizio = progMese;
  const [y, mo] = progMese.split('-').map(Number);
  const meseFine = `${y}-${String(mo).padStart(2, '0')}-${String(new Date(y, mo, 0).getDate()).padStart(2, '0')}`;
  const [pers, membri, storico, ferie, mantRes] = await Promise.all([
    supabase.from('profili').select('id, nome, cognome, patente, grado, comando, estensioni_patente, tas, sp_funzionario, sp_staff, sp_logista, sp_strutturista, sp_nbcr, sp_k9, sp_saf').order('cognome'),
    supabase.from('programmi_membri').select('*, profili(nome, cognome, patente, grado, estensioni_patente)').eq('programma_id', prog.id),
    supabase.from('programmi_membri').select('operatore_id, programmi_mensili!inner(mese)')
      .lt('programmi_mensili.mese', progMese).gte('programmi_mensili.mese', seiMesiFa).order('programmi_mensili.mese', { ascending: true }),
    supabase.from('disponibilita').select('operatore_id, data').eq('tipo', 'ferie')
      .gte('data', meseInizio).lte('data', meseFine),
    caricaOreMantenimenti()
  ]);
  const oreMan = mantRes || {};
  const sottoSogliaMan = (opId) => (oreMan[opId] || 0) < 24;
  const feriePerOp = {};
  (ferie.data || []).forEach(f => {
    (feriePerOp[f.operatore_id] = feriePerOp[f.operatore_id] || []).push(f.data);
  });
  // REGOLA: le ferie si contano in GIORNI (date distinte), non in turni
  const giorniFeriePerOp = {};
  Object.keys(feriePerOp).forEach(opId => {
    giorniFeriePerOp[opId] = [...new Set(feriePerOp[opId])].length;
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

  const patenteSigla = (o) => {
    let s = '';
    if (o.patente) s += ' 🚚' + o.patente + (o.estensioni_patente?.length ? '+' + o.estensioni_patente.map(e => e === 'Autoscala' ? 'AS' : e === 'Autogru' ? 'AG' : e === 'Anfibio' ? 'AN' : e).join('') : '');
    if (o.tas) s += ' 📍' + o.tas;
    return s;
  };
  const iconeSpecPdf = (o) => specIcone(o);
  const iconeSpec = (o) => (o ? ' ' + specIcone(o).trim() : '');
  const candidato = (o) => ({
    ...o,
    giorniFerie: giorniFeriePerOp[o.id] || 0,
    sottoMan: sottoSogliaMan(o.id),
    etichetta: `${o.cognome} ${o.nome}`.trim() + (o.grado ? ` [${o.grado}]` : '') + iconeSpec(o) + patenteSigla(o) + ((giorniFeriePerOp[o.id] || 0) ? ` 🏖 ${giorniFeriePerOp[o.id]} gg ferie` : '') + (sottoSogliaMan(o.id) ? ' ⚠️ MAN.' : ''),
    gruppo: gruppoDi(o.id)
  });

  const compilati = (membri.data || []).length;
  const autisti3 = (membri.data || []).filter(m => m.profili?.patente === '3°');
  const autisti4 = (membri.data || []).filter(m => m.profili?.patente === '4°');
  const inSquadra = (set) => (membri.data || []).filter(m => set.has(m.operatore_id)).length;
  const inSquadraSp = (f) => (membri.data || []).filter(m => { const o = (pers.data || []).find(x => x.id === m.operatore_id); return o && f(o); }).length;
  const nStrutt = inSquadraSp(o => o.sp_strutturista);
  const nNbcr = inSquadraSp(o => (o.sp_nbcr || 0) >= 2);
  const nK9 = inSquadraSp(o => o.sp_k9);
  const nSaf = inSquadraSp(o => (o.sp_saf || '').includes('2A'));

  cont.innerHTML = `
    <button class="link" id="prog-indietro" style="padding:0; margin-bottom:10px;">← Cambia squadra</button>
    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px;">
        <div>
          <div style="font-size:22px; font-weight:800;">${meseIt(progMese)} — SQUADRA ${progTeam === 'alpha' ? 'ALPHA' : 'BRAVO'}</div>
          <div style="font-size:13px; color:var(--grigio);">${prog.pubblicato ? '✅ Pubblicato' : '✏️ Bozza'} · ${compilati}/38 unità</div>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn-primary" id="prog-inserisci-tutti" style="height:44px;">➕ INSERISCI TUTTI</button>
          <button class="btn-primary" id="prog-elimina" style="height:44px; background:var(--rosso);">🗑 ELIMINA COMPILAZIONE</button>
          <button class="btn-primary" id="prog-genera-pdf" style="height:44px;">📄 GENERA PDF COMPILAZIONE</button>
          <button class="btn-primary" id="prog-pubblica" style="max-width:210px; height:44px; background:${prog.pubblicato ? 'var(--verde)' : 'var(--rosso)'};">${prog.pubblicato ? 'RIPUBBLICA' : 'PUBBLICA'} SU TELEGRAM</button>
          <button class="btn-primary" id="prog-squadre" style="max-width:210px; height:44px; background:${prog.pubblicato_su_squadre ? 'var(--verde)' : 'var(--royal)'};">${prog.pubblicato_su_squadre ? 'AGGIORNA' : 'PUBBLICA'} SU SQUADRE</button>
        </div>
      </div>
      <div class="barra" style="margin-top:12px;"><div style="width:${compilati / 38 * 100}%;"></div></div>
      <div style="display:flex; gap:22px; margin-top:14px; flex-wrap:wrap; font-size:13px;">
        <span>🏗️ Strutturisti: <b>${nStrutt}</b></span>
        <span>☣️ NBCR 3°: <b>${nNbcr}</b></span>
        <span>🐕 Unità cinofile: <b>${nK9}</b></span>
        <span>🧗 SAF 2A/Avanzato: <b>${nSaf}</b></span>
        <span>🚚 Autisti 3° grado: <b>${autisti3.length}</b></span>
        <span>🚚 Autisti 4° grado: <b>${autisti4.length}</b></span>
      </div>
    </div>

    ${SEZIONI_MODULO.map(s => `
      <div class="card" style="margin-bottom:14px;">
        <div style="font-weight:800; font-size:13px; letter-spacing:0.5px; color:var(--grigio); margin-bottom:10px;">${s.t}</div>
        ${s.posti.map(p => {
          const occ = perPosto[p.n];
          const idonei = tutti.filter(o => {
            if (occupati.has(o.id)) return false;
            if (p.spec) {
              if (p.spec === 'strutturista') return !!o.sp_strutturista;
              if (p.spec === 'nbcr') return (o.sp_nbcr || 0) >= 2;
              if (p.spec === 'k9') return !!o.sp_k9;
              if (p.spec === 'saf') return (o.sp_saf || '').includes('2A') || (o.sp_saf || '').includes('AVANZATO');
            }
            return true;
            return true;
          }).map(candidato);
          (window.__idoneiPosto = window.__idoneiPosto || {})[p.n] = idonei;
          return `
          <div style="display:flex; gap:10px; align-items:center; padding:7px 0; border-top:1px solid var(--bordo);">
            <span style="width:28px; font-weight:800; color:${p.spec || p.ros ? 'var(--rosso)' : 'var(--grigio)'};">${p.n}</span>
            <span style="flex:1; font-size:14px;">${esc(p.t)}${p.spec || p.ros ? ' <span style="color:var(--rosso); font-size:11px;">● OBBL.</span>' : ''}</span>
            ${occ
              ? `<span style="font-weight:700;">${esc(occ.profili?.cognome)} ${esc(occ.profili?.nome)}${iconeSpec(occ.profili)}${occ.profili?.patente ? ` <span class="pill giallo" style="font-size:10px;">🚚 ${esc(occ.profili.patente)}</span>` : ''}${simboloVigile({ grado: occ.profili?.grado }, 16)}</span>
                 <button class="pill rosso" data-vuota="${occ.id}" style="border:none; cursor:pointer;">✕</button>`
              : `<div style="display:flex; gap:6px; align-items:center; max-width:400px;">
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
      if (ros) filtrati.sort((a, b) => (a.sottoMan - b.sottoMan) || (idCapi.has(b.id) - idCapi.has(a.id)) || (b.gruppo.n - a.gruppo.n) || a.etichetta.localeCompare(b.etichetta));
      else filtrati.sort((a, b) => (a.sottoMan - b.sottoMan) || (b.gruppo.n - a.gruppo.n) || a.etichetta.localeCompare(b.etichetta));
      let html = '';
      let ultimoG = null;
      filtrati.forEach(o => {
        if (o.gruppo.t !== ultimoG) {
          const colore = o.gruppo.t === 'MAI INSERITI' ? '#94A3B8' : (o.gruppo.n === 1 ? '#059669' : o.gruppo.n <= 3 ? '#2563EB' : '#F59E0B');
          html += `<div style="padding:5px 10px; font-size:11px; font-weight:700; color:${colore};">${o.gruppo.t}</div>`;
          ultimoG = o.gruppo.t;
        }
        const pref = ros && idCapi.has(o.id) ? '⭐ ' : '';
        html += `<div data-scelta="${o.id}" data-n="${n}" style="padding:10px 12px; font-size:15px; cursor:pointer; border-top:1px solid #F1F5F9; ${o.sottoMan ? 'color:var(--rosso); background:#FEF2F2;' : ''}">${pref}${esc(o.etichetta)} ${simboloVigile(o, 20)}</div>`;
      });
      lista.innerHTML = html || '<div style="padding:10px; color:var(--grigio); font-size:13px;">Nessun risultato</div>';
      selezioneTouch(lista, '[data-scelta]', (d) => {
        document.getElementById(`posto-${n}`).value = d.dataset.scelta;
        inp.value = d.textContent.trim();
        lista.style.display = 'none';
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
  document.getElementById('prog-squadre').onclick = async () => {
    const { error } = await supabase.from('programmi_mensili').update({ pubblicato_su_squadre: true }).eq('id', prog.id);
    if (error) { alert('Errore: ' + error.message); return; }
    alert('Squadra pubblicata nella pagina SQUADRE.');
    renderPagina();
  };
  document.getElementById('prog-genera-pdf').onclick = () => generaPdfManifesto(prog, membri.data || []).catch(err => {
    console.error('Errore generazione PDF:', err);
    alert('Errore nella generazione del PDF: ' + err.message);
  });
}

function caricaImmaginePdf(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      try { resolve(c.toDataURL('image/jpeg', 0.92)); } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error('logo non caricato: ' + url));
    img.src = url;
  });
}

async function generaPdfManifesto(prog, membri) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const perPosto = {};
  membri.forEach(m => {
    perPosto[m.posto] = {
      nome: `${(m.profili?.cognome || '').toUpperCase()} ${(m.profili?.nome || '').toUpperCase()}`.trim(),
      grado: m.profili?.grado || null
    };
  });
  const team = prog.team === 'alpha' ? 'TEAM ALPHA' : prog.team === 'bravo' ? 'TEAM BRAVO' : 'ATTIVAZIONE PERSONALIZZATA';
  const nomeModulo = prog.team === 'alpha' ? 'MO.USARM.VEN.01' : prog.team === 'bravo' ? 'MO.USARM.VEN.02' : null;

  const BIANCO = [255,255,255];
  const BIANCO_SEZ = [255,255,255];
  const BLU_TL = [0,102,204];
  const BLU_CHIARO = [167,212,255];
  const GIALLO = [255,243,176];
  const SENAPE = [255,215,0];
  const ROSSO = [178,34,34];
  const ROSSO_CH = [255,0,0];
  const GRIGIO_TX = [71,85,105];
  const ANTRACITE = [30,41,59];

  function box(x, y, w, h, n, ruolo, nome, sfondo, stile, grado) {
    doc.setFillColor(...sfondo);
    doc.setDrawColor(0,0,0);
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, h, 'FD');
    const scuro = stile === 'capo';
    const lum = (sfondo[0]*0.299 + sfondo[1]*0.587 + sfondo[2]*0.114) < 150;
    const cx = x + w / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    if (scuro || lum) { doc.setTextColor(255,255,255); }
    else { doc.setTextColor(178,34,34); }
    doc.text(`${n} - ${ruolo.toUpperCase()}`, cx, y + 4.2, { align: 'center' });
    doc.setFontSize(8);
    if (scuro || lum) { doc.setTextColor(255,255,255); }
    else if (nome) { doc.setTextColor(...ANTRACITE); }
    else { doc.setTextColor(150,150,150); }
    if (nome) {
      doc.text(nome, cx, y + 9.5, { align: 'center' });
    }
  }

  function sezioneBg(y1, y2, colore) {
    doc.setFillColor(255,255,255);
    doc.setDrawColor(0,0,0);
    doc.setLineWidth(0.7);
    doc.rect(12, y1, 186, y2 - y1, 'FD');
  }
  function titoloSezione(y, testo) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...ANTRACITE);
    doc.text(testo, 14, y);
  }

  // ===== INTESTAZIONE =====
  let logoVvf = null, logoUsar = null;
  try {
    [logoVvf, logoUsar] = await Promise.all([
      caricaImmaginePdf('/App-Usar-Veneto/assets/Logo vvf.png'),
      caricaImmaginePdf('/App-Usar-Veneto/assets/logo-usar.jpg')
    ]);
  } catch (e) {
    console.warn('Logo non caricati nel PDF:', e);
  }
  if (logoVvf) doc.addImage(logoVvf, 'JPEG', 12, 8, 15, 15);
  if (logoUsar) doc.addImage(logoUsar, 'JPEG', 183, 8, 15, 15);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...ANTRACITE);
  doc.text(team, 105, 16, { align: 'center' });
  doc.setFontSize(12); doc.setTextColor(37,99,235);
  const mesePdf = prog.mese ? meseIt(prog.mese) : (progMese ? meseIt(progMese) : meseIt(new Date().toISOString().slice(0, 7) + '-01'));
  doc.text(mesePdf.toUpperCase(), 105, 22.5, { align: 'center' });
  if (nomeModulo) {
    doc.setFontSize(10); doc.setTextColor(...ROSSO);
    doc.text('MODULO ' + nomeModulo, 105, 27.5, { align: 'center' });
  }

  const H = 12, GAP = 1.6, STEP = H + GAP;
  const HS = 10.5, STEPS = HS + 1.4;
  let y = nomeModulo ? 31 : 26;

  function sottoTitolo(yy, testo) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...ANTRACITE);
    doc.text(testo, 15, yy);
  }

  // ===== DIREZIONE E COMANDO (sfondo blu chiaro) =====
  let y0 = y;
  const yD = y + 7.5;
  const yD2 = yD + STEP;
  const yD3 = yD2 + STEP;
  sezioneBg(y0, yD3 + H + 2.5, BLU_CHIARO);
  titoloSezione(y0 + 4, 'DIREZIONE E COMANDO');
  box(75, yD, 60, H, 1, 'Team Leader', perPosto[1]?.nome, BLU_TL, 'capo', perPosto[1]?.grado);
  box(15, yD2, 88, H, 2, 'Vice Team Leader', perPosto[2]?.nome, BLU_CHIARO, null, perPosto[2]?.grado);
  box(107, yD2, 88, H, 3, 'Ufficiale di Collegamento', perPosto[3]?.nome, BLU_CHIARO, null, perPosto[3]?.grado);
  box(15, yD3, 58, H, 4, 'Staff Comando', perPosto[4]?.nome, BLU_CHIARO, null, perPosto[4]?.grado);
  box(76, yD3, 58, H, 5, 'Staff', perPosto[5]?.nome, BLU_CHIARO, null, perPosto[5]?.grado);
  box(137, yD3, 58, H, 6, 'Staff', perPosto[6]?.nome, BLU_CHIARO, null, perPosto[6]?.grado);
  y = yD3 + H + 4.5;

  // ===== VALUTAZIONE E SICUREZZA (sfondo giallo) =====
  y0 = y;
  const yV = y + 7.5;
  const wV = 43.6;
  sezioneBg(y0, yV + H + 2.5, BIANCO_SEZ);
  titoloSezione(y0 + 4, 'VALUTAZIONE E SICUREZZA');
  [[7,'Strutturista'],[8,'NBCR'],[9,'Strutturista'],[10,'NBCR']].forEach(([n, r], i) => {
    box(15.5 + i * (wV + 1.6), yV, wV, H, n, r, perPosto[n]?.nome, SENAPE, null, perPosto[n]?.grado);
  });
  y = yV + H + 4.5;

  // ===== OPERAZIONI (sfondo rosso deciso): RICERCA sopra, SOCCORSO sotto =====
  y0 = y;
  const yO = y + 7.5;
  const yR = yO + 4.5;
  let yS = yR + 3 * STEPS + 2.5 + 4.5;
  const yEndO = yS + 8 * STEPS + 1.5;
  sezioneBg(y0, yEndO, ROSSO);
  titoloSezione(y0 + 4, 'OPERAZIONI');
  sottoTitolo(yO + 3, 'RICERCA');
  const colR1 = [[11,'Unit\u00e0 Cinofila'],[12,'Unit\u00e0 Cinofila'],[13,'Tecnico Strumentista']];
  const colR2 = [[14,'Unit\u00e0 Cinofila'],[15,'Unit\u00e0 Cinofila'],[16,'Tecnico Strumentista']];
  colR1.forEach(([n, r], i) => box(15, yR + i * STEPS, 88, HS, n, r, perPosto[n]?.nome, ROSSO_CH, null, perPosto[n]?.grado));
  colR2.forEach(([n, r], i) => box(107, yR + i * STEPS, 88, HS, n, r, perPosto[n]?.nome, ROSSO_CH, null, perPosto[n]?.grado));
  sottoTitolo(yS - 1.5, 'SOCCORSO');
  const colS1 = [[17,'ROS'],[18,'Soccorritore Tecnico'],[19,'Soccorritore Tecnico'],[20,'Soccorritore Tecnico'],[21,'Soccorritore Tecnico'],[22,'SAF'],[23,'Addetto Sicurezza'],[24,'Sentinella']];
  const colS2 = [[25,'ROS'],[26,'Soccorritore Tecnico'],[27,'Soccorritore Tecnico'],[28,'Soccorritore Tecnico'],[29,'Soccorritore Tecnico'],[30,'SAF'],[31,'Addetto Sicurezza'],[32,'Sentinella']];
  colS1.forEach(([n, r], i) => box(15, yS + i * STEPS, 88, HS, n, r, perPosto[n]?.nome, ROSSO_CH, null, perPosto[n]?.grado));
  colS2.forEach(([n, r], i) => box(107, yS + i * STEPS, 88, HS, n, r, perPosto[n]?.nome, ROSSO_CH, null, perPosto[n]?.grado));
  y = yEndO + 2;

  // ===== LOGISTICA (sfondo giallo): 2 righe da 3 =====
  y0 = y;
  const yL = y + 7.5;
  const yL2 = yL + STEPS;
  sezioneBg(y0, yL2 + HS + 2.5, BIANCO_SEZ);
  titoloSezione(y0 + 4, 'LOGISTICA');
  box(15, yL, 58, HS, 33, 'Responsabile Logistica', perPosto[33]?.nome, GIALLO, null, perPosto[33]?.grado);
  box(76, yL, 58, HS, 34, 'Vice Responsabile Logistica', perPosto[34]?.nome, GIALLO, null, perPosto[34]?.grado);
  box(137, yL, 58, HS, 35, 'Logista', perPosto[35]?.nome, GIALLO, null, perPosto[35]?.grado);
  box(15, yL2, 58, HS, 36, 'Logista', perPosto[36]?.nome, GIALLO, null, perPosto[36]?.grado);
  box(76, yL2, 58, HS, 37, 'Logista', perPosto[37]?.nome, GIALLO, null, perPosto[37]?.grado);
  box(137, yL2, 58, HS, 38, 'Logista', perPosto[38]?.nome, GIALLO, null, perPosto[38]?.grado);
  y = yL2 + HS + 4.5;

  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(148,163,184);
  doc.text(`Generato il ${new Date().toLocaleString('it-IT')} — Nucleo USAR Veneto`, 105, y + 4, { align: 'center' });

  doc.save(`${nomeModulo ? nomeModulo + '-' : ''}manifesto-composizione-${prog.team}.pdf`);
}

/* ============ ATTIVAZIONE EMERGENZA ============ */

let attivazioneId = null;
let attivazioneTeam = null;
let canaleRealtime = null;

function chiudiRealtime() {
  if (canaleRealtime) { supabase.removeChannel(canaleRealtime); canaleRealtime = null; }
}

async function pagAttivazione(el) {
  chiudiRealtime();
  if (utente.ruolo === 'admin') return pagAttivazioneAdmin(el);
  return pagAttivazioneOperatore(el);
}

async function pagAttivazioneOperatore(el) {
  el.innerHTML = `
    <div class="pagina-titolo">🚨 Attivazione Emergenza</div>
    <div class="pagina-sotto">Stato di allerta del nucleo</div>
    <div id="att-op-cont">Caricamento…</div>`;
  const cont = document.getElementById('att-op-cont');

  const disegna = async () => {
    const { data: att } = await supabase.from('attivazioni')
      .select('*, risposte_attivazione(*)').eq('chiusa', false).order('creata_il', { ascending: false }).limit(1);
    const a = att?.[0];
    if (!a) {
      cont.innerHTML = `<div class="card">✅ Nessuna attivazione in corso.</div>`;
      return;
    }
    const mia = (a.risposte_attivazione || []).find(r => r.operatore_id === utente.id);
    let centrale = '';
    if (mia) {
      centrale = `<div class="pill verde" style="display:inline-block; padding:8px 14px;">✅ Hai risposto: ${mia.risposta === 'si' ? 'DISPONIBILE' : 'NON DISPONIBILE'}</div>
        <button class="btn-primary" id="att-cambia" style="height:40px; font-size:13px; background:#fff; color:var(--rosso); border:1px solid var(--rosso);">✏️ Cambia risposta</button>`;
    } else {
      centrale = `<div style="display:grid; gap:10px; max-width:400px; margin-top:14px;">
        <button class="btn-primary" data-risposta="si" style="height:64px; background:var(--verde); font-size:18px; font-weight:800;">✅ SONO DISPONIBILE</button>
        <button class="btn-primary" data-risposta="no" style="height:56px; background:var(--grigio-ch); font-size:15px;">✖️ NON SONO DISPONIBILE</button>
      </div>`;
    }
    cont.innerHTML = `
      <div class="card">
        <div style="font-size:12px; color:var(--grigio);">${new Date(a.creata_il).toLocaleString('it-IT')}</div>
        <div style="font-size:20px; font-weight:800; margin:6px 0;">🚨 TEAM ${a.team === 'alpha' ? 'ALPHA' : 'BRAVO'} ATTIVATO</div>
        <div style="background:#FEF2F2; border-left:4px solid var(--rosso); padding:12px; border-radius:8px; margin:10px 0; font-size:15px;">${esc(a.messaggio)}</div>
        ${centrale}
      </div>`;
    cont.querySelectorAll('[data-risposta]').forEach(b => b.onclick = async () => {
      const { error } = await supabase.from('risposte_attivazione')
        .upsert({ attivazione_id: a.id, operatore_id: utente.id, risposta: b.dataset.risposta }, { onConflict: 'attivazione_id,operatore_id' });
      if (error) alert('Errore: ' + error.message);
      disegna();
    });
    const btnCambia = document.getElementById('att-cambia');
    if (btnCambia) btnCambia.onclick = async () => {
      if (!confirm('Cancellare la tua risposta e sceglierne una nuova?')) return;
      await supabase.from('risposte_attivazione').delete().eq('attivazione_id', a.id).eq('operatore_id', utente.id);
      disegna();
    };
  };
  await disegna();
  canaleRealtime = supabase.channel('att-op')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attivazioni' }, disegna)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'risposte_attivazione' }, disegna)
    .subscribe();
}
async function pagAttivazioneAdmin(el) {
  el.innerHTML = `
    <div class="pagina-titolo">🚨 Attivazione Emergenza</div>
    <div class="pagina-sotto">Lancio allerta e monitoraggio risposte in tempo reale</div>
    <div id="att-adm-cont">Caricamento…</div>`;
  const cont = document.getElementById('att-adm-cont');

  const disegna = async () => {
    const { data: atts } = await supabase.from('attivazioni')
      .select('*, risposte_attivazione(*, profili(nome, cognome, patente, grado, foto_path))')
      .eq('chiusa', false).order('creata_il', { ascending: false });
    const aperta = atts?.[0];

    if (!aperta) {
      cont.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; max-width:600px;">
          <button class="btn-primary" data-avvia="alpha" style="height:80px; font-size:18px; font-weight:800;">🚨 ATTIVA ALPHA</button>
          <button class="btn-primary" data-avvia="bravo" style="height:80px; font-size:18px; font-weight:800;">🚨 ATTIVA BRAVO</button>
        </div>
        <div class="card" style="margin-top:20px; max-width:600px;">
          <div style="text-align:center; margin-bottom:10px;">
            <button class="btn-primary" data-avvia="personalizzata" style="height:64px; font-size:16px; font-weight:800; width:100%;">🎯 ATTIVAZIONE PERSONALIZZATA</button>
            <div style="font-size:12px; color:var(--grigio); margin-top:6px;">Nessun team predefinito: si allerta il nucleo e il modulo si compila a mano tra chi risponde SÌ</div>
          </div>
        </div>
        <div class="card" style="margin-top:20px; max-width:600px;">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:var(--grigio); margin-bottom:6px;">Messaggio di emergenza (modificabile)</div>
          <textarea id="att-msg" rows="4" style="width:100%; border:1.5px solid var(--grigio-ch); border-radius:10px; padding:12px; font-family:inherit; font-size:14px;">🚨 ATTIVAZIONE TEAM — Emergenza USAR. Ritrovo: Centrale VVF Mestre. Confermare la propria disponibilità.</textarea>
          <button class="btn-primary" id="att-invia" style="margin-top:12px;">📡 INVIA ALLERTA</button>
        </div>`;
      let teamScelto = null;
      const MSG_DEFAULT = (t) => `🚨 ATTIVAZIONE ${t} — Emergenza USAR. Ritrovo: Centrale VVF Mestre. Confermare la propria disponibilità.`;
      const msgBox = document.getElementById('att-msg');
      const seleziona = (team) => {
        cont.querySelectorAll('[data-avvia]').forEach(x => x.style.outline = '');
        const btn = cont.querySelector(`[data-avvia="${team}"]`);
        if (!btn) return;
        btn.style.outline = '4px solid #059669';
        teamScelto = team;
        const nome = team === 'alpha' ? 'TEAM ALPHA' : team === 'bravo' ? 'TEAM BRAVO' : 'ATTIVAZIONE PERSONALIZZATA';
        msgBox.value = MSG_DEFAULT(nome);
      };
      cont.querySelectorAll('[data-avvia]').forEach(b => b.onclick = () => seleziona(b.dataset.avvia));
      const preferita = localStorage.getItem('att-preferita');
      if (preferita) {
        localStorage.removeItem('att-preferita');
        seleziona(preferita);
      }
      document.getElementById('att-invia').onclick = async () => {
        if (!teamScelto) { alert('Seleziona prima ATTIVA ALPHA, ATTIVA BRAVO o ATTIVAZIONE PERSONALIZZATA.'); return; }
        const messaggio = msgBox.value.trim();
        if (!messaggio) { alert('Scrivi il messaggio di emergenza.'); return; }
        const { data: nuova, error } = await supabase.from('attivazioni')
          .insert({ team: teamScelto, messaggio, creata_da: utente.id }).select().single();
        if (error) { alert('Errore: ' + error.message); return; }
        attivazioneId = nuova.id;
        attivazioneTeam = nuova.team;
        disegna();
      };
      return;
    }

    attivazioneId = aperta.id;
    attivazioneTeam = aperta.team;
    const risp = aperta.risposte_attivazione || [];
    const si = risp.filter(r => r.risposta === 'si');
    const no = risp.filter(r => r.risposta === 'no');

    // NESSUNA RISPOSTA = allertati che non hanno ancora risposto.
    // Allertati = chi ha Telegram collegato (il bot invia lì) + il personale del programma del team attivato
    const { data: collegati } = await supabase.from('profili').select('id, nome, cognome').not('telegram_chat_id', 'is', null);
    const meseCorrenteAllerta = new Date().toISOString().slice(0, 7) + '-01';
    const { data: progAllerta } = await supabase.from('programmi_mensili')
      .select('id, programmi_membri(operatore_id)')
      .eq('mese', meseCorrenteAllerta).eq('team', aperta.team === 'personalizzata' ? 'alpha' : aperta.team).maybeSingle();
    const allertati = new Set((collegati || []).map(c => c.id));
    const nomiAllertati = {};
    (collegati || []).forEach(c => { nomiAllertati[c.id] = `${c.cognome || ''} ${c.nome || ''}`.trim(); });
    (progAllerta?.programmi_membri || []).forEach(m => allertati.add(m.operatore_id));
    const risposto = new Set(risp.map(r => r.operatore_id));
    const senzaRisposta = [...allertati].filter(id => !risposto.has(id));

    // copertura requisiti: conta tra i SÌ (prioritariamente chi è nel programma del mese)
    const meseCorrente = new Date().toISOString().slice(0, 7) + '-01';
    const { data: progMese } = await supabase.from('programmi_mensili')
      .select('id, programmi_membri(operatore_id, posto)')
      .eq('mese', meseCorrente).eq('team', aperta.team).maybeSingle();
    const inProgramma = new Set((progMese?.programmi_membri || []).map(m => m.operatore_id));
    const idonei = (spec) => si.filter(r => {
    const o = tutti.find(x => x.id === r.operatore_id) || {};
    if (spec === 'Strutturista') return !!o.sp_strutturista;
    if (spec === 'NBCR 3° livello') return (o.sp_nbcr || 0) >= 2;
    if (spec === 'Unità cinofila K9') return !!o.sp_k9;
    if (spec === 'SAF 2A (corda)') return (o.sp_saf || '').includes('2A');
    if (spec === 'Caposquadra/Caporeparto') return o.grado && ['CRE','CR','CSE','CS'].includes(o.grado);
    return false;
  });
    const copre = (spec, min) => { const n = idonei(spec).length; return n >= min; };
    const righeCop = [
      ['🏗️ Strutturisti', tutti.filter(o => o.sp_strutturista).length, 2],
      ['☣️ NBCR 2+', tutti.filter(o => (o.sp_nbcr || 0) >= 2).length, 2],
      ['🐕 Unità cinofile', tutti.filter(o => o.sp_k9).length, 4],
      ['⭐ Capi squadra', tutti.filter(o => o.id && idCapi.has(o.id)).length, 2],
      ['🧗 SAF 2A', tutti.filter(o => (o.sp_saf || '').includes('2A')).length, 2],
      ['👥 Personale (totale)', si.length, 38]
    ];

    cont.innerHTML = `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <div style="font-size:22px; font-weight:800;">🚨 TEAM ${aperta.team === 'alpha' ? 'ALPHA' : aperta.team === 'bravo' ? 'BRAVO' : 'ATTIVAZIONE PERSONALIZZATA'} ATTIVATO</div>
            ${aperta.team === 'alpha' || aperta.team === 'bravo' ? `<div style="font-size:15px; font-weight:800; color:var(--rosso); margin-top:2px;">MODULO ${aperta.team === 'alpha' ? 'MO.USARM.VEN.01' : 'MO.USARM.VEN.02'}</div>` : ''}
            <div style="font-size:13px; color:var(--grigio);">${new Date(aperta.creata_il).toLocaleString('it-IT')} · allertati: in attesa del bot Telegram</div>
          </div>
          <button class="btn-primary" id="att-chiudi" style="height:44px; background:var(--grigio-ch);">✔️ CHIUDI ATTIVAZIONE</button>
        </div>
        <div style="background:#FEF2F2; border-left:4px solid var(--rosso); padding:12px; border-radius:8px; margin:12px 0;">${esc(aperta.messaggio)}</div>
        <div style="display:flex; gap:14px; flex-wrap:wrap; font-size:14px; margin-bottom:12px;">
          <span class="pill verde">✅ SÌ: ${si.length}</span>
          <span class="pill rosso">✖️ NO: ${no.length}</span>
          <span class="pill giallo">⏳ Nessuna risposta: ${senzaRisposta.length}</span>
        </div>
        ${senzaRisposta.length ? `<div style="font-size:12px; color:var(--grigio); margin-bottom:12px;">⏳ In attesa: ${senzaRisposta.map(id => nomiAllertati[id] || '').filter(Boolean).join(', ')}</div>` : ''}
      </div>

      <div class="card" style="margin-top:14px;">
        <div style="font-weight:800; margin-bottom:10px;">📦 COPERTURA REQUISITI (su chi ha risposto SÌ)</div>
        ${righeCop.map(([t, n, min]) => `
          <div style="display:flex; align-items:center; gap:10px; padding:6px 0; border-top:1px solid var(--bordo);">
            <span style="flex:1;">${t}</span>
            <span style="font-weight:800; color:${n >= min ? 'var(--verde)' : 'var(--rosso)'};">${n}/${min}</span>
            <div class="barra" style="width:120px; margin:0;"><div style="width:${Math.min(n / min * 100, 100)}%; background:${n >= min ? 'var(--verde)' : 'var(--rosso)'};"></div></div>
            <span>${n >= min ? '✅' : '➖'.repeat(Math.max(min - n, 0))}</span>
          </div>`).join('')}
      </div>

      <div class="card" style="margin-top:14px;">
        <div style="font-weight:800; margin-bottom:10px;">✅ RISPOSTE — SÌ (${si.length})</div>
        ${si.length ? (await Promise.all(si.map(async r => `<div style="padding:7px 0; border-top:1px solid var(--bordo); display:flex; justify-content:space-between;">
          <span>${await avatarHtml(r.profili, 32, 11)} <b>${esc(r.profili?.cognome)} ${esc(r.profili?.nome)}</b>${inProgramma.has(r.operatore_id) ? ' <span class="pill verde" style="font-size:10px;">IN PROGRAMMA</span>' : ''}</span>
          <span style="color:var(--grigio); font-size:12px;">${new Date(r.risposto_il).toLocaleTimeString('it-IT')}</span>
        </div>`))).join('') : '<div style="color:var(--grigio);">Nessuna risposta positiva finora.</div>'}
        ${no.length ? `<div style="font-weight:800; margin:14px 0 6px;">✖️ NO (${no.length})</div>
        ${no.map(r => `<div style="padding:7px 0; border-top:1px solid var(--bordo); color:var(--grigio);">${esc(r.profili?.cognome)} ${esc(r.profili?.nome)}</div>`).join('')}` : ''}
      </div>

      <div class="card" style="margin-top:14px;">
        <div style="font-weight:800;">📋 MANIFESTO COMPOSIZIONE DELL'ATTIVAZIONE${aperta.team === 'personalizzata' ? ' — PERSONALIZZATA' : ` — TEAM ${aperta.team === 'alpha' ? 'ALPHA' : 'BRAVO'}`}</div>
        <div style="color:var(--grigio); font-size:13px; margin:6px 0 12px;">${aperta.team === 'personalizzata'
          ? 'Compila i 38 posti scegliendo <b>ruolo e nominativo</b> tra chi ha risposto SÌ.'
          : 'Compila i 38 posti: <b>automaticamente</b> dal programma del mese (ogni pressione aggiorna la maschera, non invia nulla) o <b>manualmente</b> con gli stessi criteri della Programmazione.'}</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          ${aperta.team !== 'personalizzata' ? `<button class="btn-primary" id="att-auto" style="height:44px;">⚡ COMPILAZIONE AUTOMATICA</button>` : ''}
          <button class="btn-primary" id="att-manuale" style="height:44px;">✏️ COMPILAZIONE MANUALE</button>
          <button class="btn-primary" id="att-pdf" style="height:44px;">📄 GENERA PDF COMPILAZIONE</button>
        </div>
        <div id="att-manifesto"></div>
      </div>`;

    document.getElementById('att-chiudi').onclick = async () => {
      if (!confirm('Chiudere l\'attivazione? Non sarà più possibile rispondere.')) return;
      await supabase.from('attivazioni').update({ chiusa: true }).eq('id', aperta.id);
      attivazioneId = null; attivazioneTeam = null;
      disegna();
    };
    document.getElementById('att-pdf').onclick = async () => {
      const membri = await caricaManifestoAttivazione(aperta.id);
      if (!membri.length) { alert('Il manifesto Composizione è vuoto: fai prima la compilazione (automatica o manuale).'); return; }
      generaPdfManifesto({ team: aperta.team }, membri).catch(err => alert('Errore PDF: ' + err.message));
    };
    const btnAuto = document.getElementById('att-auto');
    if (btnAuto) btnAuto.onclick = () => compilazioneAutomaticaAttivazione(aperta, disegna);
    document.getElementById('att-manuale').onclick = () => apriCompilazioneManualeAttivazione(aperta, cont.querySelector('#att-manifesto'), disegna, aperta.team === 'personalizzata');
  };

  await disegna();
  canaleRealtime = supabase.channel('att-adm')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'risposte_attivazione' }, disegna)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attivazioni' }, disegna)
    .subscribe();
}

async function caricaManifestoAttivazione(attId) {
  const { data } = await supabase.from('manifesti_membri')
    .select('posto, profili(nome, cognome)')
    .eq('manifesto_id', (await supabase.from('manifesti').select('id').eq('attivazione_id', attId).maybeSingle()).data?.id || '00000000-0000-0000-0000-000000000000');
  return data || [];
}

async function assicuraManifesto(attId, team) {
  const { data: esiste } = await supabase.from('manifesti').select('id').eq('attivazione_id', attId).maybeSingle();
  if (esiste) return esiste.id;
  const { data: nuovo, error } = await supabase.from('manifesti')
    .insert({ attivazione_id: attId, team }).select().single();
  if (error) throw error;
  return nuovo.id;
}

async function compilazioneAutomaticaAttivazione(att, dopo) {
  const meseCorrente = new Date().toISOString().slice(0, 7) + '-01';
  const { data: prog } = await supabase.from('programmi_mensili')
    .select('id, programmi_membri(operatore_id, posto)')
    .eq('mese', meseCorrente).eq('team', att.team).maybeSingle();
  if (!prog || !prog.programmi_membri?.length) {
    alert(`Nessun programma trovato per la squadra ${att.team === 'alpha' ? 'ALPHA' : 'BRAVO'} di ${meseIt(meseCorrente)}. Compila prima la Programmazione mensile oppure usa la compilazione manuale.`);
    return;
  }
  const manifestId = await assicuraManifesto(att.id, att.team);
  await supabase.from('manifesti_membri').delete().eq('manifesto_id', manifestId);
  const { error } = await supabase.from('manifesti_membri')
    .insert(prog.programmi_membri.map(m => ({ manifesto_id: manifestId, operatore_id: m.operatore_id, posto: m.posto })));
  if (error) { alert('Errore: ' + error.message); return; }
  alert(`⚡ Manifesto Composizione precompilato dal programma ${att.team === 'alpha' ? 'ALPHA' : 'BRAVO'} di ${meseIt(meseCorrente)}: ${prog.programmi_membri.length}/38 posti.\n\nPuoi ripremere COMPILAZIONE AUTOMATICA per aggiornarlo, correggerlo con la manuale, o generare il PDF.`);
  if (dopo) dopo();
}

async function apriCompilazioneManualeAttivazione(att, contenitore, dopo, soloRispondentiSi) {
  const manifestId = await assicuraManifesto(att.id, att.team);
  const [pers, membri, risposte, mantRes] = await Promise.all([
    supabase.from('profili').select('id, nome, cognome, patente, grado').order('cognome'),
    supabase.from('manifesti_membri').select('*, profili(nome, cognome, patente, grado)').eq('manifesto_id', manifestId),
    soloRispondentiSi
      ? supabase.from('risposte_attivazione').select('operatore_id').eq('attivazione_id', att.id).eq('risposta', 'si')
      : Promise.resolve({ data: null }),
    caricaOreMantenimenti()
  ]);
  const oreMan = mantRes || {};
  const sottoSogliaMan = (opId) => (oreMan[opId] || 0) < 24;
  const idSi = new Set((risposte.data || []).map(r => r.operatore_id));
  const tutti = (pers.data || []).filter(o => !soloRispondentiSi || idSi.has(o.id) || (membri.data || []).some(m => m.operatore_id === o.id));
  const perPosto = {};
  (membri.data || []).forEach(m => { perPosto[m.posto] = m; });
  const occupati = new Set((membri.data || []).map(m => m.operatore_id));
  const idCapi = new Set((tutti.filter(o => o.grado && ['CRE','CR','CSE','CS'].includes(o.grado))).map(o => o.id));
  const iconeSpecAtt = (o) => (o ? specIcone(o) : '');

  const rigaPosto = (p) => {
    const occ = perPosto[p.n];
    let cella = '';
    if (occ) {
      cella = `<span style="font-weight:700;">${esc(occ.profili?.cognome)} ${esc(occ.profili?.nome)}${iconeSpecAtt(occ.profili)}</span>
        <button class="pill rosso" data-mvuota="${occ.id}" style="border:none; cursor:pointer;">✖</button>`;
    } else {
      cella = `<div style="position:relative; width:min(460px, 68%);">
          <input id="mcerca-${p.n}" placeholder="Cerca nome…" autocomplete="off"
            style="width:100%; height:38px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; font-size:13px;">
          <div id="mlista-${p.n}" style="display:none; position:absolute; top:40px; left:0; right:0; background:#fff; border:1px solid var(--bordo); border-radius:10px; box-shadow:0 8px 20px rgba(0,0,0,0.15); z-index:40; max-height:240px; overflow-y:auto;"></div>
        </div>
        <input type="hidden" id="mposto-${p.n}">
        <button class="btn-primary" data-minserti="${p.n}" style="height:38px; font-size:12px;">➕</button>`;
    }
    return `
    <div style="display:flex; gap:10px; align-items:center; padding:6px 0; border-top:1px solid var(--bordo);">
      <span style="width:28px; font-weight:800; color:${p.spec || p.ros ? 'var(--rosso)' : 'var(--grigio)'};">${p.n}</span>
      <span style="flex:1; font-size:13px;">${esc(p.t)}</span>
      ${cella}
    </div>`;
  };

  contenitore.innerHTML = `
    <div style="margin-top:16px; border-top:2px solid var(--bordo); padding-top:12px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
        <div style="font-weight:700;">✏️ Compilazione manuale (${(membri.data || []).length}/38)</div>
        <button class="btn-primary" id="att-man-chiudi" style="height:36px; background:var(--grigio-ch);">✖️ Chiudi maschera</button>
      </div>
      ${SEZIONI_MODULO.map(s => `
      <div style="margin-bottom:12px;">
        <div style="font-weight:800; font-size:12px; color:var(--grigio); margin:8px 0;">${s.t}</div>
        ${s.posti.map(rigaPosto).join('')}
      </div>`).join('')}
    </div>`;

  const ripulisci = (n) => {
    const c = document.getElementById(`mcerca-${n}`); const h = document.getElementById(`mposto-${n}`);
    if (c) c.value = ''; if (h) h.value = '';
  };
  contenitore.querySelectorAll('[data-mvuota]').forEach(b => b.onclick = async () => {
    await supabase.from('manifesti_membri').delete().eq('id', b.dataset.mvuota);
    apriCompilazioneManualeAttivazione(att, contenitore, dopo, soloRispondentiSi);
  });
  contenitore.querySelectorAll('input[id^="mcerca-"]').forEach(inp => {
    const n = inp.id.replace('mcerca-', '');
    const lista = document.getElementById(`mlista-${n}`);
    const ros = TUTTI_POSTI.find(pp => pp.n === Number(n))?.ros;
    inp.oninput = () => {
      const q = inp.value.trim().toLowerCase();
      const giaScelti = new Set();
      contenitore.querySelectorAll('input[id^="mposto-"]').forEach(c => { if (c.value) giaScelti.add(c.value); });
      let idonei = tutti.filter(o => {
        if (giaScelti.has(o.id)) return false;
        if (ros && idCapi.has(o.id)) return true;
        const p = TUTTI_POSTI.find(pp => pp.n === Number(n));
        if (p?.spec) return idSpec(p.spec).has(o.id);
        return true;
      });
      if (ros) idonei = idonei.concat(tutti.filter(o => idCapi.has(o.id) && !giaScelti.has(o.id) && !idonei.includes(o)));
      const filtrati = idonei.filter(o => !q || `${o.cognome} ${o.nome}`.toLowerCase().includes(q));
      filtrati.sort((a, b) => (sottoSogliaMan(a.id) - sottoSogliaMan(b.id)) || (ros ? (idCapi.has(b.id) - idCapi.has(a.id)) : 0) || a.cognome.localeCompare(b.cognome));
      let html = '';
      let ultimoCapo = null;
      filtrati.forEach(o => {
        const capo = ros && idCapi.has(o.id);
        if (ros && capo !== ultimoCapo) {
          html += `<div style="padding:4px 10px; font-size:11px; font-weight:700; color:${capo ? '#059669' : '#94A3B8'};">${capo ? '⭐ CAPI SQUADRA' : 'ALTRI'}</div>`;
          ultimoCapo = capo;
        }
        const pat = o.patente ? ' 🚚' + esc(o.patente) : '';
        html += `<div data-mscelta="${o.id}" data-n="${n}" style="padding:10px 12px; font-size:15px; cursor:pointer; border-top:1px solid #F1F5F9; ${sottoSogliaMan(o.id) ? 'color:var(--rosso); background:#FEF2F2;' : ''}">${capo ? '⭐ ' : ''}${esc(o.cognome)} ${esc(o.nome)}${iconeSpecAtt(o)}${pat}${sottoSogliaMan(o.id) ? ' ⚠️ MAN.' : ''} ${simboloVigile(o, 20)}</div>`;
      });
      lista.innerHTML = html || '<div style="padding:10px; color:var(--grigio); font-size:13px;">Nessun risultato</div>';
      lista.style.display = 'block';
      selezioneTouch(lista, '[data-mscelta]', (d) => {
        document.getElementById(`mposto-${n}`).value = d.dataset.mscelta;
        inp.value = d.textContent.trim();
        lista.style.display = 'none';
      });
    };
    inp.onblur = () => setTimeout(() => lista.style.display = 'none', 200);
  });
  contenitore.querySelectorAll('[data-minserti]').forEach(b => b.onclick = async () => {
    const n = Number(b.dataset.minserti);
    const opId = document.getElementById(`mposto-${n}`)?.value;
    if (!opId) { alert('Cerca e seleziona un nome per il posto ' + n); return; }
    const { error } = await supabase.from('manifesti_membri')
      .insert({ manifesto_id: manifestId, operatore_id: opId, posto: n });
    if (error) { alert('Errore: ' + error.message); return; }
    ripulisci(n);
    apriCompilazioneManualeAttivazione(att, contenitore, dopo, soloRispondentiSi);
  });
  document.getElementById('att-man-chiudi').onclick = () => { contenitore.innerHTML = '' };
}

/* ============ MANTENIMENTI ============ */

async function pagMantenimenti(el) {
  el.innerHTML = `
    <div class="pagina-titolo">🎓 Mantenimenti</div>
    <div class="pagina-sotto">Registro ore e validazione</div>
    <div id="man-cont">Caricamento…</div>`;
  const anno = new Date().getFullYear();
  const [impo, tutti] = await Promise.all([
    supabase.from('impostazioni').select('valore').eq('chiave', 'soglia_ore_mantenimenti').limit(1).maybeSingle(),
    supabase.from('mantenimenti').select('*, profili!mantenimenti_operatore_id_fkey(nome, cognome)').order('data', { ascending: false })
  ]);
  const soglia = Number(impo?.data?.valore) || 24;
  const cont = document.getElementById('man-cont');
  if (tutti.error) {
    cont.innerHTML = `<div class="card" style="border-left:4px solid var(--rosso);">
      <b>⚠️ Errore caricamento mantenimenti</b>
      <div style="font-size:13px; color:var(--rosso-tx); margin-top:6px;">${esc(tutti.error.message)}</div>
      <div style="font-size:12px; color:var(--grigio); margin-top:6px;">Codice: ${esc(tutti.error.code || 'n/d')} · Dettaglio: ${esc(tutti.error.details || 'n/d')}</div>
    </div>`;
    return;
  }

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
        <div style="font-weight:700; margin-bottom:12px;">🟡 CODA DI VALIDAZIONE — richieste in attesa (${coda.length})</div>
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
          <div style="font-weight:700;">Ore valide ${anno} <span style="font-size:11px; color:var(--grigio); font-weight:400;">(${(tutti.data || []).length} righe caricate)</span></div>
          <div style="font-weight:800; font-size:22px; color:${coloreStato};">${totOre} / ${soglia} h</div>
        </div>
        <div class="barra"><div style="width:${pct}%; background:${coloreStato};"></div></div>
        ${totOre < soglia ? `<div style="font-size:12px; color:var(--rosso-tx); margin-top:6px;">⚠️ Sotto soglia: mancano ${soglia - totOre} ore.</div>` : `<div style="font-size:12px; color:var(--verde-tx); margin-top:6px;">✅ Soglia raggiunta.</div>`}
      </div>

      ${inVal.length ? `
      <div class="card" style="margin-bottom:24px; border-left:4px solid var(--ambra);">
        <div style="font-weight:700; margin-bottom:12px;">🟡 IN ATTESA DI APPROVAZIONE (${inVal.length})</div>
        ${inVal.map(m => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--bordo);">
            <div>
              <div style="font-weight:600;">🟡 ${esc(m.tipo)} — ${Number(m.ore)} h</div>
              <div style="font-size:13px; color:var(--grigio);">${fmtData(m.data)} · ${esc(m.argomento)}</div>
              <div style="font-size:12px; color:var(--ambra-tx); font-weight:600;">In attesa di approvazione dell'admin</div>
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
              <th style="padding:8px 0;">Data</th><th>Tipo</th><th>Argomento</th><th style="text-align:right;">Ore</th><th style="text-align:right;">Stato</th>
            </tr>
            ${storico.map(m => `
              <tr style="border-top:1px solid var(--bordo);">
                <td style="padding:8px 0;">${fmtData(m.data)}</td>
                <td>${esc(m.tipo)}</td>
                <td>${esc(m.argomento)}</td>
                <td style="text-align:right; font-weight:700;">${Number(m.ore)}</td>
                <td style="text-align:right;">🟢</td>
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

async function schedaOperatore(el, o, oreMan) {
  const sonoAdmin = utente.ruolo === 'admin';
  // PRIVACY (regola utente 24/10): chi NON è admin vede solo i dati non sensibili

  if (utente.ruolo === 'admin' && o.id !== utente.id) {
    supabase.rpc('registra_consultazione', { target: o.id }).then(() => {}, () => {});
  }
  const [specRes, mantRes, progRes] = await Promise.all([
    supabase.from('operatori_specializzazioni').select('specializzazioni(nome)').eq('operatore_id', o.id),
    supabase.from('mantenimenti').select('ore, ore_conteggiate, data, stato').eq('operatore_id', o.id).eq('stato', 'approvato'),
    supabase.from('programmi_membri').select('posto, programmi_mensili(mese, team)').eq('operatore_id', o.id).limit(50)
  ]);
  if (specRes.error || mantRes.error || progRes.error) {
    const err = specRes.error || mantRes.error || progRes.error;
    el.innerHTML += `<div class="card" style="border-left:4px solid var(--rosso);"><b>⚠️ Errore caricamento scheda</b><div style="font-size:13px; color:var(--rosso-tx); margin-top:6px;">${esc(err.message)}</div><div style="font-size:12px; color:var(--grigio); margin-top:6px;">Codice: ${esc(err.code || 'n/d')}</div></div>`;
    return;
  }
  const anno = new Date().getFullYear();
  const mantAnno = (mantRes.data || []).filter(m => String(m.data).startsWith(anno));
  const oreAnno = mantAnno.reduce((s, m) => s + Number(m.ore ?? 0), 0);
  const oreContAnno = mantAnno.reduce((s, m) => s + Number(m.ore_conteggiate ?? m.ore ?? 0), 0);

  const riga = (label, valore) => valore ? `<tr><td style="padding:7px 10px; color:var(--grigio); font-size:13px; white-space:nowrap; border-top:1px solid var(--bordo);">${label}</td><td style="padding:7px 10px; border-top:1px solid var(--bordo); font-weight:600;">${esc(valore)}</td></tr>` : '';

  el.innerHTML = `
    <div class="pagina-titolo">👥 Gestione Operatori</div>
    <button class="link" id="op-indietro" style="padding:0; margin:6px 0 16px; font-size:14px;">← Torna all'elenco</button>
    <div class="card" style="max-width:680px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
        <div style="display:flex; align-items:center; gap:14px;">
          ${await avatarHtml(o, 72, 24)}
          <div>
            <div style="font-size:24px; font-weight:800;">${esc(o.cognome)} ${esc(o.nome)} ${simboloVigile(o, 24)}</div>
            <div style="color:var(--grigio); font-size:13px;">${o.grado ? esc(o.grado) + ' · ' : ''}${o.ruolo === 'admin' ? '⭐ Amministratore' : 'Operatore'}</div>
          </div>
        </div>
        ${sonoAdmin ? (o.ruolo !== 'admin' ? `<button class="btn-primary" id="op-promuovi" style="background:var(--rosso); height:44px;">⭐ RENDI AMMINISTRATORE</button>` : `<button class="btn-primary" id="op-revoca" style="background:var(--grigio-ch); height:44px;">➖ REVOCA ADMIN</button>`) : ''}
      </div>

      ${sonoAdmin ? `
      <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn-primary" id="op-elimina" style="background:#fff; color:var(--rosso); border:1px solid var(--rosso); height:40px; font-size:13px;">🗑️ ELIMINA ACCOUNT</button>
        <button class="btn-primary" id="op-log" style="background:#fff; color:var(--grigio); border:1px solid var(--bordo); height:40px; font-size:13px;">📋 Registro attività admin</button>
      </div>` : ''}
      <div id="op-log-box" style="display:none; margin-top:12px; padding:10px; border:1px solid var(--bordo); border-radius:10px; overflow-x:auto;"></div>

      <table style="width:100%; border-collapse:collapse;">
        ${riga('Email', o.email)}
        ${sonoAdmin ? `${riga('Cellulare', o.cellulare)}` : ''}
        ${riga('Comando', o.comando)}
        ${riga('Sede di servizio', o.sede)}
        ${riga('Turno / salto', o.salto_turno || o.turno)}
        ${riga('Grado', o.grado)}
        ${riga('Patente', o.patente ? o.patente + (o.estensioni_patente?.length ? ' + ' + o.estensioni_patente.join(', ') : '') : '')}
        ${riga('TPSS (soccorso sanitario)', o.tpss ? 'Sì' : '')}
        ${riga('TAS', o.tas ? 'Livello ' + o.tas : '')}
        ${sonoAdmin ? `${riga('Gruppo sanguigno', o.gruppo_sanguigno)}` : ''}
        ${sonoAdmin ? `${riga('Indirizzo', o.indirizzo)}` : ''}
        ${sonoAdmin ? `${riga('Medico curante', o.medico_curante)}` : ''}
        ${sonoAdmin ? `${riga('Contatto ICE', o.contatto_ice_nome ? `${o.contatto_ice_nome} (${esc(o.contatto_ice_relazione || '')}) · ${o.contatto_ice_telefono || ''}` : '')}` : ''}
        ${riga('Specializzazioni', specIcone(o, true).nomi.join(', '))}
        ${sonoAdmin ? `${riga('Telegram', o.telegram_chat_id ? '✅ Collegato' : '')}` : ''}
        ${sonoAdmin ? `${riga('Mantenimenti ' + anno, oreContAnno ? oreContAnno + ' ore conteggiate' + (oreContAnno !== oreAnno ? ' (su ' + oreAnno + ' approvate)' : '') + ((oreMan[o.id] || 0) < 24 ? ' ⚠️ sotto soglia' : ' ✅ in linea') : '')}` : ''}
      </table>

      ${(progRes.data || []).length ? `
      <div style="margin-top:18px;">
        <div style="font-weight:700; margin-bottom:8px;">🗓️ Ultimi inserimenti in squadra</div>
        ${(progRes.data || []).sort((a, b) => String(b.programmi_mensili?.mese || '').localeCompare(String(a.programmi_mensili?.mese || ''))).slice(0, 6).map(m => `<div style="font-size:13px; padding:4px 0; border-top:1px solid var(--bordo);">${meseIt(m.programmi_mensili?.mese)} — <b>${m.programmi_mensili?.team === 'alpha' ? 'ALPHA' : 'BRAVO'}</b> · posto ${m.posto}</div>`).join('')}
      </div>` : ''}
    </div>`;

  document.getElementById('op-indietro').onclick = () => {
    if (history.state?.scheda) { history.back(); }
    else { history.replaceState({ pagina: 'operatori' }, '', '#/operatori'); pagOperatori(el); }
  };
  const mostraLog = document.getElementById('op-log');
  if (mostraLog) mostraLog.onclick = async () => {
    const box = document.getElementById('op-log-box');
    if (box.style.display === 'block') { box.style.display = 'none'; return; }
    box.innerHTML = 'Caricamento…';
    box.style.display = 'block';
    const { data, error } = await supabase.from('log_admin').select('*, profili(cognome, nome)').order('creato_il', { ascending: false }).limit(50);
    if (error) { box.innerHTML = `<div style="color:var(--rosso); font-size:13px;">⚠️ Errore caricamento log: ${esc(error.message)}</div>`; return; }
    box.innerHTML = (data || []).length ? `
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        <tr style="text-align:left; color:var(--grigio);"><th style="padding:6px 8px;">Data</th><th style="padding:6px 8px;">Azione</th><th style="padding:6px 8px;">Operatore</th><th style="padding:6px 8px;">Da parte di</th></tr>
        ${data.map(l => `<tr style="border-top:1px solid var(--bordo);">
          <td style="padding:6px 8px; white-space:nowrap;">${new Date(l.creato_il).toLocaleString('it-IT')}</td>
          <td style="padding:6px 8px; font-weight:700;">${l.azione === 'promozione_admin' ? '⭐ Promozione admin' : l.azione === 'revoca_admin' ? '➖ Revoca admin' : '🗑️ Eliminazione account'}</td>
          <td style="padding:6px 8px;">${esc(l.dettaglio || '')}</td>
          <td style="padding:6px 8px;">${esc((l.profili?.cognome || '') + ' ' + (l.profili?.nome || ''))}</td>
        </tr>`).join('')}
      </table>` : '<div style="color:var(--grigio); font-size:13px;">Nessuna azione registrata.</div>';
  };
  const btnP = document.getElementById('op-promuovi');
  if (btnP) btnP.onclick = async () => {
    if (!confirm(`Promuovere ${o.cognome} ${o.nome} ad AMMINISTRATORE? Potrà gestire squadre, validare mantenimenti e lanciare allerte.`)) return;
    const { error } = await supabase.from('profili').update({ ruolo: 'admin' }).eq('id', o.id);
    if (error) { alert('Errore: ' + error.message + (error.code === '42501' ? ' — la promozione è bloccata dal sistema di sicurezza. Contatta l\'assistenza.' : '')); return; }
    alert('⭐ ' + o.cognome + ' ' + o.nome + ' è ora amministratore.');
    pagOperatori(el);
  };
  const btnR = document.getElementById('op-revoca');
  if (btnR) btnR.onclick = async () => {
    if (o.id === utente.id) { alert('Non puoi revocare te stesso: sarebbe un problema se restasse fuori.'); return; }
    if (!confirm(`Revocare i privilegi di amministratore a ${o.cognome} ${o.nome}?`)) return;
    const { error } = await supabase.from('profili').update({ ruolo: 'operatore' }).eq('id', o.id);
    if (error) { alert('Errore: ' + error.message); return; }
    alert(o.cognome + ' ' + o.nome + ' è ora operatore.');
    pagOperatori(el);
  };
  const btnE = document.getElementById('op-elimina');
  if (btnE) btnE.onclick = async () => {
    if (o.id === utente.id) { alert('Non puoi eliminare il tuo account.'); return; }
    const motivo = prompt(`Eliminare DEFINITIVAMENTE l'account di ${o.cognome} ${o.nome}?\nVerranno cancellati profilo, mantenimenti, ferie, specializzazioni e risposte.\n\nQuesta azione è irreversibile e verrà registrata nel log.\n\nInserisci la TUA password per confermare:`);
    if (motivo === null) return;
    const { data, error: errA } = await supabase.auth.signInWithPassword({ email: utente.email, password: motivo });
    if (errA || !data?.session) { alert('Password errata: eliminazione annullata.'); return; }
    const { error: errDel } = await supabase.rpc('elimina_operatore', { target: o.id });
    if (errDel) { alert('Eliminazione fallita: ' + errDel.message); return; }
    if (o.foto_path) supabase.storage.from('foto-profili').remove([o.foto_path]).then(() => {}, () => {});
    alert('Account eliminato.');
    pagOperatori(el);
  };
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

const COMANDI_ELENCO = ['DIREZIONE REGIONALE VENETO','VENEZIA','PADOVA','TREVISO','VERONA','VICENZA','BELLUNO','ROVIGO','UDINE','PORDENONE','TRIESTE','GORIZIA'];
let SEDI_TUTTE = [];
async function caricaSedi() {
  if (SEDI_TUTTE.length) return SEDI_TUTTE;
  const { data } = await supabase.from('sedi').select('comando, sede').order('sede');
  SEDI_TUTTE = data || [];
  return SEDI_TUTTE;
}

async function pagProfilo(el) {
  const TURNI = ['A', 'B', 'C', 'D', 'G'];
  const SALTI = [];
  for (const t of TURNI) for (let n = 1; n <= 8; n++) SALTI.push(t + n);
  const mioAvatar = await avatarHtml(utente, 72, 24);
  el.innerHTML = `
    <div class="pagina-titolo">👤 Profilo</div>
    <div class="pagina-sotto">${esc(utente.email)} — ruolo: ${esc(utente.ruolo)}</div>
    <div class="card" style="max-width:600px; margin-bottom:20px;">
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:14px;">
        ${mioAvatar}
        <div>
          <div style="font-weight:700; margin-bottom:6px;">📷 Foto profilo</div>
          <input type="file" id="p-foto" accept="image/*" style="display:none;">
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn-primary" id="p-foto-scegli" style="height:38px; font-size:13px; max-width:220px;">Carica una foto</button>
            ${utente.foto_path ? '<button class="btn-primary" id="p-foto-rimuovi" style="height:38px; font-size:13px; max-width:220px; background:#fff; color:var(--rosso); border:1px solid var(--rosso);">Rimuovi</button>' : ''}
          </div>
          <div style="font-size:11px; color:var(--grigio); margin-top:6px;">Visibile a tutti gli operatori al posto delle iniziali</div>
        </div>
      </div>
      <div id="p-foto-msg" style="display:none; margin-bottom:10px; font-size:13px;"></div>
    </div>
    <div class="card" style="max-width:600px; margin-bottom:20px;">
      <div style="font-weight:700; margin-bottom:14px;">📄 Dati anagrafici</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div style="grid-column:1 / -1;">
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Nome e cognome</label>
          <div style="height:44px; display:flex; align-items:center; border:1px dashed var(--bordo); border-radius:10px; padding:0 10px; background:#F8FAFC; font-weight:600;">${esc(((utente.cognome || '') + ' ' + (utente.nome || '')).trim())}</div>
          <div style="font-size:11px; color:var(--grigio); margin-top:4px;">Nome e cognome sono gestiti dall'amministrazione: per correggerli scrivi a un admin</div>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Grado</label>
          <select id="p-grado" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
            <option value="">—</option>
            ${['D','VD','IA','CRE','CR','CSE','CS','VC','VE','VF'].map(g => `<option ${utente.grado === g ? 'selected' : ''}>${g}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Data di nascita</label>
          <input type="date" id="p-nascita" value="${esc((utente.data_nascita || '').slice(0,10))}" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Luogo di nascita</label>
          <input id="p-luogo" value="${esc(utente.luogo_nascita || '')}" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px;">
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Cellulare</label>
          <input id="p-cell" value="${esc(utente.cellulare || '')}" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px;">
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Telefono (fisso)</label>
          <input id="p-tel" value="${esc(utente.telefono || '')}" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px;">
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Email di servizio</label>
          <input id="p-email-servizio" value="${esc(utente.email_servizio || '')}" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px;">
        </div>
      </div>
      <div style="font-weight:700; margin:16px 0 10px;">🩸 Dati sensibili (visibili solo agli amministratori)</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Gruppo sanguigno</label>
          <input id="p-sangue" value="${esc(utente.gruppo_sanguigno || '')}" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px;">
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Medico curante</label>
          <input id="p-medico" value="${esc(utente.medico_curante || '')}" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px;">
        </div>
        <div style="grid-column:1 / -1;">
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Indirizzo di residenza</label>
          <input id="p-indirizzo" value="${esc(utente.indirizzo || '')}" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px;">
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Contatto ICE — nome</label>
          <input id="p-ice-nome" value="${esc(utente.contatto_ice_nome || '')}" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px;">
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Contatto ICE — telefono</label>
          <input id="p-ice-tel" value="${esc(utente.contatto_ice_telefono || '')}" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px;">
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Contatto ICE — relazione</label>
          <input id="p-ice-rel" value="${esc(utente.contatto_ice_relazione || '')}" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px;">
        </div>
      </div>
      <div class="successo" id="p-ok-ana" style="margin-top:14px;">Dati anagrafici salvati.</div>
      <button class="btn-primary" id="p-salva-ana" style="max-width:220px; height:46px; margin-top:14px;">SALVA ANAGRAFICA</button>
    </div>
    <div class="card" style="max-width:600px; margin-bottom:20px;">
      <div style="font-weight:700; margin-bottom:6px;">🎖 Specializzazioni e patenti</div>
      <div style="font-size:12px; color:var(--grigio); margin-bottom:14px;">Le specializzazioni sono usate nelle tendine della programmazione e per la copertura dei requisiti del modulo</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Patente (mezzi)</label>
          <select id="p-patente" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
            <option value="">Nessuna</option>
            ${['3°','4°'].map(x => `<option ${utente.patente === x ? 'selected' : ''}>${x}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Estensioni patente</label>
          <div style="display:flex; gap:10px; flex-wrap:wrap; padding-top:10px;">
            ${['Autoscala','Autogru','Anfibio'].map(e => `<label style="display:flex; align-items:center; gap:5px; font-size:13px;"><input type="checkbox" class="p-est" value="${e}" ${(utente.estensioni_patente || []).includes(e) ? 'checked' : ''}> ${e}</label>`).join('')}
          </div>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Funzionario</label>
          <select id="p-funz" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
            <option value="no">No</option><option value="si" ${utente.sp_funzionario ? 'selected' : ''}>Sì</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Staff</label>
          <select id="p-staff" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
            <option value="no">No</option><option value="si" ${utente.sp_staff ? 'selected' : ''}>Sì</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Logista</label>
          <select id="p-log" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
            <option value="no">No</option><option value="si" ${utente.sp_logista ? 'selected' : ''}>Sì</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Strutturista</label>
          <select id="p-strutt" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
            <option value="no">No</option><option value="si" ${utente.sp_strutturista ? 'selected' : ''}>Sì</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">NBCR (livello)</label>
          <select id="p-nbcr" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
            <option value="0">Nessuno</option>
            ${['1','2','3'].map(n => `<option value="${n}" ${String(utente.sp_nbcr || 0) === n ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Estensione NBCR</label>
          <select id="p-nbcr-est" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
            <option value="">—</option>
            ${['NR','LPG','LNG'].map(x => `<option ${utente.sp_nbcr_est === x ? 'selected' : ''}>${x}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Unità cinofila K9</label>
          <select id="p-k9" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
            <option value="no">No</option><option value="si" ${utente.sp_k9 ? 'selected' : ''}>Sì</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">SAF</label>
          <select id="p-saf" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
            <option value="">Nessuno</option>
            ${['1A','1B - BASICO','2A - AVANZATO'].map(x => `<option ${utente.sp_saf === x ? 'selected' : ''}>${x}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">TAS (soccorso sanitario)</label>
          <select id="p-tas" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
            <option value="">No</option>
            <option value="1" ${String(utente.tas || '') === '1' ? 'selected' : ''}>Livello 1</option>
            <option value="2" ${String(utente.tas || '') === '2' ? 'selected' : ''}>Livello 2</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">SAPR (drone)</label>
          <select id="p-sapr" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
            <option value="no">No</option><option value="si" ${utente.sp_sapr ? 'selected' : ''}>Sì</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Medico</label>
          <select id="p-med" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
            <option value="no">No</option><option value="si" ${utente.sp_medico ? 'selected' : ''}>Sì</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Infermiere</label>
          <select id="p-inf" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
            <option value="no">No</option><option value="si" ${utente.sp_infermiere ? 'selected' : ''}>Sì</option>
          </select>
        </div>
      </div>
      <div class="successo" id="p-ok-spec" style="margin-top:14px;">Specializzazioni salvate.</div>
      <button class="btn-primary" id="p-salva-spec" style="max-width:240px; height:46px; margin-top:14px;">SALVA SPECIALIZZAZIONI</button>
    </div>
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
            ${COMANDI_ELENCO.map(c => `<option ${utente.comando === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="font-size:12px; font-weight:600; color:var(--grigio);">Sede di servizio</label>
          <select id="p-sede" style="width:100%; height:44px; border:1px solid var(--bordo); border-radius:10px; padding:0 10px; background:#fff;">
            <option value="">—</option>
            <option ${utente.sede ? 'selected' : ''}>${esc(utente.sede || '')}</option>
          </select>
        </div>
      </div>
      <div class="successo" id="p-ok" style="margin-top:14px;">Dati salvati.</div>
      <button class="btn-primary" id="p-salva" style="max-width:200px; height:46px; margin-top:14px;">SALVA</button>
    </div>
    <div class="card" style="max-width:600px; margin-bottom:20px;">
      <div style="font-weight:700; margin-bottom:10px;">👀 Chi ha consultato la tua scheda</div>
      <div id="p-consultazioni" style="font-size:13px; color:var(--grigio);">Caricamento…</div>
      <div style="font-size:11px; color:var(--grigio); margin-top:8px;">Ogni volta che un amministratore apre la tua scheda, la consultazione viene registrata. È la tua garanzia di trasparenza prevista dall'informativa privacy.</div>
    </div>
    <div class="card" style="max-width:600px;">
      <div style="font-weight:700; margin-bottom:10px;">🤖 Collega Telegram</div>
      <p style="font-size:14px; color:var(--grigio);">Apri il bot su Telegram, premi AVVIA e invia il codice che compare qui sotto.</p>
      <div id="tg-box" style="margin-top:16px; text-align:center;">
        <button class="btn-primary" id="gen-codice" style="max-width:280px;">Genera codice di collegamento</button>
      </div>
    </div>`;
  document.getElementById('p-ok').style.display = 'none';
  // SEDI a cascata: scelgo il comando → vedo solo le sue sedi
  const comandoSel = document.getElementById('p-comando');
  const sedeSel = document.getElementById('p-sede');
  const aggiornaSedi = () => {
    const comando = comandoSel.value;
    const attuale = utente.sede || '';
    const delComando = SEDI_TUTTE.filter(x => x.comando === comando).map(x => x.sede);
    sedeSel.innerHTML = `<option value="">—</option>` + delComando.map(sd =>
      `<option ${attuale === sd ? 'selected' : ''}>${esc(sd)}</option>`).join('');
  };
  await caricaSedi();
  aggiornaSedi();
  comandoSel.onchange = () => { aggiornaSedi(); };
  // TURNO G: niente salto — selezionando G il salto si svuota e si disattiva
  const turnoSel = document.getElementById('p-turno');
  const saltoSel = document.getElementById('p-salto');
  const aggiornaSalto = () => {
    if (turnoSel.value === 'G') {
      saltoSel.value = '';
      saltoSel.disabled = true;
      saltoSel.style.background = '#F1F5F9';
    } else {
      saltoSel.disabled = false;
      saltoSel.style.background = '#fff';
    }
  };
  turnoSel.onchange = () => { aggiornaSalto(); };
  aggiornaSalto();
  const fotoMsg = document.getElementById('p-foto-msg');
  const mostraFotoMsg = (testo, err) => {
    fotoMsg.textContent = testo;
    fotoMsg.style.color = err ? 'var(--rosso)' : 'var(--verde-tx, #065F46)';
    fotoMsg.style.display = 'block';
    setTimeout(() => fotoMsg.style.display = 'none', 4000);
  };
  document.getElementById('p-foto-scegli').onclick = () => document.getElementById('p-foto').click();
  document.getElementById('p-foto').onchange = async (ev) => {
    const file = ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { mostraFotoMsg('Formato non valido: usa JPG, PNG o WebP.', true); return; }
    if (file.size > 2 * 1024 * 1024) { mostraFotoMsg('Foto troppo grande (max 2 MB).', true); return; }
    const path = `${utente.id}/foto`;
    const { error: errUp } = await supabase.storage.from('foto-profili').upload(path, file, { upsert: true });
    if (errUp) { mostraFotoMsg('Errore caricamento: ' + errUp.message, true); return; }
    const { error: errUpd } = await supabase.from('profili').update({ foto_path: path }).eq('id', utente.id);
    if (errUpd) { mostraFotoMsg('Errore salvataggio profilo: ' + errUpd.message, true); return; }
    utente.foto_path = path;
    mostraFotoMsg('✅ Foto caricata.');
    pagProfilo(el);
  };
  const btnRf = document.getElementById('p-foto-rimuovi');
  if (btnRf) btnRf.onclick = async () => {
    if (!confirm('Rimuovere la foto profilo?')) return;
    supabase.storage.from('foto-profili').remove([utente.foto_path]).then(() => {}, () => {});
    const { error } = await supabase.from('profili').update({ foto_path: null }).eq('id', utente.id);
    if (error) { mostraFotoMsg('Errore: ' + error.message, true); return; }
    utente.foto_path = null;
    pagProfilo(el);
  };
  document.getElementById('p-ok-ana').style.display = 'none';
  document.getElementById('p-ok-spec').style.display = 'none';
  document.getElementById('p-salva-ana').onclick = async () => {
    const { error } = await supabase.from('profili').update({
      grado: document.getElementById('p-grado').value,
      data_nascita: document.getElementById('p-nascita').value || null,
      luogo_nascita: document.getElementById('p-luogo').value.trim() || null,
      cellulare: document.getElementById('p-cell').value.trim() || null,
      telefono: document.getElementById('p-tel').value.trim() || null,
      email_servizio: document.getElementById('p-email-servizio').value.trim() || null,
      gruppo_sanguigno: document.getElementById('p-sangue').value.trim() || null,
      medico_curante: document.getElementById('p-medico').value.trim() || null,
      indirizzo: document.getElementById('p-indirizzo').value.trim() || null,
      contatto_ice_nome: document.getElementById('p-ice-nome').value.trim() || null,
      contatto_ice_telefono: document.getElementById('p-ice-tel').value.trim() || null,
      contatto_ice_relazione: document.getElementById('p-ice-rel').value.trim() || null
    }).eq('id', utente.id);
    if (error) { alert('Errore: ' + error.message); return; }
    Object.assign(utente, {
      grado: document.getElementById('p-grado').value,
      data_nascita: document.getElementById('p-nascita').value || null,
      luogo_nascita: document.getElementById('p-luogo').value.trim() || null,
      cellulare: document.getElementById('p-cell').value.trim() || null,
      telefono: document.getElementById('p-tel').value.trim() || null,
      email_servizio: document.getElementById('p-email-servizio').value.trim() || null,
      gruppo_sanguigno: document.getElementById('p-sangue').value.trim() || null,
      medico_curante: document.getElementById('p-medico').value.trim() || null,
      indirizzo: document.getElementById('p-indirizzo').value.trim() || null,
      contatto_ice_nome: document.getElementById('p-ice-nome').value.trim() || null,
      contatto_ice_telefono: document.getElementById('p-ice-tel').value.trim() || null,
      contatto_ice_relazione: document.getElementById('p-ice-rel').value.trim() || null
    });
    document.getElementById('p-ok-ana').style.display = 'block';
    setTimeout(() => document.getElementById('p-ok-ana').style.display = 'none', 2500);
  };
  document.getElementById('p-salva-spec').onclick = async () => {
    const siNo = id => document.getElementById(id).value === 'si';
    const estPatente = [...document.querySelectorAll('.p-est:checked')].map(c => c.value);
    const { error } = await supabase.from('profili').update({
      patente: document.getElementById('p-patente').value || null,
      estensioni_patente: estPatente,
      sp_funzionario: siNo('p-funz'),
      sp_staff: siNo('p-staff'),
      sp_logista: siNo('p-log'),
      sp_strutturista: siNo('p-strutt'),
      sp_nbcr: Number(document.getElementById('p-nbcr').value) || 0,
      sp_nbcr_est: document.getElementById('p-nbcr-est').value || null,
      sp_k9: siNo('p-k9'),
      sp_saf: document.getElementById('p-saf').value || null,
      tas: document.getElementById('p-tas').value ? Number(document.getElementById('p-tas').value) : null,
      sp_sapr: siNo('p-sapr'),
      sp_medico: siNo('p-med'),
      sp_infermiere: siNo('p-inf')
    }).eq('id', utente.id);
    if (error) { alert('Errore: ' + error.message); return; }
    Object.assign(utente, {
      patente: document.getElementById('p-patente').value || null,
      estensioni_patente: estPatente,
      sp_funzionario: siNo('p-funz'),
      sp_staff: siNo('p-staff'),
      sp_logista: siNo('p-log'),
      sp_strutturista: siNo('p-strutt'),
      sp_nbcr: Number(document.getElementById('p-nbcr').value) || 0,
      sp_nbcr_est: document.getElementById('p-nbcr-est').value || null,
      sp_k9: siNo('p-k9'),
      sp_saf: document.getElementById('p-saf').value || null,
      tas: document.getElementById('p-tas').value ? Number(document.getElementById('p-tas').value) : null,
      sp_sapr: siNo('p-sapr'),
      sp_medico: siNo('p-med'),
      sp_infermiere: siNo('p-inf')
    });
    document.getElementById('p-ok-spec').style.display = 'block';
    setTimeout(() => document.getElementById('p-ok-spec').style.display = 'none', 2500);
  };
  document.getElementById('p-salva').onclick = async () => {
    const { error } = await supabase.from('profili').update({
      turno: document.getElementById('p-turno').value,
      salto_turno: document.getElementById('p-salto').value,
      comando: document.getElementById('p-comando').value,
      salto_turno: document.getElementById('p-turno').value === 'G' ? '' : document.getElementById('p-salto').value,
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
  (async () => {
    const box = document.getElementById('p-consultazioni');
    const { data } = await supabase.from('log_consultazioni')
      .select('creato_il, profili!log_cons_admin_fkey(cognome, nome)')
      .eq('operatore_id', utente.id).order('creato_il', { ascending: false }).limit(10);
    if (!box) return;
    box.innerHTML = (data || []).length
      ? `<ul style="margin-left:18px; line-height:1.9;">${data.map(c => `<li><b>${esc((c.profili?.cognome || '') + ' ' + (c.profili?.nome || ''))}</b> — ${new Date(c.creato_il).toLocaleString('it-IT')}</li>`).join('')}</ul>`
      : 'Nessun amministratore ha consultato la tua scheda finora.';
  })();
  document.getElementById('gen-codice').onclick = async () => {
    const n = String(Math.floor(100000 + Math.random() * 900000));
    const codice = `${n.slice(0,3)}-${n.slice(3)}`;
    const scade = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { error } = await supabase.from('codici_telegram').insert({ operatore_id: utente.id, codice, scade_il: scade });
    if (error) {
      document.getElementById('tg-box').innerHTML = `
        <div style="color:var(--rosso); font-weight:700;">⚠️ Errore salvataggio codice: ${esc(error.message)}</div>
        <p style="font-size:12px; color:var(--grigio);">Se persiste, esegui <b>db/migrazione-telegram.sql</b> in SQL Editor.</p>`;
      return;
    }
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
