/* ============================================================ Hadiah
   7 misi. Tiap misi beres: pot mini di navbar tumbuh satu tahap, pemandu dapat satu aksesori,
   dan beberapa stiker WhatsApp terbuka (karakter pilihanmu dulu, lalu karakter satunya, lalu berdua). */
const MISI = [
  { id: 'teman', nama: 'Kenalan sama pemandu', aks: 'caping', ke: 'pilih' },
  { id: 'bos', nama: 'Cek 3 masalah umum', aks: 'kacamata', ke: 'masalah' },
  { id: 'siram', nama: 'Siram dari jauh di demo', aks: 'gembor', ke: 'demo' },
  { id: 'tutorial', nama: 'Selesaikan demo 5 langkah', aks: 'bot', ke: 'demo' },
  { id: 'kolektor', nama: 'Coba semua fitur', aks: 'syal', ke: 'fitur' },
  { id: 'harian', nama: 'Ketuk 4 momen di Sehari bareng AgroSync', aks: 'bunga', ke: 'sehari' },
  { id: 'kepo', nama: 'Tanya 3 hal ke Tata & Ago', aks: 'medali', ke: 'faq' },
];
const AKSESORI = { caping: 'Topi caping', kacamata: 'Kacamata hitam', gembor: 'Gembor mini', bot: 'Sepatu bot', syal: 'Bandana', bunga: 'Bunga', medali: 'Medali bintang' };
const JATAH_STIKER = [4, 3, 3, 5, 5, 5, 5];
const KUNCI_HADIAH = 'agrosync-hadiah';
const HADIAH = { misi: [], stiker: [], lepas: [], baru: [] };
try {
  const d = JSON.parse(localStorage.getItem(KUNCI_HADIAH) || 'null');
  if (d && Array.isArray(d.misi)) for (const k of Object.keys(HADIAH)) if (Array.isArray(d[k])) HADIAH[k] = d[k].filter((v) => typeof v === 'string');
  HADIAH.misi = HADIAH.misi.filter((id) => MISI.some((m) => m.id === id));
} catch (_) { /* tidak apa-apa */ }
function simpanHadiah() { try { localStorage.setItem(KUNCI_HADIAH, JSON.stringify(HADIAH)); } catch (_) { /* tidak apa-apa */ } }
function aksesoriAktif() {
  const dapat = MISI.filter((m) => HADIAH.misi.includes(m.id)).map((m) => m.aks);
  const pakai = dapat.filter((a) => !HADIAH.lepas.includes(a));
  if (dapat.length === MISI.length && pakai.length === MISI.length) pakai.push('gaya');
  return pakai;
}

/* ------------------------------------------------------------ Pot mini: 8 tahap gambar, dipetakan dari jumlah misi beres */
const tahapPot = () => Math.round(HADIAH.misi.length * 7 / MISI.length);
function potSVG(t, cls = '') {
  const n = [0, 2, 2, 4, 5, 7, 9, 9][t], sk = [0, .34, .5, .62, .74, .86, 1, 1.04][t];
  let tanaman = '';
  if (t === 0) tanaman = '<ellipse cx="0" cy="-4.4" rx="3.2" ry="2.2" fill="#8B5E3C"/><path d="M-1 -5.6q1 -1 2 0" stroke="#B5835A" stroke-width=".8" fill="none"/>';
  else if (t <= 2) {
    const h = t === 1 ? 8 : 13;
    tanaman = `<path d="M0 -3V${-3 - h}" stroke="#3E9A3A" stroke-width="2" stroke-linecap="round"/><path d="M0 ${-1 - h}Q${-7 * sk * 2} ${-6 - h} ${-9 * sk * 2} ${-h + 1}Q${-4 * sk * 2} ${1 - h} 0 ${-1 - h}Z" fill="#5DBB46"/><path d="M0 ${-3 - h}Q${7 * sk * 2} ${-9 - h} ${9 * sk * 2} ${-2 - h}Q${4 * sk * 2} ${-h} 0 ${-3 - h}Z" fill="#6CC04A"/>`;
  } else {
    let daun = '';
    for (let i = 0; i < n; i++) { const a = -72 + i * (144 / (n - 1)); daun += `<ellipse cx="0" cy="-13" rx="5.4" ry="13" transform="rotate(${a.toFixed(1)})" fill="${i % 2 ? '#3E9A3A' : '#5DBB46'}"/>`; }
    tanaman = `<g transform="translate(0 -3) scale(${sk})">${daun}<ellipse cx="0" cy="-4" rx="5" ry="7" fill="#A5DC74"/></g>`;
  }
  const kilau = t === 7 ? `${BENDA.kilau(-17, -30, .42)}${BENDA.kilau(18, -36, .36)}<g transform="translate(13 -27)">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-2.6" rx="1.8" ry="2.6" fill="#FFFFFF" transform="rotate(${a})"/>`).join('')}<circle r="1.7" fill="#F5B82E"/></g>` : '';
  return `<svg class="${cls}" viewBox="-26 -44 52 60" aria-hidden="true" focusable="false">${tanaman}<path d="M-14 0H14L11.5 14H-11.5Z" fill="#E07A4F"/><path d="M-9 4.5H9" stroke="#F09A72" stroke-width="1.4" stroke-linecap="round" opacity=".7"/><rect x="-16" y="-4.5" width="32" height="6" rx="3" fill="#C9653C"/><ellipse cx="0" cy="-4" rx="13" ry="1.6" fill="#6B4A2F"/>${kilau}</svg>`;
}

/* ------------------------------------------------------------ 30 stiker (kanvas 512 x 512) */
const stTata = (o, cx = 256, cy = 228, s = 3.3, cermin = false, rot = 0) => `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${cermin ? -s : s} ${s}) translate(-60 -70)">${tataIsi(o)}</g>`;
const stAgo = (o, cx = 256, cy = 232, s = 3.3, cermin = false, rot = 0) => `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${cermin ? -s : s} ${s}) translate(-58 -72)">${agoIsi(o)}</g>`;
const duoT = (o, cx = 158, cy = 240, s = 2.3, cermin = false) => stTata(o, cx, cy, s, cermin);
const duoA = (o, cx = 360, cy = 244, s = 2.3, cermin = false) => stAgo(o, cx, cy, s, cermin);
const B = BENDA;
const STIKER = [
  { id: 'tata-01', k: 'tata', teks: 'Hai!', seni: () => stTata({ tangan: 'lambai', mulut: 'buka' }) + B.kilau(108, 118, 2.2) + B.kilau(408, 142, 1.6) },
  { id: 'tata-02', k: 'tata', teks: 'Makasih!', seni: () => stTata({ tangan: 'depan', kaki: 'diam', mata: 'senang', mulut: 'kecil', pipi: 'merah', pegang: 'hati' }) + B.hati(410, 106, 2.3) + B.hati(96, 150, 1.5) },
  { id: 'tata-03', k: 'tata', teks: 'Semangat!', seni: () => stTata({ tangan: 'naik', kaki: 'lompat', mata: 'bintang', mulut: 'tawa' }, 256, 240) + B.kilau(84, 104, 2.4) + B.kilau(430, 112, 2) + B.konfeti(256, 52, 3) },
  { id: 'tata-04', k: 'tata', teks: 'Wkwkwk', seni: () => stTata({ tangan: 'lambai', kaki: 'diam', mata: 'tawa', mulut: 'tawa', pipi: 'merah' }, 256, 230, 3.3, false, -7) + B.keringat(408, 138, 2.6) + B.semburat(106, 120, 1.6) },
  { id: 'tata-05', k: 'tata', teks: 'Sabar ya', seni: () => stTata({ tangan: 'depan', kaki: 'diam', mata: 'tutup', mulut: 'kecil', pegang: 'tunas' }) + B.kilau(410, 116, 1.6) + B.daun(104, 136, 2.2, -25) },
  { id: 'tata-06', k: 'tata', teks: 'OTW!', seni: () => stTata({ tangan: 'lambai', kaki: 'jalan', mulut: 'buka' }, 286, 228, 3.2) + B.garis(122, 186, 2.6) + B.garis(104, 290, 2.2) },
  { id: 'tata-07', k: 'tata', teks: 'Met bobo', seni: () => stTata({ tangan: 'diam', kaki: 'diam', mata: 'tutup', mulut: 'o' }) + B.zzz(372, 108, 2.6) + B.bulan(104, 104, 1.6) },
  { id: 'tata-08', k: 'tata', teks: 'Lagi nyiram', seni: () => stTata({ tangan: 'depan', kaki: 'diam', mata: 'senang', mulut: 'buka', pegang: 'gembor' }, 228) + B.tunas(432, 362, 3) },
  { id: 'tata-09', k: 'tata', teks: 'Gemes!', seni: () => stTata({ tangan: 'depan', kaki: 'diam', mata: 'hati', mulut: 'w', pipi: 'merah' }) + B.hati(92, 118, 2) + B.hati(418, 98, 2.5) + B.hati(442, 190, 1.4) },
  { id: 'tata-10', k: 'tata', teks: 'Panen!', seni: () => stTata({ tangan: 'naik', kaki: 'lompat', mata: 'senang', mulut: 'tawa', selada: true }, 256, 262, 2.8) + B.konfeti(100, 170, 3) + B.konfeti(414, 186, 3) },

  { id: 'ago-01', k: 'ago', teks: 'Halo!', seni: () => stAgo({ lengan: 'lambai' }) + B.kilau(104, 118, 2.2) + B.kilau(440, 330, 1.4) },
  { id: 'ago-02', k: 'ago', teks: 'Siap!', seni: () => stAgo({ lengan: 'jempol', mata: 'kedip', mulut: 'buka' }, 240) + B.kilau(438, 116, 2) },
  { id: 'ago-03', k: 'ago', teks: 'Aman!', seni: () => stAgo({ lengan: 'jempol', mulut: 'kecil', aks: ['kacamata'] }, 240) + B.kilau(96, 112, 2.2) + B.kilau(440, 120, 1.5) },
  { id: 'ago-04', k: 'ago', teks: 'Hmm...', seni: () => stAgo({ lengan: 'dagu', mata: 'setengah', mulut: 'datar', gelembung: 'tanya' }, 246, 258, 3.1) },
  { id: 'ago-05', k: 'ago', teks: 'Waduh!', seni: () => stAgo({ lengan: 'naik', mata: 'kaget', mulut: 'o', gelembung: 'seru' }, 250, 262, 3.0) + B.keringat(96, 168, 2.6) },
  { id: 'ago-06', k: 'ago', teks: 'Oke deh', seni: () => stAgo({ lengan: 'jempol', mata: 'senang' }, 240) + B.kilau(100, 120, 1.8) },
  { id: 'ago-07', k: 'ago', teks: 'Maaf ya', seni: () => stAgo({ lengan: 'turun', mata: 'sedih', mulut: 'sedih' }) + B.keringat(400, 118, 2.4) },
  { id: 'ago-08', k: 'ago', teks: 'Kangen', seni: () => stAgo({ lengan: 'peluk', mata: 'tutup', mulut: 'kecil', pipi: 'merah', pegang: 'hati' }) + B.hati(414, 110, 1.9) + B.hati(98, 140, 1.3) },
  { id: 'ago-09', k: 'ago', teks: 'Ngopi dulu', seni: () => stAgo({ lengan: 'peluk', mata: 'setengah', mulut: 'kecil', pegang: 'kopi' }) + B.daun(104, 130, 2, 20) },
  { id: 'ago-10', k: 'ago', teks: 'Mantap!', seni: () => stAgo({ lengan: 'naik', mata: 'bintang', mulut: 'tawa' }, 256, 244) + B.kilau(84, 100, 2.4) + B.kilau(432, 104, 2) + B.konfeti(256, 52, 3) },

  { id: 'duo-01', k: 'duo', teks: 'Halo dari kebun!', seni: () => duoT({ tangan: 'lambai', mulut: 'buka' }) + duoA({ lengan: 'lambai' }) + B.daun(250, 96, 2.2, 15) + B.daun(296, 74, 1.6, -30) },
  { id: 'duo-02', k: 'duo', teks: 'Tos!', seni: () => duoT({ tangan: 'tos', mata: 'senang', mulut: 'buka' }, 148) + duoA({ lengan: 'tos', mata: 'senang', mulut: 'buka' }, 372, 246, 2.3, true) + B.semburat(252, 128, 2.6) },
  { id: 'duo-03', k: 'duo', teks: 'Bareng yuk!', seni: () => duoT({ tangan: 'lambai', mata: 'senang', mulut: 'buka' }) + duoA({ lengan: 'jempol', mata: 'kedip' }) + B.kilau(256, 92, 1.8) },
  { id: 'duo-04', k: 'duo', teks: 'Selamat pagi!', seni: () => B.matahari(256, 92, 1.5) + duoT({ tangan: 'naik', kaki: 'diam', mata: 'senang', mulut: 'buka' }, 156, 262) + duoA({ lengan: 'naik', mata: 'senang', mulut: 'buka' }, 362, 266) },
  { id: 'duo-05', k: 'duo', teks: 'Makasih banyak!', seni: () => duoT({ tangan: 'depan', kaki: 'diam', mata: 'senang', mulut: 'kecil', pipi: 'merah', pegang: 'hati' }) + duoA({ lengan: 'peluk', mata: 'senang', mulut: 'kecil', pipi: 'merah', pegang: 'hati' }) + B.hati(256, 92, 1.8) },
  { id: 'duo-06', k: 'duo', teks: 'Panen bareng!', seni: () => duoT({ tangan: 'naik', kaki: 'lompat', mata: 'senang', mulut: 'tawa', selada: true }, 156, 268, 2.15) + duoA({ lengan: 'naik', mata: 'senang', mulut: 'tawa' }, 362, 262) + B.konfeti(262, 110, 3) },
  { id: 'duo-07', k: 'duo', teks: 'Hehe', seni: () => duoT({ tangan: 'lambai', mata: 'tutup', mulut: 'w', pipi: 'merah' }) + duoA({ lengan: 'turun', mata: 'tutup', mulut: 'kecil', pipi: 'merah' }) },
  { id: 'duo-08', k: 'duo', teks: 'Semangat ya!', seni: () => duoT({ tangan: 'naik', kaki: 'lompat', mata: 'bintang', mulut: 'tawa' }, 156, 250) + duoA({ lengan: 'naik', mata: 'bintang', mulut: 'tawa' }, 362, 252) + B.kilau(258, 96, 2.4) },
  { id: 'duo-09', k: 'duo', teks: 'Met malam', seni: () => B.bulan(256, 92, 1.7) + B.kilau(196, 72, 1) + B.kilau(318, 110, .8) + duoT({ tangan: 'diam', kaki: 'diam', mata: 'tutup', mulut: 'kecil' }) + duoA({ lengan: 'turun', mata: 'tutup', mulut: 'kecil' }) + B.zzz(438, 130, 1.7) },
  { id: 'duo-10', k: 'duo', teks: 'Kebun aman!', seni: () => duoT({ tangan: 'depan', kaki: 'diam', mata: 'senang', mulut: 'buka', pegang: 'gembor' }) + duoA({ lengan: 'jempol', aks: ['kacamata'] }) },
];
const NAMA_GRUP = { tata: 'Tata', ago: 'Ago', duo: 'Tata & Ago' };
function urutanStiker() {
  const p = PEMANDU.karakter === 'ago' ? 'ago' : 'tata', lain = p === 'ago' ? 'tata' : 'ago';
  return [...STIKER.filter((s) => s.k === p), ...STIKER.filter((s) => s.k === lain), ...STIKER.filter((s) => s.k === 'duo')];
}

/* Menggambar stiker ke kanvas: garis tepi putih ala stiker WhatsApp, lalu tulisan. */
const CACHE_STIKER = new Map();
let fontStikerSiap = null;
function siapkanFontStiker() {
  if (!fontStikerSiap) fontStikerSiap = (document.fonts && document.fonts.load ? document.fonts.load('700 60px Fredoka').catch(() => null) : Promise.resolve()).then(() => null);
  return fontStikerSiap;
}
async function gambarStiker(st) {
  if (CACHE_STIKER.has(st.id)) return CACHE_STIKER.get(st.id);
  await siapkanFontStiker();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${st.seni()}</svg>`;
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const U = 512, c = document.createElement('canvas'); c.width = c.height = U;
  const g = c.getContext('2d');
  const t = document.createElement('canvas'); t.width = t.height = U;
  const tg = t.getContext('2d'), R = 11;
  for (let a = 0; a < 360; a += 15) tg.drawImage(img, Math.cos(a * Math.PI / 180) * R, Math.sin(a * Math.PI / 180) * R, U, U);
  tg.globalCompositeOperation = 'source-in'; tg.fillStyle = '#fff'; tg.fillRect(0, 0, U, U);
  g.save(); g.shadowColor = 'rgba(0,0,0,.2)'; g.shadowBlur = 8; g.shadowOffsetY = 3; g.drawImage(t, 0, 0); g.restore();
  g.drawImage(img, 0, 0, U, U);
  if (st.teks) {
    let uk = 64;
    const huruf = (u) => `700 ${u}px Fredoka, Poppins, "Arial Rounded MT Bold", sans-serif`;
    g.font = huruf(uk);
    while (g.measureText(st.teks).width > 440 && uk > 34) { uk -= 2; g.font = huruf(uk); }
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round';
    const y = 476;
    g.save(); g.shadowColor = 'rgba(0,0,0,.2)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
    g.strokeStyle = '#fff'; g.lineWidth = 20; g.strokeText(st.teks, 256, y); g.restore();
    g.fillStyle = '#0B5A32'; g.fillText(st.teks, 256, y);
  }
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
  const hasil = { blob, url: URL.createObjectURL(blob) };
  CACHE_STIKER.set(st.id, hasil);
  return hasil;
}
const namaBerkas = (st) => `agrosync-stiker-${st.id}-${st.teks.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`;

/* ZIP sederhana (tanpa kompresi; PNG sudah terkompres). */
const TABEL_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = TABEL_CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function buatZip(berkas) {
  const enc = new TextEncoder(), bagian = [], pusat = [];
  let posisi = 0;
  for (const f of berkas) {
    const nama = enc.encode(f.nama), crc = crc32(f.data), n = f.data.length;
    const lokal = new DataView(new ArrayBuffer(30));
    lokal.setUint32(0, 0x04034b50, true); lokal.setUint16(4, 20, true); lokal.setUint16(6, 0x0800, true); lokal.setUint16(8, 0, true);
    lokal.setUint16(10, 0, true); lokal.setUint16(12, 0x21, true); lokal.setUint32(14, crc, true); lokal.setUint32(18, n, true); lokal.setUint32(22, n, true);
    lokal.setUint16(26, nama.length, true); lokal.setUint16(28, 0, true);
    bagian.push(new Uint8Array(lokal.buffer), nama, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, 0, true); c.setUint16(14, 0x21, true); c.setUint32(16, crc, true); c.setUint32(20, n, true); c.setUint32(24, n, true);
    c.setUint16(28, nama.length, true); c.setUint32(42, posisi, true);
    pusat.push(new Uint8Array(c.buffer), nama);
    posisi += 30 + nama.length + n;
  }
  const besarPusat = pusat.reduce((a, b) => a + b.length, 0);
  const akhir = new DataView(new ArrayBuffer(22));
  akhir.setUint32(0, 0x06054b50, true); akhir.setUint16(8, berkas.length, true); akhir.setUint16(10, berkas.length, true);
  akhir.setUint32(12, besarPusat, true); akhir.setUint32(16, posisi, true);
  return new Blob([...bagian, ...pusat, new Uint8Array(akhir.buffer)], { type: 'application/zip' });
}

/* Menyimpan berkas: lewat kemampuan unduhan claude.ai bila ada, selain itu tautan unduhan biasa. */
let layananUnduh;
const siapUnduh = (window.claude && typeof window.claude.use === 'function')
  ? window.claude.use('downloads').then((d) => { layananUnduh = d; }).catch(() => { layananUnduh = null; })
  : Promise.resolve();
async function simpanBerkas(nama, blob) {
  if (layananUnduh === undefined && window.claude) await Promise.race([siapUnduh, new Promise((r) => setTimeout(r, 1500))]);
  if (layananUnduh) {
    try { await layananUnduh.save({ filename: nama, data: blob }); return 'tersimpan'; } catch (e) {
      const k = e && e.code;
      if (k === 'declined') return 'batal';
      if (k === 'rate_limited') return 'tunggu';
      if (k === 'host_unavailable') return 'host';
      return 'gagal';
    }
  }
  if (window.claude) return 'tidak-ada';
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'tersimpan';
}
const PESAN_SIMPAN = {
  tersimpan: 'Tersimpan!', batal: 'Batal disimpan.', tunggu: 'Tunggu sebentar, lalu coba lagi.',
  host: 'Aplikasi ini belum bisa menyimpan berkas. Buka halaman ini di browser, ya.', gagal: 'Gagal menyimpan. Coba lagi, ya.',
  'tidak-ada': 'Unduhan belum tersedia di tampilan ini.',
};

/* ------------------------------------------------------------ Misi beres */
const antreHadiah = [];
function buka(id) {
  const m = MISI.find((x) => x.id === id);
  if (!m || HADIAH.misi.includes(id)) return;
  const jatah = JATAH_STIKER[HADIAH.misi.length] || 0;
  HADIAH.misi.push(id);
  const baru = urutanStiker().filter((s) => !HADIAH.stiker.includes(s.id)).slice(0, jatah).map((s) => s.id);
  HADIAH.stiker.push(...baru); HADIAH.baru.push(...baru);
  simpanHadiah();
  perbaruiPot(true);
  PEMANDU.segarkan(true);
  const lengkap = HADIAH.misi.length === MISI.length;
  const nama = AKSESORI[m.aks];
  const kata = PEMANDU.karakter === 'ago'
    ? (lengkap ? 'Lengkap. Sekarang aku petani paling gaya.' : `${nama} baru. Makasih, ya.`)
    : (lengkap ? 'Lengkap! Aku jadi petani paling gaya!' : `Yeay, ${nama.toLowerCase()} baru! Cocok nggak?`);
  setTimeout(() => PEMANDU.bicara(kata), id === 'teman' ? 2800 : 400);
  antreHadiah.push({ m, jumlah: baru.length });
  if (antreHadiah.length === 1) tampilkanHadiah();
  if (!document.getElementById('hadiah-layar').hidden) isiPanelHadiah();
}
function tampilkanHadiah() {
  const h = antreHadiah[0];
  if (!h) return;
  const el = document.getElementById('pencapaian');
  document.getElementById('pencapaian-ikon').innerHTML = ikonAksesori(h.m.aks);
  document.getElementById('pencapaian-nama').textContent = h.m.nama;
  document.getElementById('pencapaian-hadiah').textContent = `${AKSESORI[h.m.aks]}${h.jumlah ? ` + ${h.jumlah} stiker` : ''}`;
  el.hidden = false; el.classList.remove('keluar'); void el.offsetWidth; el.classList.add('masuk');
  const r = document.getElementById('pencapaian-ikon').getBoundingClientRect();
  percikDaun(r.left + r.width / 2, r.top + r.height / 2, 12);
  let sisa = 4200, mulaiT = Date.now(), t = 0;
  const lanjut = () => { t = setTimeout(() => {
    el.classList.add('keluar');
    setTimeout(() => { el.hidden = true; el.classList.remove('masuk', 'keluar'); antreHadiah.shift(); if (antreHadiah.length) tampilkanHadiah(); }, 360);
  }, sisa); mulaiT = Date.now(); };
  el.onmouseenter = el.onfocusin = () => { clearTimeout(t); sisa = Math.max(1200, sisa - (Date.now() - mulaiT)); };
  el.onmouseleave = el.onfocusout = () => { clearTimeout(t); lanjut(); };
  lanjut();
}
function ikonAksesori(a) { return emoji3D(a); }

/* ------------------------------------------------------------ Pot di navbar */
function perbaruiPot(tumbuh) {
  const t = HADIAH.misi.length, tombol = document.getElementById('pot-nav');
  document.getElementById('pot-gambar').innerHTML = potSVG(tahapPot());
  document.getElementById('titik-baru').hidden = !HADIAH.baru.length;
  tombol.setAttribute('aria-label', `Hadiahmu: ${t} dari ${MISI.length} misi beres, ${HADIAH.stiker.length} stiker terbuka`);
  if (tumbuh && !GERAK_KURANG) {
    tombol.classList.remove('tumbuh'); void tombol.offsetWidth; tombol.classList.add('tumbuh');
    const r = tombol.getBoundingClientRect();
    if (r.width) percikDaun(r.left + r.width / 2, r.top + r.height / 2, 10);
  }
}

/* ------------------------------------------------------------ Panel hadiah */
let filterStiker = 'semua', urutPratinjau = [], idxPratinjau = 0;
function isiPanelHadiah() {
  const t = HADIAH.misi.length;
  document.getElementById('pot-besar').innerHTML = potSVG(tahapPot());
  document.getElementById('pot-teks').textContent = t === MISI.length ? 'Siap panen! Semua misi beres.' : t === 0 ? 'Masih biji. Beresin misi biar tumbuh.' : 'Kebun mini tumbuh tiap misi beres.';
  const aks = aksesoriAktif(), p = PEMANDU.karakter;
  document.getElementById('lemari-maskot').innerHTML = p === 'ago' ? siASVG(aks.includes('gaya') ? 'senang' : 'lambai', '', `Ago memakai ${aks.length} aksesori`, aks) : semanggiSVG(aks.includes('gaya') ? 'lompat' : 'lambai', '', `Tata memakai ${aks.length} aksesori`, aks);
  document.getElementById('lemari-judul').textContent = `Lemari ${NAMA_KARAKTER[p]}`;
  document.getElementById('lemari-aks').innerHTML = MISI.map((m) => {
    const punya = HADIAH.misi.includes(m.id), pakai = punya && !HADIAH.lepas.includes(m.aks);
    return punya
      ? `<button type="button" class="chip-aks" data-aks="${m.aks}" aria-pressed="${pakai}" title="${pakai ? 'Lepas' : 'Pakai'} ${AKSESORI[m.aks]}"><span class="chip-aks-ikon">${ikonAksesori(m.aks)}</span>${AKSESORI[m.aks]}</button>`
      : `<span class="chip-aks terkunci" title="Beresin misi: ${m.nama}"><span class="chip-aks-ikon">${emoji3D('kunci')}</span>???</span>`;
  }).join('');
  document.getElementById('daftar-misi').innerHTML = MISI.map((m) => {
    const beres = HADIAH.misi.includes(m.id);
    return `<li class="${beres ? 'beres' : ''}"><span class="cek-misi">${beres ? emoji3D('centang') : ''}</span><span class="isi-misi"><b>${m.nama}</b><small>${emoji3D(m.aks)}${AKSESORI[m.aks]}</small></span>${beres ? '<span class="label-beres">Beres</span>' : `<button type="button" class="ke-misi" data-ke="${m.ke}">Ke sana</button>`}</li>`;
  }).join('');
  isiGridStiker();
}
function isiGridStiker() {
  const grid = document.getElementById('grid-stiker');
  const daftar = STIKER.filter((s) => filterStiker === 'semua' || s.k === filterStiker);
  const terbuka = HADIAH.stiker;
  document.getElementById('jumlah-stiker').textContent = `${terbuka.length} dari ${STIKER.length} terbuka`;
  document.getElementById('unduh-semua').disabled = !terbuka.length;
  grid.innerHTML = daftar.map((s) => terbuka.includes(s.id)
    ? `<button type="button" class="sel-stiker" data-stiker="${s.id}" aria-label="Stiker ${NAMA_GRUP[s.k]}: ${s.teks}. Ketuk untuk lihat dan unduh"><img alt="" data-isi="${s.id}">${HADIAH.baru.includes(s.id) ? '<span class="label-baru">Baru</span>' : ''}</button>`
    : `<span class="sel-stiker terkunci" aria-label="Stiker terkunci"><svg viewBox="0 0 512 512" aria-hidden="true" focusable="false">${s.seni()}</svg><span class="gembok">${emoji3D('kunci')}</span></span>`).join('');
  (async () => {
    for (const img of grid.querySelectorAll('img[data-isi]')) {
      const st = STIKER.find((x) => x.id === img.dataset.isi);
      try { const h = await gambarStiker(st); if (img.isConnected) img.src = h.url; } catch (_) { /* gambar gagal dibuat */ }
    }
  })();
}
function pasangHadiah() {
  const layar = document.getElementById('hadiah-layar'), tombol = document.getElementById('pot-nav');
  const status = document.getElementById('status-unduh');
  let asal = null, tStatus = 0, asalPratinjau = null;
  const pr = document.getElementById('pratinjau-stiker');
  function tutupPratinjau(diam) {
    if (pr.hidden) return;
    pr.hidden = true;
    if (!diam && asalPratinjau && asalPratinjau.isConnected) asalPratinjau.focus({ preventScroll: true });
  }
  const kabar = (teks) => { status.textContent = teks; clearTimeout(tStatus); tStatus = setTimeout(() => { status.textContent = ''; }, 4000); };
  const kunci = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); if (!document.getElementById('pratinjau-stiker').hidden) tutupPratinjau(); else tutup(); return; }
    if (e.key !== 'Tab') return;
    const f = [...layar.querySelectorAll('button:not([disabled]), [tabindex="0"]')].filter((x) => x.offsetParent !== null), i = f.indexOf(document.activeElement);
    if (!f.length) return;
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  };
  const bukaPanel = (dari) => {
    asal = dari || document.activeElement;
    isiPanelHadiah();
    layar.hidden = false; document.documentElement.classList.add('kunci-gulir');
    document.addEventListener('keydown', kunci, true);
    setTimeout(() => document.getElementById('hadiah-tutup').focus({ preventScroll: true }), 60);
  };
  const tutup = (lalu) => {
    tutupPratinjau(true);
    layar.hidden = true; document.documentElement.classList.remove('kunci-gulir');
    document.removeEventListener('keydown', kunci, true);
    if (HADIAH.baru.length) { HADIAH.baru = []; simpanHadiah(); perbaruiPot(false); }
    if (typeof lalu === 'function') lalu();
    else if (asal && asal.isConnected) asal.focus({ preventScroll: true });
  };
  tombol.addEventListener('click', () => bukaPanel(tombol));
  document.getElementById('pencapaian-lihat').addEventListener('click', () => bukaPanel(tombol));
  document.getElementById('hadiah-tutup').addEventListener('click', () => tutup());
  layar.addEventListener('click', (e) => { if (e.target === layar) tutup(); });
  // Pakai / lepas aksesori
  document.getElementById('lemari-aks').addEventListener('click', (e) => {
    const b = e.target.closest('[data-aks]'); if (!b) return;
    const a = b.dataset.aks;
    HADIAH.lepas = HADIAH.lepas.includes(a) ? HADIAH.lepas.filter((x) => x !== a) : [...HADIAH.lepas, a];
    simpanHadiah(); PEMANDU.segarkan(false); isiPanelHadiah();
    const baru = document.querySelector(`#lemari-aks [data-aks="${a}"]`); if (baru) baru.focus({ preventScroll: true });
  });
  // Ke misi
  document.getElementById('daftar-misi').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ke]'); if (!b) return;
    const ke = b.dataset.ke;
    tutup(() => {
      if (ke === 'pilih') { bukaPilih(tombol); return; }
      const el = document.getElementById(ke);
      if (el) el.scrollIntoView({ behavior: GERAK_KURANG ? 'auto' : 'smooth', block: 'start' });
    });
  });
  // Filter stiker
  document.querySelectorAll('[data-filter-stiker]').forEach((b) => b.addEventListener('click', () => {
    filterStiker = b.dataset.filterStiker;
    document.querySelectorAll('[data-filter-stiker]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    isiGridStiker();
  }));
  // Pratinjau dan unduh satu stiker
  const tampilPratinjau = async () => {
    const st = STIKER.find((x) => x.id === urutPratinjau[idxPratinjau]);
    document.getElementById('pratinjau-teks').textContent = `${NAMA_GRUP[st.k]} · “${st.teks}”`;
    const img = document.getElementById('pratinjau-gambar');
    img.alt = `Stiker ${NAMA_GRUP[st.k]}: ${st.teks}`;
    img.removeAttribute('src');
    const h = await gambarStiker(st); img.src = h.url;
    document.getElementById('pratinjau-sebelum').disabled = idxPratinjau === 0;
    document.getElementById('pratinjau-sesudah').disabled = idxPratinjau === urutPratinjau.length - 1;
  };
  document.getElementById('grid-stiker').addEventListener('click', (e) => {
    const b = e.target.closest('[data-stiker]'); if (!b) return;
    asalPratinjau = b;
    urutPratinjau = STIKER.filter((s) => HADIAH.stiker.includes(s.id) && (filterStiker === 'semua' || s.k === filterStiker)).map((s) => s.id);
    idxPratinjau = urutPratinjau.indexOf(b.dataset.stiker);
    pr.hidden = false; tampilPratinjau();
    setTimeout(() => document.getElementById('pratinjau-unduh').focus({ preventScroll: true }), 40);
  });
  document.getElementById('pratinjau-tutup').addEventListener('click', () => tutupPratinjau());
  document.getElementById('pratinjau-sebelum').addEventListener('click', () => { if (idxPratinjau > 0) { idxPratinjau--; tampilPratinjau(); } });
  document.getElementById('pratinjau-sesudah').addEventListener('click', () => { if (idxPratinjau < urutPratinjau.length - 1) { idxPratinjau++; tampilPratinjau(); } });
  document.getElementById('pratinjau-unduh').addEventListener('click', async () => {
    const st = STIKER.find((x) => x.id === urutPratinjau[idxPratinjau]);
    const h = await gambarStiker(st);
    kabar(PESAN_SIMPAN[await simpanBerkas(namaBerkas(st), h.blob)]);
  });
  document.getElementById('unduh-semua').addEventListener('click', async (e) => {
    const b = e.currentTarget, label = b.textContent;
    b.disabled = true; b.textContent = 'Menyiapkan…';
    try {
      const berkas = [];
      for (const id of HADIAH.stiker) {
        const st = STIKER.find((x) => x.id === id), h = await gambarStiker(st);
        berkas.push({ nama: namaBerkas(st), data: new Uint8Array(await h.blob.arrayBuffer()) });
      }
      kabar(PESAN_SIMPAN[await simpanBerkas('agrosync-stiker.zip', buatZip(berkas))]);
    } finally { b.disabled = false; b.textContent = label; }
  });
  // Mulai ulang (ketuk dua kali supaya tidak kepencet)
  const ulang = document.getElementById('hadiah-ulang');
  let siapUlang = 0;
  ulang.addEventListener('click', () => {
    if (Date.now() > siapUlang) { siapUlang = Date.now() + 3000; ulang.textContent = 'Ketuk lagi untuk mulai ulang'; setTimeout(() => { ulang.textContent = 'Mulai ulang hadiah'; }, 3000); return; }
    HADIAH.misi = []; HADIAH.stiker = []; HADIAH.lepas = []; HADIAH.baru = [];
    simpanHadiah(); perbaruiPot(false); PEMANDU.segarkan(false); isiPanelHadiah();
    ulang.textContent = 'Mulai ulang hadiah'; siapUlang = 0; kabar('Hadiah dimulai dari awal.');
  });
  perbaruiPot(false);
}
