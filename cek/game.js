const { chromium } = require('playwright');
const path = require('path');
const L = path.resolve(__dirname, '..');
const [,, W, H, aw, tema = 'light'] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const hp = +W < 900;
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1, colorScheme: tema, hasTouch: hp, isMobile: hp });
  const p = await ctx.newPage(); await p.addInitScript(() => { try { localStorage.setItem('agrosync-karakter', 'tata'); if (matchMedia('(prefers-color-scheme: dark)').matches) localStorage.setItem('agrosync-tema', 'dark'); } catch (e) {} }); const galat = [];
  p.on('pageerror', (e) => galat.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) galat.push('console: ' + m.text()); });
  await p.route('https://cdnjs.cloudflare.com/**/three.min.js', (r) => r.fulfill({ path: L + '/vendor/three-r128.min.js', contentType: 'text/javascript' }));
  await p.route('https://fonts.**/**', (r) => r.abort());
  await p.goto('file://' + L + '/dist/index.html'); await p.waitForTimeout(6200);
  await p.screenshot({ path: `${L}/cek/${aw}-g-hero.png` });
  const ke = async (id, dy = 70) => { await p.evaluate(([i, d]) => scrollTo(0, document.getElementById(i).offsetTop - d), [id, dy]); await p.waitForTimeout(1300); };
  // Bos
  await ke('masalah');
  for (const i of [0, 1, 2]) { await p.locator('.kartu-bos').nth(i).click(); await p.waitForTimeout(250); }
  await p.waitForTimeout(400); await p.screenshot({ path: `${L}/cek/${aw}-g-bos-kena.png` });
  await p.waitForTimeout(1000); await p.screenshot({ path: `${L}/cek/${aw}-g-bos.png` });
  // Power-up
  await ke('fitur');
  await p.waitForTimeout(800);
  await p.click('[data-wg="radar"]'); await p.click('[data-wg="notif"]'); await p.waitForTimeout(300); await p.click('#notif-kunci');
  await p.click('[data-wg="siram"]'); await p.click('[data-wg="kamera"]'); await p.click('[data-rentang="7"]');
  for (let i = 0; i < 4; i++) { await p.click('[data-wg="tumbuh"]'); await p.waitForTimeout(150); }
  await p.waitForTimeout(1300); await p.screenshot({ path: `${L}/cek/${aw}-g-pu.png` });
  await p.screenshot({ path: `${L}/cek/${aw}-g-pu-penuh.png`, clip: await p.evaluate(() => { const r = document.querySelector('#fitur .fitur-grid').getBoundingClientRect(); return { x: 0, y: r.top + scrollY, width: innerWidth, height: r.height + 20 }; }), fullPage: true });
  // Obrolan
  await ke('faq');
  for (const i of [0, 2, 1]) { await p.click(`[data-tanya="${i}"]`); await p.waitForFunction(() => !document.querySelector('[data-tanya] [disabled], [data-tanya]:disabled'), null, { timeout: 15000 }); await p.waitForTimeout(300); }
  await p.waitForTimeout(500); await p.screenshot({ path: `${L}/cek/${aw}-g-faq.png` });
  // Penampung di kebun
  await ke('demo', 0);
  await p.evaluate(() => document.getElementById('panggung').scrollIntoView({ block: 'start' }));
  await p.waitForTimeout(1200);
  await p.locator('#panel-kebun').screenshot({ path: `${L}/cek/${aw}-g-wadah0.png` });
  await p.click('.chip-wadah[data-wadah="nutA"]'); await p.waitForTimeout(500);
  await p.locator('#panel-kebun').screenshot({ path: `${L}/cek/${aw}-g-wadah-lompat.png` });
  await p.waitForTimeout(1200);
  await p.locator('#panel-kebun').screenshot({ path: `${L}/cek/${aw}-g-wadah.png` });
  const info = await p.evaluate(() => ({ piala: HADIAH.misi, info: document.getElementById('info-wadah-judul').textContent, lebar: document.documentElement.scrollWidth }));
  console.log(aw, JSON.stringify(info));
  console.log(galat.join('\n') || 'tanpa galat');
  await b.close();
})();
