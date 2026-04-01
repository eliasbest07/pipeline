const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const puppeteer = require('puppeteer');

const BASE_URL = process.env.PIPELINE_BASE_URL || 'http://localhost:3000';
let HASH = process.env.PIPELINE_HASH || '6ead88a9-1b25-4423-9fd0-b1ca7acacbcd';
const PROMPT = process.env.PIPELINE_PROMPT || 'curso online completo';
const MONITOR_MS = Number(process.env.PIPELINE_MONITOR_MS || 180000);
const MAX_IDLE_MS = Number(process.env.PIPELINE_MAX_IDLE_MS || 120000);
const HEADLESS = /^(1|true|yes)$/i.test(process.env.PIPELINE_HEADLESS || '');
const AUTO_ANSWER = !/^(0|false|no)$/i.test(process.env.PIPELINE_AUTO_ANSWER || 'true');
const ARTIFACTS_DIR = path.join(__dirname, 'docs', 'e2e-artifacts', `run-${new Date().toISOString().replace(/[:.]/g, '-')}`);

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const state = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  prompt: PROMPT,
  pipelineId: null,
  pipelineName: null,
  prepareOk: false,
  startOk: false,
  browserErrors: [],
  pageErrors: [],
  requestFailures: [],
  events: [],
  questions: [],
  answers: [],
  tokenSnapshots: [],
  screenshots: [],
  assertions: [],
  // ── Evaluación del resultado final ──
  assembly: null,          // datos del evento assembly_ready
  finalAssets: [],         // assets verificados (tipo, url, size, accesible)
  finalOutputs: [],        // outputs de texto/json compilados
  evaluation: null,        // score y diagnóstico estructurado
};

let screenshotIndex = 0;

function log(tag, message) {
  const ts = new Date().toTimeString().slice(0, 8);
  console.log(`[${ts}] ${tag} ${message}`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function initHash() {
  // Try to recover the existing hash; if not found, create a new one
  const response = await fetch(`${BASE_URL}/api/hash/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash: HASH }),
  });
  if (!response.ok) {
    throw new Error(`hash/init failed: HTTP ${response.status}`);
  }
  const data = await response.json();
  HASH = data.hash;
  log('HASH', `hash ready: ${HASH} (new=${data.new}) bp_remaining=${data.bp_remaining}`);
}

async function api(method, endpoint, body) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Pipeline-Hash': HASH,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch (_) {}
  return { ok: response.ok, status: response.status, data };
}

async function takeShot(page, label) {
  const filename = `${String(screenshotIndex++).padStart(3, '0')}-${label.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.png`;
  const file = path.join(ARTIFACTS_DIR, filename);
  await page.screenshot({ path: file, fullPage: false });
  state.screenshots.push(file);
  log('SHOT', filename);
}

async function takeFocusedCardShot(page, label) {
  const clip = await page.evaluate(() => {
    const candidates = [
      ...document.querySelectorAll('.output-card.question-card'),
      ...document.querySelectorAll('.output-card'),
      ...document.querySelectorAll('.runtime-agent-card'),
      ...document.querySelectorAll('.node.running'),
    ].filter(Boolean);
    if (!candidates.length) return null;

    const rects = candidates
      .slice(0, 4)
      .map(el => el.getBoundingClientRect())
      .filter(r => r.width > 10 && r.height > 10);
    if (!rects.length) return null;

    const left = Math.max(0, Math.min(...rects.map(r => r.left)) - 32);
    const top = Math.max(0, Math.min(...rects.map(r => r.top)) - 24);
    const right = Math.min(window.innerWidth, Math.max(...rects.map(r => r.right)) + 32);
    const bottom = Math.min(window.innerHeight, Math.max(...rects.map(r => r.bottom)) + 24);

    return {
      x: Math.round(left),
      y: Math.round(top),
      width: Math.round(right - left),
      height: Math.round(bottom - top),
    };
  });

  if (!clip || clip.width < 40 || clip.height < 40) return;

  const filename = `${String(screenshotIndex++).padStart(3, '0')}-${label.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_focus.png`;
  const file = path.join(ARTIFACTS_DIR, filename);
  await page.screenshot({ path: file, clip });
  state.screenshots.push(file);
  log('SHOT', filename);
}

function recordEvent(event, data) {
  state.events.push({
    ts: new Date().toISOString(),
    event,
    data,
  });
}

function assertCondition(condition, label, extra = {}) {
  state.assertions.push({ label, ok: Boolean(condition), ...extra });
  if (!condition) {
    throw new Error(`Assertion failed: ${label}`);
  }
}

function monitorSSE(pipelineId, emitter) {
  const http = require('http');
  const req = http.get(`${BASE_URL}/api/terminal/stream?pipeline_id=${pipelineId}&hash=${HASH}`, res => {
    res.setEncoding('utf8');
    let buffer = '';
    let currentEvent = null;

    res.on('data', chunk => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
          continue;
        }
        if (!line.startsWith('data:')) continue;
        try {
          const data = JSON.parse(line.slice(5).trim());
          emitter.emit(currentEvent || 'message', data);
        } catch (_) {}
      }
    });

    res.on('error', error => emitter.emit('stream_error', { message: error.message }));
  });

  req.on('error', error => emitter.emit('stream_error', { message: error.message }));
  return req;
}

async function waitForCanvas(page) {
  await page.waitForFunction(() => typeof window.switchPipeline === 'function', { timeout: 30000 });
  const canvasInfo = await page.evaluate(() => ({
    hasCanvas: Boolean(document.getElementById('canvas')),
    hasSidebar: Boolean(document.querySelector('.sidebar') || document.querySelector('#sidebar')),
  }));
  assertCondition(canvasInfo.hasCanvas, 'canvas rendered');
}

async function loadPipelineIntoUI(page, pipelineId, pipelineName) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(hash => {
    localStorage.setItem('pipeline_hash', hash);
    localStorage.setItem('ph', hash);
    localStorage.setItem('hash', hash);
    window._pipelineHash = hash;
  }, HASH);
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await waitForCanvas(page);

  const result = await page.evaluate(async (id, name) => {
    await window.switchPipeline(id, name);
    return {
      nodeCount: document.querySelectorAll('.node').length,
      questionCount: document.querySelectorAll('.qcard').length,
      title: document.title,
    };
  }, pipelineId, pipelineName);

  // Los nodos se crean dinámicamente cuando el piloto arranca — no bloquear aquí
  if (result.nodeCount === 0) {
    log('WARN', 'canvas sin nodos aún (se crearán al iniciar el piloto)');
    state.assertions.push({ label: 'pipeline rendered nodes', ok: false, warning: true, ...result });
  } else {
    assertCondition(result.nodeCount > 0, 'pipeline rendered nodes', result);
  }
  recordEvent('ui.pipeline_loaded', result);
}

async function answerQuestion(pipelineId, question) {
  const answer = question.suggestion
    || question.metadata?.opciones?.[0]
    || question.metadata?.default_value
    || `Auto answer for ${question.field_key || 'field'}`;
  const response = await api('POST', `/api/pipelines/${pipelineId}/operator-questions/${question.public_id}/answer`, {
    answer,
  });
  state.answers.push({
    questionId: question.public_id,
    fieldKey: question.field_key,
    answer,
    ok: response.ok,
    status: response.status,
  });
  if (!response.ok) {
    if (response.status === 400) {
      log('WARN', `Question ${question.public_id} already answered or invalid — skipping`);
      return;
    }
    throw new Error(`Failed answering operator question ${question.public_id}: ${response.status}`);
  }
}

async function fetchTokenStats() {
  const response = await api('GET', '/api/tokens');
  if (!response.ok) return null;
  const total = response.data?.total || {};
  return {
    in: Number(total.in || 0),
    out: Number(total.out || 0),
    calls: Number(total.calls || 0),
    sum: Number(total.in || 0) + Number(total.out || 0),
  };
}

// ── Verifica si una URL es accesible y devuelve metadatos del archivo ──
async function probeAssetUrl(url) {
  try {
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    const res = await fetch(fullUrl, { method: 'HEAD' });
    const contentType = res.headers.get('content-type') || '';
    const contentLength = Number(res.headers.get('content-length') || 0);
    return {
      url: fullUrl,
      accessible: res.ok,
      status: res.status,
      contentType,
      sizeBytes: contentLength,
      sizeMb: contentLength ? +(contentLength / 1024 / 1024).toFixed(2) : null,
    };
  } catch (err) {
    return { url, accessible: false, error: err.message };
  }
}

// ── Extrae URLs de assets desde producto_final o desde los campos conocidos ──
function extractAssetUrls(assembly) {
  const urls = [];
  if (!assembly) return urls;

  const producto = assembly.producto_final;
  if (!producto) return urls;

  // producto_final puede ser string JSON o objeto
  let parsed = producto;
  if (typeof producto === 'string') {
    try { parsed = JSON.parse(producto); } catch (_) { parsed = {}; }
  }

  // Busca recursivamente cualquier campo que parezca una URL de asset
  const urlPattern = /\.(mp4|webm|mov|pdf|zip|mp3|wav|png|jpg|jpeg|gif)(\?|$)/i;
  const pathPattern = /\/pipeline-outputs\//i;

  function walk(obj) {
    if (!obj || typeof obj !== 'object') {
      if (typeof obj === 'string' && (urlPattern.test(obj) || pathPattern.test(obj))) {
        urls.push({ url: obj, source: 'producto_final' });
      }
      return;
    }
    for (const val of Object.values(obj)) walk(val);
  }
  walk(parsed);

  // Nota: asset_ids son assets de contenido (texto/JSON) almacenados en el contexto,
  // no archivos físicos descargables — no se prueban como URLs.

  return urls;
}

// ── Detecta el tipo de entregable final ──
function detectDeliverableType(assets, outputs) {
  const types = new Set();
  for (const a of assets) {
    const ct = (a.contentType || '').toLowerCase();
    const url = (a.url || '').toLowerCase();
    if (ct.includes('video') || /\.(mp4|webm|mov)/.test(url)) types.add('video');
    else if (ct.includes('pdf') || url.endsWith('.pdf')) types.add('pdf');
    else if (ct.includes('audio') || /\.(mp3|wav)/.test(url)) types.add('audio');
    else if (ct.includes('image') || /\.(png|jpg|jpeg|gif)/.test(url)) types.add('image');
    else if (ct.includes('zip') || url.endsWith('.zip')) types.add('zip');
    else if (a.accessible) types.add('file');
  }
  for (const o of outputs) {
    const tipo = (o.tipo || '').toLowerCase();
    if (tipo.includes('texto') || tipo.includes('text') || tipo.includes('guion')) types.add('text');
    if (tipo.includes('json')) types.add('json');
  }
  return [...types];
}

// ── Scoring del resultado final ──
function scoreDelivery(assets, outputs, assembly, agentEvents) {
  const issues = [];
  const wins = [];
  let score = 0;

  // 1. ¿Llegó assembly_ready?
  if (assembly) {
    score += 20;
    wins.push('assembly_ready recibido');
  } else {
    issues.push('CRÍTICO: assembly_ready nunca llegó — el pipeline no completó el ensamblaje');
  }

  // 2. ¿Hay assets físicos accesibles? (video, PDF, imágenes)
  const accessible = assets.filter(a => a.accessible);
  const inaccessible = assets.filter(a => !a.accessible);
  const isContentPipeline = assets.length === 0 && outputs.length > 0;

  if (accessible.length > 0) {
    score += 30;
    wins.push(`${accessible.length} asset(s) físicos accesibles`);
  } else if (assets.length > 0) {
    issues.push(`${inaccessible.length} asset(s) referenciados pero ninguno accesible (404 o error de red)`);
  } else if (!isContentPipeline) {
    issues.push('No se encontraron assets físicos en el resultado final');
  }

  // 3. ¿Tiene tamaño razonable? (video > 1MB, PDF > 50KB)
  for (const a of accessible) {
    const mb = a.sizeMb || 0;
    const url = (a.url || '').toLowerCase();
    if (/\.(mp4|webm|mov)/.test(url) && mb < 1) {
      issues.push(`Video sospechosamente pequeño: ${mb}MB (${a.url})`);
    } else if (url.endsWith('.pdf') && mb < 0.05) {
      issues.push(`PDF sospechosamente pequeño: ${mb}MB (${a.url})`);
    } else if (mb > 0) {
      score += 10;
      wins.push(`${a.sizeMb}MB — tamaño razonable`);
    }
  }

  // 4. ¿Hay outputs de contenido (texto, guion, JSON)?
  if (outputs.length >= 4) {
    // Pipeline de contenido con múltiples outputs — vale 30 pts (equivale a tener archivos)
    score += isContentPipeline ? 30 : 10;
    wins.push(`${outputs.length} output(s) de contenido generados`);
  } else if (outputs.length > 0) {
    score += 10;
    wins.push(`${outputs.length} output(s) de contenido`);
  }

  // 5. ¿Cuántos agentes completaron?
  // Texto: AG-01+AG-06+AG-03+AG-07 = 4 agentes es pipeline completo
  // Video: AG-01+AG-06+AG-03+AG-04+AG-07 = 5+ agentes
  const totalAgents = new Set(agentEvents.map(e => e.data?.agent_id)).size;
  const minAgents = isContentPipeline ? 4 : 5;
  if (totalAgents >= minAgents) {
    score += 20;
    wins.push(`${totalAgents} agentes ejecutados`);
  } else if (totalAgents > 0) {
    score += 10;
    issues.push(`Solo ${totalAgents} agentes ejecutados — posible pipeline incompleto (esperado: ${minAgents}+)`);
  } else {
    issues.push('Ningún agente registró actividad');
  }

  // 6. ¿Estado final del ensamblaje?
  // assembly_ready emite: { estado: 'completado'|'en_revision', ... }
  const pipelineEstado = assembly?.estado || assembly?.pipeline_estado;
  if (pipelineEstado === 'completado' || pipelineEstado === 'completo') {
    score += 10;
    wins.push(`estado ensamblaje: ${pipelineEstado}`);
  } else if (pipelineEstado) {
    issues.push(`Estado ensamblaje: ${pipelineEstado} (esperado: completado)`);
  }

  return {
    score: Math.min(score, 100),
    grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'F',
    wins,
    issues,
  };
}

// ── Genera el reporte de mejora para system prompts ──
function generateImprovementReport(evaluation, assembly, agentEvents, outputs) {
  const lines = [];
  lines.push('# Reporte de Evaluación E2E — Pipeline');
  lines.push(`Prompt: "${PROMPT}"`);
  lines.push(`Score: ${evaluation.score}/100 (${evaluation.grade})`);
  lines.push('');

  lines.push('## Resultado Final');
  const types = detectDeliverableType(state.finalAssets, outputs);
  lines.push(`Tipo(s) detectado(s): ${types.length ? types.join(', ') : 'ninguno'}`);
  if (state.finalAssets.length) {
    for (const a of state.finalAssets) {
      const status = a.accessible ? `✓ ${a.sizeMb ?? '?'}MB` : `✗ ${a.status || a.error}`;
      lines.push(`  - ${a.url} [${status}]`);
    }
  }
  lines.push('');

  lines.push('## Lo que funcionó');
  for (const w of evaluation.wins) lines.push(`  + ${w}`);
  lines.push('');

  lines.push('## Problemas detectados');
  if (evaluation.issues.length === 0) {
    lines.push('  (ninguno)');
  } else {
    for (const i of evaluation.issues) lines.push(`  ! ${i}`);
  }
  lines.push('');

  lines.push('## Agentes ejecutados');
  const agentMap = {};
  for (const e of agentEvents) {
    const id = e.data?.agent_id;
    if (id) agentMap[id] = (agentMap[id] || 0) + 1;
  }
  for (const [id, count] of Object.entries(agentMap)) {
    lines.push(`  ${id}: ${count} evento(s)`);
  }
  lines.push('');

  lines.push('## Outputs de contenido');
  for (const o of outputs) {
    const preview = typeof o.contenido === 'string'
      ? o.contenido.slice(0, 120).replace(/\n/g, ' ')
      : JSON.stringify(o.contenido || '').slice(0, 120);
    lines.push(`  [${o.tipo || 'sin tipo'}] ${o.bloque || ''}: ${preview}...`);
  }
  lines.push('');

  lines.push('## Sugerencias para mejorar system prompts / arquitectura');
  if (evaluation.issues.some(i => i.includes('assembly_ready'))) {
    lines.push('  → AG-07 (Digestor) no completó: revisar condición de cierre en ag07_digestor_system_prompt.md');
    lines.push('    Asegurarse que el agente emita señal de completado explícita cuando todos los bloques estén listos.');
  }
  if (evaluation.issues.some(i => i.includes('accesible'))) {
    lines.push('  → Assets no accesibles: verificar que skl08-video-merge.js guarda en la ruta correcta (/pipeline_outputs/)');
    lines.push('    y que server.js sirve ese directorio estático.');
  }
  if (evaluation.issues.some(i => i.includes('pequeño'))) {
    lines.push('  → Assets demasiado pequeños: posible fallo silencioso en generación. Agregar validación de tamaño mínimo en el skill de generación.');
  }
  if (evaluation.issues.some(i => i.includes('agentes'))) {
    lines.push('  → Pocos agentes ejecutados: revisar dependencias en ag00_arquitecto_system_prompt.md');
    lines.push('    Verificar que el Piloto (AG-01) no está cortando el pipeline prematuramente.');
  }
  if (evaluation.score < 60) {
    lines.push('  → Score bajo: considerar reducir la complejidad del pipeline de prueba o aumentar MONITOR_MS.');
  }
  lines.push('');

  lines.push('## Datos para análisis con IA');
  lines.push('```json');
  lines.push(JSON.stringify({
    prompt: PROMPT,
    score: evaluation.score,
    grade: evaluation.grade,
    deliverableTypes: types,
    assetsCount: state.finalAssets.length,
    accessibleAssets: state.finalAssets.filter(a => a.accessible).length,
    outputsCount: outputs.length,
    agentsExecuted: Object.keys(agentMap),
    issues: evaluation.issues,
    wins: evaluation.wins,
    assemblyEstado: assembly?.pipeline_estado || assembly?.estado || null,
  }, null, 2));
  lines.push('```');

  return lines.join('\n');
}

async function evaluateFinalOutput(pipelineId) {
  log('EVAL', 'evaluando resultado final...');

  // Obtener estado final del pipeline con todos los outputs
  const stateRes = await api('GET', `/api/pipelines/${pipelineId}/state`);
  const outputs = [];
  if (stateRes.ok && stateRes.data) {
    const context = stateRes.data.context || stateRes.data;
    const runtimeOutputs = context.runtime_outputs || context.outputs || [];
    for (const o of (Array.isArray(runtimeOutputs) ? runtimeOutputs : [])) {
      outputs.push({ tipo: o.tipo, bloque: o.bloque, contenido: o.contenido, public_id: o.public_id });
    }
    state.finalOutputs = outputs;
  }

  // Extraer y verificar URLs de assets desde assembly_ready
  const assetUrls = extractAssetUrls(state.assembly);

  // También buscar en los eventos asset_ready acumulados
  const assetReadyEvents = state.events.filter(e => e.event === 'asset_ready');
  for (const e of assetReadyEvents) {
    const d = e.data || {};
    if (d.url) assetUrls.push({ url: d.url, source: 'asset_ready', tipo: d.tipo_asset });
    if (d.path) assetUrls.push({ url: d.path, source: 'asset_ready_path', tipo: d.tipo_asset });
  }

  // Deduplicar por URL
  const seen = new Set();
  const uniqueUrls = assetUrls.filter(a => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  log('EVAL', `verificando ${uniqueUrls.length} asset(s)...`);
  for (const entry of uniqueUrls) {
    const probe = await probeAssetUrl(entry.url);
    state.finalAssets.push({ ...entry, ...probe });
    const icon = probe.accessible ? '✓' : '✗';
    log('EVAL', `${icon} ${entry.url} [${probe.status || probe.error}] ${probe.sizeMb ? probe.sizeMb + 'MB' : ''}`);
  }

  // Scoring
  const agentEvents = state.events.filter(e => e.event === 'agent_started');
  const evaluation = scoreDelivery(state.finalAssets, outputs, state.assembly, agentEvents);
  state.evaluation = evaluation;

  log('EVAL', `score: ${evaluation.score}/100 (${evaluation.grade})`);
  for (const issue of evaluation.issues) log('EVAL', `! ${issue}`);
  for (const win of evaluation.wins) log('EVAL', `+ ${win}`);

  // Guardar reporte de mejora
  const report = generateImprovementReport(evaluation, state.assembly, agentEvents, outputs);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'improvement-report.md'), report);
  log('EVAL', 'improvement-report.md guardado');

  return evaluation;
}

async function writeArtifacts() {
  const summary = {
    ...state,
    finishedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

  const timeline = state.events
    .map(item => `${item.ts} ${item.event} ${JSON.stringify(item.data)}`)
    .join('\n');
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'timeline.log'), `${timeline}\n`);
}

async function main() {
  log('INFO', `Artifacts: ${ARTIFACTS_DIR}`);

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    slowMo: HEADLESS ? 0 : 40,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960'],
    defaultViewport: { width: 1440, height: 960 },
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  page.on('console', msg => {
    if (msg.type() === 'error') {
      state.browserErrors.push(msg.text());
      log('BERR', msg.text().slice(0, 160));
    }
  });
  page.on('pageerror', error => {
    state.pageErrors.push(error.message);
    log('PERR', error.message);
  });
  page.on('requestfailed', request => {
    const failure = `${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'unknown'}`;
    state.requestFailures.push(failure);
    log('REQF', failure.slice(0, 180));
  });

  let sseReq = null;
  const sse = new EventEmitter();
  let pipelineCompleted = false;
  let lastUiCheckAt = 0;
  let lastMeaningfulActivityAt = Date.now();
  let lastTokenTotal = 0;

  const onAnyEvent = (eventName, data) => {
    recordEvent(eventName, data);
    if (eventName === 'operator_question_created' && data?.question) {
      state.questions.push(data.question);
    }
    if (['pipeline_started', 'pipeline_tick', 'agent_started', 'agent_updated', 'agent_stream', 'output_ready', 'asset_ready', 'operator_question_created', 'operator_question_answered', 'assembly_ready'].includes(eventName)) {
      lastMeaningfulActivityAt = Date.now();
    }
  };

  [
    'connected',
    'context_snapshot',
    'pipeline_started',
    'pipeline_tick',
    'agent_status',
    'agent_started',
    'agent_stream',
    'agent_updated',
    'output_ready',
    'asset_ready',
    'operator_question_created',
    'operator_question_answered',
    'assembly_ready',
    'pipeline_completed',
    'pipeline_stopped',
    'pipeline_corrupted',
    'stream_error',
  ].forEach(eventName => {
    sse.on(eventName, data => onAnyEvent(eventName, data));
  });

  // Captura específica del assembly_ready para evaluación
  sse.on('assembly_ready', data => {
    state.assembly = data;
    log('ASMB', `assembly_ready — estado: ${data?.estado} assets: ${(data?.asset_ids || []).length} outputs: ${(data?.output_ids || []).length}`);
  });

  sse.on('pipeline_completed', () => {
    pipelineCompleted = true;
    log('DONE', 'pipeline_completed');
  });
  sse.on('pipeline_stopped', data => {
    pipelineCompleted = true;
    log('STOP', data?.reason || 'pipeline_stopped');
  });
  sse.on('pipeline_corrupted', data => {
    throw new Error(`Pipeline corrupted: ${data?.reason || 'unknown'}`);
  });
  sse.on('stream_error', data => {
    log('SSE', data.message || 'stream error');
  });

  try {
    log('STEP', 'initializing hash');
    await initHash();

    log('STEP', 'creating pipeline');
    const createResult = await api('POST', '/api/pipelines', {
      name: `E2E ${PROMPT} ${Date.now()}`,
    });
    assertCondition(createResult.ok, 'pipeline created', { status: createResult.status, data: createResult.data });
    state.pipelineId = createResult.data.id;
    state.pipelineName = createResult.data.name;

    log('STEP', 'preparing pipeline');
    const prepareResult = await api('POST', `/api/pipelines/${state.pipelineId}/prepare`, {
      prompt: PROMPT,
    });
    state.prepareOk = prepareResult.ok;
    if (!prepareResult.ok) log('ERR', `prepare failed: HTTP ${prepareResult.status} — ${JSON.stringify(prepareResult.data)}`);
    assertCondition(prepareResult.ok, 'pipeline prepared', { status: prepareResult.status });

    log('STEP', 'loading pipeline in browser');
    await loadPipelineIntoUI(page, state.pipelineId, state.pipelineName);
    await takeShot(page, 'pipeline_loaded');
    await takeFocusedCardShot(page, 'pipeline_loaded');

    log('STEP', 'opening SSE stream');
    sseReq = monitorSSE(state.pipelineId, sse);
    await delay(1200);

    log('STEP', 'starting pipeline');
    const startResult = await api('POST', `/api/pipelines/${state.pipelineId}/start`, {});
    state.startOk = startResult.ok;
    assertCondition(startResult.ok, 'pipeline started via API', { status: startResult.status, data: startResult.data });

    const startedAt = Date.now();
    while (!pipelineCompleted) {
      await delay(1000);

      const elapsedMs = Date.now() - startedAt;
      const tokens = await fetchTokenStats();
      if (tokens) {
        state.tokenSnapshots.push({ ts: new Date().toISOString(), ...tokens });
        if (tokens.sum > lastTokenTotal) {
          lastTokenTotal = tokens.sum;
          lastMeaningfulActivityAt = Date.now();
          log('TOK', `tokens ${tokens.sum} | calls ${tokens.calls}`);
        }
      }

      const newQuestions = state.questions.filter(q => !state.answers.some(a => a.questionId === q.public_id));
      if (AUTO_ANSWER) {
        for (const question of newQuestions) {
          log('Q', `${question.field_key || 'field'} -> auto answer`);
          await answerQuestion(state.pipelineId, question);
        }
      }

      if (Date.now() - lastUiCheckAt > 10000) {
        lastUiCheckAt = Date.now();
        try {
          const uiState = await page.evaluate(() => ({
            nodeCount: document.querySelectorAll('.node').length,
            runningNodes: document.querySelectorAll('.node.running').length,
            doneNodes: document.querySelectorAll('.node.done').length,
            questionCards: document.querySelectorAll('.qcard').length,
            runtimeCards: document.querySelectorAll('.runtime-agent-card').length,
          }));
          if (tokens) uiState.tokens = tokens;
          recordEvent('ui.poll', uiState);
          await takeShot(page, `ui-${Math.round(elapsedMs / 1000)}s`);
          await takeFocusedCardShot(page, `ui-${Math.round(elapsedMs / 1000)}s`);
        } catch (uiErr) {
          log('WARN', `UI poll error (frame detached?): ${uiErr.message?.slice(0, 80)}`);
        }
      }

      if (elapsedMs >= MONITOR_MS) {
        const idleMs = Date.now() - lastMeaningfulActivityAt;
        if (idleMs >= MAX_IDLE_MS) {
          log('WARN', `monitor timeout reached after ${elapsedMs}ms with idle window ${idleMs}ms`);
          break;
        }
        if (Math.round(elapsedMs / 1000) % 30 === 0) {
          log('INFO', `extended monitoring: still active after ${Math.round(elapsedMs / 1000)}s`);
        }
      }
    }

    // ── Evaluación del resultado final ──
    try {
      await takeShot(page, pipelineCompleted ? 'pipeline_finished' : 'pipeline_timeout');
      await takeFocusedCardShot(page, pipelineCompleted ? 'pipeline_finished' : 'pipeline_timeout');
    } catch (shotErr) {
      log('WARN', `final screenshot failed: ${shotErr.message?.slice(0, 80)}`);
    }

    const evaluation = await evaluateFinalOutput(state.pipelineId);

    const stateResponse = await api('GET', `/api/pipelines/${state.pipelineId}/state`);
    assertCondition(stateResponse.ok, 'pipeline state retrievable', { status: stateResponse.status });

    const completedEvent = state.events.find(item => item.event === 'pipeline_completed');
    const startedEvent = state.events.find(item => item.event === 'pipeline_started');
    const agentEvents = state.events.filter(item => item.event === 'agent_started');
    const outputEvents = state.events.filter(item => item.event === 'output_ready' || item.event === 'asset_ready');

    assertCondition(Boolean(startedEvent), 'received pipeline_started event');
    assertCondition(agentEvents.length > 0, 'received agent activity', { count: agentEvents.length });
    assertCondition(outputEvents.length > 0 || Boolean(completedEvent), 'received outputs or completion', {
      outputs: outputEvents.length,
      completed: Boolean(completedEvent),
    });

    // Assertion sobre el resultado final
    assertCondition(
      state.finalAssets.some(a => a.accessible) || state.finalOutputs.length > 0,
      'final deliverable present (asset or output)',
      { assets: state.finalAssets.length, outputs: state.finalOutputs.length, score: evaluation.score }
    );

    await writeArtifacts();
    log('OK', `test completed — score ${evaluation.score}/100 (${evaluation.grade})`);
    log('OK', `reporte: ${path.join(ARTIFACTS_DIR, 'improvement-report.md')}`);
  } finally {
    if (sseReq) sseReq.destroy();
    await writeArtifacts().catch(() => {});
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch(error => {
  console.error('\nE2E test failed');
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
