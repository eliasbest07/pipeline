/**
 * pilot-loop.js
 * Loop de ejecución del Piloto (AG-01).
 * Corre en background por pipeline. Una decisión por ciclo.
 */

const EventEmitter = require('events');
const { randomUUID } = require('crypto');
const db = require('./db');
const contextManager = require('./context-manager');
const { runAgentWithRetry } = require('./agent-runner');
const { BudgetExceededError, PremiumModelError, getStatus: getBudgetStatus } = require('./budget');

const pipelineEvents = new EventEmitter();
pipelineEvents.setMaxListeners(50);

const activeLoops = new Map();

const MAX_CYCLES = 50;
const CYCLE_DELAY_MS = 500;
const MAX_PARALLEL_DECISIONS = 3;
const QUESTION_TIMEOUT_MS = 15000; // 15 seconds — auto-use suggestion if user doesn't answer
const MAX_CONTEXT_BLOCKS_PER_AGENT = 4;
const MAX_CONTEXT_STRING = 320;

async function startLoop(pipelineId) {
  if (activeLoops.get(pipelineId)?.running) {
    emit(pipelineId, 'message', 'PILOTO', '[PILOTO] El loop ya está en ejecución.');
    return;
  }

  activeLoops.set(pipelineId, { running: true });
  contextManager.upsertAgentState(pipelineId, 'AG-01', {
    estado: 'activo',
    rol: 'piloto',
    accion_actual: 'loop_en_ejecucion',
    ultimo_inicio: new Date().toISOString(),
  });
  contextManager.recordEvent(pipelineId, {
    tipo: 'pilot_loop_started',
    fuente: 'AG-01',
    mensaje: 'El Piloto tomó control de la linea de ensamblaje.',
  });
  emitPipelineEvent('pipeline_started', pipelineId, { agent_id: 'AG-01', status: 'started' });
  emitContextSnapshot(pipelineId);
  emit(pipelineId, 'message', 'PILOTO', '[PILOTO] Iniciando loop de ejecución...');

  runLoop(pipelineId).catch(err => {
    contextManager.setPipelineHealth(pipelineId, {
      estado: 'error',
      drift_detectado: true,
      ultimo_motivo: err.message,
    });
    contextManager.recordEvent(pipelineId, {
      tipo: 'pilot_loop_crash',
      fuente: 'AG-01',
      mensaje: err.message,
    });
    emit(pipelineId, 'error', 'PILOTO', err.message);
    activeLoops.delete(pipelineId);
  });
}

function stopLoop(pipelineId, reason = 'detenido') {
  const loop = activeLoops.get(pipelineId);
  if (!loop) return;

  loop.running = false;
  contextManager.upsertAgentState(pipelineId, 'AG-01', {
    estado: 'pausado',
    rol: 'piloto',
    accion_actual: 'loop_detenido',
    ultimo_motivo: reason,
  });
  contextManager.recordEvent(pipelineId, {
    tipo: 'pilot_loop_stopped',
    fuente: 'AG-01',
    mensaje: `[PILOTO] Loop ${reason}.`,
    payload: { reason },
  });
  emitPipelineEvent(reason === 'contexto_corrupto' ? 'pipeline_corrupted' : 'pipeline_stopped', pipelineId, {
    agent_id: 'AG-01',
    reason,
  });
  emitContextSnapshot(pipelineId);
  emit(pipelineId, 'message', 'PILOTO', `[PILOTO] Loop ${reason}.`);
}

function isRunning(pipelineId) {
  return activeLoops.get(pipelineId)?.running === true;
}

async function runLoop(pipelineId) {
  let ciclo = 0;

  while (ciclo < MAX_CYCLES) {
    const loop = activeLoops.get(pipelineId);
    if (!loop?.running) break;

    const ctx = contextManager.getContext(pipelineId);
    if (!ctx) {
      emit(pipelineId, 'error', 'PILOTO', 'Contexto no encontrado.');
      break;
    }

    const health = assessContextHealth(ctx);
    contextManager.setPipelineHealth(pipelineId, health);
    if (health.reglas_disparadas?.length) {
      contextManager.recordEvent(pipelineId, {
        tipo: 'context_health_evaluated',
        fuente: 'AG-01',
        mensaje: health.resumen || 'Reglas de salud evaluadas.',
        payload: { reglas: health.reglas_disparadas },
      });
    }

    if (shouldStopForHealth({ ...ctx, salud_pipeline: health })) {
      contextManager.setEstado(pipelineId, 'corrupto', {
        detenido_por: 'AG-01',
        motivo_detencion: health.ultimo_motivo || 'contexto_corrupto',
      });
      stopLoop(pipelineId, 'contexto_corrupto');
      activeLoops.delete(pipelineId);
      return;
    }

    if (['completo', 'cancelado', 'corrupto'].includes(ctx.estado)) {
      contextManager.upsertAgentState(pipelineId, 'AG-01', {
        estado: ctx.estado === 'completo' ? 'completado' : 'pausado',
        rol: 'piloto',
        accion_actual: `pipeline_${ctx.estado}`,
      });
      emit(pipelineId, ctx.estado === 'completo' ? 'complete' : 'message', 'PILOTO', `[PILOTO] Pipeline ${ctx.estado}.`);
      activeLoops.delete(pipelineId);
      return;
    }

    if (isPipelineCompleteFromContext(ctx)) {
      contextManager.setEstado(pipelineId, 'completo');
      contextManager.upsertAgentState(pipelineId, 'AG-01', {
        estado: 'completado',
        rol: 'piloto',
        accion_actual: 'pipeline_completo_por_contexto',
      });
      contextManager.recordEvent(pipelineId, {
        tipo: 'pipeline_completed',
        fuente: 'AG-01',
        mensaje: '[PILOTO] ✓ Pipeline completo. Ensamblaje final y bloques requeridos listos.',
      });
      emit(pipelineId, 'message', 'PILOTO', '[PILOTO] ✓ Pipeline completo. Ensamblaje final y bloques requeridos listos.');
      emitPipelineEvent('pipeline_completed', pipelineId, { agent_id: 'AG-01' });
      emit(pipelineId, 'complete', 'PILOTO', '');
      activeLoops.delete(pipelineId);
      return;
    }

    const pendingOperatorQuestions = Array.isArray(ctx?.preguntas_pendientes)
      ? ctx.preguntas_pendientes.filter(item => item?.status !== 'answered')
      : [];
    if (pendingOperatorQuestions.length > 0) {
      // Auto-answer questions that have timed out and have a suggestion/default value
      const now = Date.now();
      for (const q of pendingOperatorQuestions) {
        const createdAt = q.created_at ? new Date(q.created_at).getTime() : null;
        if (!createdAt || (now - createdAt) < QUESTION_TIMEOUT_MS) continue;
        const meta = q.metadata || {};
        const autoAnswer = (q.suggestion && String(q.suggestion).trim())
          || (meta.default_value !== null && meta.default_value !== undefined ? String(meta.default_value) : null)
          || (Array.isArray(meta.opciones) && meta.opciones[0] ? String(meta.opciones[0]) : null);
        if (!autoAnswer) continue;
        emit(pipelineId, 'message', 'PILOTO', `[PILOTO] Timeout: auto-usando sugerencia para "${q.field_key || q.question}": "${autoAnswer}"`);
        emitPipelineEvent('operator_question_auto_answered', pipelineId, { question_id: q.public_id, answer: autoAnswer, field_key: q.field_key });
        // Mark answered in context
        contextManager.upsertOperatorQuestion(pipelineId, { ...q, answer: autoAnswer, answer_origin: 'auto_timeout', status: 'answered' });
        const freshCtx = contextManager.getContext(pipelineId);
        const nextPending = (freshCtx?.preguntas_pendientes || []).filter(item => item.public_id !== q.public_id);
        const requeridas = freshCtx?.preferencias_usuario?._requeridas || {};
        const fieldKey = meta.field_key || q.field_key;
        const nextRequeridas = fieldKey && requeridas[fieldKey]
          ? { ...requeridas, [fieldKey]: { ...requeridas[fieldKey], valor: autoAnswer, resuelta: true } }
          : requeridas;
        contextManager.patchContext(pipelineId, {
          editor: { esperando_input: nextPending.length > 0, pregunta_activa: nextPending[0]?.question || null },
          preguntas_pendientes: nextPending,
          preferencias_usuario: { ...(freshCtx?.preferencias_usuario || {}), _requeridas: nextRequeridas },
          respuestas_usuario: {
            ...(freshCtx?.respuestas_usuario || {}),
            [q.public_id]: { question: q.question, answer: autoAnswer, answer_origin: 'auto_timeout', field_key: fieldKey },
          },
        });
        // Mark the source block as completada if it was waiting for this answer
        const bloqueOrigen = meta.bloque || null;
        if (bloqueOrigen) {
          const ctxForBlock = contextManager.getContext(pipelineId);
          if (ctxForBlock?.bloques?.[bloqueOrigen]?.estado === 'esperando_usuario') {
            contextManager.updateBloque(pipelineId, bloqueOrigen, {
              estado: 'completada',
              resultado: JSON.stringify({ answer: autoAnswer, answered_at: new Date().toISOString() }),
              agente: 'auto_timeout',
            });
            emit(pipelineId, 'message', 'PILOTO', `[PILOTO] Bloque "${bloqueOrigen}" marcado como completado (auto-respuesta).`);
          }
        }
      }
      // Re-read context after potential auto-answers
      const updatedPending = (contextManager.getContext(pipelineId)?.preguntas_pendientes || []).filter(i => i?.status !== 'answered');
      if (!updatedPending.length) {
        await delay(CYCLE_DELAY_MS);
        continue;
      }
      const waitingQuestion = ctx?.editor?.pregunta_activa || updatedPending[0]?.question || 'Esperando respuesta del usuario';
      const pilotState = ctx?.agentes_activos?.['AG-01'] || {};
      const alreadyWaiting = pilotState?.accion_actual === 'esperando_input_operador';

      contextManager.upsertAgentState(pipelineId, 'AG-01', {
        estado: 'pausado',
        rol: 'piloto',
        accion_actual: 'esperando_input_operador',
        ultimo_motivo: waitingQuestion,
      });

      if (!alreadyWaiting) {
        contextManager.recordEvent(pipelineId, {
          tipo: 'pilot_waiting_input',
          fuente: 'AG-01',
          mensaje: `[PILOTO] Esperando input del operador: ${waitingQuestion}`,
          payload: { pregunta: waitingQuestion, total_pendientes: pendingOperatorQuestions.length },
        });
        emit(pipelineId, 'message', 'PILOTO', `[PILOTO] Esperando input del operador: ${waitingQuestion}`);
        emitPipelineEvent('agent_updated', pipelineId, {
          agent_id: 'AG-01',
          status: 'waiting_input',
          question: waitingQuestion,
          total_pending: pendingOperatorQuestions.length,
        });
        emitContextSnapshot(pipelineId);
      }

      await delay(CYCLE_DELAY_MS);
      continue;
    }

    const editorState = ctx?.agentes_activos?.['AG-05'] || {};
    if (editorState?.estado === 'activo' && editorState?.accion_actual === 'recopilar_preferencias') {
      contextManager.upsertAgentState(pipelineId, 'AG-01', {
        estado: 'pausado',
        rol: 'piloto',
        accion_actual: 'esperando_ag05_preferencias',
        ultimo_motivo: 'AG-05 está recopilando preferencias',
      });
      await delay(CYCLE_DELAY_MS);
      continue;
    }

    if (shouldAskForFinalOutputFormat(ctx)) {
      registerQuestionItems(pipelineId, {
        agente_id: 'AG-05',
        accion: 'preguntar_usuario',
      }, [{
        field_key: 'formato_salida',
        question: '¿En qué formato quieres el entregable final? PDF descargable o Video',
        suggestion: 'pdf',
        bloque: 'preferencias_usuario',
        tipo: 'opcion',
        opciones: ['pdf', 'video'],
        default_value: 'pdf',
      }], 'preferencias_usuario', 'preguntar_usuario');
      await delay(CYCLE_DELAY_MS);
      continue;
    }

    if (shouldForceDigestor(ctx)) {
      const forcedDigestorDecision = {
        agente_id: 'AG-07',
        agente_nombre: 'Digestor',
        accion: 'revisar_y_consolidar',
        prioridad: 'high',
        parametros: {},
        bloque_destino: 'revision_final',
        razon: 'Todos los bloques requeridos estan listos y el ensamblaje sigue pendiente.',
        pipeline_completo: false,
        detener_pipeline: false,
      };
      contextManager.recordEvent(pipelineId, {
        tipo: 'forced_digestor_dispatch',
        fuente: 'AG-01',
        mensaje: '[PILOTO] Ensamble pendiente con bloques listos — activando AG-07 automáticamente.',
        payload: forcedDigestorDecision,
      });
      emit(pipelineId, 'message', 'PILOTO', '[PILOTO] Ensamble pendiente con bloques listos — activando AG-07 automáticamente.');
      try {
        const resultado = await executeDecision(pipelineId, forcedDigestorDecision, ctx);
        applyAgentResultToContext(pipelineId, forcedDigestorDecision, resultado);
        emitContextSnapshot(pipelineId);
      } catch (err) {
        emit(pipelineId, 'message', 'PILOTO', `[PILOTO] Error forzando AG-07: ${err.message}`);
      }
      contextManager.incrementCycle(pipelineId);
      ciclo++;
      await delay(CYCLE_DELAY_MS);
      continue;
    }

    // Handle AG-05 dispatch queue before asking pilot
    const dispatchQueue = ctx.ag05_dispatch_queue;
    if (Array.isArray(dispatchQueue) && dispatchQueue.length > 0) {
      const [nextDispatch, ...remaining] = dispatchQueue;
      contextManager.patchContext(pipelineId, { ag05_dispatch_queue: remaining });
      const fakeDecision = {
        agente_id: nextDispatch.agente_id,
        agente_nombre: nextDispatch.agente_id,
        accion: nextDispatch.accion || 'generar',
        prioridad: 'high',
        parametros: nextDispatch.parametros || {},
        bloque_destino: nextDispatch.bloque_destino || null,
        razon: 'Dispatch solicitado por AG-05',
        pipeline_completo: false,
        detener_pipeline: false,
      };
      emit(pipelineId, 'message', 'PILOTO', `[PILOTO] Ejecutando dispatch AG-05 → ${nextDispatch.agente_id} (${nextDispatch.bloque_destino || 'sin bloque'})`);
      emitPipelineEvent('agent_updated', pipelineId, { agent_id: 'AG-01', status: 'dispatching_ag05_queue', next_agent: nextDispatch.agente_id });
      try {
        const resultado = await executeDecision(pipelineId, fakeDecision, ctx);
        applyAgentResultToContext(pipelineId, fakeDecision, resultado);
        emitContextSnapshot(pipelineId);
      } catch (err) {
        emit(pipelineId, 'message', 'PILOTO', `[PILOTO] Error en dispatch AG-05: ${err.message}`);
      }
      contextManager.incrementCycle(pipelineId);
      ciclo++;
      await delay(CYCLE_DELAY_MS);
      continue;
    }

    contextManager.upsertAgentState(pipelineId, 'AG-01', {
      estado: 'activo',
      rol: 'piloto',
      accion_actual: 'evaluando_contexto',
      ciclo_actual: ciclo + 1,
    });
    contextManager.recordEvent(pipelineId, {
      tipo: 'pilot_cycle',
      fuente: 'AG-01',
      mensaje: `[PILOTO] Ciclo ${ciclo + 1} — evaluando contexto...`,
      payload: { ciclo: ciclo + 1 },
    });
    emit(pipelineId, 'cycle', 'PILOTO', `[PILOTO] Ciclo ${ciclo + 1} — evaluando contexto...`);
    emitPipelineEvent('pipeline_tick', pipelineId, { cycle: ciclo + 1, agent_id: 'AG-01' });

    try {
      // ── CAMINO DIRECTO: sigue orden_produccion determinísticamente ──
      // Primario. El LLM solo se usa para casos sin siguiente bloque obvio.
      let nextBlocks = getNextPendingBlocks(ctx, pipelineId);
      if (nextBlocks.length === 1 && nextBlocks[0] === 'clips_video' && ctx?.bloques?.guion_escenas?.estado === 'completada') {
        let guionResult = {};
        try {
          guionResult = JSON.parse(ctx?.bloques?.guion_escenas?.resultado || '{}');
        } catch { /* ignore */ }
        const maybeExpanded = expandVideoStoryboardBlocks(pipelineId, guionResult?.resultado || guionResult);
        if (maybeExpanded) {
          const refreshedCtx = contextManager.getContext(pipelineId);
          nextBlocks = getNextPendingBlocks(refreshedCtx, pipelineId);
        }
      }
      if (nextBlocks.length) {
        const dispatchCtx = contextManager.getContext(pipelineId) || ctx;
        const directDispatches = nextBlocks.map(blockName => ({
          blockName,
          dispatch: getBlockAutoDispatch(blockName, dispatchCtx),
        }));
        const dispatchLabel = directDispatches.map(({ blockName, dispatch }) =>
          `${dispatch.agente_id} (${dispatch.accion_label || dispatch.accion}) bloque="${blockName}"`
        ).join(' | ');
        emit(pipelineId, 'message', 'PILOTO', `[PILOTO] → ${dispatchLabel}`);
        emitPipelineEvent('agent_updated', pipelineId, {
          agent_id: 'AG-01',
          status: 'direct_dispatch',
          next_block: nextBlocks[0],
          next_blocks: nextBlocks,
          next_agent: directDispatches[0].dispatch.agente_id,
        });
        directDispatches.forEach(({ blockName, dispatch }) => {
          contextManager.logDecision(pipelineId, {
            ciclo: ciclo + 1,
            agente: dispatch.agente_id,
            accion: dispatch.accion,
            prioridad: 'high',
            razon: `Siguiente bloque pendiente en orden_produccion: ${blockName}`,
          });
          contextManager.recordEvent(pipelineId, {
            tipo: 'pilot_direct_dispatch',
            fuente: 'AG-01',
            mensaje: `[PILOTO] Direct → ${dispatch.agente_id} / ${blockName}`,
            payload: dispatch,
          });
        });
        const directResults = await Promise.allSettled(
          directDispatches.map(({ dispatch }) => executeDecision(pipelineId, dispatch, dispatchCtx))
        );
        directResults.forEach((result, index) => {
          const { blockName, dispatch } = directDispatches[index];
          if (result.status === 'fulfilled') {
            applyAgentResultToContext(pipelineId, dispatch, result.value);
            return;
          }
          emit(pipelineId, 'message', 'PILOTO', `[PILOTO] Error en bloque "${blockName}": ${result.reason?.message || result.reason}`);
          contextManager.updateBloque(pipelineId, blockName, {
            estado: 'error',
            resultado: JSON.stringify({ error: result.reason?.message || String(result.reason) }),
            agente: dispatch.agente_id,
          });
        });
        emitContextSnapshot(pipelineId);
        const budgetSnapDirect = getBudgetStatus(pipelineId);
        if (budgetSnapDirect) emitPipelineEvent('budget_update', pipelineId, budgetSnapDirect);
        contextManager.incrementCycle(pipelineId);
        ciclo++;
        await delay(CYCLE_DELAY_MS);
        continue;
      }

      // ── CAMINO LLM: sin siguiente bloque obvio → AG-01 decide ──
      // Usado para: dependencias complejas, casos edge, pipelines sin
      // orden_produccion definido, o cuando todos los bloques están listos
      // pero el pipeline aún no se declara completo.
      const seed = contextManager.getSeed(pipelineId);
      const decisionEnvelope = await askPilot(pipelineId, ctx, seed);
      const decisions = normalizePilotDecisions(decisionEnvelope);

      if (!decisions.length) {
        emit(pipelineId, 'message', 'PILOTO', '[PILOTO] Sin decisión del LLM y sin bloques pendientes. Reintentando...');
        await delay(CYCLE_DELAY_MS);
        ciclo++;
        continue;
      }

      for (const decision of decisions) {
        emit(pipelineId, 'decision', 'PILOTO', decision);
        emitPipelineEvent('agent_updated', pipelineId, {
          agent_id: 'AG-01',
          status: 'decision_made',
          decision,
        });
        contextManager.logDecision(pipelineId, {
          ciclo: ciclo + 1,
          agente: decision.agente_id,
          accion: decision.accion,
          prioridad: decision.prioridad,
          razon: decision.razon,
        });
        contextManager.recordEvent(pipelineId, {
          tipo: 'pilot_decision',
          fuente: 'AG-01',
          mensaje: `${decision.agente_id} -> ${decision.accion}`,
          payload: decision,
        });
      }

      const stopDecision = decisions.find(decision => decision.detener_pipeline === true);
      if (stopDecision) {
        const decision = stopDecision;
        const reason = decision.motivo_detencion || decision.razon || 'detenido_por_piloto';
        contextManager.setPipelineHealth(pipelineId, {
          estado: 'warning',
          contexto_corrupto: true,
          ultimo_motivo: reason,
        });
        contextManager.setEstado(pipelineId, 'corrupto', {
          detenido_por: 'AG-01',
          motivo_detencion: reason,
        });
        stopLoop(pipelineId, reason);
        activeLoops.delete(pipelineId);
        return;
      }

      if (decisions.some(decision => decision.pipeline_completo === true)) {
        // Guard: only accept pipeline_completo if all required blocks are actually done (or skipped)
        const reqBlocks = ctx?.template?.seed_template?.bloques_requeridos || [];
        const allDone = reqBlocks.length > 0 && reqBlocks.every(name => {
          const est = ctx?.bloques?.[name]?.estado;
          return est === 'completada' || est === 'omitido_por_bucle';
        });
        if (allDone) {
          contextManager.setEstado(pipelineId, 'completo');
          contextManager.upsertAgentState(pipelineId, 'AG-01', {
            estado: 'completado',
            rol: 'piloto',
            accion_actual: 'pipeline_completo',
          });
          contextManager.recordEvent(pipelineId, {
            tipo: 'pipeline_completed',
            fuente: 'AG-01',
            mensaje: '[PILOTO] ✓ Pipeline completo. Todos los bloques producidos.',
          });
          emit(pipelineId, 'message', 'PILOTO', '[PILOTO] ✓ Pipeline completo. Todos los bloques producidos.');
          emitPipelineEvent('pipeline_completed', pipelineId, { agent_id: 'AG-01' });
          emit(pipelineId, 'complete', 'PILOTO', '');
          activeLoops.delete(pipelineId);
          return;
        }
        emit(pipelineId, 'message', 'PILOTO', `[PILOTO] Advertencia: LLM dijo pipeline_completo pero faltan bloques. Ignorando.`);
      }

      const executableDecisions = decisions
        .filter(decision => !decision.detener_pipeline && !decision.pipeline_completo)
        .filter(decision => shouldExecuteDecision(ctx, decision));

      if (executableDecisions.length === 0 && decisions.length > 0) {
        for (const d of decisions.filter(d2 => !d2.detener_pipeline && !d2.pipeline_completo)) {
          const blockName = d.bloque_destino || d.parametros?.bloque_destino || null;
          const block = blockName ? ctx?.bloques?.[blockName] : null;
          const agentState = ctx?.agentes_activos?.[d.agente_id] || {};
          emit(pipelineId, 'message', 'PILOTO',
            `[PILOTO] Decisión bloqueada: ${d.agente_id}→${d.accion} bloque=${blockName} estado=${block?.estado} agente=${agentState.estado}`
          );
        }
      }

      const results = await Promise.allSettled(
        executableDecisions.slice(0, MAX_PARALLEL_DECISIONS).map(decision =>
          executeDecision(pipelineId, decision, ctx).then(resultado => ({ decision, resultado }))
        )
      );

      for (const item of results) {
        if (item.status === 'fulfilled') {
          applyAgentResultToContext(pipelineId, item.value.decision, item.value.resultado);
        } else {
          throw item.reason;
        }
      }
      emitContextSnapshot(pipelineId);

      // Emit live budget update after each successful cycle
      const budgetSnap = getBudgetStatus(pipelineId);
      if (budgetSnap) emitPipelineEvent('budget_update', pipelineId, budgetSnap);
    } catch (err) {
      // Premium model required → stop and notify user
      if (err instanceof PremiumModelError || err.code === 'PREMIUM_MODEL_REQUIRED') {
        contextManager.setEstado(pipelineId, 'pausado', { motivo_detencion: err.message });
        contextManager.recordEvent(pipelineId, { tipo: 'premium_model_required', fuente: 'AG-01', mensaje: err.message });
        emit(pipelineId, 'message', 'PILOTO', `[PILOTO] ⊘ ${err.message}`);
        emitPipelineEvent('budget_exceeded', pipelineId, { error: err.message, code: 'PREMIUM_MODEL_REQUIRED' });
        stopLoop(pipelineId, 'premium_model_required');
        activeLoops.delete(pipelineId);
        return;
      }

      // Budget exhausted → stop pipeline immediately
      if (err instanceof BudgetExceededError || err.code === 'BUDGET_EXCEEDED') {
        contextManager.setEstado(pipelineId, 'pausado', {
          detenido_por: 'budget',
          motivo_detencion: err.message,
        });
        contextManager.recordEvent(pipelineId, {
          tipo: 'budget_exceeded',
          fuente: 'AG-01',
          mensaje: `[PILOTO] Presupuesto agotado. Pipeline detenido. ${err.message}`,
        });
        emit(pipelineId, 'message', 'PILOTO', `[PILOTO] ⊘ Presupuesto agotado. ${err.message}`);
        const budgetStatus = getBudgetStatus(pipelineId);
        emitPipelineEvent('budget_exceeded', pipelineId, { ...budgetStatus, error: err.message });
        stopLoop(pipelineId, 'budget_exceeded');
        activeLoops.delete(pipelineId);
        return;
      }

      contextManager.setPipelineHealth(pipelineId, {
        estado: 'error',
        drift_detectado: true,
        ultimo_motivo: err.message,
      });
      contextManager.recordEvent(pipelineId, {
        tipo: 'pilot_error',
        fuente: 'AG-01',
        mensaje: `[PILOTO] Error en ciclo ${ciclo + 1}: ${err.message}`,
        payload: { ciclo: ciclo + 1 },
      });
      emit(pipelineId, 'message', 'PILOTO', `[PILOTO] Error en ciclo ${ciclo + 1}: ${err.message}`);
      const ctx2 = contextManager.getContext(pipelineId);
      const lastDecision = ctx2?.historial_decisiones?.slice(-1)[0];
      if (lastDecision?.agente) {
        contextManager.upsertAgentState(pipelineId, lastDecision.agente, {
          estado: 'error',
          accion_actual: lastDecision.accion,
          ultimo_error: err.message,
        });
        pipelineEvents.emit('agent_status', {
          pipeline_id: pipelineId,
          agente_id: lastDecision.agente,
          status: 'error',
          accion: lastDecision.accion,
        });
        emitPipelineEvent('agent_updated', pipelineId, {
          agent_id: lastDecision.agente,
          status: 'error',
          accion: lastDecision.accion,
          error: err.message,
        });
      }
    }

    contextManager.incrementCycle(pipelineId);
    ciclo++;

    if (ciclo > 0 && ciclo % 20 === 0) {
      contextManager.recordEvent(pipelineId, {
        tipo: 'digestor_hint',
        fuente: 'AG-01',
        mensaje: '[PILOTO] 20 ciclos sin completarse — activando AG-07 DIGESTOR.',
      });
      emit(pipelineId, 'message', 'PILOTO', '[PILOTO] 20 ciclos sin completarse — activando AG-07 DIGESTOR.');
    }

    await delay(CYCLE_DELAY_MS);
  }

  if (ciclo >= MAX_CYCLES) {
    contextManager.recordEvent(pipelineId, {
      tipo: 'pilot_limit_reached',
      fuente: 'AG-01',
      mensaje: `[PILOTO] Límite de ${MAX_CYCLES} ciclos alcanzado. Deteniendo.`,
    });
    emit(pipelineId, 'message', 'PILOTO', `[PILOTO] Límite de ${MAX_CYCLES} ciclos alcanzado. Deteniendo.`);
  }

  activeLoops.delete(pipelineId);
}

function shouldStopForHealth(ctx) {
  return Boolean(ctx?.salud_pipeline?.contexto_corrupto);
}

function hasResolvedPreference(ctx, fieldKey, pref = null) {
  const topLevel = ctx?.preferencias_usuario?.[fieldKey];
  const topLevelValue = topLevel?.valor;
  const hasTopLevelValue = topLevelValue !== undefined && topLevelValue !== null && String(topLevelValue).trim() !== '';
  if (hasTopLevelValue) return true;
  if (topLevel?.resuelta === true) return true;
  if (pref?.resuelta === true) return true;
  const prefValue = pref?.valor;
  if (prefValue !== undefined && prefValue !== null && String(prefValue).trim() !== '') return true;
  // Si nunca fue respondida pero tiene sugerencia, se toma el default — no bloquea el pipeline
  const sugerencia = pref?.sugerencia ?? topLevel?.sugerencia;
  return sugerencia !== undefined && sugerencia !== null && String(sugerencia).trim() !== '';
}

function getRevisionDependencies(ctx) {
  const explicit = ctx?.bloques?.revision_final?.depende_de;
  if (Array.isArray(explicit) && explicit.length) return explicit;
  return [];
}

function areBlocksCompleted(ctx, blockNames = []) {
  return blockNames.every(name => ctx?.bloques?.[name]?.estado === 'completada');
}

function shouldAskForFinalOutputFormat(ctx) {
  // Detecta si el tipo de entrega es obvio por el prompt o la semilla
  const promptBase = String(ctx?.preferencias_usuario?.prompt_base?.valor || ctx?.preferencias_usuario?.objetivo?.valor || '').toLowerCase();
  const seedDesc = String(ctx?.template?.seed_template?.descripcion || ctx?.template?.seed_template?.resultado_final || '').toLowerCase();
  const combined = promptBase + ' ' + seedDesc;

  // Si el formato ya está explícito en el prompt, no preguntar
  const isObviouslyVideo = /video|clip|reels?|tiktok|youtube|short/.test(combined);
  const isObviouslyPDF  = /pdf|libro|ebook|guia|manual|documento|curso/.test(combined);
  if (isObviouslyVideo || isObviouslyPDF) return false;

  // Solo preguntar si hay bloques de contenido completados (pipeline produce texto)
  const requiredBlocks = Array.isArray(ctx?.template?.seed_template?.bloques_requeridos) ? ctx.template.seed_template.bloques_requeridos : [];
  if (!requiredBlocks.length) return false;
  const completedCount = requiredBlocks.filter(name => {
    const est = ctx?.bloques?.[name]?.estado;
    return est === 'completada' || est === 'omitido_por_bucle';
  }).length;
  if (completedCount < Math.ceil(requiredBlocks.length * 0.5)) return false; // menos del 50% completado

  if (ctx?.ensamblaje?.estado === 'completado' || ctx?.ensamblaje?.producto_final) return false;
  const formato = ctx?.preferencias_usuario?.formato_salida;
  if (formato?.resuelta === true && String(formato?.valor || '').trim()) return false;
  const pendingQuestions = Array.isArray(ctx?.preguntas_pendientes)
    ? ctx.preguntas_pendientes.filter(item => item?.status !== 'answered')
    : [];
  if (pendingQuestions.some(item => item?.field_key === 'formato_salida')) return false;
  return true;
}

function truncateForLLM(value, maxLen = MAX_CONTEXT_STRING) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (!text) return '';
  return text.length > maxLen ? `${text.slice(0, maxLen)}...[truncated]` : text;
}

function compactForLLM(value, depth = 0) {
  if (value == null) return value;
  if (typeof value === 'string') return truncateForLLM(value, depth === 0 ? 500 : 220);
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, depth === 0 ? 6 : 3).map(item => compactForLLM(item, depth + 1));

  const compacted = {};
  for (const [key, entryValue] of Object.entries(value).slice(0, depth === 0 ? 10 : 6)) {
    compacted[key] = compactForLLM(entryValue, depth + 1);
  }
  return compacted;
}

function summarizePreferencesForLLM(preferencias = {}) {
  const summary = {};
  for (const [key, pref] of Object.entries(preferencias || {})) {
    if (key.startsWith('_')) continue;
    if (pref && typeof pref === 'object' && 'valor' in pref) {
      summary[key] = {
        valor: compactForLLM(pref.valor, 1),
        resuelta: pref.resuelta === true,
      };
      continue;
    }
    summary[key] = compactForLLM(pref, 1);
  }

  const requeridas = Object.values(preferencias?._requeridas || {}).slice(0, 6).map(pref => ({
    campo: pref?.campo || null,
    resuelta: pref?.resuelta === true,
    obligatorio: pref?.obligatorio !== false,
    valor: compactForLLM(pref?.valor, 1),
  }));

  return {
    ...summary,
    _requeridas: requeridas,
  };
}

function summarizeBloquesForLLM(bloques = {}, maxBlocks = MAX_CONTEXT_BLOCKS_PER_AGENT) {
  return Object.fromEntries(
    Object.entries(bloques)
      .slice(0, maxBlocks)
      .map(([key, bloque]) => [key, {
        estado: bloque?.estado || null,
        agente: bloque?.agente || bloque?.agente_responsable || null,
        resultado: truncateForLLM(bloque?.resultado || '', 240),
        nota: truncateForLLM(bloque?.nota || '', 120),
      }])
  );
}

function buildCompactPilotContext(ctx) {
  return {
    pipeline_id: ctx.pipeline_id,
    pipeline_name: ctx.pipeline_name,
    ciclo: ctx.ciclo,
    estado: ctx.estado,
    preferencias_usuario: summarizePreferencesForLLM(ctx.preferencias_usuario || {}),
    bloques: summarizeBloquesForLLM(ctx.bloques || {}, 8),
    agentes_activos: compactForLLM(ctx.agentes_activos || {}, 1),
    ensamblaje: compactForLLM(ctx.ensamblaje || {}, 1),
    preguntas_pendientes: compactForLLM(ctx.preguntas_pendientes || [], 1),
    respuestas_usuario: compactForLLM(ctx.respuestas_usuario || {}, 1),
    cola_tareas: compactForLLM(Array.isArray(ctx.cola_tareas) ? ctx.cola_tareas.slice(0, 6) : [], 1),
    salud_pipeline: compactForLLM(ctx.salud_pipeline || {}, 1),
    overrides_pendientes: compactForLLM(ctx.overrides_pendientes || [], 1),
    ag05_dispatch_queue: compactForLLM(ctx.ag05_dispatch_queue || [], 1),
  };
}

function shouldExecuteDecision(ctx, decision) {
  const blockName = decision?.bloque_destino || decision?.parametros?.bloque_destino || decision?.parametros?.bloque || null;
  if (!blockName) return true;
  const block = ctx?.bloques?.[blockName];
  if (block?.estado === 'completada') return false;
  if (block?.estado === 'esperando_usuario') return false;
  const agentState = ctx?.agentes_activos?.[decision?.agente_id] || {};
  const sameAction = agentState?.accion_actual === decision?.accion;
  const sameBlock = (agentState?.parametros?.bloque_destino || agentState?.parametros?.bloque || null) === blockName;
  if (agentState?.estado === 'activo' && sameAction && sameBlock) return false;
  // Enforce dependencies from seed template
  const seedOrder = ctx?.template?.seed_template?.orden_produccion;
  if (Array.isArray(seedOrder)) {
    const paso = seedOrder.find(p => p.bloque === blockName);
    const dependeDe = resolveDependencyBlockNames(seedOrder, paso?.depende_de);
    if (paso && dependeDe.length) {
      const blockedBy = dependeDe.filter(dep => {
        const depBlock = ctx?.bloques?.[dep];
        return !depBlock || (depBlock.estado !== 'completada' && depBlock.estado !== 'omitido_por_bucle');
      });
      if (blockedBy.length) {
        return false; // dependency not met
      }
    }
  }
  return true;
}

function assessContextHealth(ctx) {
  const rules = [];
  const bloques = ctx?.bloques || {};
  const assets = ctx?.assets || {};
  const requiredBlocks = Array.isArray(ctx?.template?.seed_template?.bloques_requeridos)
    ? ctx.template.seed_template.bloques_requeridos
    : [];
  const requiredPrefs = ctx?.preferencias_usuario?._requeridas || {};

  // missing_seed_template: the /start endpoint already blocks pipelines without seed,
  // so inside the loop this is a warning — not a reason to stop execution.
  if (ctx?.template?.activo && !ctx?.template?.seed_template) {
    rules.push({ code: 'missing_seed_template', severity: 'warning', detail: 'Existe template activo pero falta seed_template en contexto.' });
  }

  // missing_required_blocks: at cycle 0-1 all blocks are still pendiente (not yet assigned),
  // treat as warning so the pilot can populate them naturally.
  const missingRequiredBlocks = requiredBlocks.filter(name => !bloques[name]);
  if (missingRequiredBlocks.length) {
    rules.push({ code: 'missing_required_blocks', severity: 'warning', detail: `Faltan bloques requeridos: ${missingRequiredBlocks.join(', ')}` });
  }

  Object.entries(bloques).forEach(([name, block]) => {
    const assetId = block?.asset_actual;
    if (assetId && !assets[assetId]) {
      rules.push({ code: 'dangling_asset_reference', severity: 'warning', detail: `El bloque ${name} apunta a asset_actual inexistente: ${assetId}` });
      return;
    }
    if (assetId && ['reemplazado', 'descartado', 'error'].includes(assets[assetId]?.estado)) {
      rules.push({ code: 'obsolete_asset_selected', severity: 'warning', detail: `El bloque ${name} mantiene como actual un asset obsoleto: ${assetId}` });
    }
    if (block?.estado === 'completada' && !block?.resultado && !block?.asset_actual) {
      rules.push({ code: 'completed_block_without_traceability', severity: 'warning', detail: `El bloque ${name} está completado sin resultado ni asset_actual.` });
    }
  });

  const assemblyAssetIds = Array.isArray(ctx?.ensamblaje?.asset_ids) ? ctx.ensamblaje.asset_ids : [];
  const invalidAssemblyAssets = assemblyAssetIds.filter(id => !assets[id] || ['reemplazado', 'descartado', 'error'].includes(assets[id]?.estado));
  if (invalidAssemblyAssets.length) {
    rules.push({ code: 'invalid_assembly_assets', severity: 'warning', detail: `Ensamblaje referencia assets inválidos: ${invalidAssemblyAssets.join(', ')}` });
  }

  const unresolvedRequiredPrefs = Object.entries(requiredPrefs)
    .filter(([key, pref]) => pref?.obligatorio && !hasResolvedPreference(ctx, key, pref))
    .map(([key]) => key);
  const completedRequiredCount = requiredBlocks.filter(name => bloques[name]?.estado === 'completada').length;
  if (completedRequiredCount > 0 && unresolvedRequiredPrefs.length) {
    rules.push({ code: 'required_preferences_missing', severity: 'warning', detail: `Hay preferencias obligatorias sin resolver: ${unresolvedRequiredPrefs.join(', ')}` });
  }

  const revision = bloques.revision_final?.resultado_estructurado || null;
  if (revision?.estado_general === 'bloqueado' || Array.isArray(revision?.errores_sin_resolver) && revision.errores_sin_resolver.length) {
    rules.push({
      code: 'digestor_detected_blocker',
      severity: 'warning',
      detail: revision?.resumen_ejecutivo || revision?.recomendacion_piloto || 'AG-07 detectó bloqueo en la revisión final.',
    });
  }

  const critical = rules.filter(rule => rule.severity === 'critical');
  const warning = rules.filter(rule => rule.severity === 'warning');
  const estado = critical.length ? 'error' : (warning.length ? 'warning' : 'ok');
  return {
    estado,
    drift_detectado: warning.length > 0 || critical.length > 0,
    contexto_corrupto: critical.length > 0,
    ultimo_motivo: (critical[0] || warning[0])?.detail || null,
    reglas_disparadas: rules,
    resumen: rules.length ? rules.map(rule => `${rule.code}: ${rule.detail}`).join(' | ') : 'Contexto consistente.',
  };
}

function isPipelineCompleteFromContext(ctx) {
  const required = ctx?.template?.seed_template?.bloques_requeridos || [];
  const allRequiredReady = required.length > 0 && required.every(name => {
    const est = ctx?.bloques?.[name]?.estado;
    return est === 'completada' || est === 'omitido_por_bucle';
  });
  const requiredPrefs = ctx?.preferencias_usuario?._requeridas || {};
  const unresolvedRequiredPrefs = Object.entries(requiredPrefs)
    .filter(([key, pref]) => pref?.obligatorio && !hasResolvedPreference(ctx, key, pref))
    .map(([key]) => key);
  const completedBlocksWithoutTraceability = required.filter(name => {
    const block = ctx?.bloques?.[name];
    return block?.estado === 'completada' && !block?.resultado && !block?.asset_actual;
  });
  const pendingQuestions = Array.isArray(ctx?.preguntas_pendientes)
    ? ctx.preguntas_pendientes.filter(item => item?.status !== 'answered')
    : [];
  const finalProduct = ctx?.ensamblaje?.producto_final;
  const revisionDone = ctx?.bloques?.revision_final?.estado === 'completada' || ctx?.bloques?.revision_final?.estado === 'omitido_por_bucle';
  // Assembly is ready if: explicit completado state, or producto_final exists, or revision_final ran (AG-07 completed)
  const assemblyReady = Boolean(finalProduct) || ctx?.ensamblaje?.estado === 'completado' || revisionDone;
  return allRequiredReady
    && assemblyReady
    && unresolvedRequiredPrefs.length === 0
    && completedBlocksWithoutTraceability.length === 0
    && pendingQuestions.length === 0;
}

// Block-to-agent mapping for video/content pipelines
const SEED_BLOCK_AGENT_MAP = {
  // ── Preferencias / onboarding ──────────────────────────────────
  'preferencias_usuario':     { agente_id: 'AG-05', accion: 'recopilar_preferencias_usuario' },
  // ── Investigación ──────────────────────────────────────────────
  'investigacion_temas':      { agente_id: 'AG-06', accion: 'realizar_investigacion' },
  'investigacion_contenido':  { agente_id: 'AG-06', accion: 'realizar_investigacion' },
  'investigacion':            { agente_id: 'AG-06', accion: 'realizar_investigacion' },
  'notas_investigacion':      { agente_id: 'AG-06', accion: 'realizar_investigacion' },
  'referencias':              { agente_id: 'AG-06', accion: 'realizar_investigacion' },
  'datos_mercado':            { agente_id: 'AG-06', accion: 'realizar_investigacion' },
  // ── Texto ──────────────────────────────────────────────────────
  'guion_escenas':            { agente_id: 'AG-03', accion: 'generar_guion' },
  'guion_narrativo':          { agente_id: 'AG-03', accion: 'generar_guion' },
  'guion':                    { agente_id: 'AG-03', accion: 'generar_guion' },
  'escritura_guion':          { agente_id: 'AG-03', accion: 'generar_guion' },
  'script':                   { agente_id: 'AG-03', accion: 'generar_guion' },
  'prompts_escenas':          { agente_id: 'AG-03', accion: 'generar_prompts_escenas' },
  'titulo':                   { agente_id: 'AG-03', accion: 'generar_titulo' },
  'sinopsis':                 { agente_id: 'AG-03', accion: 'generar_sinopsis' },
  'estructura_capitulos':     { agente_id: 'AG-03', accion: 'generar_estructura' },
  'estructura_modulos':       { agente_id: 'AG-03', accion: 'generar_estructura' },
  'contenido_modulos':        { agente_id: 'AG-03', accion: 'generar_contenido' },
  'materiales_pdf':           { agente_id: 'AG-03', accion: 'generar_contenido' },
  'pdf_ilustrado':            { agente_id: 'AG-03', accion: 'generar_contenido' },
  'manual_pdf':               { agente_id: 'AG-03', accion: 'generar_contenido' },
  'guia_pdf':                 { agente_id: 'AG-03', accion: 'generar_contenido' },
  'ebook':                    { agente_id: 'AG-03', accion: 'generar_contenido' },
  'documento_final':          { agente_id: 'AG-03', accion: 'generar_contenido' },
  'capitulos_contenido':      { agente_id: 'AG-03', accion: 'escribir_capitulo' },
  'escritura_contenido':      { agente_id: 'AG-03', accion: 'generar_contenido' },
  'subtitulos':               { agente_id: 'AG-03', accion: 'generar_subtitulos' },
  'subtitles':                { agente_id: 'AG-03', accion: 'generar_subtitulos' },
  'captions':                 { agente_id: 'AG-03', accion: 'generar_subtitulos' },
  'narración':                { agente_id: 'AG-03', accion: 'generar_narracion' },
  'narracion':                { agente_id: 'AG-03', accion: 'generar_narracion' },
  // ── Imagen (fal.ai Flux) ───────────────────────────────────────
  'imagenes_escenas':         { agente_id: 'AG-04', accion: 'generar_imagenes' },
  'imagenes_escena':          { agente_id: 'AG-04', accion: 'generar_imagenes' },
  'escenas_imagen':           { agente_id: 'AG-04', accion: 'generar_imagenes' },
  'imagenes_portada':         { agente_id: 'AG-04', accion: 'generar_imagen' },
  'imagenes_capitulos':       { agente_id: 'AG-04', accion: 'generar_imagen' },
  'thumbnails':               { agente_id: 'AG-04', accion: 'generar_imagen' },
  'miniatura':                { agente_id: 'AG-04', accion: 'generar_imagen' },
  // ── Video (Veo3 / KLING) — todas las variantes de nombre ──────
  'clips_video':              { agente_id: 'AG-04', accion: 'generar_video' },
  'edicion_video':            { agente_id: 'AG-04', accion: 'generar_video' },
  'produccion_video':         { agente_id: 'AG-04', accion: 'generar_video' },
  'videos_cinematograficos':  { agente_id: 'AG-04', accion: 'generar_video' },
  'video_clips':              { agente_id: 'AG-04', accion: 'generar_video' },
  'clips_cinematograficos':   { agente_id: 'AG-04', accion: 'generar_video' },
  'escenas_video':            { agente_id: 'AG-04', accion: 'generar_video' },
  'video_escenas':            { agente_id: 'AG-04', accion: 'generar_video' },
  'video_principal':          { agente_id: 'AG-04', accion: 'generar_video' },
  'video':                    { agente_id: 'AG-04', accion: 'generar_video' },
  'clips':                    { agente_id: 'AG-04', accion: 'generar_video' },
  // ── Control ───────────────────────────────────────────────────
  'revision_final':           { agente_id: 'AG-07', accion: 'revisar_y_consolidar' },
  'ensamblaje':               { agente_id: 'AG-07', accion: 'revisar_y_consolidar' },
  // ── Video assembly (SKL-08) ────────────────────────────────────
  'video_ensamblado':         { agente_id: 'AG-07', accion: 'ensamblar_video' },
  'video_final':              { agente_id: 'AG-07', accion: 'ensamblar_video' },
  'video_final_ensamblado':   { agente_id: 'AG-07', accion: 'ensamblar_video' },
  'ensamblaje_video':         { agente_id: 'AG-07', accion: 'ensamblar_video' },
  'video_completo':           { agente_id: 'AG-07', accion: 'ensamblar_video' },
  'video_montaje':            { agente_id: 'AG-07', accion: 'ensamblar_video' },
};

// Patterns para resolver bloques con nombres libres generados por AG-00
const BLOCK_PATTERN_MAP = [
  // Specific patterns FIRST to avoid being shadowed by broader ones
  { pattern: /subtit|caption|srt/i,                                        map: { agente_id: 'AG-03', accion: 'generar_subtitulos' } },
  { pattern: /video_final|video_ensamblado|video_completo|ensambl.*video|montaje.*video|video.*montaje/i, map: { agente_id: 'AG-07', accion: 'ensamblar_video' } },
  { pattern: /revision|revisión|digestor/i,                                map: { agente_id: 'AG-07', accion: 'revisar_y_consolidar' } },
  // Investigación — before guion to avoid false positives
  { pattern: /investigacion|investigación|research|busqueda|tendencia|referencia|dato.*mercado/i, map: { agente_id: 'AG-06', accion: 'realizar_investigacion' } },
  { pattern: /preferencia/i,                                               map: { agente_id: 'AG-05', accion: 'recopilar_preferencias_usuario' } },
  // Texto
  { pattern: /pdf|ebook|manual|guia|guía|documento|dossier|material(es)?/i, map: { agente_id: 'AG-03', accion: 'generar_contenido' } },
  { pattern: /guion|script|narraci|narrac|prompt.*imagen|imagen.*prompt|escritura|contenido|modulo|capitulo|leccion/i, map: { agente_id: 'AG-03', accion: 'generar_guion' } },
  // Media
  { pattern: /edicion.*video|produccion.*video|video|clip|cinemat/i,       map: { agente_id: 'AG-04', accion: 'generar_video' } },
  { pattern: /imagen|image|foto|thumb|portada|miniatura/i,                 map: { agente_id: 'AG-04', accion: 'generar_imagen' } },
];

const BLOCK_ERROR_COUNTS = {}; // { pipelineId: { blockName: count } }

function resolveDependencyBlockNames(seedOrder = [], dependeDe = []) {
  if (!Array.isArray(dependeDe) || dependeDe.length === 0) return [];
  return dependeDe
    .map(dep => {
      if (typeof dep === 'number') {
        return seedOrder.find(step => Number(step?.paso) === dep)?.bloque || null;
      }
      const depStr = String(dep || '').trim();
      if (/^\d+$/.test(depStr)) {
        return seedOrder.find(step => Number(step?.paso) === Number(depStr))?.bloque || null;
      }
      return depStr || null;
    })
    .filter(Boolean);
}

function getNextPendingBlock(ctx, pipelineId) {
  const orden = ctx?.template?.seed_template?.orden_produccion || [];
  const debugStates = Object.fromEntries(orden.map(p => [p.bloque, ctx?.bloques?.[p.bloque]?.estado || 'MISSING']));
  console.log(`[DEBUG getNextPendingBlock] block states:`, JSON.stringify(debugStates));
  const pipelineCounts = BLOCK_ERROR_COUNTS[pipelineId] || (BLOCK_ERROR_COUNTS[pipelineId] = {});
  for (const paso of orden) {
    const bloque = ctx?.bloques?.[paso.bloque];
    const estado = bloque?.estado;
    if (estado === 'completada' || estado === 'esperando_usuario') continue;
    if (estado === 'omitido_por_bucle') continue;
    if (estado === 'error') {
      const retryCount = pipelineCounts[paso.bloque] || 0;
      if (retryCount >= 2) {
        console.log(`[PILOTO] Bloque "${paso.bloque}" alcanzó max reintentos (${retryCount}) — marcando omitido_por_bucle`);
        contextManager.updateBloque(pipelineId, paso.bloque, { estado: 'omitido_por_bucle' });
        continue;
      }
      pipelineCounts[paso.bloque] = retryCount + 1;
    } else {
      pipelineCounts[paso.bloque] = 0;
    }
    const depsMet = resolveDependencyBlockNames(orden, paso.depende_de).every(dep => {
      const depEstado = ctx?.bloques?.[dep]?.estado;
      return depEstado === 'completada' || depEstado === 'error'; // treat error deps as unblocking
    });
    if (depsMet) return paso.bloque;
  }
  return null;
}

function getNextPendingBlocks(ctx, pipelineId, maxCount = MAX_PARALLEL_DECISIONS) {
  const orden = ctx?.template?.seed_template?.orden_produccion || [];
  const ready = [];
  let parallelAgent = null;
  let parallelAction = null;

  for (const paso of orden) {
    const bloque = ctx?.bloques?.[paso.bloque];
    const estado = bloque?.estado;
    if (estado === 'completada' || estado === 'esperando_usuario' || estado === 'omitido_por_bucle') continue;

    const depsMet = resolveDependencyBlockNames(orden, paso.depende_de).every(dep => {
      const depEstado = ctx?.bloques?.[dep]?.estado;
      return depEstado === 'completada' || depEstado === 'error';
    });

    if (!depsMet) {
      if (!ready.length) continue;
      break;
    }

    const dispatch = getBlockAutoDispatch(paso.bloque, ctx);
    const isParallelMedia = Boolean(paso.puede_paralelizarse)
      && dispatch.agente_id === 'AG-04'
      && (dispatch.accion === 'generar_imagen' || dispatch.accion === 'generar_video');

    if (!ready.length) {
      ready.push(paso.bloque);
      if (!isParallelMedia) break;
      parallelAgent = dispatch.agente_id;
      parallelAction = dispatch.accion;
      continue;
    }

    if (!isParallelMedia) break;
    if (dispatch.agente_id !== parallelAgent || dispatch.accion !== parallelAction) break;
    ready.push(paso.bloque);
    if (ready.length >= maxCount) break;
  }

  return ready;
}

function getBlockAutoDispatch(blockName, ctx) {
  const block = ctx?.bloques?.[blockName] || {};
  // 1. Exact match in map
  let mapEntry = SEED_BLOCK_AGENT_MAP[blockName];
  // 2. Pattern fallback for free-form block names generated by AG-00
  if (!mapEntry) {
    mapEntry = BLOCK_PATTERN_MAP.find(p => p.pattern.test(blockName))?.map || null;
    if (mapEntry) console.log(`[pilot] block "${blockName}" matched by pattern → ${mapEntry.agente_id}/${mapEntry.accion}`);
  }
  let agente_id = mapEntry?.agente_id || block.agente_responsable || 'AG-03';
  // Always use canonical accion from map — accion_inicial from AG-00 is free-form and may not match system prompt
  const accion    = mapEntry?.accion || block.accion_inicial || 'generar';
  // Use AG-00's accion_inicial as a human-readable label for log messages
  const accion_label = block.accion_inicial || accion;
  if (agente_id === 'AG-02' && mapEntry?.agente_id && mapEntry.agente_id !== 'AG-02') {
    agente_id = mapEntry.agente_id;
  }
  return {
    agente_id,
    agente_nombre: agente_id,
    accion,
    accion_label,
    prioridad: 'high',
    parametros: {},
    bloque_destino: blockName,
    razon: `Auto-dispatch: próximo bloque pendiente con dependencias resueltas`,
    pipeline_completo: false,
    detener_pipeline: false,
  };
}

function shouldForceDigestor(ctx) {
  if (ctx?.ensamblaje?.estado === 'completado' || ctx?.ensamblaje?.producto_final) return false;
  const pendingQuestions = Array.isArray(ctx?.preguntas_pendientes)
    ? ctx.preguntas_pendientes.filter(item => item?.status !== 'answered').length
    : 0;
  if (pendingQuestions !== 0) return false;
  const revisionBlock = ctx?.bloques?.revision_final;
  if (!revisionBlock) return false;
  if (revisionBlock.estado === 'completada' && revisionBlock.resultado) return false;
  const revisionDependencies = getRevisionDependencies(ctx);
  if (!revisionDependencies.length) return false;
  return areBlocksCompleted(ctx, revisionDependencies);
}

async function askPilot(pipelineId, ctx, seed) {
  const seedBlock = seed
    ? `\n\n--- SEMILLA ACTIVA ---\n${JSON.stringify(seed.seed_template, null, 2)}\n---`
    : '';

  const prefBlock = ctx?.preferencias_usuario?.objetivo?.valor || ctx?.preferencias_usuario?.prompt_base?.valor
    ? `\n\n--- OBJETIVO DEL USUARIO ---\n${ctx.preferencias_usuario.objetivo?.valor || ctx.preferencias_usuario.prompt_base?.valor}\n---`
    : '';

  // Build next-step hint for the pilot based on seed order
  const seedOrder = ctx?.template?.seed_template?.orden_produccion || [];
  const nextPendingBlock = seedOrder.find(p => {
    const b = ctx?.bloques?.[p.bloque];
    if (!b || b.estado === 'completada' || b.estado === 'esperando_usuario') return false;
    return (p.depende_de || []).every(dep => ctx?.bloques?.[dep]?.estado === 'completada');
  });
  const nextHint = nextPendingBlock
    ? `\n\nPRÓXIMO BLOQUE PENDIENTE (con dependencias resueltas): "${nextPendingBlock.bloque}" — debes despachar el agente correcto para este bloque ahora.`
    : '';

  const prompt = `Ciclo ${(ctx.ciclo || 0) + 1}. Evalúa el estado del pipeline y decide el próximo paso.${prefBlock}${nextHint}${seedBlock}

REGLAS OBLIGATORIAS:
- DESPACHA el próximo bloque pendiente del seed template en orden. No saltes, no audites, no limpies hasta que todos los bloques requeridos estén completados.
- Un bloque "completada" ya terminó — NO lo reasignes ni lo toques de ninguna forma.
- AGENTES: AG-03=texto/guiones/prompts, AG-04=imágenes y video clips, AG-05=preguntas al usuario, AG-06=investigación, AG-07=revisión final/ensamblaje.
- Bloques de TEXTO (→ AG-03): guion*, script*, narraci*, subtit*, caption*, titulo, sinopsis, estructura*, capitulo*
- Bloques de IMAGEN (→ AG-04 accion="generar_imagen"): imagen*, foto*, thumb*, portada, miniatura
- Bloques de VIDEO (→ AG-04 accion="generar_video"): clips_video, videos_*, video_*, clip*, *cinemat*, escenas_video — CUALQUIER bloque cuyo nombre contenga "video" o "clip" debe despacharse a AG-04 con accion="generar_video"
- Bloques de REVISIÓN (→ AG-07): revision_final, ensamblaje, *final*
- NUNCA despachar AG-02 para generar contenido real — AG-02 solo orquesta subtareas, no genera assets
- Las preferencias del template ya están resueltas si preferencias_usuario._requeridas muestra "resuelta: true" en todos sus campos. No preguntes más preferencias.
- Solo usa AG-05 "preguntar_usuario" si necesitas una decisión NUEVA del usuario que no existe en el contexto.
- Solo marca "pipeline_completo": true si TODOS los bloques_requeridos del seed tienen estado "completada" Y AG-07 ya produjo el producto final.
- Solo marca "detener_pipeline": true si detectas corrupción crítica.

Responde SOLO con este JSON (sin markdown):
{
  "decisiones": [
    {
      "agente_id": "AG-XX",
      "agente_nombre": "...",
      "accion": "...",
      "prioridad": "critical|high|normal|low",
      "parametros": {},
      "bloque_destino": "nombre_del_bloque_o_null",
      "razon": "...",
      "pipeline_completo": false,
      "detener_pipeline": false,
      "motivo_detencion": null
    }
  ]
}`;

  // Slim context — exclude heavy event logs that don't help the pilot decide
  const pilotCtx = buildCompactPilotContext(ctx);

  try {
    let pilotModelInfo = null;
    const raw = await runAgentWithRetry('AG-01', prompt, pilotCtx, {
      pipelineId,
      onModelResolved: info => {
        pilotModelInfo = info;
        emitPipelineEvent('agent_updated', pipelineId, {
          agent_id: 'AG-01',
          status: 'model_used',
          provider: info.provider,
          model: info.model,
        });
        emit(pipelineId, 'message', 'PILOTO', `[PILOTO] Llamando LLM: ${info.provider}/${info.model}`);
      },
    });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (err) {
    contextManager.recordEvent(pipelineId, {
      tipo: 'pilot_query_error',
      fuente: 'AG-01',
      mensaje: `[PILOTO] Error consultando AG-01: ${err.message}`,
    });
    emit(pipelineId, 'message', 'PILOTO', `[PILOTO] Error consultando AG-01: ${err.message}`);
    return null;
  }
}

/**
 * Direct video assembly: extracts all /uploads/ video URLs from completed blocks,
 * calls SKL-08/merge_videos directly (no LLM), saves result to context.
 */
async function executeVideoAssembly(pipelineId, decision, ctx) {
  const skills = require('./skills');
  const target = decision.bloque_destino || decision.parametros?.bloque_destino || 'video_ensamblado';
  const tag = '[AG-07]';

  emit(pipelineId, 'message', 'AG-07', `${tag} Ensamblando video — buscando clips en contexto...`);

  // Collect local video URLs from completed blocks in order
  const rawBloques = ctx?.bloques || {};
  const clipEntries = Object.entries(rawBloques)
    .filter(([, v]) => v?.estado === 'completada')
    .flatMap(([bloque, v]) => {
      try {
        const r = JSON.parse(v.resultado || '{}');
        if (r.video_url && (r.video_url.startsWith('/uploads/') || r.video_url.startsWith('/pipeline-outputs/'))) {
          return [{ bloque, url: r.video_url, path: require('path').join(__dirname, 'public', r.video_url) }];
        }
      } catch { /* ignore */ }
      return [];
    })
    .sort((a, b) => a.bloque.localeCompare(b.bloque)); // sort clip_video_1 < clip_video_2 etc.

  if (clipEntries.length < 2) {
    const err = `ensamblar_video: se necesitan al menos 2 clips, encontrados: ${clipEntries.length}`;
    console.error(`[pilot] ${err}`);
    contextManager.updateBloque(pipelineId, target, { estado: 'error', resultado: JSON.stringify({ error: err }), agente: 'AG-07' });
    return;
  }

  const videoPaths = clipEntries.map(e => e.path);
  const pipelineId_ = ctx?.pipeline?.id || pipelineId;
  console.log(`[pilot] SKL-08 merge_videos: ${videoPaths.length} clips → video_final_ensamblado`);
  emit(pipelineId, 'message', 'AG-07', `${tag} SKL-08: uniendo ${videoPaths.length} clips (${videoPaths.map(p => require('path').basename(p)).join(', ')})`);

  let skillResult;
  try {
    skillResult = await skills.run({
      skill: 'SKL-08',
      accion: 'merge_videos',
      parametros: {
        videos: videoPaths,
        nombre_archivo: 'video_final_ensamblado',
        fps: 30,
      },
    }, pipelineId_);
  } catch (err) {
    console.error(`[pilot] SKL-08 error:`, err.message);
    contextManager.updateBloque(pipelineId, target, { estado: 'error', resultado: JSON.stringify({ error: err.message }), agente: 'AG-07' });
    return;
  }

  if (skillResult?.skill_error) {
    const errMsg = skillResult.skill_error.error;
    console.error(`[pilot] SKL-08 skill_error:`, errMsg);
    contextManager.updateBloque(pipelineId, target, { estado: 'error', resultado: JSON.stringify({ error: errMsg }), agente: 'AG-07' });
    return;
  }

  const outputPath = skillResult?.resultado?.path || '';
  const videoUrl = `/pipeline-outputs/${pipelineId_}/${outputPath}`;
  const sizeMb = skillResult?.resultado?.tamano_mb || '?';
  const clipsUnidos = skillResult?.resultado?.videos_unidos || clipEntries.length;

  const resultado = {
    video_url: videoUrl,
    clips_unidos: clipsUnidos,
    clips_fuentes: clipEntries.map(e => e.url),
    tamano_mb: sizeMb,
    pipeline_estado: 'completo',
  };

  console.log(`[pilot] SKL-08 OK → ${videoUrl} (${sizeMb}MB)`);
  emit(pipelineId, 'message', 'AG-07', `${tag} ✓ Video ensamblado → ${videoUrl} (${sizeMb}MB, ${clipsUnidos} clips)`);

  contextManager.updateBloque(pipelineId, target, {
    estado: 'completada',
    resultado: JSON.stringify(resultado),
    resultado_estructurado: resultado,
    agente: 'AG-07',
  });

  contextManager.updateAssembly(pipelineId, {
    estado: 'completado',
    producto_final: JSON.stringify(resultado),
    notas: `Video final ensamblado: ${videoUrl}`,
  });

  emitPipelineEvent('assembly_ready', pipelineId, {
    agent_id: 'AG-07',
    estado: 'completado',
    producto_final: resultado,
    video_url: videoUrl,
  });
}

async function executeDecision(pipelineId, decision, ctx) {
  // ── Hard override: redirect video/image blocks to AG-04 ────────
  // AG-01 (LLM) sometimes dispatches AG-02/AG-03 for media blocks.
  // We enforce the correct agent here at execution time.
  const _overrideBlock = decision.bloque_destino || decision.parametros?.bloque_destino || '';
  const _mapOverride = SEED_BLOCK_AGENT_MAP[_overrideBlock]
    || BLOCK_PATTERN_MAP.find(p => p.pattern.test(_overrideBlock))?.map;

  if (_mapOverride && decision.agente_id !== _mapOverride.agente_id) {
    console.log(`[pilot] override: block="${_overrideBlock}" ${decision.agente_id}/${decision.accion} → ${_mapOverride.agente_id}/${_mapOverride.accion}`);
    decision = { ...decision, agente_id: _mapOverride.agente_id, accion: _mapOverride.accion };
  }
  // ──────────────────────────────────────────────────────────────

  // ── Direct handler: ensamblar_video bypasses LLM, calls SKL-08 directly ──
  if (decision.accion === 'ensamblar_video' || _mapOverride?.accion === 'ensamblar_video') {
    return executeVideoAssembly(pipelineId, decision, ctx);
  }

  const { agente_id, accion, parametros = {}, prioridad } = decision;
  const label = agente_id.replace('AG-', '');
  const tag = `[AG-${label}]`;
  const runId = randomUUID();
  let modelInfo = null;
  let mediaModelInfo = null;

  pipelineEvents.emit('agent_status', { pipeline_id: pipelineId, agente_id, status: 'activo', accion });
  emitPipelineEvent('agent_started', pipelineId, { agent_id: agente_id, status: 'activo', accion, prioridad });
  contextManager.upsertAgentState(pipelineId, agente_id, {
    estado: 'activo',
    accion_actual: accion,
    prioridad,
    parametros,
    ultimo_inicio: new Date().toISOString(),
  });
  contextManager.recordEvent(pipelineId, {
    tipo: 'agent_started',
    fuente: agente_id,
    mensaje: `${tag} Ejecutando: ${accion} [${prioridad}]`,
    payload: { parametros },
  });
  db.insertAgentRun.run(
    runId,
    pipelineId,
    agente_id,
    decision.origen || 'pilot_loop',
    accion,
    decision.bloque_destino || parametros.bloque_destino || null,
    'running',
    null,
    JSON.stringify({ decision, parametros, ctx_ciclo: ctx?.ciclo || 0 }),
    null
  );
  emit(pipelineId, 'message', agente_id, `${tag} Ejecutando: ${accion} [${prioridad}]`);

  const targetBlock = decision.bloque_destino || parametros.bloque_destino || null;
  const agentInput = buildAgentInput(pipelineId, agente_id, accion, parametros, targetBlock, ctx);
  // Specialist agents already have their context embedded in agentInput (contextSlice).
  // Passing the full ctx as the 3rd arg would serialize it AGAIN into the LLM message.
  // Only pass empty object so agent-runner doesn't prepend a duplicate context block.
  const IS_MEDIA_AGENT = agente_id === 'AG-04';
  const resultado = await runAgentWithRetry(agente_id, agentInput, {}, {
    pipelineId,
    onModelResolved: info => {
      modelInfo = info;
      emitPipelineEvent('agent_updated', pipelineId, {
        agent_id: agente_id,
        status: 'model_used',
        accion,
        provider: info.provider,
        model: info.model,
      });
      emit(pipelineId, 'message', agente_id, `${tag} Llamando LLM: ${info.provider}/${info.model}`);
    },
    onMediaModelResolved: info => {
      mediaModelInfo = info;
      emitPipelineEvent('agent_updated', pipelineId, {
        agent_id: agente_id,
        status: 'media_model_used',
        accion,
        media_provider: info.provider,
        media_model: info.model,
      });
      emit(pipelineId, 'message', agente_id, `${tag} Motor media: ${info.provider}/${info.model}`);
    },
    onChunk: IS_MEDIA_AGENT ? undefined : (delta) => {
      emitPipelineEvent('agent_stream', pipelineId, { agent_id: agente_id, delta });
    },
  });

  pipelineEvents.emit('agent_status', { pipeline_id: pipelineId, agente_id, status: 'completado', accion });
  emitPipelineEvent('agent_updated', pipelineId, { agent_id: agente_id, status: 'completado', accion });
  contextManager.upsertAgentState(pipelineId, agente_id, {
    estado: 'completado',
    accion_actual: accion,
    ultimo_resultado: typeof resultado === 'string' ? resultado.slice(0, 2000) : resultado,
    ultimo_fin: new Date().toISOString(),
  });
  contextManager.recordEvent(pipelineId, {
    tipo: 'agent_done',
    fuente: agente_id,
    mensaje: `${tag} ✓ ${accion} completado`,
  });
  db.insertAgentRun.run(
    randomUUID(),
    pipelineId,
    agente_id,
    'agent_result',
    accion,
    targetBlock,
    'done',
    typeof resultado === 'string' ? resultado.slice(0, 4000) : JSON.stringify(resultado),
    JSON.stringify({ parent_run_id: runId }),
    null
  );
  emit(pipelineId, 'message', agente_id, `${tag} ✓ ${accion} completado`);

  return resultado;
}

function applyAgentResultToContext(pipelineId, decision, rawResult) {
  const parsed = parseAgentResult(rawResult);
  const resultPayload = parsed?.resultado ?? parsed ?? rawResult;
  const serializedResult = parsed ? serializeStructuredResult(parsed.resultado) : serializeStructuredResult(rawResult);
  // decision.bloque_destino (set by direct dispatch) takes priority over LLM-inferred bloque_destino
  const explicitTarget = decision.bloque_destino || decision.parametros?.bloque_destino || parsed?.bloque_destino || null;
  const target = resolveTargetBlock(explicitTarget);
  let outputRecord = null;

  const fallbackQuestionItems = buildQuestionItemsFromDecision(decision, target);

  if (!parsed) {
    if (decision.agente_id === 'AG-05') {
      if (fallbackQuestionItems.length) {
        registerQuestionItems(pipelineId, decision, fallbackQuestionItems, target, decision.accion);
        return;
      }
      // Fallback: create question from seed preferencias_requeridas when model returned garbage
      const seedCtxUnparsed = contextManager.getContext(pipelineId);
      const requeridasUnparsed = Object.values(seedCtxUnparsed?.preferencias_usuario?._requeridas || {});
      const pendingUnparsed = requeridasUnparsed.filter(pref =>
        !pref?.resuelta && (pref?.valor === undefined || pref?.valor === null || String(pref?.valor || '').trim() === '')
      );
      if (pendingUnparsed.length) {
        const promptBaseUnparsed = seedCtxUnparsed?.preferencias_usuario?.prompt_base || seedCtxUnparsed?.preferencias_usuario?.objetivo || '';
        const seedItems = pendingUnparsed.slice(0, 1).map(pref => {
          const baseSug = pref.sugerencia || pref.suggestion || pref.default_value || '';
          const suggestion = baseSug || inferSugerenciaFromContexto(
            pref.campo || '',
            pref.pregunta || '',
            promptBaseUnparsed,
            pref.opciones,
          );
          return {
            field_key: pref.campo || 'preferencia',
            question: pref.pregunta || `¿${pref.campo}?`,
            suggestion,
            bloque: 'preferencias_usuario',
            tipo: pref.tipo || 'texto',
            opciones: Array.isArray(pref.opciones) ? pref.opciones : [],
            default_value: pref.default_value || suggestion || null,
          };
        });
        registerQuestionItems(pipelineId, decision, seedItems, 'preferencias_usuario', 'recopilar_preferencias_usuario');
        return;
      }
    }
    // Only update block when rawResult has actual content — avoid overwriting blocks
    // that were already updated directly (e.g. executeVideoAssembly returns void)
    if (target && rawResult != null) {
      contextManager.updateBloque(pipelineId, target, {
        estado: 'completada',
        resultado: typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult, null, 2),
        resultado_estructurado: null,
        agente: decision.agente_id,
      });
    }
    return;
  }

  // AG-05 coordination: coordinar_regeneracion or agente_sugerido → queue dispatch
  if (decision.agente_id === 'AG-05' && parsed.resultado?.agente_sugerido) {
    const agSugerido = parsed.resultado.agente_sugerido;
    const nuevoPrompt = parsed.resultado.nuevo_prompt || null;
    const bloqueDestino = parsed.resultado.bloque || target;
    const ctx0 = contextManager.getContext(pipelineId);
    const cola = Array.isArray(ctx0?.ag05_dispatch_queue) ? ctx0.ag05_dispatch_queue : [];
    if (!cola.some(d => d.bloque_destino === bloqueDestino && d.agente_id === agSugerido)) {
      contextManager.patchContext(pipelineId, {
        ag05_dispatch_queue: [...cola, {
          agente_id: agSugerido,
          accion: nuevoPrompt ? 'generar_con_prompt' : 'generar',
          parametros: { prompt: nuevoPrompt, bloque_destino: bloqueDestino },
          bloque_destino: bloqueDestino,
          solicitado_en: new Date().toISOString(),
        }],
      });
      emit(pipelineId, 'message', 'AG-05', `[AG-05] Coordinando dispatch → ${agSugerido} para bloque "${bloqueDestino}"`);
      emitPipelineEvent('agent_updated', pipelineId, {
        agent_id: 'AG-05',
        status: 'coordination_queued',
        next_agent: agSugerido,
        bloque: bloqueDestino,
      });
    }
  }

  // AG-05 question cards: soportar una pregunta única o arrays de preguntas.
  if (decision.agente_id === 'AG-05') {
    const questionItems = buildQuestionItemsFromParsedResult(parsed, decision, target);
    if (questionItems.length) {
      registerQuestionItems(pipelineId, decision, questionItems, target, parsed.accion);
      return;
    }
    if (fallbackQuestionItems.length) {
      registerQuestionItems(pipelineId, decision, fallbackQuestionItems, target, parsed.accion || decision.accion);
      return;
    }
    // Fallback: if the model returned no questions AND didn't capture real preferences,
    // build questions directly from seed preferencias_requeridas
    {
      const capturedPrefs = parsed?.resultado?.preferencias_capturadas;
      const hasMeaningfulCapture = capturedPrefs &&
        Object.values(capturedPrefs).some(v => v !== null && v !== undefined && String(v || '').trim() !== '');
      if (!hasMeaningfulCapture) {
        const seedCtx = contextManager.getContext(pipelineId);
        const requeridas = Object.values(seedCtx?.preferencias_usuario?._requeridas || {});
        const pendingRequeridas = requeridas.filter(pref =>
          !pref?.resuelta && (pref?.valor === undefined || pref?.valor === null || String(pref?.valor || '').trim() === '')
        );
        if (pendingRequeridas.length) {
          const promptBase = seedCtx?.preferencias_usuario?.prompt_base || seedCtx?.preferencias_usuario?.objetivo || '';
          const seedItems = pendingRequeridas.slice(0, 1).map(pref => {
            const baseSug = pref.sugerencia || pref.suggestion || pref.default_value || '';
            const suggestion = baseSug || inferSugerenciaFromContexto(
              pref.campo || pref.field_key || '',
              pref.pregunta || pref.question || '',
              promptBase,
              pref.opciones,
            );
            return {
              field_key: pref.campo || pref.field_key || 'preferencia',
              question: pref.pregunta || pref.question || `¿${pref.campo}?`,
              suggestion,
              bloque: 'preferencias_usuario',
              tipo: pref.tipo || 'texto',
              opciones: Array.isArray(pref.opciones) ? pref.opciones : [],
              default_value: pref.default_value || suggestion || null,
            };
          });
          registerQuestionItems(pipelineId, decision, seedItems, 'preferencias_usuario', 'recopilar_preferencias_usuario');
          return;
        }
      }
    }
    if (parsed.accion === 'preguntar_usuario' || decision.accion === 'preguntar_usuario') {
      return;
    }
  }

  if (target === 'preferencias_usuario' && parsed.resultado?.preferencias_capturadas) {
    const current = contextManager.getContext(pipelineId);
    contextManager.patchContext(pipelineId, {
      preferencias_usuario: {
        ...(current?.preferencias_usuario || {}),
        ...wrapCapturedPreferences(parsed.resultado.preferencias_capturadas),
        _recopilacion_completada: true,
      },
    });
    // Mark block done so pilot doesn't re-assign indefinitely
    contextManager.updateBloque(pipelineId, 'preferencias_usuario', {
      estado: 'completada',
      resultado: serializeStructuredResult(parsed.resultado.preferencias_capturadas),
      agente: decision.agente_id,
    });
    return;
  }

  if (target === 'guion_escenas' && parsed.estado !== 'error') {
    expandVideoStoryboardBlocks(pipelineId, parsed.resultado);
  }

  let assetRecord = null;
  if (parsed.asset && target && !['revision_final', 'estado_pipeline'].includes(target)) {
    // For media assets (imagen/video), only use contenido if it looks like a real URL
    const rawContenido = parsed.asset.contenido;
    const isMediaAsset = ['imagen', 'video'].includes(parsed.asset.tipo_asset);
    const hasRealUrl = rawContenido && typeof rawContenido === 'string' && (
      rawContenido.startsWith('http://')
      || rawContenido.startsWith('https://')
      || rawContenido.startsWith('/uploads/')
      || rawContenido.startsWith('/pipeline-outputs/')
    );
    const resolvedContenido = isMediaAsset
      ? (hasRealUrl ? rawContenido : null)      // never fall back to text for media
      : (rawContenido || serializedResult);
    assetRecord = contextManager.registerAssetRevision(pipelineId, target, {
      estado: (parsed.estado === 'error' || (isMediaAsset && !hasRealUrl)) ? 'error' : 'listo',
      estado_bloque: (parsed.estado === 'error' || (isMediaAsset && !hasRealUrl)) ? 'error' : 'completada',
      prompt: parsed.asset.prompt || null,
      contenido: resolvedContenido,
      agente_sugerido: decision.agente_id,
      tipo_asset: parsed.asset.tipo_asset || inferAssetType(decision.agente_id),
      metadata: {
        ...(parsed.asset.metadata || {}),
        accion: parsed.accion,
        bloque_destino: target,
        estado: parsed.estado || 'ok',
      },
    }, { previousStatus: 'reemplazado' });
    emitPipelineEvent('asset_ready', pipelineId, {
      agent_id: decision.agente_id,
      asset_id: assetRecord?.asset_id || null,
      bloque: target,
      tipo_asset: assetRecord?.tipo_asset || parsed.asset.tipo_asset || null,
      estado: assetRecord?.estado || parsed.estado || 'ok',
      asset: assetRecord || null,
    });
  }

  const runtimeOutputContent = parsed.asset?.contenido || serializedResult;
  if (runtimeOutputContent && runtimeOutputContent !== 'null' && runtimeOutputContent !== '{}' && runtimeOutputContent !== '""') {
    outputRecord = contextManager.upsertRuntimeOutput(pipelineId, {
      agent_id: decision.agente_id,
      tipo: normalizeOutputType(parsed, decision.agente_id),
      estado: parsed.estado === 'error' ? 'error' : 'done',
      bloque: target,
      contenido: runtimeOutputContent,
      metadata: {
        accion: parsed.accion || decision.accion,
        bloque_destino: target,
        parsed_resultado: parsed.resultado || null,
        asset_id: assetRecord?.asset_id || null,
        asset_tipo: assetRecord?.tipo_asset || parsed.asset?.tipo_asset || null,
        siguiente_sugerido: parsed.siguiente_sugerido || null,
        error: parsed.error || null,
      },
    });
    emitPipelineEvent('output_ready', pipelineId, {
      agent_id: decision.agente_id,
      output: outputRecord,
    });
  }

  if (target) {
    contextManager.updateBloque(pipelineId, target, {
      estado: parsed.estado === 'error' ? 'error' : 'completada',
      resultado: serializedResult,
      resultado_estructurado: parsed.resultado,
      resultado_resumen: buildResultSummary(parsed.resultado),
      agente: decision.agente_id,
      asset_actual: assetRecord?.asset_id || undefined,
    });
  }

  if (decision.agente_id === 'AG-07' || target === 'revision_final') {
    const ctx = contextManager.getContext(pipelineId);
    const assetsVigentes = contextManager.getVigenteAssetsFromContext(ctx);
    const runtimeOutputs = contextManager.getVigenteOutputs(pipelineId);
    const assemblyReady = Boolean(
      parsed.resultado?.pipeline_estado === 'completo' ||
      parsed.resultado?.estado_general === 'listo' ||
      parsed.resultado?.estado_general === 'con_advertencias' ||
      parsed.resultado?.ensamblaje_listo === true ||
      parsed.resultado?.producto_final ||
      parsed.resultado?.pdf_url ||
      parsed.resultado?.video_url
    );
    contextManager.updateAssembly(pipelineId, {
      estado: assemblyReady ? 'completado' : 'en_revision',
      producto_final: serializeStructuredResult(parsed.resultado),
      notas: buildResultSummary(parsed.resultado),
      asset_ids: assetsVigentes.map(asset => asset.asset_id),
      output_ids: runtimeOutputs.map(output => output.public_id),
      outputs_vigentes_snapshot: runtimeOutputs.map(output => ({
        public_id: output.public_id,
        tipo: output.tipo || null,
        bloque: output.bloque || null,
        estado: output.estado || null,
      })),
      assets_vigentes_snapshot: assetsVigentes.map(asset => ({
        asset_id: asset.asset_id,
        bloque: asset.bloque || null,
        tipo_asset: asset.tipo_asset || null,
        estado: asset.estado || null,
      })),
    });
    const nextCtx = contextManager.getContext(pipelineId);
    emitPipelineEvent('assembly_ready', pipelineId, {
      agent_id: decision.agente_id,
      estado: assemblyReady ? 'completado' : 'en_revision',
      asset_ids: assetsVigentes.map(asset => asset.asset_id),
      output_ids: runtimeOutputs.map(output => output.public_id),
      producto_final: nextCtx?.ensamblaje?.producto_final || serializeStructuredResult(parsed.resultado),
      context: nextCtx,
    });
  }
}

function inferStoryboardClipCount(ctx, guionResult = {}) {
  const guion = guionResult?.guion;
  if (Array.isArray(guion) && guion.length) return Math.min(Math.max(guion.length, 1), 6);

  const promptBase = String(
    ctx?.preferencias_usuario?.prompt_base?.valor
    || ctx?.preferencias_usuario?.objetivo?.valor
    || ''
  ).toLowerCase();
  const explicitClips = promptBase.match(/(\d+)\s*clips?/i);
  if (explicitClips?.[1]) return Math.min(Math.max(Number(explicitClips[1]), 1), 6);

  const explicitSeconds = promptBase.match(/(\d+)\s*seg/i);
  if (explicitSeconds?.[1]) {
    const estimated = Math.ceil(Number(explicitSeconds[1]) / 5);
    return Math.min(Math.max(estimated, 1), 6);
  }

  return 3;
}

function buildStoryboardScenes(ctx, guionResult = {}) {
  const desiredCount = inferStoryboardClipCount(ctx, guionResult);
  const rawScenes = Array.isArray(guionResult?.guion) ? guionResult.guion : [];
  const globalTheme = String(ctx?.preferencias_usuario?.tema_clips?.valor || ctx?.preferencias_usuario?.objetivo?.valor || '').trim();
  const productionNotes = Array.isArray(guionResult?.notas_produccion) ? guionResult.notas_produccion : [];
  const sharedVisualStyle = [
    'Mantener el mismo personaje, paleta de color, tipo de iluminacion y lenguaje visual en todas las escenas.',
    productionNotes.length ? `Notas de produccion: ${productionNotes.join(' | ')}` : null,
    globalTheme ? `Tema central: ${globalTheme}` : null,
  ].filter(Boolean).join(' ');

  return Array.from({ length: desiredCount }, (_, index) => {
    const scene = rawScenes[index] || {};
    const title = String(scene?.titulo || `Escena ${index + 1}`).trim();
    const content = String(scene?.contenido || scene?.descripcion || scene?.texto || `${globalTheme || 'Video corto'} escena ${index + 1}`).trim();
    const transition = String(scene?.transicion || '').trim();
    const duration = String(scene?.duracion || '5 segundos').trim();
    return {
      index: index + 1,
      title,
      content,
      transition,
      duration,
      visualBible: sharedVisualStyle,
    };
  });
}

function buildStoryboardOrderFromScenes(scenes = []) {
  const order = [
    {
      paso: 1,
      bloque: 'preferencias_usuario',
      agente: 'AG-05',
      accion: 'recopilar_preferencias_usuario',
      depende_de: [],
      requiere_aprobacion_usuario: false,
      puede_paralelizarse: false,
      nota: 'Recopilar preferencias del video.',
    },
    {
      paso: 2,
      bloque: 'guion_escenas',
      agente: 'AG-03',
      accion: 'generar_guion',
      depende_de: ['preferencias_usuario'],
      requiere_aprobacion_usuario: false,
      puede_paralelizarse: false,
      nota: 'Crear el guion dividido por escenas.',
    },
  ];

  const imageBlocks = scenes.map(scene => `imagen_escena_${scene.index}`);
  const clipBlocks = scenes.map(scene => `clip_video_${scene.index}`);

  scenes.forEach((scene) => {
    const imageBlock = `imagen_escena_${scene.index}`;

    order.push({
      paso: order.length + 1,
      bloque: imageBlock,
      agente: 'AG-04',
      accion: 'generar_imagen',
      depende_de: ['guion_escenas'],
      requiere_aprobacion_usuario: false,
      puede_paralelizarse: true,
      nota: `Escena ${scene.index}: ${scene.title}. ${scene.content}. ${scene.visualBible}`,
      metadata: {
        scene_index: scene.index,
        scene_title: scene.title,
        scene_content: scene.content,
        clip_duration_seconds: 5,
        visual_bible: scene.visualBible,
      },
    });
  });

  scenes.forEach((scene) => {
    const clipBlock = `clip_video_${scene.index}`;
    const imageBlock = `imagen_escena_${scene.index}`;
    order.push({
      paso: order.length + 1,
      bloque: clipBlock,
      agente: 'AG-04',
      accion: 'generar_video',
      depende_de: imageBlocks,
      requiere_aprobacion_usuario: false,
      puede_paralelizarse: true,
      nota: `Convertir imagen de la escena ${scene.index} en clip de 5 segundos. ${scene.content}${scene.transition ? ` Transicion sugerida: ${scene.transition}.` : ''} ${scene.visualBible}`,
      metadata: {
        scene_index: scene.index,
        scene_title: scene.title,
        scene_content: scene.content,
        clip_duration_seconds: 5,
        visual_bible: scene.visualBible,
      },
    });
  });

  order.push({
    paso: order.length + 1,
    bloque: 'video_ensamblado',
    agente: 'AG-07',
    accion: 'ensamblar_video',
    depende_de: clipBlocks,
    requiere_aprobacion_usuario: false,
    puede_paralelizarse: false,
    nota: `Unir ${scenes.length} clips de 5 segundos en el video final.`,
  });

  order.push({
    paso: order.length + 1,
    bloque: 'revision_final',
    agente: 'AG-07',
    accion: 'revisar_y_consolidar',
    depende_de: ['video_ensamblado'],
    requiere_aprobacion_usuario: false,
    puede_paralelizarse: false,
    nota: 'Validar que el video final sea descargable y consistente.',
  });

  return order;
}

function expandVideoStoryboardBlocks(pipelineId, guionResult = {}) {
  const ctx = contextManager.getContext(pipelineId);
  if (!ctx) return false;

  const seedTemplate = ctx?.template?.seed_template || {};
  const alreadyExpanded = Array.isArray(seedTemplate?.orden_produccion)
    && seedTemplate.orden_produccion.some(step => /^imagen_escena_\d+$/i.test(step?.bloque || ''));
  if (alreadyExpanded) return false;

  const scenes = buildStoryboardScenes(ctx, guionResult);
  if (!scenes.length) return false;

  const newOrder = buildStoryboardOrderFromScenes(scenes);
  const requiredBlocks = newOrder.map(step => step.bloque);
  const hydratedAt = new Date().toISOString();
  const existingBlocks = { ...(ctx.bloques || {}) };

  newOrder.forEach((step, index) => {
    existingBlocks[step.bloque] = {
      ...(existingBlocks[step.bloque] || {}),
      nombre: step.bloque,
      estado: existingBlocks[step.bloque]?.estado || (step.bloque === 'guion_escenas' ? 'completada' : 'pendiente'),
      paso: index + 1,
      agente_responsable: step.agente,
      accion_inicial: step.accion,
      depende_de: Array.isArray(step.depende_de) ? step.depende_de : [],
      requiere_aprobacion_usuario: Boolean(step.requiere_aprobacion_usuario),
      puede_paralelizarse: Boolean(step.puede_paralelizarse),
      nota: step.nota || null,
      metadata: step.metadata || existingBlocks[step.bloque]?.metadata || null,
      actualizado_en: hydratedAt,
    };
  });

  if (existingBlocks.clips_video) {
    existingBlocks.clips_video = {
      ...existingBlocks.clips_video,
      estado: 'expandido',
      nota: 'Bloque generico reemplazado por clip_video_1..N',
      actualizado_en: hydratedAt,
    };
  }

  const newQueue = newOrder.map(step => {
    const existingTask = (ctx.cola_tareas || []).find(task => task?.bloque === step.bloque);
    return {
      tarea_id: existingTask?.tarea_id || `${step.agente}-${step.paso}-${step.bloque}`,
      paso: step.paso,
      bloque: step.bloque,
      agente: step.agente,
      accion: step.accion,
      depende_de: Array.isArray(step.depende_de) ? step.depende_de : [],
      estado: existingBlocks[step.bloque]?.estado === 'completada' ? 'completada' : 'pendiente',
      prioridad: existingTask?.prioridad || 'normal',
      paralelizable: Boolean(step.puede_paralelizarse),
      actualizado_en: hydratedAt,
    };
  });

  contextManager.patchContext(pipelineId, {
    template: {
      seed_template: {
        ...seedTemplate,
        bloques_requeridos: requiredBlocks,
        orden_produccion: newOrder,
      },
    },
    bloques: existingBlocks,
    cola_tareas: newQueue,
  });

  contextManager.recordEvent(pipelineId, {
    tipo: 'storyboard_expanded',
    fuente: 'AG-01',
    mensaje: `El piloto expandio el storyboard a ${scenes.length} escenas con imagen y clip por escena.`,
    payload: {
      escenas: scenes.map(scene => ({
        index: scene.index,
        title: scene.title,
        content: scene.content,
      })),
    },
  });

  emit(pipelineId, 'message', 'PILOTO', `[PILOTO] Storyboard expandido a ${scenes.length} escenas: imagen_escena_n -> clip_video_n -> ensamblaje.`);
  emitContextSnapshot(pipelineId);
  return true;
}

// Returns only the blocks relevant to each agent, to avoid sending unnecessary context.
function getAgentBloques(agente_id, bloqueDestino, allBloques) {
  // AG-07 needs all blocks (already trimmed below)
  if (agente_id === 'AG-07') return allBloques;
  // AG-02 needs all blocks to coordinate parallel tasks
  if (agente_id === 'AG-02') return allBloques;
  // AG-06 (investigador) does fresh research — no block history needed
  if (agente_id === 'AG-06') return {};
  // All other agents: target block + completed research/notes blocks for context
  const relevant = {};
  if (bloqueDestino && allBloques[bloqueDestino]) {
    relevant[bloqueDestino] = allBloques[bloqueDestino];
  }
  // For writers: also include completed research blocks so they can reference them
  if (agente_id === 'AG-03') {
    Object.entries(allBloques).forEach(([key, val]) => {
      if (key !== bloqueDestino && /investigacion|research|notas_piloto/i.test(key) && val?.estado === 'completada') {
        const b = { ...val };
        if (typeof b.resultado === 'string' && b.resultado.length > 500) b.resultado = b.resultado.slice(0, 500) + '…';
        delete b.resultado_estructurado;
        relevant[key] = b;
      }
    });
  }
  return relevant;
}

function buildAgentInput(pipelineId, agente_id, accion, parametros, bloqueDestino, ctx) {
  const activosVigentes = agenteUsaEnsamblaje(accion, bloqueDestino)
    ? contextManager.getVigenteAssetsFromContext(ctx)
    : [];
  const outputsVigentes = agenteUsaEnsamblaje(accion, bloqueDestino)
    ? contextManager.getVigenteOutputs(pipelineId)
    : [];
  const runtimeOutputs = contextManager.getRuntimeOutputs(pipelineId);

  // For AG-07: trim block results to prevent context overflow
  const rawBloques = ctx?.bloques || {};
  const isAG07Action = accion === 'revisar_y_consolidar' || accion === 'ensamblar_video';
  const trimmedBloques = isAG07Action
    ? Object.fromEntries(Object.entries(rawBloques).map(([k, v]) => {
        if (!v) return [k, v];
        const b = { ...v };
        if (typeof b.resultado === 'string' && b.resultado.length > 600) {
          b.resultado = b.resultado.slice(0, 600) + '...[ver asset completo]';
        }
        delete b.resultado_estructurado;
        return [k, b];
      }))
    : rawBloques;

  // Apply per-agent block filtering: each agent only gets what it needs
  const bloques = getAgentBloques(agente_id, bloqueDestino, trimmedBloques);

  // For generar_video on clip_video_N: inject corresponding imagen_escena_N URL for image-to-video
  let scene_image_url = null;
  if ((accion === 'generar_video' || /clip.*video|video.*clip/i.test(bloqueDestino || '')) && bloqueDestino) {
    // Map clip_video_N → imagen_escena_N
    const numMatch = bloqueDestino.match(/(\d+)/);
    if (numMatch) {
      const n = numMatch[1];
      const imgBlock = Object.entries(trimmedBloques).find(([k]) =>
        /imagen.*escena|escena.*imagen|imagen_escena/i.test(k) && k.includes(n)
      );
      if (imgBlock) {
        try {
          const imgRes = JSON.parse(imgBlock[1].resultado || '{}');
          // Prefer local URL, fallback to CDN URL
          scene_image_url = imgRes.imagen_url || imgRes.image_url || null;
        } catch { /* ignore */ }
      }
    }
  }

  // For ensamblar_video: extract all local video URLs from completed blocks
  let video_clips_disponibles = null;
  if (accion === 'ensamblar_video') {
    video_clips_disponibles = Object.entries(trimmedBloques)
      .filter(([, v]) => v?.estado === 'completada')
      .flatMap(([bloque, v]) => {
        try {
          const r = JSON.parse(v.resultado || '{}');
          if (r.video_url) return [{ bloque, video_url: r.video_url }];
        } catch { /* ignore */ }
        return [];
      })
      .filter(({ video_url }) => video_url && (video_url.startsWith('/uploads/') || video_url.startsWith('/pipeline-outputs/')));
  }

  // Agents that need assembly/asset data (AG-07, AG-02, and AG-04/AG-05 for ensamblaje)
  const needsAssembly = agenteUsaEnsamblaje(accion, bloqueDestino);
  const needsAllAssets = agente_id === 'AG-07' || agente_id === 'AG-02';

  const contextSlice = {
    pipeline: ctx?.pipeline || {},
    template: {
      activo: ctx?.template?.activo || null,
      metodologia: ctx?.template?.metodologia || null,
    },
    preferencias_usuario: ctx?.preferencias_usuario || {},
    bloques,
    ...(needsAllAssets ? { assets: ctx?.assets || {} } : {}),
    ...(needsAssembly || needsAllAssets ? {
      outputs: runtimeOutputs,
      ensamblaje: {
        ...(ctx?.ensamblaje || {}),
        assets_vigentes: activosVigentes,
        asset_ids_vigentes: activosVigentes.map(asset => asset.asset_id),
        outputs_vigentes: outputsVigentes,
        output_ids_vigentes: outputsVigentes.map(output => output.public_id),
      },
    } : {}),
  };
  const compactContextSlice = {
    pipeline: compactForLLM(contextSlice.pipeline, 1),
    template: compactForLLM(contextSlice.template, 1),
    preferencias_usuario: summarizePreferencesForLLM(contextSlice.preferencias_usuario || {}),
    bloques: summarizeBloquesForLLM(contextSlice.bloques || {}, agente_id === 'AG-07' ? 8 : MAX_CONTEXT_BLOCKS_PER_AGENT),
    ...(needsAllAssets ? { assets: compactForLLM(contextSlice.assets || {}, 1) } : {}),
    ...(needsAssembly || needsAllAssets ? {
      outputs: compactForLLM((contextSlice.outputs || []).slice(0, 6), 1),
      ensamblaje: compactForLLM(contextSlice.ensamblaje || {}, 1),
    } : {}),
  };

  const videoClipsSection = video_clips_disponibles
    ? `\n\nVIDEO CLIPS DISPONIBLES PARA ENSAMBLAR (en orden):\n${JSON.stringify(video_clips_disponibles, null, 2)}\n\nPara unir estos videos usa la skill SKL-08 incluyendo en tu respuesta:\n{\n  "skill": "SKL-08",\n  "accion": "merge_videos",\n  "parametros": {\n    "videos": [lista de video_url en orden],\n    "nombre_archivo": "video_final_ensamblado"\n  }\n}`
    : '';

  const sceneImageSection = scene_image_url
    ? `\n\nIMAGEN DE REFERENCIA PARA ESTE CLIP (usa como primer frame / image-to-video):\n${scene_image_url}\nPasa este URL como "image_url" en tu respuesta para que el generador de video use esta imagen como punto de partida visual.`
    : '';

  return `Ejecuta la acción: "${accion}"
Bloque destino esperado: ${bloqueDestino || 'null'}
Parametros: ${JSON.stringify(parametros, null, 2)}${sceneImageSection}${videoClipsSection}

Debes leer el contexto operativo y responder SOLO con JSON valido usando este contrato:
{
  "estado": "ok|error",
  "accion": "${accion}",
  "bloque_destino": "${bloqueDestino || 'null'}",
  "resultado": {},
  "asset": {
    "tipo_asset": "texto|imagen|investigacion|audio|video|web|null",
    "prompt": "prompt usado o null",
    "contenido": "contenido principal o url o null",
    "metadata": {}
  },
  "error": null,
  "siguiente_sugerido": null
}

Contexto operativo relevante:
${JSON.stringify(compactContextSlice, null, 2)}`;
}

function parseAgentResult(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const jsonMatch = raw.match(/```json\n?([\s\S]*?)\n?```/) || raw.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
  } catch {
    return null;
  }
}

function normalizePilotDecisions(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const list = Array.isArray(raw.decisiones) ? raw.decisiones : [raw];
  const seen = new Set();
  return list
    .filter(item => item && typeof item === 'object' && item.agente_id && item.accion)
    .filter(item => {
      const key = [item.agente_id, item.accion, item.bloque_destino || '', JSON.stringify(item.parametros || {})].join('::');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_PARALLEL_DECISIONS);
}

function resolveTargetBlock(path) {
  if (!path || path === 'null') return null;
  if (path.includes('.')) return path.split('.').filter(Boolean).slice(-2, -1)[0] || path.split('.').pop();
  return path;
}

function agenteUsaEnsamblaje(accion, bloqueDestino) {
  return accion === 'revisar_y_consolidar' || accion === 'ensamblar_video'
    || bloqueDestino === 'revision_final' || bloqueDestino === 'video_ensamblado'
    || bloqueDestino === 'video_final' || bloqueDestino === 'video_final_ensamblado';
}

function inferAssetType(agentId) {
  if (agentId === 'AG-04') return 'imagen';
  if (agentId === 'AG-06') return 'investigacion';
  if (agentId === 'AG-03') return 'texto';
  return 'dato';
}

function inferQuestionSuggestionFromText(questionText) {
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

/**
 * Genera una sugerencia de respuesta basada en el campo requerido y el prompt_base del pipeline.
 * Actúa como fallback cuando AG-00 no incluyó sugerencia en el seed template.
 *
 * @param {string} campo - Nombre del campo (ej: "nombre_curso", "duracion_video")
 * @param {string} pregunta - Texto de la pregunta
 * @param {string} promptBase - El prompt semilla del usuario (ej: "curso online completo")
 * @param {string[]} opciones - Opciones disponibles (si tipo=opcion)
 * @returns {string} Sugerencia concreta y plausible
 */
function inferSugerenciaFromContexto(campo, pregunta, promptBase, opciones) {
  const c = String(campo || '').toLowerCase().replace(/[-\s]/g, '_');
  const p = String(pregunta || '').toLowerCase();
  const pb = String(promptBase || '').toLowerCase();

  // Si hay opciones definidas, usar la primera como sugerencia
  if (Array.isArray(opciones) && opciones.length > 0) {
    return String(opciones[0]);
  }

  // Detectar tipo de contenido del prompt base
  const esCurso = /curso|clase|lección|módulo|formación|entrenamiento|bootcamp|enseñanza/i.test(pb);
  const esVideo = /video|youtube|tiktok|reels|corto|vlog|documental/i.test(pb);
  const esPodcast = /podcast|audio|episodio|radio/i.test(pb);
  const esArticulo = /artículo|blog|post|texto|contenido/i.test(pb);
  const esImagen = /imagen|diseño|poster|banner|arte|gráfico/i.test(pb);
  const esApp = /app|aplicación|software|plataforma|sistema/i.test(pb);

  // ── CAMPOS DE NOMBRE / TÍTULO ──────────────────────────────────
  if (/nombre|titulo|title|name/.test(c)) {
    if (esCurso) return `Curso Completo: ${extraerTemaDe(pb)}`;
    if (esVideo) return `${extraerTemaDe(pb)} — Guía Definitiva`;
    if (esPodcast) return `El Podcast de ${extraerTemaDe(pb)}`;
    if (esArticulo) return `Guía Completa de ${extraerTemaDe(pb)}`;
    return `Proyecto: ${extraerTemaDe(pb)}`;
  }

  // ── CAMPOS DE DURACIÓN ─────────────────────────────────────────
  if (/duracion|duración|duration|tiempo|horas|minutos|longitud/.test(c)) {
    if (esCurso) return '40 horas totales (8 horas por módulo)';
    if (esVideo) return '8 minutos';
    if (esPodcast) return '45 minutos por episodio';
    if (esArticulo) return '1500 palabras';
    return '30 minutos';
  }

  // ── CAMPOS DE MÓDULOS / EPISODIOS / CAPÍTULOS ─────────────────
  if (/modulo|módulo|episodio|capitulo|capítulo|seccion|sección|parte|numero_de/.test(c)) {
    if (esCurso) return '6 módulos';
    if (esPodcast) return '10 episodios';
    if (esVideo) return '5 partes';
    return '5';
  }

  // ── CAMPOS DE AUDIENCIA / NIVEL ───────────────────────────────
  if (/audiencia|audience|nivel|level|publico|público|target|para_quien/.test(c)) {
    if (esCurso) return 'Principiantes sin experiencia previa';
    if (esVideo) return 'Adultos interesados en aprender desde cero';
    if (esApp) return 'Emprendedores y pequeñas empresas';
    return 'Adultos de 25 a 45 años interesados en el tema';
  }

  // ── CAMPOS DE FORMATO / ENTREGA ───────────────────────────────
  if (/formato|format|entrega|delivery|tipo_contenido|presentacion/.test(c)) {
    if (esCurso) return 'Video grabado + PDF de apuntes descargable';
    if (esVideo) return 'Locución en cámara con pantalla compartida';
    if (esPodcast) return 'Monólogo con invitados ocasionales';
    return 'Texto + imágenes de apoyo';
  }

  // ── CAMPOS DE TEMAS / CONTENIDO ───────────────────────────────
  if (/tema|temas|topic|contenido|content|cobertura|syllabus|plan/.test(c)) {
    if (esCurso) return 'Fundamentos, práctica guiada, proyectos reales y evaluación final';
    if (esVideo) return 'Introducción, desarrollo paso a paso y conclusiones accionables';
    if (esPodcast) return 'Entrevistas de expertos, casos de éxito y consejos prácticos';
    return 'Introducción, desarrollo principal y recursos complementarios';
  }

  // ── CAMPOS DE PRECIO / MONETIZACIÓN ──────────────────────────
  if (/precio|price|costo|cost|tarifa|monetiz|pago|valor/.test(c)) {
    if (esCurso) return '$97 USD (pago único)';
    return '$49 USD';
  }

  // ── CAMPOS DE CERTIFICADO / DIPLOMA ──────────────────────────
  if (/certif|diploma|titulo|acredit/.test(c)) {
    return 'Sí, certificado digital al completar el 80% del contenido';
  }

  // ── CAMPOS DE PLATAFORMA ──────────────────────────────────────
  if (/plataforma|platform|canal|channel|donde|publicar/.test(c)) {
    if (esCurso) return 'Udemy / Teachable / plataforma propia';
    if (esVideo) return 'YouTube (canal principal)';
    if (esPodcast) return 'Spotify + Apple Podcasts';
    return 'Sitio web propio';
  }

  // ── CAMPOS DE TONO / ESTILO ───────────────────────────────────
  if (/tono|tone|estilo|style|voz|voice|personalidad/.test(c)) {
    if (esCurso) return 'Profesional pero cercano, con ejemplos prácticos';
    if (esVideo) return 'Dinámico, motivacional y directo al grano';
    if (esPodcast) return 'Conversacional, reflexivo y con sentido del humor';
    return 'Claro, directo y accesible para todos los niveles';
  }

  // ── CAMPOS DE DESCRIPCIÓN ─────────────────────────────────────
  if (/descripcion|descripción|description|resumen|summary|sobre|acerca/.test(c)) {
    const tema = extraerTemaDe(pb);
    if (esCurso) return `Aprende ${tema} desde cero con proyectos prácticos y acompañamiento paso a paso`;
    return `Contenido enfocado en ${tema} con ejemplos del mundo real`;
  }

  // ── FALLBACK: inferir desde la pregunta ───────────────────────
  const fromQuestion = inferQuestionSuggestionFromText(pregunta);
  if (fromQuestion) return fromQuestion;

  // Fallback final
  const tema = extraerTemaDe(pb);
  return tema ? `Relacionado con ${tema}` : 'A definir según las necesidades del proyecto';
}

/**
 * Extrae el tema principal del prompt_base eliminando palabras genéricas.
 */
function extraerTemaDe(promptBase) {
  return String(promptBase || '')
    .replace(/curso\s+online\s*(completo)?|crear|hacer|generar|producir|diseñar|desarrollar|un|una|el|la|de|sobre|para/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50)
    || 'este tema';
}

function normalizeOutputType(parsed, agentId) {
  const tipo = parsed?.asset?.tipo_asset || null;
  if (tipo === 'imagen') return 'image';
  if (tipo === 'audio') return 'audio';
  if (tipo === 'video') return 'video';
  if (tipo === 'texto') return 'text';
  if (tipo === 'investigacion') return 'json';
  if (agentId === 'AG-04') return 'image';
  if (agentId === 'AG-03') return 'text';
  if (agentId === 'AG-06') return 'json';
  return 'json';
}

function buildQuestionItemsFromParsedResult(parsed, decision, target) {
  const questionItems = [];
  const pushQuestionItem = (item, index, fallbackPrefix = parsed?.accion || decision?.accion || 'pref') => {
    const rawItem = (typeof item === 'string')
      ? { question: item }
      : (item && typeof item === 'object' ? item : {});
    const questionText = String(rawItem?.pregunta || rawItem?.question || '').trim();
    if (!questionText) return;
    const suggestion = rawItem?.sugerencia || rawItem?.suggestion || rawItem?.default_value || rawItem?.default || inferQuestionSuggestionFromText(questionText) || '';
    questionItems.push({
      field_key: rawItem?.campo || rawItem?.field_key || `${fallbackPrefix}_${index + 1}`,
      question: questionText,
      suggestion,
      bloque: rawItem?.bloque || target,
      tipo: rawItem?.tipo || 'texto',
      opciones: Array.isArray(rawItem?.opciones) ? rawItem.opciones : [],
      default_value: rawItem?.default_value || rawItem?.default || decision.parametros?.defaults_si_timeout?.[rawItem?.campo || rawItem?.field_key] || null,
    });
  };
  if (parsed?.resultado?.question) {
    const directQuestion = String(parsed.resultado.question || '').trim();
    questionItems.push({
      field_key: parsed.resultado.field_key || parsed.resultado.fieldKey || parsed.resultado.campo || parsed.accion || 'pref_general',
      question: directQuestion,
      suggestion: parsed.resultado.suggestion || parsed.resultado.sugerencia || parsed.resultado.default_value || parsed.resultado.default || inferQuestionSuggestionFromText(directQuestion) || '',
      bloque: target,
      tipo: parsed.resultado.tipo || 'texto',
      opciones: Array.isArray(parsed.resultado.opciones) ? parsed.resultado.opciones : [],
      default_value: parsed.resultado.default_value || parsed.resultado.default || null,
    });
  }
  if (Array.isArray(parsed?.resultado?.preguntas)) {
    parsed.resultado.preguntas.forEach((item, index) => pushQuestionItem(item, index));
  }
  if (Array.isArray(parsed?.resultado?.preguntas_activas)) {
    parsed.resultado.preguntas_activas.forEach((item, index) => pushQuestionItem(item, index, 'pregunta_activa'));
  }
  const sourceObj = parsed?.resultado && typeof parsed.resultado === 'object'
    ? parsed.resultado
    : null;
  if (sourceObj) {
    Object.entries(sourceObj).forEach(([key, value]) => {
      if (!String(key || '').startsWith('question_')) return;
      const questionText = String(value || '').trim();
      if (!questionText) return;
      const fieldKey = String(key).replace(/^question_/, '') || key;
      questionItems.push({
        field_key: fieldKey,
        question: questionText,
        suggestion: inferQuestionSuggestionFromText(questionText) || '',
        bloque: target,
        tipo: 'texto',
        opciones: [],
        default_value: null,
      });
    });
  }
  return questionItems;
}

function buildQuestionItemsFromDecision(decision, target) {
  const preguntas = Array.isArray(decision?.parametros?.preguntas) ? [...decision.parametros.preguntas] : [];
  const singleQuestionText = String(decision?.parametros?.pregunta || decision?.parametros?.question || '').trim();
  if (singleQuestionText) {
    preguntas.push({
      campo: decision?.parametros?.campo || decision?.parametros?.field_key || null,
      pregunta: singleQuestionText,
      sugerencia: decision?.parametros?.sugerencia || decision?.parametros?.suggestion || '',
      bloque: decision?.parametros?.bloque || decision?.parametros?.bloque_destino || target,
      tipo: decision?.parametros?.tipo || 'texto',
      opciones: Array.isArray(decision?.parametros?.opciones) ? decision.parametros.opciones : [],
      default_value: decision?.parametros?.default_value || decision?.parametros?.default || null,
    });
  }
  return preguntas.reduce((acc, item, index) => {
    const questionText = String(item?.pregunta || item?.question || '').trim();
    if (!questionText) return acc;
    acc.push({
      field_key: item?.campo || item?.field_key || `${decision?.accion || 'pref'}_${index + 1}`,
      question: questionText,
      suggestion: item?.sugerencia || item?.suggestion || '',
      bloque: item?.bloque || target,
      tipo: item?.tipo || 'texto',
      opciones: Array.isArray(item?.opciones) ? item.opciones : [],
      default_value: item?.default_value || item?.default || null,
    });
    return acc;
  }, []);
}

function registerQuestionItems(pipelineId, decision, questionItems, target, actionName) {
  const existingQuestions = contextManager.getOperatorQuestions(pipelineId);
  const currentContext = contextManager.getContext(pipelineId) || {};
  const currentPending = Array.isArray(currentContext.preguntas_pendientes)
    ? currentContext.preguntas_pendientes
    : [];
  const mergedPending = [...currentPending];
  let firstQuestionText = null;

  questionItems.forEach(item => {
    const alreadyPending = existingQuestions.some(q => q.status !== 'answered' && (q.field_key === item.field_key || q.question === item.question));
    if (alreadyPending) return;
    const question = contextManager.upsertOperatorQuestion(pipelineId, {
      field_key: item.field_key,
      question: item.question,
      suggestion: item.suggestion || '',
      status: 'pending',
      metadata: {
        bloque: item.bloque || target,
        accion: actionName || decision?.accion,
        tipo: item.tipo || 'texto',
        opciones: Array.isArray(item.opciones) ? item.opciones : [],
        default_value: item.default_value || null,
      },
    });
    mergedPending.push({
      public_id: question.public_id,
      question: question.question,
      field_key: question.field_key,
      suggestion: question.suggestion || '',
      metadata: question.metadata || {},
      created_at: question.created_at || new Date().toISOString(),
    });
    if (!firstQuestionText) firstQuestionText = item.question;
    emitPipelineEvent('operator_question_created', pipelineId, { question });
  });

  contextManager.patchContext(pipelineId, {
    editor: {
      esperando_input: mergedPending.length > 0,
      pregunta_activa: firstQuestionText || mergedPending[0]?.question || questionItems[0]?.question || null,
    },
    preguntas_pendientes: mergedPending,
  });

  if (target) {
    contextManager.updateBloque(pipelineId, target, {
      estado: 'esperando_usuario',
      resultado: JSON.stringify({ preguntas: questionItems }, null, 2),
      agente: decision.agente_id,
    });
  }
}

function serializeStructuredResult(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function buildResultSummary(resultado) {
  if (!resultado) return null;
  if (typeof resultado === 'string') return resultado.slice(0, 280);
  if (typeof resultado.resumen_ejecutivo === 'string') return resultado.resumen_ejecutivo.slice(0, 280);
  if (typeof resultado.descripcion === 'string') return resultado.descripcion.slice(0, 280);
  if (typeof resultado.resumen === 'string') return resultado.resumen.slice(0, 280);
  if (typeof resultado.sinopsis === 'string') return resultado.sinopsis.slice(0, 280);
  if (typeof resultado.contenido === 'string') return resultado.contenido.slice(0, 280);
  return JSON.stringify(resultado, null, 2).slice(0, 280);
}

function wrapCapturedPreferences(preferences) {
  const out = {};
  Object.entries(preferences || {}).forEach(([key, value]) => {
    out[key] = { valor: value, resuelta: true };
  });
  return out;
}

function emit(pipelineId, event, source, text) {
  pipelineEvents.emit(event, { pipeline_id: pipelineId, source, text });
  if (event === 'message' || event === 'cycle') {
    console.log(`[${pipelineId}] ${text}`);
  }
}

function emitContextSnapshot(pipelineId) {
  const ctx = contextManager.getContext(pipelineId);
  if (!ctx) return;
  pipelineEvents.emit('context_snapshot', { pipeline_id: pipelineId, context: ctx });
}

function emitPipelineEvent(event, pipelineId, payload = {}) {
  pipelineEvents.emit(event, {
    pipeline_id: pipelineId,
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  pipelineEvents,
  startLoop,
  stopLoop,
  isRunning,
};
