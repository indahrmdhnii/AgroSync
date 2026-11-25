/* ============================================================ Aplikasi di HP (POV HP)
   Tiruan AgroSync 2.4 dengan HTML/CSS. Semua tampilan dibaca dari state S; ketukan
   dikirim ke pengatur demo lewat kirim(peristiwa, data). */

// Data contoh yang sama dengan aplikasi (24 lubang, Pakcoy 1-12, Selada 13-24).
const TANAMAN = (() => {
  const umur = { 1: 34, 2: 34, 3: 31, 4: 30, 5: 24, 6: 24, 7: 30, 8: 26, 9: 24, 10: 20, 11: 18, 13: 20, 14: 18, 15: 14, 16: 14, 17: 10, 18: 10, 19: 8, 20: 6, 21: 5, 23: 4, 24: 3 };
  const ambang = [0, 7, 14, 22, 30], mundur = { 16: 1 }, kondisi = { 5: 'cek', 9: 'masalah', 16: 'cek' };
  const lihat = { 5: 'Daun bawah menguning', 9: 'Bercak cokelat di daun', 16: 'Tumbuh lebih lambat' };
  const sebab = { 5: 'Biasanya tanda pupuknya kurang.', 9: 'Bisa jadi jamur, dan bisa menular ke tanaman sebelah.', 16: 'Ukurannya lebih kecil dari tanaman lain yang seumur.' };
  return Array.from({ length: 24 }, (_, i) => {
    const n = i + 1, h = umur[n];
    if (h == null) return { n, kosong: true };
    let idx = 0;
    ambang.forEach((a, j) => { if (h >= a) idx = j; });
    idx = Math.max(0, idx - (mundur[n] || 0));
    return { n, jenis: n <= 12 ? 'Pakcoy' : 'Selada', umur: h, level: idx + 1, kondisi: kondisi[n] || 'sehat', lihat: lihat[n], sebab: sebab[n] };
  });
})();
const LEVEL = ['Semai', 'Tunas', 'Remaja', 'Dewasa', 'Siap panen'];
const SIAP_PANEN = TANAMAN.filter((t) => t.level === 5);
const SENSOR = {
  ph: { nama: 'pH air', pendek: 'pH', satuan: '', ideal: [5.5, 6.8], sumbu: [5, 7.6], ikon: 'ph', des: 1, istilah: 'keasaman air' },
  suhu: { nama: 'Suhu air', pendek: 'Suhu', satuan: ' °C', label: '°', ideal: [18, 28], sumbu: [16, 30], ikon: 'suhu', des: 1 },
  air: { nama: 'Level air', pendek: 'Air', satuan: '%', label: '%', ideal: [40, 100], sumbu: [0, 100], ikon: 'air', des: 0 },
  pupuk: { nama: 'Pupuk (TDS)', pendek: 'Pupuk', satuan: ' ppm', ideal: [600, 1200], sumbu: [400, 1400], ikon: 'pupuk', des: 0 },
};
const SENSOR_LAIN = [
  { nama: 'Suhu udara', nilai: '28,4 °C', ideal: '20–32 °C' },
  { nama: 'Kelembapan', nilai: '68%', ideal: '50–80%' },
];
const POMPA = [
  { id: 'air', nama: 'Pompa air bersih', ket: 'Dari galon Air Bersih', ikon: 'galon', warna: '#2F7FC1' },
  { id: 'nutA', nama: 'Pompa nutrisi A', ket: 'Dirigen hijau: kalsium, kalium, zat besi', ikon: 'dirigen', warna: '#1E8A3E' },
  { id: 'nutB', nama: 'Pompa nutrisi B', ket: 'Dirigen merah: fosfat, magnesium, unsur mikro', ikon: 'dirigen', warna: '#C0352C' },
];
const DURASI = [10, 30, 60];

const angka = (v, des = 0) => Number(v).toFixed(des).replace('.', ',');
const nilaiSensor = (k) => ({ ph: S.ph, suhu: S.suhu, air: S.levelAir, pupuk: S.tds })[k];
function statusSensor(k) {
  const v = nilaiSensor(k), [lo, hi] = SENSOR[k].ideal;
  if (S.offline) return 'offline';
  if (v < lo || v > hi) return (k === 'air' && v < 20) ? 'bahaya' : 'waspada';
  return 'normal';
}
const LABEL_STATUS = { normal: 'Aman', waspada: 'Waspada', bahaya: 'Bahaya', offline: 'Offline' };
const WARNA_STATUS = { normal: '#2E7D32', waspada: '#B7791F', bahaya: '#C62828', offline: '#6B7280' };
function sapaan() {
  const j = new Date().getHours();
  return j < 11 ? 'Selamat pagi' : j < 15 ? 'Selamat siang' : j < 18 ? 'Selamat sore' : 'Selamat malam';
}
const jamSekarang = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`; };

/* ------------------------------------------------------------ Geometri papan isometrik
   Satuan gambar sama dengan aplikasi: kanvas 400 x 340, u = (30, 17), v = (-30, 17). */
const iso = (a, b) => [170 + 30 * a - 30 * b, 110 + 17 * a + 17 * b];
const lubangXY = (n) => { const r = Math.floor((n - 1) / 6), c = (n - 1) % 6; return iso(c + .5, r + .5); };
const SUDUT = { atas: iso(-.55, -.55), kanan: iso(6.55, -.55), depan: iso(6.55, 4.55), kiri: iso(-.55, 4.55) };
const TUTUP = 8, DALAM = 44;
// Satuan gambar -> piksel layar HP (kebun-svg di top 170, lebar 360 = 280 satuan).
const SKALA_K = 360 / 280;
const keLayar = (x, y) => [(x - 60) * SKALA_K, 170 + (y - 20) * SKALA_K];
const permukaan = (lv) => 1 - .9 * Math.max(.08, Math.min(1, lv));

function tanaman2D(t) {
  if (t.kosong) return '';
  const [cx, cy] = lubangXY(t.n);
  const s = [0, .42, .58, .74, .88, 1][t.level];
  let g = '';
  if (t.jenis === 'Pakcoy') {
    const warna = ['#4FA83C', '#6CC04A', '#3E9A3A', '#6CC04A', '#4FA83C'];
    [-40, -20, 0, 20, 40].forEach((a, i) => {
      const sakit = t.kondisi === 'cek' && (i === 0 || i === 4);
      g += `<g transform="rotate(${a})"><ellipse cx="0" cy="-16" rx="7" ry="15" fill="${sakit ? '#C9C24A' : warna[i]}"/><path d="M0 -2 L0 -24" stroke="${sakit ? '#E8E2A0' : '#D7EEC0'}" stroke-width="2" stroke-linecap="round"/></g>`;
    });
    if (t.kondisi === 'masalah') g += '<g fill="#8D6E3F"><circle cx="-6" cy="-18" r="2"/><circle cx="7" cy="-22" r="1.6"/><circle cx="2" cy="-12" r="1.4"/></g>';
  } else {
    const warna = ['#7BC74E', '#8CCF5A', '#A5DC74', '#8CCF5A', '#7BC74E', '#93D465'];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sakit = t.kondisi === 'cek' && i < 2;
      g += `<ellipse cx="${(Math.cos(a) * 8).toFixed(1)}" cy="${(-7 + Math.sin(a) * 4.5).toFixed(1)}" rx="9" ry="7.2" fill="${sakit ? '#C9C24A' : warna[i]}"/>`;
    }
    g += '<ellipse cx="0" cy="-10" rx="6" ry="5" fill="#C9EC97"/>';
  }
  return `<g class="tanaman" data-n="${t.n}" transform="translate(${cx} ${cy - 1}) scale(${s})">${g}</g>`;
}
function lencana2D(t) {
  if (t.kosong) return '';
  const jenis = t.level === 5 ? 'panen' : t.kondisi === 'cek' ? 'cek' : t.kondisi === 'masalah' ? 'masalah' : null;
  if (!jenis) return '';
  const [cx, cy] = lubangXY(t.n);
  const s = [0, .42, .58, .74, .88, 1][t.level];
  const y = cy - (t.jenis === 'Pakcoy' ? 34 : 18) * s - 13;
  const isi = jenis === 'panen'
    ? '<g fill="#F5B82E"><circle cx="0" cy="-3.6" r="2.6"/><circle cx="3.4" cy="-1.1" r="2.6"/><circle cx="2.1" cy="2.9" r="2.6"/><circle cx="-2.1" cy="2.9" r="2.6"/><circle cx="-3.4" cy="-1.1" r="2.6"/></g><circle r="1.8" fill="#FFF3C4"/>'
    : jenis === 'cek'
      ? '<path d="M0 -6 L6.5 5 H-6.5 Z" fill="#B7791F" stroke="#B7791F" stroke-width="1.5" stroke-linejoin="round"/><rect x="-.9" y="-2.6" width="1.8" height="4" rx=".9" fill="#fff"/><circle cy="3" r=".95" fill="#fff"/>'
      : '<circle r="6.4" fill="#C62828"/><rect x="-.9" y="-3.8" width="1.8" height="4.6" rx=".9" fill="#fff"/><circle cy="3" r="1" fill="#fff"/>';
  return `<g class="lencana-2d ${jenis === 'panen' ? 'lencana-panen' : ''}" transform="translate(${cx} ${y})"><rect x="-10" y="-10" width="20" height="20" rx="6" fill="#fff"/><path d="M-3 9.5 L0 13.5 L3 9.5Z" fill="#fff"/>${isi}</g>`;
}
function labelLubang(t) {
  if (t.kosong) return `Lubang ${t.n}, kosong`;
  const st = t.kondisi === 'cek' ? ', perlu dicek' : t.kondisi === 'masalah' ? ', bermasalah' : '';
  return `Lubang ${t.n}, ${t.jenis}, level ${t.level} ${LEVEL[t.level - 1]}${st}`;
}

function kebunHPSVG() {
  const { atas, kanan, depan, kiri } = SUDUT;
  const pt = (p, dy = 0) => `${p[0]},${p[1] + dy}`;
  const slopeKiri = ((depan[1] - kiri[1]) / (depan[0] - kiri[0])).toFixed(5);
  const slopeKanan = ((kanan[1] - depan[1]) / (kanan[0] - depan[0])).toFixed(5);
  const lebarKiri = depan[0] - kiri[0], lebarKanan = kanan[0] - depan[0];
  // Garis kisi di papan
  let kisi = '';
  for (let c = 0; c <= 6; c++) kisi += `<line x1="${iso(c, 0)[0]}" y1="${iso(c, 0)[1]}" x2="${iso(c, 4)[0]}" y2="${iso(c, 4)[1]}"/>`;
  for (let r = 0; r <= 4; r++) kisi += `<line x1="${iso(0, r)[0]}" y1="${iso(0, r)[1]}" x2="${iso(6, r)[0]}" y2="${iso(6, r)[1]}"/>`;
  // Lubang (alas + lubang), tanaman urut dari belakang ke depan, lencana, area ketuk
  let alas = '', tumbuh = '', lencana = '', ketuk = '';
  const urut = [...TANAMAN].sort((a, b) => { const [ax, ay] = lubangXY(a.n), [bx, by] = lubangXY(b.n); return ay - by || ax - bx; });
  for (const t of urut) {
    const [cx, cy] = lubangXY(t.n);
    alas += `<ellipse cx="${cx}" cy="${cy}" rx="17" ry="9.75" class="hp-alas"/>`;
    alas += t.kosong
      ? `<ellipse cx="${cx}" cy="${cy}" rx="10.5" ry="6" fill="var(--hp-lubang)"/><ellipse cx="${cx}" cy="${cy}" rx="16" ry="9.2" fill="none" stroke="#7E8F81" stroke-width="1.3" stroke-dasharray="3 3"/>`
      : `<ellipse cx="${cx}" cy="${cy}" rx="10.5" ry="6" fill="var(--hp-lubang)"/><ellipse cx="${cx}" cy="${cy + .5}" rx="6.5" ry="3.6" fill="#C9A77A"/>`;
    tumbuh += tanaman2D(t);
    lencana += lencana2D(t);
    ketuk += `<g class="lubang-ketuk" data-n="${t.n}" role="button" tabindex="-1" aria-label="${labelLubang(t)}"><ellipse class="target" cx="${cx}" cy="${cy - 6}" rx="17" ry="14" fill="transparent"/></g>`;
  }
  const muka = (id, x, y, slope, w, gelap) => `
    <g transform="translate(${x} ${y}) matrix(1 ${slope} 0 1 0 0)">
      <rect width="${w}" height="${DALAM}" fill="var(--hp-kaca)"/>
      <rect id="${id}" x="0" y="13" width="${w}" height="31" fill="url(#hp-grad-cair)"/>
      <path id="${id}-ombak" d="" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="1.2"/>
      ${gelap ? `<rect width="${w}" height="${DALAM}" fill="rgba(0,0,0,.07)"/>` : ''}
      <g fill="rgba(255,255,255,.8)"><circle cx="${w * .3}" cy="34" r="1.5"/><circle cx="${w * .52}" cy="26" r="1.1"/><circle cx="${w * .74}" cy="37" r="1.4"/></g>
      <path d="M0 0V${DALAM}H${w}V0" fill="none" stroke="var(--hp-tepi-kaca)" stroke-width="1.4"/>
    </g>`;
  return `
  <svg class="kebun-svg" id="kebun-hp" viewBox="60 20 280 357.8" preserveAspectRatio="none" aria-hidden="false" role="group" aria-label="Papan tanam 24 lubang di atas bak transparan">
    <defs>
      <linearGradient id="hp-grad-cair" x1="0" y1="0" x2="0" y2="1">
        <stop id="hp-cair-1" offset="0" stop-color="var(--hp-air)"/><stop id="hp-cair-2" offset=".3" stop-color="var(--hp-air)"/>
        <stop id="hp-cair-3" offset=".66" stop-color="var(--hp-pupuk)"/><stop offset="1" stop-color="var(--hp-pupuk)"/>
      </linearGradient>
    </defs>
    <ellipse cx="${depan[0] - 8}" cy="${depan[1] + TUTUP + DALAM + 4}" rx="190" ry="34" fill="rgba(20,40,25,.16)"/>
    ${muka('hp-cair-kiri', kiri[0], kiri[1] + TUTUP, slopeKiri, lebarKiri, true)}
    ${muka('hp-cair-kanan', depan[0], depan[1] + TUTUP, slopeKanan, lebarKanan, false)}
    <polygon points="${pt(kiri)} ${pt(depan)} ${pt(depan, TUTUP)} ${pt(kiri, TUTUP)}" fill="var(--hp-papan-sisi)"/>
    <polygon points="${pt(depan)} ${pt(kanan)} ${pt(kanan, TUTUP)} ${pt(depan, TUTUP)}" fill="var(--hp-papan-sisi)" opacity=".8"/>
    <polygon points="${pt(atas)} ${pt(kanan)} ${pt(depan)} ${pt(kiri)}" fill="var(--hp-papan)"/>
    <g stroke="var(--hp-papan-garis)" stroke-width="1.1">${kisi}</g>
    ${alas}
    <ellipse id="hp-cincin-pilih" cx="0" cy="0" rx="20" ry="11.5" fill="none" stroke="#fff" stroke-width="3" visibility="hidden"/>
    ${tumbuh}${lencana}
    <circle id="hp-cincin-petunjuk" class="cincin-lubang" cx="0" cy="0" r="14" visibility="hidden"/>
    ${ketuk}
  </svg>`;
}

/* ------------------------------------------------------------ Kerangka DOM */
const METER = [
  { k: 'ph', x: 48, atas: true },
  { k: 'suhu', x: 312, atas: true },
  { k: 'air', x: 48, atas: false },
  { k: 'pupuk', x: 312, atas: false },
];
const Y_BAWAH = 560;
function meterHTML(m) {
  const s = SENSOR[m.k];
  const lbl = `<span class="lbl" id="hp-ml-${m.k}">${s.pendek} <b>–</b></span>`;
  const cincin = `<span class="cincin"><svg class="ring" viewBox="0 0 52 52"><circle cx="26" cy="26" r="21" fill="none" stroke="var(--hp-garis)" stroke-width="5.5"/><circle class="isi" cx="26" cy="26" r="21" fill="none" stroke-width="5.5" stroke-linecap="round" stroke-dasharray="0 999"/></svg>${ikon(s.ikon, 'ik')}<svg class="tanda" viewBox="0 0 24 24" hidden>${IK.waspada}</svg></span>`;
  return `<button class="meter" id="hp-m-${m.k}" data-sensor="${m.k}" style="left:${m.x}px">${m.atas ? lbl + cincin : cincin + lbl}</button>`;
}
function tombolGame(id, label, ik, warna, alas, lencana) {
  return `<button class="tombol-game" id="hp-tg-${id}" aria-label="${label}${lencana ? ', ' + lencana : ''}">
    <span class="bulat"><span class="alas" style="background:${alas}"></span><span class="muka" style="background:radial-gradient(circle at 35% 30%, ${warna}cc, ${warna})">${ikon(ik)}</span>${lencana ? `<span class="lencana">${lencana}</span>` : ''}</span>
    <span class="lbl">${label}</span></button>`;
}
function hpKerangka() {
  return `
  <div class="hp-status" aria-hidden="true"><span id="hp-jam">09.41</span>
    <span class="ikon"><svg width="16" height="12" viewBox="0 0 17 12" fill="currentColor"><path d="M8.5 11.6 0 3.2a12 12 0 0 1 17 0Z"/></svg>
    <svg width="15" height="12" viewBox="0 0 16 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="4.3" y="5.5" width="3" height="6.5" rx="1"/><rect x="8.6" y="3" width="3" height="9" rx="1"/><rect x="12.9" y="0" width="3" height="12" rx="1" opacity=".35"/></svg>
    <svg width="24" height="12" viewBox="0 0 24 12" fill="none" stroke="currentColor"><rect x=".75" y=".75" width="20.5" height="10.5" rx="3"/><rect x="2.6" y="2.6" width="14" height="6.8" rx="1.6" fill="currentColor" stroke="none"/><path d="M22.8 4.2v3.6" stroke-width="1.6" stroke-linecap="round"/></svg></span></div>
  <div class="hp-kamera" aria-hidden="true"></div>

  <section class="layar beranda" id="l-beranda" aria-label="Beranda">
    ${kebunHPSVG()}
    <svg id="hp-garis-meter" width="360" height="760" style="position:absolute;inset:0;pointer-events:none;z-index:3" aria-hidden="true"></svg>
    <div class="bar-atas">
      <button class="pil-kebun" id="hp-pil-kebun" aria-label="Kebun Teras Rumah, online. Ganti kebun">
        ${logoSVG('logo-k', '')}<span style="min-width:0;flex:1"><span class="nm">Kebun Teras Rumah</span><span class="st" id="hp-st-online"><i>${ikon('centangPolos')}</i><span>Online · <span id="hp-jam-2">09.41</span></span></span></span>${ikon('chevBawah', 'chev')}
      </button>
      <button class="bulat-kecil" id="hp-lonceng" aria-label="Notifikasi, 3 belum dibaca">${ikon('lonceng')}<span class="lencana" id="hp-lencana-notif">3</span></button>
      <button class="bulat-kecil" id="hp-profil" aria-label="Profil">${ikon('orang')}</button>
    </div>
    <div class="baris-balon" id="hp-baris-balon">
      <button class="lampu" id="hp-lampu" aria-label="Saran hari ini">${bohlamSVG()}<span class="lbl" id="hp-lampu-lbl">Saran</span><span class="seru" id="hp-lampu-seru" hidden>!</span></button>
      <div class="balon" id="hp-balon" role="status">
        <div class="salam" id="hp-salam">Selamat pagi!</div>
        <div class="pesan"><span id="hp-balon-ikon" style="color:#2E7D32">${ikon('centang')}</span><span id="hp-balon-teks">Kebunmu sehat hari ini.</span></div>
        <div class="petunjuk" id="hp-balon-petunjuk">Ketuk tanaman untuk detail.</div>
        <button class="btn-langkah" id="hp-btn-langkah" hidden>${ikon('langkah')}Lihat langkah</button>
        <button class="ib tutup" id="hp-tutup-balon" aria-label="Tutup pesan">${ikon('silang')}</button>
      </div>
    </div>
    ${METER.map(meterHTML).join('')}
    <button class="semua-sensor" id="hp-semua-sensor" style="top:${Y_BAWAH - 22}px">${ikon('dasbor')}Semua sensor${ikon('chevKanan')}</button>
    <div class="kartu-pilih" id="hp-kartu-pilih" hidden>
      <div class="atas"><span class="lencana-lubang" id="hp-pilih-lencana">5</span><span style="flex:1;min-width:0"><b id="hp-pilih-judul">Lubang 5 · Pakcoy</b><small id="hp-pilih-sub">Level 4 Dewasa · Perlu dicek</small></span>
        <button class="ib" id="hp-pilih-tutup" aria-label="Batal pilih">${ikon('silang')}</button></div>
      <button class="btn-isi" id="hp-buka-detail">${ikon('chevKanan')}<span id="hp-buka-detail-lbl">Buka detail lubang 5</span></button>
    </div>
    <div class="bar-bawah">
      ${tombolGame('grafik', 'Grafik', 'grafik', '#3B7DD8', '#255A9E')}
      ${tombolGame('pompa', 'Pompa', 'tetes', '#3E9A4A', '#2A6E33')}
      ${tombolGame('panen', 'Panen', 'bunga', '#F59E0B', '#B86E00', String(SIAP_PANEN.length))}
      ${tombolGame('lubang', 'Lubang', 'grid', '#2E7D32', '#1D5A22')}
    </div>
  </section>

  <section class="layar layar-halaman kanan" id="l-grafik" aria-label="Grafik" aria-hidden="true">
    <div class="appbar"><button class="ib" data-kembali aria-label="Kembali">${ikon('kembali')}</button><h4>Grafik</h4></div>
    <div class="isi-halaman" id="hp-isi-grafik"></div>
  </section>
  <section class="layar layar-halaman kanan" id="l-pompa" aria-label="Pompa" aria-hidden="true">
    <div class="appbar"><button class="ib" data-kembali aria-label="Kembali">${ikon('kembali')}</button><h4>Pompa</h4></div>
    <div class="isi-halaman" id="hp-isi-pompa"></div>
  </section>
  <section class="layar layar-halaman kanan" id="l-detail" aria-label="Detail tanaman" aria-hidden="true">
    <div class="appbar"><button class="ib" data-kembali aria-label="Kembali">${ikon('kembali')}</button><h4 id="hp-judul-detail">Lubang 5</h4></div>
    <div class="isi-halaman" id="hp-isi-detail"></div>
  </section>

  <button class="notif" id="hp-notif" aria-hidden="true" tabindex="-1">
    <span class="ap">${logoSVG('', '')}</span>
    <span><span class="kecil">AgroSync · sekarang</span><b id="hp-notif-judul">Air di bak tinggal 34%</b><span class="isi" id="hp-notif-isi">pH air juga naik ke 7,2. Ketuk untuk melihat langkah.</span></span>
  </button>
  <div class="skrim" id="hp-skrim"></div>
  <div class="lembar" id="hp-lembar" role="dialog" aria-modal="true" aria-hidden="true"></div>
  <div class="dialog" id="hp-dialog" role="alertdialog" aria-modal="true" aria-hidden="true"></div>
  <div class="toast" id="hp-toast" role="status" aria-live="polite"></div>
  <div class="hp-gestur" aria-hidden="true"></div>`;
}

/* ------------------------------------------------------------ Isi halaman */
function dataGrafik(k) {
  const s = SENSOR[k], now = nilaiSensor(k);
  const dasar = { ph: 6.1, suhu: 24.2, air: 80, pupuk: 840 }[k];
  const amp = { ph: .12, suhu: 1.6, air: 4, pupuk: 35 }[k];
  const pts = [];
  for (let i = 0; i < 25; i++) pts.push(dasar + Math.sin(i / 3.2) * amp * .7 + Math.cos(i / 1.7) * amp * .3);
  // Tiga jam terakhir mengarah ke nilai sekarang (mis. pH naik saat ada masalah).
  const awal = pts[21];
  for (let i = 22; i < 25; i++) pts[i] = awal + (now - awal) * ((i - 21) / 3);
  return pts.map((v) => Math.max(s.sumbu[0], Math.min(s.sumbu[1], v)));
}
function grafikHTML(k) {
  const s = SENSOR[k], pts = dataGrafik(k), st = statusSensor(k);
  const W = 320, H = 170, L = 34, R = 10, T = 10, B = 26;
  const x = (i) => L + (i / 24) * (W - L - R);
  const y = (v) => T + (1 - (v - s.sumbu[0]) / (s.sumbu[1] - s.sumbu[0])) * (H - T - B);
  const garis = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${garis} L${x(24)} ${H - B} L${x(0)} ${H - B} Z`;
  const ticks = { ph: [5, 6, 7], suhu: [18, 23, 28], air: [0, 50, 100], pupuk: [600, 900, 1200] }[k];
  const min = Math.min(...pts), max = Math.max(...pts), rata = pts.reduce((a, b) => a + b, 0) / pts.length;
  const sekarang = angka(nilaiSensor(k), s.des);
  const ringkas = st === 'normal'
    ? `${s.nama} aman sepanjang 24 jam terakhir. Sekarang ${sekarang}${s.satuan}.`
    : `${s.nama} aman hampir sepanjang hari, tapi ${nilaiSensor(k) > s.ideal[1] ? 'naik' : 'turun'} dalam 3 jam terakhir. Sekarang ${sekarang}${s.satuan}, ${nilaiSensor(k) > s.ideal[1] ? 'terlalu tinggi' : 'terlalu rendah'}.`;
  const istilah = s.istilah ? ` <span style="color:var(--hp-teks-2)">(${s.istilah})</span>` : '';
  return `
    <div class="chips" aria-label="Pilih sensor">${Object.entries(SENSOR).map(([kk, ss]) => `<span class="${kk === k ? 'on' : ''}">${ss.nama}</span>`).join('')}</div>
    <div class="segmen" style="grid-template-columns:repeat(3,1fr)"><button aria-pressed="true">24 jam</button><button aria-pressed="false">7 hari</button><button aria-pressed="false">30 hari</button></div>
    <div class="kartu-hp">
      <h6>${s.nama}${istilah}</h6>
      <p style="color:var(--hp-teks)">${ringkas}</p>
      <svg class="grafik-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik ${s.nama} 24 jam terakhir">
        <rect x="${L}" y="${y(s.ideal[1])}" width="${W - L - R}" height="${y(s.ideal[0]) - y(s.ideal[1])}" fill="#2E7D32" opacity=".12"/>
        ${ticks.map((t) => `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="var(--hp-garis)" stroke-width="1"/><text x="${L - 6}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="var(--hp-teks-2)">${angka(t, k === 'ph' ? 1 : 0)}</text>`).join('')}
        <path d="${area}" fill="${WARNA_STATUS[st]}" opacity=".1"/>
        <path d="${garis}" fill="none" stroke="${WARNA_STATUS[st]}" stroke-width="2.4" stroke-linejoin="round"/>
        <circle cx="${x(24)}" cy="${y(pts[24])}" r="5" fill="${WARNA_STATUS[st]}" stroke="var(--hp-permukaan)" stroke-width="2"/>
        <g font-size="11" fill="var(--hp-teks-2)"><text x="${L}" y="${H - 8}">24 jam lalu</text><text x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle">12 jam lalu</text><text x="${W - R}" y="${H - 8}" text-anchor="end">sekarang</text></g>
      </svg>
      <p style="display:flex;align-items:center;gap:6px"><span style="width:14px;height:10px;border-radius:3px;background:#2E7D32;opacity:.25;display:inline-block"></span>Area hijau = rentang ideal ${angka(s.ideal[0], s.des)}–${angka(s.ideal[1], s.des)}${s.satuan}</p>
      <div class="statistik"><div><b>${angka(min, s.des)}</b><small>Terendah</small></div><div><b>${angka(rata, s.des)}</b><small>Rata-rata</small></div><div><b>${angka(max, s.des)}</b><small>Tertinggi</small></div></div>
    </div>`;
}
function pompaHTML() {
  const p = S.pompa, manual = p.mode === 'manual';
  const baris = POMPA.map((m) => {
    const aktif = p.aktif === m.id, buka = manual && p.terpilih === m.id && !aktif;
    const st = aktif ? `<span class="chip-st nyala">Menyala</span>` : `<span class="chip-st">Mati</span>`;
    let bawah = '';
    if (buka) {
      bawah = `<div class="pompa-buka"><p style="font-size:13.5px;color:var(--hp-teks-2)">Berapa lama pompa menyala?</p>
        <div class="chip-durasi" role="group" aria-label="Durasi">${DURASI.map((d) => `<button id="hp-durasi-${d}" data-durasi="${d}" aria-pressed="${p.durasi === d}">${d} detik</button>`).join('')}</div>
        <button class="btn-isi" id="hp-nyalakan">${ikon('putar')}Nyalakan ${p.durasi} detik</button></div>`;
    } else if (aktif) {
      const persen = 100 * (1 - p.sisa / p.durasi);
      bawah = `<div class="pompa-buka hitung" aria-live="polite">
        <div class="status-perintah">${ikon('centang')}<span id="hp-perintah">${p.perintah === 'kirim' ? 'Lagi nyambung ke kebun…' : 'Kebun sudah terima perintahnya'}</span></div>
        <span class="angka" id="hp-hitung">0:${String(Math.ceil(p.sisa)).padStart(2, '0')}</span>
        <div class="bilah"><i id="hp-bilah" style="width:${persen}%"></i></div>
        <small style="color:var(--hp-teks-2)">Mati sendiri saat hitungan habis (dipercepat untuk demo).</small></div>`;
    }
    return `<div class="pompa-baris" id="hp-pompa-${m.id}"><button data-pompa="${m.id}" ${manual ? '' : 'disabled'} aria-expanded="${buka}">
      <span class="ikp" style="color:${m.warna}">${ikon(m.ikon)}</span><span><b>${m.nama}</b><small>${m.ket}</small></span>${st}</button>${bawah}</div>`;
  }).join('');
  const riwayat = [...S.riwayat].slice(0, 3).map((r) => `<div class="baris-daftar" style="grid-template-columns:28px minmax(0,1fr);min-height:44px">${ikon('jam', '', 'style="width:20px;height:20px;color:var(--hp-teks-2)"')}<span>${r.nama} · ${r.durasi} detik<small>${r.waktu} · ${r.pemicu}</small></span></div>`).join('');
  return `
    <div class="kartu-hp"><h6>Cara kerja pompa</h6>
      <div class="segmen" role="group" aria-label="Mode pompa">
        <button id="hp-seg-otomatis" aria-pressed="${!manual}">${!manual ? ikon('centangPolos') : ''}Otomatis</button>
        <button id="hp-seg-manual" aria-pressed="${manual}">${manual ? ikon('centangPolos') : ''}Manual</button></div>
      <p>${manual ? 'Kamu yang memilih pompa dan lamanya menyala.' : 'Sistem menyalakan pompa sendiri sesuai batas aman sensor. Pindah ke Manual untuk menyalakan sendiri.'}</p></div>
    <div style="display:grid;gap:8px">${baris}</div>
    <div class="kartu-hp"><h6>Riwayat penyiraman</h6>${riwayat}</div>`;
}
function detailHTML(n) {
  const t = TANAMAN[n - 1];
  if (t.kosong) return `<div class="kartu-hp"><h6>Lubang ${n} masih kosong</h6><p>Tanam bibit lalu ambil foto pertama dari kamera kebun.</p></div>`;
  const st = t.kondisi === 'cek' ? ['waspada', 'Perlu dicek'] : t.kondisi === 'masalah' ? ['bahaya', 'Bermasalah'] : ['normal', 'Sehat'];
  const w = WARNA_STATUS[st[0]];
  const fotoAda = S.foto.lubang === n && S.foto.status === 'selesai';
  const memuat = S.foto.lubang === n && S.foto.status === 'memuat';
  return `
    <div class="kepala-detail"><span class="lencana-lubang" style="background:${t.level === 5 ? '#1B5E20' : '#2E7D32'}">${n}</span>
      <span style="display:grid;gap:4px"><b style="font-size:17px">${t.jenis} · ${t.umur} hari</b>
      <span class="chip-status" style="background:${w}22;color:${w}">${ikon(st[0] === 'normal' ? 'centang' : st[0] === 'waspada' ? 'waspada' : 'bahaya')}${st[1]}</span></span></div>
    ${t.lihat ? `<div class="kartu-hp"><h6>${t.lihat}</h6><p>${t.sebab}</p></div>` : ''}
    <div class="kartu-hp"><h6>Level pertumbuhan: ${LEVEL[t.level - 1]}</h6>
      <div class="tangga">${LEVEL.map((_, i) => `<span class="${i < t.level ? 'on' : ''}"></span>`).join('')}</div>
      <div class="tangga-lbl"><span>Semai</span><span>Siap panen</span></div></div>
    <div class="kartu-hp"><h6>Foto dari kamera kebun</h6>
      <div class="bingkai-foto" id="hp-bingkai-foto">${fotoPakcoySVG(fotoAda)}<span class="waktu">${fotoAda ? 'Baru saja · ' + jamSekarang() : 'Hari ini 06.00'}</span>
        <div class="kerangka" ${memuat ? '' : 'hidden'}><span>${ikon('kamera', '', 'style="width:28px;height:28px;color:var(--hp-teks-2)"')}<br>Kamera kebun sedang memotret…<br>sekitar 3 detik</span></div></div>
      <button class="btn-isi" id="hp-ambil-foto" ${memuat ? 'disabled style="opacity:.6"' : ''}>${ikon('kamera', '', 'style="--ikon-latar:#2E7D32"')}${memuat ? 'Mengambil foto…' : 'Ambil foto dari kamera kebun'}</button></div>`;
}

/* ------------------------------------------------------------ Lembar bawah & dialog */
function lembarHTML(jenis) {
  if (jenis === 'langkah') {
    return `<div class="pegangan"></div><h5 id="hp-lembar-judul">Air menyusut, pH air naik</h5>
      <p class="sub">Cuaca panas membuat air di bak cepat berkurang. Pupuknya jadi lebih pekat, dan keasaman air (pH) ikut naik.</p>
      <b style="font-size:15px">Yang perlu dilakukan</b>
      <ol class="daftar-langkah">
        <li><span class="no">1</span><span>Tambah air bersih ke bak. Cara cepat: nyalakan pompa air bersih 30 detik.</span></li>
        <li><span class="no">2</span><span>Tunggu 15 menit supaya air tercampur, lalu lihat lagi angka pH.</span></li>
        <li><span class="no">3</span><span>Kalau pH masih di atas 6,8, ulangi sekali lagi dengan air bersih 10 detik.</span></li>
      </ol>
      <button class="apa-itu" id="hp-apa-itu" aria-expanded="false">${ikon('bantuan')}Apa itu pH?</button>
      <p class="penjelasan-istilah" id="hp-istilah" hidden>pH adalah angka keasaman air. Sayur hidroponik paling mudah menyerap pupuk kalau pH-nya antara 5,5 dan 6,8.</p>
      <button class="btn-isi" id="hp-ke-pompa">${ikon('tetes')}Buka pengaturan pompa</button>
      <button class="btn-garis" data-tutup-lembar>Tutup</button>`;
  }
  if (jenis === 'saran') {
    return `<div class="pegangan"></div><h5 id="hp-lembar-judul">Saran hari ini</h5>
      <div class="kartu-hp"><h6>Tambah air bersih sekitar 2 liter sore ini</h6><p>Level air turun lebih cepat dari biasanya karena suhu siang naik.</p></div>
      <p class="sub">Ini perkiraan aplikasi. Penyiraman otomatis tetap berjalan seperti biasa.</p>
      <button class="btn-garis" data-tutup-lembar>Tutup</button>`;
  }
  if (jenis === 'panen') {
    return `<div class="pegangan"></div><h5 id="hp-lembar-judul">${SIAP_PANEN.length} tanaman siap panen</h5>
      <p class="sub">Panen berikutnya: lubang 8 (Pakcoy), sekitar 4 hari lagi.</p>
      <div>${SIAP_PANEN.map((t) => `<div class="baris-daftar"><span class="lencana-lubang" style="background:#1B5E20">${t.n}</span><span><b>Lubang ${t.n} · ${t.jenis}</b><small>Level 5 Siap panen · ${t.umur} hari</small></span>${ikon('chevKanan')}</div>`).join('')}</div>
      <button class="btn-garis" data-tutup-lembar>Tutup</button>`;
  }
  if (jenis === 'sensor') {
    const baris = Object.keys(SENSOR).map((k) => {
      const s = SENSOR[k], st = statusSensor(k);
      return `<div class="baris-daftar" style="grid-template-columns:36px minmax(0,1fr) auto"><span class="ikp" style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--hp-latar-layar);color:${WARNA_STATUS[st]}">${ikon(s.ikon, '', 'style="width:20px;height:20px"')}</span><span><b>${s.nama}</b><small>Ideal ${angka(s.ideal[0], s.des)}–${angka(s.ideal[1], s.des)}${s.satuan}</small></span><b style="font-variant-numeric:tabular-nums">${angka(nilaiSensor(k), s.des)}${s.satuan}</b></div>`;
    }).join('') + SENSOR_LAIN.map((s) => `<div class="baris-daftar" style="grid-template-columns:36px minmax(0,1fr) auto"><span style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--hp-latar-layar);color:#2E7D32">${ikon('centangPolos', '', 'style="width:20px;height:20px"')}</span><span><b>${s.nama}</b><small>Ideal ${s.ideal}</small></span><b>${s.nilai}</b></div>`).join('');
    return `<div class="pegangan"></div><h5 id="hp-lembar-judul">Semua sensor</h5><p class="sub">Enam sensor, dibaca tiap 15 detik.</p><div>${baris}</div><button class="btn-garis" data-tutup-lembar>Tutup</button>`;
  }
  if (jenis === 'lubang') {
    const sel = TANAMAN.map((t) => {
      const w = t.kosong ? 'transparent' : ['#C8E6C9', '#A5D6A7', '#66BB6A', '#388E3C', '#1B5E20'][t.level - 1];
      const fg = t.kosong ? 'var(--hp-teks-2)' : t.level >= 3 ? '#fff' : '#1B3A1E';
      return `<button data-pilih-lubang="${t.n}" aria-label="${labelLubang(t)}" style="width:44px;height:44px;border-radius:50%;border:${t.kosong ? '2px dashed var(--hp-garis)' : '0'};background:${w};color:${fg};font-weight:700;cursor:pointer">${t.n}</button>`;
    }).join('');
    return `<div class="pegangan"></div><h5 id="hp-lembar-judul">Pilih lubang</h5><p class="sub">Lingkaran besar, lebih mudah diketuk daripada tanaman di taman.</p>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;justify-items:center">${sel}</div><button class="btn-garis" data-tutup-lembar>Tutup</button>`;
  }
  return '';
}
function dialogHTML(jenis) {
  if (jenis === 'manual') return `<h5 id="hp-dialog-judul">Pindah ke Manual?</h5><p>Sistem berhenti mengatur pompa sendiri sampai kamu kembali ke Otomatis.</p>
    <div class="aksi"><button data-dialog="batal">Batal</button><button class="ya" id="hp-ya-manual" data-dialog="ya">Ya, pindah ke Manual</button></div>`;
  if (jenis === 'nyalakan') {
    const m = POMPA.find((p) => p.id === S.pompa.terpilih) || POMPA[0];
    return `<h5 id="hp-dialog-judul">Nyalakan ${m.nama.toLowerCase()}?</h5><p>Pompa menyala ${S.pompa.durasi} detik lalu mati sendiri.</p>
      <div class="aksi"><button data-dialog="batal">Batal</button><button class="ya" id="hp-ya-nyalakan" data-dialog="ya">Ya, nyalakan</button></div>`;
  }
  return '';
}

/* ------------------------------------------------------------ Render: sinkronkan DOM dengan S */
const HP = { el: {}, tandaPompa: '', tandaDetail: '', tandaGrafik: '', lembarAktif: null, dialogAktif: null };
const $hp = (id) => HP.el[id] || (HP.el[id] = document.getElementById(id));

function hpBangun(wadah) {
  wadah.innerHTML = hpKerangka();
  HP.el = {};
  hpPasangPeristiwa(wadah);
  renderHP(true);
}

function hpTampilLayar() {
  for (const nama of ['beranda', 'grafik', 'pompa', 'detail']) {
    const el = $hp('l-' + nama);
    const aktif = S.layar === nama;
    el.setAttribute('aria-hidden', String(!aktif));
    el.inert = !aktif;
    if (nama === 'beranda') el.classList.toggle('kiri', !aktif);
    else el.classList.toggle('kanan', !aktif);
  }
}

function renderHP(paksa = false) {
  if (!$hp('l-beranda')) return;
  const wadahHP = $hp('hp-layar'); if (wadahHP.scrollLeft || wadahHP.scrollTop) { wadahHP.scrollLeft = 0; wadahHP.scrollTop = 0; }
  hpTampilLayar();
  const waspada = S.status === 'waspada';
  // Bar atas & balon
  $hp('hp-salam').textContent = `${sapaan()}!`;
  $hp('hp-jam').textContent = jamSekarang();
  $hp('hp-jam-2').textContent = jamSekarang();
  $hp('hp-balon').classList.toggle('waspada', waspada);
  $hp('hp-balon').hidden = S.balonTutup;
  $hp('hp-balon-teks').textContent = S.pesanBalon;
  $hp('hp-balon-ikon').innerHTML = ikon(waspada ? 'waspada' : 'centang');
  $hp('hp-balon-ikon').style.color = waspada ? '#B7791F' : '#2E7D32';
  $hp('hp-balon-petunjuk').hidden = waspada;
  $hp('hp-btn-langkah').hidden = !waspada;
  $hp('hp-lampu-lbl').textContent = waspada ? 'Langkah' : 'Saran';
  $hp('hp-lampu-seru').hidden = !waspada;
  $hp('hp-lampu').classList.toggle('berkedip', waspada);
  $hp('hp-lampu').setAttribute('aria-label', waspada ? 'Langkah yang perlu dilakukan' : 'Saran hari ini');
  $hp('hp-lencana-notif').textContent = String(S.notifBelum);
  $hp('hp-lonceng').setAttribute('aria-label', `Notifikasi, ${S.notifBelum} belum dibaca`);

  // Cairan di bak: tinggi mengikuti level air, cokelat mengikuti kepekatan pupuk.
  const lv = S.levelAir / 100, perm = permukaan(lv);
  for (const id of ['hp-cair-kiri', 'hp-cair-kanan']) {
    const r = $hp(id);
    r.setAttribute('y', (DALAM * perm).toFixed(2));
    r.setAttribute('height', (DALAM * (1 - perm)).toFixed(2));
    const w = +r.getAttribute('width'), yy = DALAM * perm, t = performance.now() / 600;
    let d = '';
    for (let i = 0; i <= 12; i++) d += `${i ? 'L' : 'M'}${(w * i / 12).toFixed(1)} ${(yy + Math.sin(i * 1.4 + t) * .9).toFixed(2)}`;
    $hp(id + '-ombak').setAttribute('d', d);
  }
  const p = Math.max(.1, Math.min(.9, S.tds / 1600)), batas = 1 - p;
  $hp('hp-cair-2').setAttribute('offset', Math.max(0, batas - .18).toFixed(3));
  $hp('hp-cair-3').setAttribute('offset', Math.min(1, batas + .18).toFixed(3));

  // Meteran
  for (const m of METER) {
    const s = SENSOR[m.k], st = statusSensor(m.k), w = WARNA_STATUS[st];
    const btn = $hp('hp-m-' + m.k);
    const isi = st === 'normal' ? 1 : st === 'waspada' ? .55 : st === 'bahaya' ? .25 : 0;
    btn.querySelector('.isi').setAttribute('stroke', w);
    btn.querySelector('.isi').setAttribute('stroke-dasharray', `${(2 * Math.PI * 21 * isi).toFixed(1)} 999`);
    btn.querySelector('svg.ik').style.color = w;
    btn.querySelector('.tanda').hidden = st === 'normal';
    btn.querySelector('.tanda').style.color = w;
    const teks = `${angka(nilaiSensor(m.k), s.des)}${s.label || ''}`;
    $hp('hp-ml-' + m.k).innerHTML = `${s.pendek} <b>${teks}</b>`;
    btn.setAttribute('aria-label', `${s.nama} ${teks}, ${LABEL_STATUS[st]}. Ketuk untuk grafik.`);
  }
  hpAturMeter();

  // Pilihan tanaman
  const kartu = $hp('hp-kartu-pilih'), cincin = $hp('hp-cincin-pilih');
  if (S.pilihan && S.layar === 'beranda') {
    const t = TANAMAN[S.pilihan - 1], [cx, cy] = lubangXY(S.pilihan);
    cincin.setAttribute('cx', cx); cincin.setAttribute('cy', cy); cincin.setAttribute('visibility', 'visible');
    kartu.hidden = false;
    $hp('hp-pilih-lencana').textContent = S.pilihan;
    $hp('hp-pilih-lencana').style.background = t.kosong ? '#9AA59D' : '#2E7D32';
    $hp('hp-pilih-judul').textContent = t.kosong ? `Lubang ${t.n} · kosong` : `Lubang ${t.n} · ${t.jenis}`;
    $hp('hp-pilih-sub').textContent = t.kosong ? 'Belum ditanami' : `Level ${t.level} ${LEVEL[t.level - 1]} · ${t.kondisi === 'cek' ? 'Perlu dicek' : t.kondisi === 'masalah' ? 'Bermasalah' : 'Sehat'}`;
    $hp('hp-buka-detail-lbl').textContent = `Buka detail lubang ${S.pilihan}`;
  } else {
    cincin.setAttribute('visibility', 'hidden');
    kartu.hidden = true;
  }
  // Sorot panen: lencana bunga berdenyut
  document.querySelectorAll('#kebun-hp .lencana-panen').forEach((g) => g.style.opacity = S.panenSorot ? (0.6 + 0.4 * Math.abs(Math.sin(performance.now() / 300))) : 1);

  // Halaman
  if (S.layar === 'grafik') {
    const tanda = `${S.grafikSensor}|${angka(nilaiSensor(S.grafikSensor), 1)}`;
    if (paksa || tanda !== HP.tandaGrafik) { $hp('hp-isi-grafik').innerHTML = grafikHTML(S.grafikSensor); HP.tandaGrafik = tanda; }
  }
  const tp = JSON.stringify([S.pompa.mode, S.pompa.terpilih, S.pompa.durasi, S.pompa.aktif, S.pompa.perintah, S.riwayat.length]);
  if (paksa || tp !== HP.tandaPompa) { $hp('hp-isi-pompa').innerHTML = pompaHTML(); HP.tandaPompa = tp; }
  if (S.pompa.aktif) {
    const h = $hp('hp-isi-pompa').querySelector('#hp-hitung'), b = $hp('hp-isi-pompa').querySelector('#hp-bilah');
    if (h) h.textContent = `0:${String(Math.ceil(S.pompa.sisa)).padStart(2, '0')}`;
    if (b) b.style.width = `${100 * (1 - S.pompa.sisa / S.pompa.durasi)}%`;
  }
  const td = `${S.detailLubang}|${S.foto.lubang}|${S.foto.status}`;
  if (paksa || td !== HP.tandaDetail) {
    $hp('hp-judul-detail').textContent = `Lubang ${S.detailLubang}`;
    $hp('hp-isi-detail').innerHTML = detailHTML(S.detailLubang);
    HP.tandaDetail = td;
  }

  // Notifikasi atas
  const nf = $hp('hp-notif');
  nf.classList.toggle('tampil', S.notif);
  nf.setAttribute('aria-hidden', String(!S.notif));
  nf.tabIndex = S.notif ? 0 : -1;

  // Lembar bawah
  const lb = $hp('hp-lembar');
  if (S.lembar !== HP.lembarAktif) {
    if (S.lembar) { lb.innerHTML = lembarHTML(S.lembar); lb.setAttribute('aria-labelledby', 'hp-lembar-judul'); }
    HP.lembarAktif = S.lembar;
  }
  lb.classList.toggle('tampil', !!S.lembar);
  lb.setAttribute('aria-hidden', String(!S.lembar));
  lb.inert = !S.lembar;
  // Dialog
  const dl = $hp('hp-dialog');
  if (S.dialog !== HP.dialogAktif) {
    if (S.dialog) { dl.innerHTML = dialogHTML(S.dialog); dl.setAttribute('aria-labelledby', 'hp-dialog-judul'); }
    HP.dialogAktif = S.dialog;
  }
  dl.classList.toggle('tampil', !!S.dialog);
  dl.setAttribute('aria-hidden', String(!S.dialog));
  dl.inert = !S.dialog;
  $hp('hp-skrim').classList.toggle('tampil', !!(S.lembar || S.dialog));
  const latar = !!(S.lembar || S.dialog);
  for (const nama of ['beranda', 'grafik', 'pompa', 'detail']) if (latar) $hp('l-' + nama).inert = true;
  if (latar) $hp('hp-notif').inert = true; else $hp('hp-notif').inert = false;

  hpTandaiPetunjuk();
}

/** Atur posisi meteran: pH dan Suhu di bawah balon, Air dan Pupuk di bawah bak. Lalu gambar garisnya. */
function hpAturMeter() {
  const baris = $hp('hp-baris-balon');
  const bawahBalon = baris.offsetTop + baris.offsetHeight + (S.balonTutup ? 0 : 9);
  const [, phY] = keLayar(100, 140), [, suhuY] = keLayar(300, 172);
  const ideal = Math.min(phY, suhuY) - 26 - 32;
  const yAtas = Math.max(ideal, bawahBalon + 8 + 26 + 26);
  const posisi = { ph: yAtas, suhu: yAtas, air: Y_BAWAH, pupuk: Y_BAWAH };
  const lv = S.levelAir / 100, perm = permukaan(lv);
  const dAir = perm + (1 - perm) * .2;
  const jangkar = {
    ph: keLayar(100, 140), suhu: keLayar(300, 172),
    air: keLayar(SUDUT.kiri[0] + (SUDUT.depan[0] - SUDUT.kiri[0]) * .3, SUDUT.kiri[1] + (SUDUT.depan[1] - SUDUT.kiri[1]) * .3 + TUTUP + DALAM * dAir),
    pupuk: keLayar(SUDUT.depan[0] + (SUDUT.kanan[0] - SUDUT.depan[0]) * .3, SUDUT.depan[1] + (SUDUT.kanan[1] - SUDUT.depan[1]) * .3 + TUTUP + DALAM * .84),
  };
  let garis = '';
  for (const m of METER) {
    const y = posisi[m.k], btn = $hp('hp-m-' + m.k);
    btn.style.top = `${m.atas ? y - 52 : y - 26}px`;
    const [jx, jy] = jangkar[m.k], dx = jx - m.x, dy = jy - y, d = Math.hypot(dx, dy);
    if (d > 34) {
      const sx = m.x + dx / d * 27, sy = y + dy / d * 27;
      const w = WARNA_STATUS[statusSensor(m.k)];
      garis += `<line x1="${sx}" y1="${sy}" x2="${jx}" y2="${jy}" stroke="rgba(255,255,255,.85)" stroke-width="4.5" stroke-linecap="round"/>
        <line x1="${sx}" y1="${sy}" x2="${jx}" y2="${jy}" stroke="rgba(27,30,28,.55)" stroke-width="2" stroke-linecap="round"/>
        <circle cx="${jx}" cy="${jy}" r="6.5" fill="rgba(255,255,255,.9)"/><circle cx="${jx}" cy="${jy}" r="4.5" fill="${w}"/>`;
    }
  }
  $hp('hp-garis-meter').innerHTML = garis;
}

/** Cincin "ketuk di sini" pada elemen yang ditunggu adegan. */
function hpTandaiPetunjuk() {
  document.querySelectorAll('#hp-layar .ketuk-sini').forEach((e) => e.classList.remove('ketuk-sini'));
  const cincin = $hp('hp-cincin-petunjuk');
  cincin.setAttribute('visibility', 'hidden');
  document.querySelectorAll('#kebun-hp .lubang-ketuk').forEach((g) => g.setAttribute('tabindex', S.panduan ? '-1' : '0'));
  const t = petunjukAktif();
  if (!t) return;
  if (t.startsWith('lubang:')) {
    if (S.layar !== 'beranda' || S.lembar || S.dialog) return;
    const [cx, cy] = lubangXY(+t.split(':')[1]);
    cincin.setAttribute('cx', cx); cincin.setAttribute('cy', cy - 4); cincin.setAttribute('visibility', 'visible');
    const g = document.querySelector(`#kebun-hp .lubang-ketuk[data-n="${t.split(':')[1]}"]`);
    if (g) g.setAttribute('tabindex', '0');
    return;
  }
  const el = document.querySelector('#hp-layar ' + t);
  if (el) el.classList.add('ketuk-sini');
}

function hpToast(teks) {
  const t = $hp('hp-toast');
  t.innerHTML = `${ikon('centang')}<span>${teks}</span>`;
  t.classList.add('tampil');
  clearTimeout(HP.toastTimer);
  HP.toastTimer = setTimeout(() => t.classList.remove('tampil'), 2600);
}

/* ------------------------------------------------------------ Peristiwa (ketukan) */
function hpPasangPeristiwa(wadah) {
  wadah.addEventListener('click', (e) => {
    const t = e.target.closest('button, .lubang-ketuk, [data-tutup-lembar]');
    if (!t || !wadah.contains(t)) return;
    const id = t.id;
    if (t.matches('[data-kembali]')) return kirim('kembali');
    if (t.matches('[data-tutup-lembar]')) return kirim('tutup-lembar');
    if (t.dataset.sensor) return kirim('ketuk-meter', t.dataset.sensor);
    if (t.classList.contains('lubang-ketuk')) return kirim('pilih-lubang', +t.dataset.n);
    if (t.dataset.pilihLubang) return kirim('pilih-lubang-grid', +t.dataset.pilihLubang);
    if (t.dataset.pompa) return kirim('pilih-pompa', t.dataset.pompa);
    if (t.dataset.durasi) return kirim('pilih-durasi', +t.dataset.durasi);
    if (t.dataset.dialog) return kirim(t.dataset.dialog === 'ya' ? 'dialog-ya' : 'dialog-batal');
    const peta = {
      'hp-btn-langkah': 'buka-langkah', 'hp-notif': 'buka-langkah', 'hp-lampu': 'ketuk-lampu', 'hp-tutup-balon': 'tutup-balon',
      'hp-tg-grafik': 'buka-grafik', 'hp-tg-pompa': 'buka-pompa', 'hp-tg-panen': 'buka-panen', 'hp-tg-lubang': 'buka-lubang',
      'hp-semua-sensor': 'buka-sensor', 'hp-ke-pompa': 'buka-pompa', 'hp-seg-manual': 'mode-manual', 'hp-seg-otomatis': 'mode-otomatis',
      'hp-nyalakan': 'nyalakan', 'hp-buka-detail': 'buka-detail', 'hp-pilih-tutup': 'batal-pilih', 'hp-ambil-foto': 'ambil-foto',
      'hp-lonceng': 'lonceng', 'hp-profil': 'profil', 'hp-pil-kebun': 'pil-kebun', 'hp-apa-itu': 'apa-itu',
    };
    if (peta[id]) kirim(peta[id]);
  });
  wadah.addEventListener('keydown', (e) => {
    const t = e.target.closest('.lubang-ketuk');
    if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); kirim('pilih-lubang', +t.dataset.n); }
  });
  $hp('hp-skrim').addEventListener('click', () => kirim(S.dialog ? 'dialog-batal' : 'tutup-lembar'));
}
