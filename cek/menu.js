const { chromium } = require('playwright');
const L = require('path').resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch();
  for (const [W, H, tema, n] of [[390, 844, 'dark', 'MG'], [360, 740, 'light', 'MT'], [768, 1024, 'light', 'MB']]) {
    const p = await (await b.newContext({ viewport: { width: W, height: H }, colorScheme: tema, hasTouch: true, isMobile: true })).newPage(); await p.addInitScript(() => { try { localStorage.setItem('agrosync-karakter', 'tata'); if (matchMedia('(prefers-color-scheme: dark)').matches) localStorage.setItem('agrosync-tema', 'dark'); } catch (e) {} });
    await p.route('https://cdnjs.cloudflare.com/**/three.min.js', (r) => r.fulfill({ path: L + '/vendor/three-r128.min.js', contentType: 'text/javascript' }));
    await p.route('https://fonts.**/**', (r) => r.abort());
    await p.goto('file://' + L + '/dist/index.html'); await p.waitForTimeout(1200);
    await p.click('#hamburger'); await p.waitForTimeout(500);
    await p.screenshot({ path: `${L}/cek/${n}-menu.png` });
    const info = await p.evaluate(() => ({ lebar: document.documentElement.scrollWidth, item: [...document.querySelectorAll('#menu-hp a')].map((a) => { const r = a.getBoundingClientRect(); return `${a.textContent.trim()}@${Math.round(r.left)},${Math.round(r.top)} w${Math.round(r.width)}`; }) }));
    console.log(n, JSON.stringify(info));
    await p.click('#menu-hp a[href="#fitur"]'); await p.waitForTimeout(800);
    console.log(n, 'menu tertutup setelah klik:', await p.evaluate(() => document.getElementById('menu-hp').hidden));
  }
  await b.close();
})();
