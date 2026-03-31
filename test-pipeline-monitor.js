/**
 * test-pipeline-monitor.js
 * Prueba end-to-end del pipeline con prompt semilla "curso online completo"
 *
 * Flujo:
 *   1. API: crear pipeline nuevo
 *   2. API: prepare (AG-00 genera estructura)
 *   3. Puppeteer: abrir el pipeline en el canvas
 *   4. API: start loop del piloto
 *   5. SSE + Puppeteer: monitorear card questions, sugerencias y fases
 *   6. Auto-dejar pasar sugerencias para ver el flujo completo
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

const BASE_URL = 'http://localhost:3000';
const HASH = '6ead88a9-1b25-4423-9fd0-b1ca7acacbcd'; // premium hash activo
const PROMPT_SEMILLA = 'curso online completo';
const MONITOR_SECS = 180; // 3 minutos de monitoreo
const SCREENSHOTS_DIR = path.join(__dirname, 'docs', 'pipeline-monitor');

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// ═══════════════════════════════════════════════════════════════
// Utilidades
// ═══════════════════════════════════════════════════════════════
const reporte = {
  prompt_semilla: PROMPT_SEMILLA,
  timestamp: new Date().toISOString(),
  pipeline_id: null,
  card_questions: [],   // { texto, sugerencia, fuente }
  sugerencias_usadas: [],
  fases_sse: [],
  agentes_activos: [],
  errores: [],
  analisis: {},
};

let screenshotIdx = 0;
function log(tipo, msg) {
  const ts = new Date().toTimeString().slice(0, 8);
  const iconos = { ok:'✓', fase:'▶', card:'◎', sug:'→', error:'✗', info:'·', sse:'~', done:'✦' };
  console.log(`[${ts}] ${iconos[tipo] || tipo} ${msg}`);
}

async function shot(page, label) {
  const n = String(screenshotIdx++).padStart(3, '0');
  const file = path.join(SCREENSHOTS_DIR, `${n}-${label.replace(/[^a-z0-9]/gi,'_').slice(0,40)}.png`);
  await page.screenshot({ path: file, fullPage: false });
  log('info', `Captura → ${path.basename(file)}`);
}

// ═══════════════════════════════════════════════════════════════
// API helpers (con hash en header)
// ═══════════════════════════════════════════════════════════════
async function api(method, endpoint, body) {
  const r = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Pipeline-Hash': HASH },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  try { return { ok: r.ok, status: r.status, data: JSON.parse(text) }; }
  catch { return { ok: r.ok, status: r.status, data: text }; }
}

// ═══════════════════════════════════════════════════════════════
// Monitoreo SSE en background
// ═══════════════════════════════════════════════════════════════
function monitorSSE(pipelineId, emitter) {
  const url = `${BASE_URL}/api/terminal/stream?pipeline_id=${pipelineId}&hash=${HASH}`;
  let buffer = '';

  const http = require('http');
  const req = http.get(url, (res) => {
    res.setEncoding('utf8');
    res.on('data', chunk => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop(); // last incomplete line stays buffered

      let eventType = null;
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            emitter.emit(eventType || 'message', data);
          } catch { /* ignorar parse errors */ }
        }
      }
    });
    res.on('error', e => log('error', 'SSE error: ' + e.message));
  });

  req.on('error', e => log('error', 'SSE req error: ' + e.message));
  return req;
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════
(async () => {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  PIPELINE MONITOR — "' + PROMPT_SEMILLA + '"');
  console.log('══════════════════════════════════════════════════════\n');

  // ── 1. Crear pipeline ──────────────────────────────────────
  log('fase', 'Creando pipeline via API...');
  const crear = await api('POST', '/api/pipelines', {
    name: `${PROMPT_SEMILLA} — test ${Date.now()}`,
  });
  if (!crear.ok) {
    log('error', `Fallo creando pipeline: ${JSON.stringify(crear.data)}`);
    process.exit(1);
  }
  const pipelineId = crear.data.id;
  reporte.pipeline_id = pipelineId;
  log('ok', `Pipeline creado: ${pipelineId}`);

  // ── 2. Prepare — AG-00 genera estructura ──────────────────
  log('fase', 'Preparando pipeline con prompt semilla (AG-00)...');
  log('info', 'Esto puede tardar 15–30 segundos...');
  const prepare = await api('POST', `/api/pipelines/${pipelineId}/prepare`, {
    prompt: PROMPT_SEMILLA,
  });
  if (!prepare.ok) {
    log('error', `Prepare falló: ${JSON.stringify(prepare.data)}`);
    reporte.errores.push({ fase: 'prepare', detalle: prepare.data });
  } else {
    log('ok', 'Pipeline preparado. Estructura generada por AG-00.');
    if (prepare.data?.context?.seed_template) {
      log('info', `Agentes en template: ${Object.keys(prepare.data.context.seed_template?.agentes || {}).join(', ')}`);
    }
  }

  // ── 3. Abrir Puppeteer ────────────────────────────────────
  log('fase', 'Abriendo navegador...');
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 50,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();

  // Capturar errores de consola
  page.on('console', msg => {
    if (msg.type() === 'error') {
      log('error', `[browser] ${msg.text().slice(0, 120)}`);
    }
  });

  // Abrir app e inyectar hash en localStorage ANTES de cargar la app
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 20000 });

  // Inyectar el hash en todos los keys que la app puede usar
  await page.evaluate((hash) => {
    localStorage.setItem('pipeline_hash', hash);
    localStorage.setItem('ph', hash);
    localStorage.setItem('hash', hash);
    // Simular initHash completado para que la app no pida hash nuevo
    window._pipelineHash = hash;
  }, HASH);

  // Recargar para que la app arranque con el hash ya disponible
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  // Obtener el nombre del pipeline desde la API
  const pipeNameResp = await api('GET', `/api/pipelines`);
  const pipelineName = pipeNameResp.data?.find?.(p => p.id === pipelineId)?.name
    || `${PROMPT_SEMILLA} — test`;

  // Llamar switchPipeline() que carga el canvas, conecta SSE y restaura question cards
  log('info', `Cargando pipeline "${pipelineName}" en el canvas...`);
  const switchResult = await page.evaluate(async (id, name) => {
    // Esperar a que switchPipeline esté disponible (app.js cargado)
    let attempts = 0;
    while (typeof window.switchPipeline !== 'function' && attempts < 20) {
      await new Promise(r => setTimeout(r, 200));
      attempts++;
    }
    if (typeof window.switchPipeline !== 'function') return 'switchPipeline_not_found';
    await window.switchPipeline(id, name);
    return 'ok';
  }, pipelineId, pipelineName);

  log(switchResult === 'ok' ? 'ok' : 'error', `switchPipeline: ${switchResult}`);
  await new Promise(r => setTimeout(r, 2500));
  await shot(page, 'pipeline-cargado');
  log('ok', 'Pipeline cargado en el canvas');

  // ── 4. Iniciar SSE monitor ────────────────────────────────
  const sseEvents = new EventEmitter();
  sseEvents.setMaxListeners(50);
  const sseReq = monitorSSE(pipelineId, sseEvents);

  sseEvents.on('message', d => {
    const txt = d.message || d.content || '';
    if (txt) log('sse', `[${d.agent_id || d.fuente || '?'}] ${txt.slice(0, 100)}`);
  });

  sseEvents.on('agent_status', d => {
    const label = `${d.agent_id} → ${d.status || d.estado}`;
    log('info', `Agent status: ${label}`);
    if (!reporte.agentes_activos.includes(d.agent_id)) reporte.agentes_activos.push(d.agent_id);
  });

  sseEvents.on('pipeline_started', d => {
    log('fase', 'Pipeline STARTED via SSE');
    reporte.fases_sse.push({ fase: 'started', ts: new Date().toISOString() });
  });

  sseEvents.on('cycle', d => {
    log('info', `Ciclo #${d.ciclo || '?'} | estado: ${d.estado || '?'}`);
    reporte.fases_sse.push({ fase: `ciclo_${d.ciclo}`, ts: new Date().toISOString() });
  });

  sseEvents.on('complete', d => {
    log('done', 'Pipeline COMPLETE via SSE');
    reporte.fases_sse.push({ fase: 'complete', ts: new Date().toISOString() });
  });

  sseEvents.on('error', d => {
    log('error', `SSE error event: ${JSON.stringify(d).slice(0, 120)}`);
    reporte.errores.push({ fase: 'sse_error', detalle: d });
  });

  // ── 5. Iniciar loop del piloto via API ────────────────────
  await new Promise(r => setTimeout(r, 1500));
  log('fase', 'Iniciando loop del piloto via API...');
  const start = await api('POST', `/api/pipelines/${pipelineId}/start`, {});
  if (!start.ok) {
    log('error', `Start falló: ${JSON.stringify(start.data)}`);
    reporte.errores.push({ fase: 'start', detalle: start.data });
  } else {
    log('ok', 'Loop del piloto iniciado');
    reporte.fases_sse.push({ fase: 'piloto_iniciado', ts: new Date().toISOString() });
  }

  await shot(page, 'piloto-iniciado');

  // ── 6. Monitoreo de card questions en el canvas ───────────
  log('fase', `Monitoreando por ${MONITOR_SECS}s...`);
  const T_END = Date.now() + MONITOR_SECS * 1000;
  const yaVistas = new Set();
  let ultimaCapturaPeriodica = Date.now();

  while (Date.now() < T_END) {
    // Buscar question cards — selectores exactos del código fuente
    const cards = await page.evaluate(() => {
      const cardEls = Array.from(document.querySelectorAll(
        '.output-card.question-card, [id^="qcard_"]'
      ));
      return cardEls.map(el => {
        // Selectores exactos del HTML generado en mkQuestionCard():
        // <div class="qcard-q">${safeQ}</div>
        // <div class="qcard-suggest">${safeSug}</div>
        const preguntaEl = el.querySelector('.qcard-q');
        const sugerenciaEl = el.querySelector('.qcard-suggest');
        const textareaEl = el.querySelector('.qcard-input, textarea.qcard-input');
        return {
          id: el.id || '',
          pregunta: (preguntaEl?.innerText || '').trim().slice(0, 300),
          sugerencia: (sugerenciaEl?.innerText || '').replace(/^—$/, '').trim().slice(0, 300),
          sugerencia_textarea: (textareaEl?.value || '').trim().slice(0, 300),
          status: el.dataset?.status || 'pending',
          visible: el.offsetParent !== null,
        };
      });
    }).catch(() => []);

    for (const card of cards) {
      const key = card.id || card.pregunta;
      if (!card.pregunta || yaVistas.has(key)) continue;
      yaVistas.add(key);

      log('card', `PREGUNTA: "${card.pregunta}"`);
      const sug = card.sugerencia || card.sugerencia_textarea;
      if (sug) {
        log('sug', `Sugerencia: "${sug}"`);
      } else {
        log('error', 'Sin sugerencia para esta pregunta');
      }

      reporte.card_questions.push({
        texto: card.pregunta,
        sugerencia: sug,
        status: card.status,
        visible: card.visible,
        ts: new Date().toISOString(),
      });

      await shot(page, `card-question-${reporte.card_questions.length}`);

      const calidad = evaluarSugerencia(card.pregunta, card.sugerencia);
      reporte.card_questions[reporte.card_questions.length - 1].calidad = calidad;
      log('info', `Calidad sugerencia: ${calidad.nivel} — ${calidad.razon}`);
    }

    // También verificar vía API las preguntas pendientes (fallback)
    const apiQs = await api('GET', `/api/pipelines/${pipelineId}/context`);
    const pending = apiQs.data?.preguntas_pendientes || [];
    for (const q of pending) {
      const key = 'api:' + (q.public_id || q.question);
      if (!q.question || yaVistas.has(key)) continue;
      yaVistas.add(key);
      log('card', `[API] PREGUNTA: "${q.question}"`);
      log(q.suggestion ? 'sug' : 'error', q.suggestion ? `Sugerencia: "${q.suggestion}"` : 'Sin sugerencia (API)');
      reporte.card_questions.push({
        texto: q.question,
        sugerencia: q.suggestion || '',
        status: q.status,
        fuente: 'api_context',
        ts: new Date().toISOString(),
        calidad: evaluarSugerencia(q.question, q.suggestion),
      });
    }

    // Captura periódica cada 25s
    if (Date.now() - ultimaCapturaPeriodica > 25000) {
      ultimaCapturaPeriodica = Date.now();
      const seg = Math.floor((Date.now() - (T_END - MONITOR_SECS * 1000)) / 1000);
      await shot(page, `estado-${seg}s`);
    }

    await new Promise(r => setTimeout(r, 900));
  }

  // ── 7. Captura final y reporte ────────────────────────────
  log('done', 'Monitoreo finalizado');
  await shot(page, 'estado-final');

  // Capturar HTML del canvas para análisis
  const canvasHtml = await page.$eval('#canvas', el => el.innerHTML).catch(() => '');
  const outputCards = await page.$$eval('.output-card', els => els.map(el => ({
    type: el.dataset.type || el.className,
    texto: el.innerText?.trim().slice(0, 300),
  }))).catch(() => []);

  reporte.analisis = {
    total_card_questions: reporte.card_questions.length,
    sugerencias_con_contenido: reporte.card_questions.filter(q => q.sugerencia?.length > 5).length,
    sugerencias_de_calidad_alta: reporte.card_questions.filter(q => q.calidad?.nivel === 'alta').length,
    sugerencias_de_calidad_media: reporte.card_questions.filter(q => q.calidad?.nivel === 'media').length,
    sugerencias_de_calidad_baja: reporte.card_questions.filter(q => q.calidad?.nivel === 'baja').length,
    agentes_activados: reporte.agentes_activos.length,
    fases_completadas: reporte.fases_sse.length,
    errores: reporte.errores.length,
    output_cards_en_canvas: outputCards.length,
  };

  sseReq.destroy();
  await browser.close();

  // Guardar reporte
  const reportePath = path.join(SCREENSHOTS_DIR, 'reporte.json');
  fs.writeFileSync(reportePath, JSON.stringify(reporte, null, 2));

  // Imprimir resumen
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  ANÁLISIS FINAL');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  Pipeline ID: ${pipelineId}`);
  console.log(`\n  Card Questions detectadas: ${reporte.card_questions.length}`);
  reporte.card_questions.forEach((q, i) => {
    console.log(`\n  [${i+1}] "${q.texto}"`);
    console.log(`       Sugerencia: "${q.sugerencia || 'ninguna'}"`);
    console.log(`       Calidad: ${q.calidad?.nivel || '?'} — ${q.calidad?.razon || ''}`);
  });
  console.log('\n  Resumen:');
  Object.entries(reporte.analisis).forEach(([k, v]) => console.log(`    ${k}: ${v}`));
  console.log(`\n  Reporte: ${reportePath}`);
  console.log('══════════════════════════════════════════════════════\n');

  process.exit(0);
})();

// ═══════════════════════════════════════════════════════════════
// Evaluador de calidad de sugerencias
// ═══════════════════════════════════════════════════════════════
function evaluarSugerencia(pregunta, sugerencia) {
  if (!sugerencia || sugerencia.trim().length < 5) {
    return { nivel: 'baja', razon: 'Sin sugerencia generada' };
  }

  const p = (pregunta || '').toLowerCase();
  const s = sugerencia.toLowerCase();

  // Verificar si la sugerencia es genérica/placeholder
  const genericas = ['sí', 'no', 'ok', 'continuar', 'siguiente', '...', 'ninguno', 'none', 'n/a'];
  if (genericas.some(g => s.trim() === g)) {
    return { nivel: 'baja', razon: 'Sugerencia genérica sin contexto del tema' };
  }

  // Verificar si la sugerencia contiene palabras clave del prompt
  const keywordsCurso = ['curso', 'online', 'módulo', 'lección', 'estudiante', 'aprendizaje',
    'video', 'plataforma', 'contenido', 'tema', 'instructor', 'udemy', 'teachable'];
  const tieneContexto = keywordsCurso.some(k => s.includes(k));

  // Verificar longitud (sugerencias largas = más específicas)
  const esDetallada = sugerencia.length > 30;

  if (tieneContexto && esDetallada) {
    return { nivel: 'alta', razon: 'Específica para el dominio del curso online' };
  } else if (tieneContexto || esDetallada) {
    return { nivel: 'media', razon: tieneContexto ? 'Tiene contexto del dominio' : 'Tiene detalle pero falta contexto' };
  } else {
    return { nivel: 'baja', razon: 'Sugerencia corta y sin contexto del tema específico' };
  }
}
