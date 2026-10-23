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
  const nGiorni = Math.round((Date.parse(d2) - Date.parse(d1)) / 86400000) + 1;
  return `🏖 Ferie registrate: ${match[1]}/${match[2]}/${match[3]}${match[4] ? ` → ${match[4]}/${match[5]}/${match[6]}` : ''} — ${nGiorni} giorni${continuative ? ' (continuative: giorno e notte)' : ' (solo turno diurno)'}.`;
}

const sessioniMan = {};
const TIPI_MAN = ['Mantenimento', 'Manovra', 'Intervento', 'Lavorazione', 'Tutor Mantenimento', 'Tutor Corso', 'Altra formazione'];

function domandaStepMan(s) {
  if (s.step === 'data') return '\U0001F4C5 Scrivi la DATA (gg/mm/aaaa):';
  if (s.step === 'ore') return '\u23F0 Scrivi le ORE (es. 4 oppure 4.5):';
  if (s.step === 'tipo') return '\U0001F4C2 Scegli il TIPO:';
  if (s.step === 'argomento') return '\u270F\uFE0F Scrivi l\'ARGOMENTO / attività svolta:';
  return '';
}

async function gestisciMantenimento(chatId, testo) {
  const s = sessioniMan[chatId];
  if (!s) return false;
  const t = testo.trim();

  if (s.step === 'data') {
    const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const anno = m ? Number(m[3]) : 0;
    if (!m || anno < 2020 || anno > 2035) {
      await tg('sendMessage', { chat_id: chatId, text: '\u274C Formato data non valido. Scrivi gg/mm/aaaa, esempio: 14/10/2026' });
      return true;
    }
    s.data = `${m[3]}-${m[2]}-${m[1]}`;
    s.step = 'ore';
    await tg('sendMessage', { chat_id: chatId, text: '\u23F0 Ok. Ora scrivi le ORE (es. 4 oppure 4.5):' });
    return true;
  }
  if (s.step === 'ore') {
    const ore = Number(t.replace(',', '.'));
    if (!ore || ore <= 0 || ore > 24) {
      await tg('sendMessage', { chat_id: chatId, text: '\u274C Ore non valide: scrivi un numero tra 0.5 e 24 (es. 4 oppure 4.5).' });
      return true;
    }
    s.ore = ore;
    s.step = 'tipo';
    await tg('sendMessage', {
      chat_id: chatId,
      text: '\U0001F4C2 Scegli il TIPO di attività:',
      reply_markup: { inline_keyboard: TIPI_MAN.map(tipo => [{ text: tipo, callback_data: 'man_tipo:' + tipo }]) }
    });
    return true;
  }
  if (s.step === 'argomento') {
    if (t.length < 3) {
      await tg('sendMessage', { chat_id: chatId, text: '\u274C Argomento troppo corto: descrivi brevemente l\'attività.' });
      return true;
    }
    s.argomento = t.slice(0, 120);
    s.step = 'conferma';
    await tg('sendMessage', {
      chat_id: chatId,
      text: `\U0001F4CB Riepilogo:\n\n\U0001F4C5 Data: ${s.data.split('-').reverse().join('/')}\n\u23F0 Ore: ${s.ore}\n\U0001F4C2 Tipo: ${s.tipo}\n\u270F\uFE0F Argomento: ${s.argomento}\n\nConfermi?`,
      reply_markup: { inline_keyboard: [
        [{ text: '\u2705 Confermo', callback_data: 'man_conferma' }, { text: '\u274C Annulla', callback_data: 'man_cancel' }],
        [{ text: '\u21AA\uFE0F Riparti da capo', callback_data: 'man_start' }]
      ] }
    });
    return true;
  }
  await tg('sendMessage', { chat_id: chatId, text: domandaStepMan(s) });
  return true;
}

let offset = 0;
let ultimaAttivazioneVista = null;
let ALERT_GROUP = process.env.ALERT_GROUP_CHAT_ID ? Number(process.env.ALERT_GROUP_CHAT_ID) : null;

async function controllaAttivazioni() {
  const { data: aperta } = await sb.from('attivazioni')
    .select('id, team, messaggio, creata_il').eq('chiusa', false)
    .order('creata_il', { ascending: false }).limit(1).maybeSingle();
  if (!aperta) {
    // l'attivazione che stavamo seguendo è stata CHIUSA: avvisa sul gruppo e chiude
    if (ultimaAttivazioneVista !== null) {
      const { data: chiusa } = await sb.from('attivazioni')
        .select('id, team').eq('id', ultimaAttivazioneVista).limit(1).maybeSingle();
      const teamTxt = chiusa?.team === 'alpha' ? 'TEAM ALPHA' : chiusa?.team === 'bravo' ? 'TEAM BRAVO' : 'ATTIVAZIONE PERSONALIZZATA';
      const testoChiusura = `✅✅✅ ATTIVAZIONE CHIUSA ✅✅✅\n\n${teamTxt}\n\nLe risposte non sono più accettate. Grazie a tutti.`;
      if (ALERT_GROUP) {
        await tg('sendMessage', { chat_id: ALERT_GROUP, text: testoChiusura }).catch(e => console.error('Invio chiusura gruppo fallito:', e.message));
      }
      const { data: collegatiChiusura } = await sb.from('profili')
        .select('telegram_chat_id').not('telegram_chat_id', 'is', null);
      for (const p of (collegatiChiusura || [])) {
        await tg('sendMessage', { chat_id: p.telegram_chat_id, text: testoChiusura }).catch(() => {});
      }
      ultimaAttivazioneVista = null;
    }
    return;
  }
  if (aperta.id === ultimaAttivazioneVista) return;
  const giaVista = ultimaAttivazioneVista !== null;
  ultimaAttivazioneVista = aperta.id;
  if (giaVista) return; // all'avvio non riinvia allerte vecchie
  const { data: collegati } = await sb.from('profili')
    .select('telegram_chat_id').not('telegram_chat_id', 'is', null);
  const teamTxt = aperta.team === 'alpha' ? 'TEAM ALPHA' : aperta.team === 'bravo' ? 'TEAM BRAVO' : 'ATTIVAZIONE PERSONALIZZATA';
  const testoAllerta = `🚨🚨🚨 ATTIVAZIONE 🚨🚨🚨

${teamTxt}

${aperta.messaggio}

Rispondi con i pulsanti qui sotto ⭇`;
  const tastieraAllerta = { inline_keyboard: [[
    { text: '✅ SONO DISPONIBILE', callback_data: 'att:si:' + aperta.id },
    { text: '❌ NON SONO DISPONIBILE', callback_data: 'att:no:' + aperta.id }
  ]] };
  if (ALERT_GROUP) {
    await tg('sendMessage', { chat_id: ALERT_GROUP, text: testoAllerta, reply_markup: tastieraAllerta }).catch(e => console.error('Invio gruppo fallito:', e.message));
  }
  for (const p of (collegati || [])) {
    await tg('sendMessage', {
      chat_id: p.telegram_chat_id,
      text: testoAllerta,
      reply_markup: tastieraAllerta
    }).catch(() => {});
  }
}
console.log('Bot USAR Veneto in ascolto...');



async function inserisciFerieAiuto(chatId) {
  const { data: op } = await sb.from('profili').select('id, nome, cognome').eq('telegram_chat_id', chatId).limit(1).maybeSingle();
  if (!op) return 'Prima collega il tuo account: apri l\'app → Profilo → "Collega Telegram" e inviami il codice.';
  const oggi = new Date();
  const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const inizio = new Date(oggi); inizio.setDate(oggi.getDate() + 7);
  const fine = new Date(oggi); fine.setDate(oggi.getDate() + 14);
  return `🏖️ Ciao ${op.nome}, per inserire le ferie scrivi:\n\n/ferie ${fmt(inizio)} - ${fmt(fine)}\n\n(data singola: /ferie ${fmt(inizio)})\nAggiungi la parola "continuative" per giorno E notte di ogni data.`;
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
        if (cb.data.startsWith('att:')) {
          const [ , risposta, attId ] = cb.data.split(':');
          const { data: op } = await sb.from('profili').select('id, nome, cognome').eq('telegram_chat_id', cb.from.id).limit(1).maybeSingle();
          if (!op) {
            await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Prima collega il tuo account (app \u2192 Profilo \u2192 Collega Telegram).' });
            continue;
          }
          const { data: att } = await sb.from('attivazioni').select('id, chiusa').eq('id', Number(attId)).limit(1).maybeSingle();
          if (!att || att.chiusa) {
            await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Attivazione gi\u00e0 chiusa.' });
            continue;
          }
          const { error: errIns } = await sb.from('risposte_attivazione').upsert(
            { attivazione_id: att.id, operatore_id: op.id, risposta: risposta },
            { onConflict: 'attivazione_id,operatore_id' }
          );
          if (errIns) {
            await tg('answerCallbackQuery', { callback_query_id: cb.id, text: 'Errore: ' + errIns.message });
            continue;
          }
          await tg('answerCallbackQuery', { callback_query_id: cb.id, text: risposta === 'si' ? '✅ Registrato: DISPONIBILE' : '❌ Registrato: NON disponibile' });
          await tg('sendMessage', { chat_id: cb.message.chat.id, text: risposta === 'si'
            ? '✅ Risposta registrata. Presentati al ritrovo indicato nel messaggio.'
            : '❌ Risposta registrata: non disponibile. Grazie comunque.' });
        } else if (cb.data === 'man_start') {
          const { data: op } = await sb.from('profili').select('id, nome, cognome').eq('telegram_chat_id', cb.message.chat.id).limit(1).maybeSingle();
          if (!op) {
            await tg('sendMessage', { chat_id: cb.message.chat.id, text: 'Prima collega il tuo account: apri l\'app → Profilo → "Collega Telegram" e inviami il codice.' });
          } else {
            sessioniMan[cb.message.chat.id] = { step: 'data' };
            await tg('sendMessage', {
              chat_id: cb.message.chat.id,
              text: `🎓 Nuovo mantenimento — Ciao ${op.nome}, procediamo passo passo.\n\n📅 Scrivi la DATA (gg/mm/aaaa):`,
              reply_markup: { inline_keyboard: [[{ text: '❌ Annulla', callback_data: 'man_cancel' }]] }
            });
          }
        } else if (cb.data === 'man_cancel') {
          delete sessioniMan[cb.message.chat.id];
          await tg('sendMessage', { chat_id: cb.message.chat.id, text: 'Inserimento mantenimento annullato.' });
        } else if (cb.data === 'man_conferma') {
          const s = sessioniMan[cb.message.chat.id];
          const { data: op } = await sb.from('profili').select('id, nome, cognome').eq('telegram_chat_id', cb.message.chat.id).limit(1).maybeSingle();
          if (s && op) {
            const { error } = await sb.from('mantenimenti').insert({
              operatore_id: op.id, data: s.data, tipo: s.tipo, argomento: s.argomento, ore: s.ore, stato: 'in_validazione'
            });
            delete sessioniMan[cb.message.chat.id];
            await tg('sendMessage', {
              chat_id: cb.message.chat.id,
              text: error ? '❌ Errore salvataggio: ' + error.message : '✅ Mantenimento registrato! Resta 🟡 in attesa di approvazione dell\'admin.',
              reply_markup: { inline_keyboard: [[{ text: '🎓 Altro mantenimento', callback_data: 'man_start' }, { text: '🏖️ Ferie', callback_data: 'ferie_help' }]] }
            });
          }
        } else if (cb.data === 'man_riprenda') {
          const s = sessioniMan[cb.message.chat.id];
          if (s) {
            await tg('sendMessage', { chat_id: cb.message.chat.id, text: '🎓 Riprendiamo: ' + domandaStepMan(s) });
          }
        } else if (cb.data.startsWith('man_tipo:')) {
          const s = sessioniMan[cb.message.chat.id];
          if (s) {
            s.tipo = cb.data.slice(9);
            s.step = 'argomento';
            await tg('sendMessage', { chat_id: cb.message.chat.id, text: '\u270F\uFE0F Ok, ' + s.tipo + '. Ora scrivi l\'ARGOMENTO / attività svolta:' });
          }
        } else if (cb.data === 'ferie_help') {
          await tg('sendMessage', {
            chat_id: cb.message.chat.id,
            text: await inserisciFerieAiuto(cb.message.chat.id),
            reply_markup: { inline_keyboard: [[
              { text: '🏖️ Nuove ferie', callback_data: 'ferie_help' },
              { text: '🎓 Mantenimento', callback_data: 'man_start' },
              { text: 'ℹ️ Come funziona', callback_data: 'come_funziona' }
            ]] }
          });
        } else if (cb.data === 'come_funziona') {
          await tg('sendMessage', {
            chat_id: cb.message.chat.id,
            text: '📘 Come funziona:\n\n🏖️ Ferie — scrivi: /ferie gg/mm/aaaa - gg/mm/aaaa (o una data singola). Aggiungi "continuative" per giorno E notte. \n🔗 Collegamento — genera il codice nell\'app (Profilo → Collega Telegram) e inviamelo: vale 15 minuti.\n\n🚨 In emergenza riceverai le allerte: rispondi direttamente dall\'app.',
            reply_markup: { inline_keyboard: [[
              { text: '🏖️ Inserisci ferie', callback_data: 'ferie_help' },
              { text: '🎓 Mantenimento', callback_data: 'man_start' }
            ]] }
          });
        }
        continue;
      }

      if (up.my_chat_member && (up.my_chat_member.chat.type === 'group' || up.my_chat_member.chat.type === 'supergroup')) {
        console.log('AGGIUNTO AL GRUPPO:', JSON.stringify(up.my_chat_member.chat));
      }

      const msg = up.message;
      if (!msg?.text) continue;
      const chatId = msg.chat.id;
      const testo = msg.text;

      // messaggi nei gruppi: solo /idgruppo, niente dialoghi
      if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        console.log('MSG nel gruppo', msg.chat.id, 'titolo:', msg.chat.title);
        if (testo.startsWith('/idgruppo')) {
          await tg('sendMessage', {
            chat_id: chatId,
            text: `🗓️ ID di questo gruppo: <code>${chatId}</code>

Copialo (il numero CON il segno meno) e inseriscilo su Render → Settings → Environment → ALERT_GROUP_CHAT_ID, poi salva.`,
            parse_mode: 'HTML'
          });
        }
        continue;
      }

      if (sessioniMan[chatId]) {
        const gestito = await gestisciMantenimento(chatId, testo);
        if (gestito) continue;
      }

      if (testo.startsWith('/start')) {
        await tg('sendMessage', {
          chat_id: chatId,
          text: '🚒 Benvenuto nel bot USAR Veneto!\n\nPer collegare il tuo account, apri l\'app → Profilo → "Collega Telegram" e inviami qui il codice che compare (es. 482-193).\n\nUsa i pulsanti qui sotto 👇',
          reply_markup: { inline_keyboard: [[
            { text: '🏖️ Inserisci ferie', callback_data: 'ferie_help' },
              { text: '🎓 Mantenimento', callback_data: 'man_start' },
            { text: 'ℹ️ Come funziona', callback_data: 'come_funziona' }
          ]] }
        });
      } else if (testo.includes('Inserisci ferie')) {
        await tg('sendMessage', { chat_id: chatId, text: await inserisciFerieAiuto(chatId) });
      } else if (testo.includes('Come funziona')) {
        await tg('sendMessage', {
          chat_id: chatId,
          text: '📘 Come funziona:\n\n🏖️ Ferie — scrivi: /ferie gg/mm/aaaa - gg/mm/aaaa (o una data singola). Aggiungi la parola "continuative" per giorno E notte di ogni data. \n🔗 Collegamento — genera il codice nell\'app (Profilo → Collega Telegram) e inviamelo qui: vale 15 minuti.\n\n🚨 In emergenza riceverai qui le allerte: rispondi direttamente dall\'app.',
          reply_markup: { inline_keyboard: [[
            { text: '🏖️ Inserisci ferie', callback_data: 'ferie_help' },
              { text: '🎓 Mantenimento', callback_data: 'man_start' },
            { text: 'ℹ️ Come funziona', callback_data: 'come_funziona' }
          ]] }
        });
      } else if (testo.startsWith('/ferie')) {
        await tg('sendMessage', { chat_id: chatId, text: await inserisciFerie(chatId, testo) });
      } else if (/^\d{2,3}-\d{3}$/.test(testo.trim())) {
        const c = await collega(chatId, testo.trim());
        await tg('sendMessage', {
          chat_id: chatId,
          text: c.msg,
          reply_markup: c.ok ? { inline_keyboard: [[
            { text: '🏖️ Inserisci ferie', callback_data: 'ferie_help' },
              { text: '🎓 Mantenimento', callback_data: 'man_start' },
            { text: 'ℹ️ Come funziona', callback_data: 'come_funziona' }
          ]] } : undefined
        });
      } else {
        await tg('sendMessage', { chat_id: chatId, text: 'Usa i pulsanti qui sotto, oppure:\n/ferie gg/mm/aaaa - gg/mm/aaaa — registra le ferie\n\nPer collegarti: app → Profilo → Collega Telegram, poi inviami il codice.', reply_markup: { inline_keyboard: [[
            { text: '🏖️ Inserisci ferie', callback_data: 'ferie_help' },
              { text: '🎓 Mantenimento', callback_data: 'man_start' },
            { text: 'ℹ️ Come funziona', callback_data: 'come_funziona' }
          ]] } });
      }
    }
  } catch (e) {
    console.error('Errore loop:', e.message);
  }
  try { await controllaAttivazioni(); } catch (e) { console.error('Errore attivazioni:', e.message); }
  setTimeout(loop, 1000);
}
loop();

// --- server HTTP minimo per Render (il Web Service esige una porta aperta) ---
const PORT = process.env.PORT || 3000;
createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot USAR Veneto attivo');
}).listen(PORT, () => console.log('HTTP su porta ' + PORT));
