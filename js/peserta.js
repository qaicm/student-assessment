/* ============================================================
   peserta.js — halaman publik (masuk, uji coba) & peserta
   (siswa + akun uji coba): beranda, pengantar, tes, selesai,
   hasil, tinjau, profil, perkembangan, akun.
   ============================================================ */
'use strict';
const ILUSTRASI = `<svg class="auth-illus" viewBox="0 0 360 200" role="img" aria-label="Ilustrasi siswa menjelajahi potensi diri">
  <defs><linearGradient id="gA" x1="0" x2="1"><stop offset="0" stop-color="var(--p)"/><stop offset="1" stop-color="var(--p-2)"/></linearGradient></defs>
  <rect x="10" y="20" width="340" height="170" rx="28" fill="#fff"/>
  <circle cx="300" cy="62" r="26" fill="#FEF3C7"/><path d="M300 44v-8M300 88v-8M282 62h-8M326 62h-8" stroke="#F59E0B" stroke-width="4" stroke-linecap="round"/>
  <path d="M30 170c40-50 80-50 120-20s80 20 120-10 50-10 60 0v30H30z" fill="var(--p-ctr)"/>
  <g transform="translate(92 70)"><circle cx="0" cy="0" r="18" fill="#FCD9B6"/><path d="M-18-4c2-14 34-14 36 0-8-6-28-6-36 0z" fill="#1E1B4B"/><rect x="-22" y="20" width="44" height="58" rx="18" fill="url(#gA)"/><rect x="-30" y="40" width="60" height="38" rx="6" fill="#fff" stroke="#E2E8F0"/><path d="M-20 52h40M-20 62h28" stroke="var(--p-2)" stroke-width="4" stroke-linecap="round"/></g>
  <g transform="translate(190 78)"><circle cx="0" cy="0" r="17" fill="#E8B48E"/><path d="M-17-2c0-18 34-18 34 0 0-8-34-8-34 0z" fill="#3F2A1D"/><path d="M-17 2c-4 18 2 26 2 26M17 2c4 18-2 26-2 26" stroke="#3F2A1D" stroke-width="6" stroke-linecap="round"/><rect x="-21" y="20" width="42" height="56" rx="18" fill="#10B981"/><circle cx="34" cy="10" r="14" fill="#FEF3C7" stroke="#F59E0B" stroke-width="3"/><path d="M34 3l2 5 5 .5-4 3.5 1 5-4-2.5-4 2.5 1-5-4-3.5 5-.5z" fill="#F59E0B"/></g>
  <g fill="var(--p)" opacity=".85"><circle cx="150" cy="44" r="5"/><circle cx="238" cy="40" r="4"/><circle cx="58" cy="44" r="3"/></g>
  <path d="M120 40c10-14 30-14 40 0" stroke="var(--p-2)" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="4 6"/></svg>`;

const IKON_VARK = { V: 'circle-play', A: 'audio-lines', R: 'book-open', K: 'hand' };
const SKALA_MI = [[1, 'Sangat Tidak Sesuai'], [2, 'Tidak Sesuai'], [3, 'Ragu-ragu'], [4, 'Sesuai'], [5, 'Sangat Sesuai']];
const PILIH_RIASEC = [[2, 'Suka', 'thumbs-up'], [1, 'Biasa', 'meh'], [0, 'Tidak Suka', 'thumbs-down']];

/* ============================================================
   MASUK
   ============================================================ */
registerPage('masuk', {
  auth: 'publik', shell: 'blank', title: 'Masuk',
  template: () => `<div class="auth"><div class="pill-brand"><div class="logo-box" id="lgLogo">${ic('graduation-cap')}</div><span id="lgSekolah">[Nama Sekolah]</span></div>
    ${ILUSTRASI}<h1 class="center" style="font-size:28px">Student Assessment</h1><p class="center muted" style="margin:4px 0 20px">Kenali Dirimu, Temukan Potensimu</p>
    <div class="card auth-card"><div class="seg" style="display:flex;margin-bottom:20px"><button class="on grow" data-tab="siswa">Siswa</button><button class="grow" data-tab="staf">Guru / Staf</button></div>
      <form id="fSiswa" class="stack" autocomplete="off" novalidate>
        <div class="grid g2" style="gap:12px"><label class="field"><span>Unit</span><select class="select" id="lgUnit"><option value="">Pilih</option></select></label>
        <label class="field"><span>Tingkat</span><select class="select" id="lgLevel" disabled><option value="">Pilih</option></select></label></div>
        <label class="field"><span>Kelas</span><select class="select" id="lgKelas" disabled><option value="">Pilih kelas</option></select></label>
        <label class="field"><span>Nama Lengkap</span><div class="search">${ic('search')}<input class="input" id="lgCari" placeholder="Ketik untuk mencari namamu…" disabled list="lgDaftar"></div><datalist id="lgDaftar"></datalist><input type="hidden" id="lgId"></label>
        <label class="field"><span>Tanggal Lahir</span><input class="input" type="date" id="lgTgl" max="2020-12-31" min="1995-01-01"></label>
        <div class="err-msg" id="lgErr" role="alert"></div>
        <button class="btn block" type="submit" id="lgBtn">Masuk</button></form>
      <form id="fStaf" class="stack hidden" novalidate>
        <label class="field"><span>Email</span><input class="input" type="email" id="lgEmail" autocomplete="username" placeholder="nama@sekolah.sch.id"></label>
        <label class="field"><span>Kata Sandi</span><div style="position:relative"><input class="input" type="password" id="lgSandi" autocomplete="current-password" style="padding-right:48px"><button type="button" class="link" id="lgLihat" style="position:absolute;right:6px;top:6px" aria-label="Tampilkan sandi">${ic('eye')}</button></div></label>
        <div class="err-msg" id="lgErr2" role="alert"></div>
        <button class="btn block" type="submit" id="lgBtn2">Masuk</button></form></div>
    <a class="card auth-card row hidden" id="lgUji" href="#/uji" style="margin-top:16px;justify-content:center;padding:18px;font-weight:700">${ic('flask-conical')} Coba Tes Gratis (Akun Uji Coba) <span class="badge b-orange">Uji Coba</span></a></div>`,
  show(el) {
    let pub = null;
    const isiUnit = () => {
      const units = [...new Set(pub.kelas.map(k => k[0]))];
      $('#lgUnit', el).innerHTML = '<option value="">Pilih</option>' + units.map(u => `<option>${esc(u)}</option>`).join('');
    };
    swr('pub', 'publicBoot', {}, d => {
      pub = d; AppState.sekolah = d.sekolah;
      $('#lgSekolah', el).textContent = d.sekolah.nama_sekolah;
      if (d.sekolah.logo_url) $('#lgLogo', el).innerHTML = `<img src="${esc(d.sekolah.logo_url)}" alt="">`;
      $('#lgUji', el).classList.toggle('hidden', !d.sekolah.uji_coba_aktif);
      if (!AppState.konten && d.kontenVer) Store.set('kontenVerTerbaru', d.kontenVer);
      const u = $('#lgUnit', el).value; isiUnit(); $('#lgUnit', el).value = u;
    }, { global: true, fresh: 300000, onError: r => { $('#lgErr', el).textContent = r.message; } });

    $$('[data-tab]', el).forEach(b => b.onclick = () => {
      $$('[data-tab]', el).forEach(x => x.classList.toggle('on', x === b));
      $('#fSiswa', el).classList.toggle('hidden', b.dataset.tab !== 'siswa'); $('#fStaf', el).classList.toggle('hidden', b.dataset.tab !== 'staf');
    });
    $('#lgUnit', el).onchange = e => {
      const lv = [...new Set(pub.kelas.filter(k => k[0] === e.target.value).map(k => k[1]))];
      $('#lgLevel', el).innerHTML = '<option value="">Pilih</option>' + lv.map(l => `<option value="${esc(l)}">Kelas ${esc(l)}</option>`).join('');
      $('#lgLevel', el).disabled = !e.target.value; $('#lgKelas', el).disabled = true; $('#lgCari', el).disabled = true;
    };
    $('#lgLevel', el).onchange = e => {
      const ks = pub.kelas.filter(k => k[0] === $('#lgUnit', el).value && k[1] === e.target.value);
      $('#lgKelas', el).innerHTML = '<option value="">Pilih kelas</option>' + ks.map(k => `<option>${esc(k[2])}</option>`).join('');
      $('#lgKelas', el).disabled = !e.target.value; $('#lgCari', el).disabled = true;
    };
    let daftar = [];
    $('#lgKelas', el).onchange = e => {
      const kls = e.target.value; $('#lgCari', el).value = ''; $('#lgId', el).value = '';
      if (!kls) return;
      $('#lgCari', el).placeholder = 'Memuat daftar nama…';
      swr('nk:' + kls, 'namaKelas', { kelas: kls }, d => {
        daftar = d; $('#lgDaftar', el).innerHTML = d.map(x => `<option value="${esc(x[1])}">`).join('');
        $('#lgCari', el).disabled = false; $('#lgCari', el).placeholder = 'Ketik untuk mencari namamu…';
      }, { global: true, fresh: 300000 });
    };
    $('#lgCari', el).oninput = e => { const m = daftar.find(x => x[1].toLowerCase() === e.target.value.trim().toLowerCase()); $('#lgId', el).value = m ? m[0] : ''; };
    $('#lgLihat', el).onclick = () => { const i = $('#lgSandi', el); i.type = i.type === 'password' ? 'text' : 'password'; };

    $('#fSiswa', el).onsubmit = async e => {
      e.preventDefault();
      const id = $('#lgId', el).value, tgl = $('#lgTgl', el).value, err = $('#lgErr', el);
      if (!id) { err.textContent = 'Pilih namamu dari daftar.'; return; }
      if (!tgl) { err.textContent = 'Isi tanggal lahirmu.'; return; }
      err.textContent = ''; const btn = $('#lgBtn', el); btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:3px"></span> Memeriksa…';
      const r = await api('loginSiswa', { id_siswa: id, tgl_lahir: tgl, kontenVer: AppState.konten ? AppState.konten.ver : '' });
      btn.disabled = false; btn.textContent = 'Masuk';
      if (!r.success) { err.textContent = r.message; return; }
      simpanSesi(r.data.token, 'SISWA', r.data.boot); go('beranda');
      toast('Selamat datang, ' + r.data.boot.user.nama.split(' ')[0] + '!', 'fun');
    };
    $('#fStaf', el).onsubmit = async e => {
      e.preventDefault();
      const email = $('#lgEmail', el).value.trim(), sandi = $('#lgSandi', el).value, err = $('#lgErr2', el);
      if (!/^\S+@\S+\.\S+$/.test(email) || !sandi) { err.textContent = 'Isi email dan kata sandi dengan benar.'; return; }
      err.textContent = ''; const btn = $('#lgBtn2', el); btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:3px"></span> Memeriksa…';
      const r = await api('loginStaf', { email, sandi, kontenVer: AppState.konten ? AppState.konten.ver : '' });
      btn.disabled = false; btn.textContent = 'Masuk';
      if (!r.success) { err.textContent = r.message; return; }
      simpanSesi(r.data.token, r.data.boot.user.role, r.data.boot); go(halamanAwal());
      toast('Selamat datang, ' + r.data.boot.user.nama + '!', 'success');
    };
  }
});

/* ============================================================
   AKUN UJI COBA
   ============================================================ */
registerPage('uji', {
  auth: 'publik', shell: 'blank', title: 'Akun Uji Coba',
  template: () => `<div class="auth"><a href="#/masuk" class="pill-brand">${ic('arrow-left')} Kembali ke halaman masuk</a>
    <div class="card auth-card" style="margin-top:24px"><div class="row" style="margin-bottom:6px"><h2 class="grow">Coba Tes Gratis</h2><span class="badge b-orange">Uji Coba</span></div>
      <p class="muted small" style="margin-bottom:18px">Rasakan keempat tes seperti siswa. Hasilmu tidak masuk data sekolah dan disimpan sementara.</p>
      <div class="seg" style="display:flex;margin-bottom:20px"><button class="on grow" data-u="baru">Akun Baru</button><button class="grow" data-u="lanjut">Lanjutkan dengan Kode</button></div>
      <form id="uBaru" class="stack" novalidate><label class="field"><span>Nama Panggilan</span><input class="input" id="uNama" maxlength="40" placeholder="Contoh: Nadia"></label>
        <div class="field"><span>Kategori</span><div class="row wrap" style="gap:8px" id="uKat">${['Siswa SMP', 'Siswa SMA', 'Guru', 'Umum'].map((k, i) => `<button type="button" class="chip ${i === 0 ? 'on' : ''}" data-k="${k}">${k}</button>`).join('')}</div></div>
        <label class="field"><span>Email <span class="muted">(opsional — kode lanjut dikirim ke sini)</span></span><input class="input" type="email" id="uEmail" placeholder="nama@email.com" autocomplete="email"></label>
        <label class="field"><span>WhatsApp <span class="muted">(opsional)</span></span><input class="input" type="tel" inputmode="tel" id="uWa" placeholder="0812xxxxxxx" autocomplete="tel"></label>
        <div class="err-msg" id="uErr" role="alert"></div><button class="btn block" id="uBtn">Mulai Coba</button></form>
      <form id="uLanjut" class="stack hidden" novalidate><label class="field"><span>Kode Lanjut (6 karakter)</span><input class="input" id="uKode" maxlength="6" style="text-transform:uppercase;letter-spacing:8px;font:700 24px Poppins;text-align:center" placeholder="••••••"></label>
        <div class="err-msg" id="uErr2" role="alert"></div><button class="btn block" id="uBtn2">Lanjutkan</button></form></div></div>`,
  show(el) {
    $$('[data-u]', el).forEach(b => b.onclick = () => { $$('[data-u]', el).forEach(x => x.classList.toggle('on', x === b)); $('#uBaru', el).classList.toggle('hidden', b.dataset.u !== 'baru'); $('#uLanjut', el).classList.toggle('hidden', b.dataset.u !== 'lanjut'); });
    $$('#uKat .chip', el).forEach(c => c.onclick = () => $$('#uKat .chip', el).forEach(x => x.classList.toggle('on', x === c)));
    const masuk = (d) => {
      simpanSesi(d.token, 'UJI', d.boot);
      const m = modal(`<div class="center"><div class="big-badge" style="width:84px;height:84px">${ic('key-round', 'ic-lg')}</div><h3>Simpan Kode Lanjutmu</h3><p class="muted small" style="margin:6px 0 14px">Pakai kode ini untuk melanjutkan tes di lain hari atau di perangkat lain.</p>
        <div style="font:800 34px Poppins;letter-spacing:10px;color:var(--p);background:var(--p-ctr);border-radius:16px;padding:14px">${esc(d.kode)}</div>
        <div class="row" style="margin-top:18px"><button class="btn line grow" data-c>${ic('copy')} Salin Kode</button><button class="btn grow" data-m>Mulai</button></div></div>`, { sticky: true });
      m.querySelector('[data-c]').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(d.kode); toast('Kode disalin', 'success', 1500); };
      m.querySelector('[data-m]').onclick = () => { closeModal(); go('beranda'); };
    };
    $('#uBaru', el).onsubmit = async e => {
      e.preventDefault();
      const nama = $('#uNama', el).value.trim(), email = $('#uEmail', el).value.trim(), kat = ($('#uKat .chip.on', el) || {}).dataset.k, err = $('#uErr', el);
      if (nama.length < 2) { err.textContent = 'Isi nama panggilan minimal 2 huruf.'; return; }
      if (email && !/^\S+@\S+\.\S+$/.test(email)) { err.textContent = 'Format email tidak valid.'; return; }
      const wa = $('#uWa', el).value.replace(/[^\d+]/g, '');
      if (wa && !/^(\+?62|0)8\d{8,12}$/.test(wa)) { err.textContent = 'Nomor WhatsApp tidak valid (contoh 0812xxxxxxx).'; return; }
      const btn = $('#uBtn', el); btn.disabled = true; btn.textContent = 'Menyiapkan…'; err.textContent = '';
      const r = await api('ujiBaru', { nama, kategori: kat, email, no_wa: wa, kontenVer: AppState.konten ? AppState.konten.ver : '' });
      btn.disabled = false; btn.textContent = 'Mulai Coba';
      if (!r.success) { err.textContent = r.message; return; }
      masuk(r.data);
    };
    $('#uLanjut', el).onsubmit = async e => {
      e.preventDefault();
      const kode = $('#uKode', el).value.trim().toUpperCase(), err = $('#uErr2', el);
      if (kode.length !== 6) { err.textContent = 'Kode lanjut terdiri dari 6 karakter.'; return; }
      const btn = $('#uBtn2', el); btn.disabled = true; err.textContent = '';
      const r = await api('ujiLanjut', { kode, kontenVer: AppState.konten ? AppState.konten.ver : '' });
      btn.disabled = false;
      if (!r.success) { err.textContent = r.message; return; }
      simpanSesi(r.data.token, 'UJI', r.data.boot); go('beranda'); toast('Selamat datang kembali!', 'fun');
    };
  }
});

/* ============================================================
   UTIL PESERTA: draf lokal, status tes
   ============================================================ */
const idPer = () => (AppState.boot && AppState.boot.periode ? AppState.boot.periode.id_periode : 'NONE');
const drafKey = t => userKey('draf:' + t + ':' + idPer());
function drafLokal(t) {
  const lokal = Store.get(drafKey(t), null), srv = AppState.boot && AppState.boot.sesi[t];
  const nL = lokal ? Object.keys(lokal.jawaban || {}).length : -1, nS = srv && srv.status === 'DRAF' ? Object.keys(srv.jawaban || {}).length : -1;
  if (nL < 0 && nS < 0) return null;
  return nL >= nS ? lokal : { jawaban: srv.jawaban || {}, urutan: srv.urutan || [], posisi: srv.posisi || 0 };
}
function statusTes(t) {
  const b = AppState.boot; if (!b) return 'BELUM';
  if (b.sesi[t] && b.sesi[t].status === 'SELESAI') return 'SELESAI';
  if (drafLokal(t)) return 'DRAF';
  return 'BELUM';
}
const tesDibuka = t => { const p = AppState.boot && AppState.boot.periode; return !!(p && (p.tes_aktif || TES).includes(t)); };
const hasilTerakhir = t => { const l = (AppState.boot ? AppState.boot.hasil : []).filter(h => h.tes === t); return l[l.length - 1] || null; };
const backBar = (judul, ke = 'beranda') => `<div class="row" style="margin-bottom:16px"><button class="icon-btn" onclick="history.length>1?history.back():go('${ke}')" aria-label="Kembali">${ic('arrow-left')}</button><h2 class="grow" style="font-size:19px">${esc(judul)}</h2></div>`;

/* ============================================================
   BERANDA
   ============================================================ */
registerPage('beranda', {
  title: 'Beranda', nav: 'beranda',
  show(el) {
    const b = AppState.boot;
    if (!b) { el.innerHTML = skel(4, 120); return; }
    if (!AppState.konten) { el.innerHTML = skel(4, 120); pastikanKonten().then(() => route()); return; }
    const p = b.periode, aktif = p ? (p.tes_aktif || TES) : [];
    const selesai = aktif.filter(t => statusTes(t) === 'SELESAI').length, pct = aktif.length ? Math.round(selesai / aktif.length * 100) : 0;
    const sisa = p && p.tgl_tutup ? sisaHari(p.tgl_tutup) : null;
    let banner = '';
    if (!p) banner = `<div class="card tint-info row" style="padding:14px 18px">${ic('calendar-clock')}<span>Belum ada periode tes yang dibuka. Kamu tetap bisa melihat hasil sebelumnya.</span></div>`;
    else if (sisa != null && sisa <= 7 && selesai < aktif.length) banner = `<div class="card tint-amber row" style="padding:14px 18px;border:1px solid var(--amber)">${ic('clock')}<span>Periode asesmen ditutup dalam <b>${Math.max(0, sisa)} hari lagi</b>. Yuk selesaikan ${aktif.length - selesai} tes lagi!</span></div>`;
    const motivasi = selesai === aktif.length && aktif.length ? 'Luar biasa! Semua tes selesai. Lihat profil lengkapmu.' : selesai ? 'Hebat! Lanjutkan petualanganmu, satu tes sehari juga oke.' : 'Boleh dikerjakan bertahap, satu tes sehari juga oke.';
    el.innerHTML = `<div class="stack">${banner}
      <div class="hero row" style="gap:16px"><div class="grow" style="position:relative;z-index:1"><span class="badge b-dark">Progres Petualanganmu</span><h2 style="color:#fff;font-size:24px;margin:10px 0 8px">${selesai} dari ${aktif.length || 4} tes selesai!</h2><p style="opacity:.92">${motivasi}</p></div>${Chart.ring(pct)}</div>
      <div class="row between"><h2>Daftar Tes Pengenalan Diri</h2><span class="muted small">${TES.length} Tes</span></div>
      ${TES.map(kartuTes).join('')}
      <div class="card"><div class="card-h"><h3>Lencana Pencapaian</h3><span class="small bold" style="color:var(--p)">${TES.filter(t => statusTes(t) === 'SELESAI').length + (TES.every(t => statusTes(t) === 'SELESAI') ? 1 : 0)} / 5 Terbuka</span></div>
      <div class="grid g4" style="grid-template-columns:repeat(5,minmax(0,1fr));gap:8px">${[['VARK', 'eye', 'Gaya Belajar'], ['MI', 'brain', '9 Kecerdasan'], ['RIASEC', 'compass', 'Arah Karier'], ['PS', 'user-round', 'Gaya Pribadi'], ['ALL', 'award', 'Penjelajah Diri']].map(([t, i, l]) => {
        const on = t === 'ALL' ? TES.every(x => statusTes(x) === 'SELESAI') : statusTes(t) === 'SELESAI';
        return `<div class="center"><div class="badge-ring ${on ? 'on' : ''}">${ic(i)}</div><div class="xs bold" style="color:${on ? 'var(--ink)' : 'var(--muted)'}">${l}</div></div>`;
      }).join('')}</div></div></div>`;
  }
});
function kartuTes(t) {
  const k = K.tes(t), inf = INFO_TES[t], st = statusTes(t), buka = tesDibuka(t), n = K.soal(t).length;
  const d = st === 'DRAF' ? drafLokal(t) : null, dij = d ? Object.keys(d.jawaban || {}).length : 0;
  const badge = st === 'SELESAI' ? `<span class="badge b-green">${ic('circle-check', 'ic-sm')} Selesai</span>` : st === 'DRAF' ? '<span class="badge b-amber">Draf</span>' : buka ? '<span class="badge">Belum dimulai</span>' : '<span class="badge">Belum dibuka</span>';
  let aksi;
  if (st === 'SELESAI') aksi = `<div class="grid g2" style="gap:10px;grid-template-columns:1fr 1fr"><a class="btn green" href="#/hasil/${t}">Lihat Hasil</a><a class="btn line" href="#/tinjau/${t}">Tinjau Jawaban</a></div>`;
  else if (!buka) aksi = hasilTerakhir(t) ? `<a class="btn line block" href="#/hasil/${t}">Lihat Hasil Sebelumnya</a>` : `<button class="btn line block" disabled>Belum dibuka</button>`;
  else if (st === 'DRAF') aksi = `<div class="row between small" style="margin-bottom:8px"><span class="muted">Soal ${dij} dari ${n}</span><span class="muted">${Math.round(dij / n * 100)}%</span></div><div class="bar amber" style="margin-bottom:14px"><i style="width:${Math.round(dij / n * 100)}%"></i></div><a class="btn amber block" href="#/tes/${t}">Lanjutkan</a>`;
  else aksi = `<a class="btn block" href="#/intro/${t}">Mulai</a>`;
  return `<div class="card test-card"><div class="row" style="align-items:flex-start;gap:16px;margin-bottom:16px"><div class="ill" style="background:${inf.bg};color:${inf.fg}">${ic(inf.ikon, 'ic-lg')}</div>
    <div class="grow"><div class="row between" style="align-items:flex-start"><h3 style="font-size:19px">${esc(k.nama)}</h3>${badge}</div><p class="muted" style="margin:4px 0">${esc(k.tagline || '')}</p>
    <div class="small muted row" style="gap:6px">${ic('timer', 'ic-sm')} ±${k.menit || 10} menit • ${n} soal</div></div></div>${aksi}</div>`;
}

/* ============================================================
   PENGANTAR TES
   ============================================================ */
registerPage('intro', {
  title: 'Pengantar Tes', nav: 'beranda', fresh: true,
  show(el, t) {
    if (!TES.includes(t)) return go('beranda');
    if (statusTes(t) === 'SELESAI') return go('hasil', t);
    const k = K.tes(t), inf = INFO_TES[t], n = K.soal(t).length;
    el.innerHTML = `${backBar(k.nama + ' — ' + (k.subjudul || ''))}<div class="stack">
      <div class="card center" style="padding:28px"><div class="ill" style="width:96px;height:96px;border-radius:28px;margin:0 auto 14px;display:grid;place-items:center;background:${inf.bg};color:${inf.fg}">${ic(inf.ikon, 'ic-lg')}</div><h1 style="font-size:24px">${esc(k.nama)}</h1><p class="muted">${esc(k.tagline || '')}</p></div>
      <div class="card"><h3 class="row" style="gap:10px;margin-bottom:8px">${ic('target')} Apa yang diukur?</h3><p>${esc(k.diukur || '')}</p></div>
      <div class="card"><h3 class="row" style="gap:10px;margin-bottom:8px">${ic('gift')} Manfaatnya untukmu</h3>${ul(bagi(k.manfaat))}</div>
      <div class="card"><h3 class="row" style="gap:10px;margin-bottom:8px">${ic('list-checks')} Cara mengerjakan</h3><p>${esc(k.cara || '')}</p>
        <div class="row" style="gap:16px;margin-top:12px"><span class="badge b-p">${ic('timer', 'ic-sm')} ±${k.menit} menit</span><span class="badge b-p">${ic('file-question', 'ic-sm')} ${n} soal</span><span class="badge b-p">${ic('save', 'ic-sm')} Tersimpan otomatis</span></div></div>
      <div class="card tint-amber row" style="border:1px solid #FDE68A">${ic('heart')}<b>Tidak ada jawaban benar atau salah. Jawablah sejujurnya sesuai dirimu.</b></div>
      <label class="check card pad-s"><input type="checkbox" id="siap"> Saya siap mengerjakan</label>
      <button class="btn block" id="mulaiBtn" disabled style="min-height:52px;font-size:17px">Mulai ${ic('arrow-right')}</button></div>`;
    $('#siap', el).onchange = e => { $('#mulaiBtn', el).disabled = !e.target.checked; };
    $('#mulaiBtn', el).onclick = () => go('tes', t);
  }
});

/* ============================================================
   LEMBAR TES — optimistic: jawaban disimpan lokal seketika,
   sinkron ke server tiap 5 jawaban & saat keluar (sendBeacon).
   ============================================================ */
let TS = null;   // state tes aktif
registerPage('tes', {
  shell: 'fokus', title: 'Mengerjakan Tes', fresh: true, keep: true,
  show(el, t) {
    if (!TES.includes(t)) return go('beranda');
    if (statusTes(t) === 'SELESAI') return go('hasil', t);
    if (!tesDibuka(t)) { toast('Tes ini belum dibuka.', 'warning'); return go('beranda'); }
    const soal = K.soal(t); if (!soal.length) { el.innerHTML = gagal('Bank soal belum termuat.', 'route()'); return; }
    const d = drafLokal(t) || {};
    const valid = new Set(soal.map(s => s.id));
    let urutan = (d.urutan || []).filter(id => valid.has(id));
    if (urutan.length !== soal.length) urutan = acak(soal.map(s => s.id), AppState.user.id + t + idPer());
    const per = matchMedia('(min-width: 900px)').matches ? 5 : 1;
    const jw = Object.assign({}, d.jawaban || {});
    let pos = Math.min(d.posisi || 0, urutan.length - 1);
    if (!d.posisi) { const f = urutan.findIndex(id => jw[id] == null); pos = f < 0 ? urutan.length - 1 : f; }
    TS = { t, el, soal: Object.fromEntries(soal.map(s => [s.id, s])), urutan, jw, per, hal: Math.floor(pos / per), dirty: 0, times: [], last: [], warned: {}, sinkTerakhir: Date.now() };
    renderTes();
  }
});
function simpanLokal() { Store.set(drafKey(TS.t), { jawaban: TS.jw, urutan: TS.urutan, posisi: TS.hal * TS.per, t: Date.now() }); }
function payloadDraf() { return { tes: TS.t, jawaban: TS.jw, urutan: TS.urutan, posisi: TS.hal * TS.per }; }
function sinkDraf() {
  if (!TS || !TS.dirty) return;
  TS.dirty = 0; const ind = $('#savedInd'); if (ind) { ind.className = 'saved wait'; ind.innerHTML = ic('loader', 'ic-sm') + ' Menyimpan'; }
  const t = TS.t;
  api('simpanDraf', payloadDraf()).then(r => {
    const i = $('#savedInd'); if (!i) return;
    i.className = r.success ? 'saved' : 'saved wait'; i.innerHTML = r.success ? ic('cloud-check', 'ic-sm') + ' Tersimpan' : ic('hard-drive', 'ic-sm') + ' Tersimpan di perangkat';
    if (r.success && AppState.boot) AppState.boot.sesi[t] = Object.assign({ status: 'DRAF' }, payloadDraf());
  });
}
function beaconDraf() {
  if (!TS || !TS.dirty || !navigator.sendBeacon || !GAS_URL) return;
  try { navigator.sendBeacon(GAS_URL, new Blob([JSON.stringify({ action: 'simpanDraf', token: AppState.token, reqId: uuid(), data: payloadDraf() })], { type: 'text/plain;charset=utf-8' })); TS.dirty = 0; } catch (e) {}
}
addEventListener('pagehide', beaconDraf);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') beaconDraf(); });

function renderTes() {
  const { t, el, urutan, per, hal, jw } = TS, k = K.tes(t), total = urutan.length;
  const ids = urutan.slice(hal * per, hal * per + per), dijawab = Object.keys(jw).filter(id => TS.soal[id]).length;
  const terakhir = (hal + 1) * per >= total;
  el.innerHTML = `<div class="tes-top"><div class="in"><div class="row"><button class="icon-btn" id="tKeluar" aria-label="Simpan dan keluar">${ic('arrow-left')}</button><h3 class="grow center" style="font-size:18px">${esc(k.nama)}</h3><span class="saved" id="savedInd">${ic('cloud-check', 'ic-sm')} Tersimpan</span></div>
    <div class="row" style="margin-top:10px"><div class="bar grow"><i style="width:${Math.round(dijawab / total * 100)}%"></i></div><span class="small muted bold">${dijawab} / ${total}</span></div></div></div>
    <div style="max-width:820px;margin:0 auto;padding:20px 16px 150px"><div id="tMotiv"></div><div class="card">${ids.map((id, i) => blokSoal(id, hal * per + i + 1)).join('')}</div></div>
    <div class="tes-foot"><div class="in"><div class="grid g2" style="grid-template-columns:1fr 1fr;gap:12px"><button class="btn line" id="tPrev" ${hal === 0 ? 'disabled' : ''}>${ic('chevron-left')} Sebelumnya</button>
      ${terakhir ? `<button class="btn" id="tKirim">${ic('send')} Kirim Jawaban</button>` : `<button class="btn" id="tNext">Berikutnya ${ic('chevron-right')}</button>`}</div>
      <div class="center" style="margin-top:6px"><button class="link small muted" id="tSimpan" style="color:var(--muted)">Simpan & Keluar</button></div></div></div>`;
  const sisa = total - dijawab;
  if (dijawab && sisa > 0 && sisa <= 10 && total > 15) $('#tMotiv', el).innerHTML = `<div class="card tint-amber row" style="margin-bottom:16px;padding:14px 18px;border:1px solid var(--amber)">${ic('sparkles')}<span>Kamu hebat! Tinggal ${sisa} soal lagi untuk melihat hasilmu.</span></div>`;
  $$('[data-jw]', el).forEach(b => b.onclick = () => jawab(b.dataset.id, b.dataset.jw));
  $('#tPrev', el).onclick = () => { TS.hal--; simpanLokal(); renderTes(); };
  if ($('#tNext', el)) $('#tNext', el).onclick = () => lanjut();
  if ($('#tKirim', el)) $('#tKirim', el).onclick = kirimTes;
  const keluarTes = () => { simpanLokal(); sinkDraf(); if (AppState.boot) AppState.boot.sesi[t] = Object.assign({ status: 'DRAF' }, payloadDraf()); go('beranda'); toast('Jawaban tersimpan. Lanjutkan kapan saja ya!', 'info'); };
  $('#tKeluar', el).onclick = keluarTes; $('#tSimpan', el).onclick = keluarTes;
}
function blokSoal(id, no) {
  const s = TS.soal[id], v = TS.jw[id], t = TS.t;
  let isi = '';
  if (t === 'VARK') {
    isi = `<div class="stack-sm">${acak(s.opsi || [], id + AppState.user.id).map(o => `<button class="opt ${v === o.k ? 'on' : ''}" data-id="${id}" data-jw="${o.k}"><span class="oi">${ic(IKON_VARK[o.k])}</span><span class="grow">${esc(o.t)}</span><span class="ck">${v === o.k ? ic('check', 'ic-sm') : ''}</span></button>`).join('')}</div>`;
  } else if (t === 'MI') {
    isi = `<div class="scale" role="radiogroup">${SKALA_MI.map(([n, l]) => `<button class="${Number(v) === n ? 'on' : ''}" data-id="${id}" data-jw="${n}" role="radio" aria-checked="${Number(v) === n}" aria-label="${l}"><b>${n}</b><span>${l}</span></button>`).join('')}</div>
      <div class="row between xs muted" style="margin-top:8px"><span>Sangat Tidak Sesuai</span><span>Sangat Sesuai</span></div>`;
  } else if (t === 'RIASEC') {
    isi = `<div class="tri">${PILIH_RIASEC.map(([n, l, i]) => `<button class="${v !== undefined && Number(v) === n ? 'on' : ''}" data-id="${id}" data-jw="${n}">${ic(i)}${l}</button>`).join('')}</div>`;
  } else {
    isi = `<div class="pair">${(s.opsi || []).map((o, i) => `<button class="${v === o.k ? 'on' : ''}" data-id="${id}" data-jw="${o.k}"><span class="lt">${i ? 'B' : 'A'}</span><span>${esc(o.t)}</span></button>`).join('')}</div>`;
  }
  const label = t === 'RIASEC' ? 'Seberapa kamu suka aktivitas ini?' : '';
  return `<div class="q-block"><div class="q-num">Pertanyaan ${no}</div><div class="q-text">${esc(s.teks)}</div>${label ? `<p class="small muted" style="margin:-12px 0 14px">${label}</p>` : ''}${isi}</div>`;
}
function jawab(id, val) {
  const t = TS.t, v = t === 'MI' || t === 'RIASEC' ? Number(val) : val;
  const baru = TS.jw[id] == null;
  TS.jw[id] = v; TS.dirty++;
  simpanLokal();
  // deteksi menjawab terlalu cepat / pola sama berturut-turut
  const now = Date.now(); if (baru) { TS.times.push(now); TS.last.push(String(v)); }
  const tt = TS.times.slice(-4);
  if (tt.length === 4 && tt[3] - tt[0] < 3000 && !TS.warned.cepat) { TS.warned.cepat = 1; toast('Yuk baca lagi pelan-pelan 😊 Jawaban jujur membuat hasilmu akurat.', 'warning', 4500); }
  const l = TS.last.slice(-10); if (l.length === 10 && l.every(x => x === l[0]) && !TS.warned.sama) { TS.warned.sama = 1; toast('Jawabanmu sama 10 kali berturut-turut. Pastikan sesuai dirimu ya!', 'warning', 4500); }
  const total = TS.urutan.length, n = Object.keys(TS.jw).length;
  if (baru && n === Math.ceil(total / 2) && !TS.warned.half) { TS.warned.half = 1; toast('Setengah jalan! Kamu hebat 💪', 'fun'); }
  if (TS.dirty >= 5 || Date.now() - TS.sinkTerakhir > 60000) { TS.sinkTerakhir = Date.now(); sinkDraf(); }
  const scrollY = window.scrollY;
  renderTes(); window.scrollTo(0, scrollY);
  if (TS.per === 1 && baru && (TS.hal + 1) * TS.per < total) setTimeout(() => { if (TS && TS.jw[id] === v && TS.urutan[TS.hal] === id) lanjut(); }, 280);
}
function lanjut() {
  const ids = TS.urutan.slice(TS.hal * TS.per, TS.hal * TS.per + TS.per), belum = ids.filter(id => TS.jw[id] == null);
  if (belum.length) { toast(TS.per > 1 ? 'Jawab semua soal di halaman ini dulu ya.' : 'Pilih satu jawaban dulu ya.', 'warning', 2200); return; }
  TS.hal++; simpanLokal(); renderTes(); window.scrollTo(0, 0);
}
async function kirimTes() {
  const { t, urutan, jw } = TS;
  const pertama = urutan.findIndex(id => jw[id] == null);
  if (pertama > -1) { TS.hal = Math.floor(pertama / TS.per); renderTes(); toast('Masih ada soal yang belum dijawab.', 'warning'); return; }
  if (!await konfirmasi('Kirim jawaban?', 'Setelah dikirim, jawaban tidak bisa diubah. Hasilmu langsung muncul.', 'Kirim & Lihat Hasil')) return;
  busy(true, 'Menghitung hasilmu…');
  const r = await api('kirimTes', { tes: t, jawaban: jw, urutan });
  busy(false);
  if (!r.success) { toast(r.message || 'Gagal mengirim. Jawabanmu aman tersimpan, coba lagi.', 'error', 5000); return; }
  const h = r.data.hasil, b = AppState.boot;
  if (!b.hasil.find(x => x.id_sesi === h.id_sesi)) b.hasil.push(h);
  b.sesi[t] = { status: 'SELESAI' };
  Store.set(userKey('boot'), { t: Date.now(), h: '', data: b });
  Store.del(drafKey(t));
  Store.set(userKey('jw:' + t), { t: Date.now(), h: '', data: { jawaban: jw, urutan } });
  TS = null;
  go('selesai', t);
}

/* ============================================================
   SELESAI (perayaan)
   ============================================================ */
registerPage('selesai', {
  shell: 'fokus', title: 'Tes Selesai', fresh: true,
  show(el, t) {
    const k = K.tes(t), inf = INFO_TES[t] || INFO_TES.VARK, semua = TES.every(x => statusTes(x) === 'SELESAI');
    const warna = ['#7C3AED', '#F59E0B', '#10B981', '#EC4899', '#0EA5E9', '#F97316'];
    el.innerHTML = `<div class="celebrate"><div class="confetti" aria-hidden="true">${Array.from({ length: 48 }, (_, i) => `<i style="left:${Math.random() * 100}%;background:${warna[i % 6]};animation-delay:${Math.random() * .8}s;animation-duration:${2 + Math.random() * 1.5}s"></i>`).join('')}</div>
      <div style="position:relative;max-width:420px"><div class="big-badge" style="color:${inf.fg}">${ic(inf.ikon, 'ic-lg')}</div>
      <span class="badge b-amber">${ic('award', 'ic-sm')} Lencana ${esc(inf.badge)} terbuka!</span>
      <h1 style="margin:14px 0 8px">Yeay, tes ${esc(k.nama)} selesai! 🎉</h1>
      <p class="muted">${semua ? 'Kamu sudah menyelesaikan keempat tes dan mendapat lencana <b>Penjelajah Diri</b>!' : 'Terima kasih sudah menjawab dengan jujur. Hasilmu sudah siap.'}</p>
      <div class="stack-sm" style="margin-top:24px"><a class="btn block" href="#/hasil/${t}" style="min-height:52px">${ic('sparkles')} Lihat Hasilku</a><a class="btn line block" href="#/beranda">Kembali ke Beranda</a></div></div></div>`;
  }
});

/* ============================================================
   HASIL
   ============================================================ */
registerPage('hasil', {
  title: p => 'Hasil ' + (K.tes((p || '').split('~')[0]).nama || ''), nav: 'profil', fresh: true,
  show(el, param) {
    const [t, idS] = (param || '').split('~');
    const list = (AppState.boot ? AppState.boot.hasil : []).filter(h => h.tes === t);
    if (!list.length) { el.innerHTML = backBar('Hasil') + kosong('Belum ada hasil', 'Selesaikan tes ini terlebih dahulu untuk melihat hasilmu.', 'clipboard-list', `<a class="btn" href="#/beranda">Ke Beranda</a>`); return; }
    const h = list.find(x => x.id_sesi === idS) || list[list.length - 1];
    const k = K.tes(t), judulGrafik = { VARK: 'Komposisi Gaya Belajar', MI: 'Profil 9 Kecerdasan', RIASEC: 'Peta Minat Karier', PS: '4 Dimensi Gaya Pribadi' }[t];
    el.innerHTML = `${backBar('Hasil ' + k.nama + ' (' + (k.subjudul || '') + ')', 'beranda')}
      ${list.length > 1 ? `<div class="row wrap" style="gap:8px;margin-bottom:14px">${list.map(x => `<a class="chip ${x.id_sesi === h.id_sesi ? 'on' : ''}" href="#/hasil/${t}~${x.id_sesi}">${esc(x.nama_periode)}</a>`).join('')}</div>` : ''}
      <div class="stack">${heroHasil(h)}<div class="card"><h3 style="margin-bottom:16px">${judulGrafik}</h3>${grafikHasil(h)}</div>${kontenHasil(h)}</div>
      <p class="disclaimer">Tes ini alat pengenalan diri, bukan diagnosis psikologis.</p>
      <div class="stack-sm"><button class="btn block" id="hPdf" style="min-height:52px">${ic('download')} Unduh PDF</button>
      <div class="grid g2" style="grid-template-columns:1fr 1fr;gap:10px"><a class="btn outline" href="#/tinjau/${t}">Tinjau Jawaban</a><a class="btn line" href="#/profil">Profil Lengkap</a></div></div>`;
    $('#hPdf', el).onclick = () => unduhPdf(dataSiswaLap(), [h], 'tes', `Hasil-${t}-${AppState.user.nama.replace(/\s+/g, '_')}.pdf`);
  }
});
function dataSiswaLap() { const u = AppState.user; return { nama: u.nama, unit: u.unit, kelas: u.kelas, kategori: u.kategori, uji: u.role === 'UJI' }; }

/* ============================================================
   TINJAU JAWABAN (hanya baca)
   ============================================================ */
registerPage('tinjau', {
  title: 'Tinjau Jawaban', nav: 'profil', fresh: true,
  show(el, t) {
    const k = K.tes(t);
    el.innerHTML = backBar('Tinjau Jawaban — ' + k.nama) + skel(4, 110);
    swr('jw:' + t, 'jawabanSaya', { tes: t }, d => {
      const soal = Object.fromEntries(K.soal(t).map(s => [s.id, s]));
      const ids = (d.urutan && d.urutan.length ? d.urutan : Object.keys(d.jawaban)).filter(id => soal[id]);
      const dims = t === 'VARK' ? [] : t === 'PS' ? [['EI', 'E/I'], ['SN', 'S/N'], ['TF', 'T/F'], ['JP', 'J/P']] : K.dim(t);
      const teks = (s, v) => {
        if (t === 'VARK' || t === 'PS') { const o = (s.opsi || []).find(x => x.k === v); return o ? o.t : '-'; }
        if (t === 'MI') return (SKALA_MI.find(x => x[0] === Number(v)) || [, '-'])[1];
        return (PILIH_RIASEC.find(x => x[0] === Number(v)) || [, '-'])[1];
      };
      const render = f => ids.filter(id => !f || soal[id].dimensi === f).map((id, i) => `<div class="card pad-s"><div class="q-num">Pertanyaan ${ids.indexOf(id) + 1}</div><p style="margin:4px 0 10px;font-weight:600">${esc(soal[id].teks)}</p><div class="opt on" style="min-height:48px;padding:10px 14px;cursor:default"><span class="grow">${esc(teks(soal[id], d.jawaban[id]))}</span><span class="ck">${ic('check', 'ic-sm')}</span></div></div>`).join('');
      el.innerHTML = `${backBar('Tinjau Jawaban — ' + k.nama)}<div class="card tint-p row" style="padding:12px 16px;margin-bottom:14px">${ic('lock')}<b>Mode baca saja</b><span class="small">— jawaban tidak bisa diubah.</span></div>
        ${dims.length ? `<div class="row wrap" style="gap:8px;margin-bottom:14px" id="tjF"><button class="chip on" data-f="">Semua</button>${dims.map(d2 => `<button class="chip" data-f="${d2[0]}">${esc(d2[1])}</button>`).join('')}</div>` : ''}
        <div class="stack-sm" id="tjList">${render('')}</div>`;
      $$('#tjF .chip', el).forEach(c => c.onclick = () => { $$('#tjF .chip', el).forEach(x => x.classList.toggle('on', x === c)); $('#tjList', el).innerHTML = render(c.dataset.f); });
    }, { fresh: 86400000, onError: r => { el.innerHTML = backBar('Tinjau Jawaban') + gagal(r.message, "route()"); } });
  }
});

/* ============================================================
   PROFIL LENGKAP SAYA
   ============================================================ */
registerPage('profil', {
  title: 'Profil Saya', nav: 'profil',
  show(el) {
    if (!AppState.boot) { el.innerHTML = skel(4, 140); return; }
    const u = AppState.user, terakhir = TES.map(hasilTerakhir).filter(Boolean);
    el.innerHTML = `<div class="row between wrap" style="margin-bottom:16px"><div><h2>Profil Lengkap Saya</h2><p class="muted small">${esc(u.kelas ? u.unit + ' • ' + u.kelas : (u.kategori || 'Uji Coba'))}</p></div>
      <button class="btn" id="pfPdf" ${terakhir.length ? '' : 'disabled'}>${ic('download')} Unduh PDF Profil Gabungan</button></div>
      <div class="grid g2">${TES.map(t => {
        const h = hasilTerakhir(t), k = K.tes(t), inf = INFO_TES[t];
        if (!h) return `<div class="card" style="border:2px dashed var(--line-2);box-shadow:none"><div class="row"><div class="ill test-card" style="width:48px;height:48px;border-radius:12px;display:grid;place-items:center;background:${inf.bg};color:${inf.fg}">${ic(inf.ikon)}</div><div class="grow"><div class="xs bold muted">${esc(k.nama)}</div><h3>Belum dikerjakan</h3></div></div>
          <a class="btn outline block" style="margin-top:16px" href="#/${statusTes(t) === 'DRAF' ? 'tes' : 'intro'}/${t}" ${tesDibuka(t) ? '' : 'hidden'}>Kerjakan Sekarang</a></div>`;
        return `<a class="card hover" href="#/hasil/${t}" style="color:inherit"><div class="row" style="margin-bottom:10px"><span class="dot" style="background:${inf.fg}"></span><span class="xs bold muted">${esc(k.nama)}</span></div>
          <h3 style="font-size:20px">${esc(judulHasil(h))}</h3><p class="small muted" style="margin:4px 0 12px">${esc(ringkas(h))}</p>${miniGrafik(h)}<span class="link small" style="display:inline-block;margin-top:10px">Lihat detail ${ic('arrow-right', 'ic-sm')}</span></a>`;
      }).join('')}</div>`;
    $('#pfPdf', el).onclick = () => unduhPdf(dataSiswaLap(), terakhir, 'gabungan', `Profil-Gabungan-${u.nama.replace(/\s+/g, '_')}.pdf`);
  }
});
function miniGrafik(h) {
  const sk = h.skor, W = WARNA[h.tes];
  if (h.tes === 'PS') return `<div class="row" style="gap:6px">${h.tipe.split('').map(c => `<span style="flex:1;text-align:center;padding:8px 0;border-radius:10px;background:${W[c]}22;color:${W[c]};font:700 18px Poppins">${c}</span>`).join('')}</div>`;
  const top = Object.entries(sk).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return top.map(([k, v]) => `<div class="row small" style="gap:8px;margin-top:6px"><span style="width:110px">${esc(K.namaDim(h.tes, k))}</span><div class="bar thin grow"><i style="width:${v}%;background:${W[k]}"></i></div><b style="width:34px;text-align:right">${v}</b></div>`).join('');
}

/* ============================================================
   PERKEMBANGAN SAYA
   ============================================================ */
let tabPerk = 'VARK';
registerPage('perkembangan', {
  title: 'Perkembangan Saya', nav: 'perkembangan',
  show(el) {
    if (!AppState.boot) { el.innerHTML = skel(3, 160); return; }
    if (AppState.role === 'UJI') { el.innerHTML = `<h2 style="margin-bottom:16px">Perkembangan Saya</h2>` + kosong('Khusus akun siswa', 'Grafik perkembangan antarperiode tersedia untuk siswa yang mengikuti tes rutin setiap tahun.', 'trending-up'); return; }
    const render = () => {
      const t = tabPerk, list = AppState.boot.hasil.filter(h => h.tes === t), dims = K.dim(t);
      let isi;
      if (list.length < 2) isi = kosong('Belum ada perbandingan', 'Grafik perkembangan muncul setelah kamu ikut tes ini 2 kali atau lebih (biasanya setiap tahun ajaran).', 'chart-line', list.length ? `<a class="btn outline" href="#/hasil/${t}">Lihat hasil terakhir</a>` : '');
      else {
        const lab = list.map(h => singkatPeriode(h.nama_periode)), a = list[list.length - 2], b = list[list.length - 1];
        const series = dims.map(d => ({ name: d[1], c: WARNA[t][d[0]], vals: list.map(h => h.skor[d[0]] || 0) }));
        const diff = dims.map(d => [d, (b.skor[d[0]] || 0) - (a.skor[d[0]] || 0)]).filter(x => x[1]).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 4);
        isi = `<div class="card"><h3 style="margin-bottom:12px">Skor per Dimensi Antarperiode</h3>${Chart.line(lab, series)}
          <div class="row wrap" style="gap:10px;margin-top:10px">${series.map(s => `<span class="small row" style="gap:6px"><span class="dot" style="background:${s.c}"></span>${esc(s.name)}</span>`).join('')}</div></div>
          ${t !== 'PS' ? `<div class="card"><h3 style="margin-bottom:6px">Perbandingan Profil</h3><p class="small muted" style="margin-bottom:8px"><span style="color:#94A3B8">- - -</span> ${esc(a.nama_periode)} &nbsp; <b style="color:var(--p)">——</b> ${esc(b.nama_periode)}</p><div class="chart-box">${Chart.radar(dims.map(d => d[1].split('-')[0]), [{ vals: dims.map(d => a.skor[d[0]] || 0), c: '#94A3B8', dash: 1, fill: .05 }, { vals: dims.map(d => b.skor[d[0]] || 0), c: cssVar('--p') }])}</div></div>` : `<div class="card"><h3>Tipe: ${esc(a.tipe)} → ${esc(b.tipe)}</h3></div>`}
          <div class="card"><h3 style="margin-bottom:10px">Perubahan Terbesar</h3><div class="row wrap" style="gap:8px">${diff.map(([d, v]) => `<span class="badge ${v > 0 ? 'b-green' : 'b-red'}" style="font-size:13px;padding:6px 12px">${v > 0 ? '+' : ''}${v}% ${esc(d[1])}</span>`).join('') || '<span class="muted">Tidak ada perubahan.</span>'}</div></div>`;
      }
      $('#perkIsi', el).innerHTML = isi;
    };
    el.innerHTML = `<h2 style="margin-bottom:12px">Perkembangan Saya</h2><div class="tabs" style="margin-bottom:16px" id="perkTab">${TES.map(t => `<button class="${t === tabPerk ? 'on' : ''}" data-t="${t}">${esc(K.tes(t).nama)}</button>`).join('')}</div><div class="stack" id="perkIsi"></div>`;
    $$('#perkTab button', el).forEach(b => b.onclick = () => { tabPerk = b.dataset.t; $$('#perkTab button', el).forEach(x => x.classList.toggle('on', x === b)); render(); });
    render();
  }
});

/* ============================================================
   AKUN (peserta)
   ============================================================ */
registerPage('akun', {
  title: 'Akun', nav: 'akun',
  show(el) {
    const u = AppState.user || {}, tema = document.documentElement.dataset.tema || 'ungu';
    el.innerHTML = `<h2 style="margin-bottom:16px">Akun Saya</h2><div class="stack">
      <div class="card row" style="gap:16px"><div class="avatar" style="width:64px;height:64px;font-size:22px">${esc(inisial(u.nama))}</div><div class="grow"><h3>${esc(u.nama)}</h3><p class="muted small">${u.role === 'UJI' ? 'Akun Uji Coba • ' + esc(u.kategori) : esc(u.unit + ' • Kelas ' + u.kelas)}</p></div></div>
      ${u.role === 'UJI' ? `<div class="card"><h3 style="margin-bottom:8px">Kode Lanjut</h3><p class="small muted" style="margin-bottom:10px">Gunakan untuk melanjutkan di perangkat lain.</p><div class="row"><div class="grow" style="font:800 26px Poppins;letter-spacing:8px;color:var(--p)">${esc(u.kode)}</div><button class="btn line sm" id="akCopy">${ic('copy', 'ic-sm')} Salin</button></div></div>` : ''}
      <button class="card row hover" style="width:100%;text-align:left;border:0" onclick="pilihTema()">${ic('palette')}<span class="grow"><b>Tema Tampilan</b><br><span class="small muted">${TEMA[tema].nama}</span></span>${ic('chevron-right')}</button>
      <div class="card"><h3 style="margin-bottom:6px">Tentang Tes</h3><p class="small muted">Keempat tes adalah alat pengenalan diri, bukan diagnosis psikologis. Hasil bisa berubah seiring kamu bertumbuh. Diskusikan hasilmu dengan wali kelas, Guru BK, atau orang tua.</p></div>
      <button class="btn danger-soft block" onclick="keluarKonfirmasi()">${ic('log-out')} Keluar</button></div>`;
    const c = $('#akCopy', el); if (c) c.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(u.kode); toast('Kode disalin', 'success', 1500); };
  }
});
