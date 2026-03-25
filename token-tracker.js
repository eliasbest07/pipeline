/**
 * token-tracker.js
 * Acumula estadísticas de tokens por agente en memoria.
 * Se resetea al reiniciar el servidor.
 */

const stats = {};   // { agentId: { in, out, calls, provider, model } }

function add(agentId, provider, model, inputTokens, outputTokens) {
  if (!stats[agentId]) {
    stats[agentId] = { in: 0, out: 0, calls: 0, provider, model };
  }
  stats[agentId].in    += inputTokens;
  stats[agentId].out   += outputTokens;
  stats[agentId].calls += 1;
  stats[agentId].provider = provider;
  stats[agentId].model    = model;
}

function getAll() {
  let totalIn = 0, totalOut = 0, totalCalls = 0;
  for (const s of Object.values(stats)) {
    totalIn    += s.in;
    totalOut   += s.out;
    totalCalls += s.calls;
  }
  return { agents: stats, total: { in: totalIn, out: totalOut, calls: totalCalls } };
}

function reset() {
  for (const k of Object.keys(stats)) delete stats[k];
}

module.exports = { add, getAll, reset };
