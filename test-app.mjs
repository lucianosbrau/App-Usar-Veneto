// TEST AUTOMATICI DELL'APP — da eseguire PRIMA DI OGNI PUBBLICAZIONE:
//   node test-app.mjs
// Se anche UN SOLO test fallisce: NON pubblicare, correggere prima.
// Simula le azioni di un utente vero su un database finto ma fedele
// alla libreria Supabase (query "thenable" SENZA .catch: la forma
// che ha causato il bug delle schede non si può più scrivere per sbaglio).

import { readFileSync, writeFileSync } from 'fs';
import { JSDOM } from 'jsdom';

let passati = 0, falliti = 0;
const check = (nome, cond) => {
  if (cond) { passati++; console.log('  ✅', nome); }
  else { falliti++; console.log('  ❌', nome); }
};

const html = readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { url: 'https://lucianosbrau.github.io/App-Usar-Veneto/', runScripts: 'outside-only', pretendToBeVisual: true });
const { window } = dom;
Object.defineProperty(globalThis, 'document', { value: window.document, configurable: true });
Object.defineProperty(globalThis, 'location', { value: window.location, configurable: true });
Object.defineProperty(globalThis, 'window', { value: window, configurable: true });
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, configurable: true });
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
Object.defineProperty(globalThis, 'history', { value: window.history, configurable: true });
window.matchMedia = () => ({ matches: false, addListener(){}, removeListener(){}, addEventListener(){} });
window.alert = (m) => console.log('  [alert]', m);
window.confirm = () => true;

// ---- database finto FEDELE alla libreria supabase (thenable, no .catch) ----
const OP = [
  { id: 'op0', nome: 'Anna', cognome: 'Verdi', email: 'a@v.it', ruolo: 'admin', comando: 'Padova', grado: 'CS', turno: 'B', salto_turno: 'B3', patente: null, foto_path: null, cellulare: null, gruppo_sanguigno: null },
  { id: 'op1', nome: 'Mario', cognome: 'Rossi', email: 'm@r.it', ruolo: 'operatore', comando: 'Venezia', sede: 'Mestre', grado: 'VC', turno: 'A', salto_turno: 'A2', patente: '3°', foto_path: null, cellulare: '333', gruppo_sanguigno: '0+' },
  { id: 'op2', nome: 'Anna', cognome: 'Verdi', email: 'a@v.it', ruolo: 'admin', comando: 'Padova', sede: 'Padova', grado: 'CS', turno: 'B', salto_turno: 'B3', patente: null, foto_path: 'op2/foto', cellulare: null, gruppo_sanguigno: null },
];
const thenable = (ris) => { const p = Promise.resolve(ris); return { then: p.then.bind(p) }; };
const chain = (data) => {
  const o = {};
  const ris = { data, error: null };
  for (const m of ['select','eq','order','limit','upsert','insert','update','delete','gte','lte','not','in','ilike']) o[m] = () => chain(data);
  o.maybeSingle = async () => ris; o.single = async () => ({ data: Array.isArray(ris.data) ? ris.data[0] : ris.data, error: null });
  o.then = (ok, ko) => Promise.resolve(ris).then(ok, ko);
  return o;
};
globalThis.__SB = {
  from: (t) => {
    const dati = t === 'profili' ? OP
      : t === 'mantenimenti' ? [{ ore: 40, data: '2026-01-10', stato: 'approvato' }]
      : t === 'log_consultazioni' ? [{ creato_il: '2026-10-23T10:00:00Z', profili: { cognome: 'Verdi', nome: 'Anna' } }]
      : [];
    const o = chain(dati);
    o.eq = (c, v) => (c === 'id') ? chain([OP.find(x => x.id === v)].filter(Boolean)) : chain(dati);
    return o;
  },
  rpc: () => thenable({ data: null, error: null }),
  storage: { from: () => ({ remove: () => thenable({}), createSignedUrl: async () => ({ data: { signedUrl: 'https://finta/foto' }, error: null }), upload: async () => ({ error: null }) }) },
  auth: { getSession: async () => ({ data: { session: { user: { id: 'op0', email: 'a@v.it' } } } }), signInWithPassword: async () => ({ data: { session: {} }, error: null }) },
  removeChannel: () => {},
  channel: () => ({ on: () => ({ on: () => ({ subscribe: () => {} }) }) }),
};

const origdir = process.cwd();
const origine = readFileSync('./app/supabase.js', 'utf8');
// MAI sovrascrivere il file vero: si testa su una COPIA in una cartella temporanea
import { mkdtempSync, cpSync } from 'fs';
import { rmSync } from 'fs';
import { join } from 'path';
const dirTest = mkdtempSync(join(origdir, '.test-run-'));  // DENTRO il progetto: vede node_modules
cpSync('./app', join(dirTest, 'app'), { recursive: true });
cpSync('./index.html', join(dirTest, 'index.html'));
process.chdir(dirTest);
writeFileSync('./app/supabase.js', `export const supabase = globalThis.__SB; export const isConfigured = true;`);
const attesa = (ms) => new Promise(r => setTimeout(r, ms));

try {
  await import(new URL('./app/main.js', `file://${process.cwd()}/`).href);
  await attesa(600);

  console.log('\n[1] Avvio e rendering');
  check('app renderizzata (menù presente)', window.document.querySelectorAll('[data-p]').length >= 5);
  check('nessun errore bloccante all\'avvio', !!window.document.getElementById('contenuto'));

  console.log('\n[2] Pagina Operatori');
  window.history.replaceState({}, '', '#/operatori');
  window.dispatchEvent(new window.Event('popstate'));
  await attesa(700);
  const cards = window.document.querySelectorAll('[data-op]');
  check('card operatori renderizzate', cards.length === 3);
  check('barra di ricerca presente', !!window.document.getElementById('op-cerca'));
  check('pulsante filtri presente', !!window.document.getElementById('fil-tutti'));

  console.log('\n[3] Apertura scheda singolo operatore (regressione del bug .catch)');
  window.document.querySelector('[data-op="op1"]').click();
  await attesa(700);
  const c = window.document.getElementById('contenuto');
  check('hash aggiornato (#/operatori/op1)', window.location.hash === '#/operatori/op1');
  check('scheda aperta ("Torna all\'elenco")', c.innerHTML.includes("Torna all'elenco"));
  check('dati sensibili visibili all\'admin (gruppo sanguigno)', c.innerHTML.includes('Gruppo sanguigno'));
  check('pulsante promozione admin presente', c.innerHTML.includes('RENDI AMMINISTRATORE') || c.innerHTML.includes('REVOCA ADMIN'));
  check('pulsante elimina account presente', !!window.document.getElementById('op-elimina'));
  check('registro attività admin presente', !!window.document.getElementById('op-log'));

  console.log('\n[4] Torna all\'elenco');
  window.document.getElementById('op-indietro').click();
  await attesa(600);
  check('tornato all\'elenco', window.document.querySelectorAll('[data-op]').length === 3);

  console.log('\n[5] Ricerca operatore');
  const cerca = window.document.getElementById('op-cerca');
  cerca.value = 'rossi';
  cerca.dispatchEvent(new window.Event('input'));
  await attesa(200);
  const visibili = [...window.document.querySelectorAll('[data-op]')].filter(x => x.style.display !== 'none');
  check('ricerca "rossi" mostra 1 card', visibili.length === 1);
  const x = window.document.getElementById('op-cerca-x');
  check('pulsante ✕ visibile con testo nella barra', x && x.style.display !== 'none');

  console.log('\n[6] Profilo (foto + consultazioni)');
  const btnProfilo = [...window.document.querySelectorAll('[data-p]')].find(b => b.dataset.p === 'profilo');
  btnProfilo?.click();
  await attesa(900);
  const cp = window.document.getElementById('contenuto');
  check('sezione "Chi ha consultato la tua scheda"', cp.innerHTML.includes('Chi ha consultato'));
  check('upload foto presente', !!window.document.getElementById('p-foto-scegli'));
  check('sezione Collega Telegram', cp.innerHTML.includes('Collega Telegram'));

  console.log('\n[7] Attivazione (pagina operatore)');
  window.history.replaceState({ pagina: 'attivazione' }, '', '#/attivazione');
  window.dispatchEvent(new window.Event('popstate'));
  await attesa(700);
  const ca = window.document.getElementById('contenuto');
  check('pagina attivazione renderizzata', ca.innerHTML.includes('Attivazione'));

  console.log('\n[8] Nessun .catch concatenato su query supabase (regressione forma proibita)');
  const sorgente = readFileSync('./app/main.js', 'utf8');
  check('nessun "supabase.rpc(...).catch" nel codice', !/supabase\.rpc\([^)]*\)\s*\.catch/.test(sorgente));
  check('nessun "storage...remove(...).catch" nel codice', !/\.remove\(\[[^\]]*\]\)\s*\.catch/.test(sorgente));

} catch (e) {
  falliti++;
  console.log('  ❌ ERRORE RUNTIME nei test:', e.message);
  console.log(e.stack?.split('\n').slice(0, 5).join('\n'));
} finally {
  process.chdir(origdir);
  rmSync(dirTest, { recursive: true, force: true });
}

console.log(`\n========== RISULTATO: ${passati} passati, ${falliti} falliti ==========`);
process.exit(falliti ? 1 : 0);
