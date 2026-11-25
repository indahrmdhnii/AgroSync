const { chromium } = require('playwright');
const L = require('path').resolve(__dirname, '..');
const [,, W = 1280, H = 900, tema = 'light', aw = 'HD'] = process.argv;
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const hp = +W < 900;
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, hasTouch: hp, isMobile: hp, acceptDownloads: true });
  const p = await ctx.newPage(); const galat = [];
  if (tema === 'dark') await p.addInitScript(() => { try { localStorage.setItem('agrosync-tema', 'dark'); } catch (e) {} });
  p.on('pageerror', (e) => galat.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) galat.push('console: ' + m.text()); });
  await p.route('https://cdnjs.cloudflare.com/**/three.min.js', (r) => r.fulfill({ path: L + '/vendor/three-r128.min.js', contentType: 'text/javascript' }));
  await p.route('https://fonts.**/**', (r) => r.abort());
  await p.goto('file://' + L + '/dist/index.html'); await p.waitForTimeout(5400);
  await p.click('[data-pilih="ago"]'); await p.waitForTimeout(2200);
  await p.screenshot({ path: `${L}/cek/${aw}-1setelah-pilih.png` });
  const s1 = await p.evaluate(() => ({ misi: HADIAH.misi, stiker: HADIAH.stiker, aks: aksesoriAktif(), pot: document.getElementById('pot-nav').getAttribute('aria-label') }));
  console.log(aw, 'setelah pilih', JSON.stringify(s1));
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `${L}/cek/${aw}-2pemandu.png` });
  await p.click('#pot-nav'); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${L}/cek/${aw}-3panel.png` });
  await p.evaluate(() => document.querySelector('.hadiah-isi').scrollTo(0, 9999)); await p.waitForTimeout(800);
  await p.screenshot({ path: `${L}/cek/${aw}-4panel-bawah.png` });
  await p.click('[data-stiker]'); await p.waitForTimeout(800);
  await p.screenshot({ path: `${L}/cek/${aw}-5pratinjau.png` });
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.click('#pratinjau-unduh')]);
  if (dl) { const f = `${L}/cek/${aw}-unduh.png`; await dl.saveAs(f); console.log(aw, 'unduh png:', dl.suggestedFilename()); }
  await p.click('#pratinjau-tutup'); await p.waitForTimeout(300);
  // selesaikan semua misi
  await p.click('#hadiah-tutup'); await p.waitForTimeout(300);
  for (const id of ['bos', 'siram', 'tutorial', 'kolektor', 'harian', 'kepo']) await p.evaluate((i) => buka(i), id);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${L}/cek/${aw}-6lengkap.png` });
  await p.click('#pot-nav'); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${L}/cek/${aw}-7panel-lengkap.png` });
  await p.evaluate(() => document.querySelector('.hadiah-isi').scrollTo(0, 9999)); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${L}/cek/${aw}-8stiker-lengkap.png` });
  const [dz] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }).catch(() => null), p.click('#unduh-semua')]);
  if (dz) { const f = `${L}/cek/${aw}-stiker.zip`; await dz.saveAs(f); console.log(aw, 'unduh zip:', dz.suggestedFilename()); }
  console.log(aw, 'akhir', JSON.stringify(await p.evaluate(() => ({ misi: HADIAH.misi.length, stiker: HADIAH.stiker.length, urut: HADIAH.stiker.slice(0, 12), aks: aksesoriAktif(), lebar: document.documentElement.scrollWidth }))));
  console.log(galat.join('\n') || 'tanpa galat');
  await b.close();
})();
