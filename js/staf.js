/* ============================================================
   staf.js — Guru, Guru BK, Pimpinan (dan menu analitik Admin)
   Semua agregasi dihitung di perangkat dari data boot (filter
   & pindah menu instan, tanpa panggilan server tambahan).
   ============================================================ */
'use strict';
let _idx = null, _idxOf = null;
/** Indeks siswa + hasil periode terpilih (dihitung sekali per data boot). */
function IDX() {
  const B = AppState.boot;
  if (!B || !B.siswa) return { list: [], map: {} };
  if (_idxOf === B) return _idx;
  const map = {}, ord = B.urutanDimensi || {};
  const list = B.siswa.map(r => (map[r[0]] = { id: r[0], nama: r[1], unit: r[2], level: r[3], kelas: r[4], jk: r[5], hasil: {}, draf: {}, prev: {} }));
  (B.hasil || []).forEach(h => {
    const s = map[h[0]]; if (!s) return;
    const skor = {}; (ord[h[1]] || []).forEach((k, i) => { skor[k] = h[3][i]; });
    s.hasil[h[1]] = { tes: h[1], tipe: h[2], skor, kejelasan: h[4] || '' };
  });
  (B.draf || []).forEach(d => { if (map[d[0]]) map[d[0]].draf[d[1]] = d[2]; });
  (B.hasilPrev || []).forEach(d => { if (map[d[0]]) map[d[0]].prev[d[1]] = d[2]; });
  _idx = { list, map }; _idxOf = B;
  return _idx;
}
const perAktif = () => { const B = AppState.boot; return (B.periode || []).find(p => p.id_periode === B.idPeriode) || null; };
const tesPer = () => { const p = perAktif(); return p ? p.tes_aktif : TES; };
const selesaiSemua = s => tesPer().every(t => s.hasil[t]);
const domVark = s => s.hasil.VARK ? s.hasil.VARK.tipe.charAt(0) : null;
const labelVark = tipe => tipe.split('').map(k => K.namaDim('VARK', k)).join('–');
function statusSiswa(s) {
  const n = tesPer().filter(t => s.hasil[t]).length, d = Object.keys(s.draf).length;
  if (n === tesPer().length) return ['Selesai', 'b-green'];
  if (n || d) return [`Proses ${n}/${tesPer().length}`, 'b-amber'];
  return ['Belum mulai', ''];
}
/** Ubah hasil ringkas → objek hasil lengkap (untuk tampilan & PDF). */
function keHasil(s, t) {
  const h = s.hasil[t]; if (!h) return null;
  const p = perAktif();
  return { tes: t, tipe: h.tipe, skor: h.skor, kejelasan: h.kejelasan, label: t === 'VARK' ? labelVark(h.tipe) : h.tipe, nama_periode: p ? p.nama_periode : '', tanggal: '' };
}
function alasanPendampingan(s) {
  const out = [], tp = tesPer(), belum = tp.filter(t => !s.hasil[t] && !s.draf[t]).length;
  if (belum === tp.length) out.push(['Belum mengerjakan', 'b-red']);
  else if (belum >= 2) out.push([belum + ' tes belum dimulai', 'b-amber']);
  const mi = s.hasil.MI; if (mi && Object.values(mi.skor).every(v => v < 40)) out.push(['Skor MI rendah semua', 'b-pink']);
  const ri = s.hasil.RIASEC; if (ri && Object.values(ri.skor).every(v => v < 35)) out.push(['Belum ada arah jurusan', '']);
  const ps = s.hasil.PS; if (ps) { let j = {}; try { j = JSON.parse(ps.kejelasan || '{}'); } catch (e) {} if (Object.values(j).filter(v => v === 'tipis').length >= 3) out.push(['Gaya pribadi belum jelas', '']); }
  if (s.prev.PS && ps) { const beda = [...ps.tipe].filter((c, i) => c !== s.prev.PS[i]).length; const vk = s.prev.VARK && s.hasil.VARK && s.prev.VARK.charAt(0) !== s.hasil.VARK.tipe.charAt(0); if (beda >= 2 || (beda && vk)) out.push(['Perubahan drastis', 'b-orange']); }
  return out;
}
/** Statistik sekumpulan siswa. */
function statistik(list) {
  const tp = tesPer(), st = { n: list.length, selesai: {}, draf: {}, vark: {}, riasec: {}, ps: {}, mi: {}, miN: 0, riAvg: {}, riN: 0, tuntas: 0, belum: 0 };
  list.forEach(s => {
    tp.forEach(t => { if (s.hasil[t]) st.selesai[t] = (st.selesai[t] || 0) + 1; else if (s.draf[t]) st.draf[t] = (st.draf[t] || 0) + 1; });
    if (selesaiSemua(s)) st.tuntas++;
    if (!tp.some(t => s.hasil[t] || s.draf[t])) st.belum++;
    const v = domVark(s); if (v) st.vark[v] = (st.vark[v] || 0) + 1;
    if (s.hasil.RIASEC) { const c = s.hasil.RIASEC.tipe.charAt(0); st.riasec[c] = (st.riasec[c] || 0) + 1; st.riN++; Object.entries(s.hasil.RIASEC.skor).forEach(([k, x]) => st.riAvg[k] = (st.riAvg[k] || 0) + x); }
    if (s.hasil.PS) st.ps[s.hasil.PS.tipe] = (st.ps[s.hasil.PS.tipe] || 0) + 1;
    if (s.hasil.MI) { st.miN++; Object.entries(s.hasil.MI.skor).forEach(([k, x]) => st.mi[k] = (st.mi[k] || 0) + x); }
  });
  Object.keys(st.mi).forEach(k => st.mi[k] = Math.round(st.mi[k] / st.miN));
  Object.keys(st.riAvg).forEach(k => st.riAvg[k] = Math.round(st.riAvg[k] / st.riN));
  return st;
}
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
const topKey = o => Object.entries(o).sort((a, b) => b[1] - a[1])[0];

/* ---------- Blok UI yang dipakai ulang ---------- */
const kpi = (lbl, val, extra = '') => `<div class="card kpi"><div class="lbl">${lbl}</div><div class="row between" style="align-items:flex-end"><div class="val">${val}</div>${extra}</div></div>`;
function blokPenyelesaian(st) {
  return `<div class="card kpi"><div class="lbl" style="margin-bottom:10px">Penyelesaian per Tes</div><div class="grid g2" style="gap:10px 16px">${tesPer().map(t => {
    const p = pct(st.selesai[t] || 0, st.n), c = WARNA.VARK[['V', 'A', 'R', 'K'][TES.indexOf(t)]];
    return `<div><div class="row between xs bold"><span>${t === 'PS' ? '16 Type' : t}</span><span>${p}%</span></div><div class="bar thin" style="margin-top:4px"><i style="width:${p}%;background:${c}"></i></div></div>`;
  }).join('')}</div></div>`;
}
function blokVark(st) {
  const tot = Object.values(st.vark).reduce((a, b) => a + b, 0);
  if (!tot) return `<div class="card"><h3>Distribusi VARK</h3>${kosong('Belum ada data', 'Belum ada siswa yang menyelesaikan tes ini.', 'eye')}</div>`;
  return `<div class="card"><h3 style="margin-bottom:16px">Distribusi Gaya Belajar</h3>${Chart.hbars(K.dim('VARK').map(d => ({ l: d[1], v: st.vark[d[0]] || 0, c: WARNA.VARK[d[0]], n: `${st.vark[d[0]] || 0} siswa (${pct(st.vark[d[0]] || 0, tot)}%)` })).sort((a, b) => b.v - a.v), { max: Math.max(...Object.values(st.vark)), wLabel: 90 }).replace(/grid-template-columns:90px 1fr 64px/g, 'grid-template-columns:90px 1fr 120px')}</div>`;
}
function blokMi(st) {
  if (!st.miN) return `<div class="card"><h3>Rata-rata Kecerdasan (MI)</h3>${kosong('Belum ada data', 'Belum ada hasil MI.', 'brain')}</div>`;
  const dims = K.dim('MI');
  return `<div class="card"><h3>Rata-rata Kecerdasan (MI)</h3><div class="chart-box">${Chart.radar(dims.map(d => d[1].split('-')[0]), [{ vals: dims.map(d => st.mi[d[0]] || 0), c: cssVar('--p') }], { size: 280, fontSize: 10 })}</div></div>`;
}
function blokRiasec(st) {
  const tot = st.riN;
  return `<div class="card"><h3 style="margin-bottom:16px">Distribusi Minat RIASEC</h3>${tot ? `<div class="grid g3" style="grid-template-columns:repeat(3,1fr);gap:10px">${K.dim('RIASEC').map(d => `<div class="card flat pad-s" style="background:var(--subtle)"><div class="xs row" style="gap:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(d[1])}"><span class="dot" style="background:${WARNA.RIASEC[d[0]]}"></span><b>${d[0]}</b> ${esc(d[1])}</div><div style="font:700 20px Poppins;margin-top:4px">${pct(st.riasec[d[0]] || 0, tot)}%</div></div>`).join('')}</div>` : kosong('Belum ada data', 'Belum ada hasil RIASEC.', 'compass')}</div>`;
}
function blokPs(st) {
  const e = Object.entries(st.ps).sort((a, b) => b[1] - a[1]), tot = e.reduce((a, b) => a + b[1], 0);
  if (!tot) return `<div class="card"><h3>Peta 16 Tipe Kepribadian</h3>${kosong('Belum ada data', 'Belum ada hasil Personality Style.', 'user-round')}</div>`;
  const top = e.slice(0, 3), sisa = e.slice(3).reduce((a, b) => a + b[1], 0), warna = [['var(--p)', '#fff'], ['#EFF6FF', '#1D4ED8'], ['#DCFCE7', '#166534']];
  return `<div class="card"><h3 style="margin-bottom:16px">Peta 16 Tipe Kepribadian</h3><div class="tm">${top.map(([k, v], i) => `<div style="background:${warna[i][0]};color:${warna[i][1]};${i === 0 ? 'grid-column:span 2;grid-row:span 2' : ''}"><b>${k}</b><span>${v} siswa (${pct(v, tot)}%)</span></div>`).join('')}${sisa ? `<div style="background:#F1F5F9;color:#475569;grid-column:1/-1;flex-direction:row;align-items:center;justify-content:space-between"><b>Lainnya (${e.length - 3} tipe)</b><span>${sisa} siswa</span></div>` : ''}</div>
    <p class="xs muted" style="margin-top:10px">${e.length} tipe berbeda di kelompok ini.</p></div>`;
}
function blokStatus(st) {
  return `<div class="card"><div class="card-h"><h3>Status Penyelesaian Tes</h3><div class="row xs" style="gap:10px"><span class="row" style="gap:4px"><span class="dot" style="background:#16A34A"></span>Selesai</span><span class="row" style="gap:4px"><span class="dot" style="background:#F59E0B"></span>Draf</span><span class="row" style="gap:4px"><span class="dot" style="background:#CBD5E1"></span>Belum</span></div></div>
    <div class="stack-sm">${tesPer().map(t => { const s = st.selesai[t] || 0, d = st.draf[t] || 0; return `<div class="row"><span class="small" style="width:90px">${t === 'PS' ? '16 Type' : t}</span><div class="grow">${Chart.stack([{ v: s, c: '#16A34A', l: 'Selesai' }, { v: d, c: '#F59E0B', l: 'Draf' }, { v: Math.max(0, st.n - s - d), c: '#CBD5E1', l: 'Belum' }])}</div><span class="xs muted" style="width:52px;text-align:right">${s}/${st.n}</span></div>`; }).join('')}</div></div>`;
}

/* ---------- Ganti periode (cache per periode → instan) ---------- */
async function gantiPeriode(id) {
  const B = AppState.boot; if (!B || id === B.idPeriode) return;
  const c = Store.get(userKey('boot:' + id), null);
  if (c) { AppState.boot = c.data; rerenderStaf(); }
  else toast('Memuat data periode…', 'info', 1500);
  const r = await api('stafBoot', { periode: id, kontenVer: AppState.konten ? AppState.konten.ver : '' });
  if (!r.success) return toast(r.message, 'error');
  if (r.data.konten) setKonten(r.data.konten);
  const d = stripKonten(r.data); Store.set(userKey('boot:' + id), { t: Date.now(), h: '', data: d });
  if (!c || hashStr(JSON.stringify(c.data)) !== hashStr(JSON.stringify(d))) { AppState.boot = d; rerenderStaf(); }
}
function rerenderStaf() { $$('#main .page').forEach(p => p.remove()); route(); isiPeriodeSelect(); }

/* ============================================================
   PEMETAAN KELAS
   ============================================================ */
let heatTes = 'VARK', modeGrup = 'het';
registerPage('kelas', {
  auth: 'staf', shell: 'staf', title: 'Pemetaan Kelas',
  show(el) {
    const B = AppState.boot; if (!B || !B.kelas) { el.innerHTML = skel(4, 140); return; }
    if (!B.kelas.length) { el.innerHTML = kosong('Belum ada kelas', AppState.role === 'GURU' ? 'Anda belum ditugaskan ke kelas mana pun. Hubungi admin.' : 'Belum ada data kelas pada tahun ajaran aktif.', 'school'); return; }
    let kls = Store.get(userKey('kelasPilih'), '') ; if (!B.kelas.find(k => k.nama === kls)) kls = B.kelas[0].nama;
    const list = IDX().list.filter(s => s.kelas === kls), st = statistik(list), k = B.kelas.find(x => x.nama === kls), p = perAktif();
    const sisa = p && p.tgl_tutup ? sisaHari(p.tgl_tutup) : null;
    el.innerHTML = `<div class="stack">
      <div class="card row wrap" style="padding:16px 20px">${ic('book-open-check')}<b>Kelas Aktif:</b><select class="select" id="kSel" style="width:auto;min-width:240px">${B.kelas.map(x => `<option ${x.nama === kls ? 'selected' : ''}>${esc(x.nama)}</option>`).join('')}</select>
        <span class="muted small">${esc(k.unit)} • ${IDX().list.filter(s => s.kelas === kls).length} siswa</span><span class="grow"></span>${p ? `<span class="badge ${p.status === 'DIBUKA' ? 'b-green' : ''}">${p.status === 'DIBUKA' ? 'Periode aktif' : esc(p.status)}${sisa != null && p.status === 'DIBUKA' ? ' • berakhir ' + Math.max(0, sisa) + ' hari lagi' : ''}</span>` : ''}</div>
      <div class="grid g3">${kpi('Total Siswa Kelas', st.n, `<span class="badge b-p">${esc(kls)}</span>`)}${blokPenyelesaian(st)}${kpi('Siswa Belum Mulai', `<span style="color:${st.belum ? '#9D174D' : 'inherit'}">${st.belum}</span>`, st.belum ? '<span class="badge b-pink">Perlu pengingat</span>' : '<span class="badge b-green">Semua sudah mulai</span>')}</div>
      <div class="grid g3">${blokVark(st)}${blokMi(st)}${blokRiasec(st)}</div>
      <div class="grid g2">${blokPs(st)}${blokStatus(st)}</div>
      <div class="card"><div class="card-h"><h3>Heatmap Siswa × Dimensi</h3><div class="seg" id="hmSeg">${TES.map(t => `<button class="${t === heatTes ? 'on' : ''}" data-t="${t}">${t === 'PS' ? '16 Type' : t}</button>`).join('')}</div></div><div class="tbl-wrap" id="hmBox"></div></div>
      <div class="card"><div class="card-h"><div><h3>Saran Pengelompokan</h3><p class="small muted" id="grDesc"></p></div><div class="row"><select class="select" id="grSize" style="width:auto"><option value="4">4 per kelompok</option><option value="5">5 per kelompok</option><option value="3">3 per kelompok</option></select><div class="seg" id="grSeg"><button data-m="het" class="${modeGrup === 'het' ? 'on' : ''}">Heterogen</button><button data-m="hom" class="${modeGrup === 'hom' ? 'on' : ''}">Homogen</button></div></div></div><div class="grid g3" id="grBox"></div></div>
      <div class="card" style="padding:0"><div class="card-h" style="padding:20px 20px 0"><h3>Daftar Siswa</h3><button class="btn line sm" id="kPdf">${ic('download', 'ic-sm')} PDF profil kelas</button></div>${tabelSiswa(list)}</div></div>`;
    $('#kSel', el).onchange = e => { Store.set(userKey('kelasPilih'), e.target.value); route(); };
    const heat = () => {
      const dims = heatTes === 'PS' ? [['E', 'E'], ['N', 'N'], ['F', 'F'], ['P', 'P']] : K.dim(heatTes);
      const rows = list.filter(s => s.hasil[heatTes]);
      $('#hmBox', el).innerHTML = rows.length ? `<table class="heat"><thead><tr><th>Siswa</th>${dims.map(d => `<th title="${esc(d[1])}">${esc(heatTes === 'MI' ? d[1].split('-')[0].slice(0, 7) : heatTes === 'PS' ? K.namaDim('PS', d[0]).slice(0, 9) : d[1])}</th>`).join('')}</tr></thead><tbody>${rows.map(s => `<tr><td><a href="#/siswa/${s.id}">${esc(s.nama)}</a></td>${dims.map(d => { const v = s.hasil[heatTes].skor[d[0]] || 0, [bg, fg] = heatColor(v); return `<td class="h" style="background:${bg};color:${fg}">${v}</td>`; }).join('')}</tr>`).join('')}</tbody></table>` : kosong('Belum ada data', 'Belum ada siswa yang menyelesaikan tes ini.', 'grid-3x3');
    };
    $$('#hmSeg button', el).forEach(b => b.onclick = () => { heatTes = b.dataset.t; $$('#hmSeg button', el).forEach(x => x.classList.toggle('on', x === b)); heat(); });
    const grup = () => {
      const size = Number($('#grSize', el).value), ada = list.filter(s => domVark(s));
      $('#grDesc', el).textContent = modeGrup === 'het' ? 'Kelompok seimbang dengan kombinasi gaya belajar berbeda untuk proyek kolaborasi.' : 'Kelompok dengan gaya belajar sama untuk tugas yang disesuaikan per gaya.';
      if (!ada.length) { $('#grBox', el).innerHTML = '<div class="muted small">Saran muncul setelah siswa menyelesaikan tes VARK.</div>'; return; }
      const byV = {}; ada.forEach(s => (byV[domVark(s)] = byV[domVark(s)] || []).push(s));
      let groups = [];
      if (modeGrup === 'hom') Object.keys(byV).forEach(v => { const a = byV[v]; for (let i = 0; i < a.length; i += size) groups.push({ v, m: a.slice(i, i + size) }); });
      else { const n = Math.ceil(ada.length / size); groups = Array.from({ length: n }, () => ({ m: [] })); const urut = Object.values(byV).sort((a, b) => b.length - a.length).flat(); urut.forEach((s, i) => groups[i % n].m.push(s)); }
      $('#grBox', el).innerHTML = groups.map((g, i) => `<div class="group-box"><div class="xs bold" style="color:var(--p);margin-bottom:8px">Kelompok ${i + 1}${g.v ? ' • ' + K.namaDim('VARK', g.v) : ''}</div><div class="row wrap" style="gap:6px">${g.m.map(s => `<span class="badge" style="background:${WARNA.VARK[domVark(s)]}22;color:${WARNA.VARK[domVark(s)]}">${esc(s.nama.split(' ')[0])} (${domVark(s)})</span>`).join('')}</div></div>`).join('');
    };
    $$('#grSeg button', el).forEach(b => b.onclick = () => { modeGrup = b.dataset.m; $$('#grSeg button', el).forEach(x => x.classList.toggle('on', x === b)); grup(); });
    $('#grSize', el).onchange = grup;
    $('#kPdf', el).onclick = () => unduhPdfMassal(list.map(s => ({ siswa: s, hasil: TES.map(t => keHasil(s, t)).filter(Boolean) })), `Profil-Kelas-${kls.replace(/\s+/g, '_')}.pdf`);
    heat(); grup(); pasangTabel(el);
  }
});
function tabelSiswa(list) {
  if (!list.length) return kosong('Belum ada siswa', 'Kelas ini belum memiliki siswa.', 'users');
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama Siswa</th><th>VARK</th><th>MI (teratas)</th><th>RIASEC</th><th>16 Type</th><th>Status</th></tr></thead><tbody>${list.map(s => {
    const [lbl, cls] = statusSiswa(s), h = s.hasil;
    return `<tr class="click" data-sid="${s.id}"><td><b>${esc(s.nama)}</b></td><td>${h.VARK ? `<span class="badge b-p">${esc(labelVark(h.VARK.tipe))}</span>` : '<span class="badge">Belum</span>'}</td>
      <td>${h.MI ? esc(K.namaDim('MI', h.MI.tipe.split('-')[0])) : '<span class="badge">Belum</span>'}</td><td>${h.RIASEC ? `<span class="badge b-amber">${h.RIASEC.tipe}</span>` : '<span class="badge">Belum</span>'}</td>
      <td>${h.PS ? `<span class="badge b-blue">${h.PS.tipe}</span>` : '<span class="badge">Belum</span>'}</td><td><span class="badge ${cls}">${lbl}</span></td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function pasangTabel(el) { $$('tr[data-sid]', el).forEach(tr => tr.onclick = () => go('siswa', tr.dataset.sid)); }

/* ============================================================
   DASHBOARD UNIT
   ============================================================ */
registerPage('unit', {
  auth: ['BK', 'PIMPINAN', 'ADMIN'], shell: 'staf', title: 'Dashboard Unit',
  show(el) {
    const B = AppState.boot; if (!B || !B.siswa) { el.innerHTML = skel(4, 140); return; }
    const units = AppState.role === 'BK' ? [AppState.user.unit_binaan] : (B.sekolah.unit || ['SMP', 'SMA']);
    let unit = Store.get(userKey('unitPilih'), units[0]); if (!units.includes(unit)) unit = units[0];
    const list = IDX().list.filter(s => s.unit === unit), levels = [...new Set(list.map(s => s.level))].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
    const kelas = [...new Set(list.map(s => s.kelas))].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
    const perlu = list.filter(s => alasanPendampingan(s).length);
    el.innerHTML = `<div class="stack"><div class="row wrap"><h2>Unit ${esc(unit)}</h2><span class="badge b-p">${list.length} siswa</span><span class="grow"></span>${units.length > 1 ? `<div class="seg" id="uSeg">${units.map(u => `<button class="${u === unit ? 'on' : ''}" data-u="${u}">${u}</button>`).join('')}</div>` : ''}</div>
      ${list.length ? '' : kosong('Belum ada siswa', 'Belum ada siswa di unit ini pada tahun ajaran aktif.', 'users')}
      <div class="grid g3">${levels.map(l => { const ls = list.filter(s => s.level === l), st = statistik(ls), p = pct(st.tuntas, ls.length), pr = ls.filter(s => alasanPendampingan(s).length).length;
        return `<div class="card kpi"><div class="row between"><span class="lbl">Kelas ${esc(l)} (${ls.length} Siswa)</span>${pr ? `<span class="badge b-pink">${pr} perlu pendampingan</span>` : `<span class="badge ${p >= 85 ? 'b-green' : 'b-amber'}">${p}% Selesai</span>`}</div><div class="val">${st.tuntas} / ${ls.length}</div><div class="bar thin" style="margin-top:10px"><i style="width:${p}%"></i></div></div>`; }).join('')}</div>
      <div class="grid g2"><div class="card"><h3 style="margin-bottom:16px">Klaster Minat Karier (RIASEC) per Tingkat</h3>${levels.map(l => {
        const st = statistik(list.filter(s => s.level === l)), top = Object.entries(st.riasec).sort((a, b) => b[1] - a[1]), tot = top.reduce((a, b) => a + b[1], 0);
        return `<div style="margin-bottom:14px"><div class="row between small" style="margin-bottom:6px"><span>Kelas ${esc(l)} • Dominan: <b>${top.length ? top.slice(0, 2).map(x => K.namaDim('RIASEC', x[0])).join('–') : '-'}</b></span><span class="muted">${top.length ? pct(top[0][1], tot) + '%' : ''}</span></div>${Chart.stack(K.dim('RIASEC').map(d => ({ v: st.riasec[d[0]] || 0, c: WARNA.RIASEC[d[0]], l: d[1] })))}</div>`;
      }).join('') || '<p class="muted">Belum ada data.</p>'}<div class="row wrap xs" style="gap:10px;margin-top:8px">${K.dim('RIASEC').map(d => `<span class="row" style="gap:4px"><span class="dot" style="background:${WARNA.RIASEC[d[0]]}"></span>${d[0]} ${esc(d[1])}</span>`).join('')}</div></div>
      <div class="card"><h3 style="margin-bottom:12px">Tren Partisipasi Antarperiode</h3>${trenChart(unit, list.length)}</div></div>
      <div class="card"><h3 style="margin-bottom:16px">Perbandingan Antarkelas</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Kelas</th><th>Siswa</th><th>Tuntas 4 Tes</th><th style="min-width:160px">Progres</th><th>Gaya Belajar Dominan</th><th>Minat Dominan</th><th>Perlu Pendampingan</th></tr></thead><tbody>${kelas.map(k => { const ls = list.filter(s => s.kelas === k), st = statistik(ls), v = topKey(st.vark), r = topKey(st.riasec), p = pct(st.tuntas, ls.length);
        return `<tr><td><b>${esc(k)}</b></td><td>${ls.length}</td><td>${st.tuntas}</td><td><div class="row"><div class="bar thin grow"><i style="width:${p}%"></i></div><span class="xs">${p}%</span></div></td><td>${v ? `<span class="badge" style="background:${WARNA.VARK[v[0]]}22;color:${WARNA.VARK[v[0]]}">${K.namaDim('VARK', v[0])}</span>` : '-'}</td><td>${r ? `<span class="badge" style="background:${WARNA.RIASEC[r[0]]}22;color:${WARNA.RIASEC[r[0]]}">${K.namaDim('RIASEC', r[0])}</span>` : '-'}</td><td>${ls.filter(s => alasanPendampingan(s).length).length}</td></tr>`; }).join('')}</tbody></table></div></div>
      <div class="grid g2">${blokVark(statistik(list))}${blokMi(statistik(list))}</div>
      ${AppState.role !== 'ADMIN' ? `<div class="card" style="padding:0"><div class="card-h" style="padding:20px 20px 0"><h3>Siswa Perlu Pendampingan</h3><a class="btn line sm" href="#/pendampingan">Lihat semua (${perlu.length})</a></div>${tabelPendampingan(perlu.slice(0, 5))}</div>` : ''}</div>`;
    $$('#uSeg button', el).forEach(b => b.onclick = () => { Store.set(userKey('unitPilih'), b.dataset.u); route(); });
    pasangPendampingan(el);
  }
});
function trenChart(unit, nSiswa) {
  const B = AppState.boot, per = (B.periode || []).slice().reverse().filter(p => B.tren && B.tren[p.id_periode]);
  if (!per.length || !nSiswa) return kosong('Belum ada tren', 'Tren muncul setelah ada hasil tes.', 'chart-line');
  const vals = per.map(p => { const t = B.tren[p.id_periode], n = unit ? (t.u && t.u[unit]) || {} : t.n, x = Object.values(n); return x.length ? Math.min(100, Math.round(x.reduce((a, b) => a + b, 0) / (4 * nSiswa) * 100)) : 0; });
  return Chart.line(per.map(p => singkatPeriode(p.nama_periode)), [{ name: 'Partisipasi', c: cssVar('--p'), vals }], { h: 220 }) + '<p class="xs muted">Persentase tes yang diselesaikan dibanding jumlah siswa aktif saat ini.</p>';
}

/* ============================================================
   RINGKASAN SEKOLAH
   ============================================================ */
registerPage('sekolah', {
  auth: ['PIMPINAN', 'ADMIN'], shell: 'staf', title: 'Ringkasan Eksekutif Sekolah',
  show(el) {
    const B = AppState.boot; if (!B || !B.siswa) { el.innerHTML = skel(4, 140); return; }
    const all = IDX().list, st = statistik(all), units = B.sekolah.unit || ['SMP', 'SMA'];
    const per = units.map(u => { const l = all.filter(s => s.unit === u); return { u, n: l.length, st: statistik(l) }; });
    const ins = [];
    per.forEach(p => { const r = topKey(p.st.riasec); if (r) ins.push(['#EDE9FE', '#4C1D95', `Minat dominan ${p.u}: ${K.namaDim('RIASEC', r[0])}`, `${pct(r[1], p.st.riN)}% siswa ${p.u} memiliki minat utama ${K.namaDim('RIASEC', r[0])}.`]); });
    const v = topKey(st.vark); if (v) ins.push(['#DCFCE7', '#166534', `Gaya belajar ${K.namaDim('VARK', v[0])} paling banyak`, `${pct(v[1], Object.values(st.vark).reduce((a, b) => a + b, 0))}% siswa paling efektif belajar secara ${K.namaDim('VARK', v[0]).toLowerCase()}. Pertimbangkan dalam perencanaan pembelajaran.`]);
    const prevId = B.prevPeriode, t0 = prevId && B.tren[prevId], t1 = B.tren[B.idPeriode];
    if (t0 && t1) { const a = Object.values(t0.n).reduce((x, y) => x + y, 0), b = Object.values(t1.n).reduce((x, y) => x + y, 0); ins.push(['#FEF3C7', '#92400E', `Partisipasi ${b >= a ? 'naik' : 'turun'} ${Math.abs(pct(b - a, a || 1))}%`, `Dibanding periode sebelumnya (${b} vs ${a} tes diselesaikan).`]); }
    else ins.push(['#FEF3C7', '#92400E', `${st.belum} siswa belum memulai tes`, 'Ingatkan wali kelas untuk mendorong siswa menyelesaikan tes secara bertahap.']);
    el.innerHTML = `<div class="stack" id="skBox"><div class="row wrap"><p class="muted grow">Cakupan seluruh unit ${units.join(' & ')} ${esc(B.sekolah.nama_sekolah)} • Total ${all.length} siswa aktif</p>
      <button class="btn xl-ok line" id="skXl">${ic('file-spreadsheet')} Unduh Laporan Excel</button><button class="btn pdf-ok line" id="skPdf">${ic('file-text')} Unduh Laporan PDF</button></div>
      <div class="grid g3"><div class="card center"><h3 style="text-align:left">Tingkat Partisipasi</h3><div class="chart-box" style="margin-top:8px">${Chart.gauge(pct(st.tuntas, st.n), { label: `${st.tuntas} dari ${st.n} siswa tuntas` })}</div></div>
        <div class="card"><h3 style="margin-bottom:16px">Perbandingan Unit</h3>${per.map(p => `<div style="margin-bottom:14px"><div class="row between small"><span>Unit ${p.u} (${p.n} Siswa)</span><b>${pct(p.st.tuntas, p.n)}%</b></div><div class="bar" style="margin-top:6px"><i style="width:${pct(p.st.tuntas, p.n)}%;background:${p.u === 'SMP' ? '#0EA5E9' : 'var(--p)'}"></i></div></div>`).join('')}
          <div class="xs muted">Persentase siswa yang menuntaskan semua tes periode ini.</div></div>
        <div class="card"><h3 style="margin-bottom:8px">Tren Partisipasi</h3>${trenChart('', all.length)}</div></div>
      <div class="grid g3">${ins.slice(0, 3).map((x, i) => `<div class="insight" style="background:${x[0]};color:${x[1]}"><div class="xs">Wawasan Utama #${i + 1}</div><h3>${esc(x[2])}</h3><p class="small">${esc(x[3])}</p></div>`).join('')}</div>
      <div class="grid g3">${blokVark(st)}${blokRiasec(st)}${blokPs(st)}</div>
      <div class="card"><h3 style="margin-bottom:16px">Perbandingan Profil per Unit</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Unit</th><th>Siswa</th><th>Tuntas</th><th>Belum Mulai</th><th>VARK Dominan</th><th>MI Tertinggi</th><th>RIASEC Dominan</th><th>Tipe Terbanyak</th></tr></thead><tbody>${per.map(p => { const mi = topKey(p.st.mi), r = topKey(p.st.riasec), ps = topKey(p.st.ps), vk = topKey(p.st.vark);
        return `<tr><td><b>${p.u}</b></td><td>${p.n}</td><td>${p.st.tuntas} (${pct(p.st.tuntas, p.n)}%)</td><td>${p.st.belum}</td><td>${vk ? K.namaDim('VARK', vk[0]) : '-'}</td><td>${mi ? K.namaDim('MI', mi[0]) : '-'}</td><td>${r ? K.namaDim('RIASEC', r[0]) : '-'}</td><td>${ps ? ps[0] : '-'}</td></tr>`; }).join('')}</tbody></table></div></div></div>`;
    $('#skXl', el).onclick = () => eksporExcel(all, 'Laporan-Sekolah');
    $('#skPdf', el).onclick = () => pdfElemen($('#skBox', el), 'Ringkasan-Sekolah.pdf');
  }
});
async function pdfElemen(node, nama) {
  busy(true, 'Menyiapkan PDF…');
  try { await libPdf(); await html2pdf().set({ margin: 16, filename: nama, html2canvas: { scale: 1.6, useCORS: true, backgroundColor: getComputedStyle(document.body).backgroundColor }, jsPDF: { unit: 'px', format: [1240, 1754], hotfixes: ['px_scaling'] }, pagebreak: { mode: ['avoid-all'] } }).from(node).save(); toast('PDF diunduh', 'success'); }
  catch (e) { toast('Gagal membuat PDF: ' + e.message, 'error'); } finally { busy(false); }
}

/* ============================================================
   PERLU PENDAMPINGAN
   ============================================================ */
registerPage('pendampingan', {
  auth: ['BK', 'PIMPINAN'], shell: 'staf', title: 'Siswa Perlu Pendampingan',
  show(el) {
    const B = AppState.boot; if (!B || !B.siswa) { el.innerHTML = skel(3, 120); return; }
    const kriteria = ['Belum mengerjakan', 'tes belum dimulai', 'Skor MI rendah semua', 'Belum ada arah jurusan', 'Gaya pribadi belum jelas', 'Perubahan drastis'];
    let aktif = new Set(Store.get(userKey('kritPd'), kriteria));
    const render = () => {
      const list = IDX().list.map(s => [s, alasanPendampingan(s).filter(a => [...aktif].some(k => a[0].includes(k)))]).filter(x => x[1].length);
      const nb = $('#nb-pendampingan'); if (nb) nb.textContent = list.length;
      $('#pdBox', el).innerHTML = tabelPendampingan(list.map(x => x[0]), x => x, list);
      pasangPendampingan(el);
    };
    el.innerHTML = `<div class="stack"><div class="card"><h3 style="margin-bottom:6px">Kriteria</h3><p class="small muted" style="margin-bottom:12px">Pilih kriteria yang ingin dipantau. Pengaturan tersimpan di perangkat ini.</p>
      <div class="row wrap" style="gap:8px" id="pdKrit">${kriteria.map(k => `<button class="chip ${aktif.has(k) ? 'on' : ''}" data-k="${k}">${k === 'tes belum dimulai' ? '≥2 tes belum dimulai' : k}</button>`).join('')}</div></div>
      <div class="card" style="padding:0" id="pdBox"></div></div>`;
    $$('#pdKrit .chip', el).forEach(c => c.onclick = () => { aktif.has(c.dataset.k) ? aktif.delete(c.dataset.k) : aktif.add(c.dataset.k); c.classList.toggle('on'); Store.set(userKey('kritPd'), [...aktif]); render(); });
    render();
  }
});
function tabelPendampingan(list, _f, pasangan) {
  if (!list.length) return kosong('Tidak ada siswa', 'Belum ada siswa yang memenuhi kriteria pendampingan.', 'heart-handshake');
  const cat = {}; (AppState.boot.catatan || []).forEach(c => { (cat[c[1]] = cat[c[1]] || []).push(c); });
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nama Siswa</th><th>Kelas</th><th>Status</th><th>Alasan</th><th>Catatan BK</th><th style="text-align:right">Aksi</th></tr></thead><tbody>${list.map((s, i) => {
    const al = pasangan ? pasangan[i][1] : alasanPendampingan(s), c = cat[s.id] || [];
    return `<tr><td><b>${esc(s.nama)}</b></td><td>${esc(s.kelas)}</td><td><span class="badge b-pink">Perlu pendampingan</span></td><td><div class="row wrap" style="gap:4px">${al.map(a => `<span class="badge ${a[1]}">${esc(a[0])}</span>`).join('')}</div></td>
      <td>${c.length ? `<span class="badge ${c.some(x => x[4] === 'Selesai') ? 'b-green' : 'b-amber'}">${c.length} catatan</span>` : '<span class="muted xs">Belum ada</span>'}</td>
      <td style="text-align:right;white-space:nowrap"><a class="link small" href="#/siswa/${s.id}">Lihat Profil</a>${AppState.role === 'BK' ? ` <button class="btn soft sm" data-catat="${s.id}">Tambah Catatan</button>` : ''}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function pasangPendampingan(el) { $$('[data-catat]', el).forEach(b => b.onclick = () => formCatatan(b.dataset.catat)); }

/* ============================================================
   DATA & LAPORAN
   ============================================================ */
const DF = { q: '', unit: '', level: '', kelas: '', tes: '', tipe: '', status: '', sort: 'nama', dir: 1, hal: 0 };
registerPage('data', {
  auth: 'staf', shell: 'staf', title: 'Tabel Data Siswa & Laporan',
  show(el) {
    const B = AppState.boot; if (!B || !B.siswa) { el.innerHTML = skel(2, 200); return; }
    const all = IDX().list, opsi = f => [...new Set(all.map(f))].filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), 'id', { numeric: true }));
    const sel = (id, label, arr, val, fmt = x => x) => `<select class="select" id="${id}" style="width:auto;min-height:38px;font-size:14px"><option value="">${label}: Semua</option>${arr.map(x => `<option value="${esc(x)}" ${String(val) === String(x) ? 'selected' : ''}>${label}: ${esc(fmt(x))}</option>`).join('')}</select>`;
    el.innerHTML = `<div class="stack"><div class="card pad-s"><div class="row wrap" style="gap:10px"><div class="search grow" style="min-width:220px">${ic('search')}<input class="input" id="dQ" placeholder="Cari nama siswa…" value="${esc(DF.q)}"></div>
        <button class="btn xl-ok line sm" id="dXl">${ic('file-spreadsheet', 'ic-sm')} Unduh Excel</button><button class="btn pdf-ok line sm" id="dPdf">${ic('file-text', 'ic-sm')} Unduh PDF</button>${AppState.role === 'ADMIN' ? `<button class="btn soft sm" id="dMassal">${ic('files', 'ic-sm')} PDF Massal per Kelas</button>` : ''}</div>
      <div class="row wrap" style="gap:8px;margin-top:10px">${sel('dUnit', 'Unit', opsi(s => s.unit), DF.unit)}${sel('dLevel', 'Tingkat', opsi(s => s.level), DF.level)}${sel('dKelas', 'Kelas', opsi(s => s.kelas), DF.kelas)}
        ${sel('dTes', 'Jenis Tes', TES, DF.tes, t => K.tes(t).nama)}${sel('dTipe', 'Tipe Dominan', DF.tes ? tipeOpsi(DF.tes) : [], DF.tipe)}${sel('dStatus', 'Status', ['Selesai', 'Proses', 'Belum mulai', 'Perlu pendampingan'], DF.status)}</div></div>
      <div class="card" style="padding:0" id="dBox"></div></div>`;
    const map = { dUnit: 'unit', dLevel: 'level', dKelas: 'kelas', dTes: 'tes', dTipe: 'tipe', dStatus: 'status' };
    Object.keys(map).forEach(id => $('#' + id, el).onchange = e => { DF[map[id]] = e.target.value; DF.hal = 0; if (id === 'dTes') { DF.tipe = ''; route(); } else renderData(el); });
    $('#dQ', el).oninput = debounce(e => { DF.q = e.target.value; DF.hal = 0; renderData(el); }, 250);
    $('#dXl', el).onclick = () => eksporExcel(filterData(), 'Data-Siswa');
    $('#dPdf', el).onclick = () => eksporPdfTabel(filterData());
    if ($('#dMassal', el)) $('#dMassal', el).onclick = () => { if (!DF.kelas) return toast('Pilih satu kelas terlebih dahulu pada filter Kelas.', 'warning'); const l = filterData(); unduhPdfMassal(l.map(s => ({ siswa: s, hasil: TES.map(t => keHasil(s, t)).filter(Boolean) })), `Profil-${DF.kelas.replace(/\s+/g, '_')}.pdf`); };
    renderData(el);
  }
});
function tipeOpsi(t) { if (t === 'PS') return Object.keys(AppState.konten ? Object.fromEntries(Object.keys(AppState.konten.interp).filter(k => k.startsWith('PS|')).map(k => [k.slice(3), 1])) : {}).sort(); return K.dim(t).map(d => d[0]); }
function filterData() {
  const q = DF.q.trim().toLowerCase();
  let l = IDX().list.filter(s => (!q || s.nama.toLowerCase().includes(q)) && (!DF.unit || s.unit === DF.unit) && (!DF.level || String(s.level) === DF.level) && (!DF.kelas || s.kelas === DF.kelas));
  if (DF.tes) l = l.filter(s => s.hasil[DF.tes] && (!DF.tipe || (DF.tes === 'PS' ? s.hasil.PS.tipe === DF.tipe : DF.tes === 'MI' ? s.hasil.MI.tipe.split('-')[0] === DF.tipe : s.hasil[DF.tes].tipe.charAt(0) === DF.tipe)));
  if (DF.status) l = l.filter(s => DF.status === 'Perlu pendampingan' ? alasanPendampingan(s).length : statusSiswa(s)[0].startsWith(DF.status));
  const key = { nama: s => s.nama, kelas: s => s.kelas, vark: s => s.hasil.VARK ? s.hasil.VARK.tipe : '~', riasec: s => s.hasil.RIASEC ? s.hasil.RIASEC.tipe : '~', ps: s => s.hasil.PS ? s.hasil.PS.tipe : '~', status: s => statusSiswa(s)[0] }[DF.sort];
  return l.sort((a, b) => String(key(a)).localeCompare(String(key(b)), 'id', { numeric: true }) * DF.dir);
}
function renderData(el) {
  const l = filterData(), per = 20, n = l.length, maxH = Math.max(0, Math.ceil(n / per) - 1); DF.hal = Math.min(DF.hal, maxH);
  const page = l.slice(DF.hal * per, DF.hal * per + per), th = (k, lbl) => `<th class="sort" data-s="${k}">${lbl} ${DF.sort === k ? (DF.dir > 0 ? '▲' : '▼') : ''}</th>`;
  $('#dBox', el).innerHTML = !n ? kosong('Tidak ada data', 'Ubah filter atau kata kunci pencarian.', 'search-x') : `<div class="tbl-wrap"><table class="tbl"><thead><tr>${th('nama', 'Nama Siswa')}${th('kelas', 'Unit / Kelas')}${th('vark', 'VARK')}<th>MI Teratas</th>${th('riasec', 'RIASEC')}${th('ps', '16 Type')}${th('status', 'Status')}<th style="text-align:right">Aksi</th></tr></thead><tbody>${page.map(s => {
    const h = s.hasil, [lbl, cls] = statusSiswa(s), pd = alasanPendampingan(s).length && AppState.role !== 'GURU';
    return `<tr><td><a href="#/siswa/${s.id}"><b>${esc(s.nama)}</b></a></td><td>${esc(s.unit)} • ${esc(s.kelas)}</td><td>${h.VARK ? `<span class="badge b-p">${esc(labelVark(h.VARK.tipe))}</span>` : '<span class="badge">Belum</span>'}</td>
      <td>${h.MI ? esc(K.namaDim('MI', h.MI.tipe.split('-')[0])) : '<span class="badge">Belum</span>'}</td><td>${h.RIASEC ? `<span class="badge b-amber">${h.RIASEC.tipe}</span>` : '<span class="badge">Belum</span>'}</td><td>${h.PS ? `<span class="badge b-blue">${h.PS.tipe}</span>` : '<span class="badge">Belum</span>'}</td>
      <td><span class="badge ${cls}">${lbl}</span>${pd ? ' <span class="badge b-pink">Pendampingan</span>' : ''}</td>
      <td style="text-align:right;white-space:nowrap"><a class="icon-btn" style="width:34px;height:34px" href="#/siswa/${s.id}" title="Lihat profil" aria-label="Lihat profil">${ic('eye', 'ic-sm')}</a> <button class="icon-btn" style="width:34px;height:34px" data-pdf="${s.id}" title="Unduh PDF Profil Gabungan" aria-label="Unduh PDF">${ic('download', 'ic-sm')}</button></td></tr>`;
  }).join('')}</tbody></table></div>
    <div class="pager"><span class="small muted">Menampilkan ${DF.hal * per + 1}–${Math.min(n, DF.hal * per + per)} dari ${n} siswa</span><div class="pages"><button ${DF.hal ? '' : 'disabled'} data-h="${DF.hal - 1}">Sebelumnya</button>${Array.from({ length: maxH + 1 }, (_, i) => i).filter(i => Math.abs(i - DF.hal) < 3 || i === 0 || i === maxH).map(i => `<button class="${i === DF.hal ? 'on' : ''}" data-h="${i}">${i + 1}</button>`).join('')}<button ${DF.hal < maxH ? '' : 'disabled'} data-h="${DF.hal + 1}">Berikutnya</button></div></div>`;
  $$('th[data-s]', el).forEach(t => t.onclick = () => { DF.dir = DF.sort === t.dataset.s ? -DF.dir : 1; DF.sort = t.dataset.s; renderData(el); });
  $$('[data-h]', el).forEach(b => b.onclick = () => { DF.hal = Number(b.dataset.h); renderData(el); });
  $$('[data-pdf]', el).forEach(b => b.onclick = () => { const s = IDX().map[b.dataset.pdf]; unduhPdf(s, TES.map(t => keHasil(s, t)).filter(Boolean), 'gabungan', `Profil-${s.nama.replace(/\s+/g, '_')}.pdf`); });
}
async function eksporExcel(list, nama) {
  busy(true, 'Menyiapkan Excel…');
  try {
    await libXlsx();
    const p = perAktif(), dimV = K.dim('VARK'), dimM = K.dim('MI'), dimR = K.dim('RIASEC');
    const rows = list.map(s => {
      const h = s.hasil, o = { Nama: s.nama, Unit: s.unit, Tingkat: s.level, Kelas: s.kelas, Status: statusSiswa(s)[0], VARK: h.VARK ? labelVark(h.VARK.tipe) : '' };
      dimV.forEach(d => o['VARK ' + d[1] + ' (%)'] = h.VARK ? h.VARK.skor[d[0]] : '');
      o['MI Teratas'] = h.MI ? h.MI.tipe.split('-').map(k => K.namaDim('MI', k)).join(', ') : ''; dimM.forEach(d => o['MI ' + d[1]] = h.MI ? h.MI.skor[d[0]] : '');
      o['Kode RIASEC'] = h.RIASEC ? h.RIASEC.tipe : ''; dimR.forEach(d => o['RIASEC ' + d[1] + ' (%)'] = h.RIASEC ? h.RIASEC.skor[d[0]] : '');
      o['16 Type'] = h.PS ? h.PS.tipe : '';
      if (AppState.role !== 'GURU') o['Perlu Pendampingan'] = alasanPendampingan(s).map(a => a[0]).join('; ');
      return o;
    });
    const wb = XLSX.utils.book_new(), ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || { a: 1 }).map(k => ({ wch: Math.max(10, Math.min(28, k.length + 2)) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
    XLSX.writeFile(wb, `${nama}-${(p ? p.nama_periode : '').replace(/[\s/]+/g, '_')}.xlsx`);
    toast('Excel diunduh (' + rows.length + ' baris)', 'success');
  } catch (e) { toast('Gagal membuat Excel: ' + e.message, 'error'); } finally { busy(false); }
}
async function eksporPdfTabel(list) {
  const p = perAktif(), s = AppState.sekolah || {};
  const host = document.createElement('div'); host.className = 'lap-host'; host.style.width = '1123px';
  host.innerHTML = `<div class="lap" style="width:1123px;padding:32px">${kopLaporan('Data Siswa • ' + (p ? p.nama_periode : ''))}<table class="tbl" style="font-size:11px"><thead><tr><th>No</th><th>Nama</th><th>Unit/Kelas</th><th>VARK</th><th>MI Teratas</th><th>RIASEC</th><th>16 Type</th><th>Status</th></tr></thead><tbody>${list.map((x, i) => { const h = x.hasil; return `<tr><td>${i + 1}</td><td>${esc(x.nama)}</td><td>${esc(x.unit + ' • ' + x.kelas)}</td><td>${h.VARK ? esc(labelVark(h.VARK.tipe)) : '-'}</td><td>${h.MI ? esc(h.MI.tipe.split('-').map(k => K.namaDim('MI', k)).join(', ')) : '-'}</td><td>${h.RIASEC ? h.RIASEC.tipe : '-'}</td><td>${h.PS ? h.PS.tipe : '-'}</td><td>${statusSiswa(x)[0]}</td></tr>`; }).join('')}</tbody></table><p class="xs" style="color:#64748B;margin-top:12px">${esc(s.nama_sekolah || '')} • Dicetak ${fmtTgl(new Date(), true)}</p></div>`;
  document.body.appendChild(host);
  busy(true, 'Menyiapkan PDF…');
  try { await libPdf(); await html2pdf().set({ margin: 0, filename: 'Data-Siswa.pdf', html2canvas: { scale: 1.6 }, jsPDF: { unit: 'px', format: [1123, 794], orientation: 'landscape', hotfixes: ['px_scaling'] }, pagebreak: { mode: ['css', 'legacy'], avoid: 'tr' } }).from(host.firstElementChild).save(); toast('PDF diunduh', 'success'); }
  catch (e) { toast('Gagal membuat PDF: ' + e.message, 'error'); } finally { busy(false); host.remove(); }
}

/* ============================================================
   PROFIL SISWA (staf)
   ============================================================ */
registerPage('siswa', {
  auth: 'staf', shell: 'staf', title: 'Profil Siswa', nav: 'data', fresh: true,
  show(el, id) {
    const s0 = IDX().map[id];
    el.innerHTML = skel(3, 140);
    swr('profil:' + id, 'profilSiswa', { id_siswa: id }, d => renderProfil(el, d, s0), { fresh: 60000, onError: r => { el.innerHTML = gagal(r.message, 'route()'); } });
  }
});
let tabProfil = 'ringkas';
function renderProfil(el, d, s0) {
  const s = d.siswa, B = AppState.boot, p = perAktif();
  // hasil periode terpilih; bila belum ada, tampilkan hasil terakhir dari periode sebelumnya (diberi label)
  const kini = TES.map(t => { const l = d.riwayat.filter(h => h.tes === t && (!p || h.id_periode === p.id_periode)); const x = l[l.length - 1]; if (x) return x; const old = d.riwayat.filter(h => h.tes === t).slice(-1)[0]; return old ? Object.assign({ lama: true }, old) : null; }).filter(Boolean);
  const per = t => kini.find(h => h.tes === t);
  const perKini = t => kini.find(h => h.tes === t && !h.lama);
  const lap = { nama: s.nama, unit: s.unit, kelas: s.kelas };
  const vk = per('VARK'), ps = per('PS');
  const tipsList = kini.map(h => interpHasil(h)[0]).filter(i => i && i.guru).map(i => i.guru);
  const bolehCatat = AppState.role === 'BK' || AppState.role === 'PIMPINAN';
  el.innerHTML = `<div class="stack"><div class="card row wrap" style="gap:16px"><div class="avatar" style="width:64px;height:64px;font-size:22px;background:var(--p);color:#fff">${esc(inisial(s.nama))}</div>
      <div class="grow"><div class="row wrap"><h2>${esc(s.nama)}</h2><span class="badge b-p">${esc(s.unit)} • ${esc(s.kelas)}</span></div>
      <div class="row wrap" style="gap:6px;margin-top:6px">${TES.map(t => { const h = perKini(t), dr = s0 && s0.draf[t]; return `<span class="badge ${h ? 'b-green' : dr ? 'b-amber' : ''}">${t === 'PS' ? '16 Type' : t}: ${h ? 'Selesai' : dr ? 'Draf (' + dr + ' soal)' : 'Belum'}</span>`; }).join('')}<span class="xs muted">${esc(p ? p.nama_periode : '')}</span></div></div>
      <select class="select" id="pfTes" style="width:auto"><option value="">Unduh PDF per Tes</option>${kini.map(h => `<option value="${h.tes}">${esc(K.tes(h.tes).nama)}</option>`).join('')}</select>
      <button class="btn" id="pfGab" ${kini.length ? '' : 'disabled'}>${ic('download')} Unduh PDF Profil Gabungan</button></div>
    <div class="tabs" id="pfTabs"><button data-t="ringkas">Ringkasan Hasil</button><button data-t="riwayat">Riwayat</button>${bolehCatat ? '<button data-t="catatan">Catatan Konseling (BK)</button>' : ''}</div><div id="pfIsi"></div></div>`;
  const isi = () => {
    $$('#pfTabs button', el).forEach(b => b.classList.toggle('on', b.dataset.t === tabProfil));
    const box = $('#pfIsi', el);
    if (tabProfil === 'riwayat') {
      box.innerHTML = `<div class="grid g2">${TES.map(t => { const l = d.riwayat.filter(h => h.tes === t), dims = K.dim(t);
        return `<div class="card"><h3 style="margin-bottom:10px">${esc(K.tes(t).nama)}</h3>${l.length ? (l.length > 1 ? Chart.line(l.map(h => singkatPeriode(h.nama_periode)), dims.slice(0, t === 'MI' ? 9 : 8).map(dd => ({ name: dd[1], c: WARNA[t][dd[0]], vals: l.map(h => h.skor[dd[0]] || 0) })), { h: 200 }) : '') + `<div class="row wrap" style="gap:6px;margin-top:8px">${l.map(h => `<span class="badge b-p">${esc(h.nama_periode)}: ${esc(judulHasil(h))}</span>`).join('')}</div>` : '<p class="muted small">Belum ada riwayat.</p>'}</div>`; }).join('')}</div>`;
      return;
    }
    if (tabProfil === 'catatan') { renderCatatan(box, d, s); return; }
    box.innerHTML = `<div class="stack">${kini.length ? `<div class="card tint-info"><h3 class="row" style="gap:10px;margin-bottom:6px">${ic('lightbulb')} Tips Mengajar Siswa Ini</h3><p>${esc(s.nama.split(' ')[0])} memiliki gaya belajar <b>${vk ? esc(vk.label) : '(belum tes)'}</b>${ps ? ` dengan gaya pribadi <b>${esc(ps.tipe)}</b>` : ''}. ${esc(tipsList.slice(0, 2).join(' '))}</p></div>` : ''}
      <div class="grid g4">${TES.map(t => { const h = per(t), inf = INFO_TES[t];
        return `<div class="card ${h ? 'hover' : ''}" ${h ? `data-det="${t}" style="cursor:pointer"` : ''}><div class="row xs bold muted" style="gap:6px"><span class="dot" style="background:${inf.fg}"></span>${esc(K.tes(t).nama)}${h && h.lama ? `<span class="badge" style="margin-left:auto">${esc(h.nama_periode)}</span>` : ''}</div>${h ? `<h3 style="font-size:19px;margin:6px 0">${esc(judulHasil(h))}</h3><p class="small muted" style="margin-bottom:8px">${esc(ringkas(h))}</p>${miniGrafik(h)}` : `<h3 style="margin:6px 0">Dalam Proses</h3><p class="small muted">${s0 && s0.draf[t] ? 'Soal ' + s0.draf[t] + ' dikerjakan.' : 'Belum dikerjakan.'}</p>`}</div>`; }).join('')}</div></div>`;
    $$('[data-det]', box).forEach(c => c.onclick = () => detailHasilModal(per(c.dataset.det), s));
  };
  $$('#pfTabs button', el).forEach(b => b.onclick = () => { tabProfil = b.dataset.t; isi(); });
  if (tabProfil === 'catatan' && !bolehCatat) tabProfil = 'ringkas';
  isi();
  $('#pfGab', el).onclick = () => unduhPdf(lap, kini, 'gabungan', `Profil-${s.nama.replace(/\s+/g, '_')}.pdf`);
  $('#pfTes', el).onchange = e => { const h = per(e.target.value); e.target.value = ''; if (h) unduhPdf(lap, [h], 'tes', `Hasil-${h.tes}-${s.nama.replace(/\s+/g, '_')}.pdf`); };
}
function detailHasilModal(h, s) {
  const m = modal(`<div class="card-h"><h3>${esc(K.tes(h.tes).nama)} — ${esc(s.nama)}</h3><button class="icon-btn" data-x aria-label="Tutup">${ic('x')}</button></div><div class="stack">${heroHasil(h)}<div class="card">${grafikHasil(h)}</div>${kontenHasil(h, { staf: true })}
    ${AppState.role === 'ADMIN' ? `<button class="btn line block" id="dMentah">${ic('list')} Lihat jawaban per butir (admin)</button><div id="dMentahBox"></div>` : ''}</div>`, { wide: true });
  m.querySelector('[data-x]').onclick = closeModal;
  const mb = m.querySelector('#dMentah');
  if (mb) mb.onclick = async () => {
    mb.disabled = true; const r = await api('jawabanMentah', { id_siswa: s.id, tes: h.tes, id_periode: h.id_periode });
    const box = m.querySelector('#dMentahBox'); if (!r.success) { box.innerHTML = `<p class="err-msg">${esc(r.message)}</p>`; return; }
    const soal = Object.fromEntries(K.soal(h.tes).map(x => [x.id, x]));
    box.innerHTML = `<div class="tbl-wrap" style="margin-top:10px"><table class="tbl"><thead><tr><th>Butir</th><th>Soal</th><th>Jawaban</th></tr></thead><tbody>${Object.entries(r.data.jawaban).map(([k, v]) => `<tr><td class="xs">${esc(k)}</td><td class="small">${esc(soal[k] ? soal[k].teks : '')}</td><td><b>${esc(v)}</b></td></tr>`).join('')}</tbody></table></div>`;
  };
}
function renderCatatan(box, d, s) {
  const list = d.catatan || [];
  box.innerHTML = `<div class="grid g2" style="align-items:start">${AppState.role === 'BK' ? `<div class="card"><h3 style="margin-bottom:12px">Tambah Catatan</h3>${formCatatanHtml()}<button class="btn block" id="ctSimpan" style="margin-top:14px">${ic('save')} Simpan Catatan</button></div>` : ''}
    <div class="card"><h3 style="margin-bottom:12px">Riwayat Catatan (${list.length})</h3>${list.length ? `<div class="stack-sm">${list.map(c => `<div class="note"><div class="row between"><b class="small">${esc(c.kategori)}</b><span class="badge ${c.status === 'Selesai' ? 'b-green' : 'b-amber'}">${esc(c.status)}</span></div><p style="margin:6px 0">${esc(c.catatan)}</p>${c.tindak_lanjut ? `<p class="small"><b>Tindak lanjut:</b> ${esc(c.tindak_lanjut)}</p>` : ''}<p class="xs muted" style="margin-top:4px">${fmtTgl(c.tanggal, true)} • ${esc(c.oleh)}</p>${AppState.role === 'BK' && c.status !== 'Selesai' ? `<button class="link xs" data-done="${c.id}">Tandai selesai</button>` : ''}</div>`).join('')}</div>` : '<p class="muted small">Belum ada catatan konseling.</p>'}</div></div>`;
  const simpan = $('#ctSimpan', box);
  if (simpan) simpan.onclick = () => kirimCatatan(s.id, null, box);
  $$('[data-done]', box).forEach(b => b.onclick = async () => { const c = list.find(x => x.id === b.dataset.done); const r = await api('simpanCatatan', { id_catatan: c.id, id_siswa: s.id, kategori: c.kategori, catatan: c.catatan, tindak_lanjut: c.tindak_lanjut, status: 'Selesai' }); if (r.success) { toast('Catatan ditandai selesai', 'success'); Store.del(userKey('profil:' + s.id)); route(); } else toast(r.message, 'error'); });
}
const formCatatanHtml = () => `<div class="stack-sm"><label class="field"><span>Kategori</span><select class="select" id="ctKat"><option>Karier & Jurusan</option><option>Akademik</option><option>Pribadi</option><option>Sosial</option><option>Umum</option></select></label>
  <label class="field"><span>Catatan <span style="color:var(--red)">*</span></span><textarea class="textarea" id="ctIsi" placeholder="Ringkasan sesi konseling…"></textarea></label>
  <label class="field"><span>Tindak Lanjut</span><textarea class="textarea" id="ctTl" style="min-height:70px" placeholder="Rencana tindak lanjut…"></textarea></label>
  <label class="field"><span>Status</span><select class="select" id="ctSt"><option>Terbuka</option><option>Selesai</option></select></label></div>`;
async function kirimCatatan(idSiswa, idCat, root) {
  const r0 = root || document, isi = $('#ctIsi', r0).value.trim();
  if (isi.length < 3) { toast('Isi catatan terlebih dahulu.', 'warning'); return false; }
  const r = await api('simpanCatatan', { id_catatan: idCat, id_siswa: idSiswa, kategori: $('#ctKat', r0).value, catatan: isi, tindak_lanjut: $('#ctTl', r0).value.trim(), status: $('#ctSt', r0).value });
  if (!r.success) { toast(r.message, 'error'); return false; }
  toast('Catatan konseling tersimpan', 'success');
  const B = AppState.boot; (B.catatan = B.catatan || []).push([r.data.id_catatan, idSiswa, new Date().toISOString(), $('#ctKat', r0).value, $('#ctSt', r0).value]);
  Store.del(userKey('profil:' + idSiswa)); closeModal();
  if (location.hash.startsWith('#/siswa/')) route();
  return true;
}
function formCatatan(idSiswa) {
  const s = IDX().map[idSiswa];
  const m = modal(`<div class="card-h"><h3>Catatan Konseling — ${esc(s ? s.nama : '')}</h3><button class="icon-btn" data-x aria-label="Tutup">${ic('x')}</button></div>${formCatatanHtml()}<div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn line" data-x>Batal</button><button class="btn" id="ctOk">Simpan</button></div>`);
  $$('[data-x]', m).forEach(b => b.onclick = closeModal);
  m.querySelector('#ctOk').onclick = () => kirimCatatan(idSiswa, null, m).then(ok => { if (ok && location.hash.startsWith('#/pendampingan')) route(); });
}

/* ============================================================
   AKUN STAF
   ============================================================ */
registerPage('akun-staf', {
  auth: 'staf', shell: 'staf', title: 'Akun Saya',
  show(el) {
    const u = AppState.user || {};
    el.innerHTML = `<div class="grid g2" style="align-items:start;max-width:1000px"><div class="stack"><div class="card row" style="gap:16px"><div class="avatar" style="width:64px;height:64px;font-size:22px">${esc(inisial(u.nama))}</div><div><h3>${esc(u.nama)}</h3><p class="muted small">${esc(u.email)}</p><span class="badge b-p" style="margin-top:6px">${esc(labelPeran(u.role, u))}</span></div></div>
      <div class="card"><h3 style="margin-bottom:8px">Lingkup Akses</h3><p class="small">${u.role === 'GURU' ? 'Kelas yang diampu: <b>' + esc((u.kelas_diampu || []).join(', ') || '-') + '</b>' : u.role === 'BK' ? 'Seluruh kelas di unit <b>' + esc(u.unit_binaan) + '</b>' : 'Seluruh data sekolah'}</p></div>
      <button class="card row hover" style="width:100%;text-align:left;border:0" onclick="pilihTema()">${ic('palette')}<span class="grow"><b>Tema Tampilan</b><br><span class="small muted">${TEMA[document.documentElement.dataset.tema || 'ungu'].nama}</span></span>${ic('chevron-right')}</button>
      <button class="btn danger-soft block" onclick="keluarKonfirmasi()">${ic('log-out')} Keluar</button></div>
      <form class="card stack" id="gsForm"><h3>Ganti Kata Sandi</h3><label class="field"><span>Kata sandi lama</span><input class="input" type="password" id="gsLama" autocomplete="current-password"></label>
        <label class="field"><span>Kata sandi baru (min. 8 karakter)</span><input class="input" type="password" id="gsBaru" autocomplete="new-password"></label><label class="field"><span>Ulangi kata sandi baru</span><input class="input" type="password" id="gsBaru2" autocomplete="new-password"></label>
        <button class="btn">Simpan Kata Sandi</button></form></div>`;
    $('#gsForm', el).onsubmit = async e => {
      e.preventDefault(); const a = $('#gsLama', el).value, b = $('#gsBaru', el).value;
      if (b.length < 8) return toast('Kata sandi baru minimal 8 karakter.', 'warning');
      if (b !== $('#gsBaru2', el).value) return toast('Konfirmasi kata sandi tidak sama.', 'warning');
      const r = await api('gantiSandi', { lama: a, baru: b }); toast(r.message, r.success ? 'success' : 'error'); if (r.success) e.target.reset();
    };
  }
});
