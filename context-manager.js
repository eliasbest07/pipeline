/**
 * context-manager.js
 * Gestiona el context.json de cada pipeline.
 * El contexto vive en runtime y SQLite actúa como respaldo/versionado lazy-save.
 */

const { randomUUID } = require('crypto');
const db = require('./db');
const runtimeStore = require('./runtime-store');

const PIPELINE_STATES = ['iniciando', 'preparado', 'en_progreso', 'pausado', 'completo', 'cancelado', 'corrupto'];
const AGENT_LIFECYCLE_STATES = ['idle', 'activo', 'completado', 'pausado', 'reemplazado', 'error', 'descartado'];
const PERSISTENCE_DELAY_MS = 350;

function nowIso() {
  return new Date().toISOString();
}

function normalizeUserPreferences(preferences = {}) {
  if (!preferences || typeof preferences !== 'object') return {};
  const normalized = { ...preferences };
  const required = preferences._requeridas && typeof preferences._requeridas === 'object'
    ? preferences._requeridas
    : {};
  const syncedRequired = {};

  Object.entries(required).forEach(([fieldKey, pref]) => {
    const topLevel = preferences[fieldKey] && typeof preferences[fieldKey] === 'object'
      ? preferences[fieldKey]
      : null;
    const topLevelValue = topLevel?.valor;
    const hasTopLevelValue = topLevelValue !== undefined && topLevelValue !== null && String(topLevelValue).trim() !== '';
    syncedRequired[fieldKey] = {
      ...pref,
      campo: pref?.campo || fieldKey,
      valor: hasTopLevelValue ? topLevelValue : (pref?.valor ?? null),
      resuelta: hasTopLevelValue ? true : Boolean(pref?.resuelta),
    };
    if (topLevel) {
      normalized[fieldKey] = {
        ...topLevel,
        campo: topLevel.campo || fieldKey,
        valor: hasTopLevelValue ? topLevelValue : (pref?.valor ?? topLevel.valor ?? null),
        resuelta: hasTopLevelValue ? true : Boolean(topLevel.resuelta || pref?.resuelta),
      };
    }
  });

  normalized._requeridas = syncedRequired;
  return normalized;
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
    preferencias_usuario: normalizeUserPreferences(current.preferencias_usuario || {}),
    bloques: current.bloques || {},
    agentes_activos: current.agentes_activos || {},
    assets: current.assets || {},
    ensamblaje: {
      estado: current.ensamblaje?.estado || 'pendiente',
      asset_ids: Array.isArray(current.ensamblaje?.asset_ids) ? current.ensamblaje.asset_ids : [],
      output_ids: Array.isArray(current.ensamblaje?.output_ids) ? current.ensamblaje.output_ids : [],
      producto_final: current.ensamblaje?.producto_final || null,
      ultima_actualizacion: current.ensamblaje?.ultima_actualizacion || null,
      notas: current.ensamblaje?.notas || null,
      outputs_vigentes_snapshot: Array.isArray(current.ensamblaje?.outputs_vigentes_snapshot) ? current.ensamblaje.outputs_vigentes_snapshot : [],
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
  normalized.preferencias_usuario = normalizeUserPreferences(operational.preferencias_usuario);
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
  if (!Array.isArray(normalized.preguntas_pendientes)) normalized.preguntas_pendientes = [];
  if (!normalized.respuestas_usuario || typeof normalized.respuestas_usuario !== 'object') {
    normalized.respuestas_usuario = {};
  }
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
  const normalized = normalizeContext(ctx);
  runtimeStore.setContext(pipelineId, normalized);
  schedulePersistence(pipelineId);
  return normalized;
}

function getContext(pipelineId) {
  const runtimeContext = runtimeStore.getContext(pipelineId);
  if (runtimeContext) return normalizeContext(runtimeContext);

  const row = db.getContext.get(pipelineId);
  if (!row) return null;

  const normalized = normalizeContext(JSON.parse(row.context));
  runtimeStore.setContext(pipelineId, normalized);
  const persistence = runtimeStore.getPersistence(pipelineId);
  persistence.contextDirty = false;
  persistence.lastContextSerialized = JSON.stringify(normalized);
  persistence.lastPersistedContextSerialized = persistence.lastContextSerialized;
  hydrateRuntimeCollections(pipelineId);
  return normalized;
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
  runtimeStore.setContext(pipelineId, normalized);
  schedulePersistence(pipelineId);
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

function getVigenteOutputsFromRuntime(outputs = []) {
  return (Array.isArray(outputs) ? outputs : []).filter(output => {
    const estado = output?.estado || output?.status || null;
    return ['done', 'ok', 'ready', 'completed', 'vigente'].includes(String(estado || '').toLowerCase());
  });
}

function getVigenteOutputs(pipelineId) {
  return getVigenteOutputsFromRuntime(getRuntimeOutputs(pipelineId));
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
  const MAX_EVENTOS = 50;
  const historial = [...(ctx.historial_eventos || []), entry];
  const completados = [...(ctx.eventos_completados || []), entry];
  return patchContext(pipelineId, {
    historial_eventos: historial.slice(-MAX_EVENTOS),
    eventos_completados: completados.slice(-MAX_EVENTOS),
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

const AGENT_MENU_DEFAULTS = {
  'AG-00': { nombre: 'Arquitecto', rol_en_pipeline: 'Disena la estructura inicial del pipeline.', acciones_habilitadas: ['prepare'], obligatorio: false },
  'AG-01': { nombre: 'Piloto', rol_en_pipeline: 'Coordina el pipeline y consolida resultados.', acciones_habilitadas: ['control_loop'], obligatorio: true },
  'AG-02': { nombre: 'Orquestador', rol_en_pipeline: 'Coordina aprobaciones y decisiones operativas.', acciones_habilitadas: ['coordinar'], obligatorio: false },
  'AG-03': { nombre: 'Escritor', rol_en_pipeline: 'Genera y desarrolla contenido textual.', acciones_habilitadas: ['generar_texto'], obligatorio: false },
  'AG-04': { nombre: 'Img Gen', rol_en_pipeline: 'Genera recursos visuales e imagenes.', acciones_habilitadas: ['generar_imagen'], obligatorio: false },
  'AG-05': { nombre: 'Editor', rol_en_pipeline: 'Refina prompts, recopila feedback y ajusta entregables.', acciones_habilitadas: ['editar'], obligatorio: false },
  'AG-06': { nombre: 'Investigador', rol_en_pipeline: 'Investiga referencias y valida informacion.', acciones_habilitadas: ['investigar'], obligatorio: false },
  'AG-07': { nombre: 'Digestor', rol_en_pipeline: 'Consolida resultados y prepara la revision final.', acciones_habilitadas: ['consolidar'], obligatorio: false },
};

function normalizeAgentEntry(agent) {
  if (typeof agent === 'string') return { id: agent };
  if (!agent || typeof agent !== 'object') return null;
  const id = agent.id || agent.agente_id || agent.agent_id || null;
  if (!id) return null;
  return { ...agent, id };
}

function buildDefaultAgentEntry(agentId) {
  const base = AGENT_MENU_DEFAULTS[agentId] || {};
  return {
    id: agentId,
    nombre: base.nombre || agentId,
    rol_en_pipeline: base.rol_en_pipeline || null,
    acciones_habilitadas: Array.isArray(base.acciones_habilitadas) ? base.acciones_habilitadas : [],
    obligatorio: Boolean(base.obligatorio),
  };
}

function normalizeAgentMenu(agentMenu = {}, seedTemplate = {}) {
  const rawMenu = agentMenu && typeof agentMenu === 'object' ? { ...agentMenu } : {};
  const rawAgents = Array.isArray(rawMenu.agentes) ? rawMenu.agentes : [];
  const normalizedAgents = rawAgents
    .map(normalizeAgentEntry)
    .filter(Boolean)
    .map(agent => {
      const base = buildDefaultAgentEntry(agent.id);
      return {
        ...base,
        ...agent,
        id: agent.id,
        nombre: agent.nombre || base.nombre,
        rol_en_pipeline: agent.rol_en_pipeline || base.rol_en_pipeline,
        acciones_habilitadas: Array.isArray(agent.acciones_habilitadas) ? agent.acciones_habilitadas : base.acciones_habilitadas,
        obligatorio: typeof agent.obligatorio === 'boolean' ? agent.obligatorio : base.obligatorio,
      };
    });

  const present = new Set(normalizedAgents.map(agent => agent.id));
  const orderAgents = Array.isArray(seedTemplate?.orden_produccion)
    ? [...new Set(seedTemplate.orden_produccion.map(step => step?.agente).filter(Boolean))]
    : [];

  if (!present.has('AG-01')) {
    normalizedAgents.unshift(buildDefaultAgentEntry('AG-01'));
    present.add('AG-01');
  }

  orderAgents.forEach(agentId => {
    if (present.has(agentId)) return;
    normalizedAgents.push(buildDefaultAgentEntry(agentId));
    present.add(agentId);
  });

  return {
    ...rawMenu,
    pipeline_id: rawMenu.pipeline_id || seedTemplate?.template_id || rawMenu.descripcion || 'pipeline_generado',
    agentes: normalizedAgents,
  };
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
      sugerencia: pref.sugerencia || pref.suggestion || pref.default_value || '',
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
  runtimeStore.clearPipeline(pipelineId);
  db.deleteContext.run(pipelineId);
}

const MAX_PIPELINE_BLOCKS = 12;
const MAX_PIPELINE_STEPS  = 12;

function dedupeList(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
}

function resolveStepDependencies(order = [], dependeDe = []) {
  if (!Array.isArray(dependeDe)) return [];
  return dependeDe
    .map(dep => {
      if (typeof dep === 'number') {
        return order.find(step => Number(step?.paso) === dep)?.bloque || null;
      }
      const depStr = String(dep || '').trim();
      if (/^\d+$/.test(depStr)) {
        return order.find(step => Number(step?.paso) === Number(depStr))?.bloque || null;
      }
      return depStr || null;
    })
    .filter(Boolean);
}

function isVideoPipelineSeed(seed = {}) {
  const combined = [
    seed.template_id,
    seed.descripcion,
    seed.resultado_final,
    ...(Array.isArray(seed.bloques_requeridos) ? seed.bloques_requeridos : []),
  ].join(' ').toLowerCase();
  return /video|clip|clips|tiktok|reels|shorts?|youtube/.test(combined);
}

function normalizeVideoStep(step = {}, index = 0) {
  const blockName = String(step?.bloque || '').toLowerCase();
  const actionName = String(step?.accion || '').toLowerCase();
  const note = String(step?.nota || '').toLowerCase();
  const combined = `${blockName} ${actionName} ${note}`;

  if (blockName === 'preferencias_usuario' || /preferenc/.test(combined)) {
    return {
      paso: index + 1,
      bloque: 'preferencias_usuario',
      agente: 'AG-05',
      accion: 'recopilar_preferencias_usuario',
      requiere_aprobacion_usuario: false,
      puede_paralelizarse: false,
      nota: step?.nota || 'Recopilar tema, estilo y duración del video.',
    };
  }

  if (/revision_final|revisar_video|revisi/.test(combined)) {
    return {
      paso: index + 1,
      bloque: 'revision_final',
      agente: 'AG-07',
      accion: 'revisar_y_consolidar',
      requiere_aprobacion_usuario: false,
      puede_paralelizarse: false,
      nota: step?.nota || 'Revisión final del video ensamblado.',
    };
  }

  if (/ensambl|unir_clips|agregar_musica|musica|transicion|transici|final/.test(combined)) {
    return {
      paso: index + 1,
      bloque: 'video_ensamblado',
      agente: 'AG-07',
      accion: 'ensamblar_video',
      requiere_aprobacion_usuario: false,
      puede_paralelizarse: false,
      nota: step?.nota || 'Unir clips en un solo video final.',
    };
  }

  if (
    /guion|script|narraci|storyboard|sinopsis|escritura|outline|descripcion.*escena|escena.*descripcion/.test(combined)
    || blockName === 'guion_escenas'
    || actionName === 'generar_guion'
  ) {
    return {
      paso: index + 1,
      bloque: 'guion_escenas',
      agente: 'AG-03',
      accion: 'generar_guion',
      requiere_aprobacion_usuario: false,
      puede_paralelizarse: false,
      nota: step?.nota || 'Preparar guion y descripción de escenas.',
    };
  }

  if (/clip|video|escena/.test(combined)) {
    return {
      paso: index + 1,
      bloque: 'clips_video',
      agente: 'AG-04',
      accion: 'generar_video',
      requiere_aprobacion_usuario: false,
      puede_paralelizarse: true,
      nota: step?.nota || 'Generar clips de video a partir del guion.',
    };
  }

  return {
    paso: index + 1,
    bloque: 'guion_escenas',
    agente: 'AG-03',
    accion: 'generar_guion',
    requiere_aprobacion_usuario: false,
    puede_paralelizarse: false,
    nota: step?.nota || 'Preparar guion y descripción de escenas.',
  };
}

function canonicalizeVideoSeed(seed = {}) {
  const prefs = Array.isArray(seed.preferencias_requeridas) ? seed.preferencias_requeridas : [];
  const rawOrder = Array.isArray(seed.orden_produccion) ? seed.orden_produccion : [];
  const normalizedOrder = rawOrder.map((step, index) => normalizeVideoStep(step, index));
  const byBlock = new Map();

  normalizedOrder.forEach(step => {
    if (!byBlock.has(step.bloque)) byBlock.set(step.bloque, step);
  });

  if (!byBlock.has('preferencias_usuario')) {
    byBlock.set('preferencias_usuario', normalizeVideoStep({ bloque: 'preferencias_usuario' }, 0));
  }
  if (!byBlock.has('guion_escenas')) {
    byBlock.set('guion_escenas', normalizeVideoStep({ bloque: 'guion_escenas', accion: 'generar_guion' }, 1));
  }
  if (!byBlock.has('clips_video')) {
    byBlock.set('clips_video', normalizeVideoStep({ bloque: 'clips_video', accion: 'generar_video' }, 2));
  }
  if (!byBlock.has('video_ensamblado')) {
    byBlock.set('video_ensamblado', normalizeVideoStep({ bloque: 'video_ensamblado', accion: 'ensamblar_video' }, 3));
  }
  if (!byBlock.has('revision_final')) {
    byBlock.set('revision_final', normalizeVideoStep({ bloque: 'revision_final', accion: 'revisar_y_consolidar' }, 4));
  }

  const orderedBlocks = ['preferencias_usuario', 'guion_escenas', 'clips_video', 'video_ensamblado', 'revision_final']
    .filter(block => byBlock.has(block));

  const finalOrder = orderedBlocks.map((block, index) => {
    const base = byBlock.get(block);
    const depende_de = index === 0 ? [] : [orderedBlocks[index - 1]];
    return {
      ...base,
      paso: index + 1,
      bloque: block,
      depende_de,
    };
  });

  return {
    ...seed,
    template_id: seed.template_id || 'video_pipeline',
    bloques_requeridos: orderedBlocks,
    orden_produccion: finalOrder,
    preferencias_requeridas: prefs,
    reglas_especiales: dedupeList([
      ...(Array.isArray(seed.reglas_especiales) ? seed.reglas_especiales : []),
      'Para video final, usar AG-07 con SKL-08 para concatenar clips.',
    ]),
  };
}

function normalizeSeedTemplate(seed) {
  if (!seed || typeof seed !== 'object') return seed;
  const normalized = { ...seed };
  const rawOrder = Array.isArray(normalized.orden_produccion) ? normalized.orden_produccion : [];

  normalized.bloques_requeridos = dedupeList(
    Array.isArray(normalized.bloques_requeridos) ? normalized.bloques_requeridos : []
  );

  normalized.orden_produccion = rawOrder.map((step, index) => ({
    ...step,
    paso: Number(step?.paso) || index + 1,
    depende_de: resolveStepDependencies(rawOrder, step?.depende_de),
  }));

  if (isVideoPipelineSeed(normalized)) {
    return canonicalizeVideoSeed(normalized);
  }

  return normalized;
}

function clampSeedTemplate(seed) {
  if (!seed) return seed;
  const clamped = { ...seed };
  if (Array.isArray(clamped.bloques_requeridos) && clamped.bloques_requeridos.length > MAX_PIPELINE_BLOCKS) {
    console.warn(`[context-manager] AG-00 generó ${clamped.bloques_requeridos.length} bloques — truncando a ${MAX_PIPELINE_BLOCKS}`);
    // Always keep 'preferencias_usuario' first and 'revision_final' last
    const fixed = clamped.bloques_requeridos.filter(b => b === 'preferencias_usuario' || b === 'revision_final');
    const rest  = clamped.bloques_requeridos.filter(b => b !== 'preferencias_usuario' && b !== 'revision_final');
    const kept  = rest.slice(0, MAX_PIPELINE_BLOCKS - fixed.length);
    clamped.bloques_requeridos = ['preferencias_usuario', ...kept, 'revision_final'].filter((v,i,a) => a.indexOf(v) === i);
  }
  if (Array.isArray(clamped.orden_produccion) && clamped.orden_produccion.length > MAX_PIPELINE_STEPS) {
    console.warn(`[context-manager] AG-00 generó ${clamped.orden_produccion.length} pasos — truncando a ${MAX_PIPELINE_STEPS}`);
    clamped.orden_produccion = clamped.orden_produccion.slice(0, MAX_PIPELINE_STEPS);
  }
  return clamped;
}

function saveSeed(pipelineId, seedTemplate, agentMenu) {
  const safeSeed = clampSeedTemplate(normalizeSeedTemplate(seedTemplate));
  const normalizedAgentMenu = normalizeAgentMenu(agentMenu, safeSeed);
  db.upsertSeed.run(pipelineId, JSON.stringify(safeSeed), JSON.stringify(normalizedAgentMenu));

  const ctx = getContext(pipelineId);
  if (ctx) {
    const hydrated = hydrateContextFromSeed(ctx, safeSeed, normalizedAgentMenu);
    const saved = setContext(pipelineId, hydrated);
    recordEvent(pipelineId, {
      tipo: 'seed_hydrated',
      fuente: 'AG-00',
      mensaje: 'La semilla del pipeline fue materializada dentro del contexto.',
      payload: {
        template_id: safeSeed?.template_id || null,
        bloques: Object.keys(saved.bloques || {}),
        agentes: Object.keys(saved.agentes_activos || {}),
      },
    });
  }
}

function getSeed(pipelineId) {
  const row = db.getSeed.get(pipelineId);
  if (!row) return null;
  const seedTemplate = JSON.parse(row.seed_template);
  const agentMenu = normalizeAgentMenu(JSON.parse(row.agent_menu), seedTemplate);
  return {
    seed_template: seedTemplate,
    agent_menu: agentMenu,
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

function hydrateRuntimeCollections(pipelineId) {
  const runtimeOutputs = runtimeStore.getOutputs(pipelineId);
  if (!runtimeOutputs.length) {
    const rows = db.getOutputs.all(pipelineId);
    runtimeStore.setOutputs(pipelineId, rows.map(row => ({
      public_id: row.public_id,
      pipeline_id: row.pipeline_id,
      agent_id: row.agent_id,
      tipo: row.output_type,
      estado: row.status,
      bloque: row.block_key,
      contenido: row.content,
      metadata: parseJsonField(row.metadata, {}),
      created_at: row.created_at,
      updated_at: row.updated_at,
    })));
    runtimeStore.getPersistence(pipelineId).outputsDirty = false;
  }

  const runtimeQuestions = runtimeStore.getOperatorQuestions(pipelineId);
  if (!runtimeQuestions.length) {
    const rows = db.getOperatorQuestions.all(pipelineId);
    runtimeStore.setOperatorQuestions(pipelineId, rows.map(row => ({
      field_key: parseJsonField(row.metadata, {})?.field_key || null,
      public_id: row.public_id,
      pipeline_id: row.pipeline_id,
      agent_id: row.agent_id,
      question: row.question_text,
      suggestion: row.suggestion,
      answer: row.answer,
      answer_origin: row.answer_origin,
      status: row.status,
      metadata: parseJsonField(row.metadata, {}),
      created_at: row.created_at,
      updated_at: row.updated_at,
    })));
    runtimeStore.getPersistence(pipelineId).questionsDirty = false;
  }
}

function schedulePersistence(pipelineId) {
  runtimeStore.setPersistenceTimer(pipelineId, setTimeout(() => {
    flushPipelinePersistence(pipelineId);
  }, PERSISTENCE_DELAY_MS));
}

function flushPipelinePersistence(pipelineId) {
  runtimeStore.clearPersistenceTimer(pipelineId);
  const state = runtimeStore.ensurePipelineState(pipelineId);
  const persistence = state.persistence;

  if (persistence.contextDirty && state.context) {
    const serialized = persistence.lastContextSerialized || JSON.stringify(state.context);
    db.upsertContext.run(pipelineId, serialized);
    persistContextVersionIfChanged(pipelineId, serialized);
    persistence.contextDirty = false;
    persistence.lastPersistedContextSerialized = serialized;
  }

  if (persistence.outputsDirty) {
    db.deleteOutputsByPipeline.run(pipelineId);
    for (const output of state.outputs) {
      db.upsertOutput.run(
        output.public_id,
        output.pipeline_id || pipelineId,
        output.agent_id || null,
        output.tipo || output.output_type || 'json',
        output.estado || output.status || 'pending',
        output.bloque || output.block_key || null,
        serializeNullable(output.contenido),
        JSON.stringify(output.metadata || {})
      );
    }
    persistence.outputsDirty = false;
  }

  if (persistence.questionsDirty) {
    db.deleteOperatorQuestionsByPipeline.run(pipelineId);
    for (const question of state.operatorQuestions) {
      db.upsertOperatorQuestion.run(
        question.public_id,
        question.pipeline_id || pipelineId,
        question.agent_id || 'AG-05',
        question.question || question.question_text || '',
        question.suggestion || null,
        question.answer || null,
        question.answer_origin || null,
        question.status || 'pending',
        JSON.stringify({ ...(question.metadata || {}), field_key: question.field_key || null })
      );
    }
    persistence.questionsDirty = false;
  }
}

function persistContextVersionIfChanged(pipelineId, serializedContext) {
  const persistence = runtimeStore.getPersistence(pipelineId);
  if (persistence.lastPersistedContextSerialized === serializedContext) return;

  const latest = db.getLatestContextVersion.get(pipelineId);
  const nextVersionNo = Number(latest?.version_no || 0) + 1;
  db.insertContextVersion.run(
    randomUUID(),
    pipelineId,
    nextVersionNo,
    'runtime_lazy_save',
    serializedContext
  );
}

function getRuntimeOutputs(pipelineId) {
  getContext(pipelineId);
  return runtimeStore.getOutputs(pipelineId);
}

function upsertRuntimeOutput(pipelineId, output = {}) {
  const normalized = {
    public_id: output.public_id || randomUUID(),
    pipeline_id: output.pipeline_id || pipelineId,
    agent_id: output.agent_id || null,
    tipo: output.tipo || output.output_type || 'json',
    estado: output.estado || output.status || 'pending',
    bloque: output.bloque || output.block_key || null,
    contenido: output.contenido ?? output.content ?? null,
    metadata: output.metadata || {},
    created_at: output.created_at || nowIso(),
    updated_at: nowIso(),
  };
  runtimeStore.upsertOutput(pipelineId, normalized);
  schedulePersistence(pipelineId);
  return normalized;
}

function getOperatorQuestions(pipelineId) {
  const ctx = getContext(pipelineId);
  const questions = runtimeStore.getOperatorQuestions(pipelineId);
  // If runtimeStore has no questions but context has pending ones, synthesize from context
  if (!questions.length && ctx) {
    const pendingFromCtx = Array.isArray(ctx.preguntas_pendientes) ? ctx.preguntas_pendientes : [];
    if (pendingFromCtx.length) {
      const synthesized = pendingFromCtx.map(item => ({
        public_id: item.public_id,
        pipeline_id: pipelineId,
        agent_id: item.agent_id || 'AG-05',
        field_key: item.field_key || item.metadata?.field_key || null,
        question: item.question || '',
        suggestion: item.suggestion || null,
        answer: null,
        answer_origin: null,
        status: item.status || 'pending',
        metadata: item.metadata || {},
        created_at: item.created_at || null,
        updated_at: item.updated_at || null,
      })).filter(q => q.public_id && q.status !== 'answered');
      if (synthesized.length) {
        runtimeStore.setOperatorQuestions(pipelineId, synthesized);
        return synthesized;
      }
    }
  }
  return questions;
}

function upsertOperatorQuestion(pipelineId, question = {}) {
  const normalized = {
    public_id: question.public_id || randomUUID(),
    pipeline_id: question.pipeline_id || pipelineId,
    agent_id: question.agent_id || 'AG-05',
    field_key: question.field_key || question.fieldKey || null,
    question: question.question || question.question_text || '',
    suggestion: question.suggestion || null,
    answer: question.answer || null,
    answer_origin: question.answer_origin || null,
    status: question.status || 'pending',
    metadata: question.metadata || {},
    created_at: question.created_at || nowIso(),
    updated_at: nowIso(),
  };
  runtimeStore.upsertOperatorQuestion(pipelineId, normalized);
  // Flush questions to DB immediately so they survive server restarts
  const allQuestions = runtimeStore.getOperatorQuestions(pipelineId);
  db.deleteOperatorQuestionsByPipeline.run(pipelineId);
  for (const q of allQuestions) {
    db.upsertOperatorQuestion.run(
      q.public_id,
      q.pipeline_id || pipelineId,
      q.agent_id || 'AG-05',
      q.question || q.question_text || '',
      q.suggestion || null,
      q.answer || null,
      q.answer_origin || null,
      q.status || 'pending',
      JSON.stringify({ ...(q.metadata || {}), field_key: q.field_key || null })
    );
  }
  schedulePersistence(pipelineId);
  return normalized;
}

function parseJsonField(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function serializeNullable(value) {
  if (value == null) return null;
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
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
  getVigenteOutputs,
  getVigenteOutputsFromRuntime,
  recordEvent,
  setPipelineHealth,
  registerAssetRevision,
  hydrateContextFromSeed,
  resetContext,
  deleteContext,
  saveSeed,
  getSeed,
  flushPipelinePersistence,
  getRuntimeOutputs,
  upsertRuntimeOutput,
  getOperatorQuestions,
  upsertOperatorQuestion,
  normalizeContext,
};
