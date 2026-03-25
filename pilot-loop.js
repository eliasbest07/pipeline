/**
 * pilot-loop.js
 * Loop de ejecución del Piloto (AG-01).
 * Corre en background por pipeline. Una decisión por ciclo.
 */

const EventEmitter = require('events');
const contextManager = require('./context-manager');
const { runAgentWithRetry } = require('./agent-runner');

const pipelineEvents = new EventEmitter();
pipelineEvents.setMaxListeners(50);

const activeLoops = new Map();

const MAX_CYCLES = 50;
const CYCLE_DELAY_MS = 500;

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
      const seed = contextManager.getSeed(pipelineId);
      const decision = await askPilot(pipelineId, ctx, seed);

      if (!decision) {
        emit(pipelineId, 'message', 'PILOTO', '[PILOTO] No se pudo parsear la decisión. Reintentando en próximo ciclo.');
        await delay(CYCLE_DELAY_MS);
        ciclo++;
        continue;
      }

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

      if (decision.detener_pipeline === true) {
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

      if (decision.pipeline_completo === true) {
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

      const resultado = await executeDecision(pipelineId, decision, ctx);
      applyAgentResultToContext(pipelineId, decision, resultado);
      emitContextSnapshot(pipelineId);
    } catch (err) {
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

function assessContextHealth(ctx) {
  const rules = [];
  const bloques = ctx?.bloques || {};
  const assets = ctx?.assets || {};
  const requiredBlocks = Array.isArray(ctx?.template?.seed_template?.bloques_requeridos)
    ? ctx.template.seed_template.bloques_requeridos
    : [];
  const requiredPrefs = ctx?.preferencias_usuario?._requeridas || {};

  if (ctx?.template?.activo && !ctx?.template?.seed_template) {
    rules.push({ code: 'missing_seed_template', severity: 'critical', detail: 'Existe template activo pero falta seed_template en contexto.' });
  }

  const missingRequiredBlocks = requiredBlocks.filter(name => !bloques[name]);
  if (missingRequiredBlocks.length) {
    rules.push({ code: 'missing_required_blocks', severity: 'critical', detail: `Faltan bloques requeridos: ${missingRequiredBlocks.join(', ')}` });
  }

  Object.entries(bloques).forEach(([name, block]) => {
    const assetId = block?.asset_actual;
    if (assetId && !assets[assetId]) {
      rules.push({ code: 'dangling_asset_reference', severity: 'critical', detail: `El bloque ${name} apunta a asset_actual inexistente: ${assetId}` });
      return;
    }
    if (assetId && ['reemplazado', 'descartado', 'error'].includes(assets[assetId]?.estado)) {
      rules.push({ code: 'obsolete_asset_selected', severity: 'critical', detail: `El bloque ${name} mantiene como actual un asset obsoleto: ${assetId}` });
    }
    if (block?.estado === 'completada' && !block?.resultado && !block?.asset_actual) {
      rules.push({ code: 'completed_block_without_traceability', severity: requiredBlocks.includes(name) ? 'critical' : 'warning', detail: `El bloque ${name} está completado sin resultado ni asset_actual.` });
    }
  });

  const assemblyAssetIds = Array.isArray(ctx?.ensamblaje?.asset_ids) ? ctx.ensamblaje.asset_ids : [];
  const invalidAssemblyAssets = assemblyAssetIds.filter(id => !assets[id] || ['reemplazado', 'descartado', 'error'].includes(assets[id]?.estado));
  if (invalidAssemblyAssets.length) {
    rules.push({ code: 'invalid_assembly_assets', severity: 'critical', detail: `Ensamblaje referencia assets inválidos: ${invalidAssemblyAssets.join(', ')}` });
  }

  const unresolvedRequiredPrefs = Object.entries(requiredPrefs)
    .filter(([, pref]) => pref?.obligatorio && pref?.resuelta === false)
    .map(([key]) => key);
  const completedRequiredCount = requiredBlocks.filter(name => bloques[name]?.estado === 'completada').length;
  if (completedRequiredCount > 0 && unresolvedRequiredPrefs.length) {
    rules.push({ code: 'required_preferences_missing', severity: 'warning', detail: `Hay preferencias obligatorias sin resolver: ${unresolvedRequiredPrefs.join(', ')}` });
  }

  const revision = bloques.revision_final?.resultado_estructurado || null;
  if (revision?.estado_general === 'bloqueado' || Array.isArray(revision?.errores_sin_resolver) && revision.errores_sin_resolver.length) {
    rules.push({ code: 'digestor_detected_blocker', severity: 'critical', detail: revision?.resumen_ejecutivo || revision?.recomendacion_piloto || 'AG-07 detectó bloqueo en la revisión final.' });
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
  const allRequiredReady = required.length > 0 && required.every(name => ctx?.bloques?.[name]?.estado === 'completada');
  const finalProduct = ctx?.ensamblaje?.producto_final;
  const assemblyReady = Boolean(finalProduct) || ctx?.ensamblaje?.estado === 'completado';
  return allRequiredReady && assemblyReady;
}

async function askPilot(pipelineId, ctx, seed) {
  const seedBlock = seed
    ? `\n\n--- SEMILLA ACTIVA ---\n${JSON.stringify(seed.seed_template, null, 2)}\n---`
    : '';

  const prompt = `Ciclo ${(ctx.ciclo || 0) + 1}. Evalúa el estado actual del pipeline y toma UNA decisión.${seedBlock}

REGLAS OBLIGATORIAS:
- El Piloto es el unico que controla la linea de ensamblaje.
- El pipeline NO se pausa para pedir aprobacion humana.
- Cuando necesites escuchar o mostrar algo al usuario, delega a AG-05.
- AG-05 coordina prompts, correcciones y despacho tactico de agentes especializados.
- Solo marca "pipeline_completo": true si el contexto ya contiene todos los bloques requeridos y AG-07 ya produjo el producto final.
- Solo marca "detener_pipeline": true si detectas corrupcion fuerte o desvio critico del contexto.

Responde SOLO con este JSON (sin markdown):
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
}`;

  try {
    const raw = await runAgentWithRetry('AG-01', prompt, ctx, { pipelineId });
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

async function executeDecision(pipelineId, decision, ctx) {
  const { agente_id, accion, parametros = {}, prioridad } = decision;
  const label = agente_id.replace('AG-', '');
  const tag = `[AG-${label}]`;

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
  emit(pipelineId, 'message', agente_id, `${tag} Ejecutando: ${accion} [${prioridad}]`);

  const targetBlock = decision.bloque_destino || parametros.bloque_destino || null;
  const agentInput = buildAgentInput(accion, parametros, targetBlock, ctx);
  const resultado = await runAgentWithRetry(agente_id, agentInput, ctx, { pipelineId });

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
  emit(pipelineId, 'message', agente_id, `${tag} ✓ ${accion} completado`);

  return resultado;
}

function applyAgentResultToContext(pipelineId, decision, rawResult) {
  const parsed = parseAgentResult(rawResult);
  const resultPayload = parsed?.resultado ?? parsed ?? rawResult;
  const explicitTarget = parsed?.bloque_destino || decision.bloque_destino || decision.parametros?.bloque_destino || null;
  const target = resolveTargetBlock(explicitTarget);

  if (!parsed) {
    if (target) {
      contextManager.updateBloque(pipelineId, target, {
        estado: 'completada',
        resultado: typeof rawResult === 'string' ? rawResult : JSON.stringify(rawResult, null, 2),
        resultado_estructurado: null,
        agente: decision.agente_id,
      });
    }
    return;
  }

  if (target === 'preferencias_usuario' && parsed.resultado?.preferencias_capturadas) {
    const current = contextManager.getContext(pipelineId);
    contextManager.patchContext(pipelineId, {
      preferencias_usuario: {
        ...(current?.preferencias_usuario || {}),
        ...wrapCapturedPreferences(parsed.resultado.preferencias_capturadas),
      },
    });
    return;
  }

  let assetRecord = null;
  if (parsed.asset && target && !['revision_final', 'estado_pipeline'].includes(target)) {
    assetRecord = contextManager.registerAssetRevision(pipelineId, target, {
      estado: parsed.estado === 'error' ? 'error' : 'listo',
      estado_bloque: parsed.estado === 'error' ? 'error' : 'completada',
      prompt: parsed.asset.prompt || null,
      contenido: parsed.asset.contenido || serializeStructuredResult(parsed.resultado),
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
    });
  }

  if (target) {
    contextManager.updateBloque(pipelineId, target, {
      estado: parsed.estado === 'error' ? 'error' : 'completada',
      resultado: serializeStructuredResult(parsed.resultado),
      resultado_estructurado: parsed.resultado,
      resultado_resumen: buildResultSummary(parsed.resultado),
      agente: decision.agente_id,
      asset_actual: assetRecord?.asset_id || undefined,
    });
  }

  if (decision.agente_id === 'AG-07' || target === 'revision_final') {
    const ctx = contextManager.getContext(pipelineId);
    const assetsVigentes = contextManager.getVigenteAssetsFromContext(ctx);
    contextManager.updateAssembly(pipelineId, {
      estado: parsed.resultado?.pipeline_estado === 'completo' || parsed.resultado?.estado_general === 'listo' ? 'completado' : 'en_revision',
      producto_final: serializeStructuredResult(parsed.resultado),
      notas: buildResultSummary(parsed.resultado),
      asset_ids: assetsVigentes.map(asset => asset.asset_id),
      assets_vigentes_snapshot: assetsVigentes.map(asset => ({
        asset_id: asset.asset_id,
        bloque: asset.bloque || null,
        tipo_asset: asset.tipo_asset || null,
        estado: asset.estado || null,
      })),
    });
    emitPipelineEvent('assembly_ready', pipelineId, {
      agent_id: decision.agente_id,
      estado: parsed.resultado?.pipeline_estado === 'completo' || parsed.resultado?.estado_general === 'listo' ? 'completado' : 'en_revision',
      asset_ids: assetsVigentes.map(asset => asset.asset_id),
    });
  }
}

function buildAgentInput(accion, parametros, bloqueDestino, ctx) {
  const activosVigentes = agenteUsaEnsamblaje(accion, bloqueDestino)
    ? contextManager.getVigenteAssetsFromContext(ctx)
    : [];

  const contextSlice = {
    pipeline: ctx?.pipeline || {},
    template: {
      activo: ctx?.template?.activo || null,
      metodologia: ctx?.template?.metodologia || null,
    },
    preferencias_usuario: ctx?.preferencias_usuario || {},
    bloques: ctx?.bloques || {},
    assets: ctx?.assets || {},
    ensamblaje: {
      ...(ctx?.ensamblaje || {}),
      assets_vigentes: activosVigentes,
      asset_ids_vigentes: activosVigentes.map(asset => asset.asset_id),
    },
  };

  return `Ejecuta la acción: "${accion}"
Bloque destino esperado: ${bloqueDestino || 'null'}
Parametros: ${JSON.stringify(parametros, null, 2)}

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
${JSON.stringify(contextSlice, null, 2)}`;
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

function resolveTargetBlock(path) {
  if (!path || path === 'null') return null;
  if (path.includes('.')) return path.split('.').filter(Boolean).slice(-2, -1)[0] || path.split('.').pop();
  return path;
}

function agenteUsaEnsamblaje(accion, bloqueDestino) {
  return accion === 'revisar_y_consolidar' || bloqueDestino === 'revision_final';
}

function inferAssetType(agentId) {
  if (agentId === 'AG-04') return 'imagen';
  if (agentId === 'AG-06') return 'investigacion';
  if (agentId === 'AG-03') return 'texto';
  return 'dato';
}

function serializeStructuredResult(value) {
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
