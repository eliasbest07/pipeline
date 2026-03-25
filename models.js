/**
 * models.js
 * Registro de modelos disponibles y configuración por defecto por agente.
 * Cada agente puede tener su propio modelo — configurable en runtime y persistido en DB.
 */

const db = require('./db');

// ── Catálogo de modelos disponibles ───────────────────────────
const MODELS_CATALOG = {
  anthropic: [
    { id: 'claude-opus-4-6',           label: 'Claude Opus 4.6',       tier: 'premium',  ctx: 200000 },
    { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6',     tier: 'balanced', ctx: 200000 },
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5',      tier: 'fast',     ctx: 200000 },
  ],
  google: [
    { id: 'gemini-2.0-flash',          label: 'Gemini 2.0 Flash',      tier: 'fast',     ctx: 1000000 },
    { id: 'gemini-2.0-flash-thinking', label: 'Gemini 2.0 Thinking',   tier: 'premium',  ctx: 1000000 },
    { id: 'gemini-1.5-pro',            label: 'Gemini 1.5 Pro',        tier: 'balanced', ctx: 2000000 },
    { id: 'gemini-1.5-flash',          label: 'Gemini 1.5 Flash',      tier: 'fast',     ctx: 1000000 },
  ],
  openai: [
    { id: 'gpt-4o',                    label: 'GPT-4o',                tier: 'premium',  ctx: 128000 },
    { id: 'gpt-4o-mini',               label: 'GPT-4o Mini',           tier: 'fast',     ctx: 128000 },
    { id: 'o3-mini',                   label: 'o3-mini',               tier: 'premium',  ctx: 200000 },
    { id: 'o1-mini',                   label: 'o1-mini',               tier: 'balanced', ctx: 128000 },
  ],
  fal: [
    { id: 'fal-ai/flux/schnell',       label: 'FLUX Schnell',          tier: 'fast',     ctx: null },
    { id: 'fal-ai/flux-pro',           label: 'FLUX Pro',              tier: 'premium',  ctx: null },
    { id: 'fal-ai/playai-tts',         label: 'PlayAI TTS',            tier: 'balanced', ctx: null },
  ],
};

// ── Modelo por defecto por agente ──────────────────────────────
// Lógica de asignación:
// - AG-TERM: haiku (solo routing, máxima velocidad)
// - AG-00 Arquitecto: sonnet (razonamiento estructural)
// - AG-01 Piloto: sonnet (toma de decisiones del loop)
// - AG-02 Orquestador: gemini-flash (coordinación, contexto enorme para ver todo el plan)
// - AG-03 Escritor: opus (calidad máxima en generación de contenido)
// - AG-04 IMG Gen: flux/schnell (fal.ai, ya manejado por agent-runner)
// - AG-05 Editor: gemini-flash (interacción rápida con usuario)
// - AG-06 Investigador: gemini-1.5-pro (ventana de 2M tokens para documentos grandes)
// - AG-07 Digestor: sonnet (auditoría con criterio balanceado)

const DEFAULT_AGENT_MODELS = {
  'AG-TERM': { provider: 'openai',    model: 'gpt-4o-mini' },
  'AG-00':   { provider: 'openai',    model: 'gpt-4o' },
  'AG-01':   { provider: 'openai',    model: 'gpt-4o-mini' },
  'AG-02':   { provider: 'openai',    model: 'gpt-4o-mini' },
  'AG-03':   { provider: 'openai',    model: 'gpt-4o' },
  'AG-04':   { provider: 'fal',       model: 'fal-ai/flux/schnell' },
  'AG-05':   { provider: 'openai',    model: 'gpt-4o-mini' },
  'AG-06':   { provider: 'openai',    model: 'gpt-4o' },
  'AG-07':   { provider: 'openai',    model: 'gpt-4o-mini' },
};

// ── Overrides en runtime — cargados desde DB al inicio ────────
const runtimeOverrides = new Map();

// Hydrate from DB on module load
try {
  for (const row of db.getModelOverrides.all()) {
    runtimeOverrides.set(row.agent_id, { provider: row.provider, model: row.model });
  }
} catch (e) {
  console.warn('[models] Could not load overrides from DB:', e.message);
}

function setAgentModel(agentId, provider, model) {
  runtimeOverrides.set(agentId, { provider, model });
  db.upsertModelOverride.run(agentId, provider, model);
}

function getAgentModel(agentId) {
  return runtimeOverrides.get(agentId) || DEFAULT_AGENT_MODELS[agentId] || DEFAULT_AGENT_MODELS['AG-01'];
}

function getAllAgentModels() {
  const result = {};
  for (const agentId of Object.keys(DEFAULT_AGENT_MODELS)) {
    result[agentId] = {
      ...DEFAULT_AGENT_MODELS[agentId],
      ...(runtimeOverrides.get(agentId) || {}),
      is_custom: runtimeOverrides.has(agentId),
    };
  }
  return result;
}

function resetAgentModel(agentId) {
  runtimeOverrides.delete(agentId);
  db.deleteModelOverride.run(agentId);
}

function getCatalog() {
  return MODELS_CATALOG;
}

module.exports = {
  MODELS_CATALOG,
  DEFAULT_AGENT_MODELS,
  setAgentModel,
  getAgentModel,
  getAllAgentModels,
  resetAgentModel,
  getCatalog,
};
