/**
 * llm-clients.js
 * Centraliza los clientes de LLM y media generation.
 * Soporta: Anthropic, Google Gemini, OpenAI, fal.ai
 */

require('dotenv').config();

const PORT = process.env.PORT || 3000;
const DEFAULT_SITE_URL = process.env.OPENROUTER_SITE_URL || `http://localhost:${PORT}`;

// ── Anthropic ──────────────────────────────────────────────────
let anthropic = null;
if (process.env.ANTHROPIC_API_KEY) {
  const Anthropic = require('@anthropic-ai/sdk');
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  console.log('[LLM] Anthropic ready');
} else {
  console.warn('[LLM] ANTHROPIC_API_KEY not set');
}

// ── Google Gemini ──────────────────────────────────────────────
let googleAI = null;
if (process.env.GOOGLE_API_KEY) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  googleAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  console.log('[LLM] Google Gemini ready');
} else {
  console.warn('[LLM] GOOGLE_API_KEY not set');
}

// ── OpenAI ─────────────────────────────────────────────────────
let openaiClient = null;
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log('[LLM] OpenAI ready');
} else {
  console.warn('[LLM] OPENAI_API_KEY not set');
}

// ── OpenRouter ────────────────────────────────────────────────
let openRouterClient = null;
if (process.env.OPENROUTER_API_KEY) {
  const OpenAI = require('openai');
  openRouterClient = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': DEFAULT_SITE_URL,
      'X-Title': process.env.OPENROUTER_APP_NAME || 'Pipeline',
    },
  });
  console.log('[LLM] OpenRouter ready');
} else {
  console.warn('[LLM] OPENROUTER_API_KEY not set');
}

// ── fal.ai ─────────────────────────────────────────────────────
let fal = null;
if (process.env.FAL_KEY) {
  const { createFalClient } = require('@fal-ai/client');
  fal = createFalClient({ credentials: process.env.FAL_KEY });
  console.log('[LLM] fal.ai ready');
} else {
  console.warn('[LLM] FAL_KEY not set');
}

// ── Google GenAI (Veo video generation) ────────────────────────
let genaiClient = null;
if (process.env.GOOGLE_API_KEY) {
  try {
    const { GoogleGenAI } = require('@google/genai');
    genaiClient = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    console.log('[LLM] Google GenAI (Veo) ready');
  } catch (e) {
    console.warn('[LLM] @google/genai not available — Veo disabled:', e.message);
  }
}

// ── Budget recording (lazy require to avoid circular deps) ─────
function _recordUsage(opts, provider, model, inputTokens, outputTokens) {
  if (!opts?.pipelineId) return;
  try {
    require('./budget').recordUsage(opts.pipelineId, opts.agentId || null, provider, model, inputTokens, outputTokens);
  } catch (e) {
    console.warn('[llm-clients] budget.recordUsage error:', e.message);
  }
}

// ── callLLM — router principal ─────────────────────────────────
/**
 * Llama al LLM correcto según el provider del agente.
 * @param {string} provider  — 'anthropic' | 'google' | 'openai'
 * @param {string} model     — ID del modelo
 * @param {string} systemPrompt
 * @param {Array}  messages  — [{ role, content }]
 * @param {object} opts      — { stream, maxTokens }
 */
async function callLLM(provider, model, systemPrompt, messages, opts = {}) {
  switch (provider) {
    case 'anthropic': return callClaude(model, systemPrompt, messages, opts);
    case 'google':    return callGemini(model, systemPrompt, messages, opts);
    case 'openai':    return callOpenAI(model, systemPrompt, messages, opts);
    case 'openrouter':return callOpenRouter(model, systemPrompt, messages, opts);
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}

// ── Anthropic ──────────────────────────────────────────────────
async function callClaude(model, systemPrompt, messages, opts = {}) {
  if (!anthropic) throw new Error('Anthropic not initialized — check ANTHROPIC_API_KEY');
  const maxTokens = opts.maxTokens || 8192;

  if (opts.stream) {
    return anthropic.messages.stream({ model, max_tokens: maxTokens, system: systemPrompt, messages });
  }

  const response = await anthropic.messages.create({ model, max_tokens: maxTokens, system: systemPrompt, messages });
  if (response.usage) {
    if (opts.agentId) require('./token-tracker').add(opts.agentId, 'anthropic', model, response.usage.input_tokens, response.usage.output_tokens);
    _recordUsage(opts, 'anthropic', model, response.usage.input_tokens, response.usage.output_tokens);
  }
  return response.content[0].text;
}

// ── Google Gemini ──────────────────────────────────────────────
async function callGemini(model, systemPrompt, messages, opts = {}) {
  if (!googleAI) throw new Error('Google AI not initialized — check GOOGLE_API_KEY');

  const gemini = googleAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
  });

  // Convertir formato Anthropic → Gemini
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const lastMessage = messages[messages.length - 1];

  const chat = gemini.startChat({ history });
  const result = await chat.sendMessage(lastMessage.content);
  if (result.response.usageMetadata) {
    const u = result.response.usageMetadata;
    if (opts.agentId) require('./token-tracker').add(opts.agentId, 'google', model, u.promptTokenCount || 0, u.candidatesTokenCount || 0);
    _recordUsage(opts, 'google', model, u.promptTokenCount || 0, u.candidatesTokenCount || 0);
  }
  return result.response.text();
}

// ── OpenAI ─────────────────────────────────────────────────────
async function callOpenAI(model, systemPrompt, messages, opts = {}) {
  if (!openaiClient) throw new Error('OpenAI not initialized — check OPENAI_API_KEY');
  const maxTokens = opts.maxTokens || 8192;

  const msgs = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  if (opts.stream) {
    return openaiClient.chat.completions.create({ model, max_tokens: maxTokens, messages: msgs, stream: true });
  }

  const response = await openaiClient.chat.completions.create({ model, max_tokens: maxTokens, messages: msgs });
  if (response.usage) {
    if (opts.agentId) {
      require('./token-tracker').add(opts.agentId, 'openai', model, response.usage.prompt_tokens, response.usage.completion_tokens);
    }
    _recordUsage(opts, 'openai', model, response.usage.prompt_tokens, response.usage.completion_tokens);
  }
  return response.choices[0].message.content;
}

// ── OpenRouter ────────────────────────────────────────────────
async function callOpenRouter(model, systemPrompt, messages, opts = {}) {
  if (!openRouterClient) throw new Error('OpenRouter not initialized — check OPENROUTER_API_KEY');
  const maxTokens = opts.maxTokens || 8192;

  const msgs = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  if (opts.stream) {
    return openRouterClient.chat.completions.create({ model, max_tokens: maxTokens, messages: msgs, stream: true });
  }

  const response = await openRouterClient.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: msgs,
  });
  if (response.usage) {
    if (opts.agentId) {
      require('./token-tracker').add(opts.agentId, 'openrouter', model, response.usage.prompt_tokens, response.usage.completion_tokens);
    }
    _recordUsage(opts, 'openrouter', model, response.usage.prompt_tokens, response.usage.completion_tokens);
  }
  return response.choices[0].message.content;
}

// ── fal.ai ─────────────────────────────────────────────────────
async function callFal(modelId, input) {
  if (!fal) throw new Error('fal.ai not initialized — check FAL_KEY');
  const result = await fal.subscribe(modelId, { input });
  // fal.ai v1.x wraps the payload in result.data
  const data = result?.data || result;
  // Log the raw response so we can debug URL extraction issues
  const isVideo = /video|kling/i.test(modelId);
  const url = isVideo
    ? (data?.video?.url || data?.videos?.[0]?.url || data?.url || null)
    : (data?.images?.[0]?.url || data?.image?.url || data?.url || null);
  console.log(`[fal.ai] ${modelId} → ${url ? 'URL: ' + url.slice(0, 80) : 'NO URL'} | keys: ${Object.keys(data || {}).join(',')}`);
  return data;
}

// ── Google Veo video generation ────────────────────────────────
const fs   = require('fs');
const path = require('path');

/**
 * Generates a video using Google Veo 3 and saves it to public/uploads/.
 * Returns { video: { url: '/uploads/veo_xxx.mp4' }, filename, prompt }
 *
 * @param {string} prompt          — Text description of the video
 * @param {object} config          — { durationSeconds, aspectRatio, includeAudio }
 */
async function callVeo(prompt, config = {}) {
  if (!genaiClient) throw new Error('Google GenAI not initialized — check GOOGLE_API_KEY');

  const model          = process.env.VEO_MODEL || 'veo-3.0-generate-preview';
  const durationSeconds = config.durationSeconds || 8;
  const aspectRatio     = config.aspectRatio     || '16:9';
  const includeAudio    = config.includeAudio !== false;

  console.log(`[Veo] Starting generation → model=${model} dur=${durationSeconds}s aspect=${aspectRatio} audio=${includeAudio}`);

  let operation = await genaiClient.models.generateVideos({
    model,
    prompt,
    config: { durationSeconds, aspectRatio, includeAudio },
  });

  console.log(`[Veo] Operation: ${operation.name}`);

  // Poll until done (Veo typically takes 60–180 s)
  const MAX_WAIT_MS   = 5 * 60 * 1000; // 5 min hard timeout
  const POLL_INTERVAL = 10_000;         // poll every 10 s
  const startTime     = Date.now();

  while (!operation.done) {
    if (Date.now() - startTime > MAX_WAIT_MS) {
      throw new Error(`[Veo] Timeout after ${MAX_WAIT_MS / 1000}s — operation: ${operation.name}`);
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
    operation = await genaiClient.operations.getVideosOperation({ operation });
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Veo] Polling… done=${operation.done} (${elapsed}s elapsed)`);
  }

  const samples = operation.response?.generatedSamples;
  if (!samples?.length) throw new Error('[Veo] No video samples in response');

  // Download and persist to public/uploads/
  const videoUri  = samples[0].video.uri;
  const apiKey    = process.env.GOOGLE_API_KEY;
  const dlRes     = await fetch(`${videoUri}?key=${apiKey}`);
  if (!dlRes.ok) throw new Error(`[Veo] Download failed: ${dlRes.status} ${dlRes.statusText}`);

  const buffer    = Buffer.from(await dlRes.arrayBuffer());
  const filename  = `veo_${Date.now()}.mp4`;
  const uploadDir = path.join(__dirname, 'public', 'uploads');
  fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, filename), buffer);

  const localUrl = `/uploads/${filename}`;
  console.log(`[Veo] Video saved → ${localUrl} (${buffer.length} bytes)`);
  return { video: { url: localUrl }, filename, prompt };
}

module.exports = {
  anthropic, googleAI, openaiClient, fal, genaiClient,
  callLLM, callClaude, callGemini, callOpenAI, callFal, callVeo,
  callOpenRouter,
  isTextReady:  () => !!(anthropic || googleAI || openaiClient || openRouterClient),
  isMediaReady: () => !!fal,
  isVeoReady:   () => !!(genaiClient && process.env.GOOGLE_API_KEY),
  isAnthropicReady: () => !!anthropic,
  isGoogleReady:    () => !!googleAI,
  isOpenAIReady:    () => !!openaiClient,
  isOpenRouterReady:() => !!openRouterClient,
};
