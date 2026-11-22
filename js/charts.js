/* ============================================================
   charts.js — grafik SVG ringan (tanpa pustaka): donut, radar,
   garis, gauge, ring, batang. Warna eksplisit agar ikut ke PDF.
   ============================================================ */
'use strict';
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#7C3AED';
const r2 = n => Math.round(n * 100) / 100;

const Chart = {
  donut(seg, { size = 200, thick = 34, center = '', sub = '' } = {}) {
    const R = size / 2, r = R - thick / 2, C = 2 * Math.PI * r, tot = seg.reduce((a, s) => a + s.v, 0) || 1;
    let off = 0;
    const arcs = seg.map(s => { const len = s.v / tot * C; const a = `<circle cx="${R}" cy="${R}" r="${r2(r)}" fill="none" stroke="${s.c}" stroke-width="${thick}" stroke-dasharray="${r2(len)} ${r2(C - len)}" stroke-dashoffset="${r2(-off)}" transform="rotate(-90 ${R} ${R})"><title>${esc(s.l)}: ${s.v}%</title></circle>`; off += len; return a; }).join('');
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Diagram donut">${arcs}
      <text x="${R}" y="${R - 6}" text-anchor="middle" font-family="Nunito" font-size="13" fill="#64748B">${esc(sub)}</text>
      <text x="${R}" y="${R + 18}" text-anchor="middle" font-family="Poppins" font-weight="700" font-size="22" fill="${cssVar('--p')}">${esc(center)}</text></svg>`;
  },

  radar(labels, series, { size = 300, max = 100, fontSize = 11 } = {}) {
    const n = labels.length, cx = size / 2, cy = size / 2, R = size / 2 - 52;
    const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n, rr = R * Math.max(0, Math.min(v, max)) / max; return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; };
    let g = '';
    [.25, .5, .75, 1].forEach(f => { g += `<polygon points="${labels.map((_, i) => pt(i, max * f).map(r2).join(',')).join(' ')}" fill="none" stroke="#E2E8F0" stroke-width="1"/>`; });
    labels.forEach((l, i) => {
      const [x, y] = pt(i, max), [lx, ly] = pt(i, max * 1.2);
      g += `<line x1="${cx}" y1="${cy}" x2="${r2(x)}" y2="${r2(y)}" stroke="#E2E8F0"/>`;
      const anchor = Math.abs(lx - cx) < 6 ? 'middle' : lx > cx ? 'start' : 'end';
      g += `<text x="${r2(lx)}" y="${r2(ly + 4)}" text-anchor="${anchor}" font-family="Nunito" font-size="${fontSize}" font-weight="600" fill="#475569">${esc(l)}</text>`;
    });
    series.forEach(s => {
      const pts = s.vals.map((v, i) => pt(i, v).map(r2).join(',')).join(' ');
      g += `<polygon points="${pts}" fill="${s.c}" fill-opacity="${s.fill ?? .22}" stroke="${s.c}" stroke-width="2.5" ${s.dash ? 'stroke-dasharray="6 5"' : ''} stroke-linejoin="round"/>`;
      s.vals.forEach((v, i) => { const [x, y] = pt(i, v); g += `<circle cx="${r2(x)}" cy="${r2(y)}" r="3.5" fill="${s.c}"><title>${esc(labels[i])}: ${v}</title></circle>`; });
    });
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Diagram radar">${g}</svg>`;
  },

  line(labels, series, { w = 560, h = 240, max = 100 } = {}) {
    const pl = 36, pr = 16, pt = 16, pb = 34, iw = w - pl - pr, ih = h - pt - pb, n = Math.max(labels.length, 1);
    const x = i => pl + (n === 1 ? iw / 2 : i * iw / (n - 1)), y = v => pt + ih - (v / max) * ih;
    let g = '';
    [0, 25, 50, 75, 100].forEach(v => { g += `<line x1="${pl}" x2="${w - pr}" y1="${r2(y(v))}" y2="${r2(y(v))}" stroke="#E2E8F0" ${v ? 'stroke-dasharray="4 4"' : ''}/><text x="${pl - 8}" y="${r2(y(v) + 4)}" text-anchor="end" font-size="10" fill="#94A3B8" font-family="Nunito">${v}</text>`; });
    labels.forEach((l, i) => { const a = n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle'; g += `<text x="${r2(x(i))}" y="${h - 10}" text-anchor="${a}" font-size="11" fill="#64748B" font-family="Nunito">${esc(l)}</text>`; });
    series.forEach(s => {
      g += `<polyline points="${s.vals.map((v, i) => r2(x(i)) + ',' + r2(y(v))).join(' ')}" fill="none" stroke="${s.c}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
      s.vals.forEach((v, i) => { g += `<circle cx="${r2(x(i))}" cy="${r2(y(v))}" r="4.5" fill="#fff" stroke="${s.c}" stroke-width="2.5"><title>${esc(s.name)} • ${esc(labels[i])}: ${v}</title></circle>`; });
    });
    return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="Grafik garis" style="max-width:${w}px">${g}</svg>`;
  },

  gauge(pct, { size = 200, label = '' } = {}) {
    const R = size / 2 - 14, cx = size / 2, cy = size / 2 + 6, p = Math.max(0, Math.min(100, pct));
    const arc = f => { const a = Math.PI * (1 - f); return [cx + R * Math.cos(a), cy - R * Math.sin(a)]; };
    const [x0, y0] = arc(0), [x1, y1] = arc(1), [xp, yp] = arc(p / 100);
    return `<svg viewBox="0 0 ${size} ${size / 2 + 34}" width="${size}" role="img" aria-label="Gauge ${p}%">
      <path d="M${r2(x0)} ${r2(y0)} A${R} ${R} 0 0 1 ${r2(x1)} ${r2(y1)}" fill="none" stroke="#E2E8F0" stroke-width="16" stroke-linecap="round"/>
      ${p > 0 ? `<path d="M${r2(x0)} ${r2(y0)} A${R} ${R} 0 0 1 ${r2(xp)} ${r2(yp)}" fill="none" stroke="${cssVar('--p')}" stroke-width="16" stroke-linecap="round"/>` : ''}
      <text x="${cx}" y="${cy - 8}" text-anchor="middle" font-family="Poppins" font-weight="700" font-size="30" fill="#1E1B4B">${p}%</text>
      <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-family="Nunito" font-size="12" fill="#64748B">${esc(label)}</text></svg>`;
  },

  ring(pct, { size = 112, stroke = 12, color = '#F59E0B', track = 'rgba(255,255,255,.25)', label } = {}) {
    const r = (size - stroke) / 2, C = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct));
    return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${r2(C * p / 100)} ${r2(C)}"/></svg><b>${label ?? p + '%'}</b></div>`;
  },

  /** Batang horizontal: [{l, v, c, n?}] */
  hbars(items, { max = 100, suffix = '%', wLabel = 120 } = {}) {
    return `<div class="mini-bars">${items.map(i => `<div class="r" style="grid-template-columns:${wLabel}px 1fr 64px"><span>${esc(i.l)}</span><div class="bar"><i style="width:${max ? Math.round(i.v / max * 100) : 0}%;background:${i.c}"></i></div><b style="text-align:right">${i.n != null ? i.n : i.v + suffix}</b></div>`).join('')}</div>`;
  },

  /** Batang bertumpuk: [{v, c, l}] */
  stack(parts) {
    const tot = parts.reduce((a, p) => a + p.v, 0) || 1;
    return `<div class="stack-bar">${parts.map(p => p.v ? `<i style="width:${p.v / tot * 100}%;background:${p.c}" title="${esc(p.l)}: ${p.v}"></i>` : '').join('')}</div>`;
  }
};

/** "Ganjil 2026/2027" → "Ganjil 26/27" (label sumbu ringkas). */
const singkatPeriode = n => String(n || '').replace(/(\d{2})(\d{2})\/(\d{2})(\d{2})/, '$2/$4');
/** Warna heatmap 0..100 berbasis warna tema. */
function heatColor(v) {
  const t = Math.max(0, Math.min(100, v)) / 100;
  if (t >= .75) return ['var(--p)', '#fff'];
  if (t >= .5) return ['var(--p-2)', '#1E1B4B'];
  if (t >= .3) return ['var(--p-ctr)', 'var(--on-p-ctr)'];
  return ['#F1F5F9', '#64748B'];
}
