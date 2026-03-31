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

  CREATE TABLE IF NOT EXISTS context_versions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id    TEXT NOT NULL UNIQUE,
    pipeline_id  TEXT NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    version_no   INTEGER NOT NULL,
    source       TEXT NOT NULL DEFAULT 'runtime',
    context      TEXT NOT NULL DEFAULT '{}',
    created_at   TEXT DEFAULT (datetime('now'))
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

  CREATE TABLE IF NOT EXISTS pipeline_output_cards (
    pipeline_id TEXT PRIMARY KEY REFERENCES pipelines(id) ON DELETE CASCADE,
    cards_json  TEXT NOT NULL DEFAULT '[]',
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS outputs (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id    TEXT NOT NULL UNIQUE,
    pipeline_id  TEXT NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    agent_id     TEXT,
    output_type  TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    block_key    TEXT,
    content      TEXT,
    metadata     TEXT NOT NULL DEFAULT '{}',
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS operator_questions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id       TEXT NOT NULL UNIQUE,
    pipeline_id     TEXT NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    agent_id        TEXT NOT NULL DEFAULT 'AG-05',
    question_text   TEXT NOT NULL,
    suggestion      TEXT,
    answer          TEXT,
    answer_origin   TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',
    metadata        TEXT NOT NULL DEFAULT '{}',
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS agent_runs (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id        TEXT NOT NULL UNIQUE,
    pipeline_id      TEXT NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    agent_id         TEXT NOT NULL,
    trigger_source   TEXT,
    action_name      TEXT,
    block_key        TEXT,
    status           TEXT NOT NULL DEFAULT 'queued',
    visible_output   TEXT,
    internal_payload TEXT NOT NULL DEFAULT '{}',
    error_text       TEXT,
    created_at       TEXT DEFAULT (datetime('now')),
    updated_at       TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS assemblies (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id     TEXT NOT NULL UNIQUE,
    pipeline_id   TEXT NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'pending',
    required_map  TEXT NOT NULL DEFAULT '{}',
    output_ids    TEXT NOT NULL DEFAULT '[]',
    final_content TEXT,
    metadata      TEXT NOT NULL DEFAULT '{}',
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS token_usage (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id         TEXT NOT NULL UNIQUE,
    pipeline_id       TEXT REFERENCES pipelines(id) ON DELETE SET NULL,
    agent_id          TEXT,
    provider          TEXT,
    model             TEXT,
    prompt_tokens     INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens      INTEGER NOT NULL DEFAULT 0,
    estimated_cost    REAL NOT NULL DEFAULT 0,
    bestpoint_cost    REAL NOT NULL DEFAULT 0,
    metadata          TEXT NOT NULL DEFAULT '{}',
    created_at        TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS hashes (
    hash        TEXT PRIMARY KEY,
    created_at  TEXT DEFAULT (datetime('now')),
    bestpoints  REAL NOT NULL DEFAULT 2.0,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    email       TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS activation_codes (
    code        TEXT PRIMARY KEY,
    bestpoints  REAL NOT NULL,
    used_by     TEXT REFERENCES hashes(hash),
    used_at     TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bp_ledger (
    id         TEXT PRIMARY KEY,
    hash       TEXT NOT NULL REFERENCES hashes(hash),
    type       TEXT NOT NULL,
    amount     REAL NOT NULL,
    reason     TEXT NOT NULL,
    meta       TEXT NOT NULL DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migrations
try { db.exec('ALTER TABLE pipelines ADD COLUMN hash_id TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE hashes ADD COLUMN bp_spent REAL NOT NULL DEFAULT 0'); } catch (_) {}
try { db.exec("ALTER TABLE hashes ADD COLUMN tier TEXT NOT NULL DEFAULT 'free'"); } catch (_) {}

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
const getLatestContextVersion = db.prepare(`
  SELECT * FROM context_versions
  WHERE pipeline_id = ?
  ORDER BY version_no DESC, id DESC
  LIMIT 1
`);
const insertContextVersion = db.prepare(`
  INSERT INTO context_versions (public_id, pipeline_id, version_no, source, context)
  VALUES (?, ?, ?, ?, ?)
`);

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

// ── Output Cards ────────────────────────────────────
const getOutputCards    = db.prepare('SELECT cards_json FROM pipeline_output_cards WHERE pipeline_id = ?');
const upsertOutputCards = db.prepare(`
  INSERT INTO pipeline_output_cards (pipeline_id, cards_json, updated_at)
  VALUES (?, ?, datetime('now'))
  ON CONFLICT(pipeline_id) DO UPDATE SET
    cards_json = excluded.cards_json,
    updated_at = datetime('now')
`);
function saveOutputCards(pipelineId, cards) {
  upsertOutputCards.run(pipelineId, JSON.stringify(cards || []));
}
const getOutputs = db.prepare('SELECT * FROM outputs WHERE pipeline_id = ? ORDER BY created_at ASC, id ASC');
const upsertOutput = db.prepare(`
  INSERT INTO outputs (public_id, pipeline_id, agent_id, output_type, status, block_key, content, metadata, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  ON CONFLICT(public_id) DO UPDATE SET
    agent_id = excluded.agent_id,
    output_type = excluded.output_type,
    status = excluded.status,
    block_key = excluded.block_key,
    content = excluded.content,
    metadata = excluded.metadata,
    updated_at = datetime('now')
`);
const deleteOutputsByPipeline = db.prepare('DELETE FROM outputs WHERE pipeline_id = ?');
const getOperatorQuestions = db.prepare('SELECT * FROM operator_questions WHERE pipeline_id = ? ORDER BY created_at ASC, id ASC');
const upsertOperatorQuestion = db.prepare(`
  INSERT INTO operator_questions (public_id, pipeline_id, agent_id, question_text, suggestion, answer, answer_origin, status, metadata, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  ON CONFLICT(public_id) DO UPDATE SET
    agent_id = excluded.agent_id,
    question_text = excluded.question_text,
    suggestion = excluded.suggestion,
    answer = excluded.answer,
    answer_origin = excluded.answer_origin,
    status = excluded.status,
    metadata = excluded.metadata,
    updated_at = datetime('now')
`);
const deleteOperatorQuestionsByPipeline = db.prepare('DELETE FROM operator_questions WHERE pipeline_id = ?');
const insertAgentRun = db.prepare(`
  INSERT INTO agent_runs (public_id, pipeline_id, agent_id, trigger_source, action_name, block_key, status, visible_output, internal_payload, error_text, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);
const upsertAssembly = db.prepare(`
  INSERT INTO assemblies (public_id, pipeline_id, status, required_map, output_ids, final_content, metadata, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  ON CONFLICT(public_id) DO UPDATE SET
    status = excluded.status,
    required_map = excluded.required_map,
    output_ids = excluded.output_ids,
    final_content = excluded.final_content,
    metadata = excluded.metadata,
    updated_at = datetime('now')
`);
const insertTokenUsage = db.prepare(`
  INSERT INTO token_usage (public_id, pipeline_id, agent_id, provider, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost, bestpoint_cost, metadata)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// ── Hashes (identity) ───────────────────────────────
const getHash           = db.prepare('SELECT * FROM hashes WHERE hash = ?');
const getAllHashes       = db.prepare('SELECT * FROM hashes');
const countHashes       = db.prepare('SELECT COUNT(*) AS n FROM hashes');
const insertHash        = db.prepare(`INSERT INTO hashes (hash, bestpoints, tokens_used, email, is_active) VALUES (?, ?, 0, NULL, 1)`);
const updateHashTokens  = db.prepare(`UPDATE hashes SET tokens_used = tokens_used + ? WHERE hash = ?`);
const updateHashEmail   = db.prepare(`UPDATE hashes SET email = ? WHERE hash = ?`);
const updateHashBP      = db.prepare(`UPDATE hashes SET bestpoints = bestpoints + ? WHERE hash = ?`);
const claimOrphanPipelines = db.prepare(`UPDATE pipelines SET hash_id = ? WHERE hash_id IS NULL`);
const getPipelinesByHash   = db.prepare(`SELECT * FROM pipelines WHERE hash_id = ? ORDER BY updated_at DESC`);
const setPipelineHash      = db.prepare(`UPDATE pipelines SET hash_id = ? WHERE id = ? AND hash_id IS NULL`);

// ── Activation codes ─────────────────────────────────
const getActivationCode   = db.prepare('SELECT * FROM activation_codes WHERE code = ?');
const redeemActivationCode = db.prepare(`UPDATE activation_codes SET used_by = ?, used_at = datetime('now') WHERE code = ? AND used_by IS NULL`);

// ── Budget helpers ────────────────────────────────────
const updateHashBPSpent      = db.prepare('UPDATE hashes SET bp_spent = bp_spent + ?, tokens_used = tokens_used + ? WHERE hash = ?');
const getTokenUsageByPipeline = db.prepare('SELECT * FROM token_usage WHERE pipeline_id = ? ORDER BY created_at DESC');

// ── BP Ledger ─────────────────────────────────────────
const insertBPLedger      = db.prepare(`INSERT INTO bp_ledger (id, hash, type, amount, reason, meta) VALUES (?, ?, ?, ?, ?, ?)`);
const getBPLedgerByHash   = db.prepare(`SELECT * FROM bp_ledger WHERE hash = ? ORDER BY created_at DESC LIMIT 50`);
const countBPLedgerGrants = db.prepare(`SELECT COUNT(*) AS n FROM bp_ledger WHERE hash = ? AND type = 'grant'`);
const updateHashTier      = db.prepare(`UPDATE hashes SET tier = ? WHERE hash = ?`);

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
  getLatestContextVersion, insertContextVersion,
  getSeed, upsertSeed, deleteSeed,
  getModelOverrides, upsertModelOverride, deleteModelOverride,
  savePipelineState,
  getOutputCards, saveOutputCards,
  getOutputs, upsertOutput, deleteOutputsByPipeline,
  getOperatorQuestions, upsertOperatorQuestion, deleteOperatorQuestionsByPipeline,
  insertAgentRun, upsertAssembly, insertTokenUsage,
  // hashes
  getHash, getAllHashes, countHashes, insertHash, updateHashTokens, updateHashEmail, updateHashBP,
  claimOrphanPipelines, getPipelinesByHash, setPipelineHash,
  // activation codes
  getActivationCode, redeemActivationCode,
  // budget helpers
  updateHashBPSpent, getTokenUsageByPipeline,
  // bp ledger
  insertBPLedger, getBPLedgerByHash, countBPLedgerGrants, updateHashTier,
};
