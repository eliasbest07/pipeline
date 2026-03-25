/**
 * context-manager.js
 * Gestiona el context.json de cada pipeline.
 * El contexto es la única fuente de verdad del estado operativo.
 */

const db = require('./db');

const PIPELINE_STATES = ['iniciando', 'en_progreso', 'pausado', 'completo', 'cancelado', 'corrupto'];
const AGENT_LIFECYCLE_STATES = ['idle', 'activo', 'completado', 'pausado', 'reemplazado', 'error', 'descartado'];

function nowIso() {
  return new Date().toISOString();
}

function buildOperationalSections(pipelineId, pipelineName, current = {}) {
  const startedAt = current.iniciado_en || current.pipeline?.iniciado_en || nowIso();
  const updatedAt = current.actualizado_en || current.pipeline?.actualizado_en || startedAt;
  const ciclo = Number.isFinite(current.ciclo) ? current.ciclo : (current.pipeline?.ciclo_actual || 0);
  const estado = PIPELINE_STATES.includes(current.estado)
    ? current.estado
    : (PIPELINE_STATES.includes(current.pipeline?.estado_actual) ? current.pipeline.estado_actual : 'iniciando');

  return {
    pipeline: {
      id: pipelineId,
      nombre: pipelineName,
      estado_actual: estado,
      ciclo_actual: ciclo,
      iniciado_en: startedAt,
      actualizado_en: updatedAt,
      detenido_por: current.pipeline?.detenido_por || null,
      motivo_detencion: current.pipeline?.motivo_detencion || null,
    },
    template: {
      activo: current.template?.activo || null,
      seed_template: current.template?.seed_template || null,
      agent_menu: current.template?.agent_menu || null,
      metodologia: current.template?.metodologia || null,
      version: current.template?.version || 1,
      actualizado_en: current.template?.actualizado_en || null,
    },
    preferencias_usuario: current.preferencias_usuario || {},
    bloques: current.bloques || {},
    agentes_activos: current.agentes_activos || {},
    assets: current.assets || {},
    ensamblaje: {
      estado: current.ensamblaje?.estado || 'pendiente',
      asset_ids: Array.isArray(current.ensamblaje?.asset_ids) ? current.ensamblaje.asset_ids : [],
      producto_final: current.ensamblaje?.producto_final || null,
      ultima_actualizacion: current.ensamblaje?.ultima_actualizacion || null,
      notas: current.ensamblaje?.notas || null,
    },
    historial_eventos: Array.isArray(current.historial_eventos) ? current.historial_eventos : [],
    salud_pipeline: {
      estado: current.salud_pipeline?.estado || 'ok',
      drift_detectado: current.salud_pipeline?.drift_detectado || false,
      contexto_corrupto: current.salud_pipeline?.contexto_corrupto || false,
      ultimo_motivo: current.salud_pipeline?.ultimo_motivo || null,
      reglas_disparadas: Array.isArray(current.salud_pipeline?.reglas_disparadas) ? current.salud_pipeline.reglas_disparadas : [],
      resumen: current.salud_pipeline?.resumen || null,
      revisado_en: current.salud_pipeline?.revisado_en || null,
    },
  };
}

function buildInitialContext(pipelineId, pipelineName) {
  const startedAt = nowIso();
  const operational = buildOperationalSections(pipelineId, pipelineName, {
    iniciado_en: startedAt,
    actualizado_en: startedAt,
    estado: 'iniciando',
    ciclo: 0,
  });

  return {
    pipeline_id: pipelineId,
    pipeline_name: pipelineName,
    ciclo: 0,
    estado: 'iniciando',

    preferencias_usuario: {},
    bloques: {},
    cola_tareas: [],
    control_orquestador: {
      señal: null,
      tarea_id: null,
      nuevo_nivel_prioridad: null,
      razon: null,
      timestamp: null,
    },
    historial_decisiones: [],
    eventos_completados: [],
    editor: {
      esperando_input: false,
      pregunta_activa: null,
    },

    ...operational,

    iniciado_en: startedAt,
    actualizado_en: startedAt,
  };
}

function normalizeContext(context) {
  if (!context || typeof context !== 'object') return context;

  const pipelineId = context.pipeline_id || context.pipeline?.id || null;
  const pipelineName = context.pipeline_name || context.pipeline?.nombre || pipelineId || 'Pipeline';
  const normalized = {
    ...context,
    pipeline_id: pipelineId,
    pipeline_name: pipelineName,
  };

  const operational = buildOperationalSections(pipelineId, pipelineName, normalized);
  normalized.pipeline = operational.pipeline;
  normalized.template = operational.template;
  normalized.preferencias_usuario = operational.preferencias_usuario;
  normalized.bloques = operational.bloques;
  normalized.agentes_activos = operational.agentes_activos;
  normalized.assets = operational.assets;
  normalized.ensamblaje = operational.ensamblaje;
  normalized.historial_eventos = operational.historial_eventos;
  normalized.salud_pipeline = operational.salud_pipeline;

  normalized.ciclo = operational.pipeline.ciclo_actual;
  normalized.estado = operational.pipeline.estado_actual;
  normalized.iniciado_en = operational.pipeline.iniciado_en;
  normalized.actualizado_en = operational.pipeline.actualizado_en;

  if (!Array.isArray(normalized.cola_tareas)) normalized.cola_tareas = [];
  if (!Array.isArray(normalized.historial_decisiones)) normalized.historial_decisiones = [];
  if (!Array.isArray(normalized.eventos_completados)) normalized.eventos_completados = [];
  if (!normalized.editor || typeof normalized.editor !== 'object') {
    normalized.editor = { esperando_input: false, pregunta_activa: null };
  }
  if (!normalized.control_orquestador || typeof normalized.control_orquestador !== 'object') {
    normalized.control_orquestador = {
      señal: null,
      tarea_id: null,
      nuevo_nivel_prioridad: null,
      razon: null,
      timestamp: null,
    };
  }

  return normalized;
}

function initContext(pipelineId, pipelineName) {
  const ctx = buildInitialContext(pipelineId, pipelineName);
  db.upsertContext.run(pipelineId, JSON.stringify(ctx));
  return ctx;
}

function getContext(pipelineId) {
  const row = db.getContext.get(pipelineId);
  if (!row) return null;
  return normalizeContext(JSON.parse(row.context));
}

function setContext(pipelineId, context) {
  const updatedAt = nowIso();
  const normalized = normalizeContext({
    ...context,
    actualizado_en: updatedAt,
    pipeline: {
      ...(context.pipeline || {}),
      actualizado_en: updatedAt,
    },
  });
  db.upsertContext.run(pipelineId, JSON.stringify(normalized));
  return normalized;
}

function patchContext(pipelineId, patch) {
  const current = getContext(pipelineId);
  if (!current) throw new Error(`Context not found for pipeline: ${pipelineId}`);
  const updated = deepMerge(current, patch);
  return setContext(pipelineId, updated);
}

function ensureContext(pipelineId, pipelineName = pipelineId) {
  const existing = getContext(pipelineId);
  if (existing) return setContext(pipelineId, existing);
  return initContext(pipelineId, pipelineName);
}

function incrementCycle(pipelineId) {
  const ctx = getContext(pipelineId);
  if (!ctx) throw new Error(`Context not found for pipeline: ${pipelineId}`);
  const nextCycle = (ctx.ciclo || 0) + 1;
  return patchContext(pipelineId, {
    ciclo: nextCycle,
    pipeline: { ciclo_actual: nextCycle },
  });
}

function setEstado(pipelineId, estado, extra = {}) {
  const safeEstado = PIPELINE_STATES.includes(estado) ? estado : 'iniciando';
  return patchContext(pipelineId, {
    estado: safeEstado,
    pipeline: {
      estado_actual: safeEstado,
      detenido_por: extra.detenido_por || null,
      motivo_detencion: extra.motivo_detencion || null,
    },
  });
}

function logDecision(pipelineId, decision) {
  const ctx = getContext(pipelineId);
  if (!ctx) throw new Error(`Context not found for pipeline: ${pipelineId}`);
  const entry = { ...decision, timestamp: nowIso() };
  return patchContext(pipelineId, {
    historial_decisiones: [...(ctx.historial_decisiones || []), entry],
  });
}

function updateBloque(pipelineId, bloque, data) {
  const ctx = getContext(pipelineId);
  if (!ctx) throw new Error(`Context not found for pipeline: ${pipelineId}`);
  const nextBloque = { ...(ctx.bloques[bloque] || {}), ...data, actualizado_en: nowIso() };
  return patchContext(pipelineId, {
    bloques: {
      ...ctx.bloques,
      [bloque]: nextBloque,
    },
  });
}

function upsertAgentState(pipelineId, agentId, data = {}) {
  const ctx = getContext(pipelineId);
  if (!ctx) throw new Error(`Context not found for pipeline: ${pipelineId}`);
  const current = ctx.agentes_activos?.[agentId] || {};
  const nextState = normalizeAgentState(data.estado ?? current.estado ?? 'idle');
  const previousState = normalizeAgentState(current.estado || 'idle');
  const timestamp = nowIso();
  const lifecycleEntry = previousState !== nextState
    ? {
        desde: previousState,
        hacia: nextState,
        motivo: data.ultimo_motivo || data.motivo || null,
        accion: data.accion_actual || current.accion_actual || null,
        timestamp,
      }
    : null;
  const history = Array.isArray(current.historial_estados) ? current.historial_estados : [];

  const nextAgent = {
    ...current,
    agent_id: agentId,
    ...data,
    estado: nextState,
    estado_legacy: toLegacyAgentState(nextState),
    ultimo_cambio_estado: timestamp,
    actualizado_en: timestamp,
    historial_estados: lifecycleEntry ? [...history, lifecycleEntry] : history,
  };

  if (nextState === 'activo') {
    nextAgent.ultimo_inicio = data.ultimo_inicio || current.ultimo_inicio || timestamp;
    nextAgent.ultimo_fin = data.ultimo_fin || (current.estado === 'activo' ? current.ultimo_fin : null);
  }

  if (['completado', 'pausado', 'reemplazado', 'error', 'descartado'].includes(nextState)) {
    nextAgent.ultimo_fin = data.ultimo_fin || timestamp;
  }

  if (nextState === 'error') {
    nextAgent.ultimo_error = data.ultimo_error || data.error || current.ultimo_error || null;
  }

  return patchContext(pipelineId, {
    agentes_activos: {
      ...ctx.agentes_activos,
      [agentId]: nextAgent,
    },
  });
}

function normalizeAgentState(state) {
  if (!state) return 'idle';
  const aliases = {
    running: 'activo',
    active: 'activo',
    done: 'completado',
    completed: 'completado',
    paused: 'pausado',
    replaced: 'reemplazado',
    discarded: 'descartado',
    idle: 'idle',
    activo: 'activo',
    completado: 'completado',
    pausado: 'pausado',
    reemplazado: 'reemplazado',
    error: 'error',
    descartado: 'descartado',
  };
  const normalized = aliases[String(state).toLowerCase()] || 'idle';
  return AGENT_LIFECYCLE_STATES.includes(normalized) ? normalized : 'idle';
}

function toLegacyAgentState(state) {
  const map = {
    idle: 'idle',
    activo: 'running',
    completado: 'done',
    pausado: 'paused',
    reemplazado: 'done',
    error: 'error',
    descartado: 'idle',
  };
  return map[state] || 'idle';
}

function upsertAsset(pipelineId, assetId, data = {}) {
  const ctx = getContext(pipelineId);
  if (!ctx) throw new Error(`Context not found for pipeline: ${pipelineId}`);
  const current = ctx.assets?.[assetId] || {};
  return patchContext(pipelineId, {
    assets: {
      ...ctx.assets,
      [assetId]: {
        ...current,
        asset_id: assetId,
        ...data,
        actualizado_en: nowIso(),
      },
    },
  });
}

function updateAssembly(pipelineId, data = {}) {
  const ctx = getContext(pipelineId);
  if (!ctx) throw new Error(`Context not found for pipeline: ${pipelineId}`);
  return patchContext(pipelineId, {
    ensamblaje: {
      ...ctx.ensamblaje,
      ...data,
      ultima_actualizacion: nowIso(),
    },
  });
}

function getVigenteAssetsFromContext(ctx) {
  if (!ctx) return [];
  const assets = ctx.assets || {};
  const obsolete = new Set(['reemplazado', 'descartado', 'error', 'pendiente_regeneracion', 'pendiente_actualizacion']);
  const selected = [];
  const seen = new Set();

  Object.entries(ctx.bloques || {}).forEach(([bloque, block]) => {
    const assetId = block?.asset_actual;
    const asset = assetId ? assets[assetId] : null;
    if (!asset || obsolete.has(asset.estado)) return;
    selected.push({
      ...asset,
      bloque: asset.bloque || bloque,
      es_vigente: true,
      seleccionado_por: 'bloque.asset_actual',
    });
    seen.add(asset.asset_id);
  });

  Object.values(assets).forEach(asset => {
    if (!asset?.asset_id || seen.has(asset.asset_id) || obsolete.has(asset.estado)) return;
    if (asset.estado && !['listo', 'completada', 'vigente', 'done', 'ok'].includes(asset.estado)) return;
    selected.push({
      ...asset,
      es_vigente: true,
      seleccionado_por: 'asset_estado',
    });
    seen.add(asset.asset_id);
  });

  return selected;
}

function getVigenteAssets(pipelineId) {
  return getVigenteAssetsFromContext(getContext(pipelineId));
}

function recordEvent(pipelineId, event = {}) {
  const ctx = getContext(pipelineId);
  if (!ctx) throw new Error(`Context not found for pipeline: ${pipelineId}`);
  const entry = {
    id: event.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tipo: event.tipo || 'evento',
    fuente: event.fuente || 'sistema',
    mensaje: event.mensaje || '',
    payload: event.payload || null,
    timestamp: nowIso(),
  };
  return patchContext(pipelineId, {
    historial_eventos: [...(ctx.historial_eventos || []), entry],
    eventos_completados: [...(ctx.eventos_completados || []), entry],
  });
}

function setPipelineHealth(pipelineId, data = {}) {
  const ctx = getContext(pipelineId);
  if (!ctx) throw new Error(`Context not found for pipeline: ${pipelineId}`);
  return patchContext(pipelineId, {
    salud_pipeline: {
      ...ctx.salud_pipeline,
      ...data,
      revisado_en: nowIso(),
    },
  });
}

function hydrateContextFromSeed(ctx, seedTemplate = {}, agentMenu = {}) {
  const hydratedAt = nowIso();
  const requiredPrefs = Array.isArray(seedTemplate.preferencias_requeridas)
    ? seedTemplate.preferencias_requeridas
    : [];
  const requiredBlocks = Array.isArray(seedTemplate.bloques_requeridos)
    ? seedTemplate.bloques_requeridos
    : [];
  const order = Array.isArray(seedTemplate.orden_produccion)
    ? seedTemplate.orden_produccion
    : [];
  const agents = Array.isArray(agentMenu.agentes)
    ? agentMenu.agentes
    : [];

  const blockMap = { ...(ctx.bloques || {}) };
  requiredBlocks.forEach((blockName, index) => {
    const step = order.find(item => item.bloque === blockName) || null;
    blockMap[blockName] = {
      ...(blockMap[blockName] || {}),
      nombre: blockName,
      estado: blockMap[blockName]?.estado || 'pendiente',
      paso: step?.paso || index + 1,
      agente_responsable: step?.agente || null,
      accion_inicial: step?.accion || null,
      depende_de: Array.isArray(step?.depende_de) ? step.depende_de : [],
      requiere_aprobacion_usuario: Boolean(step?.requiere_aprobacion_usuario),
      puede_paralelizarse: Boolean(step?.puede_paralelizarse),
      nota: step?.nota || null,
      actualizado_en: hydratedAt,
    };
  });

  order.forEach(step => {
    if (!step?.bloque) return;
    blockMap[step.bloque] = {
      ...(blockMap[step.bloque] || {}),
      nombre: step.bloque,
      estado: blockMap[step.bloque]?.estado || 'pendiente',
      paso: step.paso || blockMap[step.bloque]?.paso || null,
      agente_responsable: step.agente || blockMap[step.bloque]?.agente_responsable || null,
      accion_inicial: step.accion || blockMap[step.bloque]?.accion_inicial || null,
      depende_de: Array.isArray(step.depende_de) ? step.depende_de : [],
      requiere_aprobacion_usuario: Boolean(step.requiere_aprobacion_usuario),
      puede_paralelizarse: Boolean(step.puede_paralelizarse),
      nota: step.nota || null,
      actualizado_en: hydratedAt,
    };
  });

  const agentMap = { ...(ctx.agentes_activos || {}) };
  agents.forEach(agent => {
    agentMap[agent.id] = {
      ...(agentMap[agent.id] || {}),
      agent_id: agent.id,
      nombre: agent.nombre || agent.id,
      rol: agent.rol_en_pipeline || null,
      acciones_habilitadas: Array.isArray(agent.acciones_habilitadas) ? agent.acciones_habilitadas : [],
      obligatorio: Boolean(agent.obligatorio),
      estado: agentMap[agent.id]?.estado || 'idle',
      origen: 'seed_template',
      actualizado_en: hydratedAt,
    };
  });

  const prefState = { ...(ctx.preferencias_usuario || {}) };
  const requiredPrefState = {};
  requiredPrefs.forEach(pref => {
    requiredPrefState[pref.campo] = {
      campo: pref.campo,
      pregunta: pref.pregunta,
      tipo: pref.tipo,
      opciones: Array.isArray(pref.opciones) ? pref.opciones : [],
      obligatorio: Boolean(pref.obligatorio),
      valor: prefState[pref.campo]?.valor ?? null,
      resuelta: prefState[pref.campo]?.resuelta || false,
    };
  });

  return {
    ...ctx,
    template: {
      ...(ctx.template || {}),
      activo: seedTemplate?.template_id || agentMenu?.pipeline_id || ctx.template?.activo || null,
      seed_template: seedTemplate,
      agent_menu: agentMenu,
      metodologia: seedTemplate?.descripcion || seedTemplate?.metodologia || null,
      version: Number(seedTemplate?.version || (ctx.template?.version || 1)),
      actualizado_en: hydratedAt,
    },
    pipeline_name: ctx.pipeline_name || seedTemplate?.template_id || agentMenu?.pipeline_id || ctx.pipeline_name,
    preferencias_usuario: {
      ...prefState,
      _requeridas: requiredPrefState,
    },
    bloques: blockMap,
    agentes_activos: agentMap,
    cola_tareas: order.map(step => ({
      tarea_id: `${step.agente || 'AG'}-${step.paso || 'x'}-${step.bloque || 'bloque'}`,
      paso: step.paso || null,
      bloque: step.bloque || null,
      agente: step.agente || null,
      accion: step.accion || null,
      depende_de: Array.isArray(step.depende_de) ? step.depende_de : [],
      estado: 'pendiente',
      prioridad: 'normal',
      paralelizable: Boolean(step.puede_paralelizarse),
      actualizado_en: hydratedAt,
    })),
    ensamblaje: {
      ...(ctx.ensamblaje || {}),
      estado: requiredBlocks.length ? 'pendiente' : (ctx.ensamblaje?.estado || 'pendiente'),
      notas: seedTemplate?.resultado_final || ctx.ensamblaje?.notas || null,
      ultima_actualizacion: hydratedAt,
    },
  };
}

function registerAssetRevision(pipelineId, bloque, data = {}, options = {}) {
  const ctx = getContext(pipelineId);
  if (!ctx) throw new Error(`Context not found for pipeline: ${pipelineId}`);

  const currentBlock = ctx.bloques?.[bloque] || {};
  const history = Array.isArray(currentBlock.assets_historial) ? currentBlock.assets_historial : [];
  const previousAssetId = options.previousAssetId || currentBlock.asset_actual || null;
  const previousAsset = previousAssetId ? ctx.assets?.[previousAssetId] : null;
  const iteration = data.iteracion || ((previousAsset?.iteracion || history.length || 0) + 1);
  const assetId = data.asset_id || `${bloque}__${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;

  if (previousAssetId && ctx.assets?.[previousAssetId]) {
    upsertAsset(pipelineId, previousAssetId, {
      estado: options.previousStatus || 'reemplazado',
      reemplazado_por: assetId,
      reemplazado_en: nowIso(),
      reemplazado_por_feedback: true,
    });
  }

  upsertAsset(pipelineId, assetId, {
    bloque,
    iteracion: iteration,
    estado: data.estado || 'pendiente',
    prompt: data.prompt || null,
    feedback_usuario: data.feedback_usuario || null,
    asset_previo: previousAssetId,
    agente_sugerido: data.agente_sugerido || null,
    tipo_asset: data.tipo_asset || null,
    contenido: data.contenido || null,
    metadata: data.metadata || null,
  });

  const nextHistory = history.includes(assetId) ? history : [...history, assetId];
  updateBloque(pipelineId, bloque, {
    estado: data.estado_bloque || currentBlock.estado || 'en_revision',
    asset_actual: assetId,
    assets_historial: nextHistory,
    asset_previo: previousAssetId,
    actualizado_en: nowIso(),
  });

  return getContext(pipelineId).assets?.[assetId] || null;
}

function resetContext(pipelineId) {
  const current = getContext(pipelineId);
  const fresh = buildInitialContext(pipelineId, current?.pipeline_name || pipelineId);
  fresh.preferencias_usuario = current?.preferencias_usuario || {};
  fresh.template = current?.template || fresh.template;
  return setContext(pipelineId, fresh);
}

function deleteContext(pipelineId) {
  db.deleteContext.run(pipelineId);
}

function saveSeed(pipelineId, seedTemplate, agentMenu) {
  db.upsertSeed.run(pipelineId, JSON.stringify(seedTemplate), JSON.stringify(agentMenu));

  const ctx = getContext(pipelineId);
  if (ctx) {
    const hydrated = hydrateContextFromSeed(ctx, seedTemplate, agentMenu);
    const saved = setContext(pipelineId, hydrated);
    recordEvent(pipelineId, {
      tipo: 'seed_hydrated',
      fuente: 'AG-00',
      mensaje: 'La semilla del pipeline fue materializada dentro del contexto.',
      payload: {
        template_id: seedTemplate?.template_id || null,
        bloques: Object.keys(saved.bloques || {}),
        agentes: Object.keys(saved.agentes_activos || {}),
      },
    });
  }
}

function getSeed(pipelineId) {
  const row = db.getSeed.get(pipelineId);
  if (!row) return null;
  return {
    seed_template: JSON.parse(row.seed_template),
    agent_menu: JSON.parse(row.agent_menu),
  };
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

module.exports = {
  initContext,
  ensureContext,
  getContext,
  setContext,
  patchContext,
  incrementCycle,
  setEstado,
  logDecision,
  updateBloque,
  upsertAgentState,
  upsertAsset,
  updateAssembly,
  getVigenteAssets,
  getVigenteAssetsFromContext,
  recordEvent,
  setPipelineHealth,
  registerAssetRevision,
  hydrateContextFromSeed,
  resetContext,
  deleteContext,
  saveSeed,
  getSeed,
  normalizeContext,
};
