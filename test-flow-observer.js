/**
 * test-flow-observer.js
 * Observa el flujo completo de un pipeline "videos para tiktok de 30 seg"
 * Captura screenshots en cada fase clave y reporta SSE events via API.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const HASH = '6ead88a9-1b25-4423-9fd0-b1ca7acacbcd';
const PROMPT = 'videos para tiktok de 30 seg';
const SCREENSHOTS_DIR = '/tmp/pipeline-flow-screenshots';

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

let screenshotIdx = 0;
async function snap(page, label) {
  const file = path.join(SCREENSHOTS_DIR, `${String(screenshotIdx++).padStart(2,'0')}_${label.replace(/\s+/g,'_')}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`📸 [${new Date().toISOString().slice(11,19)}] ${label} → ${file}`);
  return file;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Pipeline-Hash': HASH },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({}));
}

async function apiGet(url) {
  const res = await fetch(url, { headers: { 'X-Pipeline-Hash': HASH } });
  return res.json().catch(() => ({}));
}

async function main() {
  console.log('\n═══════════════════════════════════════');
  console.log('PIPELINE FLOW OBSERVER');
  console.log(`Prompt: "${PROMPT}"`);
  console.log('═══════════════════════════════════════\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--window-size=1400,900', '--no-sandbox'],
    defaultViewport: { width: 1400, height: 900 },
  });

  const page = await browser.newPage();

  // ── FASE 1: Cargar la app ─────────────────────────────────────
  console.log('FASE 1: Cargando la app...');
  await page.goto(`${BASE_URL}?hash=${HASH}`, { waitUntil: 'networkidle0' });
  await delay(1500);
  await snap(page, '01_app_cargada');
  console.log('  → App cargada en el navegador\n');

  // ── FASE 2: Enviar prompt al terminal ─────────────────────────
  console.log('FASE 2: Enviando prompt al terminal via API...');
  const terminalResult = await apiPost(`${BASE_URL}/api/terminal`, {
    input: PROMPT,
    pipeline_id: null,
  });

  const pipelineId = terminalResult.pipeline_id;
  const seedReady = terminalResult.seed_ready;
  const ag00Messages = terminalResult.messages || [];

  console.log(`  → Pipeline ID: ${pipelineId}`);
  console.log(`  → Seed ready: ${seedReady}`);
  console.log(`  → Mensajes de AG-00: ${ag00Messages.length}`);
  if (ag00Messages.length) {
    ag00Messages.forEach(m => console.log(`     [${m.source}] ${String(m.text).slice(0, 120)}`));
  }

  if (!pipelineId) {
    console.log('  ✗ No se obtuvo pipeline_id — abortando');
    await browser.close();
    return;
  }

  // ── FASE 3: Leer el seed template generado por AG-00 ─────────
  console.log('\nFASE 3: Leyendo seed_template generado por AG-00...');
  const ctx0 = await apiGet(`${BASE_URL}/api/pipelines/${pipelineId}/context`);
  const seed = ctx0?.context?.template?.seed_template || ctx0?.context?.template;
  if (seed) {
    console.log(`  → Template ID: ${seed.template_id || 'N/A'}`);
    console.log(`  → Descripción: ${seed.descripcion || 'N/A'}`);
    console.log(`  → Bloques requeridos: ${(seed.bloques_requeridos || []).join(', ')}`);
    console.log(`  → Pasos: ${(seed.orden_produccion || []).length}`);
    console.log(`  → Preferencias requeridas: ${(seed.preferencias_requeridas || []).length}`);
    if (seed.preferencias_requeridas?.length) {
      seed.preferencias_requeridas.forEach(p => {
        console.log(`     - "${p.pregunta}" (sugerencia: "${p.sugerencia || 'VACÍA'}")`);
      });
    }
  } else {
    console.log('  → Sin seed template en contexto todavía');
  }

  // ── FASE 4: Conectar SSE en browser y cargar pipeline ────────
  console.log('\nFASE 4: Cargando pipeline en el canvas del browser...');
  await page.evaluate(async (pid, name) => {
    if (typeof switchPipeline === 'function') {
      await switchPipeline(pid, name);
    }
  }, pipelineId, PROMPT);
  await delay(2000);
  await snap(page, '02_pipeline_en_canvas_antes_ejecutar');

  // Contar nodos en el canvas
  const nodeCount = await page.evaluate(() => {
    return document.querySelectorAll('.node').length;
  });
  console.log(`  → Nodos en canvas: ${nodeCount}`);

  // ── FASE 5: Pulsar Ejecutar ───────────────────────────────────
  console.log('\nFASE 5: Iniciando pipeline (POST /start)...');
  const startResult = await apiPost(`${BASE_URL}/api/pipelines/${pipelineId}/start`, {});
  console.log(`  → Start response: ${JSON.stringify(startResult).slice(0, 100)}`);
  await delay(1000);
  await snap(page, '03_pipeline_iniciando');

  // ── FASE 6: Monitorear SSE events por 90 segundos ────────────
  console.log('\nFASE 6: Monitoreando eventos SSE por 90 segundos...\n');

  const eventLog = [];
  const questionCards = [];
  let pipelineCompleted = false;

  // Escuchar eventos via Node.js fetch stream
  const ssePromise = (async () => {
    try {
      const resp = await fetch(`${BASE_URL}/api/terminal/stream?pipeline_id=${pipelineId}&hash=${HASH}`);
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const timeout = Date.now() + 90000;

      while (Date.now() < timeout && !pipelineCompleted) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        let currentEvent = null;
        for (const line of lines) {
          if (line.startsWith('event:')) currentEvent = line.slice(6).trim();
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.slice(5).trim());
              const entry = { event: currentEvent, data, t: new Date().toISOString().slice(11,19) };
              eventLog.push(entry);

              // Log eventos importantes
              if (currentEvent === 'agent_started') {
                console.log(`  [${entry.t}] 🚀 AGENTE INICIADO: ${data.agent_id} → accion: ${data.accion}`);
              } else if (currentEvent === 'agent_updated' && data.status === 'completado') {
                console.log(`  [${entry.t}] ✓  AGENTE COMPLETO: ${data.agent_id} → ${data.accion}`);
              } else if (currentEvent === 'agent_stream') {
                // Solo mostrar el primer stream de cada agente
                if (!eventLog.find(e => e.event === 'agent_stream' && e.data.agent_id === data.agent_id && e !== entry)) {
                  console.log(`  [${entry.t}] 📡 STREAM iniciado: ${data.agent_id} (primeros chars: "${data.delta?.slice(0,30)}")`);
                }
              } else if (currentEvent === 'operator_question_created') {
                const q = data.question;
                console.log(`  [${entry.t}] ❓ PREGUNTA AL USUARIO: "${q?.question}"`);
                console.log(`               Sugerencia: "${q?.suggestion}"`);
                questionCards.push(q);
              } else if (currentEvent === 'operator_question_auto_answered') {
                console.log(`  [${entry.t}] ⚡ AUTO-RESPUESTA: ${data.field_key} → "${data.answer}"`);
              } else if (currentEvent === 'pipeline_completed') {
                console.log(`  [${entry.t}] 🏁 PIPELINE COMPLETADO`);
                pipelineCompleted = true;
              } else if (currentEvent === 'pipeline_stopped') {
                console.log(`  [${entry.t}] ⏹  PIPELINE DETENIDO: ${data.reason}`);
                pipelineCompleted = true;
              } else if (currentEvent === 'message' && data.text) {
                const txt = String(data.text).slice(0, 100);
                if (!txt.includes('Tick') && !txt.includes('heartbeat')) {
                  console.log(`  [${entry.t}] 💬 ${data.agent || ''}: ${txt}`);
                }
              }
            } catch { /* skip non-JSON */ }
          }
        }
      }
    } catch (e) {
      console.log(`  SSE error: ${e.message}`);
    }
  })();

  // Tomar screenshots periódicos
  const screenshotLoop = (async () => {
    const snapTimes = [5000, 12000, 25000, 40000, 60000, 80000];
    for (const ms of snapTimes) {
      await delay(ms - (snapTimes.indexOf(ms) > 0 ? snapTimes[snapTimes.indexOf(ms)-1] : 0));
      if (pipelineCompleted) break;
      const label = `paso_${Math.round(ms/1000)}s`;
      await snap(page, label);

      // Inspeccionar estado visual de cards de preguntas
      const cards = await page.evaluate(() => {
        const qcards = document.querySelectorAll('.qcard');
        return Array.from(qcards).map(c => ({
          question: c.querySelector('.qcard-q')?.textContent?.trim(),
          suggestion: c.querySelector('.qcard-suggest')?.textContent?.trim(),
        }));
      });
      if (cards.length) {
        console.log(`  [visual] Question cards visibles: ${cards.length}`);
        cards.forEach(c => console.log(`    Q: "${c.question}" | Sug: "${c.suggestion}"`));
      }

      // Inspeccionar nodos running
      const runningNodes = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.node.running')).map(n => n.id);
      });
      if (runningNodes.length) {
        console.log(`  [visual] Nodos en ejecución: ${runningNodes.join(', ')}`);
      }
    }
  })();

  await Promise.race([
    ssePromise,
    delay(92000),
  ]);

  await delay(1000);
  await snap(page, '99_estado_final');

  // ── REPORTE FINAL ─────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════');
  console.log('REPORTE FINAL');
  console.log('═══════════════════════════════════════');

  const agentStartEvents = eventLog.filter(e => e.event === 'agent_started');
  const agentDoneEvents = eventLog.filter(e => e.event === 'agent_updated' && e.data.status === 'completado');
  const streamEvents = eventLog.filter(e => e.event === 'agent_stream');
  const uniqueStreamAgents = [...new Set(streamEvents.map(e => e.data.agent_id))];

  console.log(`\nEventos SSE capturados: ${eventLog.length}`);
  console.log(`Agentes iniciados: ${agentStartEvents.length}`);
  console.log(`Agentes completados: ${agentDoneEvents.length}`);
  console.log(`Preguntas al usuario: ${questionCards.length}`);
  console.log(`Agentes con streaming: ${uniqueStreamAgents.join(', ') || 'ninguno'}`);
  console.log(`Pipeline completado: ${pipelineCompleted}`);

  console.log('\nSecuencia de agentes:');
  agentStartEvents.forEach(e => {
    const done = agentDoneEvents.find(d => d.data.agent_id === e.data.agent_id && d.data.accion === e.data.accion);
    console.log(`  ${e.t} → ${e.data.agent_id} [${e.data.accion}] ${done ? '✓' : '(pendiente)'}`);
  });

  if (questionCards.length) {
    console.log('\nPreguntas generadas:');
    questionCards.forEach((q, i) => {
      console.log(`  ${i+1}. "${q?.question}"`);
      console.log(`     Sugerencia: "${q?.suggestion || 'VACÍA'}"`);
    });
  }

  console.log('\nScreenshots guardados en:', SCREENSHOTS_DIR);
  console.log(fs.readdirSync(SCREENSHOTS_DIR).map(f => '  ' + f).join('\n'));

  await browser.close();
  process.exit(0);
}

main().catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
