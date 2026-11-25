// Menjalankan kelima adegan dengan klik sungguhan. node adegan.js <lebar> <tinggi> <tema> <gerak> <awalan>
const { chromium } = require('playwright');
const path = require('path');
const [,, W, H, tema, gerak, aw] = process.argv;
const L = path.resolve(__dirname, '..');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const hp = +W < 900;
  const ctx = await b.newContext({ viewport: { width: +W, height: +H }, deviceScaleFactor: 1, colorScheme: tema, reducedMotion: gerak, hasTouch: hp, isMobile: hp });
  const p = await ctx.newPage(); await p.addInitScript(() => { try { localStorage.setItem('agrosync-karakter', 'tata'); if (matchMedia('(prefers-color-scheme: dark)').matches) localStorage.setItem('agrosync-tema', 'dark'); } catch (e) {} });
  const galat = [];
  p.on('pageerror', (e) => galat.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) galat.push('console: ' + m.text()); });
  await p.route('https://cdnjs.cloudflare.com/**/three.min.js', (r) => r.fulfill({ path: L + '/vendor/three-r128.min.js', contentType: 'text/javascript' }));
  await p.route('https://fonts.**/**', (r) => r.abort());
  await p.goto('file://' + L + '/dist/index.html');
  await p.waitForTimeout(2500);
  await p.evaluate(() => document.getElementById('panggung').scrollIntoView({ block: 'start' }));
  await p.waitForTimeout(800);
  const foto = async (n) => { await p.locator('#panggung').screenshot({ path: `${L}/cek/${aw}-${n}.png` }); };
  const st = async (lbl) => console.log(lbl, JSON.stringify(await p.evaluate(() => ({ ad: S.adegan, lk: S.langkah, layar: S.layar, lembar: S.lembar, status: S.status, air: Math.round(S.levelAir), ph: +S.ph.toFixed(1), fokus: S.fokus, siA: S.siA, pompa: S.pompa.aktif, sisa: S.pompa.sisa, foto: S.foto.status, kamera: S.kamera, ajak: document.querySelector('#pj-ajak .isi').textContent.slice(0, 60), cairHP: document.getElementById('hp-cair-kiri').getAttribute('height') }))));
  const klik = async (sel, t = 700) => { await p.click(sel); await p.waitForTimeout(t); };
  const lanjut = async () => { await klik('#pj-aksi [data-aksi="lanjut"]', 1200); };
  // 1
  await foto('1a'); await st('1 awal');
  await klik('#hp-m-ph', 1800); await foto('1b'); await st('1 grafik');
  // 2
  await lanjut(); await st('2 awal');
  await klik('#btn-simulasi', 3800); await foto('2a'); await st('2 masalah');
  await klik('#hp-btn-langkah', 1500); await foto('2b'); await st('2 langkah');
  // 3
  await lanjut();
  await klik('#hp-tg-pompa', 900); await klik('#hp-seg-manual', 600); await foto('3a'); await klik('#hp-ya-manual', 700);
  await klik('#hp-pompa-air > button', 600); await klik('#hp-durasi-30', 500); await klik('#hp-nyalakan', 600); await klik('#hp-ya-nyalakan', 2800);
  await foto('3b'); await st('3 menyala');
  await p.waitForTimeout(6500); await foto('3c'); await st('3 selesai');
  // 4
  await lanjut();
  await klik('#kebun-hp .lubang-ketuk[data-n="5"]', 800); await foto('4a'); await st('4 pilih');
  await klik('#hp-buka-detail', 900); await klik('#hp-ambil-foto', 1850); await foto('4b'); await st('4 kilat');
  await p.waitForTimeout(1600); await foto('4c'); await st('4 selesai');
  // 5
  await lanjut();
  await klik('#hp-tg-panen', 2400); await foto('5a'); await st('5 panen');
  await p.locator('#penjelasan').screenshot({ path: `${L}/cek/${aw}-5b.png` });
  console.log('selesai', await p.evaluate(() => [...S.selesai].join(',')), 'lebar halaman', await p.evaluate(() => document.documentElement.scrollWidth));
  console.log(galat.join('\n') || 'tanpa galat');
  await b.close();
})();
