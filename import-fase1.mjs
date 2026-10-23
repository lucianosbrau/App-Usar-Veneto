// SCRIPT DI IMPORT FASE 1 (24/10/2026) — genera SQL di import dal foglio Google
// Uso: node import-fase1.mjs [--simula BUBOLA,ZANAGA,RUBIN]
// Legge i fogli via gviz (CSV pubblici), applica le REGOLE di CONTINUITA sez. 6/10/15,
// genera SQL INSERT ... ON CONFLICT (email) DO UPDATE. NON si collega al DB:
// produce solo SQL da far verificare/eseguire. I dati di origine restano sul Drive.

const SHEET = '16iY_urOb3pyzM2sXtDRLHK0aEt73Rcd3MtgJW9L_8DQ';

// ---- regole di mappa (da CONTINUITA) ----
const GRADI_MAP = { 'FF.TT.': 'D', 'DVD': 'DVD', 'D': 'D', 'VD': 'VD', 'IA': 'IA', 'CRE': 'CRE', 'CR': 'CR', 'CSE': 'CSE', 'CS': 'CS', 'VC': 'VC', 'VE': 'VE', 'VF': 'VF', 'C+S': null, 'C S': null };
const COMANDI_MAP = { 'DIREZIONE VENETO': 'DIREZIONE REGIONALE VENETO', 'VENEZIA': 'VENEZIA', 'PADOVA': 'PADOVA', 'TREVISO': 'TREVISO', 'VERONA': 'VERONA', 'VICENZA': 'VICENZA', 'BELLUNO': 'BELLUNO', 'ROVIGO': 'ROVIGO', 'UDINE': 'UDINE', 'PORDENONE': 'PORDENONE', 'TRIESTE': 'TRIESTE', 'GORIZIA': 'GORIZIA' };
const TURNI_MAP = { 'A': 'A', 'B': 'B', 'C': 'C', 'D': 'D', 'G': 'G', 'M': 'G', 'GIORNALIERO': 'G', 'ALTRO': null };
const SEDE_CENTRALE = (comando) => {
  if (comando === 'DIREZIONE REGIONALE VENETO') return 'Centrale Direzione';
  if (comando === 'VENEZIA') return 'Centrale Mestre';
  return 'Centrale ' + comando.charAt(0) + comando.slice(1).toLowerCase();
};

async function leggiFoglio(nome) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(nome)}`;
  const res = await fetch(url);
  const testo = await res.text();
  // parser CSV con virgolette
  const righe = [];
  let campo = '', riga = [], inVirg = false;
  for (let i = 0; i < testo.length; i++) {
    const c = testo[i];
    if (inVirg) {
      if (c === '"' && testo[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') inVirg = false;
      else campo += c;
    } else if (c === '"') inVirg = true;
    else if (c === ',') { riga.push(campo); campo = ''; }
    else if (c === '\n') { riga.push(campo); righe.push(riga); riga = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo || riga.length) { riga.push(campo); righe.push(riga); }
  const header = righe[0];
  return righe.slice(1).filter(r => r.some(c => c.trim())).map(r => {
    const o = {};
    header.forEach((h, i) => o[h.trim()] = (r[i] || '').trim());
    return o;
  });
}

const pulisci = (s) => (s || '').replace(/\s+/g, ' ').trim();
// trova il valore di una colonna il cui nome CONTIENE il testo dato (case/space-insensitive)
const col = (r, ...alt) => {
  const norm = (x) => pulisci(String(x || '')).toUpperCase().replace(/\s+/g, ' ');
  for (const a of alt) {
    const k = Object.keys(r).find(key => norm(key).includes(norm(a)));
    if (k !== undefined && pulisci(r[k])) return pulisci(r[k]);
  }
  return '';
};
const dataIso = (ggmmaaaa) => {
  const m = (ggmmaaaa || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
};

console.log('Leggo i fogli Google...');
const [anagrafica, specializzazioni] = await Promise.all([
  leggiFoglio('DATI ANAGRAFICI'),
  leggiFoglio('SPECIALIZZAZIONI'),
]);
console.log(`anagrafica: ${anagrafica.length} righe; specializzazioni: ${specializzazioni.length} righe`);

// dedup specializzazioni per codice fiscale: LIVELLO PIU' ALTO vince
const specByCf = {};
for (const r of specializzazioni) {
  const cf = pulisci(r['CODICE FISCALE']);
  if (!cf) continue;
  const prec = specByCf[cf];
  const nbcr = (liv) => { const m = (liv || '').match(/(\d)/); return m ? Number(m[1]) : 0; };
  if (!prec) { specByCf[cf] = r; continue; }
  if (nbcr(r['NBCR']) > nbcr(prec['NBCR'])) prec['NBCR'] = r['NBCR'];
  if ((r['SAF'] || '').length > (prec['SAF'] || '').length) prec['SAF'] = r['SAF'];
  for (const k of ['FUNZIONARIO', 'STAFF', 'LOGISTA', 'CINOFILO', 'TAS', 'SAPR', 'MEDICO', 'INFERMIERE'])
    if (r[k] && !prec[k]) prec[k] = r[k];
}

const simula = process.argv.includes('--simula') ? process.argv[process.argv.indexOf('--simula') + 1].split(',') : null;
const sqlRighe = [];
console.log('\n===== TRASFORMAZIONE (foglio -> app) =====');
for (const r of anagrafica) {
  const cognome = pulisci(r['COGNOME']), nome = pulisci(r['NOME']);
  if (simula && !simula.some(s => cognome.toUpperCase().includes(s.toUpperCase()))) continue;
  const cf = col(r, 'CODICE FISCALE');
  const email = col(r, 'e-MAIL (USATA) USATA', 'e-MAIL USATA').toLowerCase() || null;
  const iceTel = (() => { const k = Object.keys(r).find(key => pulisci(key).toUpperCase() === 'TEL.' || pulisci(key).toUpperCase() === 'TEL'); return k ? pulisci(r[k]) : ''; })();
  const emailServizio = col(r, 'SERVIZIO').toLowerCase() || null;
  // NB: nel foglio le due colonne email sono "e-MAIL (USATA) USATA" e la seconda col SERVIZIO;
  // emailServizio = la seconda email (colonna dopo la principale)
  const gradoRaw = col(r, 'GRADO', 'RUOLO').toUpperCase();
  const grado = GRADI_MAP[gradoRaw] ?? null;
  const comandoRaw = col(r, 'COMANDO').toUpperCase();
  const comando = COMANDI_MAP[comandoRaw] || null;
  const turnoRaw = col(r, 'TURNO').toUpperCase();
  const turno = TURNI_MAP[turnoRaw] ?? null;
  const salto = turno && 'ABCD'.includes(turno) ? (col(r, 'SALTO') || null) : null;
  let sede = col(r, 'SEDE');
  if (sede.toUpperCase() === 'CENTRALE' && comando) sede = SEDE_CENTRALE(comando);
  const spec = specByCf[cf] || {};
  const nbcrLiv = (spec['NBCR'] || '').match(/(\d)/);
  const saf = (spec['SAF'] || '').toUpperCase().includes('2A') ? '2A - AVANZATO' : (spec['SAF'] || '').toUpperCase().includes('1B') ? '1B - BASICO' : (spec['SAF'] || '').toUpperCase().includes('BASICO') ? '1B - BASICO' : (spec['SAF'] || '').toUpperCase().includes('AVANZATO') ? '2A - AVANZATO' : (spec['SAF'] || '').toUpperCase().includes('1A') ? '1A' : null;
  console.log(JSON.stringify({
    cognome, nome, email, emailServizio, cf,
    data_nascita: dataIso(col(r, 'NASCITA DATA')), luogo_nascita: col(r, 'LUOGO'),
    cellulare: col(r, 'TELEFONO (USATO)'),
    grado: gradoRaw ? `${gradoRaw} -> ${grado}` : null,
    comando: `${comandoRaw} -> ${comando}`, sede,
    turno: `${turnoRaw} -> ${turno}`, salto,
    ice: col(r, 'ICE NOME'), ice_tel: iceTel,
    missioni: col(r, 'MISSIONI').toUpperCase() === 'SI',
    spec: {
      funzionario: spec['FUNZIONARIO'] === 'SI', staff: spec['STAFF'] === 'SI', logista: spec['LOGISTA'] === 'SI',
      nbcr: nbcrLiv ? Number(nbcrLiv[1]) : 0, nbcr_est: (spec['NBCR'] && /NR|LPG|LNG/.test(spec['NBCR'])) ? spec['NBCR'].match(/NR|LPG|LNG/)[0] : ((spec['SPECIALIZZAZIONE NBCR'] || '').match(/NR|LPG|LNG/) || [null])[0],
      k9: spec['CINOFILO'] === 'SI', saf, tas: spec['TAS'] ? Number(spec['TAS']) : null,
      sapr: spec['SAPR'] === 'SI', medico: spec['MEDICO'] === 'SI', infermiere: spec['INFERMIERE'] === 'SI',
    }
  }, null, 1));
}
console.log('\n(Simulazione completa — l\'SQL di import vero si genera con: node import-fase1.mjs --genera)');
