/* ============================================================ Kebun 3D (POV Kebun)
   Low-poly dari primitif Three.js (r128). Membaca state S setiap frame, jadi selalu
   sinkron dengan layar HP. Berhenti menggambar saat panel tidak terlihat atau tab disembunyikan. */
const Kebun3D = (() => {
  let renderer, scene, camera, wadah, kanvas, raf = 0, terakhir = 0, waktu = 0;
  let terlihat = false, tabAktif = !document.hidden, siap = false;
  const o = {}; // objek-objek yang dianimasikan
  const anchor = {}; // titik untuk label melayang
  const kam = { theta: .72, phi: 1.04, r: 9.6, target: null };
  const mau = { theta: .72, phi: 1.04, r: 9.6, target: null, sway: 0 };
  let faktorR = 1;
  let fokusNama = 'umum', geserUser = 0, sentuhTerakhir = -99;
  const FOKUS = {
    umum: { t: [.15, .78, .45], r: 9.6, phi: 1.04, theta: null },
    'sensor-ph': { t: [1.68, 1.55, .85], r: 3.0, phi: 1.12, theta: .95 },
    'sensor-suhu': { t: [1.68, 1.55, .45], r: 3.0, phi: 1.12, theta: .95 },
    'sensor-air': { t: [1.68, 1.25, -.25], r: 3.2, phi: 1.15, theta: 1.05 },
    'sensor-pupuk': { t: [.9, .95, 1.25], r: 3.3, phi: 1.2, theta: .6 },
    bak: { t: [.6, .95, 1.1], r: 6.2, phi: 1.1, theta: .62 },
    pompa: { t: [-1.25, .55, 1.95], r: 5.2, phi: 1.06, theta: .42 },
    wadahKecil: { t: [-1.2, 1.25, 2.0], r: 4.6, phi: 1.0, theta: .42 },
    kamera: { t: [.1, 1.75, -.1], r: 6.6, phi: .78, theta: .8 },
    panen: { t: [1.2, .95, .7], r: 7.6, phi: 1.04, theta: .85 },
  };

  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
  const lambert = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
  const dasar = (c, extra = {}) => new THREE.MeshBasicMaterial({ color: c, ...extra });

  function teksturBayang() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(10,30,18,.42)'); gr.addColorStop(1, 'rgba(10,30,18,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  function bayang(x, z, sx, sz = sx) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ map: o.texBayang, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, .006, z); m.scale.set(sx, sz, 1); m.renderOrder = 1;
    scene.add(m); return m;
  }
  /** Sprite maskot dari SVG (tajam, wajah tetap menghadap kamera). */
  function spriteSVG(svg, tinggi, rasio) {
    const c = document.createElement('canvas'); c.width = 320; c.height = Math.round(320 / rasio);
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 2;
    const img = new Image();
    img.onload = () => { const g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); tex.needsUpdate = true; };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sp = new THREE.Sprite(mat); sp.scale.set(tinggi * rasio, tinggi, 1);
    return sp;
  }
  const svgUtuh = (isi, vb) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${isi}</svg>`;

  const holeXZ = (n) => { const r = Math.floor((n - 1) / 6), c = (n - 1) % 6; return [(c - 2.5) * .55, (r - 1.5) * .55]; };
  const Y_PAPAN = 1.63, Y_DASAR_BAK = .86, TINGGI_BAK = .66;

  function bangunAdegan() {
    o.texBayang = teksturBayang();
    // Bahan yang mengikuti tema (warnanya diperbarui di aturTema)
    o.matTanah = lambert('#A8D5B5');
    o.matBukit = [lambert('#BFE2C9'), lambert('#A3D3B2'), lambert('#86C39A')];
    o.matRangka = lambert('#7DBE93');
    o.matMeja = lambert('#F4FAF6');
    o.matPapan = lambert('#EEF3EA');
    o.matAlas = lambert('#D8E2D4');

    const tanah = new THREE.Mesh(new THREE.CircleGeometry(30, 48), o.matTanah);
    tanah.rotation.x = -Math.PI / 2; scene.add(tanah);
    // Bukit low-poly di belakang
    const geoBukit = new THREE.IcosahedronGeometry(1, 1); geoBukit.computeVertexNormals();
    [[-9, -13, 5.5, 1.2], [-2, -15, 6.5, 1.6], [5, -14, 6, 1.35], [11, -10, 5, 1.1], [-13, -6, 4.5, 1.0], [13, -3, 4.2, .9]].forEach(([x, z, s, h], i) => {
      const m = new THREE.Mesh(geoBukit, o.matBukit[i % 3]); m.position.set(x, 0, z); m.scale.set(s, h, s * .7); scene.add(m);
    });
    // Rangka greenhouse melengkung
    const geoLengkung = new THREE.TorusGeometry(4.7, .05, 6, 44, Math.PI);
    [-3.6, -1.8, 0].forEach((z) => { const m = new THREE.Mesh(geoLengkung, o.matRangka); m.position.set(0, 0, z); scene.add(m); });
    for (const a of [.35, .78, 1.2, 1.57, 1.94, 2.36, 2.8]) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 3.6, 6), o.matRangka);
      m.rotation.x = Math.PI / 2; m.position.set(Math.cos(a) * 4.7, Math.sin(a) * 4.7, -1.8); scene.add(m);
    }
    // Rak hidroponik dekorasi di belakang kiri dan kanan
    const matRak = lambert('#F4FAF6'), matDaun = lambert('#6CC04A'), matDaunMuda = lambert('#A5DC74');
    const geoDaun = new THREE.IcosahedronGeometry(1, 0);
    for (const sx of [-3.3, 3.3]) {
      for (const y of [.75, 1.35]) {
        const rak = new THREE.Mesh(new THREE.BoxGeometry(1.5, .07, .42), matRak); rak.position.set(sx, y, -2.7); scene.add(rak);
        for (let i = 0; i < 4; i++) {
          const s = new THREE.Mesh(geoDaun, i % 2 ? matDaun : matDaunMuda); s.position.set(sx - .54 + i * .36, y + .1, -2.7); s.scale.set(.15, .1, .15); scene.add(s);
        }
      }
      for (const dx of [-.68, .68]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.45, 6), o.matRangka); k.position.set(sx + dx, .72, -2.7); scene.add(k); }
    }
    // Semak dan bunga peach di tepi depan
    const matSemak = lambert('#86C39A'), matPeach = lambert('#F5BFA0'), matPutih = lambert('#FFFFFF');
    [[-4.2, 2.6], [4.4, 2.2], [-3.6, 3.6], [3.4, 3.8]].forEach(([x, z], i) => {
      const s = new THREE.Mesh(geoBukit, matSemak); s.position.set(x, .15, z); s.scale.set(.6, .35, .5); scene.add(s);
      const b = new THREE.Mesh(geoDaun, matPeach); b.position.set(x + .3, .5, z + .2); b.scale.setScalar(.09); scene.add(b);
      const c = new THREE.Mesh(geoDaun, matPutih); c.position.set(x + .3, .54, z + .26); c.scale.setScalar(.035); scene.add(c);
    });

    // Meja
    const meja = new THREE.Mesh(new THREE.BoxGeometry(4.4, .1, 3.0), o.matMeja); meja.position.set(0, .8, 0); scene.add(meja);
    for (const [x, z] of [[-2, -1.3], [2, -1.3], [-2, 1.3], [2, 1.3]]) {
      const k = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .78, 8), o.matRangka); k.position.set(x, .39, z); scene.add(k);
    }
    bayang(0, 0, 2.9, 2.1);

    // Bak kaca transparan dan isinya
    const geoBak = new THREE.BoxGeometry(3.6, .7, 2.5);
    const kaca = new THREE.Mesh(geoBak, new THREE.MeshLambertMaterial({ color: '#E6FBF2', transparent: true, opacity: .2, depthWrite: false }));
    kaca.position.set(0, .85 + .35, 0); kaca.renderOrder = 3; scene.add(kaca);
    const tepi = new THREE.LineSegments(new THREE.EdgesGeometry(geoBak), new THREE.LineBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .85 }));
    tepi.position.copy(kaca.position); scene.add(tepi);
    const kotak = new THREE.BoxGeometry(1, 1, 1);
    o.pupuk = new THREE.Mesh(kotak, lambert('#875A30', { transparent: true, opacity: .92 }));
    o.campur = new THREE.Mesh(kotak, lambert('#6F8E86', { transparent: true, opacity: .85 }));
    o.air = new THREE.Mesh(kotak, lambert('#62B8E6', { transparent: true, opacity: .78 }));
    for (const m of [o.pupuk, o.campur, o.air]) { m.scale.set(3.5, .1, 2.4); m.renderOrder = 2; scene.add(m); }
    const geoOmbak = new THREE.PlaneGeometry(3.5, 2.4, 14, 10); geoOmbak.rotateX(-Math.PI / 2);
    o.ombakDasar = Float32Array.from(geoOmbak.attributes.position.array);
    o.ombak = new THREE.Mesh(geoOmbak, lambert('#9AD4F2', { transparent: true, opacity: .9 }));
    o.ombak.renderOrder = 2; scene.add(o.ombak);
    // Gelembung udara
    o.gelembung = [];
    const matGel = dasar('#FFFFFF', { transparent: true, opacity: .75 });
    const geoGel = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 22; i++) {
      const g = new THREE.Mesh(geoGel, matGel);
      g.userData = { x: (Math.random() - .5) * 3.2, z: (Math.random() - .5) * 2.1, f: Math.random(), v: .25 + Math.random() * .35, s: .018 + Math.random() * .022 };
      g.scale.setScalar(g.userData.s); g.renderOrder = 4; scene.add(g); o.gelembung.push(g);
    }

    // Papan tanam 24 lubang
    const papan = new THREE.Mesh(new THREE.BoxGeometry(3.8, .08, 2.7), o.matPapan); papan.position.set(0, Y_PAPAN - .04, 0); scene.add(papan);
    const geoAlas = new THREE.CylinderGeometry(.21, .21, .012, 20), geoLubang = new THREE.CylinderGeometry(.11, .11, .016, 16), geoPot = new THREE.CylinderGeometry(.08, .07, .05, 12);
    const matLubang = lambert('#1E2A20'), matPot = lambert('#C9A77A');
    o.tanaman = [];
    o.matDaun = { daun: lambert('#5DBB46'), tua: lambert('#3E9A3A'), muda: lambert('#93D465'), pucuk: lambert('#C9EC97'), batang: lambert('#E3F2C9'), sakit: lambert('#C9C24A'), bercak: lambert('#7A5A33') };
    o.matPanen = [lambert('#5DBB46', { emissive: '#000000' }), lambert('#3E9A3A', { emissive: '#000000' })];
    o.cincinPanen = [];
    for (const t of TANAMAN) {
      const [x, z] = holeXZ(t.n);
      const a = new THREE.Mesh(geoAlas, o.matAlas); a.position.set(x, Y_PAPAN + .006, z); scene.add(a);
      const l = new THREE.Mesh(geoLubang, matLubang); l.position.set(x, Y_PAPAN + .01, z); scene.add(l);
      if (t.kosong) continue;
      const p = new THREE.Mesh(geoPot, matPot); p.position.set(x, Y_PAPAN + .03, z); scene.add(p);
      const g = buatTanaman(t, geoDaun); g.position.set(x, Y_PAPAN + .04, z); scene.add(g);
      o.tanaman.push({ t, g });
      if (t.level === 5) {
        const c = new THREE.Mesh(new THREE.TorusGeometry(.27, .035, 6, 28), dasar('#5FE3B0', { transparent: true, opacity: 0 }));
        c.rotation.x = Math.PI / 2; c.position.set(x, Y_PAPAN + .03, z); scene.add(c); o.cincinPanen.push(c);
      }
    }

    // Sensor tercelup di bak (sisi kanan)
    o.aura = {};
    const geoAura = new THREE.IcosahedronGeometry(1, 1);
    const sensor = (k, x, z, warnaTutup) => {
      const batang = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, .8, 8), lambert('#DDE3DF')); batang.position.set(x, 1.38, z); scene.add(batang);
      const tutup = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, .13, 12), lambert(warnaTutup)); tutup.position.set(x, 1.84, z); scene.add(tutup);
      const aura = new THREE.Mesh(geoAura, dasar('#4ADE80', { transparent: true, opacity: .3, depthWrite: false })); aura.position.set(x, 1.04, z); aura.scale.setScalar(.12); aura.renderOrder = 5; scene.add(aura);
      const cincin = new THREE.Mesh(new THREE.TorusGeometry(.1, .018, 6, 24), dasar('#4ADE80')); cincin.rotation.x = Math.PI / 2; cincin.position.set(x, 1.93, z); scene.add(cincin);
      o.aura[k] = { aura, cincin };
      anchor['sensor-' + k] = new THREE.Vector3(x, 2.05, z);
      return tutup.position;
    };
    const capPh = sensor('ph', 1.68, .85, '#046B37');
    const capSuhu = sensor('suhu', 1.68, .45, '#E8833A');
    // Pelampung level air
    const tiang = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .85, 6), lambert('#DDE3DF')); tiang.position.set(1.68, 1.33, -.25); scene.add(tiang);
    o.pelampung = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), lambert('#FFB74D')); o.pelampung.scale.setScalar(.06); o.pelampung.position.set(1.68, 1.2, -.25); scene.add(o.pelampung);
    const capAir = new THREE.Vector3(1.68, 1.78, -.25);
    const cA = new THREE.Mesh(new THREE.TorusGeometry(.1, .018, 6, 24), dasar('#4ADE80')); cA.rotation.x = Math.PI / 2; cA.position.set(1.68, 1.8, -.25); scene.add(cA);
    o.aura.air = { aura: o.pelampung, cincin: cA, pelampung: true };
    anchor['sensor-air'] = new THREE.Vector3(1.68, 1.95, -.25);
    anchor['sensor-pupuk'] = new THREE.Vector3(.9, 1.0, 1.25);
    anchor.bak = new THREE.Vector3(-.9, 1.2, 1.25);

    // Kotak pengendali kecil di sudut meja belakang kanan, dengan kabel ke sensor
    const esp = new THREE.Group(); esp.position.set(1.95, .86, -1.2);
    const pcb = new THREE.Mesh(new THREE.BoxGeometry(.5, .05, .34), lambert('#1E6B45')); pcb.position.y = .03; esp.add(pcb);
    const chip = new THREE.Mesh(new THREE.BoxGeometry(.16, .035, .16), lambert('#C9D1CC')); chip.position.set(-.06, .07, 0); esp.add(chip);
    o.led = new THREE.Mesh(new THREE.IcosahedronGeometry(.035, 1), dasar('#22C55E')); o.led.position.set(.17, .08, .1); esp.add(o.led);
    scene.add(esp);
    const kabel = (ke) => {
      const kurva = new THREE.CatmullRomCurve3([new THREE.Vector3(1.95, .92, -1.2), new THREE.Vector3(2.05, 1.5, (ke.z - 1.2) / 2), new THREE.Vector3(ke.x + .02, ke.y + .08, ke.z)]);
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(kurva, 20, .012, 5), lambert('#2B2F2D')));
    };
    [capPh, capSuhu, capAir].forEach(kabel);
    anchor.esp = new THREE.Vector3(1.95, 1.15, -1.2);

    // Tiga penampung di depan meja: galon Air Bersih, dirigen Nutrisi A (hijau), dirigen Nutrisi B (merah).
    // Masing-masing punya pompa kecil di atasnya dan pipa ke bak.
    o.pompa = {};
    o.label3d = [];
    const pompaKecil = (g, x, y) => {
      const badan = new THREE.Mesh(new THREE.BoxGeometry(.2, .1, .15), lambert('#55625B')); badan.position.set(x, y + .05, 0); g.add(badan);
      const led = new THREE.Mesh(new THREE.IcosahedronGeometry(.028, 1), dasar('#7F1D1D')); led.position.set(x + .06, y + .11, .07); g.add(led);
      return { badan, led, bx: x };
    };
    const teksTempel = (teks, warna, lebar, tinggi) => {
      const c = document.createElement('canvas'); c.width = 320; c.height = 120;
      const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
      const gambar = () => {
        const g = c.getContext('2d');
        g.clearRect(0, 0, 320, 120);
        g.fillStyle = '#FFFFFF'; g.beginPath(); g.moveTo(24, 8); g.arcTo(312, 8, 312, 112, 22); g.arcTo(312, 112, 8, 112, 22); g.arcTo(8, 112, 8, 8, 22); g.arcTo(8, 8, 312, 8, 22); g.fill();
        g.fillStyle = warna; g.font = '700 46px Poppins, "Segoe UI", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(teks, 160, 64);
        tex.needsUpdate = true;
      };
      gambar();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(gambar);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(lebar, tinggi), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      return m;
    };
    // Galon Air Bersih
    {
      const g = new THREE.Group(); g.position.set(-2.05, 0, 2.05);
      const kulit = lambert('#C9ECFB', { transparent: true, opacity: .5, depthWrite: false });
      const badan = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, .62, 28), kulit); badan.position.y = .31; g.add(badan);
      const air = new THREE.Mesh(new THREE.CylinderGeometry(.275, .275, .54, 24), lambert('#4FA9E0', { transparent: true, opacity: .78 })); air.position.y = .28; g.add(air);
      for (const y of [.12, .52]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.302, .018, 6, 32), lambert('#9FD8F4')); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); }
      const bahu = new THREE.Mesh(new THREE.CylinderGeometry(.1, .3, .16, 28), kulit); bahu.position.y = .7; g.add(bahu);
      const leher = new THREE.Mesh(new THREE.CylinderGeometry(.085, .085, .08, 16), lambert('#BFE6FA')); leher.position.y = .82; g.add(leher);
      const tutup = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .07, 16), lambert('#1E6FB8')); tutup.position.y = .89; g.add(tutup);
      const tempel = teksTempel('Air Bersih', '#1E6FB8', .42, .16); tempel.position.set(0, .34, .305); g.add(tempel);
      const p = pompaKecil(g, 0, .92);
      scene.add(g); bayang(-2.05, 2.05, .38);
      const kurva = new THREE.CatmullRomCurve3([new THREE.Vector3(-2.05, 1.03, 2.05), new THREE.Vector3(-2.0, 1.45, 1.85), new THREE.Vector3(-1.78, 1.6, 1.42), new THREE.Vector3(-1.7, 1.42, 1.08)]);
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(kurva, 30, .024, 6), lambert('#E4EEE8', { transparent: true, opacity: .6 })));
      o.pompa.air = { g, ...p, kurva, cair: '#2F8FE0', puncak: new THREE.Vector3(-2.05, 1.25, 2.05) };
      anchor['wadah-air'] = new THREE.Vector3(-2.05, .05, 2.4);
    }
    // Dirigen Nutrisi A (hijau) dan Nutrisi B (merah)
    const dirigen = (id, x, warna, warnaTutup, teks) => {
      const g = new THREE.Group(); g.position.set(x, 0, 2.05);
      const kulit = lambert('#F4F7F5', { transparent: true, opacity: .42, depthWrite: false });
      const tubuh = new THREE.Mesh(new THREE.BoxGeometry(.4, .52, .26), kulit); tubuh.position.y = .26; g.add(tubuh);
      const cairan = new THREE.Mesh(new THREE.BoxGeometry(.36, .36, .22), lambert(warna, { transparent: true, opacity: .9 })); cairan.position.y = .2; g.add(cairan);
      const pegangan = new THREE.Mesh(new THREE.TorusGeometry(.085, .028, 6, 18, Math.PI), lambert('#E8EEEA')); pegangan.position.set(-.08, .52, 0); g.add(pegangan);
      const leher = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .06, 12), lambert('#E8EEEA')); leher.position.set(.11, .55, 0); g.add(leher);
      const tutup = new THREE.Mesh(new THREE.CylinderGeometry(.065, .065, .05, 12), lambert(warnaTutup)); tutup.position.set(.11, .6, 0); g.add(tutup);
      const tempel = teksTempel(teks, warnaTutup, .34, .13); tempel.position.set(0, .4, .131); g.add(tempel);
      const p = pompaKecil(g, .11, .62);
      scene.add(g); bayang(x, 2.05, .3);
      const kurva = new THREE.CatmullRomCurve3([new THREE.Vector3(x + .11, .74, 2.05), new THREE.Vector3(x + .12, 1.25, 1.85), new THREE.Vector3(x + .16, 1.6, 1.42), new THREE.Vector3(x + .2, 1.42, 1.08)]);
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(kurva, 30, .022, 6), lambert('#E4EEE8', { transparent: true, opacity: .6 })));
      o.pompa[id] = { g, ...p, kurva, cair: warna, puncak: new THREE.Vector3(x + .11, .95, 2.05) };
      anchor['wadah-' + id] = new THREE.Vector3(x, .05, 2.3);
    };
    dirigen('nutA', -1.2, '#2FA24E', '#1E7A38', 'Nutrisi A');
    dirigen('nutB', -.45, '#D9443B', '#A3271F', 'Nutrisi B');
    for (const [id, p] of Object.entries(o.pompa)) anchor['puncak-' + id] = p.puncak.clone().add(new THREE.Vector3(0, .22, 0));
    anchor.pompa = o.pompa.air.puncak.clone();
    o.aliran = [];
    o.matAliran = dasar('#2F8FE0');
    for (let i = 0; i < 12; i++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(.03, 1), o.matAliran); p.visible = false; p.renderOrder = 6; scene.add(p); o.aliran.push(p); }

    // Lengan kamera kebun di atas papan
    const tiangKam = new THREE.Mesh(new THREE.CylinderGeometry(.05, .065, 3.0, 10), lambert('#5F6E66')); tiangKam.position.set(-2.25, 1.5, -1.6); scene.add(tiangKam);
    bayang(-2.25, -1.6, .25);
    o.poros = new THREE.Group(); o.poros.position.set(-2.25, 2.95, -1.6); scene.add(o.poros);
    const geoLengan = new THREE.BoxGeometry(1, .06, .08); geoLengan.translate(.5, 0, 0);
    o.lengan = new THREE.Mesh(geoLengan, lambert('#5F6E66')); o.poros.add(o.lengan);
    o.kepala = new THREE.Group(); o.poros.add(o.kepala);
    const badanKam = new THREE.Mesh(new THREE.BoxGeometry(.22, .14, .2), lambert('#2F3A33')); badanKam.position.y = -.1; o.kepala.add(badanKam);
    const lensa = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .06, 12), lambert('#111')); lensa.position.y = -.2; o.kepala.add(lensa);
    o.ledKam = new THREE.Mesh(new THREE.IcosahedronGeometry(.025, 1), dasar('#7F1D1D')); o.ledKam.position.set(.08, -.08, .11); o.kepala.add(o.ledKam);
    // Sorot foto berbentuk limas yang menutup seluruh papan (kamera memotret semuanya sekaligus)
    const geoLimas = new THREE.ConeGeometry(1, 1.2, 4, 1, true); geoLimas.rotateY(Math.PI / 4);
    o.kerucut = new THREE.Mesh(geoLimas, dasar('#FFF3B0', { transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    o.kerucut.scale.set(2.65, 1, 1.85); scene.add(o.kerucut);
    // Bingkai potong: menandai bagian lubang yang dipotong dari foto besar
    o.bingkaiCrop = new THREE.Group();
    const matCrop = dasar('#FF9F1C');
    for (const [w, d, x, z] of [[.56, .06, 0, -.28], [.56, .06, 0, .28], [.06, .56, -.28, 0], [.06, .56, .28, 0]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, .05, d), matCrop); b.position.set(x, 0, z); b.renderOrder = 7; o.bingkaiCrop.add(b);
    }
    o.bingkaiCrop.visible = false; scene.add(o.bingkaiCrop);
    o.cahayaKilat = new THREE.PointLight('#ffffff', 0, 3.5); o.cahayaKilat.position.y = -.3; o.kepala.add(o.cahayaKilat);
    o.lenganSudut = null; o.lenganPanjang = null;

    // Maskot (sprite dari SVG)
    o.semanggi = {};
    for (const pose of ['lambai', 'angkat', 'lompat', 'diam']) {
      const sp = spriteSVG(svgUtuh(semanggiIsi(pose), '0 -24 120 150'), 1.15, 120 / 150); sp.visible = pose === 'lambai'; scene.add(sp); o.semanggi[pose] = sp;
    }
    o.posSemanggi = new THREE.Vector3(2.95, .58, 1.55);
    o.siA = {};
    for (const pose of ['waspada', 'tunjuk', 'senang', 'lambai']) {
      const sp = spriteSVG(svgUtuh(siAIsi(pose), '0 -24 132 146'), 1.15, 132 / 146); sp.visible = false; scene.add(sp); o.siA[pose] = sp;
    }
    o.posSiA = new THREE.Vector3(1.35, .58, 2.65);
    o.skalaSiA = 0;
    o.bayangSemanggi = bayang(2.95, 1.55, .42, .3);
    o.bayangSiA = bayang(1.35, 2.65, .42, .3);
    anchor.siA = new THREE.Vector3(1.35, 1.3, 2.65);
    anchor.semanggi = new THREE.Vector3(2.95, 1.3, 1.55);

    // Konfeti daun
    o.konfeti = [];
    const geoK = new THREE.PlaneGeometry(.08, .04);
    const matK = [dasar('#8EEDC7', { side: THREE.DoubleSide }), dasar('#3E9A3A', { side: THREE.DoubleSide }), dasar('#F5BFA0', { side: THREE.DoubleSide }), dasar('#A5DC74', { side: THREE.DoubleSide })];
    for (let i = 0; i < 44; i++) { const k = new THREE.Mesh(geoK, matK[i % 4]); k.visible = false; scene.add(k); o.konfeti.push({ m: k, v: new THREE.Vector3(), umur: 0 }); }

    // Cahaya
    o.hemi = new THREE.HemisphereLight('#FFFFFF', '#A8D5B5', .9); scene.add(o.hemi);
    o.matahari = new THREE.DirectionalLight('#FFF6E8', .62); o.matahari.position.set(4, 7, 5); scene.add(o.matahari);
  }

  function buatTanaman(t, geo) {
    const g = new THREE.Group();
    const s = [0, .45, .62, .78, .92, 1.08][t.level];
    const panen = t.level === 5;
    const m1 = panen ? o.matPanen[0] : o.matDaun.daun, m2 = panen ? o.matPanen[1] : o.matDaun.tua;
    if (t.jenis === 'Pakcoy') {
      for (let i = 0; i < 5; i++) {
        const piv = new THREE.Group(); piv.rotation.y = i * (Math.PI * 2 / 5) + t.n;
        const sakit = t.kondisi === 'cek' && i < 2;
        const daun = new THREE.Mesh(geo, sakit ? o.matDaun.sakit : (i % 2 ? m2 : m1));
        daun.scale.set(.085, .22, .035); daun.position.set(.07, .2, 0); daun.rotation.z = -.42; piv.add(daun);
        const batang = new THREE.Mesh(geo, o.matDaun.batang); batang.scale.set(.02, .1, .02); batang.position.set(.03, .08, 0); batang.rotation.z = -.35; piv.add(batang);
        g.add(piv);
      }
      if (t.kondisi === 'masalah') for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(geo, o.matDaun.bercak); b.scale.setScalar(.022); b.position.set(Math.cos(i * 2) * .1, .24 + i * .04, Math.sin(i * 2) * .1); g.add(b); }
    } else {
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + t.n;
        const sakit = t.kondisi === 'cek' && i < 2;
        const daun = new THREE.Mesh(geo, sakit ? o.matDaun.sakit : (i % 2 ? o.matDaun.muda : m1));
        daun.scale.set(.13, .08, .11); daun.position.set(Math.cos(a) * .1, .07, Math.sin(a) * .1); daun.rotation.set(Math.sin(a) * .4, a, -Math.cos(a) * .4); g.add(daun);
      }
      const pucuk = new THREE.Mesh(geo, o.matDaun.pucuk); pucuk.scale.set(.08, .07, .08); pucuk.position.y = .12; g.add(pucuk);
    }
    g.scale.setScalar(s);
    return g;
  }

  /* ------------------------------------------------------------ Tema */
  function aturTema() {
    if (!scene) return;
    const langit = new THREE.Color(css('--langit'));
    scene.background = langit;
    scene.fog = new THREE.Fog(langit, 13, 30);
    o.matTanah.color.set(css('--sage'));
    const gelap = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
    if (gelap) o.matTanah.color.set('#1F3A2A');
    o.matBukit[0].color.set(css('--bukit-1')); o.matBukit[1].color.set(css('--bukit-2')); o.matBukit[2].color.set(css('--bukit-3'));
    o.matRangka.color.set(css('--rangka'));
    o.matMeja.color.set(gelap ? '#2E4436' : '#F4FAF6');
    o.matPapan.color.set(gelap ? '#45584A' : '#EEF3EA');
    o.matAlas.color.set(gelap ? '#56695A' : '#D8E2D4');
    o.hemi.intensity = gelap ? .62 : .9;
    o.hemi.groundColor.set(gelap ? '#1F3A2A' : '#A8D5B5');
    o.matahari.intensity = gelap ? .45 : .62;
  }

  /* ------------------------------------------------------------ Kamera orbit (dibatasi) */
  function pasangKendali() {
    let id = null, x0 = 0, y0 = 0, arah = null, px = 0, py = 0;
    kanvas.addEventListener('pointerdown', (e) => { id = e.pointerId; x0 = px = e.clientX; y0 = py = e.clientY; arah = e.pointerType === 'mouse' ? 'bebas' : null; });
    kanvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      if (!arah) {
        const tx = e.clientX - x0, ty = e.clientY - y0;
        if (Math.abs(tx) > 8 && Math.abs(tx) > Math.abs(ty) * 1.2) { arah = 'datar'; try { kanvas.setPointerCapture(id); } catch (_) { /* abaikan */ } }
        else if (Math.abs(ty) > 8) { id = null; return; } // geser vertikal: biarkan halaman menggulir
        else return;
      }
      px = e.clientX; py = e.clientY;
      geserUser -= dx * .009;
      if (arah === 'bebas') mau.phi = Math.max(.6, Math.min(1.32, mau.phi + dy * .005));
      sentuhTerakhir = waktu;
    });
    const lepas = (e) => { if (e.pointerId === id) { id = null; arah = null; } };
    kanvas.addEventListener('pointerup', lepas); kanvas.addEventListener('pointercancel', lepas);
    kanvas.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { geserUser += .2; sentuhTerakhir = waktu; e.preventDefault(); }
      if (e.key === 'ArrowRight') { geserUser -= .2; sentuhTerakhir = waktu; e.preventDefault(); }
      if (e.key === 'ArrowUp') { mau.phi = Math.max(.6, mau.phi - .08); e.preventDefault(); }
      if (e.key === 'ArrowDown') { mau.phi = Math.min(1.32, mau.phi + .08); e.preventDefault(); }
    });
  }
  function setFokus(nama) {
    if (!FOKUS[nama]) nama = 'umum';
    if (nama === fokusNama) return;
    const f = FOKUS[nama];
    fokusNama = nama;
    mau.target.set(...f.t); mau.r = f.r; mau.phi = f.phi;
    if (f.theta != null) { // putar ke sudut terdekat yang setara
      const sekarang = kam.theta, tujuan = f.theta + Math.round((sekarang - f.theta) / (Math.PI * 2)) * Math.PI * 2;
      mau.theta = tujuan; geserUser = 0;
    } else { mau.theta = kam.theta; geserUser = 0; }
  }

  /* ------------------------------------------------------------ Efek sesaat */
  let kilatMulai = -99, konfetiMulai = -99, sorotId = null, sorotMulai = -99;
  function sorot(id) { sorotId = id; sorotMulai = waktu; }
  function efek(nama) {
    if (nama === 'kilat') kilatMulai = waktu;
    if (nama === 'konfeti') {
      konfetiMulai = waktu;
      for (const k of o.konfeti) {
        k.m.position.set(o.posSiA.x + (Math.random() - .5) * .4, 1.3, o.posSiA.z + (Math.random() - .5) * .3);
        k.v.set((Math.random() - .5) * 2.4, 2 + Math.random() * 1.6, (Math.random() - .5) * 2.4);
        k.umur = 0; k.m.visible = true; k.m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      }
    }
  }

  /* ------------------------------------------------------------ Satu frame */
  let vTmp, C;
  function perbarui(dt) {
    // Kamera
    const f = FOKUS[fokusNama];
    const diam = waktu - sentuhTerakhir > 3.5;
    if (f.theta == null) { if (diam) mau.theta += dt * .085; mau.theta += geserUser; geserUser = 0; }
    else { mau.sway = Math.sin(waktu * .35) * .14; }
    const thetaTujuan = f.theta == null ? mau.theta : mau.theta + geserUser + (diam ? mau.sway : 0);
    const k = Math.min(1, dt * 2.2);
    kam.theta += (thetaTujuan - kam.theta) * k;
    kam.phi += (mau.phi - kam.phi) * k;
    kam.r += (mau.r - kam.r) * k;
    kam.target.lerp(mau.target, k);
    const rr = kam.r * faktorR;
    camera.position.set(
      kam.target.x + rr * Math.sin(kam.phi) * Math.sin(kam.theta),
      kam.target.y + rr * Math.cos(kam.phi),
      kam.target.z + rr * Math.sin(kam.phi) * Math.cos(kam.theta));
    camera.lookAt(kam.target);

    // Isi bak: tinggi mengikuti level air, cokelat mengikuti pupuk
    const lv = Math.max(.08, Math.min(1, S.levelAir / 100));
    const h = TINGGI_BAK * lv, fp = Math.max(.15, Math.min(.6, S.tds / 1600 * .8));
    const hP = h * fp, hC = h * .14, hA = Math.max(.001, h - hP - hC);
    o.pupuk.scale.y = hP; o.pupuk.position.set(0, Y_DASAR_BAK + hP / 2, 0);
    o.campur.scale.y = hC; o.campur.position.set(0, Y_DASAR_BAK + hP + hC / 2, 0);
    o.air.scale.y = hA; o.air.position.set(0, Y_DASAR_BAK + hP + hC + hA / 2, 0);
    const pompaAir = !!S.pompa.aktif;
    const amp = pompaAir ? .028 : .01;
    const pos = o.ombak.geometry.attributes.position, b = o.ombakDasar;
    for (let i = 0; i < pos.count; i++) {
      const x = b[i * 3], z = b[i * 3 + 2];
      pos.array[i * 3 + 1] = Math.sin(x * 3 + waktu * 2) * amp + Math.cos(z * 4 + waktu * 1.6) * amp * .6;
    }
    pos.needsUpdate = true; o.ombak.geometry.computeVertexNormals();
    const yAir = Y_DASAR_BAK + h;
    o.ombak.position.y = yAir + .002;
    o.pelampung.position.y = yAir + .02;
    anchor.bak.y = yAir - .05;
    // Gelembung naik (lebih banyak saat pompa air menyala)
    o.gelembung.forEach((g, i) => {
      const d = g.userData, aktif = pompaAir || i < 6;
      g.visible = aktif && h > .08;
      if (!g.visible) return;
      d.f += dt * d.v * (pompaAir ? 1.6 : .6);
      if (d.f > 1) { d.f = 0; d.x = (Math.random() - .5) * 3.2; d.z = (Math.random() - .5) * 2.1; }
      g.position.set(d.x + Math.sin(d.f * 9 + i) * .03, Y_DASAR_BAK + .02 + d.f * (h - .04), d.z);
    });

    // Status sensor: aura dan cincin berwarna
    const { kuning, hijau, abu } = C;
    for (const kk of ['ph', 'suhu', 'air']) {
      const st = statusSensor(kk), a = o.aura[kk];
      const w = st === 'normal' ? hijau : st === 'offline' ? abu : kuning;
      a.cincin.material.color.copy(w);
      if (!a.pelampung) {
        a.aura.material.color.copy(w);
        const denyut = st === 'normal' ? .12 : .16 + Math.sin(waktu * 6) * .04;
        a.aura.scale.setScalar(denyut);
        a.aura.material.opacity = st === 'normal' ? .28 : .5;
        a.aura.position.y = Math.min(1.04, yAir - .06);
      }
      a.cincin.scale.setScalar(st === 'normal' ? 1 : 1 + Math.sin(waktu * 6) * .15);
    }
    // Lampu kecil pengendali berkedip
    const waspada = S.status === 'waspada';
    o.led.material.color.set(waspada ? '#F59E0B' : '#22C55E');
    o.led.visible = Math.sin(waktu * (waspada ? 9 : 4)) > -.3;

    // Pompa kecil di atas penampung: bergetar dan LED hijau saat aktif, cairan mengalir di pipa sesuai warnanya
    let pompaAktif = null;
    for (const [id, p] of Object.entries(o.pompa)) {
      const aktif = S.pompa.aktif === id;
      if (aktif) pompaAktif = p;
      p.led.material.color.set(aktif ? '#22C55E' : '#7F1D1D');
      p.badan.position.x = p.bx + (aktif ? Math.sin(waktu * 70) * .008 : 0);
      p.badan.scale.y = aktif ? 1 + Math.sin(waktu * 50) * .06 : 1;
      const ds = waktu - sorotMulai, disorot = sorotId === id;
      const lompat = disorot ? (ds < 1.1 ? Math.abs(Math.sin(ds * 8.5)) * .12 * (1 - ds / 1.1) : 0) + Math.sin(waktu * 2.4) * .015 + .015 : 0;
      p.g.position.y += (lompat - p.g.position.y) * Math.min(1, dt * 18);
      const sk = disorot ? 1.08 : 1; p.g.scale.setScalar(p.g.scale.x + (sk - p.g.scale.x) * Math.min(1, dt * 10));
    }
    if (pompaAktif) { o.matAliran.color.set(pompaAktif.cair); anchor.pompa.copy(pompaAktif.puncak); }
    o.aliran.forEach((pt, i) => {
      pt.visible = !!pompaAktif;
      if (pompaAktif) pt.position.copy(pompaAktif.kurva.getPointAt((waktu * .55 + i / o.aliran.length) % 1));
    });

    // Kamera kebun diam di atas tengah papan. Saat memotret, sorotnya menutup seluruh papan,
    // lalu bingkai potong muncul di lubang yang diminta.
    if (o.lenganSudut == null) {
      const dx = 0 - o.poros.position.x, dz = -.1 - o.poros.position.z;
      o.lenganSudut = Math.atan2(-dz, dx); o.lenganPanjang = Math.hypot(dx, dz);
      o.poros.rotation.y = o.lenganSudut; o.lengan.scale.x = o.lenganPanjang; o.kepala.position.x = o.lenganPanjang;
      o.kepala.updateWorldMatrix(true, false); o.kepala.getWorldPosition(vTmp);
      o.kerucut.position.set(vTmp.x, (vTmp.y - .2 + Y_PAPAN) / 2, vTmp.z);
      o.kerucut.scale.y = (vTmp.y - .2 - Y_PAPAN) / 1.2;
      o.posKamera = vTmp.clone();
    }
    const ki = waktu - kilatMulai;
    const kilat = ki >= 0 && ki < .5 ? 1 - ki / .5 : 0;
    o.kerucut.material.opacity = S.foto.status === 'memuat' ? .22 + kilat * .45 : kilat * .45;
    o.cahayaKilat.intensity = kilat * 3;
    o.ledKam.material.color.set(S.foto.status === 'memuat' || kilat > 0 ? '#EF4444' : '#7F1D1D');
    const nCrop = S.kamera;
    o.bingkaiCrop.visible = !!nCrop;
    if (nCrop) {
      const [cx, cz] = holeXZ(nCrop);
      o.bingkaiCrop.position.set(cx, Y_PAPAN + .05, cz);
      const dn = 1 + Math.sin(waktu * 6) * .05; o.bingkaiCrop.scale.set(dn, 1, dn);
      anchor.kamera = (anchor.kamera || new THREE.Vector3()).set(cx, Y_PAPAN + .75, cz);
    } else anchor.kamera = (anchor.kamera || new THREE.Vector3()).copy(o.posKamera).setY(o.posKamera.y + .25);

    // Panen: selada level 5 berpendar mint
    const pendar = S.panenSorot ? .6 + Math.sin(waktu * 4) * .25 : 0;
    o.matPanen[0].emissive.setRGB(pendar * .35, pendar * .9, pendar * .6);
    o.matPanen[1].emissive.setRGB(pendar * .25, pendar * .7, pendar * .45);
    o.cincinPanen.forEach((c) => { c.material.opacity = S.panenSorot ? .75 + Math.sin(waktu * 4) * .25 : 0; c.scale.setScalar(1.15 + (S.panenSorot ? Math.sin(waktu * 4) * .12 : 0)); });

    // Tata: melambai, melompat, mengangkat selada
    const poseS = S.semanggi;
    let yS = 0;
    if (poseS === 'lompat' || poseS === 'angkat') yS = Math.abs(Math.sin(waktu * 4.2)) * .35;
    for (const [pose, sp] of Object.entries(o.semanggi)) {
      sp.visible = pose === (poseS === 'lompat' ? 'lompat' : poseS);
      sp.position.set(o.posSemanggi.x, o.posSemanggi.y + yS + Math.sin(waktu * 2.2) * .02, o.posSemanggi.z);
      sp.material.rotation = poseS === 'lambai' ? Math.sin(waktu * 3) * .06 : 0;
    }
    o.bayangSemanggi.scale.set(.42 - yS * .3, .3 - yS * .2, 1);
    // Ago: muncul saat ada peringatan
    const tampilA = S.siA !== 'sembunyi';
    o.skalaSiA += ((tampilA ? 1 : 0) - o.skalaSiA) * Math.min(1, dt * 5);
    const lonjak = tampilA ? 1 + Math.sin(Math.min(1, o.skalaSiA) * Math.PI) * .08 : 1;
    for (const [pose, sp] of Object.entries(o.siA)) {
      sp.visible = tampilA && pose === S.siA || (!tampilA && o.skalaSiA > .02 && pose === (o.poseAkhir || 'senang'));
      const sk = o.skalaSiA * lonjak;
      sp.scale.set(1.15 * (132 / 146) * sk, 1.15 * sk, 1);
      sp.position.set(o.posSiA.x, .06 + .58 * sk + Math.sin(waktu * 2.6) * .02, o.posSiA.z);
    }
    if (tampilA) o.poseAkhir = S.siA;
    o.bayangSiA.visible = o.skalaSiA > .05; o.bayangSiA.scale.set(.42 * o.skalaSiA, .3 * o.skalaSiA, 1);

    // Konfeti
    const umurK = waktu - konfetiMulai;
    for (const kf of o.konfeti) {
      if (!kf.m.visible) continue;
      kf.umur += dt; kf.v.y -= 4.2 * dt;
      kf.m.position.addScaledVector(kf.v, dt);
      kf.m.rotation.x += dt * 6; kf.m.rotation.y += dt * 4;
      if (kf.m.position.y < .02 || umurK > 3) kf.m.visible = false;
    }
  }

  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(.05, (t - terakhir) / 1000 || .016); terakhir = t; waktu += dt;
    perbarui(dt);
    renderer.render(scene, camera);
    if (Kebun3D.saatFrame) Kebun3D.saatFrame();
  }
  function aturJalan() {
    const harus = siap && terlihat && tabAktif;
    if (harus && !raf) { terakhir = performance.now(); raf = requestAnimationFrame(loop); }
    if (!harus && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function ukur() {
    if (!renderer) return;
    const w = wadah.clientWidth, h = wadah.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < .9 ? 50 : 40;
    faktorR = w / h < .75 ? 1.35 : w / h < 1.05 ? 1.18 : 1;
    camera.updateProjectionMatrix();
  }

  function init(el, cv) {
    wadah = el; kanvas = cv;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: kanvas, antialias: true, powerPreference: 'high-performance' });
    } catch (_) { return false; }
    const hpKasar = matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, hpKasar ? 1.5 : 2));
    vTmp = new THREE.Vector3();
    C = { kuning: new THREE.Color('#F59E0B'), hijau: new THREE.Color('#4ADE80'), abu: new THREE.Color('#9CA3AF') };
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, 1, .1, 60);
    kam.target = new THREE.Vector3(...FOKUS.umum.t); mau.target = kam.target.clone();
    bangunAdegan();
    aturTema();
    pasangKendali();
    new ResizeObserver(ukur).observe(wadah);
    ukur();
    new IntersectionObserver((e) => { terlihat = e[0].isIntersecting; aturJalan(); }, { threshold: .02 }).observe(wadah);
    document.addEventListener('visibilitychange', () => { tabAktif = !document.hidden; aturJalan(); });
    siap = true; aturJalan();
    return true;
  }

  /** Posisi layar (relatif kanvas) dari titik bernama, atau null bila di belakang kamera. */
  function proyeksi(nama) {
    const a = anchor[nama];
    if (!a || !camera) return null;
    vTmp.copy(a).project(camera);
    if (vTmp.z > 1) return null;
    return { x: (vTmp.x + 1) / 2 * wadah.clientWidth, y: (1 - vTmp.y) / 2 * wadah.clientHeight };
  }

  return { init, setFokus, efek, sorot, proyeksi, aturTema, saatFrame: null, get fokus() { return fokusNama; } };
})();
