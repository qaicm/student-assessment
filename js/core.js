/* ============================================================
   core.js — fondasi SPA: API (timeout+retry+idempotensi), cache
   SWR per pengguna, router hash, shell, toast, modal, tema.
   Pola: gas-instant-ux-pro (frontend terpisah + GAS REST).
   ============================================================ */
'use strict';
const CFG = window.APP_CONFIG || {};
const GAS_URL = CFG.GAS_URL;
const TES = ['VARK', 'MI', 'RIASEC', 'PS'];
const WARNA = {
  VARK: { V: '#8B5CF6', A: '#0EA5E9', R: '#F59E0B', K: '#10B981' },
  MI: { LIN: '#6366F1', LOG: '#0EA5E9', SPA: '#EC4899', KIN: '#10B981', MUS: '#F59E0B', INTER: '#F97316', INTRA: '#8B5CF6', NAT: '#22C55E', EKS: '#14B8A6' },
  RIASEC: { R: '#EF4444', I: '#3B82F6', A: '#EC4899', S: '#F59E0B', E: '#8B5CF6', C: '#10B981' },
  PS: { E: '#F97316', I: '#6366F1', S: '#10B981', N: '#8B5CF6', T: '#0EA5E9', F: '#EC4899', J: '#64748B', P: '#F59E0B' }
};
const TEMA = {
  ungu: { nama: 'Ungu Semangat', sub: 'Energik • Kreatif', w: ['#7C3AED', '#A78BFA', '#F5F3FF'] },
  biru: { nama: 'Biru Langit', sub: 'Tenang • Fokus', w: ['#0284C7', '#7DD3FC', '#F0F9FF'] },
  hijau: { nama: 'Hijau Segar', sub: 'Segar • Bertumbuh', w: ['#15803D', '#86EFAC', '#F0FDF4'] },
  putih: { nama: 'Putih Bersih', sub: 'Minimalis • Rapi', w: ['#334155', '#7C3AED', '#FFFFFF'] }
};

/* ---------- Utilitas ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (n, cls = '') => { const b = (window.ICONS || {})[n]; return b ? `<svg class="ic ${cls}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${b}</svg>` : ''; };
const inisial = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const fmtTgl = (d, jam) => { if (!d) return '-'; const x = new Date(d); if (isNaN(x)) return String(d); return x.toLocaleDateString('id-ID', jam ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' }); };
const sisaHari = iso => { if (!iso) return null; const d = new Date(iso + 'T23:59:59'); return Math.ceil((d - Date.now()) / 864e5); };
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const bagi = s => String(s || '').split('|').map(x => x.trim()).filter(Boolean);
const hashStr = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; };
function acak(arr, seed) {                          // acak deterministik (seed) → urutan konsisten saat dilanjutkan
  const a = arr.slice(); let s = 0; for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 1664525 + 1013904223) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ---------- State global ---------- */
const AppState = { token: '', role: '', user: null, boot: null, konten: null, tables: {}, sekolah: null };

/* ---------- Penyimpanan lokal (namespace + versi skema) ---------- */
const LS = 'sa:v1:';
const Store = {
  get(k, d) { try { const v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) {
    const s = JSON.stringify(v);
    try { localStorage.setItem(LS + k, s); }
    catch (e) {
      Object.keys(localStorage).filter(x => x.indexOf(LS + 'u:') === 0 && x.indexOf(LS + userKey('')) !== 0).forEach(x => localStorage.removeItem(x));
      try { localStorage.setItem(LS + k, s); } catch (e2) { /* tetap jalan tanpa cache */ }
    }
  },
  del(k) { try { localStorage.removeItem(LS + k); } catch (e) {} }
};
const userKey = k => 'u:' + (AppState.user ? AppState.user.id : 'anon') + ':' + k;

/* ---------- Pengukur performa: Perf.table() di console ---------- */
const Perf = {
  rows: [], add(action, total, server, cached) { this.rows.push({ action, total, server: server ?? null, net: server != null ? total - server : null, cache: cached ? '✓' : '' }); if (this.rows.length > 300) this.rows.shift(); },
  table() { console.table(this.rows.slice(-30)); },
  summary() { const g = {}; this.rows.forEach(r => { const x = g[r.action] = g[r.action] || { n: 0, total: 0, server: 0, cache: 0 }; x.n++; x.total += r.total; x.server += r.server || 0; if (r.cache) x.cache++; }); console.table(Object.fromEntries(Object.entries(g).map(([k, v]) => [k, { kali: v.n, rata_total_ms: Math.round(v.total / v.n), rata_server_ms: Math.round(v.server / v.n), cache_server: v.cache }]))); }
};
window.Perf = Perf;

/* ---------- API: timeout, retry baca, reqId untuk tulis ---------- */
const READ = /^(ping|publicBoot|namaKelas|konten|pesertaBoot|jawabanSaya|stafBoot|profilSiswa|batch|adminData|jawabanMentah|loginSiswa|loginStaf|ujiLanjut|drain|notifConfig|notifQueue|waDevice|waAudience|waBlastList|crmList|crmStats|crmDetail|crmExport|migrasiPindai|sistemStatus)$/;
/** Aksi baca yang aman digabung ke 1 eksekusi lewat 'batch' (tanpa parameter sensitif). */
const BATCHABLE = /^(adminData|notifConfig|notifQueue|waBlastList|crmList|crmStats|sistemStatus)$/;
async function apiOnce(action, data, timeout, reqId) {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), timeout), t0 = performance.now();
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctrl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },            // hindari CORS preflight
      body: JSON.stringify({ action, token: AppState.token || '', reqId, data: data || {} })
    });
    const text = await res.text();
    try { const j = JSON.parse(text); Perf.add(action, Math.round(performance.now() - t0), j.ms, j.cached); if (j.nq > 0) scheduleDrain(); return j; }
    catch (e) { return { success: false, network: true, retryable: res.status >= 500 || res.status === 429 || res.status === 200, message: 'Server membalas tidak terduga (HTTP ' + res.status + ').' }; }
  } catch (err) {
    return { success: false, network: true, retryable: true, message: err.name === 'AbortError' ? 'Server terlalu lama merespons.' : 'Koneksi terputus. Periksa internetmu.' };
  } finally { clearTimeout(timer); }
}
/* Turbo: baca identik yang sedang berjalan ditumpangi (dedupe); epoch tulis mencegah baca basi setelah simpan. */
const _inflight = {}; let _writeEpoch = 0;
function api(action, data, opt = {}) {
  if (!READ.test(action)) { _writeEpoch++; return apiRun(action, data, opt); }
  const k = _writeEpoch + '|' + action + '|' + (AppState.token || '') + '|' + JSON.stringify(data || {});
  if (_inflight[k]) return _inflight[k];
  const p = apiRun(action, data, opt); _inflight[k] = p;
  p.then(() => delete _inflight[k], () => delete _inflight[k]);
  return p;
}
/* Penggabung batch otomatis: beberapa apiQ() dalam satu tik → 1 eksekusi server. */
const Batcher = {
  q: null,
  add(action, data) { return new Promise(res => { if (!this.q) { this.q = []; setTimeout(() => this.flush(), 0); } this.q.push({ action, data: data || {}, res }); }); },
  async flush() {
    const q = this.q; this.q = null;
    const uniq = []; q.forEach(x => { const k = x.action + JSON.stringify(x.data); const u = uniq.find(y => y.k === k); if (u) u.list.push(x); else uniq.push({ k, action: x.action, data: x.data, list: [x] }); });
    const bisa = uniq.filter(u => BATCHABLE.test(u.action) && !uniq.some(o => o !== u && o.action === u.action)), sendiri = uniq.filter(u => bisa.indexOf(u) < 0);
    sendiri.forEach(u => api(u.action, u.data).then(r => u.list.forEach(x => x.res(r))));
    for (let i = 0; i < bisa.length; i += 10) {
      const part = bisa.slice(i, i + 10);
      if (part.length === 1) { api(part[0].action, part[0].data).then(r => part[0].list.forEach(x => x.res(r))); continue; }
      const r = await api('batch', { calls: part.map(u => ({ action: u.action, data: u.data })) });
      part.forEach(u => { const one = r.success ? (r.data[u.action] || { success: false, message: 'Tidak ada respons' }) : r; u.list.forEach(x => x.res(one)); });
    }
  }
};
function apiQ(action, data) { return isStaf() && BATCHABLE.test(action) ? Batcher.add(action, data) : api(action, data); }
/* Antrean notifikasi: respons membawa nq → panggil 'drain' (debounce 400 ms, ulang maks 3×). */
let _drainT = null, _drainN = 0;
function scheduleDrain() {
  clearTimeout(_drainT);
  _drainT = setTimeout(async () => {
    const r = await apiOnce('drain', {}, 30000, '');
    if (r.success && r.data && r.data.sisa > 0 && ++_drainN < 3) scheduleDrain(); else _drainN = 0;
  }, 400);
}
async function apiRun(action, data, opt = {}) {
  if (!GAS_URL || /XXXX/.test(GAS_URL)) return { success: false, message: 'GAS_URL belum diisi di js/config.js' };
  const isRead = READ.test(action);
  const reqId = isRead ? '' : (opt.reqId || uuid());
  const tries = opt.tries || (isRead ? 3 : 2);
  let res;
  for (let i = 0; i < tries; i++) {
    if (i) { await new Promise(r => setTimeout(r, 1200 * i)); if (navigator.onLine === false) await waitOnline(15000); }
    res = await apiOnce(action, data, isRead ? (i ? 40000 : 25000) : 60000, reqId);
    if (res.success || !(res.retryable || (res.data && res.data.retry))) break;
  }
  if (!res.success && res.data && res.data.code === 'AUTH' && AppState.token) onSessionExpired();
  return res;
}
function waitOnline(ms) { return new Promise(r => { if (navigator.onLine !== false) return r(); const t = setTimeout(done, ms); function done() { clearTimeout(t); removeEventListener('online', done); r(); } addEventListener('online', done); }); }
/** Pemanasan server (lapis 1 dari 3): GET ?w=pub|staf, maks 1× per 4 menit per lingkup. */
function warmUp(scope) {
  scope = scope || (isStaf() ? 'staf' : 'pub');
  if (!GAS_URL || /XXXX/.test(GAS_URL)) return;
  try { const k = 'sa:warm:' + scope, t = Number(sessionStorage.getItem(k) || 0); if (Date.now() - t < 240000) return; sessionStorage.setItem(k, String(Date.now())); } catch (e) {}
  fetch(GAS_URL + '?w=' + scope + '&t=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
}
/** Aktivitas pengguna → polling adaptif (cepat saat aktif, lambat saat diam, berhenti saat tab tersembunyi). */
const Activity = {
  at: Date.now(), last: {},
  init() { ['pointerdown', 'keydown', 'wheel', 'touchstart', 'focus'].forEach(ev => addEventListener(ev, () => { this.at = Date.now(); }, { passive: true })); },
  idle() { return Date.now() - this.at > 120000; },
  due(key, activeMs, idleMs) { if (document.visibilityState !== 'visible') return false; if (Date.now() - (this.last[key] || 0) < (this.idle() ? idleMs : activeMs) - 500) return false; this.last[key] = Date.now(); return true; }
};
Activity.init();

/** Stale-while-revalidate: render cache seketika, segarkan di latar, render ulang hanya bila berubah. */
async function swr(key, action, payload, render, opt = {}) {
  const fresh = opt.fresh ?? 60000, k = opt.global ? key : userKey(key);
  const c = Store.get(k, null);
  if (c) render(c.data, true);
  if (c && !opt.force && Date.now() - c.t < fresh) return { success: true, data: c.data, cached: true };
  const res = await api(action, payload);
  if (res.success) {
    const h = hashStr(JSON.stringify(res.data));
    Store.set(k, { t: Date.now(), h, data: res.data });
    if (!c || c.h !== h) render(res.data, false);
  } else if (!c && opt.onError) opt.onError(res);
  return res;
}

/* ---------- Sesi ---------- */
function simpanSesi(token, role, boot) {
  AppState.token = token; AppState.role = role; AppState.boot = boot; AppState.user = boot.user; AppState.sekolah = boot.sekolah;
  Store.set('sesi', { token, role });
  if (boot.konten) setKonten(boot.konten);
  Store.set(userKey('boot'), { t: Date.now(), h: '', data: stripKonten(boot) });
  if (boot.user && boot.user.tema) applyTema(boot.user.tema, false);
  if (isStaf()) warmUp('staf');
}
function stripKonten(b) { const c = Object.assign({}, b); delete c.konten; return c; }
function setKonten(k) { if (!k || !k.soal) return; AppState.konten = k; Store.set('konten', k); }
function keluar(pesan) {
  const u = AppState.user;
  AppState.token = ''; AppState.role = ''; AppState.user = null; AppState.boot = null;
  Store.del('sesi');
  if (u) Object.keys(localStorage).filter(x => x.indexOf(LS + 'u:' + u.id + ':') === 0 && !/:draf:/.test(x)).forEach(x => localStorage.removeItem(x));
  closeModal(); document.body.dataset.shell = '';
  go('masuk');
  if (pesan) toast(pesan, 'info');
}
function onSessionExpired() { keluar('Sesi berakhir. Silakan masuk kembali.'); }
const isPeserta = () => AppState.role === 'SISWA' || AppState.role === 'UJI';
const isStaf = () => ['GURU', 'BK', 'PIMPINAN', 'ADMIN'].includes(AppState.role);

/* ---------- Toast & modal ---------- */
function toast(msg, type = 'success', ms = 3200) {
  const box = $('#toasts'); const el = document.createElement('div');
  const ikon = { success: 'circle-check', error: 'circle-alert', warning: 'triangle-alert', info: 'info', fun: 'sparkles' }[type] || 'info';
  el.className = 'toast ' + type; el.setAttribute('role', 'status');
  el.innerHTML = ic(ikon) + '<span>' + esc(msg) + '</span>';
  box.appendChild(el); setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .2s'; setTimeout(() => el.remove(), 220); }, ms);
}
function modal(html, opt = {}) {
  closeModal();
  const ov = document.createElement('div'); ov.className = 'ov'; ov.id = 'ov';
  ov.innerHTML = `<div class="modal ${opt.wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`;
  ov.addEventListener('click', e => { if (e.target === ov && !opt.sticky) closeModal(); });
  document.body.appendChild(ov);
  const f = ov.querySelector('input,select,textarea,button'); if (f && !opt.noFocus) setTimeout(() => f.focus(), 50);
  return ov.firstElementChild;
}
function slideOver(title, body, foot) {
  closeModal();
  const ov = document.createElement('div'); ov.className = 'ov'; ov.id = 'ov'; ov.style.placeItems = 'stretch';
  ov.innerHTML = `<div class="slide" role="dialog" aria-modal="true"><div class="hd"><h3>${esc(title)}</h3><button class="icon-btn" data-close aria-label="Tutup">${ic('x')}</button></div><div class="bd">${body}</div><div class="ft">${foot || ''}</div></div>`;
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-close]')) closeModal(); });
  document.body.appendChild(ov);
  return ov.querySelector('.slide');
}
function closeModal() { const o = $('#ov'); if (o) o.remove(); }
function konfirmasi(judul, pesan, okLabel = 'Ya, lanjutkan', bahaya) {
  return new Promise(res => {
    const m = modal(`<h3>${esc(judul)}</h3><p class="muted" style="margin:10px 0 20px">${pesan}</p>
      <div class="row" style="justify-content:flex-end"><button class="btn line" data-n>Batal</button><button class="btn ${bahaya ? 'danger' : ''}" data-y>${esc(okLabel)}</button></div>`);
    m.querySelector('[data-n]').onclick = () => { closeModal(); res(false); };
    m.querySelector('[data-y]').onclick = () => { closeModal(); res(true); };
  });
}
function busy(on, teks = 'Memproses…') {
  let b = $('#busy');
  if (!on) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('div'); b.id = 'busy'; b.className = 'busy'; document.body.appendChild(b); }
  b.innerHTML = `<div><div class="spinner" style="margin:0 auto 14px"></div><b>${esc(teks)}</b></div>`;
}
const skel = (n = 3, h = 90) => Array.from({ length: n }, () => `<div class="sk" style="height:${h}px;margin-bottom:16px"></div>`).join('');
const kosong = (judul, pesan, ikon = 'inbox', aksi = '') => `<div class="empty"><div class="ill">${ic(ikon, 'ic-lg')}</div><h3>${esc(judul)}</h3><p>${pesan}</p>${aksi ? '<div style="margin-top:16px">' + aksi + '</div>' : ''}</div>`;
const gagal = (pesan, fnName) => kosong('Gagal memuat data', esc(pesan || 'Periksa koneksi internetmu.'), 'wifi-off', `<button class="btn" onclick="${fnName}">${ic('refresh-cw')} Coba lagi</button>`);

/* ---------- Tema ---------- */
function applyTema(t, sync = true) {
  if (!TEMA[t]) t = 'ungu';
  document.documentElement.dataset.tema = t;
  Store.set('tema', t);
  const meta = $('meta[name="theme-color"]'); if (meta) meta.content = TEMA[t].w[0];
  if (sync && AppState.token) api('simpanTema', { tema: t });         // fire & forget
}
function pilihTema() {
  const cur = document.documentElement.dataset.tema || 'ungu';
  const m = modal(`<div class="card-h"><h3>Pilih Tema Tampilan</h3><button class="icon-btn" data-x aria-label="Tutup">${ic('x')}</button></div>
    <div class="stack-sm">${Object.keys(TEMA).map(k => `<button class="theme-opt ${k === cur ? 'on' : ''}" data-t="${k}"><span class="sw">${TEMA[k].w.map(c => `<i style="background:${c}"></i>`).join('')}</span><span class="grow"><b>${TEMA[k].nama}</b><br><span class="small muted">${TEMA[k].sub}</span></span>${k === cur ? ic('circle-check') : ''}</button>`).join('')}</div>`);
  m.querySelector('[data-x]').onclick = closeModal;
  $$('[data-t]', m).forEach(b => b.onclick = () => { applyTema(b.dataset.t); closeModal(); toast('Tema ' + TEMA[b.dataset.t].nama + ' diterapkan', 'fun', 1800); });
}

/* ---------- Router hash + shell ---------- */
const Pages = {};
function registerPage(name, def) { Pages[name] = Object.assign({ auth: 'peserta', shell: 'peserta' }, def); }
function go(name, param) {
  const h = '#/' + name + (param != null && param !== '' ? '/' + encodeURIComponent(param) : '');
  if (location.hash === h) route(); else location.hash = h;
}
function izin(def) {
  if (def.auth === 'publik') return true;
  if (!AppState.token) return false;
  if (def.auth === 'peserta') return isPeserta();
  if (def.auth === 'staf') return isStaf();
  if (Array.isArray(def.auth)) return def.auth.includes(AppState.role);
  return false;
}
function halamanAwal() { return !AppState.token ? 'masuk' : isPeserta() ? 'beranda' : (AppState.role === 'GURU' ? 'kelas' : AppState.role === 'BK' ? 'unit' : 'sekolah'); }

function route() {
  const raw = location.hash.replace(/^#\/?/, ''), parts = raw.split('/');
  let name = parts[0], param = parts.slice(1).map(decodeURIComponent).join('/');
  let def = Pages[name];
  if (!def || !izin(def)) { const awal = halamanAwal(); if (name !== awal) return go(awal); def = Pages[awal]; name = awal; }
  renderShell(def.shell, name);
  const main = $('#main');
  let el = main.querySelector('.page[data-page="' + name + '"]');
  if (!el || def.fresh) {
    if (el) el.remove();
    el = document.createElement('section'); el.className = 'page'; el.dataset.page = name;
    el.innerHTML = def.template ? def.template() : '';
    main.appendChild(el);
  }
  $$('.page', main).forEach(p => p.hidden = p !== el);
  document.title = (def.title ? (typeof def.title === 'function' ? def.title(param) : def.title) + ' — ' : '') + (CFG.NAMA_APP || 'Student Assessment');
  $$('[data-nav]').forEach(a => a.classList.toggle('on', a.dataset.nav === (def.nav || name)));
  const t = $('#s-title'); if (t) t.textContent = typeof def.title === 'function' ? def.title(param) : (def.title || '');
  window.scrollTo(0, 0);
  closeSide();
  try { def.show && def.show(el, param); } catch (e) { console.error(e); el.innerHTML = gagal(e.message, 'route()'); }
}
window.addEventListener('hashchange', route);

function logoHtml() {
  const s = AppState.sekolah || {};
  return s.logo_url ? `<img src="${esc(s.logo_url)}" alt="" loading="lazy">` : ic('graduation-cap');
}

/** Satu shell per jenis layout; dibuat sekali, halaman di dalamnya disembunyikan/ditampilkan. */
function renderShell(type, name) {
  const app = $('#app');
  const key = type + ':' + AppState.role + ':' + (AppState.user ? AppState.user.id : '');
  if (app.dataset.shell === key) return;
  app.dataset.shell = key;
  if (type === 'blank') { app.innerHTML = '<main id="main"></main>'; return; }
  const u = AppState.user || {}, s = AppState.sekolah || {};
  if (type === 'peserta') {
    app.innerHTML = `${AppState.role === 'UJI' ? '<div class="trial-bar">' + ic('flask-conical', 'ic-sm') + ' Mode Uji Coba — hasil tidak masuk data sekolah</div>' : ''}
      <header class="p-top"><div class="in"><div class="logo-box">${logoHtml()}</div>
      <div class="grow"><div class="xs muted">${esc(s.nama_sekolah || '')}</div><h3 style="font-size:19px">Hai, ${esc((u.nama || '').split(' ')[0])}!</h3></div>
      <button class="icon-btn" onclick="pilihTema()" aria-label="Ganti tema">${ic('palette')}</button><button class="avatar" onclick="go('akun')" aria-label="Akun">${esc(inisial(u.nama))}</button></div></header>
      <main id="main" class="p-main"></main>
      <nav class="bnav" aria-label="Navigasi utama"><div class="in">
        <a href="#/beranda" data-nav="beranda">${ic('house')}Beranda</a><a href="#/profil" data-nav="profil">${ic('user-round')}Profil Saya</a>
        <a href="#/perkembangan" data-nav="perkembangan">${ic('trending-up')}Perkembangan</a><a href="#/akun" data-nav="akun">${ic('settings')}Akun</a></div></nav>`;
    return;
  }
  if (type === 'fokus') { app.innerHTML = '<main id="main"></main>'; return; }
  // staf
  app.innerHTML = `<div class="s-layout"><aside class="side" id="side"><div class="brand"><div class="logo-box">${logoHtml()}</div><div><b>Student Assessment</b><small>${esc(s.nama_sekolah || '')}</small></div></div>
      <nav>${menuStaf()}</nav>
      <div class="me"><div class="avatar">${esc(inisial(u.nama))}</div><div class="grow"><div class="small bold" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(u.nama || '')}</div><div class="xs" style="opacity:.7">${esc(labelPeran(AppState.role, u))}</div></div>
      <button onclick="keluarKonfirmasi()" aria-label="Keluar" title="Keluar">${ic('log-out')}</button></div></aside>
    <div class="scrim" id="scrim" onclick="closeSide()"></div>
    <div class="s-body"><header class="s-top"><button class="icon-btn burger" onclick="openSide()" aria-label="Menu">${ic('menu')}</button><h1 id="s-title"></h1>
      <select class="select" id="periodeSel" aria-label="Periode" onchange="gantiPeriode(this.value)"></select>
      <button class="icon-btn" onclick="pilihTema()" aria-label="Ganti tema">${ic('palette')}</button><button class="avatar" onclick="go('akun-staf')" aria-label="Akun">${esc(inisial(u.nama))}</button></header>
      <main id="main" class="s-main"></main></div></div>`;
  isiPeriodeSelect();
}
function labelPeran(r, u) { return { GURU: 'Guru', BK: 'Guru BK • Unit ' + (u.unit_binaan || ''), PIMPINAN: 'Pimpinan Sekolah', ADMIN: 'Administrator' }[r] || r; }
function menuStaf() {
  const r = AppState.role, item = (n, ikon, label, badge) => `<a href="#/${n}" data-nav="${n}">${ic(ikon)}<span>${label}</span>${badge ? '<span class="badge" id="nb-' + n + '">' + badge + '</span>' : ''}</a>`;
  let h = '';
  if (r === 'PIMPINAN' || r === 'ADMIN') h += item('sekolah', 'chart-column', 'Ringkasan Sekolah');
  if (r !== 'GURU') h += item('unit', 'building-2', 'Dashboard Unit');
  h += item('kelas', 'layout-dashboard', 'Pemetaan Kelas');
  if (r === 'BK' || r === 'PIMPINAN') { let n = 0; try { n = IDX().list.filter(s => alasanPendampingan(s).length).length; } catch (e) {} h += item('pendampingan', 'heart-handshake', 'Perlu Pendampingan', n ? String(n) : ''); }
  h += item('data', 'table-2', 'Data & Laporan');
  if (r === 'ADMIN') {
    h += '<div class="grp">Administrasi</div>' + item('import', 'file-up', 'Import Siswa') + item('naik-kelas', 'arrow-up-from-line', 'Naik Kelas') + item('staf', 'users-round', 'Kelola Staf') +
      item('periode', 'calendar-range', 'Kelola Periode') + item('bank-soal', 'file-question', 'Bank Soal') + item('uji-coba', 'flask-conical', 'Akun Uji Coba') + item('pengaturan', 'settings', 'Pengaturan');
  }
  if (r === 'ADMIN' || r === 'BK' || r === 'PIMPINAN') {
    h += '<div class="grp">Komunikasi</div>' + item('crm', 'contact-round', 'CRM Kontak');
    if (r !== 'PIMPINAN') h += item('notifikasi', 'message-circle', r === 'ADMIN' ? 'WhatsApp & Notifikasi' : 'Blast WhatsApp');
  }
  if (r === 'ADMIN') h += '<div class="grp">Sistem</div>' + item('migrasi', 'database', 'Migrasi Data') + item('sistem', 'gauge', 'Sistem & Performa');
  return h + '<div class="grp">Akun</div>' + item('akun-staf', 'circle-user-round', 'Akun Saya');
}
function openSide() { const s = $('#side'); if (s) { s.classList.add('open'); $('#scrim').classList.add('on'); } }
function closeSide() { const s = $('#side'); if (s) { s.classList.remove('open'); const c = $('#scrim'); if (c) c.classList.remove('on'); } }
async function keluarKonfirmasi() { if (await konfirmasi('Keluar dari aplikasi?', 'Kamu perlu masuk kembali untuk membuka data.', 'Keluar')) keluar('Kamu telah keluar.'); }
function isiPeriodeSelect() {
  const sel = $('#periodeSel'), b = AppState.boot; if (!sel || !b || !b.periode) return;
  sel.innerHTML = b.periode.map(p => `<option value="${esc(p.id_periode)}">${esc(p.nama_periode)}${p.status === 'DIBUKA' ? ' • aktif' : ''}</option>`).join('') || '<option>Belum ada periode</option>';
  sel.value = b.idPeriode || '';
}

/* ---------- Konten (bank soal & interpretasi) ---------- */
const K = {
  tes: t => (AppState.konten && AppState.konten.tes[t]) || { nama: t },
  dim: t => (AppState.konten && AppState.konten.dimensi[t]) || [],
  namaDim: (t, k) => { const d = K.dim(t).find(x => x[0] === k); return d ? d[1] : k; },
  soal: t => (AppState.konten ? AppState.konten.soal.filter(s => s.tes === t) : []),
  interp: (t, k) => (AppState.konten && AppState.konten.interp[t + '|' + k]) || null
};
async function pastikanKonten() {
  if (AppState.konten) return true;
  const k = Store.get('konten', null); if (k && k.soal) { AppState.konten = k; return true; }
  const r = await api('konten', {}); if (r.success && r.data.soal) { setKonten(r.data); return true; }
  return false;
}

/* ---------- Muat pustaka berat hanya saat dibutuhkan ---------- */
const _libs = {};
function loadScript(src) {
  return _libs[src] || (_libs[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = () => { delete _libs[src]; rej(new Error('Gagal memuat ' + src)); }; document.head.appendChild(s); }));
}
const libXlsx = () => loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
const libPdf = () => loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');

/* ---------- Mulai aplikasi ---------- */
async function mulai() {
  applyTema(Store.get('tema', 'ungu'), false);
  PWA.init();
  warmUp(Store.get('sesi', null) && ['GURU', 'BK', 'PIMPINAN', 'ADMIN'].includes((Store.get('sesi', {}) || {}).role) ? 'staf' : 'pub');
  const ses = Store.get('sesi', null);
  const konten = Store.get('konten', null); if (konten && konten.soal) AppState.konten = konten;
  if (ses && ses.token) {
    AppState.token = ses.token; AppState.role = ses.role;
    // render seketika dari cache perangkat (tanpa menunggu server)
    const allBoot = Object.keys(localStorage).filter(k => k.startsWith(LS + 'u:') && k.endsWith(':boot'));
    let cached = null;
    for (const k of allBoot) { try { const v = JSON.parse(localStorage.getItem(k)); if (v && v.data && v.data.user && v.data.user.role === ses.role && (!cached || v.t > cached.t)) cached = v; } catch (e) {} }
    if (cached) { AppState.boot = cached.data; AppState.user = cached.data.user; AppState.sekolah = cached.data.sekolah; }
    if (!location.hash || location.hash === '#/' || location.hash === '#/masuk') setHash('#/' + halamanAwal()); else route();
    segarkanBoot();
  } else {
    if (!location.hash || !/^#\/(masuk|uji)/.test(location.hash)) setHash('#/masuk'); else route();
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && Date.now() - (window._hidAt || 0) > 120000) { warmUp(); if (AppState.token) segarkanBoot(); } if (document.visibilityState === 'hidden') window._hidAt = Date.now(); });
}
/** Ganti hash tanpa memicu route dua kali (hashchange memanggil route sekali). */
function setHash(h) { if (location.hash === h) route(); else location.hash = h; }
/** Segarkan data boot di latar; render ulang halaman aktif hanya bila data berubah. */
async function segarkanBoot(opt = {}) {
  if (!AppState.token) return;
  const kv = AppState.konten ? AppState.konten.ver : '';
  const r = isPeserta() ? await api('pesertaBoot', { kontenVer: kv }) : await api('stafBoot', { kontenVer: kv, periode: opt.periode || (AppState.boot && AppState.boot.idPeriode) || '' });
  if (!r.success) { if (!AppState.boot) $('#main') && ($('#main').innerHTML = gagal(r.message, 'segarkanBoot()')); return; }
  const before = AppState.boot ? hashStr(JSON.stringify(stripKonten(AppState.boot))) : '';
  if (r.data.konten) setKonten(r.data.konten);
  const data = stripKonten(r.data);
  AppState.boot = data; AppState.user = data.user; AppState.sekolah = data.sekolah;
  Store.set(userKey('boot'), { t: Date.now(), h: '', data });
  if (data.user && data.user.tema && data.user.tema !== document.documentElement.dataset.tema) applyTema(data.user.tema, false);
  const cur = location.hash.replace(/^#\/?/, '').split('/')[0];
  if (Pages[cur] && Pages[cur].keep) return;                     // jangan ganggu siswa yang sedang mengerjakan tes
  if (hashStr(JSON.stringify(data)) !== before || r.data.konten) {
    $('#app').dataset.shell = ''; $$('#main .page').forEach(p => p.remove()); route();
  }
}
document.addEventListener('DOMContentLoaded', mulai);
