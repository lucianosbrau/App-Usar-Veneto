// VERIFICA PRE-PUBBLICAZIONE (eseguire DOPO vite build, PRIMA del push)
//   node verifica-build.mjs
// Controlla che il pacchetto costruito (dist/) sia SANO: connessione al database
// presente, nessun residuo del DB finto dei test, app avviabile.
// Se ESCE con errore: NON pubblicare, il sito resta com'è.

import { readFileSync, existsSync, readdirSync } from 'fs';

let errori = 0;
const errore = (msg) => { errori++; console.log('  ❌', msg); };
const ok = (msg) => console.log('  ✅', msg);

console.log('[VERIFICA BUILD dist/]');

// 1) il file di connessione nel sorgente deve essere quello VERO
const src = readFileSync('./app/supabase.js', 'utf8');
if (src.includes('globalThis.__SB') || src.includes('STUB')) {
  errore("app/supabase.js e la versione FINTA del test (residuo incidente)");
} else if (src.includes('createClient')) {
  ok('app/supabase.js è la versione vera (createClient)');
} else {
  errore('app/supabase.js non riconosciuto — controllare a mano');
}

// 2) nessun file nel dist deve contenere il marcatore del DB finto
const distFiles = readdirSync('./dist/assets');
const jsFiles = distFiles.filter(f => f.endsWith('.js'));
for (const f of jsFiles) {
  const c = readFileSync('./dist/assets/' + f, 'utf8');
  if (c.includes('globalThis.__SB')) errore('dist/assets/' + f + ' contiene il DB FINTO');
}
ok('nessun residuo del DB finto nei ' + jsFiles.length + ' file JS del pacchetto');

// 3) il bundle deve contenere i punti chiave dell'app
const bundle = jsFiles.map(f => readFileSync('./dist/assets/' + f, 'utf8')).join('\n');
const puntiVitali = [
  ['pagina operatori', 'Gestione Operatori'],
  ['attivazione', 'ATTIVAZIONE'],
  ['mantenimenti', 'Mantenimento'],
  ['login', 'ACCEDI'],
];
for (const [nome, marker] of puntiVitali) {
  if (bundle.includes(marker)) ok('presente: ' + nome);
  else errore('MANCA nel pacchetto: ' + nome + ' (marker "' + marker + '")');
}

// 4) index.html del dist deve puntare ai bundle esistenti
const idx = readFileSync('./dist/index.html', 'utf8');
const riferimenti = [...idx.matchAll(/assets\/([a-zA-Z0-9._-]+\.js)/g)].map(m => m[1]);
for (const r of riferimenti) {
  if (!existsSync('./dist/assets/' + r)) errore('index.html punta a un file inesistente: ' + r);
}
ok('index.html punta a file esistenti (' + riferimenti.length + ' riferimenti)');

// 5) se le chiavi di collegamento erano presenti alla build, il bundle deve contenere la libreria del database
if (process.env.VITE_SUPABASE_URL) {
  if (bundle.includes('createClient')) ok('chiavi presenti: bundle con connessione DB');
  else errore('chiavi presenti ma nessuna connessione nel bundle');
} else {
  console.log('  ℹ️ build senza chiavi (normale in locale): connessione verificata al punto 1');
}

console.log('\n========== ' + (errori ? 'BLOCCATO: ' + errori + ' problemi — NON PUBBLICARE' : 'VERIFICATO: pacchetto sano, si può pubblicare') + ' ==========');
process.exit(errori ? 1 : 0);
