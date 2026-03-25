/**
 * agent-runner.js
 * Ejecuta un agente dado su ID, input y contexto.
 * Usa el modelo configurado por agente (models.js).
 */

const fs = require('fs');
const path = require('path');
const { callLLM, callFal, isTextReady, isMediaReady, isAnthropicReady, isGoogleReady, isOpenAIReady } = require('./llm-clients');
const { getAgentModel } = require('./models');
const pipelineConfig = require('./system_prompt/pipeline_config.json');
const skills = require('./skills');

// ── Provider fallback chain ────────────────────────────────────
const FALLBACK_MODELS = {
  openai:    'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5-20251001',
  google:    'gemini-2.0-flash',
};

function isQuotaError(err) {
  const m = err?.message || '';
  return m.includes('429') || m.includes('Too Many Requests') || m.includes('quota') ||
         m.includes('credit balance') || m.includes('402') || m.includes('insufficient');
}

function getAvailableProviders(preferred) {
  const all = ['openai','anthropic','google'];
  const avail = all.filter(p => {
    if (p === 'anthropic') return isAnthropicReady();
    if (p === 'google')    return isGoogleReady();
    if (p === 'openai')    return isOpenAIReady();
    return false;
  });
  // preferred first, then others
  return [preferred, ...avail.filter(p => p !== preferred)].filter(Boolean);
}

async function callLLMWithFallback(agentId, preferredProvider, preferredModel, systemPrompt, messages, opts = {}) {
  const providers = getAvailableProviders(preferredProvider);
  let lastErr;
  for (const provider of providers) {
    const model = provider === preferredProvider ? preferredModel : FALLBACK_MODELS[provider];
    if (!model) continue;
    try {
      return await callLLM(provider, model, systemPrompt, messages, { ...opts, agentId });
    } catch (err) {
      lastErr = err;
      if (isQuotaError(err)) {
        console.warn(`[agent-runner] ${agentId} ${provider}/${model} quota/credit error — trying next provider`);
        continue;
      }
      throw err; // non-quota error, propagate immediately
    }
  }
  throw lastErr || new Error('No LLM provider available');
}

const PROMPTS_DIR = path.join(__dirname, 'system_prompt');

const AGENT_PROMPT_FILES = {
  'AG-TERM': 'ag_terminal_system_prompt.md',
  'AG-00':   'ag00_arquitecto_system_prompt.md',
  'AG-01':   'ag01_pilot_system_prompt.md',
  'AG-02':   'ag02_orquestador_system_prompt.md',
  'AG-03':   'ag03_escritor_system_prompt.md',
  'AG-04':   'ag04_generador_img_system_prompt.md',
  'AG-05':   'ag05_editor_system_prompt.md',
  'AG-06':   'ag06_investigador_system_prompt.md',
  'AG-07':   'ag07_digestor_system_prompt.md',
};

const MEDIA_AGENTS = new Set(['AG-04']);
const SPECIALIST_AGENTS = new Set(['AG-03', 'AG-04', 'AG-06', 'AG-07']);

const FAL_MODELS = {
  image:       'fal-ai/flux/schnell',
  image_quality:'fal-ai/flux-pro',
  video:       'fal-ai/kling-video/v1.6/standard/text-to-video',
  audio_tts:   'fal-ai/playai-tts',
};

const promptCache = new Map();

function loadSystemPrompt(agentId) {
  if (promptCache.has(agentId)) return promptCache.get(agentId);
  const filename = AGENT_PROMPT_FILES[agentId];
  if (!filename) throw new Error(`Unknown agent ID: ${agentId}`);
  const filepath = path.join(PROMPTS_DIR, filename);
  if (!fs.existsSync(filepath)) throw new Error(`System prompt not found: ${filepath}`);
  const content = fs.readFileSync(filepath, 'utf-8');
  promptCache.set(agentId, content);
  return content;
}

// ── Runner principal ───────────────────────────────────────────
async function runAgent(agentId, userInput, context = {}, opts = {}) {
  const systemPrompt = loadSystemPrompt(agentId);

  const contextBlock = Object.keys(context).length > 0
    ? `\n\n--- CONTEXTO ACTUAL DEL PIPELINE ---\n${JSON.stringify(context, null, 2)}\n--- FIN CONTEXTO ---\n\n`
    : '';

  const messages = [{ role: 'user', content: `${contextBlock}${userInput}` }];

  // AG-04: LLM construye el prompt visual → fal.ai genera la imagen
  if (MEDIA_AGENTS.has(agentId)) {
    return runMediaAgent(agentId, systemPrompt, messages);
  }

  if (!isTextReady()) throw new Error('No LLM available — check API keys');

  // Obtener modelo configurado para este agente
  const { provider, model } = getAgentModel(agentId);
  console.log(`[agent-runner] ${agentId} → ${provider}/${model}`);

  const response = await callLLMWithFallback(agentId, provider, model, systemPrompt, messages, { stream: opts.stream });
  if (opts.stream) return response;

  // Detectar y ejecutar skills en la respuesta
  const skillResults = await skills.executeSkillsInResponse(response, opts.pipelineId);
  if (skillResults?.length) {
    const skillContext = `\n\n--- RESULTADOS DE SKILLS ---\n${JSON.stringify(skillResults, null, 2)}\n--- FIN RESULTADOS ---`;
    const messages2 = [...messages, { role: 'assistant', content: response }, { role: 'user', content: skillContext }];
    const postSkillResponse = await callLLMWithFallback(agentId, provider, model, systemPrompt, messages2);
    return SPECIALIST_AGENTS.has(agentId)
      ? normalizeSpecialistResponse(agentId, postSkillResponse, userInput)
      : postSkillResponse;
  }

  return SPECIALIST_AGENTS.has(agentId)
    ? normalizeSpecialistResponse(agentId, response, userInput)
    : response;
}

async function runMediaAgent(agentId, systemPrompt, messages) {
  if (!isTextReady())  throw new Error('LLM required for media prompt building');
  if (!isMediaReady()) throw new Error('FAL_KEY required for image generation');

  const { provider, model } = getAgentModel(agentId);
  const textProvider = provider.startsWith('fal') ? 'anthropic' : provider;
  const textModel   = model.startsWith('fal-ai/') ? 'claude-haiku-4-5-20251001' : model;
  const falModel    = model.startsWith('fal-ai/') ? model : FAL_MODELS.image;

  const llmResponse = await callLLM(textProvider, textModel, systemPrompt, messages);

  // Try to extract structured agent decision
  let agentDecision = null;
  try {
    const jsonMatch = llmResponse.match(/```json\n?([\s\S]*?)\n?```/) || llmResponse.match(/(\{[\s\S]*\})/);
    agentDecision = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(llmResponse);
  } catch { /* no structured response */ }

  let imagePrompt = agentDecision?.resultado?.prompt_usado;

  // Fallback: ask LLM directly for a short visual prompt
  if (!imagePrompt || imagePrompt.trim().length < 15) {
    const promptMessages = [
      ...messages,
      { role: 'assistant', content: llmResponse },
      { role: 'user', content: 'Based on the context above, write ONLY a short visual image prompt in English (max 150 words, no JSON, just the prompt describing the scene/image to generate):' },
    ];
    imagePrompt = await callLLM(textProvider, textModel, systemPrompt, promptMessages);
    imagePrompt = imagePrompt.replace(/^["']|["']$/g, '').trim().slice(0, 400);
    console.log(`[agent-runner] ${agentId} fallback prompt extracted (${imagePrompt.length} chars)`);
  }

  const falResult = await callFal(falModel, {
    prompt: imagePrompt,
    image_size: 'portrait_4_3',
    num_inference_steps: 4,
    num_images: 1,
  });

  const imageUrl = falResult?.images?.[0]?.url || falResult?.image?.url;
  const result = agentDecision || { resultado: {} };

  return normalizeSpecialistResponse(agentId, JSON.stringify({
    ...result,
    resultado: { ...result.resultado, prompt_usado: imagePrompt, imagen_url: imageUrl, fal_model: falModel },
  }, null, 2));
}

function normalizeSpecialistResponse(agentId, rawResponse, userInput = '') {
  const parsed = parseJsonObject(rawResponse);
  if (parsed && parsed.accion && parsed.resultado) {
    const normalized = {
      estado: parsed.estado || (parsed.error ? 'error' : 'ok'),
      accion: parsed.accion,
      bloque_destino: parsed.bloque_destino || extractExpectedBlock(userInput) || inferDefaultBlock(agentId),
      resultado: parsed.resultado,
      asset: parsed.asset || buildAssetFromResult(agentId, parsed),
      error: parsed.error || null,
      siguiente_sugerido: parsed.siguiente_sugerido || null,
    };
    return JSON.stringify(normalized, null, 2);
  }

  const fallback = {
    estado: 'ok',
    accion: extractActionFromInput(userInput) || 'respuesta_especializada',
    bloque_destino: extractExpectedBlock(userInput) || inferDefaultBlock(agentId),
    resultado: {
      contenido: typeof rawResponse === 'string' ? rawResponse.trim() : JSON.stringify(rawResponse, null, 2),
      resumen: summarizeText(rawResponse),
    },
    asset: buildAssetFromResult(agentId, {
      bloque_destino: extractExpectedBlock(userInput) || inferDefaultBlock(agentId),
      resultado: { contenido: typeof rawResponse === 'string' ? rawResponse.trim() : JSON.stringify(rawResponse, null, 2) },
    }),
    error: null,
    siguiente_sugerido: null,
  };
  return JSON.stringify(fallback, null, 2);
}

function parseJsonObject(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const jsonMatch = raw.match(/```json\n?([\s\S]*?)\n?```/) || raw.match(/({[\s\S]*})/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
  } catch {
    return null;
  }
}

function extractActionFromInput(input = '') {
  const match = String(input).match(/Ejecuta la acci[oó]n:\s*"([^\"]+)"/i);
  return match ? match[1].trim() : null;
}

function extractExpectedBlock(input = '') {
  const match = String(input).match(/Bloque destino esperado:\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

function inferDefaultBlock(agentId) {

  if (agentId === 'AG-06') return 'notas_piloto';
  if (agentId === 'AG-07') return 'revision_final';
  return 'resultado';
}

function summarizeText(raw) {
  const text = typeof raw === 'string' ? raw.trim() : JSON.stringify(raw, null, 2);
  return text.slice(0, 280);
}

function buildAssetFromResult(agentId, parsed = {}) {
  const resultado = parsed.resultado || {};
  const bloque = parsed.bloque_destino || null;
  if (agentId === 'AG-04') {
    return {
      tipo_asset: 'imagen',
      bloque,
      prompt: resultado.prompt_usado || resultado.prompt_nuevo || null,
      contenido: resultado.imagen_url || null,
      metadata: resultado,
    };
  }
  if (agentId === 'AG-03') {
    const contenido = resultado.contenido || resultado.contenido_nuevo || resultado.sinopsis || (Array.isArray(resultado.opciones) ? JSON.stringify(resultado.opciones, null, 2) : null);
    return {
      tipo_asset: 'texto',
      bloque,
      prompt: parsed.accion || 'generar_texto',
      contenido: contenido || JSON.stringify(resultado, null, 2),
      metadata: resultado,
    };
  }
  if (agentId === 'AG-06') {
    return {
      tipo_asset: 'investigacion',
      bloque,
      contenido: JSON.stringify(resultado, null, 2),
      metadata: resultado,
    };
  }
  return null;
}

// ── Ejecución con reintentos ────────────────────────────────────
async function runAgentWithRetry(agentId, userInput, context = {}, opts = {}) {
  const maxRetries = pipelineConfig.reintentos.max_por_tarea;
  const delays = pipelineConfig.reintentos.espera_entre_reintentos_segundos;

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await runAgent(agentId, userInput, context, opts);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const waitMs = (delays[attempt] || delays[delays.length - 1]) * 1000;
        console.warn(`[agent-runner] ${agentId} falló (intento ${attempt + 1}/${maxRetries + 1}) — reintentando en ${waitMs / 1000}s`);
        await new Promise(r => setTimeout(r, waitMs));
      }
    }
  }
  throw lastError;
}

function getAvailableAgents() {
  return Object.keys(AGENT_PROMPT_FILES).map(id => ({
    id,
    promptFile: AGENT_PROMPT_FILES[id],
    type: MEDIA_AGENTS.has(id) ? 'media' : 'text',
    model: getAgentModel(id),
  }));
}

function clearPromptCache() { promptCache.clear(); }

module.exports = { runAgent, runAgentWithRetry, loadSystemPrompt, getAvailableAgents, clearPromptCache, FAL_MODELS };
