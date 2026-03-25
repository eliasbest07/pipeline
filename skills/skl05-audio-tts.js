/**
 * SKL-05 — Audio TTS
 * Usa fal.ai (PlayAI TTS) como proveedor principal.
 * Guarda el audio en pipeline_outputs/{pipeline_id}/outputs/audio/
 */

const path = require('path');
const fs = require('fs');
const { callFal } = require('../llm-clients');

const BASE_DIR = path.join(__dirname, '..', 'pipeline_outputs');

// Mapa de voces descriptivas → voice IDs de PlayAI
const VOICE_MAP = {
  'narrator_male_deep':       's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json',
  'narrator_female_warm':     's3://voice-cloning-zero-shot/e040bd1b-f190-4bdb-83f0-75ef85b18f84/original/manifest.json',
  'narrator_male_neutral':    's3://voice-cloning-zero-shot/baf1ef41-36b6-428c-9bdf-50ba54682bd8/original/manifest.json',
  'narrator_female_dramatic': 's3://voice-cloning-zero-shot/e040bd1b-f190-4bdb-83f0-75ef85b18f84/original/manifest.json',
  'narrator_female_friendly': 's3://voice-cloning-zero-shot/b7d50908-b17c-442d-ad8d-810c63997ed9/original/manifest.json',
};

function safePath(pipelineId, rel) {
  const base = path.resolve(BASE_DIR, pipelineId);
  const full = path.resolve(base, rel);
  if (!full.startsWith(base)) throw new Error('Path traversal blocked');
  return full;
}

async function generate_audio({ texto, voz = 'auto', idioma = 'es', velocidad = 1.0, estilo = 'narración', nombre_archivo = 'audio', formato = 'mp3' }, pipelineId) {
  if (!texto) throw new Error('texto is required');

  // Dividir automáticamente si supera 5000 chars
  if (texto.length > 5000) {
    const chunks = splitText(texto, 4800);
    const items = chunks.map((t, i) => ({ id: `chunk_${i}`, texto: t, nombre_archivo: `${nombre_archivo}_parte${i + 1}` }));
    return generate_audio_batch({ items, voz, idioma, formato }, pipelineId);
  }

  const voiceId = voz === 'auto' ? VOICE_MAP['narrator_male_neutral'] : (VOICE_MAP[voz] || VOICE_MAP['narrator_male_neutral']);

  const result = await callFal('fal-ai/playai-tts', {
    input: texto,
    voice: voiceId,
    output_format: formato,
  });

  const audioUrl = result?.audio?.url || result?.url;
  const outputPath = `outputs/audio/${nombre_archivo}.${formato}`;

  // Descargar y guardar el audio localmente
  if (audioUrl && pipelineId) {
    const filePath = safePath(pipelineId, outputPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const audioRes = await fetch(audioUrl);
    const buffer = Buffer.from(await audioRes.arrayBuffer());
    fs.writeFileSync(filePath, buffer);
  }

  const palabras = texto.split(/\s+/).length;
  const duracion = Math.round(palabras / (velocidad * 3)); // ~3 palabras/segundo

  return {
    skill: 'SKL-05', accion: 'generate_audio',
    resultado: {
      exito: true,
      path: outputPath,
      audio_url: audioUrl,
      duracion_segundos: duracion,
      voz_usada: voz,
      servicio_usado: 'fal.ai/playai-tts',
      palabras_narradas: palabras,
    },
  };
}

async function generate_audio_batch({ items, voz = 'auto', idioma = 'es', formato = 'mp3' }, pipelineId) {
  const results = [];
  for (const item of items) {
    try {
      const r = await generate_audio({ texto: item.texto, voz, idioma, formato, nombre_archivo: item.nombre_archivo }, pipelineId);
      results.push({ id: item.id, ...r.resultado });
    } catch (err) {
      results.push({ id: item.id, error: err.message });
    }
  }

  const completados = results.filter(r => r.exito).length;
  const duracion_total = results.reduce((sum, r) => sum + (r.duracion_segundos || 0), 0);

  return {
    skill: 'SKL-05', accion: 'generate_audio_batch',
    resultado: { total: items.length, completados, archivos: results, duracion_total_segundos: duracion_total },
  };
}

function splitText(text, maxLen) {
  const chunks = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > maxLen && current) { chunks.push(current.trim()); current = ''; }
    current += s + ' ';
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

module.exports = { generate_audio, generate_audio_batch };
