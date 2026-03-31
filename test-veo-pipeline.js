/**
 * test-veo-pipeline.js
 * Prueba directa del AG-04 con acción generar_video usando Veo 3.
 * Ejecutar: node test-veo-pipeline.js
 */

require('dotenv').config();
const { runAgent } = require('./agent-runner');

const TEST_CONTEXT = {
  titulo: 'El Último Amanecer',
  genero: 'ciencia ficcion',
  tono: 'épico y emocional',
  sinopsis: 'Un astronauta descubre que es el último ser humano vivo en el universo, pero encuentra una señal de esperanza proveniente de una galaxia lejana.',
  estilo_visual: 'cinematográfico fotorrealista, iluminación dramática, colores fríos azul y dorado',
  escena_actual: 'El astronauta flota solo en su nave mirando por la ventana hacia la Tierra destruida, una lágrima en su ojo refleja las estrellas',
};

const USER_INPUT = `
Ejecuta la acción: "generar_video"
Bloque destino esperado: clips_video

Genera un clip cinematográfico para la escena principal del proyecto.
Contexto de la escena: ${TEST_CONTEXT.escena_actual}
Título del proyecto: ${TEST_CONTEXT.titulo}
Estilo visual: ${TEST_CONTEXT.estilo_visual}
Tono: ${TEST_CONTEXT.tono}
`.trim();

async function main() {
  const start = Date.now();
  console.log('='.repeat(60));
  console.log('TEST: AG-04 Video Pipeline (Veo 3 + Scene Image)');
  console.log(`VIDEO_PROVIDER = ${process.env.VIDEO_PROVIDER}`);
  console.log(`VEO_MODEL      = ${process.env.VEO_MODEL}`);
  console.log(`VEO_DURATION   = ${process.env.VEO_DURATION_SECONDS}s`);
  console.log(`VEO_AUDIO      = ${process.env.VEO_INCLUDE_AUDIO}`);
  console.log('='.repeat(60));

  try {
    const result = await runAgent('AG-04', USER_INPUT, TEST_CONTEXT, {
      onModelResolved: ({ provider, model, fallback }) => {
        console.log(`[model] text → ${provider}/${model}${fallback ? ' (fallback)' : ''}`);
      },
      onMediaModelResolved: ({ provider, model, isVideo }) => {
        console.log(`[model] media → ${provider}/${model} (${isVideo ? 'VIDEO' : 'IMAGE'})`);
      },
    });

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log('\n' + '='.repeat(60));
    console.log(`RESULTADO (${elapsed}s):`);
    console.log('='.repeat(60));

    const parsed = JSON.parse(result);
    console.log(`estado:          ${parsed.estado}`);
    console.log(`accion:          ${parsed.accion}`);
    console.log(`bloque_destino:  ${parsed.bloque_destino}`);
    console.log(`tipo_media:      ${parsed.resultado?.tipo_media}`);
    console.log(`video_url:       ${parsed.resultado?.video_url || 'NULL'}`);
    console.log(`imagen_url:      ${parsed.resultado?.imagen_url || 'NULL'}`);
    console.log(`escena_img_url:  ${parsed.resultado?.escena_img_url || 'NULL'}`);
    console.log(`veo_model:       ${parsed.resultado?.veo_model || 'N/A'}`);
    console.log(`fal_model:       ${parsed.resultado?.fal_model || 'N/A'}`);
    console.log(`prompt_usado:\n  ${parsed.resultado?.prompt_usado?.slice(0, 200)}...`);
    if (parsed.error) console.error(`error: ${parsed.error}`);

  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`\nERROR (${elapsed}s): ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
