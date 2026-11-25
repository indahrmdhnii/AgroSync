const { chromium } = require('playwright');
const path = require('path');
const L = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); await p.addInitScript(() => { try { localStorage.setItem('agrosync-karakter', 'tata'); if (matchMedia('(prefers-color-scheme: dark)').matches) localStorage.setItem('agrosync-tema', 'dark'); } catch (e) {} }); const galat = [];
  p.on('pageerror', (e) => galat.push(e.message));
  await p.route('https://cdnjs.cloudflare.com/**/three.min.js', (r) => r.fulfill({ path: L + '/vendor/three-r128.min.js', contentType: 'text/javascript' }));
  await p.route('https://fonts.**/**', (r) => r.abort());
  await p.goto('file://' + L + '/dist/index.html'); await p.waitForTimeout(700);
  await p.waitForTimeout(2000);
  await p.evaluate(() => document.getElementById('panggung').scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(500);
  await p.evaluate(() => document.getElementById('putar').click());
  const catat = [];
  for (let t = 0; t < 60; t += 4) {
    await p.waitForTimeout(4000);
    catat.push(await p.evaluate(() => `${S.adegan}.${S.langkah}:${S.layar}${S.lembar ? '+' + S.lembar : ''}:${Math.round(S.levelAir)}%`));
    if (t === 32) await p.locator('#panggung').screenshot({ path: L + '/cek/O-tengah.png' });
  }
  console.log(catat.join(' | '));
  console.log('akhir', JSON.stringify(await p.evaluate(() => ({ selesai: [...S.selesai], tombol: document.getElementById('putar').textContent.trim() }))));
  console.log(galat.join('\n') || 'tanpa galat');
  await b.close();
})();
