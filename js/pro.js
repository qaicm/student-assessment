/* ============================================================
   pro.js — Modul PRO: WhatsApp & Notifikasi (Fonnte + Email),
   CRM Kontak, Migrasi Data, Sistem & Performa, dan PWA (pasang di HP).
   Semua data dibaca lewat SWR (tampil seketika dari cache perangkat)
   dan beberapa baca digabung ke 1 eksekusi server (apiQ → batch).
   ============================================================ */
'use strict';
const PRO = { crm: null, blastPreset: null, pollT: null };
const fmtAngka = n => Number(n || 0).toLocaleString('id-ID');
const switchHtml = (id, on, label, sub, disabled) => `<label class="sw-row"><span class="grow"><b>${label}</b>${sub ? '<br><span class="small muted">' + sub + '</span>' : ''}</span><span class="switch"><input type="checkbox" id="${id}" ${on ? 'checked' : ''} ${disabled ? 'disabled' : ''}><i></i></span></label>`;
const badgeStatus = s => `<span class="badge ${{ Terkirim: 'b-green', Selesai: 'b-green', Antri: 'b-amber', Kirim: 'b-blue', Berjalan: 'b-blue', Gagal: 'b-red', Batal: '', Dihentikan: '' }[s] || ''}">${esc(s)}</span>`;
const waStatusBadge = s => s === 'Terdaftar' ? `<span class="badge b-green">${ic('circle-check', 'ic-sm')} WA</span>` : s === 'Tidak Terdaftar' ? '<span class="badge b-red">Bukan WA</span>' : '<span class="badge">Belum dicek</span>';
const PH = ['{nama}', '{sekolah}', '{link}'];
function renderWa(t) { return esc(t).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/_([^_\n]+)_/g, '<i>$1</i>').replace(/\n/g, '<br>'); }
function minta(judul, label, saran) {
  return new Promise(res => {
    const m = modal(`<h3>${esc(judul)}</h3><label class="field" style="margin:12px 0"><span>${esc(label)}</span><input class="input" id="mtV" list="mtL"><datalist id="mtL">${(saran || []).map(s => `<option>${esc(s)}</option>`).join('')}</datalist></label><div class="row" style="justify-content:flex-end"><button class="btn line" data-n>Batal</button><button class="btn" data-y>OK</button></div>`);
    const ok = () => { const v = $('#mtV', m).value.trim(); closeModal(); res(v); };
    m.querySelector('[data-n]').onclick = () => { closeModal(); res(''); };
    m.querySelector('[data-y]').onclick = ok; $('#mtV', m).onkeydown = e => { if (e.key === 'Enter') ok(); };
  });
}
function stopPoll() { clearInterval(PRO.pollT); PRO.pollT = null; }
window.addEventListener('hashchange', stopPoll);

/* ============================================================
   WHATSAPP & NOTIFIKASI
   ============================================================ */
registerPage('notifikasi', {
  auth: ['ADMIN', 'BK'], shell: 'staf', title: () => AppState.role === 'ADMIN' ? 'WhatsApp & Notifikasi' : 'Blast WhatsApp',
  show(el, param) {
    const admin = AppState.role === 'ADMIN';
    const tabs = admin ? [['pengaturan', 'Pengaturan', 'settings'], ['blast', 'Blast WA', 'send'], ['riwayat', 'Riwayat Blast', 'list'], ['antrean', 'Antrean & Log', 'inbox']] : [['blast', 'Blast WA', 'send'], ['riwayat', 'Riwayat Blast', 'list']];
    const tab = tabs.some(t => t[0] === param) ? param : tabs[0][0];
    el.innerHTML = `<div class="stack"><div class="tabs" role="tablist">${tabs.map(t => `<button role="tab" class="${t[0] === tab ? 'on' : ''}" data-tab="${t[0]}">${ic(t[2], 'ic-sm')} ${t[1]}</button>`).join('')}</div><div id="nfBody"></div></div>`;
    $$('[data-tab]', el).forEach(b => b.onclick = () => go('notifikasi', b.dataset.tab));
    const body = $('#nfBody', el);
    ({ pengaturan: tabPengaturan, blast: tabBlast, riwayat: tabRiwayat, antrean: tabAntrean })[tab](body);
  }
});

/* ---------- Tab Pengaturan (ADMIN) ---------- */
function tabPengaturan(box) {
  box.innerHTML = skel(3, 140);
  swr('notifcfg', 'notifConfig', {}, d => renderPengaturan(box, d), { fresh: 30000, onError: r => box.innerHTML = gagal(r.message, "route()") });
}
function renderPengaturan(box, d) {
  const m = JSON.parse(JSON.stringify(d.matriks));
  box.innerHTML = `<div class="stack" style="padding-bottom:80px">
    ${!d.triggerAktif ? `<div class="card tint-amber small">${ic('triangle-alert', 'ic-sm')} Trigger <b>pekerjaMenit</b> belum terpasang — antrean hanya terkirim saat aplikasi dibuka. Jalankan <b>setupAppEnvironment</b> sekali lagi di editor Apps Script.</div>` : ''}
    <div class="grid g2">
      <div class="card stack"><h3>${ic('zap', 'ic-sm')} Saklar Utama</h3>
        ${switchHtml('nfWa', d.waAktif, 'WhatsApp (Fonnte)', d.tokenAda ? 'Token tersimpan: <code>' + esc(d.token) + '</code>' : 'Isi token Fonnte dulu', !d.tokenAda && !d.waAktif)}
        ${switchHtml('nfEm', d.emailAktif, 'Email (Gmail)', 'Sisa kuota hari ini: <b>' + (d.kuotaEmail < 0 ? '-' : fmtAngka(d.kuotaEmail)) + '</b> email')}
        <p class="xs muted">Notifikasi dikirim lewat antrean (tombol tetap instan). Jika saklar dimatikan, tidak ada pesan otomatis yang dibuat.</p></div>
      <div class="card stack"><h3>${ic('key-round', 'ic-sm')} Token Fonnte</h3>
        <p class="small muted">Token disimpan di <b>Script Properties</b> server — tidak pernah tampil utuh, tidak tersimpan di Sheets atau di perangkat ini.</p>
        <div class="row"><input class="input grow" type="password" id="nfTok" autocomplete="off" placeholder="${d.tokenAda ? esc(d.token) + ' (kosongkan bila tidak diganti)' : 'Tempel token dari dashboard Fonnte'}"><button class="btn" id="nfTokOk">Simpan</button></div>
        <div class="row wrap">${d.tokenAda ? `<button class="btn line sm" id="nfDev">${ic('smartphone', 'ic-sm')} Cek Perangkat</button><button class="btn danger-soft sm" id="nfTokDel">${ic('trash-2', 'ic-sm')} Hapus Token</button>` : ''}</div><div id="nfDevBox" class="small"></div></div>
    </div>
    <div class="grid g2">
      <div class="card stack"><h3>${ic('send', 'ic-sm')} Pengaturan Blast</h3>
        <div class="field"><span>Ukuran batch default</span><div class="seg" id="nfBatch">${[10, 20, 50].map(n => `<button type="button" class="${d.batchDefault === n ? 'on' : ''}" data-n="${n}">${n} pesan</button>`).join('')}</div></div>
        <label class="field"><span>Jeda antarpesan (detik) <span class="muted">— boleh acak, mis. 3-8</span></span><input class="input" id="nfJeda" value="${esc(d.jeda)}" style="max-width:160px"></label>
        ${switchHtml('nfDet', d.deteksiOtomatis, 'Deteksi nomor WA otomatis', 'Kontak baru dicek ±10 menit sekali (maks 50/putaran)')}</div>
      <div class="card stack"><h3>${ic('mail', 'ic-sm')} Pengirim & Tautan</h3>
        <label class="field"><span>Nama pengirim email</span><input class="input" id="nfNama" value="${esc(d.namaPengirim)}" placeholder="Default: nama sekolah"></label>
        <label class="field"><span>URL aplikasi untuk {link}</span><div class="row"><input class="input grow" id="nfUrl" value="${esc(d.appUrl)}" placeholder="https://username.github.io/student-assessment/"><button class="btn line sm" id="nfUrlAuto">Pakai alamat ini</button></div></label>
        <div class="row wrap"><input class="input grow" id="nfTesNo" type="tel" placeholder="Nomor WA uji, 0812…" style="min-width:160px"><button class="btn line sm" id="nfTesWa" ${d.tokenAda ? '' : 'disabled'}>${ic('message-circle', 'ic-sm')} Tes WA</button><button class="btn line sm" id="nfTesEm">${ic('mail', 'ic-sm')} Tes Email ke saya</button></div></div>
    </div>
    <div class="card" style="padding:0"><div class="card-h" style="padding:20px 20px 0"><div><h3>Matriks Notifikasi</h3><p class="xs muted">Pilih kejadian apa saja yang dikirim, lewat kanal apa. Klik ✏️ untuk mengubah isi pesan.</p></div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kejadian</th><th>Penerima</th><th style="text-align:center">WhatsApp</th><th style="text-align:center">Email</th><th></th></tr></thead><tbody>${m.map((x, i) => `<tr><td><b>${esc(x.label)}</b>${x.pesan !== x.pesanDefault || x.subjek !== x.subjekDefault ? ' <span class="badge b-p">diubah</span>' : ''}</td><td class="small">${esc(x.penerima)}</td>
        <td style="text-align:center"><span class="switch sm"><input type="checkbox" data-mw="${i}" ${x.wa ? 'checked' : ''} aria-label="WhatsApp ${esc(x.label)}"><i></i></span></td><td style="text-align:center"><span class="switch sm"><input type="checkbox" data-me="${i}" ${x.email ? 'checked' : ''} aria-label="Email ${esc(x.label)}"><i></i></span></td>
        <td style="text-align:right"><button class="icon-btn" data-ed="${i}" aria-label="Ubah templat">${ic('pencil')}</button></td></tr>`).join('')}</tbody></table></div></div>
    <div class="pg-bar" style="position:fixed;bottom:0;left:var(--side-w);right:0;background:var(--surface);border-top:1px solid var(--line);padding:12px 24px;display:flex;justify-content:flex-end;gap:10px;z-index:20"><button class="btn" id="nfOk">${ic('save')} Simpan Pengaturan</button></div></div>`;
  let batch = d.batchDefault;
  $$('#nfBatch [data-n]', box).forEach(b => b.onclick = () => { batch = Number(b.dataset.n); $$('#nfBatch [data-n]', box).forEach(x => x.classList.toggle('on', x === b)); });
  $$('[data-mw]', box).forEach(c => c.onchange = () => { m[c.dataset.mw].wa = c.checked; });
  $$('[data-me]', box).forEach(c => c.onchange = () => { m[c.dataset.me].email = c.checked; });
  $$('[data-ed]', box).forEach(b => b.onclick = () => editTemplat(m[b.dataset.ed]));
  $('#nfUrlAuto', box).onclick = () => { $('#nfUrl', box).value = location.origin + location.pathname.replace(/index\.html$/, ''); };
  const segar = () => { Store.del(userKey('notifcfg')); route(); };
  $('#nfTokOk', box).onclick = async () => {
    const v = $('#nfTok', box).value.trim(); if (!v) return toast('Tempel token terlebih dahulu.', 'warning');
    const r = await api('simpanRahasia', { kunci: 'FONNTE_TOKEN', nilai: v }); $('#nfTok', box).value = '';
    toast(r.success ? 'Token tersimpan (' + r.data.samar + ')' : r.message, r.success ? 'success' : 'error'); if (r.success) segar();
  };
  const del = $('#nfTokDel', box); if (del) del.onclick = async () => { if (!await konfirmasi('Hapus token Fonnte?', 'WhatsApp otomatis dinonaktifkan sampai token baru diisi.', 'Hapus', true)) return; const r = await api('simpanRahasia', { kunci: 'FONNTE_TOKEN', nilai: '__HAPUS__' }); toast(r.message, r.success ? 'success' : 'error'); if (r.success) segar(); };
  const dev = $('#nfDev', box); if (dev) dev.onclick = async () => { dev.disabled = true; const r = await api('waDevice', {}); dev.disabled = false; $('#nfDevBox', box).innerHTML = r.success ? `<div class="note">${ic(r.data.status === 'connect' ? 'circle-check' : 'triangle-alert', 'ic-sm')} Perangkat <b>${esc(r.data.device)}</b> — ${r.data.status === 'connect' ? '<span style="color:var(--green)">terhubung</span>' : '<span style="color:var(--red)">' + esc(r.data.status || 'terputus') + '</span>'} • Paket ${esc(r.data.paket)} • Kuota ${esc(r.data.kuota)} • s/d ${esc(r.data.kedaluwarsa)}</div>` : `<div class="note" style="color:var(--red)">${esc(r.message)}</div>`; };
  $('#nfTesWa', box).onclick = async () => { const n = $('#nfTesNo', box).value.trim(); if (!n) return toast('Isi nomor WA uji.', 'warning'); const r = await api('waTest', { nomor: n }); toast(r.message, r.success ? 'success' : 'error', 5000); };
  $('#nfTesEm', box).onclick = async () => { const r = await api('emailTest', { email: AppState.user.email }); toast(r.message, r.success ? 'success' : 'error', 5000); };
  $('#nfOk', box).onclick = async () => {
    const btn = $('#nfOk', box); btn.disabled = true;
    const r = await api('notifConfigSave', { waAktif: $('#nfWa', box).checked, emailAktif: $('#nfEm', box).checked, batchDefault: batch, jeda: $('#nfJeda', box).value.trim(), deteksiOtomatis: $('#nfDet', box).checked, namaPengirim: $('#nfNama', box).value.trim(), appUrl: $('#nfUrl', box).value.trim(), matriks: m });
    btn.disabled = false; toast(r.success ? 'Pengaturan notifikasi tersimpan.' : r.message, r.success ? 'success' : 'error');
    if (r.success) { Store.set(userKey('notifcfg'), { t: Date.now(), h: '', data: r.data }); renderPengaturan(box, r.data); }
  };
}
function editTemplat(x) {
  const box = slideOver('Templat: ' + x.label, `<div class="stack"><div class="note small">Placeholder umum: ${PH.map(p => '<code>' + p + '</code>').join(' ')} + variabel khusus kejadian (lihat templat bawaan). Format WA: <code>*tebal*</code>, <code>_miring_</code>.</div>
    <label class="field"><span>Subjek email</span><input class="input" id="tpS" value="${esc(x.subjek)}"></label>
    <label class="field"><span>Isi pesan (WA & email)</span><textarea class="textarea" id="tpP" rows="9">${esc(x.pesan)}</textarea></label>
    <div class="field"><span>Pratinjau WhatsApp</span><div class="wa-bubble" id="tpPrev"></div></div>
    <details class="small"><summary class="muted">Templat bawaan</summary><pre class="pre">${esc(x.pesanDefault)}</pre></details></div>`,
    `<button class="btn line" id="tpReset">Kembalikan bawaan</button><button class="btn" id="tpOk">Terapkan</button>`);
  const prev = () => { $('#tpPrev', box).innerHTML = renderWa($('#tpP', box).value); };
  $('#tpP', box).oninput = prev; prev();
  $('#tpReset', box).onclick = () => { $('#tpS', box).value = x.subjekDefault; $('#tpP', box).value = x.pesanDefault; prev(); };
  $('#tpOk', box).onclick = () => { x.subjek = $('#tpS', box).value.trim() || x.subjekDefault; x.pesan = $('#tpP', box).value.trim() || x.pesanDefault; closeModal(); toast('Templat diterapkan — klik Simpan Pengaturan.', 'info'); };
}

/* ---------- Tab Blast ---------- */
const BL = { sumber: 'crm', f: {}, rows: [], ring: null, pesan: 'Yth. {nama},\n\n', judul: '', batch: 0, jeda: '' };
function tabBlast(box) {
  const admin = AppState.role === 'ADMIN';
  if (PRO.blastPreset) { BL.sumber = 'pilihan'; }
  const segmen = admin ? ['', 'Siswa', 'Wali', 'Staf', 'Peserta Uji Coba', 'Manual'] : ['', 'Siswa', 'Wali'];
  const crm = (PRO.crm && PRO.crm.rows) || [];
  const tags = [...new Set(crm.flatMap(r => String(r[6] || '').split(',').filter(Boolean)))].sort();
  const kelas = [...new Set(crm.map(r => r[12]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  box.innerHTML = `<div class="grid g2" style="align-items:start"><div class="card stack"><h3>1. Pilih Penerima</h3>
      <div class="seg" id="blSrc"><button type="button" data-s="crm" class="${BL.sumber === 'crm' ? 'on' : ''}">Dari CRM</button>${PRO.blastPreset ? `<button type="button" data-s="pilihan" class="${BL.sumber === 'pilihan' ? 'on' : ''}">Pilihan CRM (${PRO.blastPreset.length})</button>` : ''}${admin ? `<button type="button" data-s="manual" class="${BL.sumber === 'manual' ? 'on' : ''}">Daftar Manual</button>` : ''}</div>
      <div id="blFilter" class="stack-sm"></div>
      <button class="btn soft" id="blLoad">${ic('users', 'ic-sm')} Muat Penerima</button>
      <div id="blRing"></div></div>
    <div class="card stack"><h3>2. Tulis Pesan</h3>
      <label class="field"><span>Judul blast <span class="muted">(untuk riwayat)</span></span><input class="input" id="blJudul" maxlength="100" value="${esc(BL.judul)}" placeholder="Mis. Undangan Rapat Orang Tua"></label>
      <label class="field"><span>Isi pesan</span><textarea class="textarea" id="blPesan" rows="8" maxlength="2000">${esc(BL.pesan)}</textarea></label>
      <div class="row wrap" style="gap:6px">${PH.map(p => `<button type="button" class="chip" data-ph="${p}">${p}</button>`).join('')}<span class="grow"></span><span class="xs muted" id="blLen"></span></div>
      <div class="field"><span>Pratinjau (penerima pertama)</span><div class="wa-bubble" id="blPrev"></div></div>
      <div class="row wrap"><div class="field"><span>Pesan per batch</span><div class="seg" id="blBatch">${[10, 20, 50].map(n => `<button type="button" data-n="${n}" class="${(BL.batch || 20) === n ? 'on' : ''}">${n}</button>`).join('')}</div></div>
        <label class="field"><span>Jeda (detik)</span><input class="input" id="blJeda" value="${esc(BL.jeda || '5')}" style="width:110px"></label></div>
      <div class="note xs">${ic('shield-check', 'ic-sm')} Anti-banned: dikirim bertahap per batch tiap ±1 menit dengan jeda acak. Kontak <b>opt-out</b> & nomor ganda otomatis dilewati.</div>
      <button class="btn block" id="blKirim" disabled>${ic('send', 'ic-sm')} Buat Blast</button></div></div>`;
  const filter = () => {
    const f = $('#blFilter', box);
    if (BL.sumber === 'manual') f.innerHTML = `<label class="field"><span>Satu baris per penerima: <code>0812xxxx | Nama</code></span><textarea class="textarea" id="blManual" rows="7" placeholder="081234567890 | Bapak Hadi\n085712345678 | Ibu Sri">${esc(BL.manual || '')}</textarea></label>`;
    else if (BL.sumber === 'pilihan') f.innerHTML = `<div class="note small">${PRO.blastPreset.length} kontak dipilih dari CRM. <button class="link small" id="blClear">Batalkan pilihan</button></div>`;
    else f.innerHTML = `<div class="grid g2"><label class="field"><span>Segmen</span><select class="select" id="blSeg">${segmen.map(s => `<option value="${s}" ${BL.f.segmen === s ? 'selected' : ''}>${s || 'Semua segmen'}</option>`).join('')}</select></label>
      <label class="field"><span>Kelas</span><select class="select" id="blKls"><option value="">Semua kelas</option>${kelas.map(k => `<option ${BL.f.kelas === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
      <label class="field"><span>Tag</span><select class="select" id="blTag"><option value="">Semua tag</option>${tags.map(t => `<option ${BL.f.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <label class="field"><span>Status WA</span><select class="select" id="blSt"><option value="">Semua nomor</option><option value="Terdaftar" ${BL.f.statusWA === 'Terdaftar' ? 'selected' : ''}>Hanya terdaftar WA</option><option value="Belum" ${BL.f.statusWA === 'Belum' ? 'selected' : ''}>Belum dicek</option></select></label></div>`;
    const c = $('#blClear', box); if (c) c.onclick = () => { PRO.blastPreset = null; BL.sumber = 'crm'; tabBlast(box); };
  };
  filter();
  if (!PRO.crm && BL.sumber !== 'manual' && !BL._muat) { BL._muat = true; muatCrm(() => { if (box.isConnected && $('#blSeg', box) && !BL._isi) { BL._isi = true; tabBlast(box); } }); }
  $$('#blSrc [data-s]', box).forEach(b => b.onclick = () => { BL.sumber = b.dataset.s; BL.rows = []; BL.ring = null; $$('#blSrc [data-s]', box).forEach(x => x.classList.toggle('on', x === b)); filter(); ring(); });
  $$('#blBatch [data-n]', box).forEach(b => b.onclick = () => { BL.batch = Number(b.dataset.n); $$('#blBatch [data-n]', box).forEach(x => x.classList.toggle('on', x === b)); });
  const ta = $('#blPesan', box);
  const prev = () => { BL.pesan = ta.value; const r0 = BL.rows.find(x => x.valid && !x.ganda && !x.optOut) || { nama: 'Bapak/Ibu' }; $('#blPrev', box).innerHTML = renderWa(ta.value.replace(/\{nama\}/g, r0.nama || 'Bapak/Ibu').replace(/\{sekolah\}/g, (AppState.sekolah || {}).nama_sekolah || '').replace(/\{link\}/g, location.origin + location.pathname)); $('#blLen', box).textContent = ta.value.length + '/2000'; cekSiap(); };
  ta.oninput = prev;
  $$('[data-ph]', box).forEach(b => b.onclick = () => { const s = ta.selectionStart || ta.value.length; ta.value = ta.value.slice(0, s) + b.dataset.ph + ta.value.slice(ta.selectionEnd || s); ta.focus(); prev(); });
  $('#blJudul', box).oninput = e => { BL.judul = e.target.value; cekSiap(); };
  function siap() { return BL.ring && BL.ring.valid > 0 && $('#blJudul', box).value.trim() && ta.value.trim(); }
  function cekSiap() { $('#blKirim', box).disabled = !siap(); }
  function ring() {
    const r = BL.ring, el = $('#blRing', box);
    if (!r) { el.innerHTML = ''; cekSiap(); return; }
    const belum = BL.rows.filter(x => x.valid && !x.statusWA && !x.ganda).length;
    el.innerHTML = `<div class="row wrap" style="gap:6px"><span class="badge b-p">${fmtAngka(r.total)} total</span><span class="badge b-green">${fmtAngka(r.valid)} akan dikirim</span>${r.ganda ? `<span class="badge b-amber">${r.ganda} ganda</span>` : ''}${r.tidakValid ? `<span class="badge b-red">${r.tidakValid} nomor salah</span>` : ''}${r.optOut ? `<span class="badge">${r.optOut} opt-out</span>` : ''}${r.terdaftarWA ? `<span class="badge b-green">${r.terdaftarWA} terdaftar WA</span>` : ''}${r.tidakTerdaftarWA ? `<span class="badge b-red">${r.tidakTerdaftarWA} bukan WA</span>` : ''}</div>
      ${belum && BL.sumber !== 'manual' ? `<div class="row" style="margin-top:10px"><button class="btn line sm" id="blCek">${ic('shield-check', 'ic-sm')} Cek ${belum} nomor ke WhatsApp</button><span class="xs muted" id="blCekSt"></span></div>` : ''}
      <div class="tbl-wrap" style="max-height:220px;overflow:auto;margin-top:10px"><table class="tbl"><tbody>${BL.rows.slice(0, 200).map(x => `<tr class="${!x.valid ? 'row-err' : x.ganda || x.optOut ? 'row-warn' : ''}"><td>${esc(x.nama || '-')}<div class="xs muted">${esc(x.segmen || '')}${x.kelas ? ' • ' + esc(x.kelas) : ''}</div></td><td class="small">${esc(x.hp)}</td><td>${!x.valid ? '<span class="badge b-red">salah</span>' : x.ganda ? '<span class="badge b-amber">ganda</span>' : x.optOut ? '<span class="badge">opt-out</span>' : waStatusBadge(x.statusWA)}</td></tr>`).join('')}</tbody></table>${BL.rows.length > 200 ? '<p class="xs muted center">… ' + (BL.rows.length - 200) + ' lainnya</p>' : ''}</div>`;
    const cb = $('#blCek', el); if (cb) cb.onclick = () => cekNomor(cb);
    prev();
  }
  async function cekNomor(btn) {
    const list = [...new Set(BL.rows.filter(x => x.valid && !x.statusWA && !x.ganda).map(x => x.hp))];
    btn.disabled = true; let done = 0, ok = 0;
    for (let i = 0; i < list.length; i += 50) {
      $('#blCekSt', box).textContent = `Mengecek ${Math.min(list.length, i + 50)}/${list.length}…`;
      const r = await api('waValidate', { nomor: list.slice(i, i + 50) });
      if (!r.success) { toast(r.message, 'error', 6000); break; }
      Object.keys(r.data.peta).forEach(h => BL.rows.filter(x => x.hp === h).forEach(x => { x.statusWA = r.data.peta[h]; }));
      done += r.data.dicek; ok += r.data.terdaftar;
    }
    BL.ring.terdaftarWA = BL.rows.filter(x => x.statusWA === 'Terdaftar').length; BL.ring.tidakTerdaftarWA = BL.rows.filter(x => x.statusWA === 'Tidak Terdaftar').length;
    Store.del(userKey('crm')); PRO.crm = null;
    toast(`${done} nomor dicek, ${ok} terdaftar WhatsApp.`, 'success'); ring();
  }
  $('#blLoad', box).onclick = async () => {
    const btn = $('#blLoad', box); btn.disabled = true;
    let r;
    if (BL.sumber === 'manual') { BL.manual = $('#blManual', box).value; r = await api('waAudience', { sumber: 'manual', teks: BL.manual }); }
    else if (BL.sumber === 'pilihan') {
      const ids = new Set(PRO.blastPreset); r = await api('waAudience', {});
      if (r.success) { r.data.rows = r.data.rows.filter(x => ids.has(x.id)); r = await hitungRing(r); }
    } else { BL.f = { segmen: $('#blSeg', box).value, kelas: $('#blKls', box).value, tag: $('#blTag', box).value, statusWA: $('#blSt', box).value }; r = await api('waAudience', BL.f); }
    btn.disabled = false;
    if (!r.success) return toast(r.message, 'error');
    BL.rows = r.data.rows; BL.ring = r.data.ringkas; ring();
  };
  $('#blKirim', box).onclick = async () => {
    const kirim = BL.rows.filter(x => x.valid && !x.ganda && !x.optOut);
    if (!await konfirmasi('Buat blast WhatsApp?', `<b>${kirim.length}</b> pesan akan dikirim bertahap, ${BL.batch || 20} pesan per batch.`, 'Buat Blast')) return;
    const btn = $('#blKirim', box); btn.disabled = true;
    const r = await api('waBlastCreate', { judul: $('#blJudul', box).value.trim(), pesan: ta.value, ukuranBatch: BL.batch || 20, jeda: $('#blJeda', box).value.trim(), sasaran: BL.sumber === 'crm' ? Object.values(BL.f).filter(Boolean).join(' • ') || 'Semua kontak' : BL.sumber, penerima: kirim.map(x => x.id ? { id: x.id } : { hp: x.hp, nama: x.nama }) });
    btn.disabled = false;
    if (!r.success) return toast(r.message, 'error', 6000);
    toast(r.message, 'success', 5000); BL.rows = []; BL.ring = null; BL.judul = ''; PRO.blastPreset = null; Store.del(userKey('blast')); go('notifikasi', 'riwayat');
  };
  ring();
}
function hitungRing(r) {
  const seen = {}, g = { total: r.data.rows.length, valid: 0, tidakValid: 0, ganda: 0, terdaftarWA: 0, tidakTerdaftarWA: 0, optOut: 0 };
  r.data.rows.forEach(x => { x.ganda = !!seen[x.hp]; if (!x.valid) g.tidakValid++; else if (x.ganda) g.ganda++; else if (x.optOut) g.optOut++; else g.valid++; if (x.statusWA === 'Terdaftar') g.terdaftarWA++; if (x.statusWA === 'Tidak Terdaftar') g.tidakTerdaftarWA++; if (x.valid) seen[x.hp] = 1; });
  r.data.ringkas = g; return r;
}

/* ---------- Tab Riwayat Blast ---------- */
function tabRiwayat(box) {
  box.innerHTML = skel(2, 120);
  const render = list => {
    if (!list.length) { box.innerHTML = kosong('Belum ada blast', 'Blast WhatsApp yang kamu buat akan tampil di sini beserta progresnya.', 'send', `<button class="btn" onclick="go('notifikasi','blast')">${ic('plus', 'ic-sm')} Buat Blast</button>`); return; }
    box.innerHTML = `<div class="stack">${list.map(b => `<div class="card"><div class="row between wrap"><div class="grow"><div class="row wrap" style="gap:8px"><h3>${esc(b.judul)}</h3>${badgeStatus(b.status)}</div><div class="xs muted">${fmtTgl(b.tanggal, true)} • ${esc(b.sasaran || '')} • batch ${b.batch} • jeda ${esc(b.jeda)} dtk</div></div>
      ${b.status === 'Berjalan' ? `<div class="row"><button class="btn sm" data-go="${b.id}">${ic('play', 'ic-sm')} Kirim batch berikutnya</button><button class="btn danger-soft sm" data-stop="${b.id}">${ic('square', 'ic-sm')} Hentikan</button></div>` : ''}</div>
      <div class="row between xs" style="margin-top:12px"><span><b>${fmtAngka(b.terkirim)}</b> terkirim${b.gagal ? ' • <span style="color:var(--red)">' + b.gagal + ' gagal</span>' : ''} • ${fmtAngka(b.sisa)} sisa</span><b>${b.persen}%</b></div><div class="bar thin" style="margin-top:6px"><i style="width:${b.persen}%"></i></div>
      <details style="margin-top:10px"><summary class="xs muted">Isi pesan</summary><div class="wa-bubble" style="margin-top:8px">${renderWa(b.pesan)}</div></details></div>`).join('')}</div>`;
    $$('[data-go]', box).forEach(btn => btn.onclick = async () => { btn.disabled = true; btn.innerHTML = ic('loader', 'ic-sm spin') + ' Mengirim…'; const r = await api('waBlastProcess', { blastId: btn.dataset.go }); toast(r.message, r.success ? 'success' : 'error'); muat(true); });
    $$('[data-stop]', box).forEach(btn => btn.onclick = async () => { if (!await konfirmasi('Hentikan blast?', 'Pesan yang belum terkirim akan dibatalkan.', 'Hentikan', true)) return; const r = await api('waBlastStop', { blastId: btn.dataset.stop }); toast(r.message, r.success ? 'success' : 'error'); muat(true); });
    stopPoll();
    if (list.some(b => b.status === 'Berjalan')) PRO.pollT = setInterval(() => { if (Activity.due('blast', 15000, 60000)) muat(true); }, 5000);
  };
  const muat = force => swr('blast', 'waBlastList', {}, render, { fresh: force ? 0 : 15000, force, onError: r => box.innerHTML = gagal(r.message, 'route()') });
  muat(false);
}

/* ---------- Tab Antrean & Log (ADMIN) ---------- */
function tabAntrean(box) {
  let f = { status: '', kanal: '' };
  const render = d => {
    const g = d.ringkas;
    box.innerHTML = `<div class="stack"><div class="grid g4">${kpi('Antri', fmtAngka(g.Antri + g.Kirim))}${kpi('Terkirim', fmtAngka(g.Terkirim))}${kpi('Gagal', fmtAngka(g.Gagal))}${kpi('Dibatalkan', fmtAngka(g.Batal))}</div>
      <div class="card" style="padding:0"><div class="card-h wrap" style="padding:16px 20px 0"><div class="row wrap"><select class="select" id="aqSt"><option value="">Semua status</option>${['Antri', 'Terkirim', 'Gagal', 'Batal'].map(s => `<option ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select><select class="select" id="aqKn"><option value="">WA & Email</option><option value="WA" ${f.kanal === 'WA' ? 'selected' : ''}>WhatsApp</option><option value="EMAIL" ${f.kanal === 'EMAIL' ? 'selected' : ''}>Email</option></select></div>
        <div class="row"><button class="btn line sm" id="aqRetry" ${g.Gagal ? '' : 'disabled'}>${ic('refresh-cw', 'ic-sm')} Ulangi yang gagal</button><button class="btn sm" id="aqNow">${ic('zap', 'ic-sm')} Proses sekarang</button></div></div>
        ${d.rows.length ? `<div class="tbl-wrap" style="max-height:560px;overflow:auto"><table class="tbl"><thead><tr><th>Waktu</th><th>Kanal</th><th>Penerima</th><th>Kejadian</th><th>Pesan</th><th>Status</th></tr></thead><tbody>${d.rows.map(x => `<tr><td class="xs">${fmtTgl(x.dikirim || x.dibuat, true)}</td><td>${x.kanal === 'WA' ? ic('message-circle', 'ic-sm') : ic('mail', 'ic-sm')}</td><td><b class="small">${esc(x.nama)}</b><div class="xs muted">${esc(x.tujuan)}</div></td><td class="xs">${esc(x.event === 'BLAST' ? 'Blast' : x.event)}</td><td class="xs" style="max-width:320px">${esc(x.pesan)}</td><td>${badgeStatus(x.status)}${x.status === 'Gagal' ? '<div class="xs muted">' + esc(x.respon) + '</div>' : ''}</td></tr>`).join('')}</tbody></table></div>` : kosong('Antrean kosong', 'Belum ada notifikasi yang cocok dengan filter.', 'inbox')}</div></div>`;
    $('#aqSt', box).onchange = e => { f.status = e.target.value; muat(true); };
    $('#aqKn', box).onchange = e => { f.kanal = e.target.value; muat(true); };
    $('#aqNow', box).onclick = async () => { const b = $('#aqNow', box); b.disabled = true; const r = await api('notifProcessNow', {}); toast(r.message, r.success ? 'success' : 'error'); muat(true); };
    $('#aqRetry', box).onclick = async () => { const r = await api('notifRetry', {}); toast(r.message, r.success ? 'success' : 'error'); muat(true); };
  };
  const muat = force => swr('antrean:' + f.status + f.kanal, 'notifQueue', f, render, { fresh: force ? 0 : 20000, force, onError: r => box.innerHTML = gagal(r.message, 'route()') });
  box.innerHTML = skel(2, 120); muat(false);
}

/* ============================================================
   CRM KONTAK
   ============================================================ */
const CRMV = { q: '', seg: '', st: '', tag: '', page: 0, sel: new Set(), size: 50 };
function muatCrm(cb, force) {
  return swr('crm', 'crmList', {}, d => { PRO.crm = d; cb && cb(d); }, { fresh: force ? 0 : 60000, force, onError: r => cb && cb(null, r) });
}
const crmObj = r => ({ id: r[0], nama: r[1], email: r[2], wa: r[3], segmen: r[4], sumber: r[5], tag: r[6], statusWA: r[7], optOut: !!r[8], jumlah: r[9], terakhir: r[10], unit: r[11], kelas: r[12], emailValid: r[13] });
registerPage('crm', {
  auth: ['ADMIN', 'BK', 'PIMPINAN'], shell: 'staf', title: 'CRM Kontak',
  show(el) {
    el.innerHTML = `<div class="grid g4" id="crmKpi">${skel(1, 86).repeat(4)}</div><div class="card" style="padding:0;margin-top:16px" id="crmBox">${skel(5, 44)}</div>`;
    apiQ('crmStats', {}).then(r => { if (r.success) renderCrmKpi(el, r.data); });
    muatCrm((d, err) => { if (!d) { $('#crmBox', el).innerHTML = gagal(err && err.message, 'route()'); return; } renderCrm(el, d); });
  }
});
function renderCrmKpi(el, s) {
  const k = $('#crmKpi', el); if (!k) return;
  k.innerHTML = kpi('Total Kontak', fmtAngka(s.total), `<span class="xs muted">${Object.entries(s.segmen).map(([a, b]) => a + ' ' + b).join(' • ')}</span>`) + kpi('Nomor WA Valid', fmtAngka(s.waValid), `<span class="badge b-green">${s.terdaftarWA} terdaftar</span>`) +
    kpi('Email Valid', fmtAngka(s.emailValid)) + kpi('Pernah Dihubungi', fmtAngka(s.pernahDihubungi), s.optOut ? `<span class="badge">${s.optOut} opt-out</span>` : '');
}
function renderCrm(el, d) {
  const box = $('#crmBox', el), admin = AppState.role === 'ADMIN', bisaKirim = AppState.role !== 'PIMPINAN';
  const all = d.rows.map(crmObj);
  const segs = [...new Set(all.map(x => x.segmen))], tags = [...new Set(all.flatMap(x => String(x.tag || '').split(',').filter(Boolean)))].sort();
  box.innerHTML = `<div class="card-h wrap" style="padding:16px 20px"><div class="row wrap grow"><div class="search grow" style="max-width:320px">${ic('search')}<input class="input" id="crQ" placeholder="Cari nama, nomor, email, kelas…" value="${esc(CRMV.q)}"></div>
      <select class="select" id="crSeg"><option value="">Semua segmen</option>${segs.map(s => `<option ${CRMV.seg === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
      <select class="select" id="crSt"><option value="">Status WA</option><option value="Terdaftar">Terdaftar WA</option><option value="Tidak Terdaftar">Bukan WA</option><option value="belum">Belum dicek</option><option value="optout">Opt-out</option><option value="tanpa">Tanpa nomor</option></select>
      <select class="select" id="crTag"><option value="">Semua tag</option>${tags.map(t => `<option ${CRMV.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
    <div class="row wrap">${admin ? `<button class="btn line sm" id="crSync">${ic('refresh-cw', 'ic-sm')} Sinkron</button><button class="btn line sm" id="crImp">${ic('upload', 'ic-sm')} Import</button><button class="btn line sm" id="crAdd">${ic('user-plus', 'ic-sm')} Tambah</button>` : ''}<button class="btn line sm" id="crExp">${ic('download', 'ic-sm')} Excel</button></div></div>
    <div id="crBulk" class="crm-bulk" hidden></div><div id="crTbl"></div>
    <div class="row between xs muted" style="padding:10px 20px"><span>Sinkron terakhir: ${d.syncAt ? fmtTgl(d.syncAt, true) : '-'} (otomatis tiap ±30 menit & saat data siswa/staf berubah)</span><span id="crPg"></span></div>`;
  $('#crSt', box).value = CRMV.st;
  const filt = () => {
    const q = CRMV.q.toLowerCase();
    return all.filter(x => (!q || (x.nama + ' ' + x.wa + ' ' + x.email + ' ' + x.kelas + ' ' + x.tag).toLowerCase().includes(q)) && (!CRMV.seg || x.segmen === CRMV.seg) && (!CRMV.tag || String(x.tag).split(',').includes(CRMV.tag)) &&
      (!CRMV.st || (CRMV.st === 'belum' ? x.wa && !x.statusWA : CRMV.st === 'optout' ? x.optOut : CRMV.st === 'tanpa' ? !x.wa : x.statusWA === CRMV.st)));
  };
  const tabel = () => {
    const list = filt(), pages = Math.max(1, Math.ceil(list.length / CRMV.size)); CRMV.page = Math.min(CRMV.page, pages - 1);
    const view = list.slice(CRMV.page * CRMV.size, (CRMV.page + 1) * CRMV.size), semua = view.length && view.every(x => CRMV.sel.has(x.id));
    $('#crTbl', box).innerHTML = list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th style="width:36px"><input type="checkbox" id="crAll" ${semua ? 'checked' : ''} aria-label="Pilih semua di halaman"></th><th>Nama</th><th>WhatsApp</th><th>Email</th><th>Segmen</th><th>Tag</th><th style="text-align:right">Pesan</th></tr></thead><tbody>${view.map(x => `<tr data-id="${x.id}" class="clickable"><td><input type="checkbox" data-sel="${x.id}" ${CRMV.sel.has(x.id) ? 'checked' : ''} aria-label="Pilih ${esc(x.nama)}"></td>
      <td><b>${esc(x.nama)}</b>${x.optOut ? ' <span class="badge">opt-out</span>' : ''}<div class="xs muted">${esc([x.unit, x.kelas].filter(Boolean).join(' • '))}</div></td><td class="small">${x.wa ? esc(x.wa) + '<div>' + waStatusBadge(x.statusWA) + '</div>' : '<span class="muted">-</span>'}</td><td class="small">${esc(x.email || '-')}</td>
      <td><span class="badge ${{ Siswa: 'b-blue', Wali: 'b-pink', Staf: 'b-p', 'Peserta Uji Coba': 'b-orange' }[x.segmen] || ''}">${esc(x.segmen)}</span></td><td>${String(x.tag || '').split(',').filter(Boolean).map(t => `<span class="badge">${esc(t)}</span>`).join(' ')}</td><td style="text-align:right" class="small">${x.jumlah || 0}${x.terakhir ? '<div class="xs muted">' + fmtTgl(x.terakhir) + '</div>' : ''}</td></tr>`).join('')}</tbody></table></div>` : kosong('Tidak ada kontak', all.length ? 'Ubah filter pencarian.' : 'Kontak muncul otomatis dari data siswa, wali, staf, dan peserta uji coba.' + (admin ? ' Klik Sinkron untuk memperbarui.' : ''), 'contact-round');
    $('#crPg', box).innerHTML = list.length > CRMV.size ? `<span class="pg-mini"><button class="icon-btn" id="crPrev" ${CRMV.page ? '' : 'disabled'} aria-label="Sebelumnya">${ic('chevron-left')}</button> ${CRMV.page + 1} / ${pages} <button class="icon-btn" id="crNext" ${CRMV.page < pages - 1 ? '' : 'disabled'} aria-label="Berikutnya">${ic('chevron-right')}</button></span> • ${fmtAngka(list.length)} kontak` : fmtAngka(list.length) + ' kontak';
    const pv = $('#crPrev', box); if (pv) pv.onclick = () => { CRMV.page--; tabel(); };
    const nx = $('#crNext', box); if (nx) nx.onclick = () => { CRMV.page++; tabel(); };
    const a = $('#crAll', box); if (a) a.onchange = () => { view.forEach(x => a.checked ? CRMV.sel.add(x.id) : CRMV.sel.delete(x.id)); tabel(); };
    $$('[data-sel]', box).forEach(c => { c.onclick = e => e.stopPropagation(); c.onchange = () => { c.checked ? CRMV.sel.add(c.dataset.sel) : CRMV.sel.delete(c.dataset.sel); bulk(); }; });
    $$('tr[data-id]', box).forEach(tr => tr.onclick = () => detailKontak(tr.dataset.id));
    bulk();
  };
  const bulk = () => {
    const b = $('#crBulk', box), n = CRMV.sel.size; b.hidden = !n; if (!n) return;
    b.innerHTML = `<b>${n} dipilih</b> <button class="link small" data-b="clear">batal</button><span class="grow"></span>
      ${bisaKirim ? `<button class="btn sm" data-b="wa">${ic('send', 'ic-sm')} Kirim WA</button><button class="btn line sm" data-b="tag">${ic('tag', 'ic-sm')} Tag</button><button class="btn line sm" data-b="untag">Hapus tag</button><button class="btn line sm" data-b="optout">${ic('ban', 'ic-sm')} Opt-out</button><button class="btn line sm" data-b="optin">Opt-in</button>` : ''}${admin ? `<button class="btn line sm" data-b="merge">${ic('merge', 'ic-sm')} Gabung</button><button class="btn danger-soft sm" data-b="hapus">${ic('trash-2', 'ic-sm')}</button>` : ''}`;
    $$('[data-b]', b).forEach(x => x.onclick = () => aksiBulk(x.dataset.b));
  };
  const aksiBulk = async a => {
    const ids = [...CRMV.sel];
    if (a === 'clear') { CRMV.sel.clear(); return tabel(); }
    if (a === 'wa') { PRO.blastPreset = ids; BL.sumber = 'pilihan'; BL.rows = []; BL.ring = null; return go('notifikasi', 'blast'); }
    if (a === 'merge') {
      if (ids.length < 2) return toast('Pilih minimal 2 kontak.', 'warning');
      const list = all.filter(x => CRMV.sel.has(x.id));
      const m = modal(`<h3>Gabungkan ${list.length} kontak</h3><p class="small muted" style="margin:6px 0 12px">Pilih kontak utama. Tag, catatan, & jumlah pesan kontak lain (manual/import) diserap ke kontak utama.</p><div class="stack-sm">${list.map((x, i) => `<label class="check"><input type="radio" name="mu" value="${x.id}" ${i ? '' : 'checked'}> ${esc(x.nama)} <span class="xs muted">${esc(x.segmen)} • ${esc(x.wa || x.email)}</span></label>`).join('')}</div><div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn line" data-n>Batal</button><button class="btn" data-y>Gabungkan</button></div>`);
      m.querySelector('[data-n]').onclick = closeModal;
      m.querySelector('[data-y]').onclick = async () => { const u = m.querySelector('input[name=mu]:checked').value; const r = await api('crmMerge', { utama: u, lain: ids.filter(x => x !== u) }); closeModal(); toast(r.message, r.success ? 'success' : 'error', 5000); if (r.success) selesai(); };
      return;
    }
    let nilai = '';
    if (a === 'tag' || a === 'untag') { nilai = await minta(a === 'tag' ? 'Tambah tag' : 'Hapus tag', a === 'tag' ? 'Nama tag (pisahkan dengan koma)' : 'Tag yang dihapus', tags); if (!nilai) return; }
    if (a === 'hapus' && !await konfirmasi('Hapus kontak?', 'Hanya kontak manual/import yang dihapus. Kontak hasil sinkron tetap ada (ikut data sumber).', 'Hapus', true)) return;
    const r = await api('crmBulk', { ids, aksi: a, nilai }); toast(r.message, r.success ? 'success' : 'error', 5000); if (r.success) selesai();
  };
  const selesai = () => { CRMV.sel.clear(); Store.del(userKey('crm')); muatCrm(d2 => renderCrm(el, d2), true); apiQ('crmStats', {}).then(r => r.success && renderCrmKpi(el, r.data)); };
  $('#crQ', box).oninput = debounce(e => { CRMV.q = e.target.value; CRMV.page = 0; tabel(); }, 150);
  $('#crSeg', box).onchange = e => { CRMV.seg = e.target.value; CRMV.page = 0; tabel(); };
  $('#crSt', box).onchange = e => { CRMV.st = e.target.value; CRMV.page = 0; tabel(); };
  $('#crTag', box).onchange = e => { CRMV.tag = e.target.value; CRMV.page = 0; tabel(); };
  $('#crExp', box).onclick = async () => {
    busy(true, 'Menyiapkan Excel…');
    try { await libXlsx(); const r = await api('crmExport', {}); if (!r.success) throw new Error(r.message); const ws = XLSX.utils.json_to_sheet(r.data.rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Kontak'); XLSX.writeFile(wb, 'CRM-Kontak-' + new Date().toISOString().slice(0, 10) + '.xlsx'); }
    catch (e) { toast(e.message, 'error'); } finally { busy(false); }
  };
  if (admin) {
    $('#crSync', box).onclick = async () => { busy(true, 'Menyinkronkan kontak…'); const r = await api('crmSync', {}); busy(false); toast(r.message, r.success ? 'success' : 'error', 5000); if (r.success) selesai(); };
    $('#crAdd', box).onclick = () => formKontak(null, selesai);
    $('#crImp', box).onclick = () => importKontak(selesai);
  }
  tabel();
  PRO._crmSelesai = selesai;
}
async function detailKontak(id) {
  const box = slideOver('Detail Kontak', skel(3, 70), '');
  const r = await api('crmDetail', { id });
  if (!$('#ov')) return;
  if (!r.success) { box.querySelector('.bd').innerHTML = gagal(r.message, ''); return; }
  const k = r.data.kontak, bisa = AppState.role !== 'PIMPINAN', manual = !['siswa', 'wali', 'staf', 'uji'].includes(k.sumber);
  box.querySelector('.bd').innerHTML = `<div class="stack"><div class="row"><div class="avatar" style="width:52px;height:52px;font-size:18px">${esc(inisial(k.nama))}</div><div class="grow"><h3>${esc(k.nama)}</h3><div class="xs muted">${esc(k.segmen)}${k.info && k.info.kelas ? ' • ' + esc(k.info.kelas) : ''}${k.info && k.info.siswa ? ' • Wali dari ' + esc(k.info.siswa) : ''}</div></div></div>
    <div class="kv"><div>${ic('message-circle', 'ic-sm')} WhatsApp</div><div>${k.wa ? `<a href="https://wa.me/${esc(k.wa.replace(/^0/, '62'))}" target="_blank" rel="noopener">${esc(k.wa)}</a> ${waStatusBadge(k.statusWA)}` : '-'}</div><div>${ic('mail', 'ic-sm')} Email</div><div>${k.email ? `<a href="mailto:${esc(k.email)}">${esc(k.email)}</a>` : '-'}</div><div>${ic('send', 'ic-sm')} Pesan</div><div>${k.jumlah} terkirim${k.terakhir ? ' • terakhir ' + fmtTgl(k.terakhir, true) : ''}</div></div>
    ${bisa ? `<div class="card stack-sm" style="box-shadow:none;border:1px solid var(--line)"><label class="field"><span>Tag</span><input class="input" id="kdTag" value="${esc(k.tag)}" placeholder="komite, vip"></label><label class="field"><span>Catatan</span><textarea class="textarea" id="kdCat" rows="3">${esc(k.catatan)}</textarea></label>
      <label class="check"><input type="checkbox" id="kdOpt" ${k.optOut ? 'checked' : ''}> Opt-out (tidak menerima blast)</label><div class="row" style="justify-content:flex-end">${manual && AppState.role === 'ADMIN' ? '<button class="btn line sm" id="kdEdit">Ubah data</button>' : ''}<button class="btn sm" id="kdSave">Simpan</button></div></div>` : ''}
    <div><div class="row between"><h4>Interaksi</h4>${bisa ? '<button class="btn line sm" id="kdAddI">' + ic('plus', 'ic-sm') + ' Catat</button>' : ''}</div><div id="kdIForm"></div>
      ${r.data.interaksi.length ? `<ul class="timeline">${r.data.interaksi.map(i => `<li><b class="small">${esc(i.kanal.replace('_', ' '))} • ${i.arah === 'MASUK' ? 'masuk' : 'keluar'}</b><div class="small">${esc(i.ringkasan)}</div><div class="xs muted">${fmtTgl(i.tanggal, true)}</div></li>`).join('')}</ul>` : '<p class="small muted">Belum ada interaksi tercatat.</p>'}</div>
    <div><h4 style="margin-bottom:8px">Riwayat Pesan</h4>${r.data.pesan.length ? `<ul class="timeline">${r.data.pesan.map(p => `<li>${badgeStatus(p.status)} <span class="xs muted">${p.kanal} • ${esc(p.event)} • ${fmtTgl(p.tanggal, true)}</span><div class="xs">${esc(p.pesan)}</div></li>`).join('')}</ul>` : '<p class="small muted">Belum ada pesan.</p>'}</div></div>`;
  const sv = $('#kdSave', box); if (sv) sv.onclick = async () => { const x = await api('crmSave', { id: k.id, tag: $('#kdTag', box).value, catatan: $('#kdCat', box).value, optOut: $('#kdOpt', box).checked, nama: k.nama, wa: k.wa, email: k.email }); toast(x.message, x.success ? 'success' : 'error'); if (x.success) { closeModal(); PRO._crmSelesai && PRO._crmSelesai(); } };
  const ed = $('#kdEdit', box); if (ed) ed.onclick = () => formKontak(k, PRO._crmSelesai);
  const ai = $('#kdAddI', box); if (ai) ai.onclick = () => {
    $('#kdIForm', box).innerHTML = `<div class="stack-sm" style="margin:10px 0"><div class="row"><select class="select" id="kiK">${['WA', 'TELEPON', 'TATAP_MUKA', 'EMAIL', 'LAINNYA'].map(x => `<option value="${x}">${x.replace('_', ' ')}</option>`).join('')}</select><select class="select" id="kiA"><option value="KELUAR">Keluar</option><option value="MASUK">Masuk</option></select></div><textarea class="textarea" id="kiR" rows="2" placeholder="Ringkasan pembicaraan…"></textarea><div class="row" style="justify-content:flex-end"><button class="btn sm" id="kiOk">Simpan</button></div></div>`;
    $('#kiOk', box).onclick = async () => { const x = await api('crmInteraksi', { kontakId: k.id, kanal: $('#kiK', box).value, arah: $('#kiA', box).value, ringkasan: $('#kiR', box).value }); toast(x.message, x.success ? 'success' : 'error'); if (x.success) detailKontak(k.id); };
  };
}
function formKontak(k, done) {
  k = k || { nama: '', wa: '', email: '', tag: '', catatan: '' };
  const box = slideOver(k.id ? 'Ubah Kontak' : 'Tambah Kontak Manual', `<div class="stack"><label class="field"><span>Nama *</span><input class="input" id="fkN" value="${esc(k.nama)}"></label><label class="field"><span>WhatsApp</span><input class="input" type="tel" id="fkW" value="${esc(k.wa)}" placeholder="0812xxxxxxx"></label><label class="field"><span>Email</span><input class="input" type="email" id="fkE" value="${esc(k.email)}"></label><label class="field"><span>Tag</span><input class="input" id="fkT" value="${esc(k.tag)}" placeholder="alumni, komite"></label><label class="field"><span>Catatan</span><textarea class="textarea" id="fkC" rows="3">${esc(k.catatan)}</textarea></label></div>`, `<button class="btn line" data-close>Batal</button><button class="btn" id="fkOk">Simpan</button>`);
  $('#fkOk', box).onclick = async () => { const r = await api('crmSave', { id: k.id, nama: $('#fkN', box).value.trim(), wa: $('#fkW', box).value.trim(), email: $('#fkE', box).value.trim(), tag: $('#fkT', box).value, catatan: $('#fkC', box).value, optOut: k.optOut }); toast(r.message, r.success ? 'success' : 'error'); if (r.success) { closeModal(); done && done(); } };
}
function importKontak(done) {
  const m = modal(`<h3>Import Kontak</h3><p class="small muted" style="margin:6px 0 12px">File Excel/CSV dengan kolom <b>Nama, WhatsApp, Email, Tag</b> (Segmen opsional). Kontak yang nomor/email-nya sudah ada hanya ditambah tag-nya — aman diulang.</p>
    <div class="row wrap"><label class="btn soft">Pilih File<input type="file" id="ikF" accept=".xlsx,.xls,.csv" hidden></label><button class="btn line sm" id="ikTpl">${ic('download', 'ic-sm')} Templat</button></div><div id="ikPrev" class="small" style="margin-top:12px"></div>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn line" data-n>Tutup</button><button class="btn" id="ikOk" disabled>Import</button></div>`, { wide: true });
  let rows = [];
  m.querySelector('[data-n]').onclick = closeModal;
  $('#ikTpl', m).onclick = async () => { await libXlsx(); const ws = XLSX.utils.aoa_to_sheet([['Nama', 'WhatsApp', 'Email', 'Tag', 'Segmen'], ['Bapak Contoh', '081234567890', 'contoh@email.com', 'alumni', 'Manual']]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Kontak'); XLSX.writeFile(wb, 'Templat-Import-Kontak.xlsx'); };
  $('#ikF', m).onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    await libXlsx(); const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' });
    const h = (aoa[0] || []).map(x => String(x).toLowerCase()), ix = k => h.findIndex(x => k.some(y => x.includes(y)));
    const c = { nama: ix(['nama']), wa: ix(['wa', 'whatsapp', 'hp', 'telp']), email: ix(['email']), tag: ix(['tag']), segmen: ix(['segmen']) };
    rows = aoa.slice(1).filter(r => r.some(x => String(x).trim())).map(r => ({ nama: c.nama < 0 ? '' : r[c.nama], wa: c.wa < 0 ? '' : String(r[c.wa]), email: c.email < 0 ? '' : r[c.email], tag: c.tag < 0 ? '' : r[c.tag], segmen: c.segmen < 0 ? '' : r[c.segmen] }));
    const dr = await api('crmImport', { rows, dryRun: true });
    $('#ikPrev', m).innerHTML = dr.success ? `<div class="note">${rows.length} baris dibaca → <b>${dr.data.baru}</b> kontak baru, <b>${dr.data.diperbarui}</b> diperbarui, ${dr.data.dilewati} sama${dr.data.error.length ? '<br><span style="color:var(--red)">' + dr.data.error.slice(0, 5).map(esc).join('<br>') + '</span>' : ''}</div>` : esc(dr.message);
    $('#ikOk', m).disabled = !dr.success || !(dr.data.baru + dr.data.diperbarui);
  };
  $('#ikOk', m).onclick = async () => { const r = await api('crmImport', { rows }); closeModal(); toast(r.message, r.success ? 'success' : 'error', 5000); if (r.success) done(); };
}

/* ============================================================
   MIGRASI DATA (import dari app versi lama)
   ============================================================ */
const MG = { sumber: '', sheets: null, timpa: false, hasil: null };
const MG_SHEETS = [['Pengaturan', 'Identitas & pengaturan sekolah', 1], ['Kelas', 'Daftar kelas & wali kelas', 1], ['Siswa', 'Data siswa + tanggal lahir (hash)', 1], ['Staf', 'Akun guru, BK, pimpinan', 1], ['Periode', 'Periode tes', 1], ['Jawaban', 'Jawaban & draf tes', 1], ['Hasil', 'Hasil tes', 1], ['CatatanBK', 'Catatan pendampingan BK', 1], ['PesertaUjiCoba', 'Akun uji coba', 0], ['HasilUjiCoba', 'Hasil uji coba', 0], ['BankSoal', 'Bank soal (perlu opsi timpa)', 0], ['Interpretasi', 'Interpretasi (perlu opsi timpa)', 0], ['Log', 'Log aktivitas', 0]];
registerPage('migrasi', {
  auth: ['ADMIN'], shell: 'staf', title: 'Migrasi Data dari App Lama',
  show(el) {
    if (!MG.sheets) MG.sheets = MG_SHEETS.filter(x => x[2]).map(x => x[0]);
    el.innerHTML = `<div class="stack" style="max-width:980px">
      <div class="card tint-info small">${ic('info', 'ic-sm')} Modul ini <b>hanya membaca</b> spreadsheet app lama — app lama tidak diubah. Aman dijalankan berulang: data yang sudah ada tidak digandakan. Jalankan <b>Pindai</b> dulu untuk melihat apa yang akan berubah.</div>
      <div class="card stack"><h3>1. Spreadsheet app lama</h3>
        <label class="field"><span>URL atau ID spreadsheet database app lama <span class="muted">(harus milik akun Google yang sama)</span></span><input class="input" id="mgSrc" value="${esc(MG.sumber)}" placeholder="https://docs.google.com/spreadsheets/d/…/edit"></label>
        <label class="field"><span>Kunci hash lama <span class="muted">(opsional, sangat disarankan)</span></span><input class="input" type="password" id="mgPep" autocomplete="off" placeholder="Nilai HASH_PEPPER dari Script Properties proyek Apps Script lama"></label>
        <p class="xs muted">Agar siswa & staf lama tetap bisa masuk dengan tanggal lahir / kata sandi yang sama: buka proyek Apps Script lama → ⚙️ Setelan Proyek → Properti Skrip → salin nilai <b>HASH_PEPPER</b>. Kunci disimpan di Script Properties app baru (tidak di Sheets), lalu hash otomatis diperbarui saat pengguna masuk.</p></div>
      <div class="card stack"><h3>2. Data yang dipindahkan</h3><div class="grid g3">${MG_SHEETS.map(x => `<label class="check"><input type="checkbox" data-sh="${x[0]}" ${MG.sheets.includes(x[0]) ? 'checked' : ''}> <span><b>${x[0]}</b><br><span class="xs muted">${x[1]}</span></span></label>`).join('')}</div>
        <label class="check"><input type="checkbox" id="mgTimpa" ${MG.timpa ? 'checked' : ''}> <span><b>Timpa data master</b> <span class="xs muted">— perbarui nama/kelas siswa, periode, bank soal & interpretasi dengan versi app lama. Default mati: keputusan di app baru dipertahankan.</span></span></label></div>
      <div class="row"><button class="btn outline" id="mgScan">${ic('search', 'ic-sm')} Pindai (Dry-run)</button><button class="btn" id="mgRun">${ic('database', 'ic-sm')} Jalankan Import</button></div>
      <div id="mgOut"></div>
      <div class="card"><h3 style="margin-bottom:8px">Checklist pindah ke app baru (cutover)</h3><ol class="small" style="margin:0;padding-left:20px;line-height:1.9"><li>Pindai → Jalankan Import → periksa data siswa, staf, hasil & kelas.</li><li>Uji masuk dengan 1 akun siswa lama (tanggal lahir) dan 1 akun guru lama.</li><li>Buka <b>CRM Kontak</b> → Sinkron, lalu lengkapi kontak WA lewat Import Siswa (opsi <i>perbarui</i>).</li><li><b>Tepat sebelum pindah</b>: jalankan import sekali lagi (delta) untuk menangkap data terbaru di app lama.</li><li>Umumkan alamat baru (blast WA), lalu arsipkan deployment app lama.</li></ol></div></div>`;
    const ambil = () => { MG.sumber = $('#mgSrc', el).value.trim(); MG.sheets = $$('[data-sh]', el).filter(c => c.checked).map(c => c.dataset.sh); MG.timpa = $('#mgTimpa', el).checked; return { sumber: MG.sumber, sheets: MG.sheets, timpa: MG.timpa, pepperLama: $('#mgPep', el).value.trim() }; };
    const jalan = async dry => {
      const d = ambil(); if (!d.sumber) return toast('Tempel URL spreadsheet app lama.', 'warning');
      if (!dry && !await konfirmasi('Jalankan import?', 'Data dari app lama akan ditulis ke database app baru. Proses aman diulang (tanpa data ganda).', 'Jalankan')) return;
      busy(true, dry ? 'Memindai spreadsheet lama…' : 'Mengimpor data… (jangan tutup halaman)');
      const r = await api(dry ? 'migrasiPindai' : 'migrasiJalankan', d, { tries: 1 }); busy(false);
      if (!r.success) return toast(r.message, 'error', 7000);
      if (!dry) { $('#mgPep', el).value = ''; segarAdmin(); Store.del(userKey('crm')); }
      MG.hasil = r.data; hasil();
      toast(r.message, 'success', 5000);
    };
    const hasil = () => {
      const h = MG.hasil; if (!h) return;
      const tot = Object.values(h.report).reduce((a, x) => ({ s: a.s + x.sumber, t: a.t + x.ditambah, u: a.u + x.diperbarui }), { s: 0, t: 0, u: 0 });
      $('#mgOut', el).innerHTML = `<div class="card" style="padding:0"><div class="card-h" style="padding:20px 20px 0"><div><h3>${h.dryRun ? 'Hasil Pindai (belum ditulis)' : 'Hasil Import'}</h3><p class="xs muted">Sumber: ${esc(h.sumber.nama)} • ${(h.ms / 1000).toFixed(1)} dtk</p></div><span class="badge ${h.dryRun ? 'b-amber' : 'b-green'}">${h.dryRun ? 'Dry-run' : 'Selesai'}</span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th style="text-align:right">Di app lama</th><th style="text-align:right">${h.dryRun ? 'Akan ditambah' : 'Ditambah'}</th><th style="text-align:right">${h.dryRun ? 'Akan diperbarui' : 'Diperbarui'}</th><th style="text-align:right">Dilewati</th></tr></thead><tbody>${Object.entries(h.report).map(([k, x]) => `<tr><td><b>${esc(k)}</b></td><td style="text-align:right">${fmtAngka(x.sumber)}</td><td style="text-align:right">${x.ditambah ? '<b style="color:var(--green)">+' + fmtAngka(x.ditambah) + '</b>' : '0'}</td><td style="text-align:right">${x.diperbarui ? '<b>' + fmtAngka(x.diperbarui) + '</b>' : '0'}</td><td style="text-align:right" class="muted">${fmtAngka(x.dilewati)}</td></tr>`).join('')}<tr><td><b>Total</b></td><td style="text-align:right"><b>${fmtAngka(tot.s)}</b></td><td style="text-align:right"><b>+${fmtAngka(tot.t)}</b></td><td style="text-align:right"><b>${fmtAngka(tot.u)}</b></td><td></td></tr></tbody></table></div>
        ${h.warnings.length ? `<div style="padding:0 20px 20px"><h4 style="margin:12px 0 6px">Peringatan</h4><ul class="small" style="margin:0;padding-left:18px">${h.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}</div>`;
    };
    $('#mgScan', el).onclick = () => jalan(true);
    $('#mgRun', el).onclick = () => jalan(false);
    hasil();
  }
});

/* ============================================================
   SISTEM & PERFORMA
   ============================================================ */
registerPage('sistem', {
  auth: ['ADMIN'], shell: 'staf', title: 'Sistem & Performa',
  show(el) {
    el.innerHTML = skel(3, 120);
    const render = s => {
      const wajib = ['pekerjaMenit', 'pekerjaHarian', 'ringkasanMingguan'], pct = Math.min(100, Math.round(s.properties.kb / s.properties.batasKb * 100));
      const perf = {}; Perf.rows.forEach(r => { const x = perf[r.action] = perf[r.action] || { n: 0, t: 0, s: 0, c: 0 }; x.n++; x.t += r.total; x.s += r.server || 0; if (r.cache) x.c++; });
      el.innerHTML = `<div class="stack"><div class="row between wrap"><div class="xs muted">Diperbarui ${fmtTgl(s.waktu, true)} • versi server <b>${esc(s.versi)}</b> • aplikasi <b>${esc(APP_VER)}</b></div><button class="btn line sm" id="ssFresh">${ic('refresh-cw', 'ic-sm')} Segarkan</button></div>
        <div class="grid g4">${kpi('Antrean Notifikasi', s.antrian.ada ? 'Ada' : 'Kosong')}${kpi('Sisa Kuota Email', s.kuotaEmail < 0 ? '-' : fmtAngka(s.kuotaEmail))}${kpi('Script Properties', s.properties.kb + ' KB', `<span class="xs muted">${s.properties.kunci} kunci</span>`)}${kpi('Pemanasan Server', s.keepWarm ? 'Aktif' : 'Mati')}</div>
        <div class="grid g2"><div class="card stack-sm"><h3>${ic('clock', 'ic-sm')} Trigger Terjadwal</h3>${wajib.map(t => `<div class="row between small"><span>${t}</span>${s.triggers.includes(t) ? '<span class="badge b-green">aktif</span>' : '<span class="badge b-red">belum</span>'}</div>`).join('')}
            ${wajib.some(t => !s.triggers.includes(t)) ? '<p class="xs" style="color:var(--red)">Jalankan <b>setupAppEnvironment</b> di editor Apps Script untuk memasang trigger.</p>' : ''}
            <div class="xs muted">Pemanasan terakhir: ${s.warmLast ? fmtTgl(s.warmLast.at, true) + ' (' + s.warmLast.scope + ', ' + s.warmLast.ms + ' ms)' : '-'} • Cache pengaturan ${s.cacheHangat.pengaturan ? '🔥 hangat' : 'dingin'}, konten ${s.cacheHangat.konten ? '🔥 hangat' : 'dingin'}</div></div>
          <div class="card stack-sm"><h3>${ic('shield-check', 'ic-sm')} Rahasia (Script Properties)</h3>${Object.entries(s.rahasia).map(([k, v]) => `<div class="row between small"><code>${k}</code>${v ? '<span class="badge b-green">tersimpan</span>' : '<span class="badge">' + (k === 'FONNTE_TOKEN' ? 'belum diisi' : k === 'HASH_PEPPER_LAMA' ? 'tidak dipakai' : 'belum ada') + '</span>'}</div>`).join('')}
            <div class="xs muted">Nilai rahasia tidak pernah dikirim ke browser.</div><div class="bar thin" style="margin-top:6px"><i style="width:${pct}%"></i></div><div class="xs muted">${s.properties.kb} / ${s.properties.batasKb} KB terpakai</div></div></div>
        <div class="grid g2"><div class="card" style="padding:0"><div style="padding:20px 20px 8px"><h3>${ic('database', 'ic-sm')} Jumlah Baris Data</h3></div><div class="tbl-wrap"><table class="tbl"><tbody>${Object.entries(s.baris).map(([k, v]) => `<tr><td>${esc(k)}</td><td style="text-align:right"><b>${fmtAngka(v)}</b></td></tr>`).join('')}</tbody></table></div></div>
          <div class="card" style="padding:0"><div style="padding:20px 20px 8px"><h3>${ic('activity', 'ic-sm')} Kecepatan di Perangkat Ini</h3><p class="xs muted">Rata-rata waktu respons sesi ini (total = jaringan + server).</p></div>${Object.keys(perf).length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Aksi</th><th style="text-align:right">Kali</th><th style="text-align:right">Total</th><th style="text-align:right">Server</th></tr></thead><tbody>${Object.entries(perf).map(([k, x]) => `<tr><td class="small">${esc(k)}</td><td style="text-align:right">${x.n}</td><td style="text-align:right">${Math.round(x.t / x.n)} ms</td><td style="text-align:right">${Math.round(x.s / x.n)} ms${x.c ? ' <span class="badge b-green">cache</span>' : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted" style="padding:0 20px 20px">Belum ada data.</p>'}</div></div>
        <div class="card row wrap between"><div><h3>${ic('smartphone', 'ic-sm')} Aplikasi di HP (PWA)</h3><p class="small muted">${PWA.standalone() ? 'Aplikasi sedang berjalan dalam mode terpasang.' : PWA.bisa() ? 'Perangkat ini bisa memasang aplikasi.' : PWA.ios() ? 'Di iPhone: Safari → Bagikan → Tambahkan ke Layar Utama.' : 'Buka lewat Chrome di HP untuk memasang.'} Service worker: ${PWA.reg ? '<b style="color:var(--green)">aktif</b>' : 'belum aktif'}.</p></div><div class="row">${PWA.bisa() ? `<button class="btn" onclick="PWA.pasang()">${ic('download', 'ic-sm')} Pasang Aplikasi</button>` : ''}<button class="btn line sm" onclick="PWA.cekUpdate(true)">${ic('refresh-cw', 'ic-sm')} Cek pembaruan</button></div></div></div>`;
      $('#ssFresh', el).onclick = () => muat(true);
    };
    const muat = force => swr('sistem', 'sistemStatus', force ? { _fresh: true } : {}, render, { fresh: force ? 0 : 60000, force, onError: r => el.innerHTML = gagal(r.message, 'route()') });
    muat(false);
  }
});

/* ============================================================
   PWA — pasang di HP + pembaruan versi
   ============================================================ */
const APP_VER = '2.0.0';
const PWA = {
  deferred: null, reg: null,
  standalone: () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
  ios: () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream,
  bisa() { return !!this.deferred && !this.standalone(); },
  init() {
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('./sw.js').then(reg => {
        this.reg = reg;
        if (reg.waiting && navigator.serviceWorker.controller) this.tawarUpdate(reg.waiting);
        reg.addEventListener('updatefound', () => { const w = reg.installing; if (!w) return; w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) this.tawarUpdate(w); }); });
        setInterval(() => reg.update().catch(() => {}), 30 * 60000);
      }).catch(e => console.warn('SW gagal:', e));
      // muat ulang hanya saat pengguna menekan "Perbarui" (bukan saat SW pertama kali mengambil alih)
      navigator.serviceWorker.addEventListener('controllerchange', () => { if (!this.mintaReload) return; this.mintaReload = false; location.reload(); });
    }
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); this.deferred = e; this.banner(); });
    addEventListener('appinstalled', () => { this.deferred = null; const b = $('#pwaBar'); if (b) b.remove(); toast('Aplikasi terpasang di perangkatmu 🎉', 'fun'); });
    setTimeout(() => { if (this.ios() && !this.standalone()) this.banner(); }, 4000);
  },
  banner() {
    if (this.standalone() || $('#pwaBar')) return;
    try { if (Date.now() - Number(localStorage.getItem('sa:pwa:tutup') || 0) < 14 * 864e5) return; } catch (e) {}
    const b = document.createElement('div'); b.id = 'pwaBar'; b.className = 'pwa-bar';
    b.innerHTML = `<div class="logo-box" style="width:40px;height:40px">${ic('graduation-cap')}</div><div class="grow"><b class="small">Pasang Student Assessment</b><div class="xs muted">${this.ios() ? 'Ketuk Bagikan → Tambahkan ke Layar Utama' : 'Buka lebih cepat dari layar utama HP'}</div></div>${this.ios() ? '' : '<button class="btn sm" data-pasang>Pasang</button>'}<button class="icon-btn" data-tutup aria-label="Tutup">${ic('x')}</button>`;
    document.body.appendChild(b);
    const p = b.querySelector('[data-pasang]'); if (p) p.onclick = () => this.pasang();
    b.querySelector('[data-tutup]').onclick = () => { try { localStorage.setItem('sa:pwa:tutup', String(Date.now())); } catch (e) {} b.remove(); };
  },
  async pasang() {
    if (!this.deferred) { if (this.ios()) toast('Di iPhone: ketuk ikon Bagikan lalu "Tambahkan ke Layar Utama".', 'info', 6000); return; }
    this.deferred.prompt(); const { outcome } = await this.deferred.userChoice; this.deferred = null;
    const b = $('#pwaBar'); if (b) b.remove();
    if (outcome === 'accepted') toast('Memasang aplikasi…', 'success');
  },
  tawarUpdate(worker) {
    if ($('#updBar')) return;
    const b = document.createElement('div'); b.id = 'updBar'; b.className = 'upd-bar';
    b.innerHTML = `${ic('sparkles', 'ic-sm')}<span class="grow small"><b>Versi baru tersedia.</b> Muat ulang untuk memperbarui.</span><button class="btn sm" data-u>Perbarui</button>`;
    document.body.appendChild(b);
    b.querySelector('[data-u]').onclick = () => {
      const cur = location.hash.replace(/^#\/?/, '').split('/')[0];
      if (Pages[cur] && Pages[cur].keep) { toast('Selesaikan tes dulu, lalu perbarui.', 'info'); return; }
      this.mintaReload = true; worker.postMessage({ type: 'SKIP_WAITING' });
    };
  },
  cekUpdate(info) { if (!this.reg) return info && toast('Service worker belum aktif.', 'info'); this.reg.update().then(() => { if (info && !this.reg.waiting) toast('Aplikasi sudah versi terbaru (' + APP_VER + ').', 'success'); }).catch(() => {}); }
};
window.PWA = PWA;
