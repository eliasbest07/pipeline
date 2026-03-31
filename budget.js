/**
 * budget.js
 * Pre-call budget enforcement, per-model cost table, and BP ledger.
 *
 * Cost table (tokens equivalent to 1 bestpoint):
 *   Anthropic  claude-opus-4-6           →  3 M
 *   Anthropic  claude-sonnet-4-6         →  7 M
 *   Anthropic  claude-haiku-4-5-*        → 20 M
 *   OpenAI     gpt-4o                    →  5 M
 *   OpenAI     gpt-4o-mini               → 25 M
 *   OpenAI     o3-mini                   →  4 M
 *   OpenAI     o1-mini                   →  8 M
 *   Google     gemini-2.0-flash          → 55 M
 *   Google     gemini-2.0-flash-thinking → 20 M
 *   Google     gemini-1.5-pro            → 30 M
 *   Google     gemini-1.5-flash          → 55 M
 *   OpenRouter / fal                     →  ∞ (free, no BP deducted)
 *
 * Tier rules:
 *   hash.tier === 'free'    → only models where tokens_per_bp >= FREE_TIER_THRESHOLD
 *   hash.tier === 'premium' → all models available (set on first code redemption)
 */

require('dotenv').config();
const { randomUUID } = require('crypto');
const db = require('./db');

// ── Per-model cost table (tokens per bestpoint) ────────────────
const TOKENS_PER_MODEL = {
  // Anthropic
  'claude-opus-4-6':            3_000_000,
  'claude-sonnet-4-6':          7_000_000,
  'claude-haiku-4-5-20251001':  20_000_000,
  // OpenAI
  'gpt-4o':        5_000_000,
  'gpt-4o-mini':   25_000_000,
  'o3-mini':       4_000_000,
  'o1-mini':       8_000_000,
  // Google
  'gemini-2.0-flash':           55_000_000,
  'gemini-2.0-flash-thinking':  20_000_000,
  'gemini-1.5-pro':             30_000_000,
  'gemini-1.5-flash':           55_000_000,
  // fal.ai media — excluded from BP
  'fal-ai/flux/schnell':  Infinity,
  'fal-ai/flux-pro':      Infinity,
  'fal-ai/playai-tts':    Infinity,
};

// Provider fallback for unknown models
const TOKENS_PER_PROVIDER = {
  anthropic:  7_000_000,
  openai:     10_000_000,
  google:     55_000_000,
  openrouter: Infinity,
  fal:        Infinity,
};

// Models with tokens_per_bp >= this threshold are available on the free tier
const FREE_TIER_THRESHOLD = 25_000_000;

const ALERT_THRESHOLDS = [0.8, 0.9];

// ── Errors ────────────────────────────────────────────────────
class BudgetExceededError extends Error {
  constructor(hash, spent, total) {
    super(`Presupuesto agotado: ${spent.toFixed(4)} / ${total} BP gastados`);
    this.code  = 'BUDGET_EXCEEDED';
    this.hash  = hash;
    this.spent = spent;
    this.total = total;
  }
}

class PremiumModelError extends Error {
  constructor(model) {
    super(`El modelo "${model}" requiere un código de activación. Agrega uno en ⬡ Bestpoints.`);
    this.code  = 'PREMIUM_MODEL_REQUIRED';
    this.model = model;
  }
}

// ── Helpers ───────────────────────────────────────────────────
function getTokensPerBP(provider, model) {
  if (model && TOKENS_PER_MODEL[model] !== undefined) return TOKENS_PER_MODEL[model];
  return TOKENS_PER_PROVIDER[provider] ?? TOKENS_PER_PROVIDER.google;
}

function _getHashForPipeline(pipelineId) {
  if (!pipelineId) return null;
  const pipeline = db.getPipeline.get(pipelineId);
  if (!pipeline?.hash_id) return null;
  return db.getHash.get(pipeline.hash_id);
}

// ── BP Ledger ─────────────────────────────────────────────────
/**
 * Record a bestpoint movement in the immutable ledger.
 * amount > 0 = credit, amount < 0 = debit.
 */
function recordBPMovement(hash, type, amount, reason, meta = {}) {
  if (!hash) return;
  db.insertBPLedger.run(randomUUID(), hash, type, amount, reason, JSON.stringify(meta));
}

/**
 * Backfill a grant entry for a hash that doesn't have one yet.
 */
function ensureGrantEntry(hash, bestpoints) {
  const { n } = db.countBPLedgerGrants.get(hash);
  if (n === 0) {
    recordBPMovement(hash, 'grant', bestpoints, 'initial_grant', { auto_backfill: true });
  }
}

// ── Budget check ──────────────────────────────────────────────
/**
 * Pre-call gate. Throws BudgetExceededError or PremiumModelError if needed.
 * Returns { alert, pct } near thresholds, null otherwise.
 */
function checkBudget(pipelineId, provider, model) {
  const row = _getHashForPipeline(pipelineId);
  if (!row) return null;

  // Tier gate: free-tier hashes can only use cheap models
  if (row.tier === 'free' && model) {
    const tpbp = getTokensPerBP(provider, model);
    if (tpbp !== Infinity && tpbp < FREE_TIER_THRESHOLD) {
      throw new PremiumModelError(model);
    }
  }

  const spent = row.bp_spent || 0;
  const total = row.bestpoints || 0;
  if (total > 0 && spent >= total) {
    throw new BudgetExceededError(row.hash, spent, total);
  }

  const pct = total > 0 ? spent / total : 0;
  for (const thr of ALERT_THRESHOLDS.slice().reverse()) {
    if (pct >= thr) return { alert: `${Math.round(thr * 100)}pct`, pct };
  }
  return null;
}

// ── Token usage recording ─────────────────────────────────────
/**
 * Record token usage after a completed AI call.
 * Updates hashes.bp_spent, writes to token_usage and bp_ledger.
 */
function recordUsage(pipelineId, agentId, provider, model, promptTokens, completionTokens) {
  const row = _getHashForPipeline(pipelineId);
  const pt = promptTokens    || 0;
  const ct = completionTokens || 0;
  const total = pt + ct;
  const tpbp  = getTokensPerBP(provider, model);
  const costBP = (tpbp === Infinity || tpbp === 0) ? 0 : total / tpbp;

  // Insert into token_usage ledger
  db.insertTokenUsage.run(
    randomUUID(),
    pipelineId || null,
    agentId    || null,
    provider   || null,
    model      || null,
    pt, ct, total,
    0,          // estimated_cost (fiat — reserved)
    costBP,     // bestpoint_cost
    JSON.stringify({ hash: row?.hash || null })
  );

  if (row?.hash) {
    // Update hash wallet
    if (costBP > 0 || total > 0) {
      db.updateHashBPSpent.run(costBP, total, row.hash);
    }
    // Write debit to BP ledger (only if there's a real cost)
    if (costBP > 0) {
      recordBPMovement(row.hash, 'ai_usage', -costBP,
        `${agentId || 'agent'} · ${provider}/${model}`,
        { pipelineId, agentId, provider, model, prompt_tokens: pt, completion_tokens: ct }
      );
    }
  }

  return { costBP, totalTokens: total };
}

// ── Status ────────────────────────────────────────────────────
function getStatus(pipelineId) {
  const row = _getHashForPipeline(pipelineId);
  if (!row) return null;
  const spent = row.bp_spent || 0;
  const total = row.bestpoints || 0;
  return {
    hash:         row.hash,
    tier:         row.tier || 'free',
    bestpoints:   total,
    bp_spent:     spent,
    bp_remaining: Math.max(0, total - spent),
    tokens_used:  row.tokens_used || 0,
    pct:          total > 0 ? spent / total : 0,
  };
}

// ── Catalog helpers ───────────────────────────────────────────
/** Returns all models with their BP cost info. */
function getModelCostCatalog() {
  return Object.entries(TOKENS_PER_MODEL).map(([modelId, tpbp]) => ({
    model: modelId,
    tokens_per_bp: tpbp,
    free_tier: tpbp >= FREE_TIER_THRESHOLD,
    bp_per_1m_tokens: tpbp === Infinity ? 0 : parseFloat((1_000_000 / tpbp).toFixed(6)),
  }));
}

module.exports = {
  BudgetExceededError,
  PremiumModelError,
  checkBudget,
  recordUsage,
  recordBPMovement,
  ensureGrantEntry,
  getStatus,
  getModelCostCatalog,
  getTokensPerBP,
  TOKENS_PER_MODEL,
  TOKENS_PER_PROVIDER,
  FREE_TIER_THRESHOLD,
};
