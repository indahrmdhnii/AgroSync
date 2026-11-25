const { chromium } = require('playwright');
const path = require('path');
const L = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const galat = [];
  for (const [tema, W, H, nama] of [['dark', 1280, 900, 'PG'], ['light', 1280, 900, 'PT'], ['dark', 390, 844, 'PGH']]) {
    const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: tema, hasTouch: W < 900, isMobile: W < 900 });
    const p = await ctx.newPage(); await p.addInitScript(() => { try { localStorage.setItem('agrosync-karakter', 'tata'); if (matchMedia('(prefers-color-scheme: dark)').matches) localStorage.setItem('agrosync-tema', 'dark'); } catch (e) {} });
    p.on('pageerror', (e) => galat.push(nama + ': ' + e.message));
    await p.route('https://cdnjs.cloudflare.com/**/three.min.js', (r) => r.fulfill({ path: L + '/vendor/three-r128.min.js', contentType: 'text/javascript' }));
    await p.route('https://fonts.**/**', (r) => r.abort());
    await p.goto('file://' + L + '/dist/index.html'); await p.waitForTimeout(5600);
    await p.evaluate(() => { const s = document.getElementById('pemandu'); if (s) s.hidden = true; });
    // tampilkan semua elemen yang menunggu digulir
    await p.evaluate(() => document.querySelectorAll('.siap-muncul').forEach((e) => { e.classList.remove('siap-muncul'); e.classList.add('muncul'); }));
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${L}/cek/${nama}-atas.png` });
    await p.screenshot({ path: `${L}/cek/${nama}-penuh.png`, fullPage: true });
    console.log(nama, 'lebar', await p.evaluate(() => document.documentElement.scrollWidth));
    await ctx.close();
  }
  console.log(galat.join('\n') || 'tanpa galat');
  await b.close();
})();
