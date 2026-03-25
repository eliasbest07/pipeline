/**
 * skills/index.js
 * Router central de skills. Los agentes llaman:
 *   await skills.run({ skill: 'SKL-01', accion: 'search', parametros: {...} }, pipelineId)
 */

const skl01 = require('./skl01-websearch');
const skl04 = require('./skl04-file-rw');
const skl05 = require('./skl05-audio-tts');
const skl07 = require('./skl07-api-rest');

const SKILLS = {
  'SKL-01': skl01,
  'SKL-04': skl04,
  'SKL-05': skl05,
  'SKL-07': skl07,
};

const SKILL_NAMES = {
  'SKL-01': 'WEB SEARCH',
  'SKL-04': 'FILE RW',
  'SKL-05': 'AUDIO TTS',
  'SKL-07': 'API REST',
};

/**
 * Ejecuta una skill.
 * @param {object} call  — { skill, accion, parametros }
 * @param {string} pipelineId
 */
async function run(call, pipelineId) {
  const { skill: skillId, accion, parametros = {} } = call;

  const handler = SKILLS[skillId];
  if (!handler) {
    return {
      skill_error: {
        skill_id: skillId,
        error: 'skill_not_found',
        disponibles: Object.keys(SKILLS),
        accion_sugerida: `Usa una de las skills disponibles: ${Object.keys(SKILLS).join(', ')}`,
      },
    };
  }

  const fn = handler[accion];
  if (!fn) {
    return {
      skill_error: {
        skill_id: skillId,
        accion_intentada: accion,
        error: 'accion_no_encontrada',
        acciones_disponibles: Object.keys(handler),
      },
    };
  }

  console.log(`[SKILL] ${skillId} ${SKILL_NAMES[skillId]} → ${accion}`);

  try {
    return await fn(parametros, pipelineId);
  } catch (err) {
    console.error(`[SKILL] ${skillId} error:`, err.message);
    return {
      skill_error: {
        skill_id: skillId,
        accion_intentada: accion,
        error: err.message,
        accion_sugerida: 'Verificar parámetros y configuración del skill',
      },
    };
  }
}

/**
 * Detecta si el output de un agente contiene llamadas a skills y las ejecuta.
 * Los agentes pueden incluir un bloque JSON con { "skill": "SKL-XX", ... }
 */
async function executeSkillsInResponse(agentResponse, pipelineId) {
  const skillCalls = [];

  // Buscar todos los bloques JSON con campo "skill"
  const matches = [...(agentResponse.matchAll(/```json\n?([\s\S]*?)\n?```/g))];
  for (const m of matches) {
    try {
      const obj = JSON.parse(m[1]);
      if (obj.skill && obj.accion) skillCalls.push(obj);
    } catch { /* ignorar JSON inválido */ }
  }

  // También buscar JSON inline
  try {
    const inline = JSON.parse(agentResponse);
    if (inline.skill && inline.accion) skillCalls.push(inline);
  } catch { /* no es JSON puro */ }

  if (!skillCalls.length) return null;

  const results = [];
  for (const call of skillCalls) {
    results.push(await run(call, pipelineId));
  }

  return results;
}

function getAvailableSkills() {
  return Object.entries(SKILLS).map(([id, handler]) => ({
    id,
    nombre: SKILL_NAMES[id],
    acciones: Object.keys(handler),
  }));
}

module.exports = { run, executeSkillsInResponse, getAvailableSkills };
