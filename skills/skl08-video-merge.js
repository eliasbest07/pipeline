/**
 * SKL-08 — Video Merge
 * Une dos o más videos en uno solo usando FFmpeg (ffmpeg-static + fluent-ffmpeg).
 * Guarda el resultado en pipeline_outputs/{pipeline_id}/outputs/video/
 *
 * Acciones disponibles:
 *   merge_videos   — concatena una lista de videos en un archivo final
 */

const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

const BASE_DIR = path.join(__dirname, '..', 'pipeline_outputs');

// Carga fluent-ffmpeg y ffmpeg-static de forma lazy para no romper si no están instalados
function getFfmpeg() {
  try {
    const ffmpeg = require('fluent-ffmpeg');
    const ffmpegPath = require('ffmpeg-static');
    ffmpeg.setFfmpegPath(ffmpegPath);
    return { ffmpeg, ffmpegPath };
  } catch {
    throw new Error(
      'Dependencias de video no instaladas. Ejecuta: npm install fluent-ffmpeg ffmpeg-static'
    );
  }
}

function safePath(pipelineId, rel) {
  const base = path.resolve(BASE_DIR, pipelineId);
  const full = path.resolve(base, rel);
  if (!full.startsWith(base)) throw new Error('Path traversal bloqueado');
  return full;
}

/**
 * Descarga un archivo desde una URL y lo guarda localmente.
 * Devuelve la ruta local donde fue guardado.
 */
async function downloadFile(url, destPath) {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error descargando ${url}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  return destPath;
}

/**
 * Resuelve una entrada de video: si es URL la descarga, si es ruta local la valida.
 * Devuelve la ruta local absoluta del video.
 */
async function resolveVideo(entrada, tmpDir, index) {
  if (/^https?:\/\//i.test(entrada)) {
    const ext = path.extname(new URL(entrada).pathname) || '.mp4';
    const dest = path.join(tmpDir, `input_${index}${ext}`);
    return downloadFile(entrada, dest);
  }
  // Ruta local
  const abs = path.resolve(entrada);
  if (!fs.existsSync(abs)) throw new Error(`Video no encontrado: ${entrada}`);
  return abs;
}

/**
 * Concatena videos usando el filtro concat de FFmpeg (re-encoda).
 * Soporta videos con diferentes resoluciones/codecs escalando al primero.
 */
/**
 * Probe a video file to check if it has an audio stream.
 */
function hasAudioStream(ffmpegPath, filePath) {
  try {
    const { execSync } = require('child_process');
    const out = execSync(
      `"${ffmpegPath}" -i "${filePath}" 2>&1 | grep "Audio:"`,
      { stdio: ['pipe', 'pipe', 'pipe'] }
    ).toString();
    return out.trim().length > 0;
  } catch {
    return false; // command failed or no audio stream found
  }
}

function concatenarVideos(ffmpeg, ffmpegBin, inputPaths, outputPath, opciones) {
  return new Promise((resolve, reject) => {
    const { fps = 30, resolucion = null, codec_video = 'libx264', codec_audio = 'aac', calidad_crf = 23 } = opciones;

    const n = inputPaths.length;
    let cmd = ffmpeg();

    // Check if ANY input has audio — if none do, skip audio processing
    const anyHasAudio = inputPaths.some(p => hasAudioStream(ffmpegBin, p));

    inputPaths.forEach(p => cmd.input(p));

    const scaleFilter = resolucion
      ? `scale=${resolucion},setsar=1`
      : `scale=iw:ih,setsar=1`;

    let filterComplex, outputOptions;

    if (anyHasAudio) {
      // With audio: add silent track for inputs that lack audio
      const filterInputs = inputPaths
        .map((p, i) => {
          const vf = `[${i}:v]${scaleFilter},fps=${fps}[v${i}]`;
          const hasAudio = hasAudioStream(ffmpegBin, p);
          const af = hasAudio
            ? `[${i}:a]aresample=44100[a${i}]`
            : `aevalsrc=0:c=stereo:s=44100:d=1[a${i}]`; // silent
          return `${vf}; ${af}`;
        })
        .join('; ');
      const concatV = inputPaths.map((_, i) => `[v${i}]`).join('');
      const concatA = inputPaths.map((_, i) => `[a${i}]`).join('');
      filterComplex = `${filterInputs}; ${concatV}${concatA}concat=n=${n}:v=1:a=1[vout][aout]`;
      outputOptions = ['-map [vout]', '-map [aout]', `-c:v ${codec_video}`, `-crf ${calidad_crf}`, `-c:a ${codec_audio}`, '-movflags +faststart'];
    } else {
      // Video only — no audio processing
      const filterInputs = inputPaths
        .map((_, i) => `[${i}:v]${scaleFilter},fps=${fps}[v${i}]`)
        .join('; ');
      const concatV = inputPaths.map((_, i) => `[v${i}]`).join('');
      filterComplex = `${filterInputs}; ${concatV}concat=n=${n}:v=1:a=0[vout]`;
      outputOptions = ['-map [vout]', `-c:v ${codec_video}`, `-crf ${calidad_crf}`, '-an', '-movflags +faststart'];
    }

    cmd
      .complexFilter(filterComplex)
      .outputOptions(outputOptions)
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

/**
 * Acción principal: merge_videos
 *
 * Parámetros:
 *   videos          {string[]}  — rutas locales o URLs de los videos a unir (mínimo 2)
 *   nombre_archivo  {string}    — nombre del archivo de salida (sin extensión)
 *   formato         {string}    — 'mp4' | 'mov' | 'mkv' (default: 'mp4')
 *   fps             {number}    — fotogramas por segundo (default: 30)
 *   resolucion      {string}    — ej. '1920:1080' (opcional, usa la del primer video si no se pasa)
 *   codec_video     {string}    — codec de video (default: 'libx264')
 *   codec_audio     {string}    — codec de audio (default: 'aac')
 *   calidad_crf     {number}    — CRF de compresión 0-51, menor = mayor calidad (default: 23)
 */
async function merge_videos(
  {
    videos,
    nombre_archivo = 'video_merged',
    formato = 'mp4',
    fps = 30,
    resolucion = null,
    codec_video = 'libx264',
    codec_audio = 'aac',
    calidad_crf = 23,
  },
  pipelineId
) {
  if (!Array.isArray(videos) || videos.length < 2) {
    throw new Error('Se requieren al menos 2 videos en el array "videos"');
  }

  const { ffmpeg, ffmpegPath } = getFfmpeg();

  const outputDir = safePath(pipelineId, `outputs/video`);
  const tmpDir = safePath(pipelineId, `tmp/video_merge`);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  // Resolver todos los videos (descargar URLs si hace falta)
  const localPaths = [];
  for (let i = 0; i < videos.length; i++) {
    const localPath = await resolveVideo(videos[i], tmpDir, i);
    localPaths.push(localPath);
  }

  const outputFile = `${nombre_archivo}.${formato}`;
  const outputPath = path.join(outputDir, outputFile);

  const inicio = Date.now();

  await concatenarVideos(ffmpeg, ffmpegPath, localPaths, outputPath, {
    fps,
    resolucion,
    codec_video,
    codec_audio,
    calidad_crf,
  });

  const duracionMs = Date.now() - inicio;
  const stat = fs.statSync(outputPath);

  // Limpiar temporales descargados
  localPaths.forEach(p => {
    if (p.startsWith(tmpDir)) {
      try { fs.unlinkSync(p); } catch { /* ignorar */ }
    }
  });

  return {
    skill: 'SKL-08',
    accion: 'merge_videos',
    resultado: {
      exito: true,
      path: `outputs/video/${outputFile}`,
      videos_unidos: videos.length,
      duracion_proceso_ms: duracionMs,
      tamano_bytes: stat.size,
      tamano_mb: +(stat.size / 1024 / 1024).toFixed(2),
      opciones_usadas: { fps, resolucion, codec_video, codec_audio, calidad_crf, formato },
    },
  };
}

module.exports = { merge_videos };
