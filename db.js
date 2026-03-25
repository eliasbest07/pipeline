const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'pipeline.db'));

// Performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS pipelines (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS nodes (
    id          TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,
    x           REAL NOT NULL,
    y           REAL NOT NULL,
    config      TEXT NOT NULL DEFAULT '{}',
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS connections (
    id          TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    from_node   TEXT NOT NULL,
    from_port   TEXT NOT NULL,
    to_node     TEXT NOT NULL,
    to_port     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS custom_agents (
    id         TEXT PRIMARY KEY,
    config     TEXT NOT NULL DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS custom_skills (
    id         TEXT PRIMARY KEY,
    config     TEXT NOT NULL DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pipeline_contexts (
    pipeline_id  TEXT PRIMARY KEY REFERENCES pipelines(id) ON DELETE CASCADE,
    context      TEXT NOT NULL DEFAULT '{}',
    updated_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS pipeline_seeds (
    pipeline_id   TEXT PRIMARY KEY REFERENCES pipelines(id) ON DELETE CASCADE,
    seed_template TEXT NOT NULL DEFAULT '{}',
    agent_menu    TEXT NOT NULL DEFAULT '{}',
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS agent_model_overrides (
    agent_id   TEXT PRIMARY KEY,
    provider   TEXT NOT NULL,
    model      TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// ── Pipelines ──────────────────────────────────────
const getPipelines   = db.prepare('SELECT * FROM pipelines ORDER BY updated_at DESC');
const getPipeline    = db.prepare('SELECT * FROM pipelines WHERE id = ?');
const insertPipeline = db.prepare('INSERT INTO pipelines (id, name) VALUES (?, ?)');
const updatePipeline = db.prepare("UPDATE pipelines SET name = ?, updated_at = datetime('now') WHERE id = ?");
const deletePipeline = db.prepare('DELETE FROM pipelines WHERE id = ?');

// ── Nodes ──────────────────────────────────────────
const getNodes      = db.prepare('SELECT * FROM nodes WHERE pipeline_id = ?');
const insertNode    = db.prepare('INSERT INTO nodes (id, pipeline_id, type, x, y, config) VALUES (?, ?, ?, ?, ?, ?)');
const updateNode    = db.prepare('UPDATE nodes SET x = ?, y = ?, config = ? WHERE id = ?');
const deleteNode    = db.prepare('DELETE FROM nodes WHERE id = ?');

// ── Connections ────────────────────────────────────
const getConns      = db.prepare('SELECT * FROM connections WHERE pipeline_id = ?');
const insertConn    = db.prepare('INSERT INTO connections (id, pipeline_id, from_node, from_port, to_node, to_port) VALUES (?, ?, ?, ?, ?, ?)');
const deleteConn    = db.prepare('DELETE FROM connections WHERE id = ?');
const deleteNodeConns = db.prepare('DELETE FROM connections WHERE from_node = ? OR to_node = ?');

// ── Custom Agents ──────────────────────────────────
const getAgents     = db.prepare('SELECT * FROM custom_agents ORDER BY created_at DESC');
const getAgent      = db.prepare('SELECT * FROM custom_agents WHERE id = ?');
const insertAgent   = db.prepare('INSERT INTO custom_agents (id, config) VALUES (?, ?)');
const updateAgent   = db.prepare('UPDATE custom_agents SET config = ? WHERE id = ?');
const deleteAgent   = db.prepare('DELETE FROM custom_agents WHERE id = ?');

// ── Custom Skills ──────────────────────────────────
const getSkills     = db.prepare('SELECT * FROM custom_skills ORDER BY created_at DESC');
const getSkill      = db.prepare('SELECT * FROM custom_skills WHERE id = ?');
const insertSkill   = db.prepare('INSERT INTO custom_skills (id, config) VALUES (?, ?)');
const updateSkill   = db.prepare('UPDATE custom_skills SET config = ? WHERE id = ?');
const deleteSkill   = db.prepare('DELETE FROM custom_skills WHERE id = ?');

// ── Pipeline Contexts ───────────────────────────────
const getContext    = db.prepare('SELECT context FROM pipeline_contexts WHERE pipeline_id = ?');
const upsertContext = db.prepare(`
  INSERT INTO pipeline_contexts (pipeline_id, context, updated_at)
  VALUES (?, ?, datetime('now'))
  ON CONFLICT(pipeline_id) DO UPDATE SET
    context = excluded.context,
    updated_at = datetime('now')
`);
const deleteContext = db.prepare('DELETE FROM pipeline_contexts WHERE pipeline_id = ?');

// ── Pipeline Seeds ──────────────────────────────────
const getSeed    = db.prepare('SELECT * FROM pipeline_seeds WHERE pipeline_id = ?');
const upsertSeed = db.prepare(`
  INSERT INTO pipeline_seeds (pipeline_id, seed_template, agent_menu, created_at)
  VALUES (?, ?, ?, datetime('now'))
  ON CONFLICT(pipeline_id) DO UPDATE SET
    seed_template = excluded.seed_template,
    agent_menu    = excluded.agent_menu
`);
const deleteSeed = db.prepare('DELETE FROM pipeline_seeds WHERE pipeline_id = ?');

// ── Agent Model Overrides ────────────────────────────
const getModelOverrides    = db.prepare('SELECT * FROM agent_model_overrides');
const upsertModelOverride  = db.prepare(`
  INSERT INTO agent_model_overrides (agent_id, provider, model, updated_at)
  VALUES (?, ?, ?, datetime('now'))
  ON CONFLICT(agent_id) DO UPDATE SET
    provider   = excluded.provider,
    model      = excluded.model,
    updated_at = datetime('now')
`);
const deleteModelOverride  = db.prepare('DELETE FROM agent_model_overrides WHERE agent_id = ?');

// ── Save full pipeline snapshot (nodes + conns) ────
const savePipelineState = db.transaction((pipelineId, nodesList, connsList) => {
  db.prepare('DELETE FROM nodes WHERE pipeline_id = ?').run(pipelineId);
  db.prepare('DELETE FROM connections WHERE pipeline_id = ?').run(pipelineId);
  const seenNodes = new Set();
  for (const n of nodesList) {
    if (seenNodes.has(n.id)) continue;
    seenNodes.add(n.id);
    insertNode.run(n.id, pipelineId, n.type, n.x, n.y, JSON.stringify(n));
  }
  const seenConns = new Set();
  for (const c of connsList) {
    if (seenConns.has(c.id)) continue;
    seenConns.add(c.id);
    insertConn.run(c.id, pipelineId, c.from, c.fp, c.to, c.tp);
  }
  db.prepare("UPDATE pipelines SET updated_at = datetime('now') WHERE id = ?").run(pipelineId);
});

module.exports = {
  getPipelines, getPipeline, insertPipeline, updatePipeline, deletePipeline,
  getNodes, insertNode, updateNode, deleteNode,
  getConns, insertConn, deleteConn, deleteNodeConns,
  getAgents, getAgent, insertAgent, updateAgent, deleteAgent,
  getSkills, getSkill, insertSkill, updateSkill, deleteSkill,
  getContext, upsertContext, deleteContext,
  getSeed, upsertSeed, deleteSeed,
  getModelOverrides, upsertModelOverride, deleteModelOverride,
  savePipelineState,
};
