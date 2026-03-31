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
const MAX_OPERATOR_QUESTIONS = 6;

// ── Comandos del sistema (sin LLM) ─────────────────────────────
const SYSTEM_COMMANDS = {
  '/help': cmdHelp,
  '/status': cmdStatus,
  '/pipelines': cmdPipelines,
  '/agents': cmdAgents,
  '/skills': cmdSkills,
  '/context': cmdContext,
  '/logs': cmdLogs,
  '/approve': cmdApprove,
  '/answer': cmdAnswer,
  '/reset': cmdReset,
  '/cancel': cmdCancel,
};

// ── GET /api/terminal/stream  (SSE) ────────────────────────────
router.get('/stream', (req, res) => {
  const { pipeline_id, hash } = req.query;
  if (!pipeline_id) return res.status(400).json({ error: 'pipeline_id required' });

  // Validate hash if provided (non-blocking — just logs unknown hashes)
  if (hash) {
    const row = db.getHash.get(hash);
    if (!row || !row.is_active) {
      return res.status(403).json({ error: 'hash_invalid' });
    }
  }

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
    agent_stream:      d => { if (d.pipeline_id === pipeline_id) send('agent_stream', d); },
    agent_paused:      d => { if (d.pipeline_id === pipeline_id) send('agent_paused', d); },
    asset_ready:       d => { if (d.pipeline_id === pipeline_id) send('asset_ready', d); },
    output_ready:      d => { if (d.pipeline_id === pipeline_id) send('output_ready', d); },
    operator_question_created: d => { if (d.pipeline_id === pipeline_id) send('operator_question_created', d); },
    operator_question_answered: d => { if (d.pipeline_id === pipeline_id) send('operator_question_answered', d); },
    assembly_ready:    d => { if (d.pipeline_id === pipeline_id) send('assembly_ready', d); },
    pipeline_completed:d => { if (d.pipeline_id === pipeline_id) send('pipeline_completed', d); },
    pipeline_stopped:  d => { if (d.pipeline_id === pipeline_id) send('pipeline_stopped', d); },
    pipeline_corrupted:d => { if (d.pipeline_id === pipeline_id) send('pipeline_corrupted', d); },
    budget_update:     d => { if (d.pipeline_id === pipeline_id) send('budget_update', d); },
    budget_exceeded:   d => { if (d.pipeline_id === pipeline_id) send('budget_exceeded', d); },
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
      const pendingQuestions = getPendingOperatorQuestions(pipeline_id, ctx);
      if (pendingQuestions.length) {
        return res.json(await routeToPendingQuestion(trimmed, pipeline_id, ctx, pendingQuestions[0]));
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

  // La terminal siempre crea un pipeline nuevo y limpio.
  let pipelineId = null;
  const pipelineName = input.slice(0, 60);

  pipelineId = randomUUID();
  db.insertPipeline.run(pipelineId, pipelineName);

  contextManager.initContext(pipelineId, pipelineName);
  contextManager.recordEvent(pipelineId, {
    tipo: 'pipeline_created_from_terminal',
    fuente: 'TERMINAL',
    mensaje: 'Pipeline creado desde prompt semilla. AG-00 preparará contexto y estructura antes de ejecutar.',
    payload: { pipelineId, prompt_semilla: input },
  });

  // Pedir al Arquitecto que genere los JSON DIRECTAMENTE sin preguntas previas
  const directPrompt = `${input}

INSTRUCCIÓN PRIORITARIA: Genera ahora mismo los dos archivos JSON (seed_template y agent_menu) sin hacer preguntas previas. Usa asunciones razonables. El Operador recopilará los detalles del usuario durante la ejecución. Entrega los bloques \`\`\`json directamente.`;

  const arquitectoResponse = await runAgent('AG-00', directPrompt, {});
  messages.push({ source: 'AG-00', text: arquitectoResponse });

  // Extraer y guardar la semilla
  const seedSaved = trySaveSeedFromResponse(pipelineId, arquitectoResponse);

  if (seedSaved) {
    contextManager.setEstado(pipelineId, 'preparado');
    contextManager.recordEvent(pipelineId, {
      tipo: 'pipeline_prepared',
      fuente: 'AG-00',
      mensaje: 'AG-00 dejó el pipeline preparado. Falta pulsar Ejecutar para iniciar el loop operativo.',
    });
    messages.push({ source: 'TERMINAL', text: '[TERMINAL] Pipeline preparado. El contexto y la estructura inicial quedaron listos. Pulsa Ejecutar para iniciar el loop del Piloto.' });
  } else {
    contextManager.setEstado(pipelineId, 'iniciando');
    contextManager.patchContext(pipelineId, {
      arquitecto: {
        esperando_respuesta: true,
        historial: [
          { role: 'user', content: directPrompt },
          { role: 'assistant', content: arquitectoResponse },
        ],
      },
    });
    messages.push({ source: 'TERMINAL', text: '[TERMINAL] AG-00 no pudo dejar la estructura lista en este intento. Responde para completar la preparación del pipeline.' });
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
  if (seedSaved) {
    contextManager.setEstado(pipelineId, 'preparado');
    contextManager.recordEvent(pipelineId, {
      tipo: 'pipeline_prepared',
      fuente: 'AG-00',
      mensaje: 'AG-00 completó la estructura tras feedback adicional.',
    });
  }

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
  const operatorResult = applyOperatorResponseToContext(pipelineId, operatorResponse);

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
    operator_result: operatorResult,
  };
}

async function routeToPendingQuestion(input, pipelineId, ctx, question) {
  const answer = String(input || '').trim();
  if (!answer) {
    return {
      messages: [{ source: 'TERMINAL', text: '[TERMINAL] No recibí respuesta para la pregunta pendiente.' }],
      category: 'FEEDBACK',
      pipeline_id: pipelineId,
    };
  }
  const result = answerOperatorQuestion(pipelineId, question, answer, 'manual');
  return {
    messages: [{
      source: 'TERMINAL',
      text: `[TERMINAL] Respuesta registrada para: "${question.question}" → ${answer}`,
    }],
    category: 'FEEDBACK',
    pipeline_id: pipelineId,
    operator_result: result,
  };
}

function applyOperatorResponseToContext(pipelineId, rawResponse) {
  const parsed = parseJsonFromAgentResponse(rawResponse);
  if (!parsed) return null;

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
    return { parsed, question: null };
  }

  const isOperatorQuestionAction = parsed.accion === 'preguntar_usuario' || parsed.accion === 'recopilar_preferencias';

  if (isOperatorQuestionAction && parsed.resultado?.question) {
    const current = contextManager.getContext(pipelineId);
    const pendingQuestions = Array.isArray(current?.preguntas_pendientes) ? current.preguntas_pendientes : [];
    const requestedFieldKey = parsed.resultado.field_key || parsed.resultado.fieldKey || null;
    const existingPending = pendingQuestions.find(item =>
      (requestedFieldKey && item.field_key === requestedFieldKey) ||
      item.question === parsed.resultado.question
    );

    if (!existingPending && pendingQuestions.length >= MAX_OPERATOR_QUESTIONS) {
      contextManager.recordEvent(pipelineId, {
        tipo: 'operator_question_skipped_limit',
        fuente: 'AG-05',
        mensaje: 'AG-05 intentó crear una pregunta adicional pero ya existen 6 pendientes.',
        payload: { max: MAX_OPERATOR_QUESTIONS, question: parsed.resultado.question },
      });
      return { parsed, question: null, skipped: 'question_limit_reached' };
    }

    const question = contextManager.upsertOperatorQuestion(pipelineId, {
      public_id: existingPending?.public_id || undefined,
      field_key: parsed.resultado.field_key || parsed.resultado.fieldKey || null,
      question: parsed.resultado.question,
      suggestion: parsed.resultado.suggestion || '',
      status: 'pending',
      metadata: {
        bloque: parsed.resultado.bloque || parsed.bloque_destino || null,
        impacto: parsed.resultado.impacto || null,
        accion_operador: parsed.accion,
      },
    });
    contextManager.patchContext(pipelineId, {
      editor: {
        esperando_input: true,
        pregunta_activa: parsed.resultado.question,
      },
      preguntas_pendientes: mergePendingQuestions(
        current?.preguntas_pendientes || [],
        {
          public_id: question.public_id,
          question: question.question,
          field_key: parsed.resultado.field_key || parsed.resultado.fieldKey || null,
          bloque: parsed.resultado.bloque || parsed.bloque_destino || null,
        }
      ),
    });
    pipelineEvents.emit('operator_question_created', {
      pipeline_id: pipelineId,
      question,
    });
    return { parsed, question };
  }

  if (isOperatorQuestionAction && parsed.resultado && typeof parsed.resultado === 'object') {
    const preguntas = Array.isArray(parsed.resultado.preguntas)
      ? parsed.resultado.preguntas
          .map((item, index) => {
            const rawItem = typeof item === 'string' ? { question: item } : (item && typeof item === 'object' ? item : {});
            return {
              field_key: rawItem?.campo || rawItem?.field_key || `pregunta_${index + 1}`,
              question: String(rawItem?.pregunta || rawItem?.question || '').trim(),
              suggestion: inferTerminalSuggestion({
                field_key: rawItem?.campo || rawItem?.field_key || `pregunta_${index + 1}`,
                suggestion: rawItem?.sugerencia || rawItem?.suggestion || '',
                metadata: {
                  tipo: rawItem?.tipo || 'texto',
                  opciones: Array.isArray(rawItem?.opciones) ? rawItem.opciones : [],
                  default_value: rawItem?.default_value || rawItem?.default || null,
                },
              }),
              metadata: {
                bloque: rawItem?.bloque || parsed.bloque_destino || null,
                accion_operador: parsed.accion,
                tipo: rawItem?.tipo || 'texto',
                opciones: Array.isArray(rawItem?.opciones) ? rawItem.opciones : [],
                default_value: rawItem?.default_value || rawItem?.default || null,
              },
            };
          })
          .filter(item => item.question)
      : [];

    const activeQuestions = Array.isArray(parsed.resultado.preguntas_activas)
      ? parsed.resultado.preguntas_activas
          .map((item, index) => {
            const rawItem = typeof item === 'string' ? { question: item } : (item && typeof item === 'object' ? item : {});
            return {
            field_key: rawItem?.campo || rawItem?.field_key || `pregunta_activa_${index + 1}`,
            question: String(rawItem?.pregunta || rawItem?.question || '').trim(),
            suggestion: inferTerminalSuggestion({
              field_key: rawItem?.campo || rawItem?.field_key || `pregunta_activa_${index + 1}`,
              metadata: {
                tipo: rawItem?.tipo || 'texto',
                opciones: Array.isArray(rawItem?.opciones) ? rawItem.opciones : [],
                default_value: rawItem?.default_value || rawItem?.default || null,
              },
            }),
            metadata: {
              bloque: rawItem?.bloque || parsed.bloque_destino || null,
              accion_operador: parsed.accion,
              tipo: rawItem?.tipo || 'texto',
              opciones: Array.isArray(rawItem?.opciones) ? rawItem.opciones : [],
              default_value: rawItem?.default_value || rawItem?.default || null,
            },
          };
          })
          .filter(item => item.question)
      : [];

    const flatQuestions = Object.entries(parsed.resultado)
      .filter(([key, value]) => String(key || '').startsWith('question_') && typeof value === 'string' && value.trim())
      .map(([key, value]) => ({
        field_key: String(key).replace(/^question_/, '') || key,
        question: String(value).trim(),
        suggestion: inferTerminalSuggestion({ field_key: String(key).replace(/^question_/, '') || key, metadata: { tipo: 'texto' } }),
        metadata: {
          bloque: parsed.bloque_destino || null,
          accion_operador: parsed.accion,
        },
      }));

    const normalizedQuestions = [...preguntas, ...activeQuestions, ...flatQuestions];

    if (normalizedQuestions.length) {
      const current = contextManager.getContext(pipelineId);
      let mergedPending = Array.isArray(current?.preguntas_pendientes) ? [...current.preguntas_pendientes] : [];
      const created = [];

      normalizedQuestions.forEach(item => {
        const existingPending = mergedPending.find(q => q.field_key === item.field_key || q.question === item.question);
        if (existingPending) return;
        if (mergedPending.length >= MAX_OPERATOR_QUESTIONS) return;

        const question = contextManager.upsertOperatorQuestion(pipelineId, {
          field_key: item.field_key,
          question: item.question,
          suggestion: item.suggestion || inferTerminalSuggestion({ field_key: item.field_key, metadata: item.metadata || { tipo: 'texto' } }),
          status: 'pending',
          metadata: item.metadata || {
            bloque: parsed.bloque_destino || null,
            accion_operador: parsed.accion,
          },
        });

        mergedPending.push({
          public_id: question.public_id,
          question: question.question,
          field_key: question.field_key,
          bloque: parsed.bloque_destino || null,
          suggestion: question.suggestion || '',
          metadata: question.metadata || {},
        });
        created.push(question);
        pipelineEvents.emit('operator_question_created', {
          pipeline_id: pipelineId,
          question,
        });
      });

      if (created.length) {
        contextManager.patchContext(pipelineId, {
          editor: {
            esperando_input: true,
            pregunta_activa: created[0].question,
          },
          preguntas_pendientes: mergedPending,
        });
      }

      return { parsed, question: created[0] || null };
    }
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
  return { parsed, question: null };
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

function mergePendingQuestions(currentList, nextItem) {
  const list = Array.isArray(currentList) ? [...currentList] : [];
  const idx = list.findIndex(item => item.public_id === nextItem.public_id);
  if (idx >= 0) list[idx] = { ...list[idx], ...nextItem };
  else list.push(nextItem);
  return list;
}

function getPendingOperatorQuestions(pipelineId, ctx = null) {
  const current = ctx || contextManager.getContext(pipelineId);
  if (!current) return [];
  const pendingIds = new Set(
    (Array.isArray(current.preguntas_pendientes) ? current.preguntas_pendientes : [])
      .map(item => item?.public_id)
      .filter(Boolean)
  );
  return contextManager.getOperatorQuestions(pipelineId)
    .filter(item => item?.status !== 'answered')
    .filter(item => !pendingIds.size || pendingIds.has(item.public_id))
    .sort((a, b) => String(a.created_at || a.actualizado_en || '').localeCompare(String(b.created_at || b.actualizado_en || '')));
}

function inferSuggestionFromQuestionText(questionText) {
  const text = String(questionText || '').trim();
  if (!text) return '';
  const recommended = text.match(/(?:recomendad[oa]|sugerid[oa]|default)\s*[:\-]?\s*(\d+)/i);
  if (recommended?.[1]) return recommended[1];
  const optionNumbers = [...text.matchAll(/(?:^|\s)(\d+)\s*(?:[).:\-]|para\b)/gi)]
    .map(match => String(match[1]).trim())
    .filter(Boolean);
  if (optionNumbers.length) return optionNumbers[optionNumbers.length - 1];
  return '';
}

function inferTerminalSuggestion(question) {
  const meta = question?.metadata || {};
  if (question?.suggestion && String(question.suggestion).trim()) return String(question.suggestion).trim();
  if (meta.default_value !== undefined && meta.default_value !== null && String(meta.default_value).trim()) return String(meta.default_value).trim();
  if (Array.isArray(meta.opciones) && meta.opciones.length) return String(meta.opciones[0]).trim();
  const inferredFromText = inferSuggestionFromQuestionText(question?.question || meta.question || '');
  if (inferredFromText) return inferredFromText;
  return 'Confirmado';
}

function answerOperatorQuestion(pipelineId, existing, answer, answerOrigin = 'manual') {
  const metadata = existing.metadata || {};
  const questionType = String(metadata.tipo || '').trim().toLowerCase();
  if (questionType === 'numero' && !/^\d+$/.test(String(answer).trim())) {
    return { error: 'numeric_answer_required', question: existing };
  }

  const updated = contextManager.upsertOperatorQuestion(pipelineId, {
    ...existing,
    answer,
    answer_origin: answerOrigin,
    status: 'answered',
  });

  const context = contextManager.getContext(pipelineId);
  const currentPending = Array.isArray(context?.preguntas_pendientes) ? context.preguntas_pendientes : [];
  const nextPending = currentPending.filter(item => item.public_id !== existing.public_id);
  const fieldKey = metadata.field_key || existing.field_key || null;
  const currentRequired = context?.preferencias_usuario?._requeridas || {};
  const nextRequired = fieldKey && currentRequired[fieldKey]
    ? {
        ...currentRequired,
        [fieldKey]: {
          ...currentRequired[fieldKey],
          campo: currentRequired[fieldKey]?.campo || fieldKey,
          valor: answer,
          resuelta: true,
        },
      }
    : currentRequired;
  const bloqueOrigen = metadata.bloque || null;
  const isPreferenceCollectionBlock = bloqueOrigen === 'preferencias_usuario' || /preferenc/i.test(String(bloqueOrigen));
  const currentDispatchQueue = Array.isArray(context?.ag05_dispatch_queue) ? context.ag05_dispatch_queue : [];
  const currentOverrides = Array.isArray(context?.overrides_pendientes) ? context.overrides_pendientes : [];
  const nextOverrides = (!isPreferenceCollectionBlock && bloqueOrigen)
    ? [
        ...currentOverrides,
        {
          bloque: bloqueOrigen,
          field_key: fieldKey,
          question: existing.question,
          answer,
          answer_origin: answerOrigin,
          requested_at: new Date().toISOString(),
          question_id: existing.public_id,
        },
      ]
    : currentOverrides;
  const shouldQueueDigestor = !isPreferenceCollectionBlock && bloqueOrigen && !currentDispatchQueue.some(item => item?.agente_id === 'AG-07');
  const nextDispatchQueue = shouldQueueDigestor
    ? [
        ...currentDispatchQueue,
        {
          agente_id: 'AG-07',
          accion: 'revisar_y_ensamblar',
          parametros: {
            origen: 'override_usuario',
            bloque_origen: bloqueOrigen,
            field_key: fieldKey,
          },
          bloque_destino: null,
          solicitado_en: new Date().toISOString(),
        },
      ]
    : currentDispatchQueue;

  contextManager.patchContext(pipelineId, {
    editor: {
      esperando_input: nextPending.length > 0,
      pregunta_activa: nextPending[0]?.question || null,
    },
    preguntas_pendientes: nextPending,
    respuestas_usuario: {
      ...(context?.respuestas_usuario || {}),
      [existing.public_id]: {
        question: existing.question,
        answer,
        answer_origin: answerOrigin,
        bloque: metadata.bloque || null,
        field_key: fieldKey,
        answered_at: new Date().toISOString(),
      },
    },
    overrides_pendientes: nextOverrides,
    ag05_dispatch_queue: nextDispatchQueue,
    preferencias_usuario: fieldKey ? {
      ...(context?.preferencias_usuario || {}),
      _requeridas: nextRequired,
      [fieldKey]: {
        valor: answer,
        resuelta: true,
        origen: answerOrigin,
      },
    } : (context?.preferencias_usuario || {}),
  });

  if (bloqueOrigen) {
    const currentBloques = contextManager.getContext(pipelineId)?.bloques || {};
    if (currentBloques[bloqueOrigen]?.estado === 'esperando_usuario') {
      contextManager.updateBloque(pipelineId, bloqueOrigen, {
        estado: 'completada',
        resultado: JSON.stringify({ field_key: fieldKey, answer, answered_at: new Date().toISOString() }),
        agente: 'usuario',
      });
    }
  }

  const refreshed = contextManager.getContext(pipelineId);
  pipelineEvents.emit('operator_question_answered', {
    pipeline_id: pipelineId,
    question: updated,
    context: refreshed,
  });
  pipelineEvents.emit('context_snapshot', {
    pipeline_id: pipelineId,
    context: refreshed,
  });
  return { question: updated, context: refreshed };
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
  /approve         Aprobar pregunta pendiente con sugerencia
  /approve all     Aprobar todas las preguntas pendientes con sugerencias
  /answer TEXTO    Responder la pregunta pendiente activa
  /reset           Reiniciar pipeline actual
  /cancel          Cancelar pipeline actual

  Para crear un pipeline escribe lo que quieres producir.
  Ejemplo: "libro completo sobre inteligencia artificial"`,
    }],
    category: 'COMANDO',
  };
}

function cmdApprove(args, pipelineId) {
  if (!pipelineId) {
    return { messages: [{ source: 'TERMINAL', text: '[TERMINAL] No hay pipeline activo.' }], category: 'COMANDO' };
  }
  const ctx = contextManager.getContext(pipelineId);
  const pending = getPendingOperatorQuestions(pipelineId, ctx);
  if (!pending.length) {
    return { messages: [{ source: 'TERMINAL', text: '[TERMINAL] No hay preguntas pendientes por aprobar.' }], category: 'COMANDO', pipeline_id: pipelineId };
  }

  const approveAll = String(args?.[0] || '').toLowerCase() === 'all';
  const targets = approveAll ? pending : [pending[0]];
  targets.forEach(question => {
    answerOperatorQuestion(pipelineId, question, inferTerminalSuggestion(question), 'automatic');
  });

  return {
    messages: [{
      source: 'TERMINAL',
      text: `[TERMINAL] ${targets.length} pregunta(s) aprobada(s) con su sugerencia por defecto.`,
    }],
    category: 'COMANDO',
    pipeline_id: pipelineId,
  };
}

function cmdAnswer(args, pipelineId) {
  if (!pipelineId) {
    return { messages: [{ source: 'TERMINAL', text: '[TERMINAL] No hay pipeline activo.' }], category: 'COMANDO' };
  }
  const answer = Array.isArray(args) ? args.join(' ').trim() : '';
  if (!answer) {
    return { messages: [{ source: 'TERMINAL', text: '[TERMINAL] Uso: /answer tu_respuesta' }], category: 'COMANDO', pipeline_id: pipelineId };
  }
  const ctx = contextManager.getContext(pipelineId);
  const pending = getPendingOperatorQuestions(pipelineId, ctx);
  if (!pending.length) {
    return { messages: [{ source: 'TERMINAL', text: '[TERMINAL] No hay preguntas pendientes por responder.' }], category: 'COMANDO', pipeline_id: pipelineId };
  }
  answerOperatorQuestion(pipelineId, pending[0], answer, 'manual');
  return {
    messages: [{
      source: 'TERMINAL',
      text: `[TERMINAL] Respuesta registrada para la pregunta activa.`,
    }],
    category: 'COMANDO',
    pipeline_id: pipelineId,
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
