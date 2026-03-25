/**
 * routes/terminal.js
 * API de terminal — canal conversacional del sistema.
 * POST /api/terminal  → clasifica input y enruta feedback operativo al backend unico
 */

const express = require('express');
const router = express.Router();
const { runAgent } = require('../agent-runner');
const contextManager = require('../context-manager');
const { stopLoop, pipelineEvents } = require('../pilot-loop');
const db = require('../db');
const { randomUUID } = require('crypto');

// ── Comandos del sistema (sin LLM) ─────────────────────────────
const SYSTEM_COMMANDS = {
  '/help': cmdHelp,
  '/status': cmdStatus,
  '/pipelines': cmdPipelines,
  '/agents': cmdAgents,
  '/skills': cmdSkills,
  '/context': cmdContext,
  '/logs': cmdLogs,
  '/reset': cmdReset,
  '/cancel': cmdCancel,
};

// ── GET /api/terminal/stream  (SSE) ────────────────────────────
router.get('/stream', (req, res) => {
  const { pipeline_id } = req.query;
  if (!pipeline_id) return res.status(400).json({ error: 'pipeline_id required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // nginx: disable buffering
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Heartbeat cada 20s para mantener la conexión viva
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 20000);

  // Confirmación de conexión
  send('connected', { pipeline_id, status: 'ok' });

  // Enviar estado actual del contexto al conectar
  const ctx = contextManager.getContext(pipeline_id);
  if (ctx) {
    send('status', { pipeline_id, estado: ctx.estado, ciclo: ctx.ciclo });
    send('context_snapshot', { pipeline_id, context: ctx });
  }

  // Handlers por evento
  const handlers = {
    message:           d => { if (d.pipeline_id === pipeline_id) send('message', d); },
    decision:          d => { if (d.pipeline_id === pipeline_id) send('decision', d); },
    cycle:             d => { if (d.pipeline_id === pipeline_id) send('cycle', d); },
    complete:          d => { if (d.pipeline_id === pipeline_id) send('complete', d); },
    error:             d => { if (d.pipeline_id === pipeline_id) send('error', d); },
    agent_status:      d => { if (d.pipeline_id === pipeline_id) send('agent_status', d); },
    context_snapshot:  d => { if (d.pipeline_id === pipeline_id) send('context_snapshot', d); },
    pipeline_started:  d => { if (d.pipeline_id === pipeline_id) send('pipeline_started', d); },
    pipeline_tick:     d => { if (d.pipeline_id === pipeline_id) send('pipeline_tick', d); },
    agent_started:     d => { if (d.pipeline_id === pipeline_id) send('agent_started', d); },
    agent_updated:     d => { if (d.pipeline_id === pipeline_id) send('agent_updated', d); },
    agent_paused:      d => { if (d.pipeline_id === pipeline_id) send('agent_paused', d); },
    asset_ready:       d => { if (d.pipeline_id === pipeline_id) send('asset_ready', d); },
    assembly_ready:    d => { if (d.pipeline_id === pipeline_id) send('assembly_ready', d); },
    pipeline_completed:d => { if (d.pipeline_id === pipeline_id) send('pipeline_completed', d); },
    pipeline_stopped:  d => { if (d.pipeline_id === pipeline_id) send('pipeline_stopped', d); },
    pipeline_corrupted:d => { if (d.pipeline_id === pipeline_id) send('pipeline_corrupted', d); },
  };

  for (const [event, handler] of Object.entries(handlers)) {
    pipelineEvents.on(event, handler);
  }

  req.on('close', () => {
    clearInterval(heartbeat);
    for (const [event, handler] of Object.entries(handlers)) {
      pipelineEvents.off(event, handler);
    }
  });
});

// ── POST /api/terminal ─────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { input, pipeline_id } = req.body;
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'input required' });
    }

    const trimmed = input.trim();

    // 1. Comandos del sistema (empieza con /)
    if (trimmed.startsWith('/')) {
      const parts = trimmed.split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);
      const handler = SYSTEM_COMMANDS[cmd];

      if (handler) {
        const result = await handler(args, pipeline_id);
        return res.json(result);
      }
      return res.json({
        messages: [{ source: 'TERMINAL', text: `Comando desconocido: ${cmd}. Escribe /help para ver los disponibles.` }],
      });
    }

    // 2. Feedback al Arquitecto o al Operador si hay pipeline activo
    if (pipeline_id) {
      const ctx = contextManager.getContext(pipeline_id);
      if (ctx?.arquitecto?.esperando_respuesta) {
        return res.json(await routeBackToArquitecto(trimmed, pipeline_id, ctx));
      }
      if (ctx && !ctx?.arquitecto?.esperando_respuesta) {
        return res.json(await routeToEditor(trimmed, pipeline_id, ctx));
      }
    }

    // 3. Clasificar con AG-TERM → ruta al agente correcto
    const classification = await classifyWithTerminal(trimmed, pipeline_id);
    const response = await handleClassification(classification, trimmed, pipeline_id);

    return res.json(response);

  } catch (err) {
    const msg = err.message || 'Error interno';
    // Devolver error legible en vez de 500 genérico
    return res.status(200).json({
      messages: [{ source: 'TERMINAL', text: '[ERROR] ' + msg }],
      error: msg,
    });
  }
});

// ── Clasificación con AG-TERM ──────────────────────────────────
async function classifyWithTerminal(input, pipelineId) {
  const ctx = pipelineId ? contextManager.getContext(pipelineId) : null;

  const classificationPrompt = `El usuario escribió en la terminal: "${input}"

Estado actual:
- pipeline_activo: ${pipelineId ? 'true' : 'false'}
- pipeline_id: ${pipelineId || 'null'}
- editor_esperando_input: false
- pipeline_estado: ${ctx?.estado || 'null'}

Clasifica el input y responde SOLO con este JSON (sin markdown):
{
  "categoria": "1|2|3|4|5",
  "nombre": "CREAR_PIPELINE|COMANDO|FEEDBACK|CONSULTA|AMBIGUO",
  "respuesta_terminal": "[TERMINAL] mensaje corto de confirmación",
  "agente_destino": "AG-00|null",
  "input_procesado": "descripción limpia de lo que el usuario quiere"
}`;

  try {
    const raw = await runAgent('AG-TERM', classificationPrompt, {});
    // Extraer JSON de la respuesta
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('[terminal] AG-TERM classification error:', err.message);
  }

  // Fallback: si falla la clasificación, intentar crear pipeline
  return {
    categoria: '1',
    nombre: 'CREAR_PIPELINE',
    respuesta_terminal: `[TERMINAL] Pipeline detectado: "${input}"`,
    agente_destino: 'AG-00',
    input_procesado: input,
  };
}

// ── Router de clasificaciones ──────────────────────────────────
async function handleClassification(classification, originalInput, pipelineId) {
  const messages = [
    { source: 'TERMINAL', text: classification.respuesta_terminal },
  ];

  switch (classification.categoria) {
    case '1': // CREAR PIPELINE → AG-00 ARQUITECTO
      return routeToArquitecto(classification.input_procesado || originalInput, messages, pipelineId);

    case '4': // CONSULTA GENERAL → responder directamente
      return { messages, category: 'CONSULTA' };

    case '5': // AMBIGUO → pedir clarificación
      return { messages, category: 'AMBIGUO' };

    default:
      return { messages, category: classification.nombre };
  }
}

// ── Handlers de routing ────────────────────────────────────────
async function routeToArquitecto(input, messages, existingPipelineId) {
  messages.push({ source: 'TERMINAL', text: '[TERMINAL] → Activando AG-00 ARQUITECTO...' });

  // Reusar pipeline existente si hay uno activo; si no, crear uno nuevo
  let pipelineId = existingPipelineId;
  const pipelineName = input.slice(0, 60);

  if (!pipelineId) {
    pipelineId = randomUUID();
    db.insertPipeline.run(pipelineId, pipelineName);
  } else {
    db.updatePipeline.run(pipelineName, pipelineId);
  }

  contextManager.initContext(pipelineId, pipelineName);
  contextManager.setEstado(pipelineId, 'en_progreso');

  // Pedir al Arquitecto que genere los JSON DIRECTAMENTE sin preguntas previas
  const directPrompt = `${input}

INSTRUCCIÓN PRIORITARIA: Genera ahora mismo los dos archivos JSON (seed_template y agent_menu) sin hacer preguntas previas. Usa asunciones razonables. El Editor recopilará los detalles del usuario durante la ejecución. Entrega los bloques \`\`\`json directamente.`;

  const arquitectoResponse = await runAgent('AG-00', directPrompt, {});
  messages.push({ source: 'AG-00', text: arquitectoResponse });

  // Extraer y guardar la semilla
  const seedSaved = trySaveSeedFromResponse(pipelineId, arquitectoResponse);

  if (!seedSaved) {
    // AG-00 hizo preguntas — guardar historial para retomar en el próximo mensaje
    contextManager.patchContext(pipelineId, {
      arquitecto: {
        esperando_respuesta: true,
        historial: [
          { role: 'user', content: directPrompt },
          { role: 'assistant', content: arquitectoResponse },
        ],
      },
    });
    messages.push({ source: 'TERMINAL', text: '[TERMINAL] AG-00 necesita más información. Responde las preguntas y el canvas se construirá automáticamente.' });
  }

  return { messages, category: 'CREAR_PIPELINE', pipeline_id: pipelineId, seed_ready: seedSaved };
}

async function routeBackToArquitecto(input, pipelineId, ctx) {
  const historial = ctx.arquitecto?.historial || [];
  // Rebuild multi-turn conversation
  const fullInput = historial.map(m => `${m.role === 'user' ? 'USUARIO' : 'ARQUITECTO'}: ${m.content}`).join('\n\n')
    + `\n\nUSUARIO: ${input}\n\nINSTRUCCIÓN: Con esta información ya puedes generar los dos archivos JSON.`;

  const response = await runAgent('AG-00', fullInput, {});
  const seedSaved = trySaveSeedFromResponse(pipelineId, response);

  // Update history
  const newHistorial = [...historial,
    { role: 'user', content: input },
    { role: 'assistant', content: response },
  ];

  contextManager.patchContext(pipelineId, {
    arquitecto: {
      esperando_respuesta: !seedSaved,
      historial: seedSaved ? [] : newHistorial,
    },
  });

  return {
    messages: [{ source: 'AG-00', text: response }],
    category: 'CREAR_PIPELINE',
    pipeline_id: pipelineId,
    seed_ready: seedSaved,
  };
}

async function routeToEditor(input, pipelineId, ctx) {
  contextManager.recordEvent(pipelineId, {
    tipo: 'user_feedback_received',
    fuente: 'usuario',
    mensaje: input,
  });
  contextManager.upsertAgentState(pipelineId, 'AG-05', {
    estado: 'activo',
    rol: 'operador',
    accion_actual: 'procesando_feedback_usuario',
    ultimo_inicio: new Date().toISOString(),
  });

  const operatorInput = 'El usuario envio este mensaje durante la ejecucion activa del pipeline:\n\n' + input + '\n\nLee el contexto completo y responde en JSON operativo siguiendo tu system prompt.';
  const operatorResponse = await runAgent('AG-05', operatorInput, ctx, { pipelineId });
  applyOperatorResponseToContext(pipelineId, operatorResponse);

  contextManager.upsertAgentState(pipelineId, 'AG-05', {
    estado: 'completado',
    rol: 'operador',
    accion_actual: 'feedback_procesado',
    ultimo_resultado: typeof operatorResponse === 'string' ? operatorResponse.slice(0, 2000) : operatorResponse,
    ultimo_fin: new Date().toISOString(),
  });

  pipelineEvents.emit('context_snapshot', {
    pipeline_id: pipelineId,
    context: contextManager.getContext(pipelineId),
  });

  return {
    messages: [{ source: 'AG-05', text: operatorResponse }],
    category: 'FEEDBACK',
    pipeline_id: pipelineId,
  };
}

function applyOperatorResponseToContext(pipelineId, rawResponse) {
  const parsed = parseJsonFromAgentResponse(rawResponse);
  if (!parsed) return;

  contextManager.recordEvent(pipelineId, {
    tipo: 'operator_response',
    fuente: 'AG-05',
    mensaje: parsed.accion || 'respuesta_operador',
    payload: parsed,
  });

  if (parsed.bloque_destino === 'preferencias_usuario' && parsed.resultado?.preferencias_capturadas) {
    const current = contextManager.getContext(pipelineId);
    const patch = {};
    Object.entries(parsed.resultado.preferencias_capturadas).forEach(([key, value]) => {
      patch[key] = { valor: value, resuelta: true };
    });
    contextManager.patchContext(pipelineId, {
      preferencias_usuario: {
        ...(current?.preferencias_usuario || {}),
        ...patch,
      },
    });
    return;
  }

  const targetBlock = resolveOperatorBlock(parsed.bloque_destino, parsed.resultado?.bloque);

  if (parsed.accion === 'coordinar_regeneracion' && targetBlock) {
    contextManager.registerAssetRevision(pipelineId, targetBlock, {
      estado: 'pendiente_regeneracion',
      estado_bloque: 'en_revision',
      prompt: parsed.resultado?.nuevo_prompt || null,
      feedback_usuario: parsed.resultado?.motivo || parsed.resultado?.feedback || null,
      agente_sugerido: parsed.resultado?.agente_sugerido || null,
      metadata: parsed.resultado || null,
    }, {
      previousAssetId: parsed.resultado?.asset_previo || parsed.resultado?.asset_a_reemplazar || null,
      previousStatus: parsed.resultado?.estado_asset_previo || 'reemplazado',
    });
  } else if (parsed.resultado?.asset_a_reemplazar && targetBlock) {
    contextManager.registerAssetRevision(pipelineId, targetBlock, {
      estado: 'pendiente_actualizacion',
      estado_bloque: 'en_revision',
      feedback_usuario: parsed.resultado?.feedback || null,
      agente_sugerido: parsed.resultado?.agente_sugerido || null,
      metadata: parsed.resultado || null,
    }, {
      previousAssetId: parsed.resultado.asset_a_reemplazar,
      previousStatus: parsed.resultado.estado_asset_previo || 'reemplazado',
    });
  }

  if (targetBlock) {
    const current = contextManager.getContext(pipelineId);
    const currentBlock = current?.bloques?.[targetBlock] || {};
    contextManager.updateBloque(pipelineId, targetBlock, {
      estado: parsed.accion === 'coordinar_regeneracion' ? 'en_revision' : 'completada',
      resultado: JSON.stringify(parsed.resultado || {}, null, 2),
      agente: 'AG-05',
      accion_operador: parsed.accion,
      asset_actual: currentBlock.asset_actual || null,
      assets_historial: currentBlock.assets_historial || [],
    });
  }
}

function parseJsonFromAgentResponse(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const match = raw.match(/```json\n?([\s\S]*?)\n?```/) || raw.match(/(\{[\s\S]*\})/);
    if (!match) return null;
    return JSON.parse(match[1] || match[0]);
  } catch {
    return null;
  }
}

function resolveOperatorBlock(path, fallback) {
  if (fallback) return fallback;
  if (!path) return null;
  if (!path.includes('.')) return path;
  const parts = path.split('.').filter(Boolean);
  if (parts.includes('preferencias_usuario')) return 'preferencias_usuario';
  return parts[parts.length - 1] || null;
}
// ── Extracción de seeds del output del Arquitecto ──────────────
function trySaveSeedFromResponse(pipelineId, response) {
  try {
    const jsonBlocks = [...response.matchAll(/```json\n?([\s\S]*?)\n?```/g)].map(m => {
      try { return JSON.parse(m[1]); } catch { return null; }
    }).filter(Boolean);

    const seedTemplate = jsonBlocks.find(b => b.template_id || b.bloques_requeridos);
    const agentMenu    = jsonBlocks.find(b => b.agentes && Array.isArray(b.agentes));

    if (seedTemplate && agentMenu) {
      contextManager.saveSeed(pipelineId, seedTemplate, agentMenu);
      console.log(`[terminal] Seed guardado para pipeline ${pipelineId}`);
      return true;
    }
  } catch (err) {
    console.warn('[terminal] No se pudo extraer seed del output del Arquitecto:', err.message);
  }
  return false;
}

// ── Implementación de comandos ─────────────────────────────────

function cmdHelp() {
  return {
    messages: [{
      source: 'TERMINAL',
      text: `[TERMINAL] Comandos disponibles:
  /status          Estado del pipeline activo
  /pipelines       Ver todos los pipelines guardados
  /agents          Ver agentes disponibles
  /skills          Ver skills disponibles
  /context         Ver contexto actual
  /logs            Ver historial de decisiones
  /reset           Reiniciar pipeline actual
  /cancel          Cancelar pipeline actual

  Para crear un pipeline escribe lo que quieres producir.
  Ejemplo: "libro completo sobre inteligencia artificial"`,
    }],
    category: 'COMANDO',
  };
}

function cmdPipelines() {
  const pipelines = db.getPipelines.all();
  const list = pipelines.length
    ? pipelines.map(p => `  • ${p.name} — id: ${p.id}`).join('\n')
    : '  (sin pipelines guardados)';
  return {
    messages: [{ source: 'TERMINAL', text: `[TERMINAL] Pipelines guardados:\n${list}` }],
    category: 'COMANDO',
  };
}

function cmdStatus(args, pipelineId) {
  if (!pipelineId) {
    return { messages: [{ source: 'TERMINAL', text: '[TERMINAL] No hay pipeline activo.' }], category: 'COMANDO' };
  }
  const ctx = contextManager.getContext(pipelineId);
  if (!ctx) {
    return { messages: [{ source: 'TERMINAL', text: '[TERMINAL] Contexto no encontrado.' }], category: 'COMANDO' };
  }

  const bloquesList = Object.entries(ctx.bloques || {});
  const totalBloques = bloquesList.length;
  const bloquesCompletados = bloquesList.filter(([, v]) => v.estado === 'completada').length;
  const bloquesEnRevision = bloquesList.filter(([, v]) => v.estado === 'en_revision').length;
  const totalAssets = Object.keys(ctx.assets || {}).length;
  const assetsVigentes = Object.values(ctx.assets || {}).filter(a => !['reemplazado', 'descartado'].includes(a.estado)).length;
  const assetsEnRevision = Object.values(ctx.assets || {}).filter(a => ['pendiente_regeneracion', 'pendiente_actualizacion'].includes(a.estado)).length;
  const ensamblajeEstado = ctx.ensamblaje?.estado || 'pendiente';
  const progressPct = totalBloques ? Math.round((bloquesCompletados / totalBloques) * 100) : 0;

  const bloques = bloquesList
    .map(([k, v]) => {
      const icon = v.estado === 'completada' ? '✓' : (v.estado === 'en_revision' ? '↺' : '◐');
      return `  ${icon} ${k} [${v.estado || 'pendiente'}]`;
    })
    .join('\n') || '  (sin bloques aún)';

  return {
    messages: [{
      source: 'TERMINAL',
      text: `[TERMINAL] Pipeline: ${ctx.pipeline_name}
[TERMINAL] Estado: ${ctx.estado} | Ciclo: ${ctx.ciclo} | Progreso: ${progressPct}%
[TERMINAL] Bloques: ${bloquesCompletados}/${totalBloques} completos | En revisión: ${bloquesEnRevision}
[TERMINAL] Assets: ${assetsVigentes}/${totalAssets} vigentes | En regeneración: ${assetsEnRevision}
[TERMINAL] Ensamblaje: ${ensamblajeEstado}
${bloques}`,
    }],
    category: 'COMANDO',
  };
}

function cmdAgents() {
  return {
    messages: [{
      source: 'TERMINAL',
      text: `[TERMINAL] Agentes del sistema:
  AG-00 ARQUITECTO    — Diseña pipelines desde descripción del usuario
  AG-01 PILOTO        — Control del loop de ejecución
  AG-02 ORQUESTADOR   — Paralelización de tareas
  AG-03 ESCRITOR      — Generación de texto
  AG-04 IMG GEN       — Generación de imágenes (fal.ai)
  AG-05 EDITOR        — Interacción con el usuario
  AG-06 INVESTIGADOR  — Investigación y referencias
  AG-07 DIGESTOR      — Auditoría y revisión final`,
    }],
    category: 'COMANDO',
  };
}

function cmdSkills() {
  return {
    messages: [{
      source: 'TERMINAL',
      text: `[TERMINAL] Skills disponibles:
  SKL-01 WEB SEARCH       — Búsqueda en internet
  SKL-02 BROWSER CONTROL  — Control de navegador
  SKL-03 SOCIAL PUBLISH   — Publicar en redes sociales
  SKL-04 FILE RW          — Leer y escribir archivos
  SKL-05 AUDIO TTS        — Generar audio desde texto
  SKL-06 EMAIL MSG        — Enviar emails y mensajes
  SKL-07 API REST         — Consumir APIs externas`,
    }],
    category: 'COMANDO',
  };
}

function cmdContext(args, pipelineId) {
  if (!pipelineId) {
    return { messages: [{ source: 'TERMINAL', text: '[TERMINAL] No hay pipeline activo.' }], category: 'COMANDO' };
  }
  const ctx = contextManager.getContext(pipelineId);
  return {
    messages: [{
      source: 'TERMINAL',
      text: ctx
        ? `[TERMINAL] Contexto actual:\n${JSON.stringify(ctx, null, 2)}`
        : '[TERMINAL] Contexto no encontrado.',
    }],
    category: 'COMANDO',
  };
}

function cmdLogs(args, pipelineId) {
  if (!pipelineId) {
    return { messages: [{ source: 'TERMINAL', text: '[TERMINAL] No hay pipeline activo.' }], category: 'COMANDO' };
  }
  const ctx = contextManager.getContext(pipelineId);
  const logs = ctx?.historial_decisiones || [];
  const text = logs.length
    ? logs.map(d => `  [${d.timestamp}] ${d.agente} → ${d.accion} [${d.prioridad || ''}]`).join('\n')
    : '  (sin decisiones registradas)';
  return {
    messages: [{ source: 'TERMINAL', text: `[TERMINAL] Historial de decisiones:\n${text}` }],
    category: 'COMANDO',
  };
}

function cmdReset(args, pipelineId) {
  if (!pipelineId) return { messages: [{ source: 'TERMINAL', text: '[TERMINAL] No hay pipeline activo.' }], category: 'COMANDO' };
  stopLoop(pipelineId, 'reiniciado');
  contextManager.resetContext(pipelineId);
  return { messages: [{ source: 'TERMINAL', text: '[TERMINAL] Pipeline reiniciado.' }], category: 'COMANDO' };
}

function cmdCancel(args, pipelineId) {
  if (!pipelineId) return { messages: [{ source: 'TERMINAL', text: '[TERMINAL] No hay pipeline activo.' }], category: 'COMANDO' };
  stopLoop(pipelineId, 'cancelado');
  contextManager.setEstado(pipelineId, 'cancelado');
  return {
    messages: [{ source: 'TERMINAL', text: '[TERMINAL] Pipeline cancelado. El contexto y outputs parciales se conservan.' }],
    category: 'COMANDO',
  };
}

module.exports = router;
