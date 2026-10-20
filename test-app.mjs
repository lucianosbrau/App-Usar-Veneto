import { chromium } from 'playwright';

const b = await chromium.launch({ args: ['--no-sandbox'] });
const page = await b.newPage({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36' });
const errori = [];
page.on('console', m => { if (m.type() === 'error') errori.push(m.text()); });
page.on('pageerror', e => errori.push('PAGEERROR: ' + e.message));

await page.goto('https://lucianosbrau.github.io/App-Usar-Veneto/', { waitUntil: 'networkidle' });
console.log('TITOLO:', await page.title());
const appHtml = await page.innerHTML('#app');
console.log('LOGIN visibile?', appHtml.includes('login-card'));
console.log('Contiene v. 20/10/2026?', appHtml.includes('20/10/2026'));
console.log('Contiene "Primo accesso"?', appHtml.includes('Primo accesso'));
console.log('Contiene vigilfuoco?', appHtml.includes('vigilfuoco'));
console.log('ERRORI JS:', errori.length ? errori.join(' | ') : 'nessuno');

await b.close();
