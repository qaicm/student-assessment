/* ============================================================
   admin.js — Import Siswa, Naik Kelas, Kelola Staf, Periode,
   Bank Soal & Interpretasi, Akun Uji Coba, Pengaturan.
   ============================================================ */
'use strict';
const ADM = { data: null };
function muatAdmin(render, force) {
  return swr('admin', 'adminData', {}, d => { ADM.data = d; render(d); }, { fresh: force ? 0 : 30000, force, onError: r => render(null, r) });
}
function segarAdmin() { Store.del(userKey('admin')); ['pub'].forEach(k => Store.del(k)); Object.keys(localStorage).filter(k => k.startsWith(LS + 'nk:')).forEach(k => localStorage.removeItem(k)); segarkanBoot(); }
const adminShell = (el, fn) => { el.innerHTML = skel(3, 120); muatAdmin((d, err) => { if (!d) { el.innerHTML = gagal(err && err.message, 'route()'); return; } fn(d); }); };

/* ============================================================
   IMPORT SISWA & KELAS
   ============================================================ */
const IMP = { rows: [], step: 1 };
registerPage('import', {
  auth: ['ADMIN'], shell: 'staf', title: 'Import Siswa & Kelas',
  show(el) {
    const st = n => `<div class="st ${IMP.step > n ? 'done' : IMP.step === n ? 'on' : ''}"><i>${IMP.step > n ? '✓' : n}</i>${['', 'Unduh Templat', 'Unggah / Tempel Data', 'Pratinjau & Validasi', 'Simpan'][n]}</div>`;
    el.innerHTML = `<div class="stack"><div class="card pad-s"><div class="stepper">${[1, 2, 3, 4].map(st).join('')}</div></div>
      <div class="grid g2"><div class="drop" id="impDrop">${ic('cloud-upload', 'ic-lg')}<h3 style="margin:10px 0 4px">Seret file Excel (.xlsx / .csv) ke sini</h3><p class="muted small">Atau klik untuk memilih file dari komputer Anda.</p>
        <div class="row" style="justify-content:center;margin-top:14px"><label class="btn soft">Pilih File<input type="file" id="impFile" accept=".xlsx,.xls,.csv" hidden></label><button class="btn outline" id="impTpl">${ic('download', 'ic-sm')} Unduh Templat Excel</button></div></div>
        <div class="card"><h3 style="margin-bottom:8px">Tempel dari Spreadsheet</h3><textarea class="textarea" id="impPaste" placeholder="Salin baris dari Excel/Google Sheets beserta judul kolom:\nNama | Unit | Tingkat | Kelas | Tanggal Lahir | Jenis Kelamin | Tahun Ajaran | No WA Siswa | Email Siswa | Nama Wali | No WA Wali | Email Wali"></textarea>
        <label class="check" style="margin-top:10px"><input type="checkbox" id="impPerbarui" ${IMP.perbarui ? 'checked' : ''}> Perbarui kontak & tanggal lahir siswa yang sudah ada</label><button class="btn line sm" id="impPasteBtn" style="margin-top:10px">Proses Teks</button></div></div>
      <div class="card" id="impPrev">${kosong('Belum ada data', 'Unggah file atau tempel data untuk melihat pratinjau.', 'table-2')}</div>
      <div class="card tint-info small"><b>Format kolom:</b> Nama, Unit (SMP/SMA), Tingkat (7–12), Kelas (mis. 7A, 10 IPA 1), Tanggal Lahir (DD/MM/YYYY), Jenis Kelamin (L/P), Tahun Ajaran (opsional, default tahun aktif). Tanggal lahir dipakai siswa untuk masuk dan disimpan dalam bentuk hash.<br><b>Kolom kontak (opsional):</b> No WA Siswa, Email Siswa, Nama Wali, No WA Wali, Email Wali — otomatis masuk CRM Kontak untuk notifikasi & blast WhatsApp.</div></div>`;
    $('#impPerbarui', el).onchange = e => { IMP.perbarui = e.target.checked; if (IMP.rows.length) prosesUlang(el); };
    const drop = $('#impDrop', el);
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) bacaFile(f, el); });
    $('#impFile', el).onchange = e => { const f = e.target.files[0]; if (f) bacaFile(f, el); };
    $('#impTpl', el).onclick = unduhTemplat;
    $('#impPasteBtn', el).onclick = () => { const t = $('#impPaste', el).value.trim(); if (!t) return toast('Tempel data terlebih dahulu.', 'warning'); prosesBaris(parseTeks(t), el); };
    if (IMP.rows.length) renderPrev(el);
  }
});
async function unduhTemplat() {
  try {
    await libXlsx();
    const ta = (AppState.sekolah || {}).tahun_ajaran || '';
    const ws = XLSX.utils.aoa_to_sheet([['Nama', 'Unit', 'Tingkat', 'Kelas', 'Tanggal Lahir', 'Jenis Kelamin', 'Tahun Ajaran', 'No WA Siswa', 'Email Siswa', 'Nama Wali', 'No WA Wali', 'Email Wali'],
      ['Nadia Putri Maharani', 'SMA', '10', '10 IPA 1', '17/08/2009', 'P', ta, "'081234567890", 'nadia@email.com', 'Bpk. Hadi Maharani', "'081298765432", 'hadi@email.com'],
      ['Dimas Prakoso', 'SMP', '8', '8B', '05/02/2011', 'L', ta, '', '', 'Ibu Sri Prakoso', "'085712345678", '']]);
    ws['!cols'] = [{ wch: 28 }, { wch: 8 }, { wch: 9 }, { wch: 12 }, { wch: 15 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 22 }];
    ['H', 'K'].forEach(c => { for (let r = 2; r <= 3; r++) { const cell = ws[c + r]; if (cell) { cell.t = 's'; cell.v = String(cell.v).replace(/^'/, ''); cell.z = '@'; } } });
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Siswa'); XLSX.writeFile(wb, 'Templat-Import-Siswa.xlsx');
    IMP.step = Math.max(IMP.step, 2);
  } catch (e) { toast('Gagal membuat templat: ' + e.message, 'error'); }
}
function parseTeks(t) {
  const lines = t.split(/\r?\n/).filter(l => l.trim()), sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  return lines.map(l => l.split(sep).map(x => x.trim().replace(/^"|"$/g, '')));
}
async function bacaFile(f, el) {
  busy(true, 'Membaca file…');
  try {
    if (/\.csv$/i.test(f.name)) prosesBaris(parseTeks(await f.text()), el);
    else { await libXlsx(); const wb = XLSX.read(await f.arrayBuffer(), { type: 'array', cellDates: true }); prosesBaris(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' }), el); }
  } catch (e) { toast('Gagal membaca file: ' + e.message, 'error'); } finally { busy(false); }
}
function tglIso(v) {
  if (v instanceof Date && !isNaN(v)) return v.getFullYear() + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + String(v.getDate()).padStart(2, '0');
  if (typeof v === 'number' && v > 20000 && v < 60000) { const d = new Date(Math.round((v - 25569) * 864e5)); return d.toISOString().slice(0, 10); }
  const s = String(v || '').trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return valid(+m[1], +m[2], +m[3]);
  if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/))) return valid(+m[3], +m[2], +m[1]);
  return '';
  function valid(y, mo, d) { const x = new Date(Date.UTC(y, mo - 1, d)); return x.getUTCFullYear() === y && x.getUTCMonth() === mo - 1 && x.getUTCDate() === d && y > 1990 && y < 2025 ? `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` : ''; }
}
function prosesBaris(aoa, el) {
  if (!aoa.length) return toast('Data kosong.', 'warning');
  const head = aoa[0].map(h => String(h).toLowerCase().trim());
  const cari = (...k) => head.findIndex(h => k.some(x => h.includes(x)));
  IMP.aoa = aoa;
  const cariTepat = f => head.findIndex(f);
  const ix = { nama: cariTepat(h => h.includes('nama') && !h.includes('wali')), unit: cari('unit'), level: cari('tingkat', 'level', 'grade'), kelas: cari('kelas', 'rombel'), tgl: cari('lahir', 'tgl', 'tanggal'), jk: cari('jenis', 'jk', 'gender'), ta: cari('tahun'),
    wa: cariTepat(h => /(wa|whatsapp|hp)/.test(h) && !h.includes('wali')), email: cariTepat(h => h.includes('email') && !h.includes('wali')), nwali: cariTepat(h => h.includes('nama') && h.includes('wali')),
    wawali: cariTepat(h => /(wa|whatsapp|hp)/.test(h) && h.includes('wali')), emwali: cariTepat(h => h.includes('email') && h.includes('wali')) };
  if (ix.nama < 0 || ix.kelas < 0 || ix.tgl < 0) return toast('Judul kolom tidak dikenali. Gunakan templat (Nama, Unit, Tingkat, Kelas, Tanggal Lahir…).', 'error', 6000);
  const taDef = (AppState.sekolah || {}).tahun_ajaran || '';
  const ada = new Set(IDX().list.map(s => s.nama.toLowerCase() + '|' + s.kelas)), dalam = new Set();
  IMP.rows = aoa.slice(1).filter(r => r.some(x => String(x).trim())).map((r, i) => {
    const g = k => ix[k] < 0 ? '' : r[ix[k]];
    const o = { baris: i + 2, nama: String(g('nama')).trim(), unit: String(g('unit')).trim().toUpperCase(), level: String(g('level')).trim(), kelas: String(g('kelas')).trim(), tgl_lahir: tglIso(g('tgl')), tglAsli: g('tgl') instanceof Date ? fmtTgl(g('tgl')) : String(g('tgl')), jk: String(g('jk')).trim().toUpperCase().charAt(0), tahun_ajaran: String(g('ta')).trim() || taDef,
      no_wa: normWa(g('wa')), email: String(g('email')).trim().toLowerCase(), nama_wali: String(g('nwali')).trim(), no_wa_wali: normWa(g('wawali')), email_wali: String(g('emwali')).trim().toLowerCase() };
    if (!o.level) { const m = o.kelas.match(/^\d{1,2}/); if (m) o.level = m[0]; }
    if (!o.unit && o.level) o.unit = Number(o.level) >= 10 ? 'SMA' : 'SMP';
    const key = o.nama.toLowerCase() + '|' + o.kelas;
    if (!o.nama || !o.kelas || !o.unit || !o.level) { o.st = 'error'; o.msg = 'Kolom wajib kosong'; }
    else if (!o.tgl_lahir) { o.st = 'error'; o.msg = 'Format tanggal lahir salah'; }
    else if ((o.no_wa && !waValid(o.no_wa)) || (o.no_wa_wali && !waValid(o.no_wa_wali))) { o.st = 'error'; o.msg = 'Nomor WA tidak valid'; }
    else if ((o.email && !/^\S+@\S+\.\S+$/.test(o.email)) || (o.email_wali && !/^\S+@\S+\.\S+$/.test(o.email_wali))) { o.st = 'error'; o.msg = 'Email tidak valid'; }
    else if (dalam.has(key)) { o.st = 'ganda'; o.msg = 'Ganda di file'; }
    else if (ada.has(key)) { if (IMP.perbarui) { o.st = 'valid'; o.msg = 'Perbarui data'; o.upd = true; } else { o.st = 'ganda'; o.msg = 'Sudah ada di database'; } }
    else { o.st = 'valid'; o.msg = 'Valid'; }
    dalam.add(key);
    return o;
  });
  IMP.step = 3; route();
}
function normWa(v) { let s = String(v == null ? '' : v).trim().replace(/\.0+$/, '').replace(/[^0-9+]/g, '').replace(/^\+/, ''); if (!s) return ''; if (s.indexOf('62') === 0) s = '0' + s.slice(2); else if (s[0] === '8') s = '0' + s; return s; }
function waValid(v) { return /^08\d{8,12}$/.test(normWa(v)); }
function prosesUlang(el) { if (IMP.aoa) prosesBaris(IMP.aoa, el); }
function renderPrev(el) {
  const r = IMP.rows, v = r.filter(x => x.st === 'valid'), e = r.filter(x => x.st === 'error'), g = r.filter(x => x.st === 'ganda');
  $('#impPrev', el).innerHTML = `<div class="card-h"><div class="row wrap"><h3>Pratinjau & Validasi Baris</h3><span class="badge b-green">${v.length} valid</span><span class="badge b-red">${e.length} error</span><span class="badge b-amber">${g.length} ganda</span></div>
    <div class="row"><button class="btn line sm" id="impReset">Batal</button><button class="btn" id="impSimpan" ${v.length ? '' : 'disabled'}>Simpan ${v.length} Siswa</button></div></div>
    <div class="row between xs muted"><span id="impStat">Status proses simpan batch (siap dijalankan)</span><span id="impCnt">0 / ${v.length}</span></div><div class="bar thin" style="margin:6px 0 14px"><i id="impBar" style="width:0"></i></div>
    <div class="tbl-wrap" style="max-height:460px;overflow:auto"><table class="tbl"><thead><tr><th>Baris</th><th>Unit / Kelas</th><th>Nama Lengkap</th><th>Tanggal Lahir</th><th>JK</th><th>Kontak</th><th>Validasi</th></tr></thead><tbody>${r.slice(0, 500).map(x => `<tr class="${x.st === 'error' ? 'row-err' : x.st === 'ganda' ? 'row-warn' : ''}"><td>${x.baris}</td><td>${esc(x.unit)} • ${esc(x.kelas)}</td><td><b>${esc(x.nama)}</b></td><td ${x.st === 'error' && !x.tgl_lahir ? 'style="color:var(--red)"' : ''}>${esc(x.tgl_lahir || x.tglAsli)}</td><td>${esc(x.jk)}</td><td class="xs">${x.no_wa ? ic('message-circle', 'ic-sm') + esc(x.no_wa) : ''}${x.no_wa_wali ? '<div class="muted">Wali: ' + esc(x.no_wa_wali) + '</div>' : ''}</td><td><span class="badge ${x.st === 'valid' ? (x.upd ? 'b-blue' : 'b-green') : x.st === 'error' ? 'b-red' : 'b-amber'}">${x.st === 'valid' ? esc(x.msg) : (x.st === 'error' ? 'Error: ' : 'Ganda: ') + esc(x.msg)}</span></td></tr>`).join('')}</tbody></table></div>`;
  $('#impReset', el).onclick = () => { IMP.rows = []; IMP.step = 2; route(); };
  $('#impSimpan', el).onclick = async () => {
    const btn = $('#impSimpan', el); btn.disabled = true; IMP.step = 4;
    let tambah = 0, ganda = 0, err = [];
    for (let i = 0; i < v.length; i += 200) {
      const chunk = v.slice(i, i + 200).map(x => ({ baris: x.baris, nama: x.nama, unit: x.unit, level: x.level, kelas: x.kelas, tgl_lahir: x.tgl_lahir, jk: x.jk, tahun_ajaran: x.tahun_ajaran, no_wa: x.no_wa, email: x.email, nama_wali: x.nama_wali, no_wa_wali: x.no_wa_wali, email_wali: x.email_wali }));
      $('#impStat', el).textContent = 'Menyimpan batch ' + (i / 200 + 1) + '…';
      const res = await api('importSiswa', { rows: chunk, perbarui: !!IMP.perbarui });
      if (!res.success) { toast(res.message, 'error'); btn.disabled = false; return; }
      tambah += res.data.ditambah + (res.data.diperbarui || 0); ganda += res.data.ganda; err = err.concat(res.data.error);
      $('#impCnt', el).textContent = Math.min(v.length, i + 200) + ' / ' + v.length; $('#impBar', el).style.width = pct(Math.min(v.length, i + 200), v.length) + '%';
    }
    $('#impStat', el).textContent = 'Selesai.';
    toast(`${tambah} siswa disimpan${ganda ? ', ' + ganda + ' ganda dilewati' : ''}${err.length ? ', ' + err.length + ' error' : ''}.`, 'success', 5000);
    IMP.rows = []; IMP.step = 1; segarAdmin();
  };
}

/* ============================================================
   NAIK KELAS MASSAL
   ============================================================ */
function saranKelas(nama, level) {
  const n = Number(level);
  if (n === 9 || n === 12) return 'LULUS';
  return String(nama).replace(/^(\d{1,2})/, m => String(Number(m) + 1));
}
registerPage('naik-kelas', {
  auth: ['ADMIN'], shell: 'staf', title: 'Naik Kelas Massal',
  show(el) {
    adminShell(el, d => {
      const ta = d.pengaturan.tahun_ajaran_aktif || '', nx = ta.replace(/(\d{4})\/(\d{4})/, (m, a, b) => (+a + 1) + '/' + (+b + 1));
      const kls = d.kelas.filter(k => k.tahun === ta).sort((a, b) => (a.unit + a.nama).localeCompare(b.unit + b.nama, 'id', { numeric: true }));
      el.innerHTML = `<div class="stack"><div class="card row wrap"><div class="grow"><h3>Pemetaan Kenaikan Kelas</h3><p class="small muted">Riwayat hasil tes siswa tetap tersimpan dan dapat dibandingkan antar tahun ajaran.</p></div>
        <label class="field"><span class="xs">Dari</span><select class="select" id="nkDari" style="width:auto">${d.tahun.map(t => `<option ${t === ta ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>${ic('arrow-right')}
        <label class="field"><span class="xs">Ke</span><input class="input" id="nkKe" value="${esc(nx)}" style="width:140px"></label>
        <label class="check small"><input type="checkbox" id="nkAktif" checked> Jadikan tahun ajaran aktif</label><button class="btn" id="nkProses">Proses Naik Kelas</button></div>
        <div class="card">${kls.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kelas Saat Ini</th><th style="text-align:center">Arah</th><th>Kelas Tujuan / Status</th><th>Tingkat Baru</th></tr></thead><tbody>${kls.map((k, i) => { const s = saranKelas(k.nama, k.level); return `<tr><td><div class="card flat pad-s row between" style="background:var(--subtle)"><b>${esc(k.unit)} • ${esc(k.nama)}</b><span class="badge b-p">${d.jumlahKelas[ta + '|' + k.nama] || 0} siswa</span></div></td>
          <td style="text-align:center">${s === 'LULUS' ? ic('graduation-cap') : ic('arrow-right')}</td><td><input class="input" data-nk="${i}" data-lama="${esc(k.nama)}" data-unit="${esc(k.unit)}" value="${esc(s)}" list="nkList"></td><td><input class="input" data-lv="${i}" style="width:90px" value="${s === 'LULUS' ? '' : Number(k.level) + 1}"></td></tr>`; }).join('')}</tbody></table></div>
          <datalist id="nkList"><option value="LULUS">Tandai lulus (alumni)</option>${kls.map(k => `<option value="${esc(saranKelas(k.nama, k.level))}">`).join('')}</datalist><p class="xs muted" style="margin-top:10px">Ketik <b>LULUS</b> untuk menandai siswa sebagai alumni. Kosongkan untuk melewati kelas tersebut.</p>` : kosong('Tidak ada kelas', 'Belum ada kelas pada tahun ajaran aktif.', 'school')}</div></div>`;
      $('#nkProses', el).onclick = async () => {
        const peta = $$('[data-nk]', el).filter(i => i.value.trim()).map(i => ({ kelas_lama: i.dataset.lama, kelas_baru: i.value.trim(), level_baru: $(`[data-lv="${i.dataset.nk}"]`, el).value.trim(), unit_baru: Number($(`[data-lv="${i.dataset.nk}"]`, el).value) >= 10 ? 'SMA' : i.dataset.unit }));
        const dari = $('#nkDari', el).value, ke = $('#nkKe', el).value.trim();
        if (!/^\d{4}\/\d{4}$/.test(ke)) return toast('Format tahun ajaran tujuan: 2027/2028', 'warning');
        if (!await konfirmasi('Proses kenaikan kelas?', `${peta.length} kelas dari ${esc(dari)} akan dipindahkan ke ${esc(ke)}. Tindakan ini mengubah data siswa.`, 'Proses')) return;
        busy(true, 'Memproses kenaikan kelas…');
        const r = await api('naikKelas', { dari_tahun: dari, ke_tahun: ke, peta, set_aktif: $('#nkAktif', el).checked });
        busy(false); toast(r.message, r.success ? 'success' : 'error', 5000); if (r.success) segarAdmin();
      };
    });
  }
});

/* ============================================================
   KELOLA STAF
   ============================================================ */
const BADGE_PERAN = { GURU: ['Guru', 'b-blue'], BK: ['Guru BK', 'b-pink'], PIMPINAN: ['Pimpinan', 'b-p'], ADMIN: ['Admin', ''] };
registerPage('staf', {
  auth: ['ADMIN'], shell: 'staf', title: 'Kelola Staf & Hak Akses',
  show(el) {
    adminShell(el, d => {
      const ta = d.pengaturan.tahun_ajaran_aktif, wali = {}; d.kelas.filter(k => k.tahun === ta && k.wali).forEach(k => wali[k.wali.toLowerCase()] = k.nama);
      const render = q => {
        const l = d.staf.filter(s => !q || (s.nama + s.email).toLowerCase().includes(q.toLowerCase()));
        $('#stBox', el).innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama & Email</th><th>Peran</th><th>Penugasan Unit / Kelas</th><th>Status</th><th style="text-align:right">Aksi</th></tr></thead><tbody>${l.map(s => `<tr><td><b>${esc(s.nama)}</b><div class="xs muted">${esc(s.email)}${s.no_wa ? ' • ' + esc(s.no_wa) : ''}</div></td><td><span class="badge ${BADGE_PERAN[s.peran][1]}">${BADGE_PERAN[s.peran][0]}</span></td>
          <td><div class="row wrap" style="gap:4px">${s.peran === 'GURU' ? s.kelas_diampu.map(k => `<span class="badge">${esc(k)}</span>`).join('') + (wali[s.email] ? `<span class="badge b-green">Wali ${esc(wali[s.email])}</span>` : '') : s.peran === 'BK' ? `<span class="badge">Unit ${esc(s.unit_binaan)}</span>` : s.peran === 'PIMPINAN' ? '<span class="badge">Semua Unit</span>' : '<span class="badge">Akses Penuh</span>'}</div></td>
          <td><span class="badge ${s.aktif ? 'b-green' : 'b-red'}">${s.aktif ? 'Aktif' : 'Nonaktif'}</span></td>
          <td style="text-align:right;white-space:nowrap"><button class="link small" data-ed="${s.id}">Edit</button> <button class="link small" style="color:#92400E" data-rs="${s.id}">Reset Sandi</button>${s.peran !== 'ADMIN' || d.staf.filter(x => x.peran === 'ADMIN' && x.aktif).length > 1 ? ` <button class="link small" style="color:var(--red)" data-nf="${s.id}">${s.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
        $$('[data-ed]', el).forEach(b => b.onclick = () => formStaf(d, d.staf.find(s => s.id === b.dataset.ed), wali));
        $$('[data-rs]', el).forEach(b => b.onclick = async () => { const s = d.staf.find(x => x.id === b.dataset.rs); if (!await konfirmasi('Reset kata sandi?', `Kata sandi ${esc(s.nama)} akan diganti dan semua sesinya dikeluarkan.`, 'Reset')) return; const r = await api('resetSandi', { id: s.id }); if (r.success) tampilSandi(s.email, r.data.sandi); else toast(r.message, 'error'); });
        $$('[data-nf]', el).forEach(b => b.onclick = async () => { const s = d.staf.find(x => x.id === b.dataset.nf); const r = await api('simpanStaf', Object.assign({}, s, { aktif: !s.aktif })); toast(r.message, r.success ? 'success' : 'error'); if (r.success) { Store.del(userKey('admin')); route(); } });
      };
      el.innerHTML = `<div class="stack"><div class="row wrap"><div class="search grow" style="max-width:360px">${ic('search')}<input class="input" id="stQ" placeholder="Cari nama atau email staf…"></div><span class="grow"></span><button class="btn" id="stAdd">${ic('user-plus')} Tambah Staf</button></div><div class="card" style="padding:0" id="stBox"></div></div>`;
      $('#stQ', el).oninput = debounce(e => render(e.target.value), 200);
      $('#stAdd', el).onclick = () => formStaf(d, null, wali);
      render('');
    });
  }
});
function tampilSandi(email, sandi) {
  const m = modal(`<h3>Kata Sandi Baru</h3><p class="muted small" style="margin:6px 0 14px">Sampaikan secara pribadi kepada pemilik akun <b>${esc(email)}</b>. Kata sandi ini hanya ditampilkan sekali.</p><div style="font:700 24px Poppins;letter-spacing:2px;background:var(--p-ctr);color:var(--on-p-ctr);padding:14px;border-radius:12px;text-align:center">${esc(sandi)}</div><div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn line" data-c>${ic('copy', 'ic-sm')} Salin</button><button class="btn" data-x>Selesai</button></div>`, { sticky: true });
  m.querySelector('[data-c]').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(sandi); toast('Disalin', 'success', 1200); };
  m.querySelector('[data-x]').onclick = closeModal;
}
function formStaf(d, s, wali) {
  const ta = d.pengaturan.tahun_ajaran_aktif, kls = d.kelas.filter(k => k.tahun === ta).map(k => k.nama).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  const units = (d.pengaturan.daftar_unit || 'SMP,SMA').split(',').map(x => x.trim());
  s = s || { nama: '', email: '', peran: 'GURU', unit_binaan: units[0], kelas_diampu: [], aktif: true };
  const box = slideOver(s.id ? 'Edit Staf' : 'Tambah Staf', `<div class="stack"><label class="field"><span>Nama lengkap *</span><input class="input" id="fsNama" value="${esc(s.nama)}"></label>
    <label class="field"><span>Email *</span><input class="input" type="email" id="fsEmail" value="${esc(s.email)}"></label>
    <label class="field"><span>WhatsApp <span class="muted">(untuk notifikasi, mis. kelas tuntas)</span></span><input class="input" type="tel" inputmode="tel" id="fsWa" value="${esc(s.no_wa || '')}" placeholder="0812xxxxxxx"></label>
    <label class="field"><span>Peran *</span><select class="select" id="fsPeran">${Object.keys(BADGE_PERAN).map(p => `<option value="${p}" ${s.peran === p ? 'selected' : ''}>${BADGE_PERAN[p][0]}</option>`).join('')}</select></label>
    <label class="field" id="fsUnitW"><span>Unit binaan (Guru BK)</span><select class="select" id="fsUnit">${units.map(u => `<option ${s.unit_binaan === u ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
    <div class="field" id="fsKlsW"><span>Kelas yang diampu</span><div class="row wrap" style="gap:6px;max-height:200px;overflow:auto">${kls.map(k => `<button type="button" class="chip ${s.kelas_diampu.includes(k) ? 'on' : ''}" data-k="${esc(k)}">${esc(k)}</button>`).join('') || '<span class="muted small">Belum ada kelas.</span>'}</div></div>
    <label class="field" id="fsWaliW"><span>Wali kelas dari <span class="muted">(menerima WA/email saat kelas tuntas tes)</span></span><select class="select" id="fsWali"><option value="">— Bukan wali kelas —</option>${kls.map(k => `<option ${wali[(s.email || '').toLowerCase()] === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
    ${s.id ? '' : '<label class="field"><span>Kata sandi awal <span class="muted">(kosongkan untuk dibuat otomatis)</span></span><input class="input" id="fsSandi"></label>'}
    <label class="check"><input type="checkbox" id="fsAktif" ${s.aktif ? 'checked' : ''}> Akun aktif</label></div>`, `<button class="btn line" data-close>Batal</button><button class="btn" id="fsOk">Simpan</button>`);
  const sync = () => { const p = $('#fsPeran', box).value; $('#fsUnitW', box).hidden = p !== 'BK'; $('#fsKlsW', box).hidden = p !== 'GURU'; $('#fsWaliW', box).hidden = p !== 'GURU'; };
  $('#fsPeran', box).onchange = sync; sync();
  $$('[data-k]', box).forEach(c => c.onclick = () => c.classList.toggle('on'));
  $('#fsOk', box).onclick = async () => {
    const peran = $('#fsPeran', box).value;
    const data = { id: s.id, nama: $('#fsNama', box).value.trim(), email: $('#fsEmail', box).value.trim(), peran, unit_binaan: $('#fsUnit', box).value, kelas_diampu: $$('[data-k].on', box).map(c => c.dataset.k), aktif: $('#fsAktif', box).checked, no_wa: $('#fsWa', box).value.trim(), sandi: $('#fsSandi', box) ? $('#fsSandi', box).value.trim() : '' };
    if (peran === 'GURU') data.wali_kelas = $('#fsWali', box).value;
    if (!data.nama || !/^\S+@\S+\.\S+$/.test(data.email)) return toast('Nama dan email valid wajib diisi.', 'warning');
    const btn = $('#fsOk', box); btn.disabled = true;
    const r = await api('simpanStaf', data); btn.disabled = false;
    if (!r.success) return toast(r.message, 'error');
    closeModal(); Store.del(userKey('admin')); route();
    if (r.data.sandi) tampilSandi(data.email, r.data.sandi); else toast(r.message, 'success');
  };
}

/* ============================================================
   KELOLA PERIODE
   ============================================================ */
registerPage('periode', {
  auth: ['ADMIN'], shell: 'staf', title: 'Kelola Periode Asesmen',
  show(el) {
    adminShell(el, d => {
      const list = d.periode.slice().sort((a, b) => (a.tgl_buka < b.tgl_buka ? 1 : -1)), BS = { DIBUKA: 'b-green', TERJADWAL: 'b-blue', DITUTUP: 'b-red' };
      el.innerHTML = `<div class="stack"><div class="row wrap"><p class="muted grow">Atur jadwal pembukaan dan tes yang aktif untuk setiap periode. Hanya satu periode yang dapat dibuka.</p><button class="btn" id="pAdd">${ic('circle-plus')} Buka Periode Baru</button></div>
        <div class="grid g3">${list.map(p => `<div class="card" style="${p.status === 'DIBUKA' ? 'border:2px solid var(--p)' : ''}"><div class="row between"><h3>${esc(p.nama_periode)}</h3><span class="badge ${BS[p.status] || ''}">${p.status === 'DIBUKA' ? 'Dibuka' : p.status === 'TERJADWAL' ? 'Terjadwal' : 'Ditutup'}</span></div>
          <p class="small muted" style="margin:4px 0 12px">${fmtTgl(p.tgl_buka)} – ${fmtTgl(p.tgl_tutup)} • TA ${esc(p.tahun_ajaran)}</p><div style="border-top:1px solid var(--line);padding-top:10px" class="stack-sm">${TES.map(t => `<div class="row between small"><span>${esc(K.tes(t).nama)} ${t === 'RIASEC' ? '(RIASEC)' : t === 'VARK' ? '(VARK)' : ''}</span>${p.tes_aktif.includes(t) ? `<span style="color:var(--p)">${ic('circle-check')}</span>` : `<span style="color:var(--line-2)">${ic('circle')}</span>`}</div>`).join('')}</div>
          <div class="row" style="margin-top:14px">${p.status === 'DIBUKA' ? `<button class="btn danger-soft block" data-tutup="${p.id_periode}">Tutup Periode</button>` : `<button class="btn line grow" data-edit="${p.id_periode}">Ubah Jadwal</button>${p.status !== 'DIBUKA' ? `<button class="btn soft" data-buka="${p.id_periode}">Buka</button>` : ''}`}</div></div>`).join('') || kosong('Belum ada periode', 'Buat periode pertama untuk membuka tes.', 'calendar')}</div>
        <div class="card"><h3 style="margin-bottom:6px">Reset Sesi Tes Siswa</h3><p class="small muted" style="margin-bottom:12px">Gunakan jika siswa mengalami kendala dan perlu mengerjakan ulang. Hasil & jawaban sesi tersebut akan dihapus.</p>
          <div class="row wrap"><div class="grow" style="min-width:220px"><input class="input" id="rsCari" list="rsList" placeholder="Ketik nama siswa…"><datalist id="rsList">${IDX().list.map(s => `<option value="${esc(s.nama)} — ${esc(s.kelas)}">`).join('')}</datalist></div>
          <select class="select" id="rsTes" style="width:auto">${TES.map(t => `<option value="${t}">${esc(K.tes(t).nama)}</option>`).join('')}</select><select class="select" id="rsPer" style="width:auto">${list.map(p => `<option value="${p.id_periode}">${esc(p.nama_periode)}</option>`).join('')}</select><button class="btn danger" id="rsOk">Reset</button></div></div></div>`;
      $('#pAdd', el).onclick = () => formPeriode(d, null);
      $$('[data-edit]', el).forEach(b => b.onclick = () => formPeriode(d, d.periode.find(p => p.id_periode === b.dataset.edit)));
      const ubah = async (id, status, judul) => { const p = d.periode.find(x => x.id_periode === id); if (!await konfirmasi(judul, status === 'DIBUKA' ? 'Periode lain yang sedang dibuka akan otomatis ditutup.' : 'Siswa tidak bisa lagi mengirim tes pada periode ini.', 'Ya')) return; const r = await api('simpanPeriode', Object.assign({}, p, { status })); toast(r.message, r.success ? 'success' : 'error'); if (r.success) segarAdmin(); };
      $$('[data-tutup]', el).forEach(b => b.onclick = () => ubah(b.dataset.tutup, 'DITUTUP', 'Tutup periode ini?'));
      $$('[data-buka]', el).forEach(b => b.onclick = () => ubah(b.dataset.buka, 'DIBUKA', 'Buka periode ini?'));
      $('#rsOk', el).onclick = async () => {
        const nm = $('#rsCari', el).value, s = IDX().list.find(x => `${x.nama} — ${x.kelas}` === nm);
        if (!s) return toast('Pilih siswa dari daftar.', 'warning');
        if (!await konfirmasi('Reset sesi tes?', `Hasil & jawaban ${esc(K.tes($('#rsTes', el).value).nama)} milik ${esc(s.nama)} akan dihapus.`, 'Reset', true)) return;
        const r = await api('resetSesi', { id_siswa: s.id, tes: $('#rsTes', el).value, id_periode: $('#rsPer', el).value });
        toast(r.message, r.success ? 'success' : 'error'); if (r.success) segarkanBoot();
      };
    });
  }
});
function formPeriode(d, p) {
  const ta = d.pengaturan.tahun_ajaran_aktif;
  p = p || { tahun_ajaran: ta, nama_periode: '', tgl_buka: new Date().toISOString().slice(0, 10), tgl_tutup: '', tes_aktif: TES.slice(), status: 'DIBUKA' };
  const m = modal(`<div class="card-h"><h3>${p.id_periode ? 'Ubah Periode' : 'Periode Baru'}</h3><button class="icon-btn" data-x aria-label="Tutup">${ic('x')}</button></div><div class="stack">
    <div class="grid g2"><label class="field"><span>Tahun ajaran</span><input class="input" id="fpTa" value="${esc(p.tahun_ajaran)}"></label><label class="field"><span>Nama periode</span><input class="input" id="fpNama" value="${esc(p.nama_periode)}" placeholder="Ganjil ${esc(ta)}"></label></div>
    <div class="grid g2"><label class="field"><span>Tanggal buka</span><input class="input" type="date" id="fpBuka" value="${esc(p.tgl_buka)}"></label><label class="field"><span>Tanggal tutup</span><input class="input" type="date" id="fpTutup" value="${esc(p.tgl_tutup)}"></label></div>
    <div class="field"><span>Tes yang aktif</span><div class="stack-sm">${TES.map(t => `<label class="check"><input type="checkbox" data-t="${t}" ${p.tes_aktif.includes(t) ? 'checked' : ''}> ${esc(K.tes(t).nama)}</label>`).join('')}</div></div>
    <label class="field"><span>Status</span><select class="select" id="fpSt">${['DIBUKA', 'TERJADWAL', 'DITUTUP'].map(s => `<option ${p.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
    <div class="row" style="justify-content:flex-end"><button class="btn line" data-x>Batal</button><button class="btn" id="fpOk">Simpan</button></div></div>`);
  $$('[data-x]', m).forEach(b => b.onclick = closeModal);
  m.querySelector('#fpOk').onclick = async () => {
    const data = { id_periode: p.id_periode, tahun_ajaran: $('#fpTa', m).value.trim(), nama_periode: $('#fpNama', m).value.trim(), tgl_buka: $('#fpBuka', m).value, tgl_tutup: $('#fpTutup', m).value, tes_aktif: $$('[data-t]:checked', m).map(c => c.dataset.t), status: $('#fpSt', m).value };
    if (!data.nama_periode || !data.tgl_buka || !data.tgl_tutup) return toast('Lengkapi nama dan tanggal periode.', 'warning');
    if (data.tgl_tutup < data.tgl_buka) return toast('Tanggal tutup harus setelah tanggal buka.', 'warning');
    if (!data.tes_aktif.length) return toast('Pilih minimal satu tes.', 'warning');
    const r = await api('simpanPeriode', data); toast(r.message, r.success ? 'success' : 'error'); if (r.success) { closeModal(); segarAdmin(); }
  };
}

/* ============================================================
   BANK SOAL & INTERPRETASI
   ============================================================ */
let bsTes = 'VARK', bsMode = 'soal', bsKode = '';
registerPage('bank-soal', {
  auth: ['ADMIN'], shell: 'staf', title: 'Bank Soal & Editor Interpretasi',
  show(el) {
    adminShell(el, d => {
      const soal = d.soal.filter(s => s.tes === bsTes).sort((a, b) => a.urutan - b.urutan);
      el.innerHTML = `<div class="stack"><div class="row wrap" style="border-bottom:1px solid var(--line);padding-bottom:12px">${TES.map(t => `<button class="chip ${t === bsTes ? 'on' : ''}" data-t="${t}" style="padding:10px 16px">${esc(K.tes(t).nama)} (${d.soal.filter(s => s.tes === t && s.aktif).length})</button>`).join('')}<span class="grow"></span>
        <div class="seg"><button class="${bsMode === 'soal' ? 'on' : ''}" data-m="soal">Daftar Soal</button><button class="${bsMode === 'interp' ? 'on' : ''}" data-m="interp">Editor Interpretasi</button></div></div><div id="bsIsi"></div></div>`;
      $$('[data-t]', el).forEach(b => b.onclick = () => { bsTes = b.dataset.t; bsKode = ''; route(); });
      $$('[data-m]', el).forEach(b => b.onclick = () => { bsMode = b.dataset.m; route(); });
      const box = $('#bsIsi', el);
      if (bsMode === 'soal') {
        box.innerHTML = `<div class="card"><div class="card-h"><h3>Daftar Pertanyaan ${esc(K.tes(bsTes).nama)}</h3><button class="btn" id="bsAdd">${ic('plus')} Tambah Soal</button></div>
          <div class="stack-sm">${soal.map((s, i) => `<div class="card flat pad-s row" style="background:var(--subtle);${s.aktif ? '' : 'opacity:.55'}"><span class="xs muted" style="width:28px">${String(i + 1).padStart(2, '0')}</span><span class="grow">${esc(s.teks)}${s.opsi && bsTes === 'VARK' ? `<div class="xs muted" style="margin-top:2px">${s.opsi.map(o => o.k + ': ' + esc(o.t)).join(' • ')}</div>` : ''}${s.opsi && bsTes === 'PS' ? `<div class="xs muted" style="margin-top:2px">${s.opsi.map(o => o.k + ': ' + esc(o.t)).join(' | ')}</div>` : ''}</span>
            ${s.terbalik ? '<span class="badge b-amber">Reverse</span>' : ''}${!s.aktif ? '<span class="badge b-red">Nonaktif</span>' : ''}<span class="badge b-p">${esc(bsTes === 'VARK' ? 'V • A • R • K' : bsTes === 'PS' ? s.dimensi : K.namaDim(bsTes, s.dimensi))}</span><button class="link small" data-e="${s.id}">Edit</button></div>`).join('')}</div></div>`;
        $('#bsAdd', box).onclick = () => formSoal(null);
        $$('[data-e]', box).forEach(b => b.onclick = () => formSoal(d.soal.find(s => s.id === b.dataset.e)));
      } else {
        const kodes = Object.keys(AppState.konten.interp).filter(k => k.startsWith(bsTes + '|')).map(k => k.split('|')[1]);
        if (!bsKode || !kodes.includes(bsKode)) bsKode = kodes[0];
        const it = K.interp(bsTes, bsKode) || {};
        const f = (id, lbl, val, ta, hint) => `<label class="field"><span>${lbl}${hint ? ` <span class="muted xs">${hint}</span>` : ''}</span>${ta ? `<textarea class="textarea" id="${id}" style="min-height:80px">${esc(val)}</textarea>` : `<input class="input" id="${id}" value="${esc(val)}">`}</label>`;
        box.innerHTML = `<div class="grid" style="grid-template-columns:220px 1fr 1fr;gap:16px;align-items:start"><div class="card pad-s stack-sm">${kodes.map(k => `<button class="theme-opt ${k === bsKode ? 'on' : ''}" data-k="${k}" style="padding:10px"><b>${esc(k)}</b><span class="small muted grow" style="margin-left:6px">${esc((K.interp(bsTes, k) || {}).judul || '').replace(/^\w{4}\s—\s/, '')}</span></button>`).join('')}</div>
          <div class="card stack">${f('iJudul', 'Judul', it.judul)}${f('iDesk', 'Penjelasan untuk siswa', it.deskripsi, 1)}${f('iKek', 'Kekuatan', (it.kekuatan || '').replace(/\|/g, '\n'), 1, 'satu poin per baris')}${f('iTan', 'Tantangan', (it.tantangan || '').replace(/\|/g, '\n'), 1, 'satu poin per baris')}
            ${f('iSaran', 'Saran pengembangan diri', (it.saran || '').replace(/\|/g, '\n'), 1, 'satu poin per baris')}${f('iBel', 'Cara belajar terbaik', it.belajar, 1)}${f('iGuru', 'Tips mengajar (untuk guru)', it.guru, 1)}${f('iKar', 'Saran jurusan/karier', (it.karier || '').replace(/\|/g, '\n'), 1, 'satu per baris')}
            <button class="btn" id="iSimpan">${ic('save')} Simpan Interpretasi</button></div>
          <div class="stack" id="iPrev"></div></div>`;
        $$('[data-k]', box).forEach(b => b.onclick = () => { bsKode = b.dataset.k; route(); });
        const val = () => ({ tes: bsTes, kode: bsKode, judul: $('#iJudul', box).value, deskripsi: $('#iDesk', box).value, kekuatan: $('#iKek', box).value.split('\n').map(x => x.trim()).filter(Boolean).join('|'), tantangan: $('#iTan', box).value.split('\n').map(x => x.trim()).filter(Boolean).join('|'), saran: $('#iSaran', box).value.split('\n').map(x => x.trim()).filter(Boolean).join('|'), belajar: $('#iBel', box).value, guru: $('#iGuru', box).value, karier: $('#iKar', box).value.split('\n').map(x => x.trim()).filter(Boolean).join('|') });
        const prev = () => { const v = val(); $('#iPrev', box).innerHTML = `<div class="xs bold muted">PRATINJAU KARTU HASIL SISWA</div><div class="hero res-hero" style="padding:18px"><h1 style="font-size:22px">${esc(v.judul)}</h1></div><div class="card"><h4 style="margin-bottom:6px">Penjelasan</h4><p class="small">${esc(v.deskripsi)}</p></div><div class="card tint-green"><h4 style="margin-bottom:6px">Kekuatanmu</h4>${ul(bagi(v.kekuatan))}</div><div class="card tint-amber"><h4 style="margin-bottom:6px">Tantanganmu</h4>${ul(bagi(v.tantangan))}</div>`; };
        $$('input,textarea', box).forEach(i => i.addEventListener('input', debounce(prev, 200))); prev();
        $('#iSimpan', box).onclick = async () => { const v = val(); const r = await api('simpanInterp', v); toast(r.message, r.success ? 'success' : 'error'); if (r.success) { AppState.konten.interp[bsTes + '|' + bsKode] = { judul: v.judul, deskripsi: v.deskripsi, kekuatan: v.kekuatan, tantangan: v.tantangan, saran: v.saran, belajar: v.belajar, guru: v.guru, karier: v.karier }; muatUlangKonten(); } };
      }
    });
  }
});
async function muatUlangKonten() { const r = await api('konten', {}); if (r.success && r.data.soal) setKonten(r.data); }
function formSoal(s) {
  const t = bsTes, dims = t === 'PS' ? [['EI', 'E / I'], ['SN', 'S / N'], ['TF', 'T / F'], ['JP', 'J / P']] : t === 'VARK' ? [['VARK', 'V • A • R • K']] : K.dim(t);
  s = s || { tes: t, dimensi: dims[0][0], teks: '', opsi: t === 'VARK' ? [{ k: 'V', t: '' }, { k: 'A', t: '' }, { k: 'R', t: '' }, { k: 'K', t: '' }] : t === 'PS' ? [{ k: 'E', t: '' }, { k: 'I', t: '' }] : null, terbalik: false, aktif: true, urutan: 0 };
  const m = modal(`<div class="card-h"><h3>${s.id ? 'Edit Soal ' + esc(s.id) : 'Tambah Soal ' + esc(K.tes(t).nama)}</h3><button class="icon-btn" data-x aria-label="Tutup">${ic('x')}</button></div><div class="stack">
    <label class="field"><span>Teks soal / pernyataan</span><textarea class="textarea" id="fqT" style="min-height:80px">${esc(s.teks)}</textarea></label>
    ${t !== 'VARK' ? `<label class="field"><span>Dimensi</span><select class="select" id="fqD">${dims.map(x => `<option value="${x[0]}" ${s.dimensi === x[0] ? 'selected' : ''}>${esc(x[1])}</option>`).join('')}</select></label>` : ''}
    ${t === 'VARK' ? s.opsi.map(o => `<label class="field"><span>Pilihan ${o.k} (${esc(K.namaDim('VARK', o.k))})</span><input class="input" data-o="${o.k}" value="${esc(o.t)}"></label>`).join('') : ''}
    ${t === 'PS' ? `<div class="grid g2">${[0, 1].map(i => `<label class="field"><span>Pilihan ${i ? 'B' : 'A'} → kutub <b id="fqK${i}">${esc((s.opsi[i] || {}).k || '')}</b></span><input class="input" data-p="${i}" value="${esc((s.opsi[i] || {}).t || '')}"></label>`).join('')}</div>` : ''}
    ${t === 'MI' ? `<label class="check"><input type="checkbox" id="fqR" ${s.terbalik ? 'checked' : ''}> Butir terbalik (skor dibalik 6 − jawaban)</label>` : ''}
    <div class="grid g2"><label class="field"><span>Urutan</span><input class="input" type="number" id="fqU" value="${s.urutan || ''}"></label><label class="check" style="margin-top:28px"><input type="checkbox" id="fqA" ${s.aktif ? 'checked' : ''}> Aktif ditampilkan</label></div>
    <p class="xs muted">Perubahan soal berlaku untuk sesi baru. Jawaban yang sudah terkirim tidak berubah.</p>
    <div class="row" style="justify-content:flex-end"><button class="btn line" data-x>Batal</button><button class="btn" id="fqOk">Simpan</button></div></div>`);
  $$('[data-x]', m).forEach(b => b.onclick = closeModal);
  const dSel = $('#fqD', m); if (t === 'PS' && dSel) dSel.onchange = () => { $('#fqK0', m).textContent = dSel.value[0]; $('#fqK1', m).textContent = dSel.value[1]; };
  m.querySelector('#fqOk').onclick = async () => {
    const data = { id: s.id, tes: t, dimensi: t === 'VARK' ? 'VARK' : dSel.value, teks: $('#fqT', m).value.trim(), terbalik: !!($('#fqR', m) && $('#fqR', m).checked), aktif: $('#fqA', m).checked, urutan: Number($('#fqU', m).value) || 0 };
    if (t === 'VARK') data.opsi = $$('[data-o]', m).map(i => ({ k: i.dataset.o, t: i.value.trim() }));
    if (t === 'PS') data.opsi = [0, 1].map(i => ({ k: data.dimensi[i], t: $(`[data-p="${i}"]`, m).value.trim() }));
    if (!data.teks || (data.opsi && data.opsi.some(o => !o.t))) return toast('Lengkapi teks soal dan semua pilihan.', 'warning');
    const r = await api('simpanSoal', data); toast(r.message, r.success ? 'success' : 'error');
    if (r.success) { closeModal(); Store.del(userKey('admin')); muatUlangKonten().then(route); }
  };
}

/* ============================================================
   AKUN UJI COBA
   ============================================================ */
registerPage('uji-coba', {
  auth: ['ADMIN'], shell: 'staf', title: 'Akun Uji Coba',
  show(el) {
    adminShell(el, d => {
      const on = (d.pengaturan.uji_coba_aktif || 'Y') === 'Y', u = d.uji;
      el.innerHTML = `<div class="stack"><div class="card row wrap"><label class="check grow"><input type="checkbox" id="ujOn" ${on ? 'checked' : ''}> <span><b>Aktifkan Akun Uji Coba</b><br><span class="small muted">Tombol "Coba Tes Gratis" tampil di halaman masuk.</span></span></label>
        <label class="field"><span class="xs">Simpan data (hari)</span><input class="input" type="number" id="ujHari" min="1" max="365" value="${esc(d.pengaturan.uji_coba_simpan_hari || 30)}" style="width:110px"></label><button class="btn" id="ujSimpan">Simpan</button></div>
        <div class="grid g3">${kpi('Peserta Uji Coba', u.peserta)}${kpi('Tes Selesai', u.tesSelesai)}${kpi('Aktif 7 Hari Terakhir', u.aktif7)}</div>
        <div class="card" style="padding:0"><div class="card-h" style="padding:20px 20px 0"><h3>Peserta Terbaru</h3><button class="btn danger-soft sm" id="ujHapus">${ic('trash-2', 'ic-sm')} Hapus Semua Data Uji Coba</button></div>
        ${u.daftar.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama Panggilan</th><th>Kategori</th><th>Email</th><th>Tes Selesai</th><th>Dibuat</th></tr></thead><tbody>${u.daftar.map(p => `<tr><td><b>${esc(p.nama)}</b></td><td><span class="badge b-orange">${esc(p.kategori)}</span></td><td>${esc(p.email || '-')}</td><td>${p.selesai} / 4</td><td>${fmtTgl(p.dibuat, true)}</td></tr>`).join('')}</tbody></table></div>` : kosong('Belum ada peserta', 'Peserta uji coba akan muncul di sini.', 'flask-conical')}</div></div>`;
      $('#ujSimpan', el).onclick = async () => { const r = await api('simpanPengaturan', { uji_coba_aktif: $('#ujOn', el).checked ? 'Y' : 'N', uji_coba_simpan_hari: $('#ujHari', el).value }); toast(r.message, r.success ? 'success' : 'error'); if (r.success) segarAdmin(); };
      $('#ujHapus', el).onclick = async () => { if (!await konfirmasi('Hapus semua data uji coba?', 'Semua akun dan hasil uji coba akan dihapus permanen.', 'Hapus', true)) return; const r = await api('hapusDataUji', {}); toast(r.message, r.success ? 'success' : 'error'); if (r.success) { Store.del(userKey('admin')); route(); } };
    });
  }
});

/* ============================================================
   PENGATURAN
   ============================================================ */
registerPage('pengaturan', {
  auth: ['ADMIN'], shell: 'staf', title: 'Pengaturan Sekolah',
  show(el) {
    adminShell(el, d => {
      const p = d.pengaturan; let logo = p.logo_url || '', tema = p.tema_default || 'ungu';
      el.innerHTML = `<div class="stack" style="max-width:860px;padding-bottom:80px"><div class="card stack"><h3>Identitas Sekolah & Kop PDF</h3><div class="grid g2"><label class="field"><span>Nama Sekolah</span><input class="input" id="pgNama" value="${esc(p.nama_sekolah || '')}"></label>
          <label class="field"><span>Tahun Ajaran Aktif</span><input class="input" id="pgTa" list="pgTaList" value="${esc(p.tahun_ajaran_aktif || '')}"><datalist id="pgTaList">${d.tahun.map(t => `<option>${esc(t)}</option>`).join('')}</datalist></label></div>
          <div class="row"><div class="logo-box" id="pgLogo" style="width:72px;height:72px;border-radius:16px;background:var(--p-ctr);color:var(--p)">${logo ? `<img src="${esc(logo)}" alt="">` : ic('graduation-cap', 'ic-lg')}</div><div><b>Logo Sekolah</b><div class="row" style="margin-top:6px"><label class="btn line sm">Unggah Logo Baru<input type="file" accept="image/*" id="pgFile" hidden></label>${logo ? '<button class="link small" id="pgHapus">Hapus</button>' : ''}</div><p class="xs muted">PNG/JPG, otomatis diperkecil menjadi 160px.</p></div></div></div>
        <div class="card"><h3 style="margin-bottom:12px">Tema Warna Bawaan</h3><div class="grid g4" id="pgTema">${Object.keys(TEMA).map(k => `<button class="theme-opt ${k === tema ? 'on' : ''}" data-t="${k}"><span class="sw">${TEMA[k].w.slice(0, 2).map(c => `<i style="background:${c}"></i>`).join('')}</span><b class="small">${TEMA[k].nama}</b></button>`).join('')}</div><p class="xs muted" style="margin-top:8px">Tema awal untuk pengguna yang belum memilih tema sendiri.</p></div>
        <div class="card"><h3 style="margin-bottom:12px">Unit Sekolah Aktif</h3><input class="input" id="pgUnit" value="${esc(p.daftar_unit || 'SMP,SMA')}"><p class="xs muted" style="margin-top:6px">Pisahkan dengan koma, contoh: SMP,SMA</p></div>
        <div style="position:fixed;bottom:0;left:var(--side-w);right:0;background:var(--surface);border-top:1px solid var(--line);padding:12px 24px;display:flex;justify-content:flex-end;z-index:20" class="pg-bar"><button class="btn" id="pgOk">${ic('save')} Simpan Pengaturan</button></div></div>`;
      $$('#pgTema [data-t]', el).forEach(b => b.onclick = () => { tema = b.dataset.t; $$('#pgTema [data-t]', el).forEach(x => x.classList.toggle('on', x === b)); });
      $('#pgFile', el).onchange = e => { const f = e.target.files[0]; if (!f) return; const img = new Image(); img.onload = () => { const c = document.createElement('canvas'), s = 160 / Math.max(img.width, img.height); c.width = Math.round(img.width * Math.min(1, s)); c.height = Math.round(img.height * Math.min(1, s)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); logo = c.toDataURL('image/png'); if (logo.length > 45000) logo = c.toDataURL('image/jpeg', .8); $('#pgLogo', el).innerHTML = `<img src="${logo}" alt="">`; }; img.src = URL.createObjectURL(f); };
      const h = $('#pgHapus', el); if (h) h.onclick = () => { logo = ''; $('#pgLogo', el).innerHTML = ic('graduation-cap', 'ic-lg'); };
      $('#pgOk', el).onclick = async () => {
        const r = await api('simpanPengaturan', { nama_sekolah: $('#pgNama', el).value.trim(), tahun_ajaran_aktif: $('#pgTa', el).value.trim(), logo_url: logo, tema_default: tema, daftar_unit: $('#pgUnit', el).value.replace(/\s/g, '') });
        toast(r.message, r.success ? 'success' : 'error'); if (r.success) segarAdmin();
      };
    });
  }
});
