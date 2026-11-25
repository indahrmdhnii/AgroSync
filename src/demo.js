/* ============================================================ State bersama + pengatur demo
   Satu objek S dibaca oleh layar HP, kebun 3D, dan kebun datar, jadi ketiganya selalu sinkron. */
const GERAK_KURANG = matchMedia('(prefers-reduced-motion: reduce)').matches;
const S = {
  adegan: 1, langkah: 0, selesai: new Set(),
  status: 'normal', offline: false,
  ph: 6.1, suhu: 24.6, tds: 840, levelAir: 78,
  pesanBalon: 'Kebunmu sehat hari ini. Tidak perlu tindakan.',
  balonTutup: false, notif: false, notifBelum: 3,
  layar: 'beranda', lembar: null, dialog: null, pilihan: null, detailLubang: 5, grafikSensor: 'ph',
  pompa: { mode: 'otomatis', terpilih: null, durasi: 10, aktif: null, sisa: 0, perintah: null },
  riwayat: [
    { nama: 'Pompa air bersih', durasi: 20, waktu: 'Hari ini 06.00', pemicu: 'Otomatis' },
    { nama: 'Pompa nutrisi A', durasi: 10, waktu: 'Kemarin 17.30', pemicu: 'Otomatis' },
    { nama: 'Pompa nutrisi B', durasi: 10, waktu: 'Kemarin 17.31', pemicu: 'Otomatis' },
  ],
  foto: { lubang: null, status: null },
  kamera: null, panenSorot: false, siA: 'sembunyi', semanggi: 'lambai', fokus: 'umum',
  panduan: (() => { try { return localStorage.getItem('agrosync-panduan') !== 'mati'; } catch (_) { return true; } })(),
  pov: 'keduanya', pip: false, mode3d: 'webgl',
};

/* ------------------------------------------------------------ Penjadwal render, animasi angka, timer */
let jadwal = 0;
function segarkan() {
  if (jadwal) return;
  jadwal = requestAnimationFrame(() => {
    jadwal = 0;
    renderHP();
    if (S.mode3d === 'datar') renderDatar();
    if (S.mode3d === 'webgl') Kebun3D.setFokus(S.fokus);
    renderPenjelasan();
  });
}
const animasiAktif = new Map();
function animasi(kunci, ke, ms) {
  const dari = S[kunci];
  if (GERAK_KURANG || ms <= 0) { S[kunci] = ke; segarkan(); return; }
  const mulai = performance.now();
  const id = {};
  animasiAktif.set(kunci, id);
  const langkah = (t) => {
    if (animasiAktif.get(kunci) !== id) return;
    const p = Math.min(1, (t - mulai) / ms), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    S[kunci] = dari + (ke - dari) * e;
    renderHP(); if (S.mode3d === 'datar') renderDatar();
    if (p < 1) requestAnimationFrame(langkah); else { animasiAktif.delete(kunci); segarkan(); }
  };
  requestAnimationFrame(langkah);
}
const timer = new Set();
function nanti(ms, fn) { const id = setTimeout(() => { timer.delete(id); fn(); }, ms); timer.add(id); return id; }
function batalSemua() { timer.forEach(clearTimeout); timer.clear(); animasiAktif.clear(); clearInterval(S._tik); }

/* ------------------------------------------------------------ Keadaan dasar */
function dasarNormal(setelahPompa = false) {
  Object.assign(S, {
    status: 'normal', offline: false, ph: setelahPompa ? 6.4 : 6.1, suhu: 24.6, tds: 840, levelAir: setelahPompa ? 82 : 78,
    pesanBalon: 'Kebunmu sehat hari ini. Tidak perlu tindakan.', balonTutup: false, notif: false, notifBelum: 3,
    layar: 'beranda', lembar: null, dialog: null, pilihan: null, detailLubang: 5, grafikSensor: 'ph',
    foto: { lubang: null, status: null }, kamera: null, panenSorot: false, siA: 'sembunyi', semanggi: 'lambai', fokus: 'umum',
  });
  S.pompa = { mode: 'otomatis', terpilih: null, durasi: 10, aktif: null, sisa: 0, perintah: null };
}
function dasarMasalah() {
  dasarNormal();
  Object.assign(S, { status: 'waspada', ph: 7.2, levelAir: 34, notifBelum: 4, siA: 'waspada', pesanBalon: 'Air di bak menyusut dan pH air naik (kurang asam).' });
}

/* ------------------------------------------------------------ Adegan */
const ADEGAN = [
  {
    nama: 'Kebun lagi sehat', mulai() { dasarNormal(); },
    langkah: [
      { tunggu: 'ketuk-ph', target: '#hp-m-ph', ajak: 'Ketuk meteran pH di handphone, yuk.',
        hp: 'Balon bicara bilang kebunmu sehat. Keempat meteran hijau penuh, artinya aman semua.',
        kebun: 'Air di bak bergoyang pelan, lampu kecil berkedip hijau, Tata melambai.' },
    ],
    akhir: { hp: 'Grafik pH 24 jam kebuka. Garisnya anteng di area hijau.',
      kebun: 'Kamera mendekat ke pengukur pH di bak. Angkanya sama persis dengan di handphone.' },
  },
  {
    nama: 'Waduh, ada masalah', mulai() { dasarNormal(); },
    langkah: [
      { tunggu: 'simulasi', target: '#btn-simulasi', ajak: 'Tekan “Coba bikin masalah” dan lihat apa yang terjadi.',
        hp: 'Semua masih aman, tenang aja.',
        kebun: 'Bak masih terisi 78%.' },
      { tunggu: 'buka-langkah', target: '#hp-btn-langkah', ajak: 'Ketuk “Lihat langkah” di balon bicara, atau ketuk notifnya.',
        hp: 'Notif masuk, balon jadi Waspada, dan lampunya berubah jadi “Langkah” dengan tanda seru.',
        kebun: 'Air di bak menyusut, pengukurnya menyala kuning, dan Ago datang bawa tanda seru.' },
    ],
    akhir: { hp: 'Langkahnya jelas: tambah air, tunggu 15 menit, lalu cek pH lagi.',
      kebun: 'Ago nunjuk bak. Airnya tinggal 34%.' },
  },
  {
    nama: 'Siram dari jauh', mulai() { dasarMasalah(); },
    langkah: [
      { tunggu: 'buka-pompa', target: '#hp-tg-pompa', ajak: 'Ketuk tombol Pompa.', hp: 'Kebun masih Waspada, airnya tinggal 34%.', kebun: 'Galon Air Bersih dan dua dirigen nutrisi siap di depan meja.' },
      { tunggu: 'mode-manual', target: '#hp-seg-manual', ajak: 'Pilih Manual.', hp: 'Halaman Pompa kebuka, masih mode Otomatis.', kebun: 'Kamera pindah ke pompa dan galon air.' },
      { tunggu: 'konfirmasi-manual', target: '#hp-ya-manual', ajak: 'Ketuk “Ya, pindah ke Manual”.', hp: 'Aplikasinya nanya dulu biar nggak salah pencet.', kebun: 'Kebun masih nunggu perintahmu.' },
      { tunggu: 'pilih-pompa-air', target: '#hp-pompa-air > button', ajak: 'Pilih “Pompa air bersih”.', hp: 'Sekarang kamu yang pegang kendali.', kebun: 'Pompa kecil di atas galon Air Bersih siap jalan.' },
      { tunggu: 'pilih-durasi', target: '#hp-durasi-30', ajak: 'Pilih 30 detik.', hp: 'Mau nyala berapa lama?', kebun: 'Pompa air bersih siap.' },
      { tunggu: 'nyalakan', target: '#hp-nyalakan', ajak: 'Ketuk “Nyalakan 30 detik”.', hp: '30 detik dipilih.', kebun: 'Pompa air bersih siap.' },
      { tunggu: 'konfirmasi-nyalakan', target: '#hp-ya-nyalakan', ajak: 'Ketuk “Ya, nyalakan”.', hp: 'Satu konfirmasi lagi, terus jalan.', kebun: 'Pompa air bersih siap.' },
      { tunggu: 'pompa-selesai', target: null, ajak: 'Lihat airnya ngalir…',
        hp: 'Perintah sampai, hitung mundur jalan (dipercepat buat demo).',
        kebun: 'Pompa di atas galon bergetar, air bersih ngalir lewat pipa, dan permukaan air naik. Hitung mundurnya ikut melayang.' },
    ],
    akhir: { hp: 'Hitungan selesai. Balon balik Normal: air penuh lagi, pH turun ke 6,4.',
      kebun: 'Bak penuh lagi, pengukur balik hijau, Ago senyum, dan daun-daun kecil beterbangan.' },
  },
  {
    nama: 'Intip lewat kamera', mulai() { dasarNormal(true); },
    langkah: [
      { tunggu: 'pilih-lubang', target: 'lubang:5', ajak: 'Ketuk tanaman di lubang 5, yang ada tanda segitiganya.', hp: 'Tiap tanaman bisa diketuk. Tanda segitiga artinya perlu dicek.', kebun: 'Kamera kebun terpasang diam di atas papan, bisa lihat semua lubang sekaligus.' },
      { tunggu: 'buka-detail', target: '#hp-buka-detail', ajak: 'Ketuk “Buka detail lubang 5”.', hp: 'Ketukan pertama cuma memilih: muncul cincin dan kartu besar di bawah.', kebun: 'Kameranya nggak perlu geser ke mana-mana.' },
      { tunggu: 'ambil-foto', target: '#hp-ambil-foto', ajak: 'Ketuk “Ambil foto dari kamera kebun”.', hp: 'Lubang 5: daun bawahnya menguning, levelnya Dewasa.', kebun: 'Kamera kebun siap memotret seluruh papan.' },
      { tunggu: 'foto-selesai', target: null, ajak: 'Tunggu sebentar, lagi difoto…', hp: 'Kotak foto nunggu kiriman dari kebun.', kebun: 'Cekrek! Kamera memotret seluruh papan dari atas, lalu bagian lubang 5 dipotong jadi foto sendiri.' },
    ],
    akhir: { hp: 'Foto baru masuk (berlabel CONTOH). Foto lama tetap aman di galeri.', kebun: 'Potongan foto lubang 5 terbang dari kebun ke handphone-mu.' },
  },
  {
    nama: 'Waktunya panen', mulai() { dasarNormal(true); },
    langkah: [
      { tunggu: 'buka-panen', target: '#hp-tg-panen', ajak: 'Ketuk tombol Panen yang ada angka 5.', hp: 'Angka 5 di tombol Panen artinya ada 5 tanaman siap dipetik.', kebun: 'Ukuran selada beda-beda, sesuai umurnya.' },
    ],
    akhir: { hp: 'Ini daftarnya: lubang 1, 2, 3, 4, dan 7.', kebun: 'Selada yang siap panen berpendar, Tata lompat-lompat bawa selada.' },
  },
];

function adeganSekarang() { return ADEGAN[S.adegan - 1]; }
function langkahSekarang() { const a = adeganSekarang(); return a.langkah[S.langkah] || null; }
function petunjukAktif() {
  if (!S.panduan) return null;
  const l = langkahSekarang();
  if (!l || !l.target) return null;
  return l.target.startsWith('#hp-') || l.target.startsWith('lubang:') ? l.target : null;
}

function mulaiAdegan(n, umumkan = true) {
  batalSemua();
  S.adegan = n; S.langkah = 0;
  ADEGAN[n - 1].mulai();
  segarkan();
  if (umumkan) narasi(`Langkah ${n}, ${ADEGAN[n - 1].nama}. ${ADEGAN[n - 1].langkah[0].kebun}`);
}
function maju(peristiwa) {
  const l = langkahSekarang();
  if (!l || l.tunggu !== peristiwa) return;
  S.langkah++;
  const a = adeganSekarang();
  if (S.langkah >= a.langkah.length) {
    S.selesai.add(S.adegan); narasi(a.akhir.kebun);
    if (S.adegan === 3) buka('siram');
    if (S.selesai.size === 5) buka('tutorial');
  }
  else narasi(a.langkah[S.langkah].kebun);
}
function narasi(teks) { const el = document.getElementById('narasi'); if (el) el.textContent = teks; }

/* ------------------------------------------------------------ Peristiwa dari HP dan tombol halaman */
function kirim(ev, d) {
  switch (ev) {
    case 'ketuk-meter':
      S.grafikSensor = d; S.layar = 'grafik'; S.fokus = 'sensor-' + d; S.pilihan = null;
      if (d === 'ph') maju('ketuk-ph');
      break;
    case 'buka-grafik': S.grafikSensor = 'ph'; S.layar = 'grafik'; S.fokus = 'sensor-ph'; S.pilihan = null; maju('ketuk-ph'); break;
    case 'kembali':
      S.layar = 'beranda'; S.fokus = S.pompa.aktif ? 'pompa' : (S.status === 'waspada' ? 'bak' : 'umum');
      if (S.foto.status === 'selesai') S.kamera = null;
      break;
    case 'tutup-balon': S.balonTutup = true; break;
    case 'ketuk-lampu':
      if (S.status === 'waspada') return kirim('buka-langkah');
      S.lembar = 'saran'; break;
    case 'buka-langkah':
      S.notif = false; S.notifBelum = Math.max(3, S.notifBelum - 1); S.lembar = 'langkah'; S.balonTutup = false;
      if (S.siA !== 'sembunyi') S.siA = 'tunjuk';
      S.fokus = 'bak'; maju('buka-langkah'); break;
    case 'tutup-lembar':
      S.lembar = null; if (S.siA === 'tunjuk') S.siA = 'waspada';
      if (S.panenSorot) { S.panenSorot = false; S.semanggi = 'lambai'; S.fokus = 'umum'; }
      break;
    case 'apa-itu': {
      const p = document.getElementById('hp-istilah'), b = document.getElementById('hp-apa-itu');
      if (p) { p.hidden = !p.hidden; b.setAttribute('aria-expanded', String(!p.hidden)); }
      return;
    }
    case 'buka-pompa': S.lembar = null; S.layar = 'pompa'; S.fokus = 'pompa'; S.pilihan = null; if (S.siA === 'tunjuk') S.siA = 'waspada'; maju('buka-pompa'); break;
    case 'mode-manual': if (S.pompa.mode === 'manual' || S.pompa.aktif) return; S.dialog = 'manual'; maju('mode-manual'); break;
    case 'mode-otomatis': if (S.pompa.aktif) return; S.pompa.mode = 'otomatis'; S.pompa.terpilih = null; break;
    case 'dialog-ya':
      if (S.dialog === 'manual') { S.pompa.mode = 'manual'; S.dialog = null; maju('konfirmasi-manual'); }
      else if (S.dialog === 'nyalakan') { S.dialog = null; maju('konfirmasi-nyalakan'); mulaiPompa(); }
      break;
    case 'dialog-batal': S.dialog = null; break;
    case 'pilih-pompa': if (S.pompa.aktif || S.pompa.mode !== 'manual') return; S.pompa.terpilih = S.pompa.terpilih === d ? null : d; if (d === 'air' && S.pompa.terpilih) maju('pilih-pompa-air'); break;
    case 'pilih-durasi': S.pompa.durasi = d; if (d === 30) maju('pilih-durasi'); break;
    case 'nyalakan': S.dialog = 'nyalakan'; maju('nyalakan'); break;
    case 'pilih-lubang': S.pilihan = S.pilihan === d ? null : d; if (S.pilihan) maju('pilih-lubang'); break;
    case 'pilih-lubang-grid': S.lembar = null; S.pilihan = d; maju('pilih-lubang'); break;
    case 'batal-pilih': S.pilihan = null; break;
    case 'buka-detail': if (!S.pilihan) return; S.detailLubang = S.pilihan; S.layar = 'detail'; S.pilihan = null; maju('buka-detail'); break;
    case 'ambil-foto': if (S.foto.status === 'memuat') return; maju('ambil-foto'); mulaiFoto(S.detailLubang); break;
    case 'buka-panen':
      S.lembar = 'panen'; S.panenSorot = true; S.semanggi = 'lompat'; S.fokus = 'panen'; S.pilihan = null;
      nanti(1300, () => { if (S.panenSorot) { S.semanggi = 'angkat'; segarkan(); } });
      maju('buka-panen');
      { const r = document.getElementById('hp-tg-panen').getBoundingClientRect(); if (r.width) percikDaun(r.left + r.width / 2, r.top + 10, 20); }
      break;
    case 'buka-sensor': S.lembar = 'sensor'; break;
    case 'buka-lubang': S.lembar = 'lubang'; break;
    case 'lonceng': hpToast(`${S.notifBelum} notifikasi belum dibaca (contoh).`); return;
    case 'profil': hpToast('Profil, tema, dan batas aman sensor ada di aplikasi lengkap.'); return;
    case 'pil-kebun': hpToast('Data contoh ini hanya punya satu kebun.'); return;
    case 'simulasi': if (S.status === 'waspada') return; maju('simulasi'); mulaiMasalah(); break;
    default: break;
  }
  segarkan();
}

/* ------------------------------------------------------------ Kejadian yang berjalan sendiri */
function mulaiMasalah() {
  S.fokus = 'bak';
  animasi('levelAir', 34, 3200);
  animasi('ph', 7.2, 3200);
  narasi('Air di bak mulai menyusut, pH ikut naik.');
  nanti(GERAK_KURANG ? 0 : 1400, () => {
    Object.assign(S, { status: 'waspada', notif: true, notifBelum: 4, balonTutup: false, siA: 'waspada', pesanBalon: 'Air di bak menyusut dan pH air naik (kurang asam).' });
    segarkan();
    narasi('Peringatan Waspada. Ago datang membawa tanda seru, dan notif masuk ke handphone.');
    nanti(6000, () => { if (S.notif) { S.notif = false; segarkan(); } });
  });
}
function mulaiPompa() {
  const p = S.pompa, m = POMPA.find((x) => x.id === p.terpilih) || POMPA[0];
  Object.assign(p, { aktif: m.id, sisa: p.durasi, perintah: 'kirim' });
  S.fokus = 'pompa';
  narasi(`${m.nama} menyala ${p.durasi} detik.`);
  const tik = GERAK_KURANG ? 120 : 250; // satu "detik" demo
  nanti(600, () => { p.perintah = 'diterima'; segarkan(); });
  if (m.id === 'air') animasi('levelAir', 82, p.durasi * tik);
  if (m.id === 'nutA' || m.id === 'nutB') animasi('tds', S.tds + 60, p.durasi * tik);
  clearInterval(S._tik);
  S._tik = setInterval(() => {
    p.sisa = Math.max(0, p.sisa - 1);
    if (p.sisa <= 0) { clearInterval(S._tik); selesaiPompa(m); }
    segarkan();
  }, tik);
}
function selesaiPompa(m) {
  const p = S.pompa;
  S.riwayat.unshift({ nama: m.nama, durasi: p.durasi, waktu: 'Baru saja', pemicu: 'Manual' });
  p.aktif = null; p.terpilih = null; p.perintah = null;
  if (S.levelAir >= 40) {
    animasi('ph', 6.4, 1200);
    Object.assign(S, { status: 'normal', pesanBalon: 'Air sudah penuh lagi. Kebunmu kembali sehat.', notif: false });
    if (S.siA !== 'sembunyi') { S.siA = 'senang'; if (S.mode3d === 'webgl') Kebun3D.efek('konfeti'); }
  }
  S.fokus = 'bak';
  hpToast(`${m.nama} selesai. Air di bak ${Math.round(S.levelAir)}%.`);
  maju('pompa-selesai');
  segarkan();
}
function mulaiFoto(n) {
  S.foto = { lubang: n, status: 'memuat' };
  S.kamera = n; S.fokus = 'kamera';
  narasi(`Kamera kebun memotret seluruh papan dari atas. Bagian lubang ${n} nanti dipotong.`);
  nanti(GERAK_KURANG ? 300 : 1700, () => {
    if (S.mode3d === 'webgl') Kebun3D.efek('kilat');
    kilatDOM();
    narasi(`Cekrek! Foto seluruh papan diambil, lalu bagian lubang ${n} dipotong.`);
  });
  nanti(GERAK_KURANG ? 400 : 2000, terbangkanFoto);
  nanti(GERAK_KURANG ? 600 : 2900, () => {
    S.foto = { lubang: n, status: 'selesai' };
    hpToast('Foto baru tersimpan di galeri lubang ' + n + '.');
    maju('foto-selesai');
    segarkan();
  });
}
function kilatDOM() {
  const k = document.getElementById('kilat');
  if (!k || GERAK_KURANG) return;
  k.animate([{ opacity: .75 }, { opacity: 0 }], { duration: 380, easing: 'ease-out' });
}
function terbangkanFoto() {
  if (GERAK_KURANG) return;
  const panel = document.getElementById('panel-kebun'), pr = panel.getBoundingClientRect();
  if (!pr.width) return;
  let asal;
  if (S.mode3d === 'webgl') { const p = Kebun3D.proyeksi('kamera'); if (!p) return; asal = { x: pr.left + p.x, y: pr.top + p.y }; }
  else { const k = document.getElementById('datar-crop'); if (!k) return; const r = k.getBoundingClientRect(); asal = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  const bingkai = document.getElementById('hp-bingkai-foto');
  const br = bingkai && bingkai.getBoundingClientRect();
  if (!br || !br.width) return;
  const el = document.createElement('div');
  el.className = 'foto-terbang';
  el.innerHTML = fotoPakcoySVG(true);
  document.body.appendChild(el);
  const w = 96, skalaAkhir = br.width / w;
  el.animate([
    { transform: `translate(${asal.x - w / 2}px, ${asal.y - 40}px) scale(.35) rotate(-8deg)`, opacity: 0 },
    { transform: `translate(${asal.x - w / 2}px, ${asal.y - 70}px) scale(.8) rotate(-4deg)`, opacity: 1, offset: .25 },
    { transform: `translate(${br.left}px, ${br.top}px) scale(${skalaAkhir}) rotate(0deg)`, opacity: .9 },
  ], { duration: 900, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' }).onfinish = () => el.remove();
  el.style.transformOrigin = '0 0';
}

/* ------------------------------------------------------------ Panel penjelasan & stepper */
function renderPenjelasan() {
  const a = adeganSekarang(), l = langkahSekarang(), selesai = !l;
  document.getElementById('pj-judul').textContent = `Langkah ${S.adegan} dari 5 · ${a.nama}`;
  const ajak = document.getElementById('pj-ajak');
  let teksAjak = selesai ? (S.adegan < 5 ? 'Sip, langkah ini beres. Lanjut kapan pun kamu siap.' : 'Demo selesai! Kebunmu sehat, airnya penuh, dan ada 5 tanaman siap dipetik.') : l.ajak;
  const hpTersembunyi = innerWidth < 900 && S.pov === 'kebun' && !S.pip;
  if (!selesai && hpTersembunyi && petunjukAktif()) teksAjak += ' (Handphone lagi disembunyikan. Pilih Both atau nyalakan Handphone mini.)';
  ajak.querySelector('.isi').textContent = teksAjak;
  document.getElementById('pj-hp').textContent = selesai ? a.akhir.hp : l.hp;
  document.getElementById('pj-kebun').textContent = selesai ? a.akhir.kebun : l.kebun;
  const aksi = document.getElementById('pj-aksi');
  const tanda = `${S.adegan}|${S.langkah}|${selesai}|${hpTersembunyi}`;
  if (aksi.dataset.tanda !== tanda) {
    aksi.dataset.tanda = tanda;
    let h = '';
    if (!selesai && l.tunggu === 'simulasi') h += `<button class="tombol tombol-utama tombol-kecil" id="btn-simulasi" type="button">${ikon('waspada')}Coba bikin masalah</button>`;
    if (hpTersembunyi && !selesai && petunjukAktif()) h += `<button class="tombol tombol-kedua tombol-kecil" type="button" data-aksi="tampil-hp">${ikon('hp')}Tampilkan handphone</button>`;
    if (selesai && S.adegan < 5) h += `<button class="tombol tombol-utama tombol-kecil" type="button" data-aksi="lanjut">Lanjut: ${ADEGAN[S.adegan].nama}${ikon('chevKanan')}</button>`;
    if (selesai && S.adegan === 5) h += `<a class="tombol tombol-utama tombol-kecil" href="#mulai">Mulai berkebun</a><button class="tombol tombol-kedua tombol-kecil" type="button" data-aksi="ulang-demo">${ikon('ulang')}Main lagi</button>`;
    aksi.innerHTML = h;
  }
  const sim = document.getElementById('btn-simulasi');
  if (sim) sim.classList.toggle('ketuk-sini', S.panduan && !selesai && l.tunggu === 'simulasi');
  const tp = document.getElementById('pj-panduan');
  tp.innerHTML = S.panduan ? `${ikon('chevKanan')}Lewati tutorial` : `${ikon('tangan')}Pakai panduan`;
  document.querySelectorAll('#stepper button').forEach((b) => {
    const n = +b.dataset.adegan;
    if (n === S.adegan) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    b.classList.toggle('selesai', S.selesai.has(n));
  });
}

/* ------------------------------------------------------------ Penunjuk tutorial: tangan yang langsung menunjuk tombolnya */
const PENDEK = {
  'ketuk-ph': 'Ketuk meteran pH', simulasi: 'Coba bikin masalah', 'buka-langkah': 'Lihat langkahnya', 'buka-pompa': 'Buka Pompa',
  'mode-manual': 'Pilih Manual', 'konfirmasi-manual': 'Ya, pindah', 'pilih-pompa-air': 'Pompa air bersih', 'pilih-durasi': 'Pilih 30 detik',
  nyalakan: 'Nyalakan', 'konfirmasi-nyalakan': 'Ya, nyalakan', 'pompa-selesai': 'Lihat airnya ngalir…', 'pilih-lubang': 'Ketuk lubang 5',
  'buka-detail': 'Buka detail', 'ambil-foto': 'Ambil foto', 'foto-selesai': 'Lagi difoto…', 'buka-panen': 'Buka Panen',
};
function targetPenunjuk() {
  if (!S.panduan || document.documentElement.classList.contains('kunci-gulir')) return null;
  const l = langkahSekarang();
  if (!l) {
    if (S.adegan === 5) return { el: document.getElementById('panel-kebun'), teks: 'Demo selesai!', tangan: false };
    const b = document.querySelector('#pj-aksi [data-aksi="lanjut"]');
    return b ? { el: b, teks: 'Lanjut', tangan: true } : null;
  }
  const hpTersembunyi = innerWidth < 900 && S.pov === 'kebun' && !S.pip;
  if (hpTersembunyi && petunjukAktif()) { const b = document.querySelector('#pj-aksi [data-aksi="tampil-hp"]'); if (b) return { el: b, teks: 'Tampilkan handphone', tangan: true }; }
  const teks = PENDEK[l.tunggu] || l.ajak;
  if (!l.target) return { el: document.getElementById(S.pov === 'hp' && innerWidth < 900 ? 'panel-hp' : 'panel-kebun'), teks, tangan: false };
  let el;
  if (l.target.startsWith('lubang:')) el = (S.layar === 'beranda' && !S.lembar && !S.dialog) ? document.querySelector(`#kebun-hp .lubang-ketuk[data-n="${l.target.split(':')[1]}"]`) : null;
  else el = document.querySelector(l.target);
  return el ? { el, teks, tangan: true } : null;
}
function pasangPenunjuk() {
  const wadah = document.getElementById('penunjuk'), tangan = document.getElementById('penunjuk-tangan');
  const riak = document.getElementById('penunjuk-riak'), gel = document.getElementById('penunjuk-teks');
  const layar = document.getElementById('hp-layar');
  tangan.innerHTML = '<svg viewBox="0 0 46 56" aria-hidden="true" focusable="false"><path d="M14 4.5c2.6 0 4.6 2 4.6 4.6v15.3l.1-3.4c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5v3.3-1.6c0-2.4 2-4.4 4.4-4.4s4.4 2 4.4 4.4v3.2c0-2.3 1.9-4.2 4.2-4.2 2.3 0 4.2 1.9 4.2 4.2v11.5c0 9.5-7.3 16.6-16.6 16.6h-2.2c-5.6 0-9.5-2.5-12.6-7.1L3.6 31.9c-1.3-2-.7-4.7 1.3-6 1.9-1.2 4.4-.8 5.8 1l2.7 3.6V9.1c0-2.6 2-4.6 4.6-4.6Z" fill="#FFFFFF" stroke="#0B3D24" stroke-width="2.6" stroke-linejoin="round"/><path d="M23.2 30v8M32.2 30v8M40.6 30.5v7" stroke="#0B3D24" stroke-width="2" stroke-linecap="round" opacity=".35"/></svg>';
  let aktif = false, raf = 0, tandaLalu = '';
  const sembunyi = () => { wadah.hidden = true; };
  const dalam = (r, b) => r.width > 0 && r.bottom > b.top + 4 && r.top < b.bottom - 4 && r.right > b.left + 4 && r.left < b.right - 4;
  const geserKeTampil = (el) => {
    // gulir isi handphone (bukan halaman) supaya tombolnya kelihatan
    let p = el.parentElement;
    while (p && p !== layar && !(p.scrollHeight > p.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(p).overflowY))) p = p.parentElement;
    if (!p || p === document.body) return;
    const pr = p.getBoundingClientRect(), er = el.getBoundingClientRect();
    if (er.top < pr.top + 8 || er.bottom > pr.bottom - 8) p.scrollTop += er.top - pr.top - pr.height / 2 + er.height / 2;
  };
  const langkah = () => {
    raf = 0;
    if (!aktif) return;
    raf = requestAnimationFrame(langkah);
    const t = targetPenunjuk();
    if (!t) return sembunyi();
    const tanda = `${S.adegan}|${S.langkah}|${t.teks}`;
    if (tanda !== tandaLalu) { tandaLalu = tanda; if (layar.contains(t.el)) geserKeTampil(t.el); wadah.classList.remove('baru'); void wadah.offsetWidth; wadah.classList.add('baru'); }
    const r = t.el.getBoundingClientRect(), v = { top: 70, bottom: innerHeight, left: 0, right: innerWidth };
    const diLayarHp = layar.contains(t.el);
    // Tombolnya di luar layar: tampilkan gelembung di tepi yang bisa diketuk untuk menggulir ke sana
    if (t.tangan && r.width > 0 && (r.bottom < v.top + 10 || r.top > v.bottom - 10) && !(diLayarHp && !dalam(layar.getBoundingClientRect(), v))) {
      wadah.hidden = false; tangan.hidden = riak.hidden = true;
      const atas = r.bottom < v.top + 10, teks = atas ? `↑ ${t.teks}` : `${t.teks} ↓`;
      if (gel.textContent !== teks) gel.textContent = teks;
      gel.classList.add('tepi'); gel.classList.toggle('bawah', atas);
      gel.style.transform = atas ? `translate(${innerWidth / 2}px, ${v.top + 12}px) translate(-50%, 0)` : `translate(${innerWidth / 2}px, ${innerHeight - 22}px) translate(-50%, -100%)`;
      gel.style.setProperty('--panah', '0px');
      gel.onclick = () => t.el.scrollIntoView({ block: 'center', behavior: GERAK_KURANG ? 'auto' : 'smooth' });
      return;
    }
    gel.classList.remove('tepi'); gel.onclick = null;
    if (!dalam(r, v) || (diLayarHp && !dalam(r, layar.getBoundingClientRect()))) return sembunyi();
    wadah.hidden = false;
    if (gel.textContent !== t.teks) gel.textContent = t.teks;
    tangan.hidden = riak.hidden = !t.tangan;
    let x, y, by;
    if (t.tangan) {
      x = r.left + r.width / 2; y = r.top + Math.min(r.height * .6, r.height / 2 + 10);
      tangan.style.transform = `translate(${x - 13}px, ${y - 3}px)`;
      riak.style.transform = `translate(${x}px, ${y}px)`;
      by = r.top - 10;
    } else { x = r.left + r.width / 2; by = Math.max(r.top + 64, 120); }
    const w = gel.offsetWidth || 120, bx = Math.min(Math.max(x, w / 2 + 10), innerWidth - w / 2 - 10);
    const bawah = by < 110;
    gel.classList.toggle('bawah', bawah);
    gel.style.transform = bawah ? `translate(${bx}px, ${r.bottom + 64}px) translate(-50%, 0)` : `translate(${bx}px, ${by}px) translate(-50%, -100%)`;
    gel.style.setProperty('--panah', `${Math.round(x - bx)}px`);
  };
  new IntersectionObserver((e) => {
    aktif = e[0].isIntersecting;
    if (aktif && !raf) raf = requestAnimationFrame(langkah);
    if (!aktif) sembunyi();
  }, { threshold: .05 }).observe(document.getElementById('demo'));
}

/* ------------------------------------------------------------ Label melayang di kebun 3D */
function posisikanLabel() {
  const lbl = {
    sensor: document.getElementById('lbl-sensor'), air: document.getElementById('lbl-air'),
    hitung: document.getElementById('lbl-hitung'), kamera: document.getElementById('lbl-kamera'),
  };
  const sensor = S.fokus.startsWith('sensor-') && S.layar === 'grafik' ? S.fokus.slice(7) : null;
  const aturan = [
    [lbl.sensor, sensor ? 'sensor-' + sensor : null, () => { const s = SENSOR[sensor]; return [`${s.pendek} ${angka(nilaiSensor(sensor), s.des)}${s.label || s.satuan}`, statusSensor(sensor)]; }],
    [lbl.air, (S.status === 'waspada' || S.pompa.aktif === 'air') ? 'bak' : null, () => [`Air ${Math.round(S.levelAir)}%`, statusSensor('air')]],
    [lbl.hitung, S.pompa.aktif ? 'pompa' : null, () => [`Sisa 0:${String(Math.ceil(S.pompa.sisa)).padStart(2, '0')}`, null]],
    [lbl.kamera, S.foto.status === 'memuat' ? 'kamera' : null, () => [`Memotong foto lubang ${S.foto.lubang}…`, null]],
  ];
  for (const [el, nama, isi] of aturan) {
    if (!el) continue;
    const p = nama && S.mode3d === 'webgl' ? Kebun3D.proyeksi(nama) : null;
    if (!p) { el.hidden = true; continue; }
    const [teks, st] = isi();
    const span = el.querySelector('.isi');
    if (span.textContent !== teks.replace(/<[^>]+>/g, '')) span.innerHTML = teks;
    el.classList.toggle('waspada', st && st !== 'normal');
    el.hidden = false;
    el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
  }
}

/* ------------------------------------------------------------ Kebun datar (tanpa WebGL / gerakan dikurangi) */
function kebunDatarSVG() {
  let tanaman = '';
  for (let c = 0; c < 6; c++) {
    for (const r of [0, 3]) {
      const t = TANAMAN[r * 6 + c];
      if (t.kosong) continue;
      const x = 196 + c * 82 + (r === 3 ? 22 : 0), y = r === 3 ? 196 : 190;
      const s = [0, .42, .58, .74, .88, 1][t.level] * (r === 3 ? .85 : 1);
      const daun = t.jenis === 'Pakcoy'
        ? [-34, -14, 6, 26].map((a, i) => `<ellipse cx="0" cy="-26" rx="10" ry="26" transform="rotate(${a})" fill="${t.kondisi === 'cek' && i === 0 ? '#C9C24A' : i % 2 ? '#3E9A3A' : '#5DBB46'}"/>`).join('')
        : [-1, 0, 1].map((i) => `<ellipse cx="${i * 14}" cy="-14" rx="16" ry="12" fill="${i ? '#8CCF5A' : '#A5DC74'}"/>`).join('');
      tanaman += `<g transform="translate(${x} ${y}) scale(${s})" ${t.level === 5 ? 'class="datar-panen"' : ''}>${t.level === 5 ? '<circle class="datar-pendar" cy="-24" r="40" fill="#8EEDC7" opacity="0"/>' : ''}${daun}</g>`;
    }
  }
  // Tiga penampung: galon Air Bersih, dirigen Nutrisi A (hijau), dirigen Nutrisi B (merah), pompa kecil di atasnya
  const pompaKecil = (id, x, y) => `<rect x="${x - 16}" y="${y - 12}" width="32" height="14" rx="4" fill="#55625B"/><circle id="datar-led-${id}" cx="${x + 9}" cy="${y - 17}" r="4.5" fill="#7F1D1D"/>`;
  const dirigen = (id, x, cair, tutup, teks) => `<g data-datar-wadah="${id}"><rect x="${x - 30}" y="374" width="60" height="70" rx="10" fill="#F4F7F5" opacity=".6" stroke="#fff" stroke-width="2"/>
    <rect x="${x - 26}" y="398" width="52" height="42" rx="6" fill="${cair}"/><path d="M${x - 22} 374 a10 10 0 0 1 20 0" fill="none" stroke="#E8EEEA" stroke-width="6"/>
    <rect x="${x + 6}" y="364" width="14" height="12" rx="3" fill="${tutup}"/><rect x="${x - 26}" y="380" width="52" height="16" rx="5" fill="#fff"/>
    <text x="${x}" y="392" text-anchor="middle" font-family="Poppins, sans-serif" font-weight="700" font-size="11" fill="${tutup}">${teks}</text>${pompaKecil(id, x + 13, 362)}</g>`;
  const pompa = `<g data-datar-wadah="air"><rect x="20" y="352" width="58" height="92" rx="16" fill="#C9ECFB" opacity=".7" stroke="#fff" stroke-width="2"/>
    <rect x="24" y="366" width="50" height="74" rx="12" fill="#4FA9E0" opacity=".85"/><rect x="38" y="340" width="22" height="14" rx="4" fill="#1E6FB8"/>
    <rect x="22" y="384" width="54" height="18" rx="5" fill="#fff"/><text x="49" y="397" text-anchor="middle" font-family="Poppins, sans-serif" font-weight="700" font-size="11" fill="#1E6FB8">Air Bersih</text>
    ${pompaKecil('air', 49, 338)}</g>${dirigen('nutA', 130, '#2FA24E', '#1E7A38', 'Nutrisi A')}${dirigen('nutB', 212, '#D9443B', '#A3271F', 'Nutrisi B')}`;
  return `<svg class="datar" viewBox="0 0 800 520" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Kebun hidroponik tampak samping" xmlns="http://www.w3.org/2000/svg">
    <rect width="800" height="520" class="f-langit"/>
    <path d="M30 520 C30 180 190 40 400 40 C610 40 770 180 770 520" fill="none" class="s-rangka" stroke-width="10"/>
    <path d="M0 400 C120 360 260 380 400 392 C540 404 660 366 800 380 V520 H0Z" class="f-bukit-1"/>
    <path d="M0 450 C160 430 300 440 420 452 C560 466 680 436 800 446 V520 H0Z" class="f-bukit-2"/>
    <rect x="118" y="318" width="564" height="16" rx="8" class="f-rak"/>
    <rect x="140" y="334" width="10" height="110" class="f-rangka"/><rect x="650" y="334" width="10" height="110" class="f-rangka"/>
    <g id="datar-bak">
      <rect x="160" y="206" width="480" height="110" rx="6" fill="rgba(255,255,255,.28)" stroke="#fff" stroke-width="2"/>
      <rect id="datar-pupuk" x="163" y="270" width="474" height="44" fill="var(--hp-pupuk)" opacity=".92"/>
      <rect id="datar-air" x="163" y="230" width="474" height="40" fill="var(--hp-air)" opacity=".85"/>
    </g>
    <rect x="148" y="194" width="504" height="14" rx="5" style="fill:var(--hp-papan);stroke:var(--hp-papan-garis)"/>
    ${tanaman}
    <g id="datar-sensor">
      <rect x="606" y="150" width="8" height="140" rx="4" fill="#DDE3DF"/><rect x="600" y="140" width="20" height="16" rx="4" fill="#046B37"/>
      <rect x="586" y="150" width="8" height="140" rx="4" fill="#DDE3DF"/><rect x="580" y="140" width="20" height="16" rx="4" fill="#E8833A"/>
      <circle id="datar-aura" cx="600" cy="292" r="16" fill="#4ADE80" opacity=".45"/>
    </g>
    <g transform="translate(672 300)"><rect x="-30" y="-14" width="60" height="16" rx="3" fill="#1E6B45"/><circle id="datar-led-esp" cx="20" cy="-18" r="5" fill="#22C55E"/></g>
    ${['M49 326 C49 270 120 236 190 214', 'M143 350 C150 290 190 250 230 216', 'M225 350 C240 290 262 250 272 216'].map((d) => `<path d="${d}" fill="none" stroke="#E4EEE8" stroke-width="7" stroke-linecap="round"/>`).join('')}
    ${pompa}
    <path id="datar-aliran-air" d="M49 326 C49 270 120 236 190 214" fill="none" stroke="#2F8FE0" stroke-width="4" stroke-dasharray="2 11" stroke-linecap="round" opacity="0"/>
    <path id="datar-aliran-nutA" d="M143 350 C150 290 190 250 230 216" fill="none" stroke="#2FA24E" stroke-width="4" stroke-dasharray="2 11" stroke-linecap="round" opacity="0"/>
    <path id="datar-aliran-nutB" d="M225 350 C240 290 262 250 272 216" fill="none" stroke="#D9443B" stroke-width="4" stroke-dasharray="2 11" stroke-linecap="round" opacity="0"/>
    <rect x="108" y="78" width="10" height="366" rx="5" fill="#5F6E66"/>
    <rect id="datar-lengan" x="108" y="78" width="292" height="8" rx="4" fill="#5F6E66"/>
    <g id="datar-kepala" transform="translate(400 86)"><rect x="-16" y="0" width="32" height="22" rx="5" fill="#2F3A33"/><circle cx="0" cy="26" r="6" fill="#111"/><circle id="datar-led-kam" cx="10" cy="6" r="3" fill="#7F1D1D"/>
      <path id="datar-sorot" d="M-8 30 L-250 150 L250 150 L8 30Z" fill="#FFF3B0" opacity="0"/></g>
    <rect id="datar-crop" x="0" y="0" width="86" height="84" rx="12" fill="none" stroke="#FF9F1C" stroke-width="5" opacity="0"/>
    <g id="datar-siA" transform="translate(300 360) scale(.9)" opacity="0"></g>
    <g id="datar-semanggi" transform="translate(680 352) scale(.85)"></g>
    <g font-family="Poppins, sans-serif" font-weight="700" font-size="20">
      <text id="datar-lbl-ph" x="610" y="128" text-anchor="middle" class="f-teks">pH 6,1</text>
      <text id="datar-lbl-air" x="400" y="252" text-anchor="middle" fill="#fff">Air 78%</text>
      <text id="datar-lbl-hitung" x="130" y="482" text-anchor="middle" class="f-teks"></text>
    </g>
  </svg>`;
}
let datarPoseA = '', datarPoseS = '';
function renderDatar() {
  const el = document.getElementById('datar');
  if (!el || el.hidden) return;
  if (!el.firstChild) el.innerHTML = kebunDatarSVG();
  const lv = Math.max(.08, Math.min(1, S.levelAir / 100));
  const tinggi = 104 * lv, fp = Math.max(.15, Math.min(.6, S.tds / 1600 * .8));
  const hP = tinggi * fp, hA = tinggi - hP;
  const bawah = 314;
  const set = (id, a) => { const e = document.getElementById(id); if (e) for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); };
  set('datar-pupuk', { y: bawah - hP, height: hP });
  set('datar-air', { y: bawah - hP - hA, height: hA });
  set('datar-lbl-air', { y: Math.max(232, bawah - tinggi + 22) });
  document.getElementById('datar-lbl-air').textContent = `Air ${Math.round(S.levelAir)}%`;
  const stPh = statusSensor('ph');
  document.getElementById('datar-lbl-ph').textContent = `pH ${angka(S.ph, 1)}`;
  set('datar-aura', { fill: stPh === 'normal' && statusSensor('air') === 'normal' ? '#4ADE80' : '#F59E0B' });
  set('datar-led-esp', { fill: S.status === 'waspada' ? '#F59E0B' : '#22C55E' });
  for (const p of POMPA) { set('datar-led-' + p.id, { fill: S.pompa.aktif === p.id ? '#22C55E' : '#7F1D1D' }); set('datar-aliran-' + p.id, { opacity: S.pompa.aktif === p.id ? 1 : 0 }); }
  document.getElementById('datar-lbl-hitung').textContent = S.pompa.aktif ? `Sisa 0:${String(Math.ceil(S.pompa.sisa)).padStart(2, '0')}` : '';
  const cropN = S.kamera || S.foto.lubang;
  if (cropN) { const c = (cropN - 1) % 6, r = Math.floor((cropN - 1) / 6), cx = 196 + c * 82 + (r >= 2 ? 22 : 0); set('datar-crop', { x: cx - 43, y: (r >= 2 ? 196 : 190) - 70 }); }
  set('datar-crop', { opacity: S.kamera ? 1 : 0 });
  set('datar-led-kam', { fill: S.foto.status === 'memuat' ? '#EF4444' : '#7F1D1D' });
  set('datar-sorot', { opacity: S.foto.status === 'memuat' ? .35 : 0 });
  document.querySelectorAll('#datar .datar-pendar').forEach((c) => c.setAttribute('opacity', S.panenSorot ? .45 : 0));
  const a = document.getElementById('datar-siA');
  if (S.siA !== datarPoseA) { datarPoseA = S.siA; if (S.siA !== 'sembunyi') a.innerHTML = siAIsi(S.siA === 'tunjuk' ? 'tunjuk' : S.siA); a.setAttribute('opacity', S.siA === 'sembunyi' ? 0 : 1); }
  const s = document.getElementById('datar-semanggi');
  const poseS = S.semanggi === 'lompat' ? 'angkat' : S.semanggi;
  if (poseS !== datarPoseS) { datarPoseS = poseS; s.innerHTML = semanggiIsi(poseS); }
}

/* ------------------------------------------------------------ Tata letak demo: skala HP, POV, HP mengambang */
function aturTataLetak() {
  const panggung = document.getElementById('panggung'), panelHp = document.getElementById('panel-hp'), panelKebun = document.getElementById('panel-kebun');
  const desktop = innerWidth >= 900;
  panggung.dataset.pov = desktop ? 'keduanya' : S.pov;
  const pip = !desktop && S.pov === 'kebun' && S.pip;
  panggung.classList.toggle('pip', pip);
  const perbesar = document.getElementById('perbesar-hp');
  perbesar.hidden = !pip;
  document.getElementById('hp').style.pointerEvents = pip ? 'none' : '';
  let s;
  if (desktop) {
    s = Math.max(.68, Math.min(.82, (innerHeight - 120) / 788));
    panelKebun.style.minHeight = `${Math.round(788 * s)}px`;
    panelHp.style.cssText = '';
  } else if (pip) {
    s = .3;
    panelKebun.style.minHeight = '';
    panelHp.style.cssText = `right:${10}px;top:${panelKebun.offsetTop + panelKebun.offsetHeight - 788 * s - 10}px;width:auto`;
  } else {
    panelKebun.style.minHeight = '';
    panelHp.style.cssText = '';
    s = Math.min(.92, (panggung.clientWidth) / 384);
  }
  panelHp.style.setProperty('--s', s.toFixed(3));
  document.querySelectorAll('.pov-toggle button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pov === S.pov)));
  document.getElementById('saklar-pip').setAttribute('aria-pressed', String(S.pip));
  document.getElementById('saklar-pip').style.display = !desktop && S.pov === 'kebun' ? 'inline-flex' : '';
  renderPenjelasan();
}

/* ------------------------------------------------------------ Putar otomatis (±55 detik) */
let tokenPutar = 0;
const tidur = (ms) => new Promise((r) => setTimeout(r, ms));
function ketukOtomatis(sel) {
  return () => {
    let el;
    if (sel.startsWith('lubang:')) el = document.querySelector(`#kebun-hp .lubang-ketuk[data-n="${sel.split(':')[1]}"]`);
    else el = document.querySelector(sel);
    if (!el) return;
    const layar = document.getElementById('hp-layar');
    if (layar.contains(el)) {
      const lr = layar.getBoundingClientRect(), er = el.getBoundingClientRect(), sk = lr.width / 360 || 1;
      const t = document.createElement('span'); t.className = 'ketuk-palsu';
      t.style.left = `${(er.left + er.width / 2 - lr.left) / sk}px`; t.style.top = `${(er.top + er.height / 2 - lr.top) / sk}px`;
      layar.appendChild(t); setTimeout(() => t.remove(), 600);
    }
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };
}
const NASKAH = [
  [0, () => mulaiAdegan(1)], [2200, ketukOtomatis('#hp-m-ph')],
  [4200, () => mulaiAdegan(2)], [1800, ketukOtomatis('#btn-simulasi')], [4300, ketukOtomatis('#hp-btn-langkah')],
  [4200, () => mulaiAdegan(3)], [1500, ketukOtomatis('#hp-tg-pompa')], [1700, ketukOtomatis('#hp-seg-manual')], [1400, ketukOtomatis('#hp-ya-manual')],
  [1300, ketukOtomatis('#hp-pompa-air > button')], [1200, ketukOtomatis('#hp-durasi-30')], [1100, ketukOtomatis('#hp-nyalakan')], [1200, ketukOtomatis('#hp-ya-nyalakan')],
  [10600, () => mulaiAdegan(4)], [1600, ketukOtomatis('lubang:5')], [1700, ketukOtomatis('#hp-buka-detail')], [1700, ketukOtomatis('#hp-ambil-foto')],
  [4800, () => mulaiAdegan(5)], [1500, ketukOtomatis('#hp-tg-panen')], [4500, null],
];
async function putarOtomatis() {
  const token = ++tokenPutar;
  aturTombolPutar(true);
  for (const [ms, fn] of NASKAH) {
    await tidur(GERAK_KURANG ? Math.min(ms, 2600) : ms);
    if (token !== tokenPutar) return;
    if (fn) { fn(); segarkan(); }
  }
  if (token === tokenPutar) hentikanPutar();
}
function hentikanPutar() { tokenPutar++; aturTombolPutar(false); }
function aturTombolPutar(aktif) {
  const b = document.getElementById('putar');
  b.setAttribute('aria-pressed', String(aktif));
  b.innerHTML = aktif ? `${ikon('jeda')}<span>Hentikan</span>` : `${ikon('putar')}<span>Putar otomatis</span>`;
}

/* ------------------------------------------------------------ Intro: maskot menyapa, menyatu jadi logo, lalu nongol lagi
   Main sendiri saat halaman dibuka dan setiap kali bagian atas terlihat lagi. Tanpa tombol. */
let animIntro = [], introSelesaiTimer = 0;
const T_INTRO = 4600;
function introMain() {
  const svg = document.getElementById('intro-svg');
  if (!svg || GERAK_KURANG) return;
  animIntro.forEach((a) => a.cancel()); animIntro = [];
  clearTimeout(introSelesaiTimer);
  const q = (s) => svg.querySelector(s);
  const ez = 'cubic-bezier(.3,.7,.3,1)';
  const anim = (el, kf, o = {}) => { if (!el) return; animIntro.push(el.animate(kf, { duration: T_INTRO, fill: 'both', easing: 'linear', ...o })); };
  const t = (ms) => +(ms / T_INTRO).toFixed(4);
  const jalanMasuk = (dx, mx) => [
    { transform: `translate(${dx}px,0px) scale(1)`, opacity: 1, offset: 0, easing: ez },
    { transform: 'translate(0px,0px) scale(1)', opacity: 1, offset: t(1300) },
    { transform: 'translate(0px,0px) scale(1)', opacity: 1, offset: t(2650), easing: 'ease-in' },
    { transform: `translate(${mx * .45}px,-150px) scale(.8)`, opacity: 1, offset: t(2900), easing: 'ease-in' },
    { transform: `translate(${mx}px,-215px) scale(.3)`, opacity: 0, offset: t(3150) },
    { transform: `translate(${mx}px,-215px) scale(.3)`, opacity: 0, offset: t(3700), easing: 'cubic-bezier(.34,1.56,.64,1)' },
    { transform: 'translate(0px,0px) scale(1)', opacity: 1, offset: t(4300) },
    { transform: 'translate(0px,0px) scale(1)', opacity: 1, offset: 1 },
  ];
  anim(q('#h-siA'), jalanMasuk(-560, 240));
  anim(q('#h-semanggi'), jalanMasuk(560, -240));
  for (const sel of ['.langkah-a', '.langkah-s']) {
    const el = q(sel);
    if (el) animIntro.push(el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }], { duration: 325, iterations: 4, easing: 'ease-in-out' }));
  }
  const sapa = (geser) => [
    { transform: 'scale(0)', opacity: 0, offset: 0 },
    { transform: 'scale(0)', opacity: 0, offset: t(1150 + geser) },
    { transform: 'scale(1.12)', opacity: 1, offset: t(1380 + geser) },
    { transform: 'scale(1)', opacity: 1, offset: t(1500 + geser) },
    { transform: 'scale(1)', opacity: 1, offset: t(2550) },
    { transform: 'scale(.5)', opacity: 0, offset: t(2700) },
    { transform: 'scale(0)', opacity: 0, offset: t(4300 + geser / 2) },
    { transform: 'scale(1.1)', opacity: 1, offset: t(4480 + geser / 2) },
    { transform: 'scale(1)', opacity: 1, offset: 1 },
  ];
  anim(q('#h-sapa-a'), sapa(0));
  anim(q('#h-sapa-s'), sapa(160));
  anim(q('#h-logo'), [
    { opacity: 0, transform: 'scale(.2)', offset: 0 },
    { opacity: 0, transform: 'scale(.2)', offset: t(3050), easing: 'cubic-bezier(.34,1.56,.64,1)' },
    { opacity: 1, transform: 'scale(1.14)', offset: t(3380) },
    { opacity: 1, transform: 'scale(.96)', offset: t(3600) },
    { opacity: 1, transform: 'scale(1)', offset: t(3800) },
    { opacity: 1, transform: 'scale(1)', offset: 1 },
  ]);
  anim(q('#h-kata'), [
    { opacity: 0, transform: 'translateY(18px)', offset: 0 },
    { opacity: 0, transform: 'translateY(18px)', offset: t(3400), easing: ez },
    { opacity: 1, transform: 'translateY(0)', offset: t(3900) },
    { opacity: 1, transform: 'translateY(0)', offset: 1 },
  ]);
  anim(q('#h-kilau'), [{ opacity: 0, offset: 0 }, { opacity: 0, offset: t(3700) }, { opacity: 1, offset: t(4100) }, { opacity: 1, offset: 1 }]);
  const ledak = q('#h-ledak');
  if (ledak) {
    animIntro.push(ledak.animate([{ opacity: 1 }, { opacity: 1, offset: .7 }, { opacity: 0 }], { duration: 700, delay: 3080, fill: 'none' }));
    const cincin = ledak.querySelector('.cincin-ledak');
    animIntro.push(cincin.animate([{ transform: 'scale(.2)', opacity: .9 }, { transform: 'scale(1.7)', opacity: 0 }], { duration: 650, delay: 3080, easing: 'ease-out', fill: 'both' }));
    ledak.querySelectorAll('.serpih').forEach((s) => {
      const a = s.style.getPropertyValue('--a');
      animIntro.push(s.animate([
        { transform: `rotate(${a}) translateX(10px) scale(.4)`, opacity: 1 },
        { transform: `rotate(${a}) translateX(${120 + Math.random() * 40}px) scale(1.1) rotate(160deg)`, opacity: 0 },
      ], { duration: 700, delay: 3100, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' }));
    });
  }
  // Setelah selesai, lepaskan animasi: tampilan akhir sama dengan tampilan dasar, lalu gerak santai CSS yang jalan.
  introSelesaiTimer = setTimeout(() => { animIntro.forEach((a) => a.cancel()); animIntro = []; }, T_INTRO + 900);
}
function pasangIntro() {
  const intro = document.getElementById('intro');
  if (!intro) return;
  introMain();
  let pernahHilang = false;
  new IntersectionObserver((e) => {
    const r = e[0].intersectionRatio;
    if (r < .15) pernahHilang = true;
    else if (r > .6 && pernahHilang) { pernahHilang = false; introMain(); }
  }, { threshold: [0, .15, .6, 1] }).observe(intro);
  // Ketuk maskot atau logo untuk melihatnya menyapa lagi
  intro.addEventListener('click', (e) => { if (e.target.closest('#h-siA, #h-semanggi, #h-logo')) introMain(); });
}

/* ------------------------------------------------------------ Pemandu: karakter pilihanmu ikut keliling */
const PESAN_PEMANDU = {
  tata: {
    sapa: 'Hai! Aku Tata. Yuk, kenalan sama AgroSync!',
    atas: 'Gulir ke bawah, yuk!',
    masalah: 'Ketuk kartunya, ada solusinya.',
    demo: 'Pencet yang berdenyut, ya!',
    fitur: 'Coba pencet fiturnya satu-satu.',
    sehari: 'Begini rasanya sehari bareng AgroSync.',
    faq: 'Ada yang mau ditanyain?',
    mulai: 'Sampai ketemu di kebun!',
    hadiah: 'Yeay, hadiah baru!',
  },
  ago: {
    sapa: 'Halo, aku Ago. Aku bantu jaga kebunmu.',
    atas: 'Santai aja, gulir ke bawah.',
    masalah: 'Tiga masalah ini sering muncul. Ketuk buat lihat solusinya.',
    demo: 'Ikutin yang berdenyut. Aku jagain.',
    fitur: 'Ini yang bikin kebunmu aman.',
    sehari: 'Aku kabarin kamu dari pagi sampai panen.',
    faq: 'Bingung? Tanya aja.',
    mulai: 'Kebunmu aman. Sampai ketemu!',
    hadiah: 'Ada hadiah baru buatmu.',
  },
};
const TIPS = [
  'Tahu nggak? Selada paling suka air yang agak asam, sekitar pH 6.',
  'Panen pagi hari bikin sayur lebih renyah.',
  'Air bak lebih cepat menyusut waktu cuaca panas.',
  'Daun bawah menguning sering jadi tanda pupuknya kurang.',
  'Nutrisi A dan B jangan dicampur langsung, ya. Masukin satu-satu.',
];
const NAMA_KARAKTER = { tata: 'Tata', ago: 'Ago' };
const PEMANDU = { karakter: 'tata', setKarakter: () => {}, tampil: () => {}, rayakan: () => {}, bicara: () => {}, segarkan: () => {} };
const gambarKarakter = (id, pose = 'lambai', aks = aksesoriAktif()) => id === 'ago' ? siASVG(pose, '', '', aks) : semanggiSVG(pose, '', '', aks);
function pasangPemandu() {
  const p = document.getElementById('pemandu'), balon = document.getElementById('pemandu-balon'), teks = document.getElementById('pemandu-teks');
  const maskot = document.getElementById('pemandu-maskot'), tutupBtn = document.getElementById('pemandu-tutup');
  if (!p) return;
  let ditutup = false, sembunyiT = 0, tip = 0, bagianAktif = 'atas';
  try { ditutup = localStorage.getItem('agrosync-pemandu') === 'tutup'; } catch (_) { /* tidak apa-apa */ }
  const pesan = (k) => PESAN_PEMANDU[PEMANDU.karakter][k];
  const bicara = (isi, viaKetuk = false) => {
    teks.setAttribute('aria-live', viaKetuk ? 'polite' : 'off');
    teks.textContent = isi;
    balon.classList.remove('sembunyi');
    clearTimeout(sembunyiT);
    sembunyiT = setTimeout(() => balon.classList.add('sembunyi'), viaKetuk ? 6500 : 5000);
  };
  const bolehBicara = (id) => id !== 'atas' || innerWidth >= 700;
  const lompat = () => { if (!GERAK_KURANG) maskot.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-16px) scale(1.05,.95)' }, { transform: 'translateY(0)' }], { duration: 450, easing: 'ease-out' }); };
  PEMANDU.setKarakter = (id) => {
    PEMANDU.karakter = id;
    perbaruiMaskotMasalah(false);
    maskot.innerHTML = gambarKarakter(id);
    maskot.setAttribute('aria-label', `${NAMA_KARAKTER[id]}, pemandumu. Ketuk untuk dapat tips berkebun`);
    tutupBtn.setAttribute('aria-label', `Sembunyikan ${NAMA_KARAKTER[id]}`);
  };
  PEMANDU.tampil = (sapa) => {
    if (sapa) { ditutup = false; try { localStorage.removeItem('agrosync-pemandu'); } catch (_) { /* tidak apa-apa */ } }
    if (ditutup) return;
    p.hidden = false; p.classList.remove('masuk'); void p.offsetWidth; p.classList.add('masuk');
    if (sapa) bicara(pesan('sapa'), true);
    else if (bolehBicara(bagianAktif)) bicara(pesan(bagianAktif));
    else balon.classList.add('sembunyi');
  };
  PEMANDU.rayakan = () => { if (p.hidden) return; lompat(); bicara(pesan('hadiah')); };
  PEMANDU.bicara = (isi) => { if (p.hidden) return; lompat(); bicara(isi, true); };
  PEMANDU.segarkan = (animasi) => {
    maskot.innerHTML = gambarKarakter(PEMANDU.karakter);
    perbaruiMaskotMasalah(false);
    if (animasi && !GERAK_KURANG && !p.hidden) maskot.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25) rotate(-6deg)' }, { transform: 'scale(1)' }], { duration: 520, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  };
  maskot.addEventListener('click', () => { lompat(); bicara(TIPS[tip++ % TIPS.length], true); });
  tutupBtn.addEventListener('click', () => {
    p.hidden = true; ditutup = true;
    try { localStorage.setItem('agrosync-pemandu', 'tutup'); } catch (_) { /* tidak apa-apa */ }
  });
  const ids = Object.keys(PESAN_PEMANDU.tata).filter((k) => k !== 'sapa' && k !== 'hadiah');
  const io = new IntersectionObserver((en) => {
    for (const e of en) if (e.isIntersecting) {
      const id = e.target.classList.contains('hero') ? 'atas' : e.target.id;
      if (id !== bagianAktif && ids.includes(id)) { bagianAktif = id; if (!p.hidden && bolehBicara(id)) { bicara(pesan(id)); lompat(); } }
    }
  }, { rootMargin: '-45% 0px -45% 0px' });
  document.querySelectorAll('section.hero, main section[id]').forEach((s) => { if (s.classList.contains('hero') || ids.includes(s.id)) io.observe(s); });
  // Di layar sempit, menyingkir saat demo atau pilihan pertanyaan sedang dipakai
  const menghalangi = new Set();
  const ioHalang = new IntersectionObserver((en) => {
    for (const e of en) e.isIntersecting ? menghalangi.add(e.target) : menghalangi.delete(e.target);
    p.style.visibility = menghalangi.size > 0 && innerWidth < 900 ? 'hidden' : '';
  }, { threshold: .15 });
  ['panggung', 'obrolan-pilihan'].forEach((id) => ioHalang.observe(document.getElementById(id)));
  PEMANDU.setKarakter('tata');
}

/* ------------------------------------------------------------ Muncul saat digulir */
function pasangMuncul() {
  if (GERAK_KURANG || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((en) => en.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('muncul'); e.target.classList.remove('siap-muncul'); io.unobserve(e.target);
  }), { threshold: .12, rootMargin: '0px 0px -5% 0px' });
  document.querySelectorAll('[data-muncul]').forEach((el) => {
    if (el.closest('.hero')) return;
    if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('siap-muncul'); io.observe(el); }
  });
}

/* ------------------------------------------------------------ Sehari bareng: hari berjalan sendiri */
function pasangSehari() {
  const hari = document.getElementById('hari');
  if (!hari) return;
  const tombol = [...hari.querySelectorAll('.momen')], matahari = document.getElementById('matahari-kecil');
  const posisi = [[12.5, 29], [37.5, 3], [62.5, 3], [87.5, 29]];
  let aktif = 0, jeda = 0, terlihat = false;
  const pilih = (i) => {
    aktif = i; hari.dataset.momenAktif = String(i);
    tombol.forEach((b, j) => b.setAttribute('aria-pressed', String(j === i)));
    matahari.style.setProperty('--sx', posisi[i][0] + '%'); matahari.style.setProperty('--sy', posisi[i][1] + 'px');
  };
  // Checklist misi: tiap momen yang diketuk dapat centang
  const misi = document.getElementById('misi-sehari'), teksMisi = document.getElementById('misi-sehari-teks'), titik = [...misi.querySelectorAll('.misi-sehari-titik i')];
  document.getElementById('misi-sehari-ikon').innerHTML = emoji3D('bunga');
  const diketuk = new Set(HADIAH.misi.includes('harian') ? [0, 1, 2, 3] : []);
  const segarMisi = (animasi) => {
    tombol.forEach((b, i) => { const c = diketuk.has(i); b.classList.toggle('dicek', c); b.querySelector('.cek-momen').innerHTML = c ? ikon('centangPolos') : ''; });
    titik.forEach((x, i) => x.classList.toggle('isi', i < diketuk.size));
    const beres = diketuk.size === tombol.length;
    misi.classList.toggle('beres', beres);
    teksMisi.textContent = beres ? 'Misi beres! Pemandumu dapat bunga.' : diketuk.size ? `Misi: ketuk keempat momen · ${diketuk.size} dari 4` : 'Misi: ketuk keempat momen';
    if (animasi && beres && !GERAK_KURANG) misi.animate([{ scale: 1 }, { scale: 1.06 }, { scale: 1 }], { duration: 450, easing: 'ease-out' });
  };
  tombol.forEach((b, i) => b.addEventListener('click', () => {
    pilih(i); jeda = Date.now() + 9000;
    if (!diketuk.has(i)) {
      diketuk.add(i); segarMisi(true);
      if (!GERAK_KURANG) { const r = b.querySelector('.cek-momen').getBoundingClientRect(); percikDaun(r.left + r.width / 2, r.top + r.height / 2, 6); }
      if (diketuk.size === tombol.length) buka('harian');
    }
  }));
  segarMisi(false);
  new IntersectionObserver((e) => { terlihat = e[0].isIntersecting; }, { threshold: .3 }).observe(hari);
  setInterval(() => { if (terlihat && Date.now() > jeda && !GERAK_KURANG) pilih((aktif + 1) % tombol.length); }, 2800);
  pilih(0);
}

/* ------------------------------------------------------------ Maskot yang bisa diketuk, mata mengikuti kursor */
function pasangMaskot() {
  document.querySelectorAll('.kartu-maskot .potret').forEach((b) => {
    const ucap = b.querySelector('.ucap'), daftar = b.dataset.ucap.split('|');
    let i = 0, t = 0;
    b.addEventListener('click', () => {
      ucap.textContent = daftar[i++ % daftar.length];
      ucap.classList.add('tampil');
      b.classList.remove('lompat'); void b.offsetWidth; b.classList.add('lompat');
      clearTimeout(t); t = setTimeout(() => ucap.classList.remove('tampil'), 2800);
    });
  });
  if (GERAK_KURANG || !matchMedia('(pointer: fine)').matches) return;
  let raf = 0, px = 0, py = 0;
  const ikuti = (el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || !r.width) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height * .38, dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 260) * 2.6;
    el.querySelectorAll('.mata-ikut').forEach((m) => { m.style.transform = `translate(${(dx / d * k).toFixed(2)}px, ${(dy / d * k).toFixed(2)}px)`; });
  };
  addEventListener('pointermove', (e) => {
    px = e.clientX; py = e.clientY;
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; document.querySelectorAll('.pilih-gambar svg, .maskot-bicara svg, .pemandu-maskot svg, #intro-svg .h-idle, .maskot-cta svg').forEach(ikuti); });
  }, { passive: true });
}

/* ------------------------------------------------------------ Percikan daun */
function percikDaun(x, y, n = 16) {
  if (GERAK_KURANG) return;
  const warna = ['#8EEDC7', '#6CC04A', '#F5BFA0', '#A5DC74'];
  for (let i = 0; i < n; i++) {
    const el = document.createElement('span');
    el.className = 'serpih-dom';
    el.innerHTML = `<svg viewBox="0 0 26 14" aria-hidden="true"><path d="M1 7 C9 -2 21 -2 25 7 C21 16 9 16 1 7Z" fill="${warna[i % 4]}"/></svg>`;
    document.body.appendChild(el);
    const a = Math.random() * Math.PI * 2, j = 60 + Math.random() * 90;
    el.animate([
      { transform: `translate(${x}px, ${y}px) rotate(0deg) scale(.6)`, opacity: 1 },
      { transform: `translate(${x + Math.cos(a) * j}px, ${y + Math.sin(a) * j - 40}px) rotate(${Math.random() * 540}deg) scale(1)`, opacity: 1, offset: .55 },
      { transform: `translate(${x + Math.cos(a) * j * 1.25}px, ${y + Math.sin(a) * j + 70}px) rotate(${Math.random() * 720}deg) scale(.8)`, opacity: 0 },
    ], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => el.remove();
  }
}

/* ------------------------------------------------------------ Mulai */
/* ------------------------------------------------------------ Kartu bos: ketuk untuk menyerang */
const TAHAP_MASALAH = [
  { teks: 'Pernah ngalamin?', tata: { mata: 'sedih', mulut: 'sedih', tangan: 'diam', kaki: 'diam' }, ago: { mata: 'sedih', mulut: 'sedih', lengan: 'turun' } },
  { teks: 'Oh, ada solusinya!', tata: { mata: 'kaget', mulut: 'o', tangan: 'dagu', kaki: 'diam' }, ago: { mata: 'kaget', mulut: 'o', lengan: 'dagu' } },
  { teks: 'Satu lagi, yuk!', tata: { mata: 'titik', mulut: 'buka', tangan: 'lambai', kaki: 'jalan' }, ago: { mata: 'titik', mulut: 'buka', lengan: 'jempol' } },
  { teks: 'Semua beres!', tata: { mata: 'senang', mulut: 'tawa', tangan: 'naik', kaki: 'lompat' }, ago: { mata: 'senang', mulut: 'tawa', lengan: 'naik' } },
];
let tahapMasalah = 0;
function perbaruiMaskotMasalah(animasi) {
  const wadah = document.getElementById('maskot-masalah');
  if (!wadah) return;
  const k = PEMANDU.karakter === 'ago' ? 'ago' : 'tata', th = TAHAP_MASALAH[tahapMasalah];
  const o = { ...th[k], aks: aksesoriAktif() };
  document.getElementById('maskot-masalah-gambar').innerHTML = k === 'ago'
    ? `<svg viewBox="0 -24 132 146" aria-hidden="true">${agoIsi(o)}${tahapMasalah === 0 ? BENDA.keringat(102, 40, .6) : ''}</svg>`
    : `<svg viewBox="0 -24 120 150" aria-hidden="true">${tataIsi(o)}${tahapMasalah === 0 ? BENDA.keringat(100, 34, .6) : ''}</svg>`;
  const gel = document.getElementById('gelembung-masalah');
  gel.textContent = th.teks;
  wadah.dataset.tahap = String(tahapMasalah);
  if (animasi && !GERAK_KURANG) {
    gel.animate([{ scale: .6, opacity: 0 }, { scale: 1, opacity: 1 }], { duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)' });
    document.getElementById('maskot-masalah-gambar').animate(tahapMasalah === 3
      ? [{ transform: 'translateY(0)' }, { transform: 'translateY(-26px) scale(1.05,.95)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-12px)' }, { transform: 'translateY(0)' }]
      : [{ transform: 'scale(1)' }, { transform: 'scale(1.08,.92)' }, { transform: 'scale(1)' }], { duration: tahapMasalah === 3 ? 900 : 420, easing: 'ease-out' });
  }
}
function pasangBos() {
  const kartu = [...document.querySelectorAll('.kartu-bos')], kalah = new Set(), strip = document.getElementById('strip-beres');
  const segarTahap = (animasi) => {
    const baru = Math.min(3, kalah.size);
    if (baru !== tahapMasalah || !animasi) { tahapMasalah = baru; perbaruiMaskotMasalah(animasi); }
    const semua = kalah.size === kartu.length;
    if (semua && strip.hidden) { strip.hidden = false; if (!GERAK_KURANG) strip.animate([{ opacity: 0, transform: 'translateY(16px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' }); }
    else if (!semua) strip.hidden = true;
  };
  kartu.forEach((k, i) => {
    const nama = k.querySelector('.depan > b').textContent, senjata = k.querySelector('.belakang > b').textContent;
    k.addEventListener('click', () => {
      if (k.getAttribute('aria-pressed') === 'true') {
        k.setAttribute('aria-pressed', 'false'); k.classList.remove('kena'); k.setAttribute('aria-label', `Masalah: ${nama}. Ketuk untuk lihat solusinya`);
        kalah.delete(i); segarTahap(true); return;
      }
      if (k.classList.contains('kena')) return;
      k.classList.add('kena');
      const r = k.getBoundingClientRect();
      percikDaun(r.left + r.width / 2, r.top + r.height * .4, 14);
      setTimeout(() => {
        k.setAttribute('aria-pressed', 'true');
        k.setAttribute('aria-label', `${nama}. Solusinya: ${senjata}. Ketuk untuk balik`);
        kalah.add(i); segarTahap(true);
        if (kalah.size === kartu.length) buka('bos');
      }, GERAK_KURANG ? 0 : 650);
    });
  });
  segarTahap(false);
}

/* ------------------------------------------------------------ Power-up: widget mini yang bisa dimainkan */
function tanamanWg(lv) {
  const s = [0, .38, .56, .74, .9, 1.04][lv], n = 3 + lv;
  let daun = '';
  for (let i = 0; i < n; i++) { const a = -70 + i * (140 / (n - 1)); daun += `<ellipse cx="0" cy="-30" rx="12" ry="30" transform="rotate(${a.toFixed(1)})" fill="${i % 2 ? '#3E9A3A' : '#5DBB46'}"/>`; }
  const bunga = lv === 5 ? '<g transform="translate(40 -84)"><circle r="17" fill="#fff"/><g fill="#F5B82E"><circle cy="-6" r="5"/><circle cx="5.7" cy="-1.8" r="5"/><circle cx="3.5" cy="4.9" r="5"/><circle cx="-3.5" cy="4.9" r="5"/><circle cx="-5.7" cy="-1.8" r="5"/></g><circle r="3.5" fill="#FFF3C4"/></g>' : '';
  return `<svg viewBox="-75 -112 150 150" aria-hidden="true"><ellipse cx="0" cy="34" rx="46" ry="8" fill="rgba(0,0,0,.12)"/><g transform="translate(0 4) scale(${s})">${daun}<ellipse cx="0" cy="-8" rx="10" ry="14" fill="#A5DC74"/></g><path d="M-30 4 H30 L24 34 H-24 Z" fill="#E07A4F"/><rect x="-34" y="-3" width="68" height="10" rx="5" fill="#C9653C"/>${bunga}</svg>`;
}
function pasangPowerUp() {
  const dicoba = new Set();
  const coba = (id) => { dicoba.add(id); if (dicoba.size >= 6) buka('kolektor'); };
  const sekali = (el, fn) => new IntersectionObserver((e, io) => { if (e[0].isIntersecting) { io.disconnect(); fn(); } }, { threshold: .5 }).observe(el);

  // 1. Radar kondisi
  const radar = document.getElementById('wg-radar');
  const RADAR = [['air', 'Air'], ['pupuk', 'Pupuk'], ['ph', 'pH'], ['suhu', 'Suhu']];
  radar.innerHTML = RADAR.map(([k, n]) => `<div class="cincin-mini" data-k="${k}"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="jalur" cx="32" cy="32" r="26"/><circle class="isi" cx="32" cy="32" r="26"/></svg><span class="ik">${ikon(SENSOR[k].ikon)}</span><small>${n} <b>–</b></small></div>`).join('');
  const SET = [
    { air: 78, pupuk: 840, ph: 6.1, suhu: 24.6 }, { air: 80, pupuk: 860, ph: 7.2, suhu: 25.1 },
    { air: 82, pupuk: 830, ph: 6.3, suhu: 24.2 }, { air: 34, pupuk: 900, ph: 6.4, suhu: 26.0 },
  ];
  let putaran = 0;
  const pindai = () => {
    const nilai = SET[putaran++ % SET.length];
    radar.classList.remove('pindai'); void radar.offsetWidth; radar.classList.add('pindai');
    radar.querySelectorAll('.cincin-mini').forEach((c, i) => {
      const k = c.dataset.k, v = nilai[k], s = SENSOR[k], aman = v >= s.ideal[0] && v <= s.ideal[1];
      const isi = c.querySelector('.isi'), w = aman ? '#2E7D32' : '#B7791F';
      isi.style.transition = 'none'; isi.style.strokeDasharray = '0 999'; void isi.getBoundingClientRect();
      setTimeout(() => { isi.style.transition = ''; isi.style.stroke = w; isi.style.strokeDasharray = `${(2 * Math.PI * 26 * (aman ? 1 : .55)).toFixed(1)} 999`; }, 60 + i * 120);
      c.querySelector('.ik').style.color = w;
      c.querySelector('small b').textContent = `${angka(v, s.des)}${s.label || ''}`;
    });
  };
  sekali(radar, pindai);
  document.querySelector('[data-wg="radar"]').addEventListener('click', () => { pindai(); coba('radar'); });

  // 2. Kabar kilat
  const notif = document.getElementById('notif-kunci'), langkah = document.getElementById('langkah-kunci');
  document.querySelector('[data-wg="notif"]').addEventListener('click', () => {
    langkah.hidden = true; notif.hidden = true; void notif.offsetWidth; notif.hidden = false; coba('notif');
  });
  notif.addEventListener('click', () => { notif.hidden = true; langkah.hidden = false; });

  // 3. Siram jarak jauh
  const wgSiram = document.getElementById('wg-siram'), isiBak = document.getElementById('bak-mini-isi'), teksBak = document.getElementById('bak-mini-teks');
  const tSiram = document.querySelector('[data-wg="siram"]');
  let menyiram = false;
  tSiram.addEventListener('click', () => {
    if (menyiram) return;
    menyiram = true; coba('siram');
    wgSiram.classList.add('menyiram');
    isiBak.style.height = '82%';
    let n = 34; const naik = setInterval(() => { n = Math.min(82, n + 2); teksBak.textContent = `${n}%`; if (n >= 82) clearInterval(naik); }, 2400 / 24);
    if (!GERAK_KURANG) for (let i = 0; i < 8; i++) setTimeout(() => {
      const t = document.createElement('span'); t.className = 'tetes-jatuh';
      t.style.left = `${30 + Math.random() * 40}%`; t.style.top = '10px';
      wgSiram.appendChild(t); setTimeout(() => t.remove(), 1000);
    }, i * 260);
    setTimeout(() => {
      tSiram.querySelector('b').textContent = 'Beres!';
      buka('siram');
      setTimeout(() => {
        wgSiram.classList.remove('menyiram'); isiBak.style.height = '34%'; teksBak.textContent = '34%';
        tSiram.querySelector('b').textContent = 'Siram!'; menyiram = false;
      }, 2600);
    }, 2500);
  });

  // 4. Mata kebun
  const foto = document.getElementById('foto-kamera'), kilat = document.getElementById('kilat-kamera');
  foto.innerHTML = '<span>Siap jepret</span>';
  let jepret = 0;
  document.querySelector('[data-wg="kamera"]').addEventListener('click', () => {
    kilat.classList.remove('nyala'); void kilat.offsetWidth; kilat.classList.add('nyala');
    foto.classList.remove('baru'); void foto.offsetWidth;
    foto.innerHTML = fotoPakcoySVG(jepret++ % 2 === 0); foto.classList.add('baru');
    coba('kamera');
  });

  // 5. Grafik pintar
  const wgGrafik = document.getElementById('wg-grafik');
  const gambarGrafik = (rentang) => {
    const W = 300, H = 170, n = rentang === '24' ? 25 : 8;
    const data = rentang === '24'
      ? Array.from({ length: n }, (_, i) => 6.1 + Math.sin(i / 3) * .12 + Math.cos(i / 1.6) * .05)
      : [6.1, 6.2, 7.1, 6.5, 6.2, 6.1, 6.2, 6.1];
    const y = (v) => 20 + (1 - (v - 5.2) / 2.2) * (H - 40), x = (i) => 16 + i * ((W - 32) / (n - 1));
    const d = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const naik = rentang === '7';
    wgGrafik.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <rect x="0" y="${y(6.8)}" width="${W}" height="${y(5.5) - y(6.8)}" fill="#2E7D32" opacity=".14"/>
      <path class="garis-wg" d="${d}"/>${naik ? `<circle cx="${x(2)}" cy="${y(7.1)}" r="6" fill="#B7791F" stroke="#fff" stroke-width="2"/>` : ''}
      <circle cx="${x(n - 1)}" cy="${y(data[n - 1])}" r="6" fill="#2E7D32" stroke="#fff" stroke-width="2"/></svg>
      <span class="chip-grafik"><i style="background:${naik ? '#B7791F' : '#2E7D32'}"></i>${naik ? 'Sempat naik hari Rabu' : 'Aman seharian'}</span>`;
    const p = wgGrafik.querySelector('.garis-wg'), L = p.getTotalLength();
    if (!GERAK_KURANG) p.animate([{ strokeDasharray: `${L} ${L}`, strokeDashoffset: L }, { strokeDasharray: `${L} ${L}`, strokeDashoffset: 0 }], { duration: 1200, easing: 'cubic-bezier(.3,.7,.3,1)' });
  };
  sekali(wgGrafik, () => gambarGrafik('24'));
  document.querySelectorAll('[data-rentang]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-rentang]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    gambarGrafik(b.dataset.rentang); coba('grafik');
  }));

  // 6. Tumbuh & panen
  const tanaman = document.querySelector('[data-wg="tumbuh"]'), chip = document.getElementById('chip-level');
  let lv = 1;
  const tampilTanaman = () => { tanaman.innerHTML = tanamanWg(lv); chip.textContent = LEVEL[lv - 1]; tanaman.setAttribute('aria-label', `Tanaman tahap ${LEVEL[lv - 1]}. Ketuk supaya tumbuh`); };
  tampilTanaman();
  tanaman.addEventListener('click', () => {
    lv = lv >= 5 ? 1 : lv + 1;
    tampilTanaman();
    tanaman.classList.remove('tumbuh'); void tanaman.offsetWidth; tanaman.classList.add('tumbuh');
    if (lv === 5) { const r = tanaman.getBoundingClientRect(); percikDaun(r.left + r.width / 2, r.top + r.height / 3, 18); }
    coba('tumbuh');
  });
}

/* ------------------------------------------------------------ Pilih pemandu di awal */
let karakterTersimpan = null;
try { const k = localStorage.getItem('agrosync-karakter'); if (k === 'tata' || k === 'ago') karakterTersimpan = k; } catch (_) { /* tidak apa-apa */ }
let bukaPilih = () => {};
function terbangKePemandu(dari, id, lalu) {
  const m = document.getElementById('pemandu-maskot'), cs = getComputedStyle(m);
  const w = parseFloat(cs.width) || 86, h = parseFloat(cs.height) || 104;
  const r = dari.getBoundingClientRect();
  if (GERAK_KURANG || !r.width) { lalu(); return; }
  const el = document.createElement('div');
  el.className = 'maskot-terbang';
  el.style.width = r.width + 'px'; el.style.height = r.height + 'px';
  el.innerHTML = gambarKarakter(id);
  document.body.appendChild(el);
  const tx = innerWidth - 12 - w, ty = innerHeight - 12 - h, sk = w / r.width;
  const tengahX = (r.left + tx) / 2, tengahY = Math.min(r.top, ty) - 80;
  el.animate([
    { transform: `translate(${r.left}px, ${r.top}px) scale(1)` },
    { transform: `translate(${tengahX}px, ${tengahY}px) scale(${(1 + sk) / 2}) rotate(-12deg)`, offset: .45 },
    { transform: `translate(${tx}px, ${ty}px) scale(${sk})` },
  ], { duration: 760, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' }).onfinish = () => { lalu(); requestAnimationFrame(() => el.remove()); };
}
function pasangPilih() {
  const layar = document.getElementById('pilih-layar'), baris = document.getElementById('pilih-kartu-baris');
  const kartu = [...layar.querySelectorAll('[data-pilih]')];
  layar.querySelectorAll('[data-gambar-pilih]').forEach((e) => { e.innerHTML = gambarKarakter(e.dataset.gambarPilih); });
  let asal = null, sibuk = false;
  const kunci = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); lewati(); return; }
    if (e.key !== 'Tab') return;
    const f = [...layar.querySelectorAll('button')], i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  };
  const tutup = (lalu) => {
    const beres = () => {
      layar.hidden = true; layar.classList.remove('keluar'); sibuk = false;
      document.documentElement.classList.remove('kunci-gulir');
      document.removeEventListener('keydown', kunci, true);
      if (asal && asal.isConnected && asal !== document.body) asal.focus({ preventScroll: true });
      if (lalu) lalu();
    };
    if (GERAK_KURANG) return beres();
    layar.classList.add('keluar'); setTimeout(beres, 280);
  };
  const lewati = () => {
    if (sibuk) return;
    tutup(() => { PEMANDU.tampil(false); });
  };
  bukaPilih = (dari) => {
    asal = dari || document.activeElement; sibuk = false;
    baris.classList.remove('sudah'); kartu.forEach((k) => k.classList.remove('dipilih'));
    layar.hidden = false; document.documentElement.classList.add('kunci-gulir');
    document.addEventListener('keydown', kunci, true);
    const aktif = kartu.find((k) => k.dataset.pilih === PEMANDU.karakter) || kartu[0];
    setTimeout(() => aktif.focus({ preventScroll: true }), 80);
  };
  kartu.forEach((k) => k.addEventListener('click', () => {
    if (sibuk) return; sibuk = true;
    const id = k.dataset.pilih;
    k.classList.add('dipilih'); baris.classList.add('sudah');
    try { localStorage.setItem('agrosync-karakter', id); } catch (_) { /* tidak apa-apa */ }
    PEMANDU.setKarakter(id);
    document.getElementById('pemandu').hidden = true;
    setTimeout(() => {
      const gambar = k.querySelector('.pilih-gambar svg');
      terbangKePemandu(gambar, id, () => { PEMANDU.tampil(true); buka('teman'); });
      tutup();
    }, GERAK_KURANG ? 150 : 700);
  }));
  document.getElementById('pilih-lewati').addEventListener('click', lewati);
  layar.addEventListener('click', (e) => { if (e.target === layar) lewati(); });
  document.querySelectorAll('[data-buka-pilih]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); bukaPilih(b.closest('.menu-hp') ? document.getElementById('hamburger') : b); }));
}
/** Dipanggil saat animasi pembuka selesai. */
function awalPilih() {
  if (karakterTersimpan) { PEMANDU.setKarakter(karakterTersimpan); PEMANDU.tampil(false); return; }
  if (scrollY < innerHeight * .6) bukaPilih(null);
  else { PEMANDU.tampil(false); }
}

/* ------------------------------------------------------------ Tema terang / gelap */
function temaEfektif() {
  const t = document.documentElement.dataset.theme;
  return t === 'dark' || t === 'light' ? t : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
function pasangTema() {
  const tombol = document.getElementById('tombol-tema'), saklar = document.querySelector('[data-tema-saklar]');
  const segar = () => {
    const gelap = temaEfektif() === 'dark';
    tombol.setAttribute('aria-label', gelap ? 'Ganti ke mode terang' : 'Ganti ke mode gelap');
    tombol.title = gelap ? 'Mode terang' : 'Mode gelap';
    if (saklar) saklar.setAttribute('aria-checked', String(gelap));
  };
  const ganti = () => {
    const baru = temaEfektif() === 'dark' ? 'light' : 'dark', html = document.documentElement;
    if (!GERAK_KURANG) { html.classList.add('ganti-tema'); setTimeout(() => html.classList.remove('ganti-tema'), 450); }
    html.dataset.theme = baru;
    try { localStorage.setItem('agrosync-tema', baru); } catch (_) { /* tidak apa-apa */ }
    segar();
  };
  tombol.addEventListener('click', ganti);
  if (saklar) saklar.addEventListener('click', ganti);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', segar);
  segar();
}

/* ------------------------------------------------------------ Tanya NPC: obrolan dengan maskot */
const TANYA = [
  { q: 'Aku pemula, bisa?', siapa: 'semanggi', a: 'Bisa banget! Bahasanya sehari-hari, langkahnya satu per satu, dan istilah kayak pH dijelasin singkat.' },
  { q: 'Lagi pergi seharian?', siapa: 'siA', a: 'Tenang, aku yang jaga. Kamu tetap dapat kabar dan bisa nyalain pompa dari mana aja.' },
  { q: 'Isi galon & dirigen apa?', siapa: 'semanggi', a: 'Galon isinya air bersih. Dirigen hijau itu Nutrisi A: kalsium, kalium, dan zat besi. Dirigen merah itu Nutrisi B: fosfat, magnesium, sulfur, dan unsur mikro.' },
  { q: 'Harus buka aplikasi terus?', siapa: 'siA', a: 'Nggak perlu. Aku yang ngabarin kalau ada yang harus diurus.' },
  { q: 'Internet mati gimana?', siapa: 'siA', a: 'Kondisi terakhir tetap kelihatan, lengkap dengan jamnya. Begitu nyambung, langsung update.' },
  { q: 'Bisa lebih dari 1 kebun?', siapa: 'semanggi', a: 'Bisa! Ketuk nama kebun di atas Beranda buat pindah.' },
  { q: 'Demo ini data asli?', siapa: 'semanggi', a: 'Bukan, semuanya contoh. Hitung mundur pompanya juga dipercepat.' },
];
function pasangObrolan() {
  const isi = document.getElementById('obrolan-isi'), pilihan = document.getElementById('obrolan-pilihan');
  const panggung = { semanggi: document.querySelector('.maskot-bicara[data-siapa="semanggi"]'), siA: document.querySelector('.maskot-bicara[data-siapa="siA"]') };
  panggung.semanggi.innerHTML = semanggiSVG('lambai', '', '');
  panggung.siA.innerHTML = siASVG('lambai', '', '');
  const avatar = (siapa) => siapa === 'siA' ? siASVG('lambai', '', '') : semanggiSVG('lambai', '', '');
  const nama = (siapa) => siapa === 'siA' ? 'Ago' : 'Tata';
  const gulir = () => { isi.scrollTop = isi.scrollHeight; };
  const npc = (siapa, teks) => {
    const p = document.createElement('div'); p.className = 'pesan npc';
    p.innerHTML = `<span class="av" aria-hidden="true">${avatar(siapa)}</span><span class="gelembung"><span class="nama">${nama(siapa)}</span><span class="sr-only">${teks}</span><span class="ketik" aria-hidden="true">${teks}</span></span>`;
    isi.appendChild(p); gulir(); return p;
  };
  npc('semanggi', 'Hai! Mau tanya apa?');
  npc('siA', 'Pilih di bawah, kami jawab.');
  const sudah = new Set();
  let sibuk = false;
  const sorot = (siapa) => { for (const [k, el] of Object.entries(panggung)) { el.classList.toggle('bicara', k === siapa); el.classList.toggle('diam', !!siapa && k !== siapa); } };
  pilihan.innerHTML = TANYA.map((t, i) => `<button type="button" data-tanya="${i}">${t.q}</button>`).join('');
  pilihan.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tanya]');
    if (!b || sibuk) return;
    const t = TANYA[+b.dataset.tanya];
    sibuk = true; pilihan.querySelectorAll('button').forEach((x) => { x.disabled = true; });
    const k = document.createElement('div'); k.className = 'pesan kamu';
    k.innerHTML = `<span class="gelembung">${t.q}</span>`;
    isi.appendChild(k); gulir();
    sorot(t.siapa);
    const ketik = document.createElement('div'); ketik.className = 'pesan npc ngetik';
    ketik.innerHTML = `<span class="av" aria-hidden="true">${avatar(t.siapa)}</span><span class="gelembung" aria-hidden="true"><span class="mengetik"><i></i><i></i><i></i></span></span>`;
    setTimeout(() => { isi.appendChild(ketik); gulir(); }, GERAK_KURANG ? 0 : 250);
    setTimeout(() => {
      ketik.remove();
      const p = npc(t.siapa, t.a), sasaran = p.querySelector('.ketik');
      const selesai = () => {
        sorot(null); sibuk = false;
        pilihan.querySelectorAll('button').forEach((x) => { x.disabled = false; });
        b.classList.add('sudah'); sudah.add(b.dataset.tanya);
        if (sudah.size >= 3) buka('kepo');
      };
      if (GERAK_KURANG) return selesai();
      p.classList.add('ngetik');
      let i = 0; sasaran.textContent = '';
      const jalan = setInterval(() => {
        i += 2; sasaran.textContent = t.a.slice(0, i); gulir();
        if (i >= t.a.length) { clearInterval(jalan); p.classList.remove('ngetik'); selesai(); }
      }, 22);
    }, GERAK_KURANG ? 0 : 1050);
  });
}

/* ------------------------------------------------------------ Penampung di kebun: label + kartu isinya */
const WADAH = {
  air: { judul: 'Air Bersih', sub: 'Galon', ikon: 'galon', warna: '#2F7FC1', zat: ['Air bersih'], manfaat: 'Buat nambah air bak yang menyusut, sekaligus bikin pupuk yang terlalu pekat jadi pas lagi.' },
  nutA: { judul: 'Nutrisi A', sub: 'Dirigen, cairan hijau', ikon: 'dirigen', warna: '#2FA24E', zat: ['Kalsium nitrat', 'Kalium nitrat', 'Zat besi (Fe-EDTA / Fe-EDDHA)'], manfaat: 'Memperkuat dinding sel dan membantu pembentukan klorofil, biar daun hijau segar.' },
  nutB: { judul: 'Nutrisi B', sub: 'Dirigen, cairan merah', ikon: 'dirigen', warna: '#D9443B', zat: ['Fosfat (MKP)', 'Kalium', 'Magnesium sulfat', 'Sulfur', 'Mangan', 'Seng', 'Boron', 'Tembaga', 'Molibdenum'], manfaat: 'Sumber energi tanaman dan membantu proses metabolisme.' },
};
function pasangWadah() {
  const info = document.getElementById('info-wadah'), chips = [...document.querySelectorAll('.chip-wadah')];
  const baris = document.getElementById('chip-wadah-baris');
  baris.classList.add('ajak');
  const tutup = () => {
    info.hidden = true; S.wadahDipilih = null; chips.forEach((c) => c.setAttribute('aria-expanded', 'false'));
    if (S.mode3d === 'webgl') { Kebun3D.sorot(null); Kebun3D.setFokus(S.fokus); }
    document.getElementById('penanda-wadah').hidden = true;
  };
  chips.forEach((c) => {
    c.setAttribute('aria-expanded', 'false'); c.setAttribute('aria-controls', 'info-wadah');
    c.addEventListener('click', () => {
      const w = WADAH[c.dataset.wadah];
      if (!info.hidden && info.dataset.wadah === c.dataset.wadah) return tutup();
      info.dataset.wadah = c.dataset.wadah;
      document.getElementById('info-ikon').innerHTML = ikon(w.ikon, '', `style="color:${w.warna}"`);
      document.getElementById('info-wadah-judul').textContent = w.judul;
      document.getElementById('info-wadah-sub').textContent = w.sub;
      document.getElementById('info-zat').innerHTML = w.zat.map((z) => `<span>${z}</span>`).join('');
      document.getElementById('info-manfaat').textContent = w.manfaat;
      info.hidden = false; info.style.animation = 'none'; void info.offsetWidth; info.style.animation = '';
      chips.forEach((x) => x.setAttribute('aria-expanded', String(x === c)));
      baris.classList.remove('ajak'); S.wadahDipilih = c.dataset.wadah;
      if (S.mode3d === 'webgl') { Kebun3D.setFokus(document.getElementById('panel-kebun').clientWidth < 560 ? 'wadahKecil' : 'pompa'); Kebun3D.sorot(c.dataset.wadah); }
      else document.querySelectorAll('[data-datar-wadah]').forEach((g) => g.classList.toggle('disorot', g.dataset.datarWadah === c.dataset.wadah));
    });
  });
  document.getElementById('tutup-info').addEventListener('click', tutup);
}
function posisikanChipWadah() {
  if (S.mode3d !== 'webgl') return;
  const panel = document.getElementById('panel-kebun'), w = panel.clientWidth, h = panel.clientHeight;
  const el = document.getElementById('penanda-wadah');
  const p = S.wadahDipilih ? Kebun3D.proyeksi('puncak-' + S.wadahDipilih) : null;
  if (!p || p.x < 10 || p.x > w - 10 || p.y < 30 || p.y > h) { el.hidden = true; return; }
  el.hidden = false;
  el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px)`;
}

/* ------------------------------------------------------------ Parallax panggung intro */
function pasangParalaks() {
  if (GERAK_KURANG) return;
  const intro = document.getElementById('intro'), lapis = [...intro.querySelectorAll('.lapis')];
  let mx = 0, my = 0, sy = 0, raf = 0;
  const terapkan = () => {
    raf = 0;
    for (const l of lapis) { const d = +l.dataset.d; l.style.transform = `translate(${(mx * d * 26).toFixed(1)}px, ${(my * d * 12 + sy * (1 - d) * .2).toFixed(1)}px)`; }
  };
  const jadwalkan = () => { if (!raf) raf = requestAnimationFrame(terapkan); };
  intro.closest('.hero').addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = intro.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - .5; my = (e.clientY - r.top) / r.height - .5; jadwalkan();
  });
  addEventListener('scroll', () => { const s = Math.min(scrollY, 700); if (s !== sy) { sy = s; jadwalkan(); } }, { passive: true });
}

function pasangGambar() {
  document.querySelectorAll('[data-logo]').forEach((e) => { e.outerHTML = logoSVG('', ''); });
  document.querySelectorAll('[data-logo-kecil]').forEach((e) => { e.innerHTML = logoSVG('', ''); });
  document.querySelectorAll('[data-ikon]').forEach((e) => { e.outerHTML = ikon(e.dataset.ikon); });
  document.querySelectorAll('[data-emoji3d]').forEach((e) => { e.outerHTML = emoji3D(e.dataset.emoji3d); });
  const il = { ph: ilusPH, air: ilusAir, bingung: ilusBingung };
  document.querySelectorAll('[data-ilus]').forEach((e) => { e.innerHTML = il[e.dataset.ilus](); });
  const mk = {
    semanggi: () => semanggiSVG('lambai', '', 'Tata melambai'), siA: () => siASVG('lambai', '', 'Ago melambai'),
    'siA-senang': () => siASVG('senang', '', ''), 'semanggi-angkat': () => semanggiSVG('angkat', '', ''),
  };
  document.querySelectorAll('[data-maskot]').forEach((e) => {
    if (e.tagName === 'BUTTON') e.insertAdjacentHTML('afterbegin', mk[e.dataset.maskot]());
    else e.innerHTML = mk[e.dataset.maskot]();
  });
  document.querySelectorAll('[data-maskot-kecil]').forEach((e) => { e.innerHTML = e.dataset.maskotKecil === 'siA' ? siASVG('lambai', '', '') : semanggiSVG('lambai', '', ''); });
  document.getElementById('intro').innerHTML = heroSVG();
  document.getElementById('pemandu-maskot').innerHTML = pemanduSVG();
}

function adaWebGL() {
  if (typeof THREE === 'undefined') return false;
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (_) { return false; }
}

function mulai() {
  pasangGambar();
  hpBangun(document.getElementById('hp-layar'));

  // Kebun: 3D bila bisa, versi datar bila tidak (atau bila gerakan dikurangi)
  const panel = document.getElementById('panel-kebun'), kanvas = document.getElementById('kanvas');
  let ok3d = !GERAK_KURANG && adaWebGL();
  if (ok3d) ok3d = Kebun3D.init(panel, kanvas);
  if (ok3d) { S.mode3d = 'webgl'; Kebun3D.saatFrame = () => { posisikanLabel(); posisikanChipWadah(); }; }
  else {
    S.mode3d = 'datar';
    kanvas.hidden = true;
    document.getElementById('petunjuk-putar').textContent = GERAK_KURANG ? 'Gerakan dikurangi' : 'Tampilan datar';
    document.getElementById('datar').hidden = false;
  }

  mulaiAdegan(1, false);
  aturTataLetak();
  pasangIntro();
  pasangMuncul();
  pasangSehari();
  pasangMaskot();
  pasangPemandu();
  pasangBos();
  pasangPowerUp();
  pasangPilih();
  pasangTema();
  pasangHadiah();
  pasangPenunjuk();
  if (karakterTersimpan) PEMANDU.setKarakter(karakterTersimpan);
  pasangObrolan();
  pasangWadah();
  pasangParalaks();
  setTimeout(awalPilih, GERAK_KURANG ? 500 : T_INTRO + 250);

  // Tema berubah (sistem atau tombol tema viewer)
  const temaBerubah = () => { if (S.mode3d === 'webgl') Kebun3D.aturTema(); segarkan(); };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', temaBerubah);
  new MutationObserver(temaBerubah).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  let tunda;
  addEventListener('resize', () => { clearTimeout(tunda); tunda = setTimeout(aturTataLetak, 120); });
  setInterval(segarkan, 15000);

  // Tombol halaman
  document.getElementById('stepper').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { hentikanPutar(); mulaiAdegan(+b.dataset.adegan); } });
  document.getElementById('pj-panduan').addEventListener('click', () => {
    S.panduan = !S.panduan;
    try { localStorage.setItem('agrosync-panduan', S.panduan ? 'nyala' : 'mati'); } catch (_) { /* tidak apa-apa */ }
    narasi(S.panduan ? 'Panduan dinyalakan lagi.' : 'Tutorial dilewati. Coba pencet apa aja di handphone.');
    segarkan();
  });
  document.getElementById('pj-ulang').addEventListener('click', () => { hentikanPutar(); mulaiAdegan(S.adegan); });
  document.getElementById('pj-aksi').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'btn-simulasi') return kirim('simulasi');
    if (b.dataset.aksi === 'lanjut') mulaiAdegan(S.adegan + 1);
    if (b.dataset.aksi === 'ulang-demo') { S.selesai.clear(); mulaiAdegan(1); }
    if (b.dataset.aksi === 'tampil-hp') { S.pov = 'keduanya'; aturTataLetak(); }
  });
  document.getElementById('putar').addEventListener('click', () => { if (document.getElementById('putar').getAttribute('aria-pressed') === 'true') hentikanPutar(); else putarOtomatis(); });
  document.querySelectorAll('.pov-toggle button').forEach((b) => b.addEventListener('click', () => { S.pov = b.dataset.pov; aturTataLetak(); }));
  document.getElementById('saklar-pip').addEventListener('click', () => { S.pip = !S.pip; aturTataLetak(); });
  document.getElementById('perbesar-hp').addEventListener('click', () => { S.pov = 'keduanya'; S.pip = false; aturTataLetak(); });
  document.querySelectorAll('[data-ulang-demo]').forEach((a) => a.addEventListener('click', () => { S.selesai.clear(); mulaiAdegan(1); }));
  document.querySelectorAll('.tombol-goyang').forEach((b) => b.addEventListener('click', () => { const r = b.getBoundingClientRect(); percikDaun(r.left + r.width / 2, r.top + r.height / 2); }));
  // Sentuhan pengguna menghentikan putar otomatis
  const henti = (e) => { if (!e.isTrusted || document.getElementById('putar').getAttribute('aria-pressed') !== 'true') return; if (e.target.closest && e.target.closest('#putar')) return; hentikanPutar(); };
  document.addEventListener('pointerdown', henti, true);
  document.addEventListener('keydown', henti, true);

  // Menu di layar sempit
  const hb = document.getElementById('hamburger'), menu = document.getElementById('menu-hp');
  hb.addEventListener('click', () => { const buka = menu.hidden; menu.hidden = !buka; hb.setAttribute('aria-expanded', String(buka)); hb.setAttribute('aria-label', buka ? 'Tutup menu' : 'Buka menu'); hb.innerHTML = ikon(buka ? 'silang' : 'menu'); });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) { menu.hidden = true; hb.setAttribute('aria-expanded', 'false'); hb.innerHTML = ikon('menu'); } });
}
mulai();
