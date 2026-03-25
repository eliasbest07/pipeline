/**
 * llm-clients.js
 * Centraliza los clientes de LLM y media generation.
 * Soporta: Anthropic, Google Gemini, OpenAI, fal.ai
 */

require('dotenv').config();

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

// ── fal.ai ─────────────────────────────────────────────────────
let fal = null;
if (process.env.FAL_KEY) {
  const { createFalClient } = require('@fal-ai/client');
  fal = createFalClient({ credentials: process.env.FAL_KEY });
  console.log('[LLM] fal.ai ready');
} else {
  console.warn('[LLM] FAL_KEY not set');
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
  if (opts.agentId && response.usage) {
    require('./token-tracker').add(opts.agentId, 'anthropic', model, response.usage.input_tokens, response.usage.output_tokens);
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
  if (opts.agentId && result.response.usageMetadata) {
    const u = result.response.usageMetadata;
    require('./token-tracker').add(opts.agentId, 'google', model, u.promptTokenCount || 0, u.candidatesTokenCount || 0);
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
  if (opts.agentId && response.usage) {
    require('./token-tracker').add(opts.agentId, 'openai', model, response.usage.prompt_tokens, response.usage.completion_tokens);
  }
  return response.choices[0].message.content;
}

// ── fal.ai ─────────────────────────────────────────────────────
async function callFal(modelId, input) {
  if (!fal) throw new Error('fal.ai not initialized — check FAL_KEY');
  const result = await fal.subscribe(modelId, { input });
  // fal.ai v1.x wraps the payload in result.data
  return result?.data || result;
}

module.exports = {
  anthropic, googleAI, openaiClient, fal,
  callLLM, callClaude, callGemini, callOpenAI, callFal,
  isTextReady:  () => !!(anthropic || googleAI || openaiClient),
  isMediaReady: () => !!fal,
  isAnthropicReady: () => !!anthropic,
  isGoogleReady:    () => !!googleAI,
  isOpenAIReady:    () => !!openaiClient,
};
