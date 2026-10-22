// Bot Telegram USAR Veneto — da eseguire con un servizio sempre attivo
// Comandi: /start (collegamento con codice), /ferie (inserimento ferie), /chi sono
//
// Variabili d'ambiente richieste ( Railway/Render/Fly.io o un PC sempre acceso):
//   TELEGRAM_BOT_TOKEN   (da BotFather)
//   SUPABASE_URL         (https://lwdcrjtbsmqammwpvrhy.supabase.co)
//   SUPABASE_SERVICE_KEY (chiave service_role di Supabase — SEGRETA, mai nel codice lato client)

import { createClient } from '@supabase/supabase-js';
import { createServer } from 'http';

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
    .eq('codice', codice.trim()).eq('usato', false)
    .order('id', { ascending: false }).limit(1).maybeSingle();
  if (!data) return { ok: false, msg: '❌ Codice non trovato o già usato. Generane uno NUOVO dall\'app (Profilo → Collega Telegram) e inviamelo subito: vale 15 minuti.' };
  if (new Date(data.scade_il) < new Date()) return { ok: false, msg: '⏰ Codice scaduto. Generane uno nuovo dall\'app (Profilo → Collega Telegram).' };
  await sb.from('codici_telegram').update({ usato: true }).eq('id', data.id);
  await sb.from('profili').update({ telegram_chat_id: chatId }).eq('id', data.operatore_id);
  return { ok: true, msg: '✅ Account collegato! Riceverai qui allerte e comunicazioni USAR.' };
}

async function inserisciFerie(chatId, testo) {
  const { data: op } = await sb.from('profili').select('id, nome, cognome').eq('telegram_chat_id', chatId).limit(1).maybeSingle();
  if (!op) return 'Prima collega il tuo account: apri l\'app → Profilo → "Collega Telegram" e inviami il codice.';

  // formato atteso: /ferie 05/11/2026 - 16/11/2026  (o date singole: /ferie 05/11/2026)
  const match = testo.match(/(\d{2})\/(\d{2})\/(\d{4})\s*(?:-|a|to)?\s*(?:(\d{2})\/(\d{2})\/(\d{4}))?/);
  if (!match) return 'Formato: /ferie gg/mm/aaaa - gg/mm/aaaa [continuative]\nEsempio: /ferie 05/11/2026 - 16/11/2026 continuative\n\nCon "continuative" le ferie valgono per giorno E notte di ogni data.';
  const d1 = `${match[3]}-${match[2]}-${match[1]}`;
  const d2 = match[4] ? `${match[6]}-${match[5]}-${match[4]}` : d1;
  if (d2 < d1) return 'La seconda data è prima della prima.';
  const anno = Number(match[3]);
  const annoF = Number(match[6] || match[3]);
  const annoNow = new Date().getFullYear();
  if (anno < 2020 || anno > 2035 || annoF < 2020 || annoF > 2035) {
    return 'Anno non plausibile: usa date tra il 2020 e il 2035.';
  }
  const gg = (Date.parse(d2) - Date.parse(d1)) / 86400000 + 1;
  if (gg > 31) {
    return 'Intervallo troppo lungo: massimo 31 giorni per comando. Per periodi più lunghi, suddividi in più comandi /ferie.';
  }
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

const tastieraPrincipale = {
  keyboard: [
    [{ text: '🏖️ Inserisci ferie' }, { text: 'ℹ️ Come funziona' }]
  ],
  resize_keyboard: true,
  is_persistent: true
};


async function inserisciFerieAiuto(chatId) {
  const { data: op } = await sb.from('profili').select('id, nome, cognome').eq('telegram_chat_id', chatId).limit(1).maybeSingle();
  if (!op) return 'Prima collega il tuo account: apri l\'app → Profilo → "Collega Telegram" e inviami il codice.';
  const oggi = new Date();
  const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const inizio = new Date(oggi); inizio.setDate(oggi.getDate() + 7);
  const fine = new Date(oggi); fine.setDate(oggi.getDate() + 14);
  return `🏖️ Ciao ${op.nome}, per inserire le ferie scrivi:\n\n/ferie ${fmt(inizio)} - ${fmt(fine)}\n\n(data singola: /ferie ${fmt(inizio)})\nAggiungi la parola "continuative" per giorno E notte di ogni data.\nMassimo 31 giorni per comando.`;
}

async function loop() {
  try {
    const r = await fetch(`${API}/getUpdates?offset=${offset}&timeout=25`).then(r => r.json());
    for (const up of r.result || []) {
      offset = up.update_id + 1;

      // pulsante premuto (callback inline)
      if (up.callback_query) {
        const cb = up.callback_query;
        await tg('answerCallbackQuery', { callback_query_id: cb.id });
        if (cb.data === 'ferie_help') {
          await tg('sendMessage', { chat_id: cb.message.chat.id, text: await inserisciFerieAiuto(cb.message.chat.id) });
        }
        continue;
      }

      const msg = up.message;
      if (!msg?.text) continue;
      const chatId = msg.chat.id;
      const testo = msg.text;

      if (testo.startsWith('/start')) {
        await tg('sendMessage', {
          chat_id: chatId,
          text: '🚒 Benvenuto nel bot USAR Veneto!\n\nPer collegare il tuo account, apri l\'app → Profilo → "Collega Telegram" e inviami qui il codice che compare (es. 48-21).\n\nPoi usa i pulsanti qui sotto per le operazioni rapide.',
          reply_markup: tastieraPrincipale
        });
      } else if (testo.includes('Inserisci ferie')) {
        await tg('sendMessage', { chat_id: chatId, text: await inserisciFerieAiuto(chatId) });
      } else if (testo.includes('Come funziona')) {
        await tg('sendMessage', {
          chat_id: chatId,
          text: '📘 Come funziona:\n\n🏖️ Ferie — scrivi: /ferie gg/mm/aaaa - gg/mm/aaaa (o una data singola). Aggiungi la parola "continuative" per giorno E notte di ogni data. Massimo 31 giorni per comando.\n\n🔗 Collegamento — genera il codice nell\'app (Profilo → Collega Telegram) e inviamelo qui: vale 15 minuti.\n\n🚨 In emergenza riceverai qui le allerte: rispondi direttamente dall\'app.',
          reply_markup: tastieraPrincipale
        });
      } else if (testo.startsWith('/ferie')) {
        await tg('sendMessage', { chat_id: chatId, text: await inserisciFerie(chatId, testo) });
      } else if (/^\d{2,3}-\d{3}$/.test(testo.trim())) {
        const c = await collega(chatId, testo.trim());
        await tg('sendMessage', { chat_id: chatId, text: c.msg, reply_markup: c.ok ? tastieraPrincipale : undefined });
      } else {
        await tg('sendMessage', { chat_id: chatId, text: 'Usa i pulsanti qui sotto, oppure:\n/ferie gg/mm/aaaa - gg/mm/aaaa — registra le ferie\n\nPer collegarti: app → Profilo → Collega Telegram, poi inviami il codice.', reply_markup: tastieraPrincipale });
      }
    }
  } catch (e) {
    console.error('Errore loop:', e.message);
  }
  setTimeout(loop, 1000);
}
loop();

// --- server HTTP minimo per Render (il Web Service esige una porta aperta) ---
const PORT = process.env.PORT || 3000;
createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot USAR Veneto attivo');
}).listen(PORT, () => console.log('HTTP su porta ' + PORT));
