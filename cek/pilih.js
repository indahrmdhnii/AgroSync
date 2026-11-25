const { chromium } = require('playwright');
const L = require('path').resolve(__dirname, '..');
const [,, W, H, tema = 'light', aw = 'PL', gerak = 'no-preference'] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const hp = +W < 900;
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, colorScheme: tema, reducedMotion: gerak, hasTouch: hp, isMobile: hp });
  const p = await ctx.newPage(); const galat = [];
  p.on('pageerror', (e) => galat.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) galat.push('console: ' + m.text()); });
  await p.route('https://cdnjs.cloudflare.com/**/three.min.js', (r) => r.fulfill({ path: L + '/vendor/three-r128.min.js', contentType: 'text/javascript' }));
  await p.route('https://fonts.**/**', (r) => r.abort());
  await p.goto('file://' + L + '/dist/index.html');
  await p.waitForTimeout(gerak === 'reduce' ? 1200 : 5400);
  const terbuka = await p.evaluate(() => !document.getElementById('pilih-layar').hidden);
  await p.screenshot({ path: `${L}/cek/${aw}-1pilih.png` });
  await p.hover('[data-pilih="ago"]').catch(() => {}); await p.waitForTimeout(400);
  await p.screenshot({ path: `${L}/cek/${aw}-2hover.png` });
  await p.click('[data-pilih="ago"]'); await p.waitForTimeout(1000);
  await p.screenshot({ path: `${L}/cek/${aw}-3terbang.png` });
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${L}/cek/${aw}-4pemandu.png` });
  const info = await p.evaluate(() => ({ layar: document.getElementById('pilih-layar').hidden, pemandu: !document.getElementById('pemandu').hidden, teks: document.getElementById('pemandu-teks').textContent, label: document.getElementById('pemandu-maskot').getAttribute('aria-label'), piala: HADIAH.misi, kunci: document.documentElement.classList.contains('kunci-gulir'), simpan: localStorage.getItem('agrosync-karakter') }));
  console.log(aw, 'awal terbuka:', terbuka, JSON.stringify(info));
  // tema
  const temaAwal = await p.evaluate(() => temaEfektif());
  await p.click('#tombol-tema');
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${L}/cek/${aw}-6tema.png` });
  console.log(aw, 'tema', temaAwal, '->', await p.evaluate(() => [temaEfektif(), localStorage.getItem('agrosync-tema'), document.getElementById('tombol-tema').getAttribute('aria-label')].join(' | ')));
  if (hp) { await p.click('#hamburger'); await p.waitForTimeout(300); await p.click('#menu-hp [data-buka-pilih]'); } else { await p.click('.nav-tautan [data-buka-pilih]'); }
  await p.waitForTimeout(700);
  await p.screenshot({ path: `${L}/cek/${aw}-7buka-lagi.png` });
  const fokus = await p.evaluate(() => document.activeElement && document.activeElement.dataset.pilih);
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  console.log(aw, 'buka lagi fokus:', fokus, 'tutup esc:', await p.evaluate(() => document.getElementById('pilih-layar').hidden), 'lebar', await p.evaluate(() => document.documentElement.scrollWidth));
  // muat ulang: pilihan dan tema diingat
  await p.reload(); await p.waitForTimeout(gerak === 'reduce' ? 1200 : 5400);
  console.log(aw, 'setelah muat ulang:', JSON.stringify(await p.evaluate(() => ({ layar: document.getElementById('pilih-layar').hidden, karakter: PEMANDU.karakter, tema: document.documentElement.dataset.theme }))));
  console.log(galat.join('\n') || 'tanpa galat');
  await b.close();
})();
