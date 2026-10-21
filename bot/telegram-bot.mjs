// Bot Telegram USAR Veneto — da eseguire con un servizio sempre attivo
// Comandi: /start (collegamento con codice), /ferie (inserimento ferie), /chi sono
//
// Variabili d'ambiente richieste ( Railway/Render/Fly.io o un PC sempre acceso):
//   TELEGRAM_BOT_TOKEN   (da BotFather)
//   SUPABASE_URL         (https://lwdcrjtbsmqammwpvrhy.supabase.co)
//   SUPABASE_SERVICE_KEY (chiave service_role di Supabase — SEGRETA, mai nel codice lato client)

import { createClient } from '@supabase/supabase-js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const API = `https://api.telegram.org/bot${TOKEN}`;
const mesi = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];

async function tg(method, params) {
  const r = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return r.json();
}

async function collega(chatId, codice) {
  const { data } = await sb.from('codici_telegram')
    .select('id, operatore_id, scade_il, usato')
    .eq('codice', codice.trim()).eq('usato', false).single();
  if (!data) return { ok: false, msg: 'Codice non valido o già usato. Generane uno nuovo dall\'app (Profilo → Collega Telegram).' };
  if (new Date(data.scade_il) < new Date()) return { ok: false, msg: 'Codice scaduto. Generane uno nuovo dall\'app.' };
  await sb.from('codici_telegram').update({ usato: true }).eq('id', data.id);
  await sb.from('profili').update({ telegram_chat_id: chatId }).eq('id', data.operatore_id);
  return { ok: true, msg: '✅ Account collegato! Riceverai qui allerte e comunicazioni USAR.' };
}

async function inserisciFerie(chatId, testo) {
  const { data: op } = await sb.from('profili').select('id, nome, cognome').eq('telegram_chat_id', chatId).single();
  if (!op) return 'Prima collega il tuo account: apri l\'app → Profilo → "Collega Telegram" e inviami il codice.';

  // formato atteso: /ferie 05/11/2026 - 16/11/2026  (o date singole: /ferie 05/11/2026)
  const match = testo.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(?:-|a|to)?\s*(?:(\d{2})\/(\d{2})\/(\d{4}))?/);
  if (!match) return 'Formato: /ferie gg/mm/aaaa - gg/mm/aaaa [continuative]\nEsempio: /ferie 05/11/2026 - 16/11/2026 continuative\n\nCon "continuative" le ferie valgono per giorno E notte di ogni data.';
  const d1 = `${match[3]}-${match[2]}-${match[1]}`;
  const d2 = match[4] ? `${match[6]}-${match[5]}-${match[4]}` : d1;
  if (d2 < d1) return 'La seconda data è prima della prima.';
  const continuative = /continuative/i.test(testo);

  const righe = [];
  for (let d = new Date(d1); d <= new Date(d2); d.setDate(d.getDate() + 1)) {
    const data = d.toISOString().slice(0, 10);
    if (continuative) {
      righe.push({ operatore_id: op.id, data, tipo: 'ferie', turno_ferie: 'giorno' });
      righe.push({ operatore_id: op.id, data, tipo: 'ferie', turno_ferie: 'notte' });
    } else {
      righe.push({ operatore_id: op.id, data, tipo: 'ferie', turno_ferie: 'giorno' });
    }
  }
  const { error } = await sb.from('disponibilita').insert(righe);
  if (error) return 'Errore salvataggio: ' + error.message;
  return `🏖 Ferie registrate: ${match[1]}/${match[2]}/${match[3]}${match[4] ? ` → ${match[4]}/${match[5]}/${match[6]}` : ''} — ${righe.length} giorni${continuative ? ' (continuative: giorno e notte)' : ' (solo turno diurno)'}.`;
}

let offset = 0;
console.log('Bot USAR Veneto in ascolto...');

async function loop() {
  try {
    const r = await fetch(`${API}/getUpdates?offset=${offset}&timeout=25`).then(r => r.json());
    for (const up of r.result || []) {
      offset = up.update_id + 1;
      const msg = up.message;
      if (!msg?.text) continue;
      const chatId = msg.chat.id;
      const testo = msg.text;

      if (testo.startsWith('/start')) {
        await tg('sendMessage', { chat_id: chatId, text: '🚒 Benvenuto nel bot USAR Veneto!\n\nPer collegare il tuo account, apri l\'app → Profilo → "Collega Telegram" e inviami qui il codice che compare (es. 48-21).' });
      } else if (testo.startsWith('/ferie')) {
        await tg('sendMessage', { chat_id: chatId, text: await inserisciFerie(chatId, testo) });
      } else if (/^\d{2}-\d{2}$/.test(testo.trim())) {
        const c = await collega(chatId, testo.trim());
        await tg('sendMessage', { chat_id: chatId, text: c.msg });
      } else {
        await tg('sendMessage', { chat_id: chatId, text: 'Comandi disponibili:\n/ferie gg/mm/aaaa - gg/mm/aaaa — registra le ferie\n\nPer collegarti: app → Profilo → Collega Telegram, poi inviami il codice.' });
      }
    }
  } catch (e) {
    console.error('Errore loop:', e.message);
  }
  setTimeout(loop, 1000);
}
loop();
