/* ═══════════════════════════════════════════════════════
   PIPELINE — Onboarding System  v3.0
   Phase 1: Animated welcome
   Phase 2: Build video pipeline on canvas
   Phase 3: Type prompt + EJECUTAR
   Phase 4: Pipeline story → 10min wait → video result
═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const STORAGE_KEY = 'pipeline_onboarded_v3';
  let _active = false;
  let _step = 0;
  let _cv = {}; // canvas nodes built for the demo

  /* ── utils ──────────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function typeInto(el, text, speed = 26) {
    for (const ch of text) {
      el.textContent += ch;
      await sleep(speed + Math.random() * 8);
    }
  }

  function scrollBot() {
    const lb = $('logbody');
    if (lb) lb.scrollTop = lb.scrollHeight;
  }

  /* ── localStorage ───────────────────────────────────── */
  const isNew   = () => !localStorage.getItem(STORAGE_KEY);
  const markDone = () => localStorage.setItem(STORAGE_KEY, '1');

  /* ── Smooth canvas pan/zoom ─────────────────────────── */
  function panTo(cx, cy, targetSc, ms = 900) {
    return new Promise(resolve => {
      if (typeof sc === 'undefined' || typeof px === 'undefined') { resolve(); return; }
      const startPx = px, startPy = py, startSc = sc;
      const endPx = -cx * targetSc + window.innerWidth / 2;
      const endPy = -cy * targetSc + window.innerHeight / 2;
      const t0 = performance.now();
      function step(now) {
        const p = Math.min(1, (now - t0) / ms);
        const e = 1 - Math.pow(1 - p, 3);
        px = startPx + (endPx - startPx) * e;
        py = startPy + (endPy - startPy) * e;
        sc = startSc + (targetSc - startSc) * e;
        if (typeof applyT === 'function') applyT();
        if (p < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  /* ── Highlight a canvas node briefly ───────────────── */
  function flashNode(n, color, ms = 1400) {
    if (!n) return;
    const el = document.getElementById(n.id);
    if (!el) return;
    el.style.transition = 'box-shadow .3s';
    el.style.boxShadow = `0 0 0 3px ${color}99, 0 0 28px ${color}55`;
    setTimeout(() => { if (el) { el.style.transition = 'box-shadow .6s'; el.style.boxShadow = ''; } }, ms);
  }

  /* ══════════════════════════════════════════════════════
     BUILD THE EXAMPLE VIDEO PIPELINE ON CANVAS
  ══════════════════════════════════════════════════════ */
  function buildObVideoCanvas() {
    if (typeof nodes === 'undefined' || typeof addNode !== 'function') return {};

    // Clear canvas completely
    nodes.forEach(n => { const el = document.getElementById(n.id); if (el) el.remove(); });
    outputCards.forEach(c => { const el = document.getElementById(c.id); if (el) el.remove(); });
    nodes = []; conns = []; outputCards = [];
    const svg = document.getElementById('svgl');
    if (svg) svg.innerHTML = '';

    // Canvas center
    const vc = (typeof getCanvasViewportCenter === 'function')
      ? getCanvasViewportCenter() : { x: 3000, y: 2500 };
    const cx = vc.x, cy = vc.y;

    // Layout positions (horizontal left → right)
    const pilotX   = cx - 620;
    const writerX  = cx - 160;
    const imgX     = cx + 270;
    const videoX   = cx + 700;
    const asmX     = cx + 1130;
    const opX      = cx - 580;
    const seedX    = cx - 930;
    const mainY    = cy - 200;
    const opY      = cy + 290;
    const seedY    = cy - 50;

    const refs = {};

    // Create nodes (pilot first so seedFirstPilotSetup doesn't auto-run extra things)
    // We pass false-ish positions to avoid the auto-setup, then reposition
    refs.pilot    = addNode('pilot',    pilotX,  mainY);
    refs.writer   = addNode('prompt',   writerX, mainY);
    refs.imggen   = addNode('image',    imgX,    mainY);
    refs.video    = addNode('video',    videoX,  mainY);
    refs.assembly = addNode('assembly', asmX,    mainY);
    refs.operator = addNode('human',    opX,     opY);

    // Remove any auto-generated input card from seedFirstPilotSetup
    // (it creates one when first pilot is added)
    outputCards.forEach(c => {
      if ((c._kind === 'input' || c._kind === 'seed') && c.isSeedPrompt) {
        const el = document.getElementById(c.id);
        if (el) el.remove();
      }
    });
    outputCards = outputCards.filter(c => !(c.isSeedPrompt && (c._kind === 'input' || c._kind === 'seed')));

    // Remove auto-added human node from seedFirstPilotSetup
    const extraHumans = nodes.filter(n => n.type === 'human' && n.id !== refs.operator.id);
    extraHumans.forEach(n => {
      const el = document.getElementById(n.id);
      if (el) el.remove();
    });
    nodes = nodes.filter(n => !(n.type === 'human' && n.id !== refs.operator.id));

    // Re-position pilot (seedFirstPilotSetup may have moved it)
    refs.pilot.x = pilotX; refs.pilot.y = mainY;
    const pilotEl = document.getElementById(refs.pilot.id);
    if (pilotEl) { pilotEl.style.left = pilotX + 'px'; pilotEl.style.top = mainY + 'px'; }

    // Re-position operator
    refs.operator.x = opX; refs.operator.y = opY;
    const opEl = document.getElementById(refs.operator.id);
    if (opEl) { opEl.style.left = opX + 'px'; opEl.style.top = opY + 'px'; }

    // Clear auto-connections from seedFirstPilotSetup
    conns = conns.filter(c =>
      nodes.some(n => n.id === c.from || n.id === c.to) &&
      outputCards.some(card => card.id === c.from) === false
    );
    conns = [];

    // Create seed / input card manually
    let seedCard = null;
    if (typeof mkInputCard === 'function') {
      seedCard = mkInputCard('text', seedX, seedY);
      if (seedCard) {
        seedCard.label = 'Prompt semilla';
        seedCard.isSeedPrompt = true;
        if (typeof _renderInputCardDOM === 'function') _renderInputCardDOM(seedCard);
        const el = document.getElementById(seedCard.id);
        const ta = el && el.querySelector('.idc-textarea');
        if (ta) { ta.value = ''; ta.placeholder = 'Escribe tu idea aquí...'; }
        // Add run button if missing
        const runBtn = el && el.querySelector('.sic-run-btn');
        if (!runBtn && el) {
          const body = el.querySelector('.oc-body');
          if (body) {
            const btn = document.createElement('button');
            btn.className = 'sic-run-btn';
            btn.textContent = '▶ EJECUTAR';
            btn.onclick = e => { e.stopPropagation(); if (typeof runAll === 'function') runAll(); };
            body.appendChild(btn);
          }
        }
      }
      refs.seedCard = seedCard;
    }

    // Connections
    function mkConn(fromId, fp, toId, tp, active, cond, condT) {
      if (!fromId || !toId) return;
      conns.push({
        id: 'c' + Math.random().toString(36).slice(2, 10),
        from: fromId, fp, to: toId, tp,
        active: active || false,
        cond: cond || false,
        condT: condT || 'no',
        fromCard: fp === 'out' && !nodes.some(n => n.id === fromId),
      });
    }

    if (seedCard) mkConn(seedCard.id, 'out', refs.pilot.id, 'in', true);
    mkConn(refs.pilot.id,    'out-y', refs.operator.id, 'in',  false, true, 'yes');
    mkConn(refs.pilot.id,    'out',   refs.writer.id,   'in',  false);
    mkConn(refs.writer.id,   'out',   refs.imggen.id,   'in',  false);
    mkConn(refs.imggen.id,   'out',   refs.video.id,    'in',  false);
    mkConn(refs.video.id,    'out',   refs.assembly.id, 'in',  false);

    // Output cards — show representative outputs at each stage
    if (typeof dropOutputCard === 'function') {
      // Pilot → json context card (3 scenes × 5s)
      dropOutputCard(refs.pilot.id,    pilotX + 350, mainY + 15);
      // Writer → text output (scene description)
      dropOutputCard(refs.writer.id,   writerX + 260, mainY + 15);
      // ImgGen → image output (×3 shown stacked)
      dropOutputCard(refs.imggen.id,   imgX + 260, mainY + 10);
    }

    if (typeof drawConns === 'function') drawConns();
    if (typeof updateMM === 'function') updateMM();

    return refs;
  }

  /* ══════════════════════════════════════════════════════
     OVERLAY
  ══════════════════════════════════════════════════════ */
  function showOverlay(opacity = 0.82) {
    let ov = $('ob-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'ob-overlay';
      document.body.appendChild(ov);
    }
    ov.style.background = `rgba(10,6,4,${opacity})`;
    requestAnimationFrame(() => ov.classList.add('on'));
  }
  function setOverlayOpacity(opacity) {
    const ov = $('ob-overlay');
    if (ov) ov.style.background = `rgba(10,6,4,${opacity})`;
  }
  function hideOverlay() {
    const ov = $('ob-overlay');
    if (!ov) return;
    ov.classList.remove('on');
    setTimeout(() => ov && ov.remove(), 420);
  }

  /* ══════════════════════════════════════════════════════
     SPOTLIGHT
  ══════════════════════════════════════════════════════ */
  function showSpotlight(x, y, w, h) {
    let sp = $('ob-spotlight');
    if (!sp) {
      sp = document.createElement('div');
      sp.id = 'ob-spotlight';
      document.body.appendChild(sp);
    }
    sp.style.left = x + 'px'; sp.style.top = y + 'px';
    sp.style.width = w + 'px'; sp.style.height = h + 'px';
    requestAnimationFrame(() => sp.classList.add('on'));
  }
  function hideSpotlight() {
    const sp = $('ob-spotlight');
    if (!sp) return;
    sp.classList.remove('on');
    setTimeout(() => sp && sp.remove(), 500);
  }

  /* ══════════════════════════════════════════════════════
     LOGWIN POSITIONING
  ══════════════════════════════════════════════════════ */
  const mob = () => window.innerWidth < 640;

  function applyPos(cfg) {
    const w = $('logwin');
    if (!w) return;
    w.style.transition = 'all .62s cubic-bezier(.4,0,.2,1)';
    Object.assign(w.style, cfg);
  }

  function posCenter(h = 480) {
    applyPos({
      position: 'fixed', left: '50%', top: '50%', bottom: 'auto', right: 'auto',
      transform: 'translate(-50%,-50%)',
      width: mob() ? '92vw' : 'min(600px,92vw)', height: h + 'px', zIndex: '10000',
    });
  }

  function posBottomLeft(h = 220) {
    applyPos({
      position: 'fixed', left: mob() ? '2%' : '16px', bottom: '16px',
      top: 'auto', right: 'auto', transform: 'none',
      width: mob() ? '96vw' : '440px', height: h + 'px', zIndex: '10002',
    });
  }

  function posTopRight(h = 220) {
    applyPos({
      position: 'fixed', right: '16px', top: '72px',
      left: 'auto', bottom: 'auto', transform: 'none',
      width: mob() ? '92vw' : '420px', height: h + 'px', zIndex: '10002',
    });
  }

  function restoreLogwin() {
    const w = $('logwin');
    if (!w) return;
    w.style.transition = 'all .5s cubic-bezier(.4,0,.2,1)';
    setTimeout(() => {
      ['position', 'right', 'bottom', 'left', 'top', 'transform', 'width', 'zIndex']
        .forEach(p => w.style[p] = '');
      w.style.height = '420px';
      setTimeout(() => { w.style.transition = ''; }, 540);
    }, 80);
  }

  /* ── UI label helpers ────────────────────────────────── */
  function setBadgeLive() {
    const b = $('log-badge');
    if (b) { b.textContent = 'LIVE'; b.className = 'ltb-badge ob-live-badge'; }
  }
  function restoreBadge() {
    const b = $('log-badge');
    if (b) { b.textContent = 'IDLE'; b.className = 'ltb-badge'; }
  }
  function setLiveTab(label = '▶ LIVE') {
    const lf = $('logfilters');
    if (lf) lf.innerHTML =
      `<div class="ob-live-tab">${label}</div>
       <div class="ob-live-dot"></div>
       <span class="ob-live-status" id="ob-live-status">iniciando...</span>`;
  }
  function setLiveStatus(txt) {
    const s = $('ob-live-status'); if (s) s.textContent = txt;
  }
  function restoreFilters() {
    const lf = $('logfilters');
    if (lf) lf.innerHTML = `
      <div class="lf on" onclick="setLogFilter('all',this)">Todo</div>
      <div class="lf-sep"></div>
      <div class="lf" onclick="setLogFilter('think',this)">Pensamiento</div>
      <div class="lf-sep"></div>
      <div class="lf" onclick="setLogFilter('action',this)">Acciones</div>
      <div class="lf-sep"></div>
      <div class="lf" onclick="setLogFilter('system',this)">Sistema</div>
      <div class="lf-clear" onclick="clearLog()">✕ limpiar</div>`;
  }
  function setTitle(txt) { const t = $('logtitle'); if (t) t.textContent = txt; }
  function restoreTitle() { setTitle('Log Global — Pipeline'); }

  /* ── Content helpers ─────────────────────────────────── */
  function mountObody() {
    const lb = $('logbody');
    if (!lb) return null;
    lb.innerHTML = '';
    const ob = document.createElement('div');
    ob.id = 'ob-body';
    lb.appendChild(ob);
    return ob;
  }
  const getOb = () => $('ob-body');

  async function typeLines(ob, lines) {
    for (const m of lines) {
      await sleep(m.d || 80);
      if (m.t === '') { ob.appendChild(document.createElement('br')); continue; }
      const d = document.createElement('div');
      d.className = m.cls || 'ob-desc';
      if (m.color) d.style.color = m.color;
      ob.appendChild(d);
      await typeInto(d, m.t, m.spd != null ? m.spd : 20);
      scrollBot();
    }
  }

  function makeProgress(active, total = 4) {
    const p = document.createElement('div');
    p.className = 'ob-progress';
    p.innerHTML = Array.from({ length: total }, (_, i) =>
      `<div class="ob-prog-dot ${i < active ? 'done' : i === active ? 'active' : ''}"></div>`
    ).join('');
    return p;
  }

  function makeButtons(skipLabel, nextLabel, nextFn) {
    const div = document.createElement('div');
    div.className = 'ob-btns';
    div.innerHTML = `
      <button class="ob-btn-skip" onclick="window._ob.skip()">${skipLabel}</button>
      <button class="ob-btn-next" id="ob-main-btn">${nextLabel}</button>`;
    div.style.opacity = '0';
    setTimeout(() => { div.style.transition = 'opacity .5s'; div.style.opacity = '1'; }, 60);
    setTimeout(() => { const btn = div.querySelector('#ob-main-btn'); if (btn) btn.onclick = nextFn; }, 0);
    return div;
  }

  /* ══════════════════════════════════════════════════════
     PHASE 1 — BIENVENIDA
  ══════════════════════════════════════════════════════ */
  const ASCII = [
    '██████╗ ██╗██████╗ ███████╗██╗     ██╗███╗   ██╗███████╗',
    '██╔══██╗██║██╔══██╗██╔════╝██║     ██║████╗  ██║██╔════╝',
    '██████╔╝██║██████╔╝█████╗  ██║     ██║██╔██╗ ██║█████╗  ',
    '██╔═══╝ ██║██╔═══╝ ██╔══╝  ██║     ██║██║╚██╗██║██╔══╝  ',
    '██║     ██║██║     ███████╗███████╗██║██║ ╚████║███████╗',
    '╚═╝     ╚═╝╚═╝     ╚══════╝╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝',
    '                                          total-time.app',
  ];

  const INIT_SEQ = [
    { t: '> Inicializando núcleo del sistema...', c: '#8a7040', d: 120 },
    { t: '> Cargando modelos de IA disponibles...', c: '#8a7040', d: 440 },
    { t: '> Conectando motor de canvas...', c: '#8a7040', d: 380 },
    { t: '> Registrando agentes y skills...', c: '#8a7040', d: 340 },
    { t: '> ✓ Sistema listo.', c: '#5a9a5a', d: 300 },
  ];

  const WELCOME_LINES = [
    { t: '¡Bienvenido/a a Pipeline!', cls: 'ob-h1', spd: 42, d: 500 },
    { t: '', d: 50 },
    { t: 'Escribe una idea.', cls: 'ob-desc', spd: 22, d: 80 },
    { t: 'Pipeline la convierte en un video —', cls: 'ob-desc', spd: 18, d: 40 },
    { t: 'automáticamente, con agentes de IA.', cls: 'ob-desc', spd: 18, d: 40 },
    { t: '', d: 50 },
    { t: '⬡  Gratis por defecto · Pro para máxima calidad', cls: 'ob-hint', spd: 18, d: 180 },
    { t: '', d: 40 },
    { t: '▶ Te muestro cómo funciona en el ejemplo...', cls: 'ob-sub', spd: 20, d: 250 },
  ];

  async function runWelcome() {
    const ob = getOb();
    ob.innerHTML = '';

    const cline = document.createElement('div');
    cline.className = 'ob-cursor-line';
    ob.appendChild(cline);
    await sleep(250);

    const pre = document.createElement('pre');
    pre.className = 'ob-ascii';
    ob.appendChild(pre);
    for (const line of ASCII) {
      const d = document.createElement('div');
      pre.appendChild(d);
      await typeInto(d, line, 11);
      await sleep(28);
    }
    await sleep(260);

    for (const cfg of INIT_SEQ) {
      await sleep(cfg.d);
      const d = document.createElement('div');
      d.className = 'ob-init-line'; d.style.color = cfg.c;
      ob.appendChild(d);
      await typeInto(d, cfg.t, 20);
      scrollBot();
    }

    await sleep(400);
    const sep = document.createElement('div'); sep.className = 'ob-sep'; ob.appendChild(sep);
    await sleep(180);

    await typeLines(ob, WELCOME_LINES);
    await sleep(300);

    ob.appendChild(makeProgress(0));
    await sleep(200);
    ob.appendChild(makeButtons('✕ Omitir', 'Ver el ejemplo →', () => window._ob.next()));
    scrollBot();
  }

  /* ══════════════════════════════════════════════════════
     PHASE 2 — CONSTRUIR CANVAS
     Construye el pipeline y narra cada agente
  ══════════════════════════════════════════════════════ */
  async function runBuildCanvas() {
    // Show canvas, terminal goes bottom-left compact
    setOverlayOpacity(0.10);
    await sleep(350);
    posBottomLeft(240);
    setLiveStatus('construyendo pipeline...');
    setTitle('Pipeline · Videos de animales bailando');
    await sleep(700);

    const ob = getOb();
    ob.innerHTML = '';

    await typeLines(ob, [
      { t: '── EJEMPLO DE PIPELINE ──', cls: 'ob-section-title', d: 120 },
      { t: '', d: 25 },
      { t: 'Prompt → Piloto → Escritor → Img Gen', color: '#c8a040', d: 80, spd: 14 },
      { t: '       → Video Gen → Digestor (15s)', color: '#4a8abf', d: 80, spd: 14 },
      { t: '', d: 30 },
    ]);

    // Build the canvas
    _cv = buildObVideoCanvas();
    await sleep(300);
    if (typeof fitAll === 'function') fitAll();
    await sleep(900);

    // Narrate each agent with a flash
    const STEPS = [
      { key: 'pilot',    color: '#c85050', msg: '> ◈ Piloto — coordina todos los agentes' },
      { key: 'writer',   color: '#c8a040', msg: '> ✦ Escritor — genera guión de 3 escenas' },
      { key: 'imggen',   color: '#8a5abf', msg: '> ⬡ Img Gen — 3 imágenes en paralelo' },
      { key: 'video',    color: '#4a8abf', msg: '> ▶ Video Gen — 3 clips de 5s en paralelo' },
      { key: 'assembly', color: '#c87840', msg: '> ⊞ Digestor — une clips en video final' },
    ];

    for (const s of STEPS) {
      await sleep(300);
      flashNode(_cv[s.key], s.color, 1200);
      const d = document.createElement('div');
      d.className = 'ob-init-line'; d.style.color = s.color;
      ob.appendChild(d);
      await typeInto(d, s.msg, 13);
      scrollBot();
    }

    await sleep(500);
    const done = document.createElement('div'); done.className = 'ob-hint'; ob.appendChild(done);
    await typeInto(done, '⬡ Pipeline de video listo en el canvas.', 24);
    scrollBot();

    await sleep(400);
    ob.appendChild(makeProgress(1));
    await sleep(180);
    ob.appendChild(makeButtons('✕ Omitir', 'Escribir prompt →', () => window._ob.next()));
    scrollBot();
  }

  /* ══════════════════════════════════════════════════════
     PHASE 3 — ESCRIBIR EL PROMPT + EJECUTAR
  ══════════════════════════════════════════════════════ */
  async function runPromptDemo() {
    posBottomLeft(250);
    setLiveStatus('escribiendo prompt...');
    setTitle('◉ Prompt semilla');
    await sleep(400);

    const ob = getOb();
    ob.innerHTML = '';

    await typeLines(ob, [
      { t: '── ESCRIBE TU IDEA ──', cls: 'ob-section-title', d: 100 },
      { t: '', d: 20 },
      { t: '> Todo empieza con un prompt...', color: '#706860', d: 140, spd: 18 },
      { t: '> El resto lo hace Pipeline automáticamente.', color: '#706860', d: 300, spd: 16 },
    ]);

    // Pan camera to seed card
    if (_cv.seedCard) {
      const sc_ = _cv.seedCard;
      await panTo(sc_.x + 110, sc_.y + 60, 1.15, 900);
      await sleep(350);
    }

    // Spotlight the seed card
    if (_cv.seedCard) {
      const el = document.getElementById(_cv.seedCard.id);
      if (el) {
        const r = el.getBoundingClientRect();
        showSpotlight(r.left - 14, r.top - 14, r.width + 28, r.height + 28);
      }
    }
    await sleep(400);

    const line2 = document.createElement('div');
    line2.className = 'ob-desc'; line2.style.color = '#c8a040';
    ob.appendChild(line2);
    await typeInto(line2, '> Escribe: "Videos de animales bailando"', 17);
    scrollBot();
    await sleep(500);

    // Type into the textarea
    const PROMPT = 'Videos de animales bailando';
    if (_cv.seedCard) {
      const cardEl = document.getElementById(_cv.seedCard.id);
      const ta = cardEl && cardEl.querySelector('.idc-textarea');
      if (ta) {
        ta.focus();
        ta.value = '';
        for (const ch of PROMPT) {
          ta.value += ch;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          await sleep(55 + Math.random() * 18);
        }
        _cv.seedCard.content = PROMPT;
        await sleep(400);
        ta.blur();
      }
    }

    hideSpotlight();
    await sleep(250);

    // Highlight EJECUTAR button
    if (_cv.seedCard) {
      const cardEl = document.getElementById(_cv.seedCard.id);
      const btn = cardEl && cardEl.querySelector('.sic-run-btn');
      if (btn) {
        const r = btn.getBoundingClientRect();
        showSpotlight(r.left - 10, r.top - 10, r.width + 20, r.height + 20);
        btn.style.transition = 'all .3s';
        btn.style.boxShadow = '0 0 0 3px #c8a04099, 0 0 24px #c8a04055';
        btn.style.background = '#c8a040';
        btn.style.color = '#1a1208';

        const line3 = document.createElement('div');
        line3.className = 'ob-desc'; line3.style.color = '#5a9a5a';
        ob.appendChild(line3);
        await typeInto(line3, '> ▶ EJECUTAR — lanza el pipeline completo', 18);
        scrollBot();
        await sleep(700);

        // Click animation
        btn.style.transform = 'scale(.94)';
        await sleep(130);
        btn.style.transform = '';
        await sleep(300);

        btn.style.boxShadow = '';
        btn.style.background = '';
        btn.style.color = '';
      }
    }

    hideSpotlight();
    await sleep(350);

    ob.appendChild(makeProgress(2));
    await sleep(180);
    ob.appendChild(makeButtons('✕ Omitir', 'Ver cómo funciona →', () => window._ob.next()));
    scrollBot();
  }

  /* ══════════════════════════════════════════════════════
     PHASE 4 — HISTORIA DEL PIPELINE
     Narra cada paso, explica 10 min y resultado video
  ══════════════════════════════════════════════════════ */
  async function runPipelineStory() {
    posCenter(460);
    setOverlayOpacity(0.75);
    setLiveStatus('pipeline ejecutando...');
    setTitle('▶ PIPELINE EN PROGRESO');
    await sleep(700);

    const ob = getOb();
    ob.innerHTML = '';

    await typeLines(ob, [
      { t: '── FLUJO DEL PIPELINE ──', cls: 'ob-section-title', d: 80 },
      { t: '', d: 20 },
      { t: '  Prompt: "Videos de animales bailando"', cls: 'ob-sub', d: 60, spd: 13 },
      { t: '', d: 20 },
    ]);

    // [1] Pilot
    if (_cv.pilot && typeof setStatus === 'function') setStatus(_cv.pilot.id, 'running');
    flashNode(_cv.pilot, '#c85050', 2500);
    await typeLines(ob, [
      { t: '[1] Piloto — analizando prompt...', color: '#c85050', d: 160, spd: 16 },
      { t: '    ↳ Estructura: 3 escenas × 5s = 15s', color: '#8a7040', d: 550, spd: 14 },
      { t: '    ↳ Genera contexto del pipeline', color: '#8a7040', d: 350, spd: 14 },
      { t: '    ✓ Contexto listo', color: '#5a9a5a', d: 350, spd: 15 },
    ]);
    if (_cv.pilot && typeof setStatus === 'function') setStatus(_cv.pilot.id, 'done');
    await sleep(180);

    // [2] Writer
    if (_cv.writer && typeof setStatus === 'function') setStatus(_cv.writer.id, 'running');
    flashNode(_cv.writer, '#c8a040', 2500);
    await typeLines(ob, [
      { t: '[2] Escritor — generando guión de 3 escenas...', color: '#c8a040', d: 80, spd: 16 },
      { t: '    Esc. 1: Oso polar bailando en la nieve', color: '#6a5a40', d: 500, spd: 12 },
      { t: '    Esc. 2: Flamencos en sincronía tropical', color: '#6a5a40', d: 360, spd: 12 },
      { t: '    Esc. 3: Pulpo breakdancer en el mar', color: '#6a5a40', d: 360, spd: 12 },
      { t: '    ✓ 3 escenas escritas', color: '#5a9a5a', d: 280, spd: 15 },
    ]);
    if (_cv.writer && typeof setStatus === 'function') setStatus(_cv.writer.id, 'done');
    await sleep(180);

    // [3] Img Gen ×3 parallel
    if (_cv.imggen && typeof setStatus === 'function') setStatus(_cv.imggen.id, 'running');
    flashNode(_cv.imggen, '#8a5abf', 2800);
    await typeLines(ob, [
      { t: '[3] Img Gen — 3 imágenes en paralelo...', color: '#8a5abf', d: 80, spd: 16 },
      { t: '    ⬡ Imagen 1 · generando...', color: '#5a406a', d: 300, spd: 12 },
      { t: '    ⬡ Imagen 2 · generando...', color: '#5a406a', d: 180, spd: 12 },
      { t: '    ⬡ Imagen 3 · generando...', color: '#5a406a', d: 180, spd: 12 },
      { t: '    ✓ 3 imágenes listas  (máx. 3 paralelas)', color: '#5a9a5a', d: 750, spd: 14 },
    ]);
    if (_cv.imggen && typeof setStatus === 'function') setStatus(_cv.imggen.id, 'done');
    await sleep(180);

    // [4] Video Gen ×3 parallel
    if (_cv.video && typeof setStatus === 'function') setStatus(_cv.video.id, 'running');
    flashNode(_cv.video, '#4a8abf', 2800);
    await typeLines(ob, [
      { t: '[4] Video Gen — 3 clips de 5s en paralelo...', color: '#4a8abf', d: 80, spd: 16 },
      { t: '    ▶ Clip 1: imagen + contexto → 5s video', color: '#3a506a', d: 340, spd: 12 },
      { t: '    ▶ Clip 2: imagen + contexto → 5s video', color: '#3a506a', d: 200, spd: 12 },
      { t: '    ▶ Clip 3: imagen + contexto → 5s video', color: '#3a506a', d: 200, spd: 12 },
      { t: '    ✓ 3 clips listos  (máx. 3 paralelos)', color: '#5a9a5a', d: 800, spd: 14 },
    ]);
    if (_cv.video && typeof setStatus === 'function') setStatus(_cv.video.id, 'done');
    await sleep(180);

    // [5] Assembly
    if (_cv.assembly && typeof setStatus === 'function') setStatus(_cv.assembly.id, 'running');
    flashNode(_cv.assembly, '#c87840', 2000);
    await typeLines(ob, [
      { t: '[5] Digestor — ensamblando video final...', color: '#c87840', d: 80, spd: 16 },
      { t: '    3 clips × 5s → video de 15 segundos', color: '#6a4820', d: 600, spd: 13 },
      { t: '    ✓ VIDEO FINAL LISTO', color: '#5a9a5a', d: 380, spd: 18 },
    ]);
    if (_cv.assembly && typeof setStatus === 'function') setStatus(_cv.assembly.id, 'done');

    await sleep(380);
    const sep = document.createElement('div'); sep.className = 'ob-sep'; ob.appendChild(sep);
    await sleep(200);

    // Time + result
    await typeLines(ob, [
      { t: '⏱  Este pipeline puede tardar hasta 10 minutos', cls: 'ob-hint', d: 280, spd: 20 },
      { t: '', d: 35 },
      { t: '⬡  Resultado: un video de 15s generado con IA', cls: 'ob-hint', d: 200, spd: 20 },
      { t: '', d: 35 },
      { t: 'Modelos gratis por defecto.', cls: 'ob-desc', d: 150, spd: 16 },
      { t: 'Activa PRO para los modelos más capaces.', cls: 'ob-desc', d: 80, spd: 16 },
    ]);

    await sleep(380);
    ob.appendChild(makeProgress(3));
    await sleep(180);

    const endDiv = document.createElement('div');
    endDiv.className = 'ob-btns';
    endDiv.innerHTML = `<button class="ob-btn-next" style="width:100%;padding:10px 16px;font-size:11px"
      onclick="window._ob.finish()">⬡ Empezar a usar Pipeline</button>`;
    endDiv.style.opacity = '0';
    ob.appendChild(endDiv);
    await sleep(60);
    endDiv.style.transition = 'opacity .5s'; endDiv.style.opacity = '1';
    scrollBot();
  }

  /* ══════════════════════════════════════════════════════
     START / END
  ══════════════════════════════════════════════════════ */
  function startOnboarding() {
    if (_active) return;
    _active = true; _step = 0;

    showOverlay(0.82);
    setTimeout(() => {
      posCenter(480);
      const w = $('logwin'); if (w) w.style.display = 'flex';
    }, 80);
    setTimeout(() => {
      setBadgeLive(); setLiveTab();
      const inp = $('log-inputrow'); if (inp) inp.style.display = 'none';
      const qb  = $('log-quickbtns'); if (qb) qb.style.display = 'none';
      mountObody();
      runWelcome();
    }, 680);
  }

  function endOnboarding(keepState) {
    _active = false;
    hideOverlay(); hideSpotlight();
    if (!keepState) restoreLogwin();
    restoreBadge(); restoreFilters(); restoreTitle();

    const ob = $('ob-body');
    if (ob) {
      ob.style.transition = 'opacity .3s'; ob.style.opacity = '0';
      setTimeout(() => ob && ob.remove(), 320);
    }
    setTimeout(() => {
      const inp = $('log-inputrow'); if (inp) inp.style.display = '';
      const qb  = $('log-quickbtns'); if (qb) qb.style.display = '';
    }, 520);

    // After onboarding ends, fit canvas so user sees the full pipeline
    setTimeout(() => { if (typeof fitAll === 'function') fitAll(); }, 700);
  }

  /* ── public API ─────────────────────────────────────── */
  window._ob = {
    isActive() { return _active; },
    skip()   { markDone(); endOnboarding(); },
    finish() { markDone(); endOnboarding(); },
    next() {
      _step++;
      if      (_step === 1) runBuildCanvas();
      else if (_step === 2) runPromptDemo();
      else if (_step === 3) runPipelineStory();
      else                  { markDone(); endOnboarding(); }
    },
    replay() {
      if (_active) { endOnboarding(true); setTimeout(startOnboarding, 680); }
      else startOnboarding();
    },
  };

  /* ── floating help button ───────────────────────────── */
  function addHelpBtn() {
    if ($('ob-help-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'ob-help-btn';
    btn.title = 'Tutorial de bienvenida';
    btn.innerHTML = '?';
    btn.onclick = () => window._ob.replay();
    document.body.appendChild(btn);
  }

  /* ── init ───────────────────────────────────────────── */
  function init() {
    addHelpBtn();
    if (isNew()) setTimeout(startOnboarding, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 120);
  }
})();
