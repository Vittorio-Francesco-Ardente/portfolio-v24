/*!
 * SUN-FAI · loader iniziale (prototipo P02)
 * Il sole SUN-FAI si costruisce con i "flussi di energia": nastri a punta che arrivano da fuori schermo,
 * tessono raggi e terra a corsie parallele e si saldano. Sfondo: soli d'angolo minimal.
 * Un solo <canvas> in uno shadow root dentro #sf-loader, un solo requestAnimationFrame, nessuna dipendenza.
 *
 * API: window.sfLoader.ready()            → la pagina è pronta: finisce la firma ed esce
 *      window.sfLoader.seek(t)            → (debug) mette in pausa e mostra il fotogramma t (0 → 1,8 s)
 *      window.sfLoader.play()             → (debug) riprende
 *      window.SFLoader.start(opzioni)     → avvio manuale (pagina di prova)
 * Fine: classe html.sf-loader-done + evento window "sf-loader-done".
 */
(function () {
  'use strict';

  // ================================================================ COSTANTI
  const COLORI = {
    verde: '#478A2B', arancio: '#FE5F00', giallo: '#F3C300', carta: '#FBF8F1',
    angolo: { nucleo: '#FE9845', raggi: ['#B9D68F', '#9CC56B'], fascia1: '#FBE39B', fascia2: '#FDEFC4' },
    collina: { disco: '#FAD2B2', anello: '#DCEBC4' },
  };

  // Tempi in secondi (vedi PIANO_LOADER.md §3)
  const TEMPI = {
    firma: 1.2, uscita: 0.6, massimo: 10,
    disco: 0.12,
    raggiBase: 0.52, raggiPasso: 0.04,
    terraBase: 0.62, terraPasso: 0.01,
    corsiaPasso: 0.014, casoCorsia: 0.03,
    voloMin: 0.42, voloMax: 0.7,
    rimbalzo: 1.0,
    ciclo: 2.4, cicloLento: 4.8, lentoDopo: 5,
    ridottoMin: 0.6, ridottoFade: 0.3,
  };

  // Qualità: larghezza di corsia (unità del marchio), fasci in uscita, DPR massimo
  const QUALITA = {
    high: { corsia: 7.2, fasci: 36, dpr: 2 },
    medium: { corsia: 10.44, fasci: 28, dpr: 1.5 },
    low: { corsia: 16.56, fasci: 20, dpr: 1 },
  };

  // Geometria ufficiale del marchio (unità SVG 799×784, centro del sole 396,396), semplificata a ≤ 0,5 u
  const GEO = {"ray-1":[269.6,388.4,117.0,374.6,116.4,372.0,118.7,353.1,125.2,323.0,126.7,322.5,132.3,323.9,281.3,364.2,281.8,365.8,278.0,388.3,276.7,388.9],"ray-2":[284.1,347.0,141.2,279.7,142.6,275.8,153.1,255.6,167.4,233.9,175.8,239.1,298.4,325.9,299.1,326.9,298.7,328.1,287.7,347.8,287.0,348.3],"ray-3":[284.5,287.6,197.2,199.2,197.1,198.3,199.2,196.0,214.6,182.1,236.6,165.5,237.5,165.3,239.4,167.6,328.9,297.2,310.3,313.3],"ray-4":[344.0,288.4,276.6,142.7,280.3,140.4,295.4,134.1,324.9,124.7,326.3,125.7,330.0,139.1,366.9,278.7,366.1,280.4],"ray-5":[384.1,276.4,370.2,117.4,374.0,116.3,390.1,115.5,420.9,116.5,422.2,117.1,422.5,119.8,408.8,276.8],"ray-6":[446.8,287.9,426.6,280.4,425.8,278.8,466.2,126.6,467.0,124.9,468.5,124.8,497.8,134.2,514.5,141.4,516.1,143.0,450.4,285.6,448.5,288.5],"ray-7":[481.1,312.3,464.3,297.8,464.1,296.4,552.6,168.6,555.3,165.3,556.6,165.5,575.0,179.3,590.6,193.3,595.7,198.8,487.4,308.7,482.4,313.3],"ray-8":[505.4,348.1,493.7,327.6,493.9,326.1,618.5,238.0,624.7,234.1,626.2,234.7,640.0,256.1,651.4,279.4],"ray-9":[514.7,388.5,511.1,366.0,511.8,364.3,658.6,324.4,666.4,322.4,667.8,323.4,673.6,350.5,676.6,373.8,676.1,374.4,655.7,376.8,520.3,388.7],"ground":[382.1,676.3,357.4,673.9,331.5,669.0,310.6,663.2,285.5,653.7,260.6,641.4,240.3,628.8,219.5,613.4,201.8,597.4,186.9,582.0,167.4,557.2,156.4,540.1,142.3,513.5,134.7,495.7,125.8,467.0,120.5,442.3,118.5,424.2,276.8,411.9,277.7,413.3,281.0,428.0,284.9,439.3,294.3,457.7,304.2,471.5,316.0,483.8,322.4,489.2,335.1,498.0,347.4,504.2,357.1,508.1,378.1,513.3,398.6,514.8,419.8,512.4,437.2,507.5,455.5,499.2,472.1,487.8,478.7,481.9,490.6,469.0,500.4,454.6,509.5,435.0,515.7,412.6,673.6,425.0,675.5,425.7,673.2,444.8,665.1,478.4,657.5,500.5,644.6,528.0,630.2,552.0,614.0,574.0,595.3,594.6,581.1,607.9,562.4,622.8,540.4,637.4,519.2,648.8,490.5,660.9,464.3,668.6,434.6,674.2,413.3,676.1]};
  const CX = 396, CY = 396, DISCO_R = 84.6, LARGHEZZA_MARCHIO = 564;
  const RAGGI = ['ray-1', 'ray-2', 'ray-3', 'ray-4', 'ray-5', 'ray-6', 'ray-7', 'ray-8', 'ray-9'];
  const ORDINE_RAGGI = ['ray-5', 'ray-4', 'ray-6', 'ray-3', 'ray-7', 'ray-2', 'ray-8', 'ray-1', 'ray-9'];

  // ================================================================ MATEMATICA
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (x) => { const c = clamp(x); return c * c * (3 - 2 * c); };
  const TAU = Math.PI * 2, RAD = Math.PI / 180;

  /** cubic-bezier come in CSS: restituisce y(x). */
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (t) => ((ax * t + bx) * t + cx) * t;
    const Y = (t) => ((ay * t + by) * t + cy) * t;
    const dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const e = X(t) - x, d = dX(t);
        if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      if (!(t >= 0 && t <= 1) || Math.abs(X(t) - x) > 1e-4) {
        let a = 0, b = 1; t = x;
        for (let i = 0; i < 24; i++) { if (X(t) < x) a = t; else b = t; t = (a + b) / 2; }
      }
      return Y(t);
    };
  }

  // Curve estratte dal motore Ardaké Motion Studio
  const CURVE = {
    stream: bezier(0.32, 0, 0.12, 1),
    tailCatch: bezier(0.5, 0, 0.2, 1),
    micro: bezier(0.16, 0.84, 0.3, 1),
    reveal: bezier(0.62, 0, 0.84, 0.44),
    glide: bezier(0.66, 0, 0.22, 1),
    out: bezier(0.2, 0.8, 0.3, 1),
    inOut: bezier(0.45, 0, 0.2, 1),
  };

  /** Molla: risposta al gradino di un oscillatore smorzato (f in Hz, z smorzamento). 0 → 1. */
  function K(t, f, z) {
    if (t <= 0) return 0;
    const w = TAU * f;
    if (z >= 1) return 1 - (1 + w * t) * Math.exp(-w * t);
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
  }
  /** Impulso smorzato normalizzato (picco = 1): per impatti e battiti. */
  function P(t, f, z) {
    if (t <= 0) return 0;
    const w = TAU * f, wd = w * Math.sqrt(Math.max(1e-4, 1 - z * z));
    const tp = Math.atan2(wd, z * w) / wd;
    return (Math.exp(-z * w * t) * Math.sin(wd * t)) / (Math.exp(-z * w * tp) * Math.sin(wd * tp));
  }
  /** Interpolazione d'angolo sul percorso più corto. */
  function angLerp(a, b, t) { return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t; }

  /** RNG deterministico (mulberry32, come ripples.ts). */
  function rng(seed) {
    let a = seed >>> 0;
    const next = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return { next, range: (a0, b0) => a0 + (b0 - a0) * next(), sign: () => (next() < 0.5 ? -1 : 1) };
  }

  // ================================================================ POLILINEE
  /** Catmull-Rom uniforme attraverso i punti, n campioni per segmento. */
  function spline(pts, n) {
    const out = [];
    const p = [pts[0], ...pts, pts[pts.length - 1]];
    for (let i = 1; i < p.length - 2; i++) {
      const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        ]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  /** Ricampiona una polilinea a passo costante: x, y, s (lunghezza), tx, ty (tangente). */
  function resample(pts, step) {
    let len = 0;
    const acc = [0];
    for (let i = 1; i < pts.length; i++) { len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); acc.push(len); }
    const n = Math.max(2, Math.ceil(len / step) + 1);
    const x = new Float32Array(n), y = new Float32Array(n), tx = new Float32Array(n), ty = new Float32Array(n);
    let j = 0;
    for (let i = 0; i < n; i++) {
      const s = Math.min(len, i * step);
      while (j < pts.length - 2 && acc[j + 1] < s) j++;
      const seg = acc[j + 1] - acc[j] || 1, f = (s - acc[j]) / seg;
      x[i] = lerp(pts[j][0], pts[j + 1][0], f);
      y[i] = lerp(pts[j][1], pts[j + 1][1], f);
    }
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      const dx = x[b] - x[a], dy = y[b] - y[a], l = Math.hypot(dx, dy) || 1;
      tx[i] = dx / l; ty[i] = dy / l;
    }
    return { x, y, tx, ty, n, len, step };
  }

  /** Punto e tangente alla lunghezza s. */
  function at(p, s, o) {
    const f0 = clamp(s / p.step, 0, p.n - 1.0001), i = Math.floor(f0), f = f0 - i;
    o[0] = lerp(p.x[i], p.x[i + 1], f); o[1] = lerp(p.y[i], p.y[i + 1], f);
    o[2] = p.tx[i]; o[3] = p.ty[i];
    return o;
  }

  /** Aggiunge a `path` il nastro della polilinea tra s0 e s1, con semilarghezza wfn(s). */
  const _o = [0, 0, 0, 0];
  const _L = [], _R = [];
  function ribbon(p, s0, s1, wfn, path) {
    if (s1 - s0 < 0.3) return;
    _L.length = 0; _R.length = 0;
    const st = p.step * 2; // un vertice ogni ~3 u: abbastanza fine a qualsiasi scala reale
    const push = (s) => {
      at(p, s, _o);
      const w = wfn(s), nx = -_o[3] * w, ny = _o[2] * w;
      _L.push(_o[0] + nx, _o[1] + ny); _R.push(_o[0] - nx, _o[1] - ny);
    };
    push(s0);
    for (let s = Math.ceil(s0 / st) * st; s < s1; s += st) if (s > s0) push(s);
    push(s1);
    path.moveTo(_L[0], _L[1]);
    for (let i = 2; i < _L.length; i += 2) path.lineTo(_L[i], _L[i + 1]);
    for (let i = _R.length - 2; i >= 0; i -= 2) path.lineTo(_R[i], _R[i + 1]);
    path.closePath();
  }

  // ================================================================ FORME DEL MARCHIO
  function buildShapes() {
    const shapes = {};
    for (const id of [...RAGGI, 'ground']) {
      const a = GEO[id], pts = [];
      for (let i = 0; i < a.length; i += 2) pts.push([a[i], a[i + 1]]);
      const path = new Path2D();
      pts.forEach((p, i) => (i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1])));
      path.closePath();
      let A = 0, gx = 0, gy = 0;
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length], c = x0 * y1 - x1 * y0;
        A += c; gx += (x0 + x1) * c; gy += (y0 + y1) * c;
      }
      A /= 2;
      const cen = [gx / (6 * A), gy / (6 * A)];
      // asse "matematico" del raggio (0° = destra, antiorario)
      const deg = Math.atan2(-(cen[1] - CY), cen[0] - CX) / RAD;
      shapes[id] = { id, pts, path, area: Math.abs(A), cen, deg };
    }
    return shapes;
  }

  // ================================================================ QUALITÀ
  function detectQuality() {
    const n = navigator, c = n.connection;
    if (c && c.saveData) return 'low';
    const mem = n.deviceMemory || 8, cpu = n.hardwareConcurrency || 8;
    if (mem <= 2 || cpu <= 2) return 'low';
    if (mem <= 4 || cpu <= 4) return 'medium';
    return 'high';
  }

  // ================================================================ IMPAGINAZIONE
  /** Scala e posizione del marchio + mondo in unità del marchio + soli d'angolo in px CSS. */
  function layout(W, H) {
    const mob = W <= 640;
    const D = mob ? Math.min(0.46 * W, 220) : clamp(0.34 * Math.min(W, H), 160, 320);
    const s = D / LARGHEZZA_MARCHIO, cx = W / 2, cy = H * 0.46;
    const toU = (px, py) => [(px - cx) / s + CX, (py - cy) / s + CY];
    const [x0, y0] = toU(0, 0), [x1, y1] = toU(W, H);
    const u = mob ? 0.62 * Math.max(W, H) : Math.min(W, H);
    const corners = mob
      ? [
          { kind: 'sun', x: W + 0.03 * u, y: -0.02 * u, k: 0.8, a0: Math.PI / 2, a1: Math.PI, delay: 0 },
          { kind: 'hill', x: 0.9 * W, y: H + 0.3 * u, k: 0.9, delay: 0.12 },
        ]
      : [
          { kind: 'sun', x: -0.03 * u, y: H + 0.03 * u, k: 1, a0: -Math.PI / 2, a1: 0, delay: 0 },
          { kind: 'sun', x: W + 0.02 * u, y: -0.02 * u, k: 0.72, a0: Math.PI / 2, a1: Math.PI, delay: 0.1 },
          { kind: 'hill', x: 0.88 * W, y: H + 0.26 * u, k: 1, delay: 0.18 },
        ];
    for (const c of corners) {
      c.R = (c.kind === 'sun' ? 0.5 : 0.586) * u * c.k;
      const dx = c.x - W / 2, dy = c.y - H / 2, l = Math.hypot(dx, dy) || 1;
      c.ox = dx / l; c.oy = dy / l; // direzione verso l'esterno
      c.u = u;
      c.pulses = [];
    }
    const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([px, py]) => Math.hypot(px - cx, py - cy)));
    return { W, H, mob, D, s, cx, cy, u, corners, far, world: { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, diag: Math.hypot(x1 - x0, y1 - y0) } };
  }

  // ================================================================ NASTRI (FLUSSI DI ENERGIA)
  /**
   * Costruisce i nastri di una forma lungo un "telaio" (asse g = direzione di marcia dei nastri).
   * Ricalca `init`/`pushStrip` del motore: guida su spline dall'origine fuori schermo, corsie parallele
   * che convergono, ondulazione che si spegne, poi attraversamento della forma da un lato all'altro.
   */
  function frameOf(shape, th) {
    const g = [Math.cos(th), Math.sin(th)], M = [-g[1], g[0]], [px, py] = shape.cen;
    const proj = (p) => [(p[0] - px) * g[0] + (p[1] - py) * g[1], (p[0] - px) * M[0] + (p[1] - py) * M[1]];
    let T = 1e9, I = -1e9, E = 1e9, L = -1e9;
    for (const p of shape.pts) { const [a, b] = proj(p); T = Math.min(T, a); I = Math.max(I, a); E = Math.min(E, b); L = Math.max(L, b); }
    const q = (a, b) => [px + g[0] * a + M[0] * b, py + g[1] * a + M[1] * b];
    return { th, g, M, T, I, E, L, q, mid: (E + L) / 2 };
  }

  function guideOf(F, fromCanvas, world, r) {
    const d = world.diag * 0.62, X = 42;
    const o = [world.cx + d * Math.cos(fromCanvas), world.cy + d * Math.sin(fromCanvas)];
    const tw = r.range(-10, 10) * RAD, W = r.range(0.42, 0.62);
    const c1 = [world.cx + d * W * Math.cos(fromCanvas + tw), world.cy + d * W * Math.sin(fromCanvas + tw) * 0.8];
    const c2 = F.q(F.T - X - r.range(150, 230), F.mid + r.range(-90, 90));
    const c3 = F.q(F.T - X - 70, F.mid), c4 = F.q(F.T - X, F.mid);
    return { guide: resample(spline([o, c1, c2, c3, c4], 14), 1.5), origin: o, conv: r.range(0.07, 0.16) };
  }

  /** Un nastro: corsia in posizione trasversale `d2` (coord. del telaio). */
  function makeStrip(shape, F, G, d2, laneIdx, wLane, tA, r, opt) {
    const c = G.guide, k2 = d2 - F.mid, pts = [];
    for (let h = 0; h < c.n; h++) {
      const f = (h * c.step) / c.len;
      const conv = lerp(G.conv, 1, smooth((f - 0.5) / 0.5));
      const wave = Math.sin(f * 9 + laneIdx * 1.7) * 1.6 * (1 - smooth((f - 0.6) / 0.35));
      const off = k2 * conv + wave;
      pts.push([c.x[h] - c.ty[h] * off, c.y[h] + c.tx[h] * off]);
    }
    const last = pts[pts.length - 1], a = F.q(F.T - 1.5, d2), b = F.q(F.I + 2, d2);
    let sE = 0;
    for (let i = 1; i < pts.length; i++) sE += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    sE += Math.hypot(a[0] - last[0], a[1] - last[1]);
    const poly = resample([...pts, a, b], 1.5);
    const sEnd = poly.len;
    const thin = opt.thin ?? (r.next() < 0.3 ? r.range(0.62, 0.8) : r.range(0.2, 0.48));
    const speed = 1300 * r.range(0.72, 1.3);
    const flight = clamp(sEnd / speed, opt.voloMin ?? TEMPI.voloMin, opt.voloMax ?? TEMPI.voloMax);
    const st = {
      shape: shape.id, poly, sE, sEnd,
      wf: Math.max(wLane * thin, makeStrip.minW || 0), wFull: wLane + 1.3, wLane,
      t0: Math.max(0.02, tA - flight), tA, tIn: tA, tDone: tA,
      lenMin: 36 + r.range(0, 18), blur: r.range(0.11, 0.17),
      origin: G.origin,
    };
    // istante in cui la coda entra nella forma, e in cui la corsia è piena (campionamento a 240 Hz)
    st.tIn = tA + 0.3;
    for (let t = st.t0; t < tA + 0.4; t += 1 / 240) if (tail(st, t) >= sE - 0.01) { st.tIn = t; break; }
    st.tDone = st.tIn + 0.3;
    for (let t = st.tIn; t < st.tIn + 0.6; t += 1 / 240) if (laneW(st, t) >= wLane + 0.35) { st.tDone = t; break; }
    return st;
  }

  const head = (s, t) => s.sEnd * CURVE.stream(clamp((t - s.t0) / (s.tA - s.t0)));
  function tailLen(s, t) {
    const v = (head(s, t + 1 / 120) - head(s, t - 1 / 120)) * 60;
    const l = clamp(s.lenMin + v * s.blur, s.lenMin, 280);
    return t <= s.tA ? l : l * (1 - CURVE.tailCatch(clamp((t - s.tA) / 0.2)));
  }
  const tail = (s, t) => Math.min(s.sE, Math.max(0, head(s, t) - tailLen(s, t)));
  const laneW = (s, t) => (t < s.tIn ? s.wf : lerp(s.wf, s.wFull, K(t - s.tIn, 4.6, 1)));

  /** Corsie di una forma su un telaio; `pick(i)` sceglie quali corsie questo telaio serve. */
  function lanesFor(shape, F, G, laneW0, base, step, r, pick, out) {
    const n = Math.max(2, Math.round((F.L - F.E) / laneW0)), w = (F.L - F.E) / n;
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.abs(a - (n - 1) / 2) - Math.abs(b - (n - 1) / 2));
    order.forEach((Y, rank) => {
      if (!pick(Y, n)) return;
      const d = F.E + (Y + 0.5) * w;
      const tA = base + rank * step + r.range(0, TEMPI.casoCorsia);
      out.push(makeStrip(shape, F, G, d, Y, w, tA, r, {}));
    });
    return n;
  }

  /** Tutti i nastri della firma + i nastri di ricarica dell'attesa. */
  function buildStrips(shapes, L, quality, seed) {
    const r = rng(seed ^ 659918), Q = QUALITA[quality], strips = [], recharge = [];
    // corsia minima ~4,4 px sullo schermo: a scala piccola i nastri non diventano capelli
    const lane = Math.max(Q.corsia, (4.4 / L.s) * (Q.corsia / 7.2)), minW = 2.2 / L.s;
    makeStrip.minW = minW;
    const portrait = L.H > L.W * 1.15;
    // Raggi: i nastri arrivano da oltre la punta e scorrono verso il disco.
    ORDINE_RAGGI.forEach((id, k) => {
      const sh = shapes[id], a = sh.deg;
      const th = Math.atan2(Math.sin(a * RAD), -Math.cos(a * RAD)); // verso il centro (canvas)
      const F = frameOf(sh, th);
      let from = a + Math.sign(a - 90) * 9 + r.range(-12, 12);
      if (portrait) from = lerp(from, 90, 0.25); // su schermi verticali i flussi partono dai lati lunghi
      const G = guideOf(F, -from * RAD, L.world, r);
      lanesFor(sh, F, G, lane, TEMPI.raggiBase + k * TEMPI.raggiPasso, TEMPI.corsiaPasso, r, () => true, strips);
    });
    // Terra: corsie orizzontali alternate da sinistra (pari) e da destra (dispari).
    const gr = shapes.ground;
    const FL = frameOf(gr, 0), FR = frameOf(gr, Math.PI);
    let fromL = 200 + r.range(-12, 12), fromR = 340 + r.range(-12, 12);
    if (portrait) { fromL = 245; fromR = 295; }
    const GL = guideOf(FL, -fromL * RAD, L.world, r), GR = guideOf(FR, -fromR * RAD, L.world, r);
    lanesFor(gr, FL, GL, lane, TEMPI.terraBase, TEMPI.terraPasso, r, (y) => y % 2 === 0, strips);
    lanesFor(gr, FR, GR, lane, TEMPI.terraBase, TEMPI.terraPasso, r, (y, n) => (n - 1 - y) % 2 === 1, strips);
    // Ricarica (fase B): 2 nastri sottili per raggio, da sinistra a destra, ogni 0,12 s, tempi relativi al ciclo.
    RAGGI.forEach((id, k) => {
      const sh = shapes[id], a = sh.deg;
      const F = frameOf(sh, Math.atan2(Math.sin(a * RAD), -Math.cos(a * RAD)));
      const G = guideOf(F, -(a + Math.sign(a - 90) * 9 + r.range(-8, 8)) * RAD, L.world, r);
      const n = Math.max(2, Math.round((F.L - F.E) / lane)), w = (F.L - F.E) / n;
      [Math.floor((n - 1) / 2), Math.ceil((n - 1) / 2) + (n % 2 ? 1 : 0)].forEach((Y, j) => {
        const st = makeStrip(sh, F, G, F.E + (Y + 0.5) * w, Y, w, 0.45 + k * 0.12 + j * 0.05, r, { thin: 0.3, voloMin: 0.45, voloMax: 0.45 });
        st.slot = j;
        recharge.push(st);
      });
    });
    // fine forma, impatti
    const done = {}, first = {};
    for (const s of strips) { done[s.shape] = Math.max(done[s.shape] ?? 0, s.tDone); if (!(first[s.shape] < s.t0)) first[s.shape] = s.t0; }
    const impact = {};
    for (const id in shapes) {
      const sh = shapes[id], g = Math.pow(9000 / sh.area, 1);
      impact[id] = {
        amp: 0.024 * Math.pow(g, 0.33), f: 3.4 * Math.pow(g, 0.2), z: r.range(0.36, 0.48), rot: r.sign() * r.range(0.5, 0.9) * RAD,
        axis: id === 'ground' ? 0 : Math.atan2(Math.sin(sh.deg * RAD), -Math.cos(sh.deg * RAD)),
      };
    }
    return { strips, recharge, done, first, impact, quality };
  }

  // ================================================================ SFONDO: SOLI D'ANGOLO
  function ring(ctx, x, y, r0, r1, col) {
    ctx.beginPath(); ctx.arc(x, y, r1, 0, TAU);
    if (r0 > 0) ctx.arc(x, y, r0, TAU, 0, true);
    ctx.fillStyle = col; ctx.fill('evenodd');
  }
  function sector(ctx, x, y, r0, r1, a0, a1, col) {
    ctx.beginPath(); ctx.arc(x, y, r1, a0, a1); ctx.arc(x, y, r0, a1, a0, true); ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
  }

  /** Un sole d'angolo: nucleo, ventaglio di 5 raggi, due fasce. `rot` ruota il ventaglio. */
  function drawCornerSun(ctx, c, t, rot) {
    const s = c.u * c.k, R = (v) => v * s, { x, y } = c;
    ring(ctx, x, y, R(0.422), R(0.5), COLORI.angolo.fascia2);
    ring(ctx, x, y, R(0.344), R(0.41), COLORI.angolo.fascia1);
    const n = 5, span = c.a1 - c.a0, st = span / n, gap = st * 0.24;
    // il ventaglio ruota sul posto: disegno i raggi su tutto il giro, si vedono solo quelli nello schermo
    for (let i = -n; i < 2 * n; i++) {
      const a = c.a0 + i * st + rot, k = clamp(K(t - c.delay - 0.12 - ((i % n) + n) % n * 0.03, 3.2, 0.78), 0, 1.2);
      if (k <= 0) continue;
      sector(ctx, x, y, R(0.186), lerp(R(0.186), R(0.33), k), a + gap / 2, a + st - gap / 2, COLORI.angolo.raggi[((i % 2) + 2) % 2]);
    }
    ring(ctx, x, y, 0, R(0.17), COLORI.angolo.nucleo);
  }
  function drawHill(ctx, c) {
    const s = c.u * c.k;
    ring(ctx, c.x, c.y, s * 0.536, s * 0.586, COLORI.collina.anello);
    ring(ctx, c.x, c.y, 0, s * 0.52, COLORI.collina.disco);
  }

  /** Grana carta statica (opzionale): tessera di rumore 160×160 al 3,5 %. */
  function makeGrain(ctx) {
    const c = document.createElement('canvas'); c.width = c.height = 160;
    const g = c.getContext('2d'), im = g.createImageData(160, 160), r = rng(7);
    for (let i = 0; i < im.data.length; i += 4) { const v = 200 + r.next() * 55; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0);
    return ctx.createPattern(c, 'repeat');
  }

  // ================================================================ LOADER
  function Loader(opts) {
    opts = opts || {};
    const self = this;
    const reduced = opts.reduced ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
    let quality = opts.quality && opts.quality !== 'auto' ? opts.quality : detectQuality();
    const seed = opts.seed ?? 20506;
    const grain = opts.grain ?? true;

    // --- nodo host + shadow root (React idrata solo il div vuoto, non vede il canvas)
    let host = document.getElementById('sf-loader');
    if (!host) { host = document.createElement('div'); host.id = 'sf-loader'; document.body.prepend(host); }
    host.setAttribute('aria-hidden', 'true');
    Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: String(opts.zIndex ?? 100), background: COLORI.carta, contain: 'strict', overflow: 'hidden' });
    const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>:host{display:block}canvas{position:absolute;inset:0;width:100%;height:100%;display:block}</style><canvas></canvas>';
    const canvas = root.querySelector('canvas'), ctx = canvas.getContext('2d');

    const shapes = buildShapes();
    let L, B, dpr, pattern = null;

    function setup() {
      const W = Math.max(1, host.clientWidth || innerWidth), H = Math.max(1, host.clientHeight || innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, QUALITA[quality].dpr);
      if (W * H * dpr * dpr > 8e6) dpr = Math.min(dpr, 1.5);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      L = layout(W, H);
      B = buildStrips(shapes, L, quality, seed);
      // un sole d'angolo "risponde" quando un flusso parte dalla sua zona
      for (const id in B.first) {
        const s = B.strips.find((x) => x.shape === id && x.t0 === B.first[id]);
        if (!s) continue;
        const ox = L.cx + (s.origin[0] - CX) * L.s, oy = L.cy + (s.origin[1] - CY) * L.s;
        for (const c of L.corners) if (c.kind === 'sun' && Math.hypot(ox - c.x, oy - c.y) < c.R * 1.8) c.pulses.push(s.t0);
      }
      if (grain && !pattern) pattern = makeGrain(ctx);
    }
    setup();

    // --- stato
    const st = { mode: reduced ? 'reduced' : 'forming', tm: 0, wt: 0, et: 0, clock: 0, ready: false, paused: !!opts.debug, rot: 0, done: false };
    this.state = () => st.mode;

    // ------------------------------------------------------------ disegno
    function markTransform(scale) {
      const k = L.s * dpr * scale;
      ctx.setTransform(k, 0, 0, k, (L.cx - CX * L.s * scale) * dpr, (L.cy - CY * L.s * scale) * dpr);
    }

    function drawShapeFilled(sh, color, t, extra) {
      const im = B.impact[sh.id], d = B.done[sh.id];
      let o = t >= d ? P(t - d, im.f, im.z) : 0;
      if (Math.abs(o) < 1e-4 && t - d > 0.6) o = 0;
      const e = extra || 0;
      ctx.fillStyle = color;
      if (!o && !e) { ctx.fill(sh.path, 'evenodd'); return; }
      ctx.save();
      const [px, py] = sh.cen;
      ctx.translate(px, py); ctx.rotate(im.axis + im.rot * o * 0.6);
      ctx.scale(1 - im.amp * o - e, 1 + im.amp * 0.55 * o + e * 0.55);
      ctx.rotate(-im.axis); ctx.translate(-px, -py);
      ctx.fill(sh.path, 'evenodd');
      ctx.restore();
    }

    /** Forma in formazione: unione delle corsie arrivate, ritagliata dal tracciato. */
    function drawShapeForming(sh, color, t) {
      const path = new Path2D();
      let any = false;
      for (const s of B.strips) {
        if (s.shape !== sh.id) continue;
        const h = head(s, t);
        if (h <= s.sE) continue;
        const tl = tail(s, t), w = laneW(s, t), tip = Math.max(4, s.wf * 2.4), lo = Math.max(tl, s.sE);
        ribbon(s.poly, lo, h, (p) => {
          let f = w / 2;
          if (t < s.tIn) f *= Math.pow(clamp((p - tl) / Math.max(1, (h - tl) * 0.45)), 0.7);
          if (t < s.tA + 0.05) f *= Math.sqrt(clamp((h - p) / tip + 0.08));
          return f;
        }, path);
        any = true;
      }
      if (!any) return;
      ctx.save(); ctx.clip(sh.path, 'evenodd'); ctx.fillStyle = color; ctx.fill(path, 'nonzero'); ctx.restore();
    }

    const RGB = { [COLORI.verde]: '71,138,43', [COLORI.giallo]: '243,195,0' };
    /** Nastro in volo (parte fuori dalla forma), con la coda che svanisce. */
    function drawFlight(s, t, color) {
      if (t <= s.t0) return;
      const h = head(s, t), tl = tail(s, t), e = Math.min(h, s.sE);
      if (e - tl < 0.3) return;
      const len = h - tl, tip = Math.max(4, s.wf * 2.4);
      const path = new Path2D();
      ribbon(s.poly, tl, e, (p) => (s.wf / 2) * Math.pow(clamp((p - tl) / Math.max(1, len * 0.45)), 0.7) * Math.sqrt(clamp((h - p) / tip + 0.08)), path);
      const a = at(s.poly, tl, [0, 0, 0, 0]), b = at(s.poly, tl + Math.min(len, 60), [0, 0, 0, 0]);
      const gr = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
      gr.addColorStop(0, 'rgba(' + RGB[color] + ',0)'); gr.addColorStop(1, 'rgba(' + RGB[color] + ',1)');
      ctx.fillStyle = gr; ctx.fill(path);
    }

    function colorOf(id) { return id === 'ground' ? COLORI.giallo : COLORI.verde; }

    /** Sfondo: carta, soli d'angolo (entrata, attesa, uscita), grana. */
    function drawBackground(t, et, rotExtra) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = COLORI.carta; ctx.fillRect(0, 0, L.W, L.H);
      for (const c of L.corners) {
        const enter = CURVE.out(clamp((t - c.delay) / 0.45));
        const leave = CURVE.inOut(clamp((et - 0.15) / 0.35));
        const off = c.R * (0.18 * (1 - enter) + 0.4 * leave);
        let sc = 1;
        for (const p of c.pulses) sc += 0.03 * P(t - p, 4.2, 0.45);
        ctx.save();
        ctx.translate(c.ox * off, c.oy * off);
        if (sc !== 1) { ctx.translate(c.x, c.y); ctx.scale(sc, sc); ctx.translate(-c.x, -c.y); }
        if (c.kind === 'sun') drawCornerSun(ctx, c, t, (st.rot + rotExtra + 12 * leave) * RAD * (c.a0 < 0 ? 1 : -1));
        else drawHill(ctx, c);
        ctx.restore();
      }
      if (pattern) {
        ctx.save(); ctx.globalAlpha = 0.035; ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = pattern; ctx.fillRect(0, 0, L.W, L.H); ctx.restore();
      }
    }

    /** Fotogramma completo. tm: tempo firma (0–1,2+), wt: tempo d'attesa, et: tempo d'uscita. */
    function render(tm, wt, et) {
      const t = tm; // tempo della firma
      // fase B: fase nel ciclo
      let phase = -1, slow = false, cycleRot = 0;
      if (wt > 0) {
        slow = wt > TEMPI.lentoDopo;
        const cyc = slow ? TEMPI.cicloLento : TEMPI.ciclo;
        const base = slow ? TEMPI.lentoDopo : 0, w = wt - base;
        phase = w % cyc;
        const nCycles = slow ? Math.floor(TEMPI.lentoDopo / TEMPI.ciclo) + Math.floor(w / cyc) : Math.floor(w / cyc);
        cycleRot = 3 * (nCycles + CURVE.glide(phase / cyc));
      }
      drawBackground(t + wt + et, et, cycleRot);

      // scala globale del marchio: rimbalzo finale, battito d'attesa, anticipo d'uscita
      let scale = 1 + 0.02 * P(t - TEMPI.rimbalzo, 4.2, 0.45);
      if (phase >= 0) scale += 0.025 * P(phase - 1.6, 3.0, 0.5);
      if (et > 0) scale *= lerp(1, 0.96, CURVE.inOut(clamp(et / 0.12)));
      markTransform(scale);

      const shrink = 1 - CURVE.inOut(clamp((et - 0.2) / 0.14)); // disco e terra si chiudono verso il centro
      const beamsOn = et >= 0.08;

      // terra
      if (shrink > 0) {
        ctx.save();
        if (shrink < 1) { ctx.translate(CX, CY); ctx.scale(shrink, shrink); ctx.translate(-CX, -CY); }
        if (t >= B.done.ground) drawShapeFilled(shapes.ground, COLORI.giallo, t);
        else drawShapeForming(shapes.ground, COLORI.giallo, t);
        ctx.restore();
      }
      // raggi
      if (!beamsOn) {
        for (const id of RAGGI) {
          let extra = 0;
          if (phase >= 0) for (const s of B.recharge) if (s.shape === id && (!slow || s.slot === 0)) extra += 0.012 * P(phase - s.tA - 0.2, 3.65, 0.45);
          if (t >= B.done[id]) drawShapeFilled(shapes[id], COLORI.verde, t, extra);
          else drawShapeForming(shapes[id], COLORI.verde, t);
        }
      } else drawBeams(et);
      // disco: nasce con una molla, non è tessuto
      const k = K(t - TEMPI.disco, 3.2, 0.78) * shrink;
      if (k > 0) { ctx.fillStyle = COLORI.arancio; ctx.beginPath(); ctx.arc(CX, CY, DISCO_R * k, 0, TAU); ctx.fill(); }
      // nastri in volo, sopra tutto
      if (et <= 0) {
        for (const s of B.strips) if (t < s.tA + 0.25) drawFlight(s, t, colorOf(s.shape));
        if (phase >= 0) for (const s of B.recharge) if (!slow || s.slot === 0) drawFlight(s, phase, COLORI.verde);
      }
      // uscita: spazzata circolare che rivela il sito
      if (et > 0.25) {
        const rr = CURVE.reveal(clamp((et - 0.25) / 0.35)) * L.far * 1.02;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath(); ctx.arc(L.cx, L.cy, Math.max(0.1, rr), 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    /** Uscita: i 9 raggi si dividono in N fasci a 360° che si allungano oltre lo schermo. */
    function drawBeams(et) {
      const N = QUALITA[quality].fasci, O = CURVE.inOut(clamp((et - 0.08) / 0.32)), G = CURVE.out(clamp((et - 0.08) / 0.32));
      const diagU = Math.hypot(L.W, L.H) / L.s;
      const path = new Path2D();
      for (let m = 0; m < N; m++) {
        const j = Math.min(8, Math.floor((m / N) * 9));
        const lo = Math.ceil((j * N) / 9), hi = Math.ceil(((j + 1) * N) / 9), nj = Math.max(1, hi - lo), sub = m - lo;
        const a = -shapes[RAGGI[j]].deg * RAD, half = 6 * RAD, sw = (2 * half) / nj;
        const a0 = a - half + sw * (sub + 0.5);
        const a1 = -Math.PI / 2 + ((m + 0.5) / N) * TAU - Math.PI;
        const ang = angLerp(a0, a1, O);
        const hw = lerp(sw / 2 * 0.86, (Math.PI / N) * 0.16, O);
        const ri = lerp(119, DISCO_R * 1.9, O), ro = lerp(281, diagU * 1.3, G);
        const hwo = hw * lerp(1, 1.6, O); // il fascio si apre leggermente verso l'esterno
        path.moveTo(CX + ri * Math.cos(ang - hw), CY + ri * Math.sin(ang - hw));
        path.lineTo(CX + ro * Math.cos(ang - hwo), CY + ro * Math.sin(ang - hwo));
        path.lineTo(CX + ro * Math.cos(ang + hwo), CY + ro * Math.sin(ang + hwo));
        path.lineTo(CX + ri * Math.cos(ang + hw), CY + ri * Math.sin(ang + hw));
        path.closePath();
      }
      ctx.fillStyle = COLORI.verde; ctx.fill(path);
    }

    // ------------------------------------------------------------ ciclo
    let raf = 0, last = 0, perf = [], fadeAt = -1;
    const rechargeBusy = (wt) => {
      if (wt <= 0) return false;
      const slow = wt > TEMPI.lentoDopo, cyc = slow ? TEMPI.cicloLento : TEMPI.ciclo;
      const phase = (wt - (slow ? TEMPI.lentoDopo : 0)) % cyc;
      return B.recharge.some((s) => (!slow || s.slot === 0) && phase > s.t0 - 0.02 && phase < s.tA + 0.25);
    };

    function tick(now) {
      const dt = Math.min(0.1, (now - last) / 1000 || 0);
      last = now;
      if (!st.paused) step(dt);
      if (st.done) return;
      raf = requestAnimationFrame(tick);
    }

    function step(dt) {
      st.clock += dt;
      if (st.mode === 'reduced') {
        render(3, 0, 0);
        if (st.ready && st.clock >= TEMPI.ridottoMin && fadeAt < 0) {
          fadeAt = st.clock;
          host.style.transition = 'opacity ' + TEMPI.ridottoFade + 's linear';
          host.style.opacity = '0';
          host.style.pointerEvents = 'none';
        }
        if (fadeAt >= 0 && st.clock - fadeAt >= TEMPI.ridottoFade) finish();
        return;
      }
      if (st.clock >= TEMPI.massimo && st.mode !== 'exiting') { st.ready = true; if (st.mode === 'forming') st.tm = TEMPI.firma; st.mode = 'exiting'; }
      if (st.mode === 'forming') {
        st.tm += dt;
        // qualità adattiva: se la media di 20 fotogrammi supera 22 ms, si scende di un livello
        if (st.clock > 0.25) perf.push(dt);
        if (perf.length >= 20) {
          const avg = perf.reduce((a, b) => a + b, 0) / perf.length; perf = [];
          if (avg > 0.022 && quality !== 'low') { quality = quality === 'high' ? 'medium' : 'low'; setup(); }
        }
        if (st.tm >= TEMPI.firma) { st.tm = TEMPI.firma; st.mode = st.ready ? 'exiting' : 'waiting'; }
      } else if (st.mode === 'waiting') {
        st.wt += dt;
        if (st.ready && !rechargeBusy(st.wt)) { st.rot += cycleRotAt(st.wt); st.wt = 0; st.mode = 'exiting'; }
      } else if (st.mode === 'exiting') {
        if (st.et === 0) host.style.pointerEvents = 'none';
        st.et += dt;
        if (st.et >= TEMPI.uscita) { finish(); return; }
      }
      render(st.tm, st.wt, st.et);
    }
    function cycleRotAt(wt) {
      const slow = wt > TEMPI.lentoDopo, cyc = slow ? TEMPI.cicloLento : TEMPI.ciclo, w = wt - (slow ? TEMPI.lentoDopo : 0);
      const n = slow ? Math.floor(TEMPI.lentoDopo / TEMPI.ciclo) + Math.floor(w / cyc) : Math.floor(w / cyc);
      return 3 * (n + CURVE.glide((w % cyc) / cyc));
    }

    function finish() {
      if (st.done) return;
      st.done = true; st.mode = 'done';
      cancelAnimationFrame(raf);
      removeEventListener('resize', onResize);
      host.style.display = 'none'; root.innerHTML = '';
      document.documentElement.classList.add('sf-loader-done');
      dispatchEvent(new Event('sf-loader-done'));
      if (opts.onDone) opts.onDone();
    }

    let rt = 0;
    function onResize() { clearTimeout(rt); rt = setTimeout(() => { setup(); if (st.paused) self.seek(self._t || 0); }, 100); }
    addEventListener('resize', onResize);

    // ------------------------------------------------------------ API
    this.ready = () => { st.ready = true; };
    this.play = () => { st.paused = false; last = performance.now(); };
    /** Debug: fotogramma al tempo T della sequenza firma (0–1,2) + uscita (1,2–1,8). */
    this.seek = (T) => {
      st.paused = true; self._t = T;
      host.style.opacity = '1';
      if (T <= TEMPI.firma) render(T, 0, 0);
      else render(TEMPI.firma, 0, Math.min(T - TEMPI.firma, TEMPI.uscita - 1e-3));
    };
    this.quality = () => quality;
    this._info = () => ({ done: B.done, strips: B.strips.length, first: B.first, tA: B.strips.map((s) => [s.shape, +s.t0.toFixed(3), +s.tA.toFixed(3)]) });
    this.destroy = () => { st.done = true; cancelAnimationFrame(raf); removeEventListener('resize', onResize); host.style.display = 'none'; root.innerHTML = ''; };

    // primo fotogramma subito, poi rAF
    render(0, 0, 0);
    host.style.background = 'transparent';
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  // ================================================================ AVVIO
  window.SFLoader = {
    start(o) {
      if (window.sfLoader && window.sfLoader.destroy) window.sfLoader.destroy();
      return (window.sfLoader = new Loader(o));
    },
  };

  if (!window.SF_LOADER_MANUAL && !document.documentElement.classList.contains('sf-noloader')) {
    const go = () => {
      const l = window.SFLoader.start({});
      if (document.readyState === 'complete') l.ready();
      else addEventListener('load', () => l.ready(), { once: true });
    };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go, { once: true });
  }
})();
