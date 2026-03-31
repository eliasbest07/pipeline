require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const db = require('./db');
const { recordBPMovement, ensureGrantEntry, getModelCostCatalog } = require('./budget');
const terminalRouter = require('./routes/terminal');
const modelsRegistry = require('./models');
const ctxMgr = require('./context-manager');
const { startLoop, stopLoop, isRunning } = require('./pilot-loop');
const { runAgent } = require('./agent-runner');

const app = express();
const PORT = process.env.PORT || 3000;

const HASH_LIMIT       = parseInt(process.env.HASH_LIMIT        || '100', 10);
const BESTPOINTS_INIT  = parseFloat(process.env.BESTPOINTS_INITIAL || '2');
const TOKENS_PER_BP    = parseFloat(process.env.TOKENS_PER_BP   || '55000000');
const RL_WINDOW_MS     = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RL_MAX           = parseInt(process.env.RATE_LIMIT_MAX    || '120', 10);
const RL_MAX_AI        = parseInt(process.env.RATE_LIMIT_MAX_AI || '20', 10);

// ── In-memory rate limiter per hash ─────────────────────────────
const _rlBuckets = new Map(); // hash → { count, aiCount, windowStart }
function getRLBucket(hash) {
  const now = Date.now();
  let b = _rlBuckets.get(hash);
  if (!b || now - b.windowStart > RL_WINDOW_MS) {
    b = { count: 0, aiCount: 0, windowStart: now };
    _rlBuckets.set(hash, b);
  }
  return b;
}

// ── Hash middleware (validates X-Pipeline-Hash or query ?hash=) ─
function requireHash(req, res, next) {
  const hash = req.headers['x-pipeline-hash'] || req.query.hash;
  if (!hash) return res.status(401).json({ error: 'hash_required' });
  const row = db.getHash.get(hash);
  if (!row) return res.status(403).json({ error: 'hash_not_found' });
  if (!row.is_active) return res.status(403).json({ error: 'hash_inactive' });
  const b = getRLBucket(hash);
  b.count++;
  if (b.count > RL_MAX) return res.status(429).json({ error: 'rate_limit_exceeded' });
  req.hashRow = row;
  next();
}

function requireHashAI(req, res, next) {
  const b = getRLBucket(req.hashRow.hash);
  b.aiCount++;
  if (b.aiCount > RL_MAX_AI) return res.status(429).json({ error: 'ai_rate_limit_exceeded' });
  next();
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/pipeline-outputs', express.static(path.join(__dirname, 'pipeline_outputs')));

const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch (_) {}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Terminal ────────────────────────────────────────────────
app.use('/api/terminal', terminalRouter);

// ── Hash identity ────────────────────────────────────────────────

// POST /api/hash/init  — create or recover hash
app.post('/api/hash/init', (req, res, next) => {
  try {
    const { hash: provided } = req.body;

    // Client sent an existing hash — try to recover it
    if (provided) {
      const row = db.getHash.get(provided);
      if (row) {
        const total = db.countHashes.get().n;
        if (total === 1) db.claimOrphanPipelines.run(provided);
        ensureGrantEntry(provided, row.bestpoints);
        return res.json({
          hash: provided,
          bestpoints: row.bestpoints,
          bp_spent: row.bp_spent || 0,
          bp_remaining: Math.max(0, (row.bestpoints || 0) - (row.bp_spent || 0)),
          tokens_used: row.tokens_used,
          email: row.email,
          tier: row.tier || 'free',
          new: false,
        });
      }
    }

    // Check capacity
    const total = db.countHashes.get().n;
    if (total >= HASH_LIMIT) {
      return res.status(503).json({ error: 'waitlist', message: 'Sistema al límite de capacidad. Deja tu email para unirte a la lista de espera.' });
    }

    const hash = randomUUID();
    db.insertHash.run(hash, BESTPOINTS_INIT);
    recordBPMovement(hash, 'grant', BESTPOINTS_INIT, 'initial_grant', { auto: true });

    // First hash claims all orphan pipelines
    const newTotal = db.countHashes.get().n;
    if (newTotal === 1) db.claimOrphanPipelines.run(hash);

    return res.status(201).json({
      hash,
      bestpoints: BESTPOINTS_INIT,
      bp_spent: 0,
      bp_remaining: BESTPOINTS_INIT,
      tokens_used: 0,
      email: null,
      tier: 'free',
      new: true,
    });
  } catch (err) { next(err); }
});

// GET /api/hash/status — check wallet status
app.get('/api/hash/status', requireHash, (req, res) => {
  const row = req.hashRow;
  const spent = row.bp_spent || 0;
  res.json({
    hash:         row.hash,
    tier:         row.tier || 'free',
    bestpoints:   row.bestpoints,
    bp_spent:     spent,
    bp_remaining: Math.max(0, row.bestpoints - spent),
    tokens_used:  row.tokens_used,
    email:        row.email,
  });
});

// POST /api/hash/email — save optional email
app.post('/api/hash/email', requireHash, (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') return res.status(400).json({ error: 'email required' });
    db.updateHashEmail.run(email.trim().toLowerCase(), req.hashRow.hash);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/hash/redeem — redeem activation code
app.post('/api/hash/redeem', requireHash, (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'code required' });
    const codeRow = db.getActivationCode.get(code.trim().toUpperCase());
    if (!codeRow) return res.status(404).json({ error: 'code_not_found' });
    if (codeRow.used_by) return res.status(409).json({ error: 'code_already_used' });
    const result = db.redeemActivationCode.run(req.hashRow.hash, code.trim().toUpperCase());
    if (!result.changes) return res.status(409).json({ error: 'code_already_used' });
    db.updateHashBP.run(codeRow.bestpoints, req.hashRow.hash);
    // Promote to premium tier + record in ledger
    db.updateHashTier.run('premium', req.hashRow.hash);
    recordBPMovement(req.hashRow.hash, 'code_redeem', codeRow.bestpoints, `code:${code.trim().toUpperCase()}`, { code: code.trim().toUpperCase() });
    const updated = db.getHash.get(req.hashRow.hash);
    res.json({
      ok: true,
      bestpoints_added: codeRow.bestpoints,
      bestpoints: updated.bestpoints,
      bp_spent: updated.bp_spent || 0,
      bp_remaining: Math.max(0, (updated.bestpoints || 0) - (updated.bp_spent || 0)),
      tokens_used: updated.tokens_used || 0,
      tier: 'premium',
    });
  } catch (err) { next(err); }
});

// GET /api/hash/ledger — movement history for the current hash
app.get('/api/hash/ledger', requireHash, (req, res, next) => {
  try {
    const entries = db.getBPLedgerByHash.all(req.hashRow.hash);
    res.json({ entries });
  } catch (err) { next(err); }
});

// GET /api/models/costs — per-model BP cost catalog
app.get('/api/models/costs', (req, res) => {
  res.json({ costs: getModelCostCatalog() });
});

// ── Pipelines ──────────────────────────────────────────────
app.get('/api/pipelines', (req, res, next) => {
  try {
    const hash = req.headers['x-pipeline-hash'] || req.query.hash;
    if (hash) {
      const row = db.getHash.get(hash);
      if (row) return res.json(db.getPipelinesByHash.all(hash));
    }
    res.json(db.getPipelines.all());
  } catch (err) { next(err); }
});

app.post('/api/pipelines', (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = randomUUID();
    db.insertPipeline.run(id, name);
    // Tag with hash if provided
    const hash = req.headers['x-pipeline-hash'] || req.query.hash;
    if (hash && db.getHash.get(hash)) db.setPipelineHash.run(hash, id);
    res.status(201).json(db.getPipeline.get(id));
  } catch (err) { next(err); }
});

app.put('/api/pipelines/:id', (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const pipeline = db.getPipeline.get(req.params.id);
    if (!pipeline) return res.status(404).json({ error: 'pipeline not found' });
    db.updatePipeline.run(name, req.params.id);
    res.json(db.getPipeline.get(req.params.id));
  } catch (err) { next(err); }
});

app.delete('/api/pipelines/:id', (req, res, next) => {
  try {
    db.deletePipeline.run(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

// ── Pipeline state (visual snapshot only; not execution state) ──────────
app.get('/api/pipelines/:id/state', (req, res, next) => {
  try {
    const pipeline = db.getPipeline.get(req.params.id);
    if (!pipeline) return res.status(404).json({ error: 'pipeline not found' });
    const nodes = db.getNodes.all(req.params.id).map(n => JSON.parse(n.config));
    const conns = db.getConns.all(req.params.id).map(c => ({
      id: c.id, from: c.from_node, fp: c.from_port, to: c.to_node, tp: c.to_port,
      active: false
    }));
    const rawCards = db.getOutputCards.get(req.params.id);
    const outputCards = rawCards ? JSON.parse(rawCards.cards_json) : [];
    const outputs = ctxMgr.getRuntimeOutputs(req.params.id);
    const operatorQuestions = ctxMgr.getOperatorQuestions(req.params.id);
    res.json({ pipeline, nodes, conns, outputCards, outputs, operatorQuestions });
  } catch (err) { next(err); }
});

app.put('/api/pipelines/:id/state', (req, res, next) => {
  try {
    const { nodes, conns, outputCards } = req.body;
    if (!Array.isArray(nodes) || !Array.isArray(conns)) {
      return res.status(400).json({ error: 'nodes and conns arrays required' });
    }
    db.savePipelineState(req.params.id, nodes, conns);
    if (Array.isArray(outputCards)) db.saveOutputCards(req.params.id, outputCards);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

app.get('/api/pipelines/:id/context', (req, res, next) => {
  try {
    const pipeline = db.getPipeline.get(req.params.id);
    if (!pipeline) return res.status(404).json({ error: 'pipeline not found' });
    const context = ctxMgr.getContext(req.params.id);
    if (!context) return res.status(404).json({ error: 'context not found' });
    res.json({ context });
  } catch (err) { next(err); }
});

// Reset stuck agent states (debug endpoint)
app.post('/api/pipelines/:id/reset-agents', (req, res, next) => {
  try {
    const pipelineId = req.params.id;
    const ctx = ctxMgr.getContext(pipelineId);
    if (!ctx) return res.status(404).json({ error: 'context not found' });
    const agentes = ctx.agentes_activos || {};
    const updated = {};
    for (const [id, state] of Object.entries(agentes)) {
      if (id !== 'AG-01') {
        updated[id] = { ...state, estado: 'idle', accion_actual: null };
      } else {
        updated[id] = state;
      }
    }
    ctxMgr.patchContext(pipelineId, { agentes_activos: updated, preguntas_pendientes: [] });
    res.json({ ok: true, reset: Object.keys(updated).filter(id => id !== 'AG-01') });
  } catch (err) { next(err); }
});

app.post('/api/pipelines/:id/prepare', requireHash, requireHashAI, async (req, res, next) => {
  try {
    const pipelineId = req.params.id;
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt required' });
    }

    const pipeline = db.getPipeline.get(pipelineId);
    if (!pipeline) return res.status(404).json({ error: 'pipeline not found' });

    ctxMgr.ensureContext(pipelineId, pipeline.name);
    // Store the original user prompt as the base preference immediately, so the
    // pilot loop never enters the infinite "collect preferences" cycle.
    ctxMgr.patchContext(pipelineId, {
      preferencias_usuario: {
        objetivo: { valor: prompt, resuelta: true, campo: 'objetivo' },
        prompt_base: { valor: prompt, resuelta: true, campo: 'prompt_base' },
      },
    });
    ctxMgr.recordEvent(pipelineId, {
      tipo: 'pipeline_prepare_requested',
      fuente: 'AG-00',
      mensaje: 'Preparación manual del pipeline solicitada desde el canvas.',
      payload: { prompt_semilla: prompt },
    });

    const directPrompt = `${prompt}

INSTRUCCIÓN PRIORITARIA: Genera ahora mismo los dos archivos JSON (seed_template y agent_menu) sin hacer preguntas previas. Usa asunciones razonables. El Operador recopilará los detalles del usuario durante la ejecución. Entrega los bloques \`\`\`json directamente.`;

    const arquitectoResponse = await runAgent('AG-00', directPrompt, {});
    const seedSaved = trySaveSeedFromResponseServer(pipelineId, arquitectoResponse);

    if (!seedSaved) {
      ctxMgr.setEstado(pipelineId, 'iniciando');
      return res.status(409).json({
        error: 'architect_seed_not_generated',
        message: 'AG-00 no pudo generar la estructura inicial del pipeline.',
        response: arquitectoResponse,
      });
    }

    ctxMgr.setEstado(pipelineId, 'preparado');
    ctxMgr.recordEvent(pipelineId, {
      tipo: 'pipeline_prepared',
      fuente: 'AG-00',
      mensaje: 'AG-00 dejó el pipeline preparado desde el flujo manual del canvas.',
    });

    const context = ctxMgr.getContext(pipelineId);
    res.json({
      ok: true,
      prepared: true,
      pipelineId,
      context,
      architect_response: arquitectoResponse,
    });
  } catch (err) { next(err); }
});

app.post('/api/pipelines/:id/operator-questions/:questionId/answer', (req, res, next) => {
  try {
    const pipelineId = req.params.id;
    const questionId = req.params.questionId;
    const { answer, answer_origin } = req.body || {};
    if (!answer || typeof answer !== 'string') {
      return res.status(400).json({ error: 'answer required' });
    }

    const questions = ctxMgr.getOperatorQuestions(pipelineId);
    const existing = questions.find(item => item.public_id === questionId);
    if (!existing) return res.status(404).json({ error: 'question not found' });

    const updated = ctxMgr.upsertOperatorQuestion(pipelineId, {
      ...existing,
      answer,
      answer_origin: answer_origin || 'manual',
      status: 'answered',
    });

    const context = ctxMgr.getContext(pipelineId);
    const currentPending = Array.isArray(context?.preguntas_pendientes) ? context.preguntas_pendientes : [];
    const nextPending = currentPending.filter(item => item.public_id !== questionId);
    const metadata = existing.metadata || {};
    const fieldKey = metadata.field_key || existing.field_key || null;
    const questionType = String(metadata.tipo || '').trim().toLowerCase();
    if (questionType === 'numero' && !/^\d+$/.test(String(answer).trim())) {
      return res.status(400).json({ error: 'numeric_answer_required', question_type: 'numero' });
    }
    const currentRequired = context?.preferencias_usuario?._requeridas || {};
    const nextRequired = fieldKey && currentRequired[fieldKey]
      ? {
          ...currentRequired,
          [fieldKey]: {
            ...currentRequired[fieldKey],
            campo: currentRequired[fieldKey]?.campo || fieldKey,
            valor: answer,
            resuelta: true,
          },
        }
      : currentRequired;
    const bloqueOrigen = metadata.bloque || null;
    const isPreferenceCollectionBlock = bloqueOrigen === 'preferencias_usuario' || /preferenc/i.test(String(bloqueOrigen));
    const currentDispatchQueue = Array.isArray(context?.ag05_dispatch_queue) ? context.ag05_dispatch_queue : [];
    const currentOverrides = Array.isArray(context?.overrides_pendientes) ? context.overrides_pendientes : [];
    const nextOverrides = (!isPreferenceCollectionBlock && bloqueOrigen)
      ? [
          ...currentOverrides,
          {
            bloque: bloqueOrigen,
            field_key: fieldKey,
            question: existing.question,
            answer,
            answer_origin: answer_origin || 'manual',
            requested_at: new Date().toISOString(),
            question_id: questionId,
          },
        ]
      : currentOverrides;
    const shouldQueueDigestor = !isPreferenceCollectionBlock && bloqueOrigen && !currentDispatchQueue.some(item => item?.agente_id === 'AG-07');
    const nextDispatchQueue = shouldQueueDigestor
      ? [
          ...currentDispatchQueue,
          {
            agente_id: 'AG-07',
            accion: 'auditar_contexto',
            parametros: {
              motivo: 'override_usuario',
              bloque_origen: bloqueOrigen,
              field_key: fieldKey,
              valor_aplicado: answer,
            },
            bloque_destino: 'notas_piloto',
            solicitado_en: new Date().toISOString(),
          },
        ]
      : currentDispatchQueue;

    ctxMgr.patchContext(pipelineId, {
      editor: {
        esperando_input: nextPending.length > 0,
        pregunta_activa: nextPending[0]?.question || null,
      },
      preguntas_pendientes: nextPending,
      respuestas_usuario: {
        ...(context?.respuestas_usuario || {}),
        [questionId]: {
          question: existing.question,
          answer,
          answer_origin: answer_origin || 'manual',
          bloque: metadata.bloque || null,
          field_key: fieldKey,
          answered_at: new Date().toISOString(),
        },
      },
      overrides_pendientes: nextOverrides,
      ag05_dispatch_queue: nextDispatchQueue,
      preferencias_usuario: fieldKey ? {
        ...(context?.preferencias_usuario || {}),
        _requeridas: nextRequired,
        [fieldKey]: {
          valor: answer,
          resuelta: true,
          origen: answer_origin || 'manual',
        },
      } : (context?.preferencias_usuario || {}),
    });

    // Desbloquear cualquier bloque esperando_usuario cuando su pregunta es respondida
    if (bloqueOrigen) {
      const currentBloques = ctxMgr.getContext(pipelineId)?.bloques || {};
      if (currentBloques[bloqueOrigen]?.estado === 'esperando_usuario') {
        ctxMgr.updateBloque(pipelineId, bloqueOrigen, {
          estado: 'completada',
          resultado: JSON.stringify({ field_key: fieldKey, answer, answered_at: new Date().toISOString() }),
        });
      }
    }

    const refreshed = ctxMgr.getContext(pipelineId);
    require('./pilot-loop').pipelineEvents.emit('operator_question_answered', {
      pipeline_id: pipelineId,
      question: updated,
      context: refreshed,
    });
    require('./pilot-loop').pipelineEvents.emit('context_snapshot', {
      pipeline_id: pipelineId,
      context: refreshed,
    });

    res.json({ ok: true, question: updated, context: refreshed });
  } catch (err) { next(err); }
});

app.post('/api/pipelines/:id/operator-questions', (req, res, next) => {
  try {
    const pipelineId = req.params.id;
    const payload = req.body || {};
    const incoming = Array.isArray(payload.questions) ? payload.questions : [];
    if (!incoming.length) {
      return res.status(400).json({ error: 'questions required' });
    }

    const current = ctxMgr.getContext(pipelineId) || {};
    const currentPending = Array.isArray(current.preguntas_pendientes) ? current.preguntas_pendientes : [];
    const existingQuestions = ctxMgr.getOperatorQuestions(pipelineId);
    const created = [];
    const mergedPending = [...currentPending];

    incoming.forEach(item => {
      const question = String(item?.question || '').trim();
      if (!question) return;
      const fieldKey = item?.field_key || item?.campo || item?.metadata?.field_key || null;
      const duplicate = existingQuestions.find(existing =>
        existing.status !== 'answered' &&
        (
          (fieldKey && (existing.field_key === fieldKey || existing.metadata?.field_key === fieldKey)) ||
          String(existing.question || '').trim().toLowerCase() === question.toLowerCase()
        )
      );
      if (duplicate) return;

      const record = ctxMgr.upsertOperatorQuestion(pipelineId, {
        pipeline_id: pipelineId,
        question,
        suggestion: item?.suggestion || item?.sugerencia || '',
        field_key: fieldKey,
        status: 'pending',
        metadata: {
          ...(item?.metadata || {}),
          field_key: fieldKey,
          bloque: item?.bloque || item?.metadata?.bloque || null,
          origen: item?.origen || 'canvas_operator_output',
        },
      });
      created.push(record);
      mergedPending.push({
        public_id: record.public_id,
        question: record.question,
        field_key: record.field_key,
        suggestion: record.suggestion || '',
        metadata: record.metadata || {},
      });
    });

    ctxMgr.patchContext(pipelineId, {
      editor: {
        esperando_input: mergedPending.length > 0,
        pregunta_activa: mergedPending[0]?.question || null,
      },
      preguntas_pendientes: mergedPending,
    });

    const refreshed = ctxMgr.getContext(pipelineId);
    created.forEach(question => {
      require('./pilot-loop').pipelineEvents.emit('operator_question_created', {
        pipeline_id: pipelineId,
        question,
        context: refreshed,
      });
    });

    res.json({ created, context: refreshed });
  } catch (err) { next(err); }
});

app.post('/api/pipelines/:id/stop', (req, res, next) => {
  try {
    const pipelineId = req.params.id;
    const pipeline = db.getPipeline.get(pipelineId);
    if (!pipeline) return res.status(404).json({ error: 'pipeline not found' });
    const context = ctxMgr.getContext(pipelineId);
    if (!context) return res.status(404).json({ error: 'context not found' });

    if (['completo', 'cancelado', 'corrupto'].includes(context.estado)) {
      return res.json({ ok: true, stopped: false, reason: `pipeline_${context.estado}`, context });
    }

    stopLoop(pipelineId, 'detenido_por_usuario');
    ctxMgr.setEstado(pipelineId, 'pausado');
    const updated = ctxMgr.getContext(pipelineId);
    res.json({ ok: true, stopped: true, running: isRunning(pipelineId), context: updated });
  } catch (err) { next(err); }
});

// ── Custom Agents ──────────────────────────────────────────
app.get('/api/agents', (req, res, next) => {
  try {
    res.json(db.getAgents.all().map(a => JSON.parse(a.config)));
  } catch (err) { next(err); }
});

app.post('/api/agents', (req, res, next) => {
  try {
    const agent = req.body;
    if (!agent.id) agent.id = randomUUID();
    db.insertAgent.run(agent.id, JSON.stringify(agent));
    res.status(201).json(agent);
  } catch (err) { next(err); }
});

app.put('/api/agents/:id', (req, res, next) => {
  try {
    const agent = db.getAgent.get(req.params.id);
    if (!agent) return res.status(404).json({ error: 'agent not found' });
    const updated = { ...JSON.parse(agent.config), ...req.body, id: req.params.id };
    db.updateAgent.run(JSON.stringify(updated), req.params.id);
    res.json(updated);
  } catch (err) { next(err); }
});

app.delete('/api/agents/:id', (req, res, next) => {
  try {
    db.deleteAgent.run(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

// ── Custom Skills ──────────────────────────────────────────
app.get('/api/skills', (req, res, next) => {
  try {
    res.json(db.getSkills.all().map(s => JSON.parse(s.config)));
  } catch (err) { next(err); }
});

app.post('/api/skills', (req, res, next) => {
  try {
    const skill = req.body;
    if (!skill.id) skill.id = randomUUID();
    db.insertSkill.run(skill.id, JSON.stringify(skill));
    res.status(201).json(skill);
  } catch (err) { next(err); }
});

app.put('/api/skills/:id', (req, res, next) => {
  try {
    const skill = db.getSkill.get(req.params.id);
    if (!skill) return res.status(404).json({ error: 'skill not found' });
    const updated = { ...JSON.parse(skill.config), ...req.body, id: req.params.id };
    db.updateSkill.run(JSON.stringify(updated), req.params.id);
    res.json(updated);
  } catch (err) { next(err); }
});

app.delete('/api/skills/:id', (req, res, next) => {
  try {
    db.deleteSkill.run(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

// ── Models — catálogo y config por agente ───────────────────
app.get('/api/models', (req, res) => {
  res.json({
    catalog: modelsRegistry.getCatalog(),
    agents:  modelsRegistry.getAllAgentModels(),
  });
});

app.put('/api/models/:agentId', (req, res, next) => {
  try {
    const { provider, model } = req.body;
    if (!provider || !model) return res.status(400).json({ error: 'provider and model required' });
    modelsRegistry.setAgentModel(req.params.agentId, provider, model);
    res.json({ agentId: req.params.agentId, provider, model });
  } catch (err) { next(err); }
});

app.delete('/api/models/:agentId', (req, res, next) => {
  try {
    modelsRegistry.resetAgentModel(req.params.agentId);
    res.json({ agentId: req.params.agentId, reset: true, ...modelsRegistry.getAgentModel(req.params.agentId) });
  } catch (err) { next(err); }
});

// ── Token stats ─────────────────────────────────────────────
app.get('/api/tokens', (req, res) => {
  res.json(require('./token-tracker').getAll());
});
app.delete('/api/tokens', (req, res) => {
  require('./token-tracker').reset();
  res.json({ ok: true });
});

// ── fal.ai direct image generation (canvas image nodes) ─────
app.post('/api/fal/generate', requireHash, requireHashAI, async (req, res, next) => {
  try {
    const { prompt, model } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });
    const { callFal, isMediaReady } = require('./llm-clients');
    if (!isMediaReady()) return res.status(503).json({ error: 'FAL_KEY not configured' });
    const falModel = model || 'fal-ai/flux/schnell';
    const result = await callFal(falModel, {
      prompt,
      image_size: 'landscape_16_9',
      num_inference_steps: 4,
      num_images: 1,
    });
    const imageUrl = result?.images?.[0]?.url;
    if (!imageUrl) return res.status(500).json({ error: 'no image URL in fal response', raw: result });
    res.json({ url: imageUrl });
  } catch (err) { next(err); }
});

app.post('/api/uploads/image', requireHash, (req, res, next) => {
  try {
    const { data, filename } = req.body || {};
    if (!data || typeof data !== 'string' || !data.startsWith('data:image/')) {
      return res.status(400).json({ error: 'image data required' });
    }
    const match = data.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: 'invalid image data' });
    const mime = match[1];
    const base64 = match[2];
    const ext = mime.split('/')[1].replace('jpeg', 'jpg');
    const safeName = String(filename || 'upload')
      .replace(/[^a-z0-9._-]/gi, '_')
      .replace(/\.+/g, '.')
      .slice(0, 80);
    const outName = `${Date.now().toString(36)}_${randomUUID().slice(0, 8)}_${safeName || 'image'}.${ext}`;
    const outPath = path.join(UPLOADS_DIR, outName);
    fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
    res.json({
      ok: true,
      url: `/uploads/${outName}`,
      filename: outName,
      mime,
    });
  } catch (err) { next(err); }
});

// ── Run a single agent in isolated mode only ─────────────────
app.post('/api/agents/run', requireHash, requireHashAI, async (req, res, next) => {
  try {
    const { agentId, input, context, pipelineId } = req.body;
    if (!agentId || !input) return res.status(400).json({ error: 'agentId and input required' });

    if (pipelineId) {
      return res.status(409).json({
        error: 'pipeline_bound_agent_run_disabled',
        message: 'Pipeline agents can no longer be executed directly. Use /api/pipelines/:id/start for AG-01 control or /api/terminal for in-flight operator feedback.',
      });
    }

    const { runAgentWithRetry } = require('./agent-runner');
    const result = await runAgentWithRetry(agentId, input, context || {});
    res.json({ result, mode: 'isolated_agent_test' });
  } catch (err) { next(err); }
});

// ── Start pipeline via unique Pilot loop ──────────────────────
app.post('/api/pipelines/:id/start', requireHash, requireHashAI, (req, res, next) => {
  try {
    const pipelineId = req.params.id;
    const pipeline = db.getPipeline.get(pipelineId);
    if (!pipeline) return res.status(404).json({ error: 'pipeline not found' });

    let ctx = ctxMgr.ensureContext(pipelineId, pipeline.name);

    if (!ctx?.template?.seed_template) {
      return res.status(409).json({
        error: 'pipeline_not_prepared',
        message: 'El pipeline todavia no tiene contexto inicial preparado por AG-00.',
        estado: ctx?.estado || 'iniciando',
      });
    }

    if (ctx?.estado === 'completo') {
      const pendingQuestions = Array.isArray(ctx?.preguntas_pendientes)
        ? ctx.preguntas_pendientes.filter(item => item?.status !== 'answered')
        : [];
      const hasWarnings = Boolean(ctx?.salud_pipeline?.drift_detectado);
      if (!pendingQuestions.length && !hasWarnings) {
        return res.status(409).json({
          error: 'pipeline_already_complete',
          message: 'Este pipeline ya está completado. Reinícialo o crea uno nuevo para volver a ejecutar.',
          estado: ctx?.estado || 'completo',
        });
      }
      ctxMgr.setEstado(pipelineId, 'pausado');
      ctx = ctxMgr.getContext(pipelineId);
    }

    if (isRunning(pipelineId)) {
      return res.json({
        ok: true,
        pipelineId,
        started: false,
        alreadyRunning: true,
        mode: 'pilot_loop',
        estado: ctx?.estado || 'en_progreso',
        ciclo: ctx?.ciclo || 0,
      });
    }

    ctxMgr.setEstado(pipelineId, 'en_progreso');
    ctxMgr.recordEvent(pipelineId, {
      tipo: 'pipeline_start_requested',
      fuente: 'AG-01',
      mensaje: 'Pipeline iniciado desde el boton Ejecutar.',
      payload: { pipelineId, via: 'api_start' },
    });
    ctxMgr.upsertAgentState(pipelineId, 'AG-01', {
      estado: 'activo',
      rol: 'piloto',
      accion_actual: 'control_loop',
      ultimo_inicio: new Date().toISOString(),
    });
    startLoop(pipelineId);
    ctx = ctxMgr.getContext(pipelineId);

    res.json({
      ok: true,
      pipelineId,
      started: true,
      alreadyRunning: false,
      mode: 'pilot_loop',
      estado: ctx?.estado || 'en_progreso',
      ciclo: ctx?.ciclo || 0,
    });
  } catch (err) { next(err); }
});

// ── Legacy pipeline runner endpoints (hard disabled) ───────────
app.post('/api/pipelines/:id/execute', async (req, res) => {
  return res.status(410).json({
    error: 'canvas_execute_deprecated',
    message: 'The canvas is no longer the execution engine. Start the pipeline through the unique Pilot loop.',
  });
});

// ── Pipeline seed (agent menu + seed template) ──────────────
app.get('/api/pipelines/:id/seed', (req, res, next) => {
  try {
    const seed = require('./context-manager').getSeed(req.params.id);
    if (!seed) return res.status(404).json({ error: 'seed not found' });
    res.json(seed);
  } catch (err) { next(err); }
});

app.post('/api/pipelines/:id/seed', (req, res, next) => {
  try {
    const pipelineId = req.params.id;
    const { seed_template, agent_menu } = req.body;
    if (!seed_template || !agent_menu) return res.status(400).json({ error: 'seed_template and agent_menu required' });
    const pipeline = db.getPipeline.get(pipelineId);
    if (!pipeline) return res.status(404).json({ error: 'pipeline not found' });
    ctxMgr.ensureContext(pipelineId, pipeline.name);
    ctxMgr.saveSeed(pipelineId, seed_template, agent_menu);
    const seed = require('./context-manager').getSeed(pipelineId);
    res.json({ ok: true, seed });
  } catch (err) { next(err); }
});

// ── Global error handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} —`, err.message);
  res.status(500).json({ error: 'internal server error' });
});

// Seed default pipeline if DB is empty
if (db.getPipelines.all().length === 0) {
  db.insertPipeline.run('pipeline-video-v1', 'Video Pipeline v1');
  console.log('Default pipeline created');
}

// Backfill BP ledger grant entries for existing hashes that predate the ledger
{
  const allHashes = db.getAllHashes.all();
  for (const row of allHashes) ensureGrantEntry(row.hash, row.bestpoints);
  if (allHashes.length > 0) console.log(`[startup] BP grant backfill: ${allHashes.length} hash(es) checked`);
}

app.listen(PORT, () => {
  console.log(`Pipeline OS running at http://localhost:${PORT}`);
});

function trySaveSeedFromResponseServer(pipelineId, response) {
  try {
    const jsonBlocks = [...String(response || '').matchAll(/```json\n?([\s\S]*?)\n?```/g)].map(m => {
      try { return JSON.parse(m[1]); } catch { return null; }
    }).filter(Boolean);

    const seedTemplate = jsonBlocks.find(b => b.template_id || b.bloques_requeridos);
    const agentMenu = jsonBlocks.find(b => b.agentes && Array.isArray(b.agentes));
    if (seedTemplate && agentMenu) {
      ctxMgr.saveSeed(pipelineId, seedTemplate, agentMenu);
      return true;
    }
  } catch (err) {
    console.warn('[server] No se pudo extraer seed del output del Arquitecto:', err.message);
  }
  return false;
}
