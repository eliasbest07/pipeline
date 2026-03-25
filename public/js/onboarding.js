/* ═══════════════════════════════════════════════════════
   PIPELINE — Onboarding System  v2.0
   Phase 1: Animated welcome in centered terminal
   Phase 2: Terminal tours the UI with spotlights
   Phase 3+: Agent creation (coming soon)
═══════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const STORAGE_KEY = 'pipeline_onboarded_v1';
  let _active = false;
  let _step = 0;
  let _pilotNode = null;   // pilot node created in Phase 3 (reused in Phase 4)
  let _researchNode = null; // research node created in Phase 4

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
  const isNew  = () => !localStorage.getItem(STORAGE_KEY);
  const markDone = () => localStorage.setItem(STORAGE_KEY, '1');

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
    // animate position
    sp.style.left   = x + 'px';
    sp.style.top    = y + 'px';
    sp.style.width  = w + 'px';
    sp.style.height = h + 'px';
    requestAnimationFrame(() => sp.classList.add('on'));
  }
  function hideSpotlight() {
    const sp = $('ob-spotlight');
    if (!sp) return;
    sp.classList.remove('on');
    setTimeout(() => sp && sp.remove(), 500);
  }

  /* ══════════════════════════════════════════════════════
     LOGWIN POSITION CONTROL
  ══════════════════════════════════════════════════════ */
  const mob = () => window.innerWidth < 640;

  function applyPos(cfg) {
    const w = $('logwin');
    w.style.transition = 'all .62s cubic-bezier(.4,0,.2,1)';
    Object.assign(w.style, cfg);
  }

  function posCenter(h = 480) {
    applyPos({
      position : 'fixed',
      left     : '50%',
      top      : '50%',
      bottom   : 'auto',
      right    : 'auto',
      transform: 'translate(-50%,-50%)',
      width    : mob() ? '92vw' : 'min(600px,92vw)',
      height   : h + 'px',
      zIndex   : '10000',
    });
  }

  function posToolbar() {
    // small window just below the toolbar
    const tb = $('toolbar');
    const rect = tb ? tb.getBoundingClientRect() : { bottom: 52 };
    applyPos({
      position : 'fixed',
      left     : '50%',
      top      : (rect.bottom + 12) + 'px',
      bottom   : 'auto',
      right    : 'auto',
      transform: 'translateX(-50%)',
      width    : mob() ? '92vw' : 'min(560px,90vw)',
      height   : '205px',
      zIndex   : '10000',
    });
  }

  function posCanvas() {
    // center-right, so the canvas is somewhat visible on the left
    applyPos({
      position : 'fixed',
      left     : mob() ? '4%' : '55%',
      top      : '50%',
      bottom   : 'auto',
      right    : 'auto',
      transform: mob() ? 'translateY(-50%)' : 'translate(-50%,-50%)',
      width    : mob() ? '92vw' : 'min(500px,42vw)',
      height   : '240px',
      zIndex   : '10000',
    });
  }

  function posSidebar() {
    // upper-right corner so the sidebar on the left is visible
    applyPos({
      position : 'fixed',
      left     : mob() ? '4%' : '60%',
      top      : '14%',
      bottom   : 'auto',
      right    : 'auto',
      transform: 'none',
      width    : mob() ? '92vw' : 'min(480px,38vw)',
      height   : '220px',
      zIndex   : '10000',
    });
  }

  function restoreLogwin() {
    const w = $('logwin');
    w.style.transition = 'all .5s cubic-bezier(.4,0,.2,1)';
    setTimeout(() => {
      ['position','right','bottom','left','top','transform','width','zIndex']
        .forEach(p => w.style[p] = '');
      w.style.height = '420px';
      setTimeout(() => { w.style.transition = ''; }, 540);
    }, 80);
  }

  /* ══════════════════════════════════════════════════════
     BADGE & FILTERS & TITLE
  ══════════════════════════════════════════════════════ */
  function setBadgeLive() {
    const b = $('log-badge');
    b.textContent = 'LIVE';
    b.className = 'ltb-badge ob-live-badge';
  }
  function restoreBadge() {
    const b = $('log-badge');
    b.textContent = 'IDLE';
    b.className = 'ltb-badge';
  }

  function setLiveTab(label = '▶ LIVE') {
    $('logfilters').innerHTML =
      `<div class="ob-live-tab">${label}</div>
       <div class="ob-live-dot"></div>
       <span class="ob-live-status" id="ob-live-status">onboarding activo</span>`;
  }
  function setLiveStatus(txt) {
    const s = $('ob-live-status');
    if (s) s.textContent = txt;
  }
  function restoreFilters() {
    $('logfilters').innerHTML = `
      <div class="lf on" onclick="setLogFilter('all',this)">Todo</div>
      <div class="lf-sep"></div>
      <div class="lf" onclick="setLogFilter('think',this)">Pensamiento</div>
      <div class="lf-sep"></div>
      <div class="lf" onclick="setLogFilter('action',this)">Acciones</div>
      <div class="lf-sep"></div>
      <div class="lf" onclick="setLogFilter('system',this)">Sistema</div>
      <div class="lf-clear" onclick="clearLog()">✕ limpiar</div>`;
  }

  function setTitle(txt) {
    const t = $('logtitle');
    if (t) t.textContent = txt;
  }
  function restoreTitle() { setTitle('Log Global — Pipeline'); }

  /* ══════════════════════════════════════════════════════
     CONTENT HELPERS
  ══════════════════════════════════════════════════════ */
  function mountObody() {
    $('logbody').innerHTML = '';
    const ob = document.createElement('div');
    ob.id = 'ob-body';
    $('logbody').appendChild(ob);
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
      await typeInto(d, m.t, m.spd ?? 20);
      scrollBot();
    }
  }

  function makeProgress(active /* 0-based */, total = 4) {
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
    setTimeout(() => {
      div.style.transition = 'opacity .5s';
      div.style.opacity = '1';
    }, 60);
    setTimeout(() => {
      const btn = div.querySelector('#ob-main-btn');
      if (btn) btn.onclick = nextFn;
    }, 0);
    return div;
  }

  /* ══════════════════════════════════════════════════════
     PHASE 1 — WELCOME
  ══════════════════════════════════════════════════════ */
  const ASCII = [
    '┌─────────────────────────────────────────┐',
    '│                                         │',
    '│   ▶  P I P E L I N E    v 1 . 0       │',
    '│      A g e n t   C a n v a s           │',
    '│                                         │',
    '└─────────────────────────────────────────┘',
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
    { t: '', d: 60 },
    { t: 'Pipeline es un canvas visual donde puedes', cls: 'ob-desc', spd: 18, d: 80 },
    { t: 'crear agentes de IA y conectarlos entre sí', cls: 'ob-desc', spd: 18, d: 40 },
    { t: 'para automatizar cualquier flujo de trabajo.', cls: 'ob-desc', spd: 18, d: 40 },
    { t: '', d: 60 },
    { t: '⬡ Sin código. Solo IA que trabaja por ti.', cls: 'ob-hint', spd: 22, d: 200 },
    { t: '', d: 60 },
    { t: 'Déjame mostrarte cómo funciona en 30 seg...', cls: 'ob-sub', spd: 20, d: 300 },
  ];

  async function runWelcome() {
    const ob = getOb();
    ob.innerHTML = '';

    // cursor blink
    const cline = document.createElement('div');
    cline.className = 'ob-cursor-line';
    ob.appendChild(cline);
    await sleep(250);

    // ASCII logo
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

    // init sequence
    for (const cfg of INIT_SEQ) {
      await sleep(cfg.d);
      const d = document.createElement('div');
      d.className = 'ob-init-line';
      d.style.color = cfg.c;
      ob.appendChild(d);
      await typeInto(d, cfg.t, 20);
      scrollBot();
    }

    await sleep(400);

    const sep = document.createElement('div');
    sep.className = 'ob-sep';
    ob.appendChild(sep);
    await sleep(180);

    await typeLines(ob, WELCOME_LINES);
    await sleep(300);

    ob.appendChild(makeProgress(0));
    await sleep(200);
    ob.appendChild(makeButtons('✕ Omitir', 'Continuar →', () => window._ob.next()));
    scrollBot();
  }

  /* ══════════════════════════════════════════════════════
     PHASE 2 — UI TOUR
  ══════════════════════════════════════════════════════ */
  const TOUR_SECTIONS = [
    {
      id: 'toolbar',
      statusLabel: 'inspeccionando toolbar...',
      titleLabel: '◀ BARRA DE HERRAMIENTAS ▶',
      moveLogwin: posToolbar,
      spotlight: () => {
        const tb = $('toolbar');
        if (!tb) return;
        const r = tb.getBoundingClientRect();
        showSpotlight(r.left - 8, r.top - 8, r.width + 16, r.height + 16);
      },
      lines: [
        { t: '── BARRA DE HERRAMIENTAS ──', cls: 'ob-section-title', d: 180 },
        { t: '', d: 40 },
        { t: '+ Nodo   →   añade un agente al canvas', cls: 'ob-desc', d: 100, spd: 15 },
        { t: '→ Conectar →  une salidas con entradas', cls: 'ob-desc', d: 70,  spd: 15 },
        { t: '▶ Run    →   ejecuta el pipeline', cls: 'ob-desc', d: 70,  spd: 15 },
        { t: '■ Stop   →   detiene la ejecución', cls: 'ob-desc', d: 60,  spd: 15 },
        { t: '⬡ Modelos  → cambia el modelo de IA', cls: 'ob-desc', d: 70,  spd: 15 },
        { t: '', d: 40 },
        { t: '▶ EJECUTAR — modo automático con IA', cls: 'ob-hint', d: 180, spd: 18 },
      ],
      pause: 1800,
      beforeShow: null,
      afterHide: null,
    },
    {
      id: 'canvas',
      statusLabel: 'explorando canvas...',
      titleLabel: '◀ CANVAS — ÁREA DE TRABAJO ▶',
      moveLogwin: posCanvas,
      spotlight: () => {
        const tb  = $('toolbar');
        const tbH = tb ? tb.getBoundingClientRect().bottom + 6 : 58;
        const W   = window.innerWidth;
        const H   = window.innerHeight;
        // spotlight left ~55% of screen (canvas area, away from terminal)
        showSpotlight(0, tbH, W * 0.5, H - tbH - 4);
      },
      lines: [
        { t: '── EL CANVAS ──', cls: 'ob-section-title', d: 180 },
        { t: '', d: 40 },
        { t: 'Aquí viven tus agentes de IA.', cls: 'ob-desc', d: 100, spd: 18 },
        { t: 'Cada nodo = un agente con:', cls: 'ob-desc', d: 70,  spd: 16 },
        { t: '  · modelo de IA propio', cls: 'ob-desc', d: 50,  spd: 16 },
        { t: '  · prompt / instrucciones', cls: 'ob-desc', d: 40,  spd: 16 },
        { t: '  · inputs y outputs tipados', cls: 'ob-desc', d: 40,  spd: 16 },
        { t: '', d: 40 },
        { t: 'Conéctalos: la salida de un agente', cls: 'ob-desc', d: 80,  spd: 16 },
        { t: 'alimenta la entrada del siguiente.', cls: 'ob-desc', d: 50,  spd: 16 },
        { t: '', d: 40 },
        { t: '↔  Scroll para zoom · Drag para mover', cls: 'ob-sub', d: 160, spd: 15 },
      ],
      pause: 2000,
      beforeShow: null,
      afterHide: null,
    },
    {
      id: 'sidebar',
      statusLabel: 'mostrando panel de agentes...',
      titleLabel: '◀ PANEL DE AGENTES & SKILLS ▶',
      moveLogwin: posSidebar,
      spotlight: () => {
        // sidebar slides in to x=0, width 242px
        showSpotlight(0, 0, 248, window.innerHeight);
      },
      lines: [
        { t: '── PANEL DE AGENTES ──', cls: 'ob-section-title', d: 180 },
        { t: '', d: 40 },
        { t: 'Arrastra agentes al canvas:', cls: 'ob-desc', d: 100, spd: 18 },
        { t: '  ● Piloto    → coordina subagentes', cls: 'ob-desc', d: 70,  spd: 14 },
        { t: '  ● Prompt    → procesa con IA', cls: 'ob-desc', d: 55,  spd: 14 },
        { t: '  ● Imagen    → genera imágenes', cls: 'ob-desc', d: 55,  spd: 14 },
        { t: '  ● Operador  → espera input humano', cls: 'ob-desc', d: 55,  spd: 14 },
        { t: '', d: 40 },
        { t: 'Skills → capacidades extra:', cls: 'ob-desc', d: 80,  spd: 16 },
        { t: '  web_search · email · notion · MCP…', cls: 'ob-sub', d: 60,  spd: 14 },
      ],
      pause: 1800,
      beforeShow: () => {
        // Open sidebar and raise above overlay so it's actually visible
        const ps = $('pside');
        if (!ps) return;
        ps.classList.add('open');
        ps.style.zIndex = '9997'; // just below overlay (9998) — visible through 35% opacity
      },
      afterHide: () => {
        const ps = $('pside');
        if (!ps) return;
        ps.classList.remove('open');
        ps.style.zIndex = '';
      },
    },
  ];

  async function runTour() {
    // Lighten overlay so the UI underneath is visible (35% dim)
    setOverlayOpacity(0.35);
    await sleep(350);

    for (const sec of TOUR_SECTIONS) {
      // optional pre-hook (e.g. open sidebar)
      if (sec.beforeShow) { sec.beforeShow(); await sleep(260); }

      // move terminal to position
      sec.moveLogwin();
      await sleep(700);

      // spotlight around target area
      sec.spotlight();
      await sleep(160);

      // update live status & title bar
      setLiveStatus(sec.statusLabel);
      setTitle(sec.titleLabel);

      // type content
      const ob = getOb();
      ob.innerHTML = '';
      await typeLines(ob, sec.lines);

      // hold so user can read
      await sleep(sec.pause);

      // cleanup spotlight
      hideSpotlight();
      await sleep(360);

      // optional post-hook (e.g. close sidebar)
      if (sec.afterHide) { sec.afterHide(); await sleep(260); }
    }

    // ── TOUR COMPLETE ────────────────────────────────
    setOverlayOpacity(0.75);
    posCenter(275);
    setTitle('Log Global — Pipeline');
    setLiveStatus('tour completado ✓');
    await sleep(720);

    const ob = getOb();
    ob.innerHTML = '';

    await typeLines(ob, [
      { t: '── ¡TOUR COMPLETADO! ──', cls: 'ob-section-title', d: 200 },
      { t: '', d: 50 },
      { t: 'Ya conoces el workspace.', cls: 'ob-desc', d: 150, spd: 20 },
      { t: 'Ahora vamos a crear tu primer agente', cls: 'ob-desc', d: 100, spd: 20 },
      { t: 'y verás la IA trabajando en tiempo real.', cls: 'ob-desc', d: 80,  spd: 20 },
      { t: '', d: 60 },
      { t: '⬡  Agente Piloto — listo para despegar.', cls: 'ob-hint', d: 280, spd: 22 },
    ]);

    await sleep(280);
    ob.appendChild(makeProgress(1));
    await sleep(200);
    ob.appendChild(makeButtons('✕ Omitir', 'Crear mi primer agente →', () => window._ob.next()));
    scrollBot();
  }

  /* ══════════════════════════════════════════════════════
     PHASE 3 — AGENT CREATION
  ══════════════════════════════════════════════════════ */

  // Compact terminal at bottom-left so modal is visible center
  function posPhase3() {
    applyPos({
      position : 'fixed',
      left     : mob() ? '2%' : '16px',
      bottom   : '16px',
      top      : 'auto',
      right    : 'auto',
      transform: 'none',
      width    : mob() ? '96vw' : '420px',
      height   : '210px',
      zIndex   : '10002',
    });
  }

  // Type text character by character into a form element, triggering oninput
  async function typeField(el, text, speed = 55) {
    if (!el) return;
    el.focus();
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(120);
    for (const ch of text) {
      el.value += ch;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      await sleep(speed + Math.random() * 20);
    }
    el.blur();
    await sleep(180);
  }

  async function runAgentCreation() {
    // ── 1. Full UI visible, terminal goes compact bottom-left
    setOverlayOpacity(0);
    await sleep(350);
    hideOverlay();

    posPhase3();
    setLiveStatus('creando agente piloto...');
    setTitle('Log Global — Pipeline');
    await sleep(720);

    // ── 2. Narrate node creation
    const ob = getOb();
    ob.innerHTML = '';

    await typeLines(ob, [
      { t: '── CREANDO AGENTE PILOTO ──', cls: 'ob-section-title', d: 150 },
      { t: '', d: 30 },
      { t: '> Añadiendo nodo al canvas...', color: '#8a7040', d: 100, spd: 18 },
    ]);

    // ── 3. Create node
    let newNode = null;
    if (typeof addNodeCenter === 'function') newNode = addNodeCenter('pilot');
    _pilotNode = newNode; // save for Phase 4
    if (typeof fitAll === 'function') setTimeout(fitAll, 300);

    await sleep(500);

    const okLine = document.createElement('div');
    okLine.className = 'ob-init-line';
    okLine.style.color = '#5a9a5a';
    ob.appendChild(okLine);
    await typeInto(okLine, '> ✓ Nodo "Agente Piloto" creado.', 18);
    scrollBot();

    await sleep(450);

    const openLine = document.createElement('div');
    openLine.className = 'ob-init-line';
    openLine.style.color = '#8a7040';
    ob.appendChild(openLine);
    await typeInto(openLine, '> Abriendo configuración...', 18);

    // ── 4. Open modal
    await sleep(400);
    if (newNode && typeof openM === 'function') openM(newNode.id);
    await sleep(750);

    // ── 5. Fill form fields with typewriter
    setLiveStatus('configurando agente...');
    ob.innerHTML = '';

    await typeLines(ob, [
      { t: '── CONFIGURANDO AGENTE ──', cls: 'ob-section-title', d: 100 },
      { t: '', d: 25 },
    ]);

    const FIELDS = [
      {
        label: 'nombre',
        get: () => document.querySelector('#mbody input.fi'),
        value: 'Agente Piloto',
        spd: 65,
      },
      {
        label: 'instrucciones',
        get: () => document.querySelectorAll('#mbody textarea.fi')[0],
        value: 'Eres el agente coordinador principal. Delega tareas a subagentes, monitorea su progreso y consolida resultados. Output JSON.',
        spd: 20,
      },
      {
        label: 'verificación automática',
        get: () => document.querySelectorAll('#mbody textarea.fi')[1],
        value: 'Todos los subagentes deben reportar estado OK.',
        spd: 36,
      },
      {
        label: 'timeout',
        get: () => document.querySelectorAll('#mbody input[type="number"]')[0],
        value: '30',
        spd: 180,
      },
      {
        label: 'reintentos',
        get: () => document.querySelectorAll('#mbody input[type="number"]')[1],
        value: '3',
        spd: 250,
      },
    ];

    for (const field of FIELDS) {
      // status line in terminal
      const lbl = document.createElement('div');
      lbl.className = 'ob-desc';
      lbl.style.color = '#4a7abf';
      lbl.textContent = `> completando "${field.label}"...`;
      ob.appendChild(lbl);
      scrollBot();

      await typeField(field.get(), field.value, field.spd);

      // mark done
      lbl.style.color = '#5a9a5a';
      lbl.textContent = `  ✓ ${field.label}`;
      await sleep(200);
    }

    await sleep(400);
    ob.appendChild(document.createElement('br'));

    const cfgDone = document.createElement('div');
    cfgDone.className = 'ob-hint';
    ob.appendChild(cfgDone);
    await typeInto(cfgDone, '✓ Agente configurado y listo.', 30);
    scrollBot();

    await sleep(500);
    ob.appendChild(makeProgress(2));
    await sleep(180);
    ob.appendChild(makeButtons(
      '✕ Omitir',
      '▶ Iniciar agente',
      () => runAgentSimulation(newNode),
    ));

    scrollBot();
  }

  /* ══════════════════════════════════════════════════════
     PHASE 3b — AGENT RUN SIMULATION
  ══════════════════════════════════════════════════════ */
  async function runAgentSimulation(newNode) {
    // Close modal and expand terminal
    if (typeof closeM === 'function') closeM();
    await sleep(300);

    // Expand terminal to see logs better
    posCenter(340);
    setLiveStatus('agente ejecutando...');
    await sleep(650);

    const ob = getOb();
    ob.innerHTML = '';

    // Mark node as running
    if (newNode && typeof setStatus === 'function') setStatus(newNode.id, 'running');

    const RUN_LOGS = [
      { t: '── AGENTE EN EJECUCIÓN LIVE ──', cls: 'ob-section-title', d: 100 },
      { t: '', d: 30 },
      { t: '> Iniciando Agente Piloto...', color: '#c8a040', d: 180, spd: 20 },
      { t: '> Analizando pipeline y conexiones...', color: '#8a7040', d: 450, spd: 17 },
      { t: '> Verificando inputs disponibles...', color: '#8a7040', d: 550, spd: 17 },
      { t: '> Delegando subtareas a subagentes...', color: '#8a7040', d: 700, spd: 17 },
      { t: '> Procesando con claude-sonnet-4...', color: '#4a7abf', d: 850, spd: 17 },
      { t: '> Consolidando resultados JSON...', color: '#8a7040', d: 1100, spd: 17 },
      { t: '', d: 80 },
      { t: '  entrada  →  "Produce video pipeline"', color: '#5a6a8a', d: 200, spd: 14 },
      { t: '  salida   →  { status:"ok", tasks:3 }', color: '#5a9a5a', d: 200, spd: 14 },
      { t: '  tiempo   →  3.2s', color: '#5a5a5a', d: 100, spd: 14 },
      { t: '', d: 80 },
      { t: '✓ Ejecución completada exitosamente.', color: '#5a9a5a', d: 350, spd: 22 },
    ];

    await typeLines(ob, RUN_LOGS);

    if (newNode && typeof setStatus === 'function') setStatus(newNode.id, 'done');

    await sleep(500);

    // ── FINAL CELEBRATION
    const sep = document.createElement('div');
    sep.className = 'ob-sep';
    ob.appendChild(sep);
    await sleep(200);

    const FINAL = [
      { t: '★ ¡Tu primer agente funcionó!', cls: 'ob-h1', d: 400, spd: 40 },
      { t: '', d: 40 },
      { t: 'Ya sabes crear, configurar y ejecutar', cls: 'ob-desc', d: 100, spd: 20 },
      { t: 'agentes de IA en Pipeline.', cls: 'ob-desc', d: 60,  spd: 20 },
      { t: '', d: 50 },
      { t: 'Ahora construye tu primer pipeline real.', cls: 'ob-hint', d: 120, spd: 20 },
    ];

    for (const m of FINAL) {
      await sleep(m.d || 60);
      if (!m.t) { ob.appendChild(document.createElement('br')); continue; }
      const d = document.createElement('div');
      d.className = m.cls || 'ob-desc';
      ob.appendChild(d);
      await typeInto(d, m.t, m.spd || 20);
      scrollBot();
    }

    await sleep(350);

    await sleep(280);
    ob.appendChild(makeProgress(3));
    await sleep(180);
    ob.appendChild(makeButtons(
      '✕ Finalizar',
      'Crear pipeline completo →',
      () => window._ob.next(),
    ));
    scrollBot();
  }

  /* ══════════════════════════════════════════════════════
     PHASE 4 — PIPELINE CONNECTION DEMO
  ══════════════════════════════════════════════════════ */
  async function runPipelineDemo() {
    // Compact terminal bottom-left, UI fully visible
    hideOverlay();
    posPhase3();
    setLiveStatus('creando segundo agente...');
    await sleep(700);

    const ob = getOb();
    ob.innerHTML = '';

    await typeLines(ob, [
      { t: '── PIPELINE CON 2 AGENTES ──', cls: 'ob-section-title', d: 150 },
      { t: '', d: 30 },
      { t: '> Un agente solo es poderoso...', color: '#706860', d: 200, spd: 22 },
      { t: '> Dos conectados son un pipeline.', color: '#c8a040', d: 380, spd: 20 },
      { t: '', d: 50 },
      { t: '> Añadiendo "Agente Investigación"...', color: '#8a7040', d: 200, spd: 18 },
    ]);

    // ── Create research node relative to pilot
    if (_pilotNode && typeof addNode === 'function') {
      _researchNode = addNode('research', _pilotNode.x + 360, _pilotNode.y + 160);
    } else if (typeof addNodeCenter === 'function') {
      _researchNode = addNodeCenter('research');
    }
    if (typeof fitAll === 'function') setTimeout(fitAll, 350);
    await sleep(650);

    const r1 = document.createElement('div');
    r1.className = 'ob-init-line'; r1.style.color = '#5a9a5a';
    ob.appendChild(r1);
    await typeInto(r1, '> ✓ Agente Investigación creado.', 18);
    scrollBot();

    await sleep(450);

    // ── Connect pilot → research
    const cline = document.createElement('div');
    cline.className = 'ob-init-line'; cline.style.color = '#8a7040';
    ob.appendChild(cline);
    await typeInto(cline, '> Conectando: Piloto → Investigación...', 18);
    scrollBot();

    await sleep(420);

    if (_pilotNode && _researchNode) {
      const nc = {
        id: 'c' + Math.random().toString(36).slice(2, 10),
        from: _pilotNode.id, fp: 'out',
        to: _researchNode.id, tp: 'in',
        active: false, cond: false, condT: 'no', fromCard: false,
      };
      conns.push(nc);
      if (typeof drawConns === 'function') drawConns();
      // animate newly drawn path
      setTimeout(() => {
        document.querySelectorAll('.cpath:not(._ob_done)').forEach(p => {
          p.classList.add('cpath-draw', '_ob_done');
          setTimeout(() => p.classList.remove('cpath-draw'), 900);
        });
      }, 80);
      if (typeof updateMM === 'function') updateMM();
    }

    await sleep(700);

    const r2 = document.createElement('div');
    r2.className = 'ob-init-line'; r2.style.color = '#5a9a5a';
    ob.appendChild(r2);
    await typeInto(r2, '> ✓ Conexión establecida.', 18);
    scrollBot();

    await sleep(400);
    ob.appendChild(document.createElement('br'));
    const pipeMsg = document.createElement('div');
    pipeMsg.className = 'ob-hint';
    ob.appendChild(pipeMsg);
    await typeInto(pipeMsg, '⬡ Pipeline de 2 agentes listo.', 26);
    scrollBot();

    await sleep(450);
    ob.appendChild(makeProgress(3));
    await sleep(180);
    ob.appendChild(makeButtons(
      '✕ Finalizar',
      '▶ Ejecutar pipeline',
      () => runFullPipeline(),
    ));
    scrollBot();
  }

  /* ── Phase 4b: Full pipeline simulation ──────────────── */
  async function runFullPipeline() {
    posCenter(380);
    setLiveStatus('pipeline ejecutando...');
    await sleep(660);

    const ob = getOb();
    ob.innerHTML = '';

    if (_pilotNode && typeof setStatus === 'function') setStatus(_pilotNode.id, 'running');

    await typeLines(ob, [
      { t: '── PIPELINE EN EJECUCIÓN LIVE ──', cls: 'ob-section-title', d: 100 },
      { t: '', d: 30 },
      { t: '  2 agentes · 1 conexión · modo automático', cls: 'ob-sub', d: 100, spd: 14 },
      { t: '', d: 40 },
      { t: '[1/2] Agente Piloto — iniciando...', color: '#c8a040', d: 200, spd: 18 },
      { t: '      > Analizando pipeline...', color: '#8a7040', d: 480, spd: 16 },
      { t: '      > Delegando subtareas...', color: '#8a7040', d: 580, spd: 16 },
      { t: '      ✓ Piloto completado — 1.8s', color: '#5a9a5a', d: 650, spd: 18 },
      { t: '', d: 50 },
    ]);

    if (_pilotNode && typeof setStatus === 'function') setStatus(_pilotNode.id, 'done');
    if (_researchNode && typeof setStatus === 'function') setStatus(_researchNode.id, 'running');

    await typeLines(ob, [
      { t: '[2/2] Agente Investigación — recibiendo...', color: '#c8a040', d: 100, spd: 18 },
      { t: '      entrada: { status:"ok", tasks:3 }', color: '#5a6a8a', d: 280, spd: 14 },
      { t: '      > Procesando investigación...', color: '#8a7040', d: 680, spd: 16 },
      { t: '      > Generando ideas rankadas...', color: '#8a7040', d: 780, spd: 16 },
      { t: '      ✓ Investigación lista — 2.4s', color: '#5a9a5a', d: 580, spd: 18 },
    ]);

    if (_researchNode && typeof setStatus === 'function') setStatus(_researchNode.id, 'done');

    await sleep(350);
    ob.appendChild(document.createElement('br'));

    const totLine = document.createElement('div');
    totLine.style.color = '#5a9a5a';
    totLine.className = 'ob-desc';
    ob.appendChild(totLine);
    await typeInto(totLine, 'Pipeline completado — 4.2s · nodos: 2/2 ✓', 16);
    scrollBot();

    await sleep(500);

    const sep2 = document.createElement('div');
    sep2.className = 'ob-sep';
    ob.appendChild(sep2);
    await sleep(200);

    // ── FINAL
    const FINISH = [
      { t: '★ ¡Pipeline completo y funcionando!', cls: 'ob-h1', d: 400, spd: 36 },
      { t: '', d: 40 },
      { t: 'Ya dominas Pipeline:', cls: 'ob-desc', d: 100, spd: 20 },
      { t: '  · Crear agentes con modelos y prompts', cls: 'ob-desc', d: 60, spd: 16 },
      { t: '  · Conectarlos en cadenas automáticas', cls: 'ob-desc', d: 50, spd: 16 },
      { t: '  · Ejecutar pipelines completos de IA', cls: 'ob-desc', d: 50, spd: 16 },
      { t: '', d: 50 },
      { t: 'Ahora construye el tuyo. ¡Mucho éxito!', cls: 'ob-hint', d: 200, spd: 20 },
    ];

    for (const m of FINISH) {
      await sleep(m.d || 60);
      if (!m.t) { ob.appendChild(document.createElement('br')); continue; }
      const d = document.createElement('div');
      d.className = m.cls || 'ob-desc';
      ob.appendChild(d);
      await typeInto(d, m.t, m.spd || 20);
      scrollBot();
    }

    await sleep(350);
    const endDiv = document.createElement('div');
    endDiv.className = 'ob-btns';
    endDiv.innerHTML = `<button class="ob-btn-next" style="width:100%;padding:10px 16px"
      onclick="window._ob.finish()">⬡ Empezar a usar Pipeline</button>`;
    endDiv.style.opacity = '0';
    ob.appendChild(endDiv);
    await sleep(60);
    endDiv.style.transition = 'opacity .5s';
    endDiv.style.opacity = '1';
    scrollBot();
  }

  /* ══════════════════════════════════════════════════════
     START / END
  ══════════════════════════════════════════════════════ */
  function startOnboarding() {
    if (_active) return;
    _active = true;
    _step = 0;

    showOverlay(0.82);

    setTimeout(() => {
      posCenter(480);
      const w = $('logwin');
      if (w) w.style.display = 'flex';
    }, 80);

    setTimeout(() => {
      setBadgeLive();
      setLiveTab();
      $('log-inputrow').style.display = 'none';
      mountObody();
      runWelcome();
    }, 680);
  }

  function endOnboarding(keepState) {
    _active = false;
    hideOverlay();
    hideSpotlight();
    if (!keepState) restoreLogwin();
    restoreBadge();
    restoreFilters();
    restoreTitle();

    const ob = $('ob-body');
    if (ob) {
      ob.style.transition = 'opacity .3s';
      ob.style.opacity = '0';
      setTimeout(() => ob && ob.remove(), 320);
    }
    setTimeout(() => {
      const inp = $('log-inputrow');
      if (inp) inp.style.display = '';
    }, 520);
  }

  /* ── public API ─────────────────────────────────────── */
  window._ob = {
    skip()   { markDone(); endOnboarding(); },
    finish() { markDone(); endOnboarding(); },
    next() {
      _step++;
      if      (_step === 1) runTour();
      else if (_step === 2) runAgentCreation();
      else if (_step === 3) runPipelineDemo();  // called after Phase 3b simulation
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
