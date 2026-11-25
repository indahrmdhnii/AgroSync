# AgroSync · Landing Page

Landing page untuk **AgroSync**, aplikasi pemantau kebun hidroponik dari handphone.
Satu file HTML yang interaktif: pengunjung bisa mencoba demo aplikasi di handphone
yang tersambung langsung ke kebun 3D.

Buka `dist/index.html` di browser untuk melihat hasilnya.

## Isi halaman

- **Pembuka**: animasi Ago dan Tata menyapa, lalu pengunjung memilih pemandu.
- **Masalah umum**: tiga kartu masalah yang bisa dibalik untuk melihat solusinya,
  ditemani maskot yang ekspresinya ikut berubah.
- **How it works**: demo 5 langkah (sehat, ada masalah, siram dari jauh, kamera, panen).
  Handphone dan kebun 3D bergerak bersamaan. Ada tangan penunjuk dan opsi lewati tutorial.
- **Fitur**: enam fitur yang bisa langsung dicoba.
- **Sehari bareng AgroSync**: empat momen dengan checklist misi.
- **Tanya jawab**: Tata dan Ago menjawab lewat obrolan.
- **Hadiah**: 7 misi, pot mini di navbar yang tumbuh, aksesori untuk pemandu,
  dan 30 stiker WhatsApp (PNG 512×512) yang bisa diunduh satu per satu atau sekaligus (ZIP).
- Mode terang/gelap, ramah handphone, dan mendukung pengaturan gerakan dikurangi.

Semua angka di demo adalah data contoh.

## Struktur

```
src/
  body.html     isi halaman
  styles.css    gaya (token warna terang/gelap)
  art.js        gambar SVG: logo, maskot, ekspresi, aksesori, ikon, emoji 3D
  hp.js         tiruan aplikasi di handphone
  kebun3d.js    kebun 3D (Three.js r128)
  hadiah.js     misi, pot mini, aksesori, stiker, unduhan PNG/ZIP
  demo.js       alur demo, pemandu, pilih karakter, tema, dan interaksi lain
build.py        menggabungkan src/ menjadi satu file HTML
dist/index.html hasil build siap pakai
cek/            tes otomatis dengan Playwright
```

## Build

```bash
python3 build.py src dist/index.html
```

Pakai `--potongan` kalau butuh isi halaman saja (tanpa `<html>`/`<head>`),
misalnya untuk ditempel ke Artifact claude.ai:

```bash
python3 build.py src dist/potongan.html --potongan
```

Cek sintaks JavaScript hasil gabungan:

```bash
node --check gabung.js
```

## Tes

Tes memakai Playwright + Chromium dan membuka `dist/index.html` langsung.
Three.js diambil dari salinan lokal supaya tes tidak bergantung ke CDN:

```bash
mkdir -p vendor
curl -L -o vendor/three-r128.min.js https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
```

Contoh menjalankan tes:

```bash
node cek/adegan.js 390 844 light no-preference R1   # demo 5 langkah
node cek/otomatis.js                                # putar otomatis
node cek/hadiah.js 1280 900 light HD                # misi, stiker, unduh PNG/ZIP
node cek/pilih.js 390 844 dark PH                   # pilih pemandu dan tema
```

Screenshot hasil tes tersimpan di `cek/` (tidak ikut di-commit).

## Deploy

Halaman ini statis (satu file `dist/index.html`), jadi tidak perlu proses build di server.

**Vercel**: impor repositori ini. `vercel.json` sudah mengarahkan Vercel ke folder `dist`,
jadi biarkan Framework Preset = Other dan kosongkan Build Command.
Kalau sebelumnya Output Directory di Project Settings pernah diisi lain, ubah jadi `dist`.

**GitHub Pages**: Settings → Pages → Deploy from a branch → `main` / root,
lalu buka `https://<username>.github.io/<repo>/dist/`.

Setiap kali `src/` diubah, jalankan lagi `python3 build.py src dist/index.html`
lalu commit `dist/index.html`.

## Catatan teknis

- Library dari CDN: Three.js r128 (cdnjs) dan huruf Fredoka, Inter, Poppins (Google Fonts).
- Kalau WebGL tidak tersedia atau pengunjung memilih gerakan dikurangi,
  kebun tampil sebagai ilustrasi datar.
- Pilihan pemandu, tema, tutorial, dan progres hadiah disimpan di `localStorage` browser.
- Unduhan stiker memakai kemampuan `downloads` saat dibuka di claude.ai,
  dan tautan unduhan biasa di tempat lain.
