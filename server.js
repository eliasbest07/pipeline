require('dotenv').config();
const express = require('express');
const path = require('path');
const { randomUUID } = require('crypto');
const db = require('./db');
const terminalRouter = require('./routes/terminal');
const modelsRegistry = require('./models');
const ctxMgr = require('./context-manager');
const { startLoop, stopLoop, isRunning } = require('./pilot-loop');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Terminal ────────────────────────────────────────────────
app.use('/api/terminal', terminalRouter);

// ── Pipelines ──────────────────────────────────────────────
app.get('/api/pipelines', (req, res, next) => {
  try {
    res.json(db.getPipelines.all());
  } catch (err) { next(err); }
});

app.post('/api/pipelines', (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = randomUUID();
    db.insertPipeline.run(id, name);
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
    res.json({ pipeline, nodes, conns });
  } catch (err) { next(err); }
});

app.put('/api/pipelines/:id/state', (req, res, next) => {
  try {
    const { nodes, conns } = req.body;
    if (!Array.isArray(nodes) || !Array.isArray(conns)) {
      return res.status(400).json({ error: 'nodes and conns arrays required' });
    }
    db.savePipelineState(req.params.id, nodes, conns);
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
app.post('/api/fal/generate', async (req, res, next) => {
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

// ── Run a single agent in isolated mode only ─────────────────
app.post('/api/agents/run', async (req, res, next) => {
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
app.post('/api/pipelines/:id/start', (req, res, next) => {
  try {
    const pipelineId = req.params.id;
    const pipeline = db.getPipeline.get(pipelineId);
    if (!pipeline) return res.status(404).json({ error: 'pipeline not found' });

    let ctx = ctxMgr.ensureContext(pipelineId, pipeline.name);

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

app.listen(PORT, () => {
  console.log(`Pipeline OS running at http://localhost:${PORT}`);
});
