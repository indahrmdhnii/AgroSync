const { chromium } = require('playwright');
const L = require('path').resolve(__dirname, '..');
const [,, W = 1280, H = 900, n = 'SD', tema = 'light'] = process.argv;
(async () => {
  const b = await chromium.launch();
  const hp = +W < 900;
  const p = await (await b.newContext({ viewport: { width: +W, height: +H }, hasTouch: hp, isMobile: hp })).newPage();
  await p.addInitScript((t) => { try { localStorage.setItem('agrosync-karakter', 'tata'); localStorage.setItem('agrosync-tema', t); } catch (e) {} }, tema);
  const galat = []; p.on('pageerror', (e) => galat.push(e.message));
  await p.route('https://**/*', (r) => r.abort());
  await p.goto('file://' + L + '/dist/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(() => scrollTo(0, document.getElementById('sehari').offsetTop - 70)); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${L}/cek/${n}-0.png` });
  for (const i of [0, 1]) { await p.click(`[data-momen="${i}"]`); await p.waitForTimeout(400); }
  await p.screenshot({ path: `${L}/cek/${n}-2.png` });
  for (const i of [2, 3]) { await p.click(`[data-momen="${i}"]`); await p.waitForTimeout(400); }
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${L}/cek/${n}-4.png` });
  console.log(n, JSON.stringify(await p.evaluate(() => ({ teks: document.getElementById('misi-sehari-teks').textContent, misi: HADIAH.misi, aks: aksesoriAktif(), lebar: document.documentElement.scrollWidth }))));
  await p.reload(); await p.waitForTimeout(1500);
  console.log(n, 'muat ulang:', await p.evaluate(() => [document.getElementById('misi-sehari-teks').textContent, document.querySelectorAll('.momen.dicek').length]));
  console.log(galat.join('\n') || 'tanpa galat');
  await b.close();
})();
