/* ============================================================
   hasil.js — tampilan hasil per tes (dipakai siswa, staf, PDF)
   + pembuat laporan PDF (per tes, gabungan, massal per kelas).
   ============================================================ */
'use strict';
const INFO_TES = {
  VARK: { ikon: 'eye', bg: '#EDE9FE', fg: '#7C3AED', badge: 'Gaya Belajar' },
  MI: { ikon: 'brain', bg: '#E0F2FE', fg: '#0284C7', badge: '9 Kecerdasan' },
  RIASEC: { ikon: 'compass', bg: '#FCE7F3', fg: '#DB2777', badge: 'Arah Karier' },
  PS: { ikon: 'user-round', bg: '#DCFCE7', fg: '#15803D', badge: 'Gaya Pribadi' }
};
const urutSkor = (t, skor) => K.dim(t).map(d => d[0]).sort((a, b) => (skor[b] || 0) - (skor[a] || 0));
const PASANGAN_PS = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']];

/** Ringkasan 1 baris untuk kartu. */
function ringkas(h) {
  if (!h) return '';
  if (h.tes === 'MI') return urutSkor('MI', h.skor).slice(0, 3).map(k => K.namaDim('MI', k)).join(' • ');
  if (h.tes === 'RIASEC') return h.tipe.split('').map(k => K.namaDim('RIASEC', k)).join(' • ');
  if (h.tes === 'PS') { const i = K.interp('PS', h.tipe); return i ? i.judul.replace(/^\w{4}\s—\s/, '') : h.tipe; }
  return Object.entries(h.skor).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => K.namaDim('VARK', k) + ' ' + v + '%').join(' • ');
}
function judulHasil(h) {
  if (h.tes === 'PS') return h.tipe;
  if (h.tes === 'RIASEC') return h.tipe;
  if (h.tes === 'MI') return K.namaDim('MI', urutSkor('MI', h.skor)[0]);
  return h.label;
}

/** Kumpulkan interpretasi yang relevan untuk satu hasil. */
function interpHasil(h) {
  const t = h.tes;
  if (t === 'VARK') return h.tipe.split('').map(k => Object.assign({ kode: k }, K.interp('VARK', k) || {}));
  if (t === 'MI') return urutSkor('MI', h.skor).slice(0, 3).map(k => Object.assign({ kode: k }, K.interp('MI', k) || {}));
  if (t === 'RIASEC') return h.tipe.split('').map(k => Object.assign({ kode: k }, K.interp('RIASEC', k) || {}));
  return [Object.assign({ kode: h.tipe }, K.interp('PS', h.tipe) || {})];
}
const gabung = (list, f, maxEach = 9) => { const seen = new Set(), out = []; list.forEach(i => bagi(i[f]).slice(0, maxEach).forEach(x => { if (!seen.has(x)) { seen.add(x); out.push(x); } })); return out; };
const ul = arr => arr.length ? `<ul class="list-ok">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="muted">-</p>';

function grafikHasil(h, compact) {
  const t = h.tes, sk = h.skor, W = WARNA[t];
  if (t === 'VARK') {
    const seg = K.dim('VARK').map(d => ({ v: sk[d[0]] || 0, c: W[d[0]], l: d[1] })).sort((a, b) => b.v - a.v);
    return `<div class="chart-box">${Chart.donut(seg, { size: compact ? 170 : 210, center: seg[0].v + '%', sub: 'Dominan' })}</div>
      <div class="legend" style="margin-top:16px">${seg.map(s => `<div class="li"><span class="dot" style="background:${s.c};width:14px;height:14px"></span>${esc(s.l)}<b>${s.v}%</b></div>`).join('')}</div>`;
  }
  if (t === 'MI') {
    const dims = K.dim('MI');
    const radar = Chart.radar(dims.map(d => d[1].split('-')[0]), [{ vals: dims.map(d => sk[d[0]] || 0), c: cssVar('--p') }], { size: compact ? 260 : 320 });
    const bars = Chart.hbars(urutSkor('MI', sk).map(k => ({ l: K.namaDim('MI', k), v: sk[k] || 0, c: W[k] })), { wLabel: 130, suffix: '' });
    return `<div class="chart-box">${radar}</div><div style="margin-top:16px">${bars}</div>`;
  }
  if (t === 'RIASEC') {
    const dims = K.dim('RIASEC');
    const radar = Chart.radar(dims.map(d => d[0] + ' • ' + d[1]), [{ vals: dims.map(d => sk[d[0]] || 0), c: cssVar('--p') }], { size: compact ? 270 : 320, fontSize: 10 });
    return `<div class="chart-box">${radar}</div><div class="row" style="justify-content:center;gap:10px;margin-top:12px">${h.tipe.split('').map((k, i) => `<div style="text-align:center"><div style="width:56px;height:56px;border-radius:14px;background:${W[k]};color:#fff;display:grid;place-items:center;font:700 24px Poppins">${k}</div><div class="xs bold" style="margin-top:4px">${i + 1}. ${esc(K.namaDim('RIASEC', k))}</div></div>`).join('')}</div>`;
  }
  let jelas = {}; try { jelas = JSON.parse(h.kejelasan || '{}'); } catch (e) {}
  return `<div class="stack">${PASANGAN_PS.map(([a, b]) => {
    const va = sk[a] || 0, vb = sk[b] || 0, win = va >= vb ? a : b;
    return `<div><div class="pole"><span style="color:${win === a ? W[a] : '#94A3B8'}">${a} • ${esc(K.namaDim('PS', a))}</span>
      <div class="track"><i style="left:0;width:${va}%;background:${win === a ? W[a] : '#CBD5E1'}"></i><i style="right:0;width:${vb}%;background:${win === b ? W[b] : '#CBD5E1'}"></i></div>
      <span class="r" style="color:${win === b ? W[b] : '#94A3B8'}">${esc(K.namaDim('PS', b))} • ${b}</span></div>
      <div class="row between xs muted" style="margin:4px 92px 0"><span>${va}%</span><span class="badge">${esc(jelas[a + b] || '')}</span><span>${vb}%</span></div></div>`;
  }).join('')}</div>`;
}

/** Konten penjelasan lengkap. opt.staf → tampilkan tips guru. */
function kontenHasil(h, opt = {}) {
  const list = interpHasil(h), t = h.tes;
  const sec = (ikon, judul, isi, cls = '') => `<div class="card ${cls}"><h3 class="row" style="gap:10px;margin-bottom:10px">${ic(ikon)}${esc(judul)}</h3>${isi}</div>`;
  let html = '';
  if (t === 'VARK') {
    html += sec('info', 'Penjelasan', list.map(i => `<p style="margin-bottom:8px">${esc(i.deskripsi || '')}</p>`).join('') + (h.tipe.length > 1 ? '<p class="small muted">Kamu termasuk <b>multimodal</b>: dua gaya belajar sama kuat, jadi kombinasikan keduanya.</p>' : ''));
  } else if (t === 'MI') {
    html += sec('sparkles', '3 Kecerdasan Paling Menonjol', list.map((i, n) => `<div class="note" style="margin-bottom:10px;border-color:${WARNA.MI[i.kode]}"><b>${n + 1}. ${esc(i.judul || K.namaDim('MI', i.kode))}</b> <span class="badge">${h.skor[i.kode]}</span><p class="small" style="margin-top:4px">${esc(i.deskripsi || '')}</p></div>`).join(''));
  } else if (t === 'RIASEC') {
    html += sec('compass', 'Kode Minat ' + h.tipe, list.map((i, n) => `<div class="note" style="margin-bottom:10px;border-color:${WARNA.RIASEC[i.kode]}"><b>${n + 1}. ${esc(i.judul || i.kode)}</b><p class="small" style="margin-top:4px">${esc(i.deskripsi || '')}</p></div>`).join(''));
  } else {
    html += sec('info', 'Penjelasan', `<p>${esc(list[0].deskripsi || '')}</p>`);
  }
  const top = t === 'MI' || t === 'RIASEC' ? list : list;
  html += sec('badge-check', 'Kekuatanmu', ul(gabung(top, 'kekuatan', t === 'MI' || t === 'RIASEC' ? 2 : 9)), 'tint-green');
  html += sec('flag', 'Tantanganmu', ul(gabung(top, 'tantangan', t === 'MI' || t === 'RIASEC' ? 1 : 9)), 'tint-amber');
  html += sec('sprout', 'Saran Pengembangan Diri', ul(gabung(top.slice(0, t === 'VARK' ? 2 : 2), 'saran', 3)));
  html += sec('lightbulb', 'Cara Belajar Terbaikmu', top.slice(0, 2).map(i => `<p style="margin-bottom:6px">${esc(i.belajar || '')}</p>`).join(''));
  if (t === 'RIASEC' || t === 'PS' || t === 'MI') {
    const kar = gabung(list, 'karier', t === 'PS' ? 9 : 4);
    if (kar.length) html += sec('briefcase', t === 'MI' ? 'Bidang yang Cocok' : 'Pilihan Jurusan & Karier', `<div class="row wrap" style="gap:8px">${kar.map(k => `<span class="chip">${esc(k)}</span>`).join('')}</div>`);
  }
  if (opt.staf) html += sec('presentation', 'Tips Mengajar', ul(list.map(i => i.guru).filter(Boolean)), 'tint-info');
  return `<div class="stack">${html}</div>`;
}

function heroHasil(h) {
  const inf = INFO_TES[h.tes], interp = interpHasil(h)[0] || {};
  const desk = h.tes === 'PS' ? (interp.judul || '').replace(/^\w{4}\s—\s/, '') : h.tes === 'VARK' ? (interp.deskripsi || '').split('. ')[0] + '.' : ringkas(h);
  return `<div class="hero res-hero"><div class="bubble">${ic(inf.ikon, 'ic-lg')}</div><div class="tag">${esc(inf.badge)} Dominanmu</div>
    <h1>${esc(judulHasil(h))}</h1><p>${esc(desk)}</p><p class="xs" style="margin-top:10px;opacity:.8">${esc(h.nama_periode || '')} • ${fmtTgl(h.tanggal)}</p></div>`;
}

/* ============================================================
   LAPORAN PDF (A4) — dibuat di perangkat, tidak membebani GAS
   ============================================================ */
function kopLaporan(jenis) {
  const s = AppState.sekolah || {};
  return `<div class="kop"><div class="logo-box">${s.logo_url ? `<img src="${esc(s.logo_url)}" crossorigin="anonymous">` : ic('graduation-cap').replace('stroke="currentColor"', 'stroke="#ffffff"')}</div>
    <div class="grow"><h2 style="font-size:20px">${esc(s.nama_sekolah || '[Nama Sekolah]')}</h2><div class="xs" style="color:#64748B">Laporan Hasil Student Assessment • Unit SMP–SMA</div></div><span class="badge b-p">${esc(jenis)}</span></div>`;
}
function idLaporan(siswa, periode) {
  return `<div class="idbox"><div><small>Nama</small><b>${esc(siswa.nama)}</b></div><div><small>Unit / Kelas</small><b>${esc(siswa.kelas ? siswa.unit + ' • ' + siswa.kelas : siswa.kategori || 'Uji Coba')}</b></div>
    <div><small>Periode</small><b>${esc(periode || '-')}</b></div><div><small>Tanggal Cetak</small><b>${fmtTgl(new Date())}</b></div></div>`;
}
const footLap = (n, uji) => `<div class="foot"><span>Tes ini alat pengenalan diri, bukan diagnosis psikologis.</span><span>${esc((AppState.sekolah || {}).nama_sekolah || '')} • Halaman ${n}</span></div>${uji ? '<div class="wm">UJI COBA</div>' : ''}`;

function halamanTes(siswa, h, n, uji) {
  const list = interpHasil(h), inf = K.tes(h.tes);
  const box = (judul, isi, bg) => `<div class="box" style="${bg || ''}"><h4>${esc(judul)}</h4>${isi}</div>`;
  const ulx = a => `<ul>${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const multi = h.tes === 'MI' || h.tes === 'RIASEC';
  return `<div class="pg">${kopLaporan('Laporan ' + (inf.nama || h.tes))}${idLaporan(siswa, h.nama_periode)}
    <div class="lhero"><div><span class="badge b-dark">${esc(inf.nama)} (${esc(inf.subjudul || '')})</span><h2 style="margin-top:6px">${esc(judulHasil(h))}</h2><div class="small" style="opacity:.92">${esc(ringkas(h))}</div></div></div>
    <div class="chartrow"><div>${grafikLap(h)}</div><div>${box(h.tes === 'MI' ? '3 Kecerdasan Teratas' : h.tes === 'RIASEC' ? 'Kode Minat ' + h.tipe : 'Penjelasan', list.map(i => `<p style="margin-bottom:6px"><b>${esc(i.judul || i.kode)}</b>${h.tes === 'MI' ? ' (' + h.skor[i.kode] + ')' : ''} — ${esc(multi ? (i.deskripsi || '').split('. ')[0] + '.' : i.deskripsi || '')}</p>`).join(''))}</div></div>
    <div class="two">${box('Kekuatanmu', ulx(gabung(list, 'kekuatan', multi ? 2 : 9).slice(0, 4)), 'background:#DCFCE7;border-color:#BBF7D0;color:#166534')}${box('Tantanganmu', ulx(gabung(list, 'tantangan', multi ? 1 : 9).slice(0, 3)), 'background:#FEF3C7;border-color:#FDE68A;color:#92400E')}</div>
    ${box('Saran Pengembangan Diri', ulx(gabung(list.slice(0, 2), 'saran', 3).slice(0, 3)))}
    ${box('Cara Belajar Terbaikmu', list.slice(0, h.tes === 'VARK' ? 2 : 1).map(i => `<p>${esc(i.belajar || '')}</p>`).join(''))}
    ${h.tes !== 'VARK' ? box(h.tes === 'MI' ? 'Bidang yang Cocok' : 'Pilihan Jurusan & Karier', `<p>${esc(gabung(list, 'karier', h.tes === 'PS' ? 9 : 4).join(' • '))}</p>`) : ''}
    ${footLap(n, uji)}</div>`;
}
/** Grafik untuk halaman tes di PDF (ukuran terkendali agar muat 1 halaman A4). */
function grafikLap(h) {
  if (h.tes === 'VARK' || h.tes === 'PS') return grafikHasil(h, true);
  const dims = K.dim(h.tes), sk = h.skor;
  const r = Chart.radar(dims.map(d => h.tes === 'MI' ? d[1].split('-')[0] : d[0] + ' ' + d[1].slice(0, 6)), [{ vals: dims.map(d => sk[d[0]] || 0), c: cssVar('--p') }], { size: 250, fontSize: 9 });
  const chips = h.tes === 'RIASEC' ? `<div style="display:flex;gap:6px;justify-content:center">${h.tipe.split('').map(k => `<span style="width:34px;height:34px;border-radius:9px;background:${WARNA.RIASEC[k]};color:#fff;display:grid;place-items:center;font:700 16px Poppins">${k}</span>`).join('')}</div>` : '';
  return `<div style="display:grid;place-items:center">${r}</div>${chips}`;
}
/** Grafik ringkas untuk halaman ringkasan PDF (ukuran tetap, tanpa legenda). */
function miniLap(h) {
  const sk = h.skor, W = WARNA[h.tes];
  if (h.tes === 'VARK') { const seg = K.dim('VARK').map(d => ({ v: sk[d[0]] || 0, c: W[d[0]], l: d[1] })).sort((a, b) => b.v - a.v); return Chart.donut(seg, { size: 150, thick: 26, center: seg[0].v + '%', sub: 'Dominan' }); }
  if (h.tes === 'MI' || h.tes === 'RIASEC') { const dims = K.dim(h.tes); return Chart.radar(dims.map(d => h.tes === 'MI' ? d[1].split('-')[0] : d[0]), [{ vals: dims.map(d => sk[d[0]] || 0), c: cssVar('--p') }], { size: 190, fontSize: 9 }); }
  return `<div style="display:flex;gap:6px;width:100%">${h.tipe.split('').map(c => `<span style="flex:1;text-align:center;padding:14px 0;border-radius:10px;background:${W[c]}22;color:${W[c]};font:700 22px Poppins">${c}</span>`).join('')}</div>`;
}
function halamanRingkasan(siswa, hasilList, uji) {
  const kartu = TES.map(t => {
    const h = hasilList.find(x => x.tes === t), inf = K.tes(t);
    return `<div class="box"><div class="xs" style="color:#64748B;font-weight:700">${esc(inf.nama)}</div>${h ? `<h3 style="margin:4px 0">${esc(judulHasil(h))}</h3><div class="small">${esc(ringkas(h))}</div><div style="margin-top:8px;display:grid;place-items:center">${miniLap(h)}</div>` : '<p style="color:#64748B">Belum dikerjakan</p>'}</div>`;
  }).join('');
  return `<div class="pg">${kopLaporan('Profil Gabungan')}${idLaporan(siswa, hasilList[0] ? hasilList[0].nama_periode : '')}
    <h3 style="margin-bottom:10px">Ringkasan Profil Diri</h3><div class="sum4">${kartu}</div>${footLap(1, uji)}</div>`;
}
/** mode: 'tes' (satu tes) | 'gabungan' (ringkasan + semua tes) */
function htmlLaporan(siswa, hasilList, mode, uji) {
  if (mode === 'tes') return halamanTes(siswa, hasilList[0], 1, uji);
  const urut = TES.map(t => hasilList.find(h => h.tes === t)).filter(Boolean);
  return halamanRingkasan(siswa, urut, uji) + urut.map((h, i) => halamanTes(siswa, h, i + 2, uji)).join('');
}
function hostLaporan(inner) {
  let host = $('#lapHost'); if (host) host.remove();
  host = document.createElement('div'); host.id = 'lapHost'; host.className = 'lap-host';
  host.innerHTML = `<div class="lap">${inner}</div>`;
  document.body.appendChild(host);
  return host.firstElementChild;
}
const OPT_PDF = nama => ({ margin: 0, filename: nama, image: { type: 'jpeg', quality: 0.92 }, html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0, windowWidth: 794 }, jsPDF: { unit: 'px', format: [794, 1123], hotfixes: ['px_scaling'] }, pagebreak: { mode: ['css'] } });

async function unduhPdf(siswa, hasilList, mode, namaFile) {
  if (!hasilList.length) return toast('Belum ada hasil tes untuk diunduh.', 'warning');
  busy(true, 'Menyiapkan PDF…');
  try {
    await pastikanKonten();
    const el = hostLaporan(htmlLaporan(siswa, hasilList, mode, siswa.uji));
    await libPdf();
    await html2pdf().set(OPT_PDF(namaFile)).from(el).save();
    toast('PDF berhasil diunduh', 'success');
  } catch (e) {
    console.warn(e); toast('Gagal membuat PDF otomatis. Membuka dialog cetak…', 'warning');
    window.print();
  } finally { busy(false); const h = $('#lapHost'); if (h) setTimeout(() => h.remove(), 500); }
}

/** PDF massal: satu file, satu siswa per bagian, diproses bertahap agar perangkat tidak berat. */
async function unduhPdfMassal(items, namaFile) {
  const ada = items.filter(i => i.hasil.length);
  if (!ada.length) return toast('Belum ada siswa yang memiliki hasil.', 'warning');
  busy(true, 'Menyiapkan PDF massal… 0/' + ada.length);
  try {
    await pastikanKonten(); await libPdf();
    let worker = null;
    for (let i = 0; i < ada.length; i++) {
      busy(true, `Menyiapkan PDF massal… ${i + 1}/${ada.length}`);
      const el = hostLaporan(htmlLaporan(ada[i].siswa, ada[i].hasil, 'gabungan', false));
      if (!worker) worker = html2pdf().set(OPT_PDF(namaFile)).from(el).toPdf();
      else worker = worker.get('pdf').then(p => { p.addPage(); }).from(el).toContainer().toCanvas().toPdf();
      await worker;
      if (i % 10 === 9) await new Promise(r => setTimeout(r, 30));     // beri jeda tiap 10 siswa
    }
    await worker.save();
    toast('PDF massal berhasil diunduh', 'success');
  } catch (e) { console.warn(e); toast('Gagal membuat PDF massal: ' + e.message, 'error'); }
  finally { busy(false); const h = $('#lapHost'); if (h) h.remove(); }
}
