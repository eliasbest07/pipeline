/**
 * agent-runner.js
 * Ejecuta un agente dado su ID, input y contexto.
 * Usa el modelo configurado por agente (models.js).
 */

const fs = require('fs');
const path = require('path');
const { callLLM, callFal, callVeo, isTextReady, isMediaReady, isVeoReady, isAnthropicReady, isGoogleReady, isOpenAIReady, isOpenRouterReady } = require('./llm-clients');
const { getAgentModel } = require('./models');
const pipelineConfig = require('./system_prompt/pipeline_config.json');
const skills = require('./skills');

// ── Provider fallback chain ────────────────────────────────────
const FALLBACK_MODELS = {
  openrouter: 'openrouter/free',
  openai:    'gpt-4o-mini',
  anthropic: 'claude-haiku-4-5-20251001', // only used if explicitly configured
  google:    'gemini-2.0-flash',
};

const FAST_RUNTIME_MODELS = {}; // No hardcoded fast models — use models.js defaults

function isQuotaError(err) {
  const m = err?.message || '';
  return m.includes('429') || m.includes('Too Many Requests') || m.includes('quota') ||
         m.includes('credit balance') || m.includes('402') || m.includes('insufficient');
}

function getAvailableProviders(preferred) {
  // Priority order: openrouter (free) first, then google, then openai, then anthropic
  const all = ['openrouter','google','openai','anthropic'];
  const avail = all.filter(p => {
    if (p === 'openrouter') return isOpenRouterReady();
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
      if (typeof opts.onModelResolved === 'function') opts.onModelResolved({ provider, model, agentId, fallback: provider !== preferredProvider });
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
  video:       process.env.FAL_VIDEO_TEXT_MODEL || 'fal-ai/minimax-video/text-to-video',
  video_img2vid: process.env.FAL_VIDEO_IMAGE_MODEL || 'fal-ai/veo3.1/fast/image-to-video',
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
    return runMediaAgent(agentId, systemPrompt, messages, opts);
  }

  if (!isTextReady()) throw new Error('No LLM available — check API keys');

  // Obtener modelo configurado para este agente
  const configuredModel = getAgentModel(agentId);
  const runtimeOverride = opts.pipelineId ? FAST_RUNTIME_MODELS[agentId] : null;
  const provider = runtimeOverride?.provider || configuredModel.provider;
  const model = runtimeOverride?.model || configuredModel.model;
  console.log(`[agent-runner] ${agentId} → ${provider}/${model}${runtimeOverride ? ' (runtime-fast)' : ''}`);

  // Budget gate — checks tier + remaining BP before calling the LLM
  if (opts.pipelineId) {
    const { checkBudget } = require('./budget');
    checkBudget(opts.pipelineId, provider, model);
  }

  // ── Streaming mode (onChunk callback) ──────────────────────────
  if (opts.onChunk && typeof opts.onChunk === 'function') {
    let fullText = '';
    try {
      const stream = await callLLMWithFallback(agentId, provider, model, systemPrompt, messages, {
        stream: true,
        pipelineId: opts.pipelineId,
        onModelResolved: opts.onModelResolved,
        maxTokens: agentId === 'AG-07' ? 16384 : undefined,
      });
      for await (const chunk of stream) {
        // OpenAI / OpenRouter format
        const openaiDelta = chunk.choices?.[0]?.delta?.content;
        // Anthropic format
        const anthropicDelta = chunk.type === 'content_block_delta' ? (chunk.delta?.text || '') : '';
        const delta = (typeof openaiDelta === 'string' ? openaiDelta : '') || anthropicDelta;
        if (delta) { fullText += delta; opts.onChunk(delta, fullText); }
      }
    } catch (streamErr) {
      // Stream failed — if we have some text already use it; else fall through to normal call
      if (!fullText) {
        console.warn(`[agent-runner] ${agentId} stream failed (${streamErr.message?.slice(0, 80)}) — retrying without stream`);
        const response = await callLLMWithFallback(agentId, provider, model, systemPrompt, messages, {
          pipelineId: opts.pipelineId,
          onModelResolved: opts.onModelResolved,
          maxTokens: agentId === 'AG-07' ? 16384 : undefined,
        });
        const skillResults = await skills.executeSkillsInResponse(response, opts.pipelineId);
        if (skillResults?.length) {
          const skillContext = `\n\n--- RESULTADOS DE SKILLS ---\n${JSON.stringify(skillResults, null, 2)}\n--- FIN RESULTADOS ---`;
          const messages2 = [...messages, { role: 'assistant', content: response }, { role: 'user', content: skillContext }];
          const postSkillResponse = await callLLMWithFallback(agentId, provider, model, systemPrompt, messages2, { pipelineId: opts.pipelineId });
          return SPECIALIST_AGENTS.has(agentId) ? normalizeSpecialistResponse(agentId, postSkillResponse, userInput) : postSkillResponse;
        }
        return SPECIALIST_AGENTS.has(agentId) ? normalizeSpecialistResponse(agentId, response, userInput) : response;
      }
    }
    const skillResults = await skills.executeSkillsInResponse(fullText, opts.pipelineId);
    if (skillResults?.length) {
      const skillContext = `\n\n--- RESULTADOS DE SKILLS ---\n${JSON.stringify(skillResults, null, 2)}\n--- FIN RESULTADOS ---`;
      const messages2 = [...messages, { role: 'assistant', content: fullText }, { role: 'user', content: skillContext }];
      const postSkillResponse = await callLLMWithFallback(agentId, provider, model, systemPrompt, messages2, { pipelineId: opts.pipelineId });
      return SPECIALIST_AGENTS.has(agentId) ? normalizeSpecialistResponse(agentId, postSkillResponse, userInput) : postSkillResponse;
    }
    return SPECIALIST_AGENTS.has(agentId) ? normalizeSpecialistResponse(agentId, fullText, userInput) : fullText;
  }
  // ── Non-streaming mode ──────────────────────────────────────────

  const response = await callLLMWithFallback(agentId, provider, model, systemPrompt, messages, {
    stream: opts.stream,
    pipelineId: opts.pipelineId,
    onModelResolved: opts.onModelResolved,
    maxTokens: agentId === 'AG-07' ? 16384 : undefined,
  });
  if (opts.stream) return response;

  // Detectar y ejecutar skills en la respuesta
  const skillResults = await skills.executeSkillsInResponse(response, opts.pipelineId);
  if (skillResults?.length) {
    const skillContext = `\n\n--- RESULTADOS DE SKILLS ---\n${JSON.stringify(skillResults, null, 2)}\n--- FIN RESULTADOS ---`;
    const messages2 = [...messages, { role: 'assistant', content: response }, { role: 'user', content: skillContext }];
    const postSkillResponse = await callLLMWithFallback(agentId, provider, model, systemPrompt, messages2, {
      pipelineId: opts.pipelineId,
      onModelResolved: opts.onModelResolved,
    });
    return SPECIALIST_AGENTS.has(agentId)
      ? normalizeSpecialistResponse(agentId, postSkillResponse, userInput)
      : postSkillResponse;
  }

  return SPECIALIST_AGENTS.has(agentId)
    ? normalizeSpecialistResponse(agentId, response, userInput)
    : response;
}

// VIDEO_PROVIDER=veo  → use Google Veo 3 for video generation
// VIDEO_PROVIDER=fal  → use fal.ai KLING (default / fallback)
const VIDEO_PROVIDER = (process.env.VIDEO_PROVIDER || 'fal').toLowerCase();

// Veo generation config (can be overridden via env)
const VEO_CONFIG = {
  durationSeconds: parseInt(process.env.VEO_DURATION_SECONDS || '8', 10),
  aspectRatio:     process.env.VEO_ASPECT_RATIO || '16:9',
  includeAudio:    process.env.VEO_INCLUDE_AUDIO !== 'false',
};

// ── Video fallback chain (fal.ai models, tried in order) ───────
const VIDEO_FAL_FALLBACKS = [
  { model: process.env.FAL_VIDEO_TEXT_MODEL || 'fal-ai/minimax-video/text-to-video', params: { prompt_optimizer: true } },
  { model: 'fal-ai/kling-video/v1.6/standard/text-to-video', params: { duration: '5', aspect_ratio: '16:9' } },
  { model: 'fal-ai/minimax-video/text-to-video',              params: { prompt_optimizer: true } },
  { model: 'fal-ai/luma-dream-machine/text-to-video',         params: { duration: '5s', aspect_ratio: '16:9' } },
  { model: 'fal-ai/runway-gen3/turbo/text-to-video',          params: { duration: 5, ratio: '1280:720' } },
];

// ── Download remote video to public/uploads/ ───────────────────
async function downloadVideoToUploads(remoteUrl, prefix = 'vid') {
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = remoteUrl.includes('.mp4') ? 'mp4' : 'mp4';
    const filename = `${prefix}_${Date.now()}.${ext}`;
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, filename), buf);
    const localUrl = `/uploads/${filename}`;
    console.log(`[agent-runner] video descargado → ${localUrl} (${(buf.length/1024/1024).toFixed(1)}MB)`);
    return localUrl;
  } catch (e) {
    console.warn(`[agent-runner] descarga fallida (${remoteUrl.slice(0,60)}…): ${e.message}`);
    return remoteUrl; // return original if download fails
  }
}

// ── Download remote image to public/uploads/ ───────────────────
async function downloadImageToUploads(remoteUrl, prefix = 'img') {
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = /\.(png|webp|gif)(\?|$)/i.test(remoteUrl) ? remoteUrl.match(/\.(png|webp|gif)/i)[1] : 'jpg';
    const filename = `${prefix}_${Date.now()}.${ext}`;
    const uploadDir = path.join(__dirname, 'public', 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, filename), buf);
    const localUrl = `/uploads/${filename}`;
    console.log(`[agent-runner] imagen descargada → ${localUrl} (${(buf.length/1024).toFixed(0)}KB)`);
    return localUrl;
  } catch (e) {
    console.warn(`[agent-runner] descarga imagen fallida (${remoteUrl.slice(0,60)}…): ${e.message}`);
    return remoteUrl; // return original CDN URL if download fails
  }
}

// ── Try fal.ai video models in order until one succeeds ────────
async function callFalVideoWithFallback(prompt, imageUrl = null) {
  // If an image URL is provided, prefer dedicated image-to-video first.
  if (imageUrl) {
    try {
      console.log(`[agent-runner] intentando image-to-video con imagen de referencia → ${FAL_MODELS.video_img2vid}`);
      const result = await callFal(FAL_MODELS.video_img2vid, {
        prompt,
        image_url: imageUrl,
        duration: '5',
        aspect_ratio: '16:9',
      });
      const url = result?.video?.url || result?.videos?.[0]?.url || result?.url || null;
      if (url) {
        console.log(`[agent-runner] image-to-video OK → ${FAL_MODELS.video_img2vid}`);
        return { url, model: FAL_MODELS.video_img2vid };
      }
    } catch (err) {
      console.warn(`[agent-runner] image-to-video falló: ${err.message?.slice(0, 100)} — usando text-to-video`);
    }
  }

  for (const { model, params } of VIDEO_FAL_FALLBACKS) {
    try {
      console.log(`[agent-runner] intentando fal.ai video: ${model}`);
      const result = await callFal(model, { prompt, ...params });
      const url = result?.video?.url || result?.videos?.[0]?.url || result?.url || null;
      if (url) {
        console.log(`[agent-runner] fal.ai video OK → ${model}`);
        return { url, model };
      }
    } catch (err) {
      console.warn(`[agent-runner] fal.ai ${model} falló: ${err.message?.slice(0, 100)} — probando siguiente`);
    }
  }
  throw new Error('Todos los modelos de video fal.ai fallaron');
}

async function runMediaAgent(agentId, systemPrompt, messages, opts = {}) {
  if (!isTextReady()) throw new Error('LLM required for media prompt building');

  // Detect if this is a video generation action from the user input
  const userInput     = messages[0]?.content || '';
  const action        = extractActionFromInput(userInput);
  const bloqueDestino = extractExpectedBlock(userInput) || '';
  // Only match clips_video in the explicit bloque_destino field, not anywhere in context JSON
  const isVideoAction = /generar_video|video/i.test(action || '') || /^clips_video$/i.test(bloqueDestino.trim());

  // For non-video (images) we always use fal.ai
  if (!isVideoAction && !isMediaReady()) throw new Error('FAL_KEY required for image generation');

  const { provider, model } = getAgentModel(agentId);
  const textProvider = provider.startsWith('fal') ? 'openai' : provider;
  const textModel    = model.startsWith('fal-ai/') ? 'gpt-4o-mini' : model;
  const falModel     = isVideoAction ? FAL_MODELS.video : (model.startsWith('fal-ai/') ? model : FAL_MODELS.image);

  // Extract scene image URL injected by pilot-loop for image-to-video continuity
  const sceneRefImageUrl = userInput.match(/IMAGEN DE REFERENCIA PARA ESTE CLIP[^\n]*\n([^\n]+)/)?.[1]?.trim() || null;

  // Determine which video backend to use
  const useVeo = isVideoAction && VIDEO_PROVIDER === 'veo' && isVeoReady();

  if (typeof opts.onModelResolved === 'function') opts.onModelResolved({ provider: textProvider, model: textModel, agentId, media: false });
  if (typeof opts.onMediaModelResolved === 'function') {
    const mediaProvider = useVeo ? 'veo' : 'fal';
    const mediaModel    = useVeo ? (process.env.VEO_MODEL || 'veo-3.0-generate-preview') : falModel;
    opts.onMediaModelResolved({ provider: mediaProvider, model: mediaModel, agentId, media: true, isVideo: isVideoAction });
  }

  console.log(`[agent-runner] ${agentId} media: ${isVideoAction ? (useVeo ? 'VIDEO/Veo3' : 'VIDEO/KLING') : 'IMAGE/fal'}`);

  const llmResponse = await callLLM(textProvider, textModel, systemPrompt, messages);

  // Try to extract structured agent decision
  let agentDecision = null;
  try {
    const jsonMatch = llmResponse.match(/```json\n?([\s\S]*?)\n?```/) || llmResponse.match(/(\{[\s\S]*\})/);
    agentDecision = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(llmResponse);
  } catch { /* no structured response */ }

  let mediaPrompt = agentDecision?.resultado?.prompt_usado;

  // Fallback: ask LLM directly for a short visual/video prompt
  if (!mediaPrompt || mediaPrompt.trim().length < 15) {
    const promptType = isVideoAction ? 'short video scene' : 'visual image';
    const promptMessages = [
      ...messages,
      { role: 'assistant', content: llmResponse },
      { role: 'user', content: `Based on the context above, write ONLY a short ${promptType} prompt in English (max 150 words, no JSON, just the prompt describing the scene to generate):` },
    ];
    mediaPrompt = await callLLM(textProvider, textModel, systemPrompt, promptMessages);
    mediaPrompt = mediaPrompt.replace(/^["']|["']$/g, '').trim().slice(0, 400);
    console.log(`[agent-runner] ${agentId} fallback prompt extracted (${mediaPrompt.length} chars)`);
  }

  let mediaUrl     = null;
  let sceneImgUrl  = null;  // scene thumbnail generated alongside Veo video
  let usedModel    = null;

  if (isVideoAction) {
    if (useVeo) {
      // ── Veo 3 → fal.ai fallback chain + scene image in parallel ─
      console.log(`[agent-runner] ${agentId} launching Veo3 + scene image in parallel`);
      const sceneImgPrompt = `Cinematic still frame, photorealistic scene thumbnail: ${mediaPrompt.slice(0, 250)}`;
      const [veoResult, imgResult] = await Promise.allSettled([
        callVeo(mediaPrompt, VEO_CONFIG),
        isMediaReady()
          ? callFal(FAL_MODELS.image, { prompt: sceneImgPrompt, image_size: 'landscape_16_9', num_inference_steps: 4, num_images: 1 })
          : Promise.resolve(null),
      ]);

      if (veoResult.status === 'fulfilled') {
        mediaUrl  = veoResult.value?.video?.url || null;   // already local /uploads/ from callVeo
        usedModel = process.env.VEO_MODEL || 'veo-3.0-generate-001';
      } else {
        const veoErr = veoResult.reason?.message || '';
        const isBilling = veoErr.includes('billing') || veoErr.includes('GCP') || veoErr.includes('400') || veoErr.includes('quota');
        console.error(`[agent-runner] ${agentId} Veo ${isBilling ? 'BILLING_REQUIRED' : 'ERROR'}:`, veoErr.slice(0, 150));
        // Fallback → full fal.ai chain (KLING img2vid → KLING t2v → MiniMax → Luma → Runway)
        if (isMediaReady()) {
          const { url: falUrl, model: falUsed } = await callFalVideoWithFallback(mediaPrompt, sceneRefImageUrl);
          mediaUrl  = await downloadVideoToUploads(falUrl, 'vid');
          usedModel = falUsed + ' (veo-fallback)';
        }
      }

      if (imgResult.status === 'fulfilled' && imgResult.value) {
        const rawSceneUrl = imgResult.value?.images?.[0]?.url || imgResult.value?.image?.url || null;
        if (rawSceneUrl) {
          sceneImgUrl = await downloadImageToUploads(rawSceneUrl, 'scene');
        }
        console.log(`[agent-runner] ${agentId} scene image → ${sceneImgUrl ? 'OK' : 'NONE'}`);
      }
    } else {
      // ── fal.ai fallback chain (default, no Veo) ────────────────
      // Try KLING image-to-video first if a reference image is available
      if (!isMediaReady()) throw new Error('FAL_KEY required for video generation');
      if (sceneRefImageUrl) {
        console.log(`[agent-runner] ${agentId} usando imagen de referencia para continuidad visual: ${sceneRefImageUrl.slice(0, 80)}`);
      }
      const { url: falUrl, model: falUsed } = await callFalVideoWithFallback(mediaPrompt, sceneRefImageUrl);
      mediaUrl  = await downloadVideoToUploads(falUrl, 'vid');
      usedModel = falUsed;
    }
  } else {
    // ── Image via fal.ai ───────────────────────────────────────
    const falResult = await callFal(falModel, {
      prompt: mediaPrompt,
      image_size: 'portrait_4_3',
      num_inference_steps: 4,
      num_images: 1,
    });
    const remoteImgUrl = falResult?.images?.[0]?.url || falResult?.image?.url || null;
    usedModel = falModel;
    if (!remoteImgUrl) {
      console.warn(`[agent-runner] ${agentId} fal.ai no devolvió URL de imagen. Respuesta:`, JSON.stringify(falResult)?.slice(0, 200));
      mediaUrl = null;
    } else {
      // Save image locally to public/uploads/
      mediaUrl = await downloadImageToUploads(remoteImgUrl, 'img');
    }
  }

  const result      = agentDecision || { resultado: {} };
  const outputKey   = isVideoAction ? 'video_url' : 'imagen_url';
  const providerKey = useVeo ? 'veo_model' : 'fal_model';
  const success     = !!mediaUrl;

  return normalizeSpecialistResponse(agentId, JSON.stringify({
    ...result,
    estado: success ? 'ok' : 'error',
    error:  success ? null : `${useVeo ? 'Veo' : 'fal.ai'} no devolvió URL de ${isVideoAction ? 'video' : 'imagen'}`,
    resultado: {
      ...result.resultado,
      prompt_usado:        mediaPrompt,
      [outputKey]:         mediaUrl,
      imagen_url:          isVideoAction ? sceneImgUrl : mediaUrl,
      video_url:           isVideoAction ? mediaUrl : null,
      escena_img_url:      sceneImgUrl,    // thumbnail/scene frame alongside the video
      imagen_referencia:   isVideoAction ? (sceneRefImageUrl || null) : null,  // image used as first frame
      [providerKey]:       usedModel,
      tipo_media:          isVideoAction ? 'video' : 'imagen',
    },
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
    const isVideo = resultado.tipo_media === 'video' || !!resultado.video_url;
    return {
      tipo_asset: isVideo ? 'video' : 'imagen',
      bloque,
      prompt: resultado.prompt_usado || resultado.prompt_nuevo || null,
      contenido: resultado.video_url || resultado.imagen_url || null,
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
