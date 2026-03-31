const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const puppeteer = require('puppeteer');

const BASE_URL = process.env.PIPELINE_BASE_URL || 'http://localhost:3000';
const HASH = process.env.PIPELINE_HASH || '6ead88a9-1b25-4423-9fd0-b1ca7acacbcd';
const PROMPT = process.env.PIPELINE_PROMPT || 'curso online completo';
const MONITOR_MS = Number(process.env.PIPELINE_MONITOR_MS || 180000);
const HEADLESS = /^(1|true|yes)$/i.test(process.env.PIPELINE_HEADLESS || '');
const AUTO_ANSWER = !/^(0|false|no)$/i.test(process.env.PIPELINE_AUTO_ANSWER || 'true');
const ARTIFACTS_DIR = path.join(__dirname, 'docs', 'e2e-artifacts', `run-${new Date().toISOString().replace(/[:.]/g, '-')}`);

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const state = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  prompt: PROMPT,
  pipelineId: null,
  pipelineName: null,
  prepareOk: false,
  startOk: false,
  browserErrors: [],
  pageErrors: [],
  requestFailures: [],
  events: [],
  questions: [],
  answers: [],
  screenshots: [],
  assertions: [],
};

let screenshotIndex = 0;

function log(tag, message) {
  const ts = new Date().toTimeString().slice(0, 8);
  console.log(`[${ts}] ${tag} ${message}`);
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function api(method, endpoint, body) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Pipeline-Hash': HASH,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch (_) {}
  return { ok: response.ok, status: response.status, data };
}

async function takeShot(page, label) {
  const filename = `${String(screenshotIndex++).padStart(3, '0')}-${label.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.png`;
  const file = path.join(ARTIFACTS_DIR, filename);
  await page.screenshot({ path: file, fullPage: false });
  state.screenshots.push(file);
  log('SHOT', filename);
}

function recordEvent(event, data) {
  state.events.push({
    ts: new Date().toISOString(),
    event,
    data,
  });
}

function assertCondition(condition, label, extra = {}) {
  state.assertions.push({ label, ok: Boolean(condition), ...extra });
  if (!condition) {
    throw new Error(`Assertion failed: ${label}`);
  }
}

function monitorSSE(pipelineId, emitter) {
  const http = require('http');
  const req = http.get(`${BASE_URL}/api/terminal/stream?pipeline_id=${pipelineId}&hash=${HASH}`, res => {
    res.setEncoding('utf8');
    let buffer = '';
    let currentEvent = null;

    res.on('data', chunk => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
          continue;
        }
        if (!line.startsWith('data:')) continue;
        try {
          const data = JSON.parse(line.slice(5).trim());
          emitter.emit(currentEvent || 'message', data);
        } catch (_) {}
      }
    });

    res.on('error', error => emitter.emit('stream_error', { message: error.message }));
  });

  req.on('error', error => emitter.emit('stream_error', { message: error.message }));
  return req;
}

async function waitForCanvas(page) {
  await page.waitForFunction(() => typeof window.switchPipeline === 'function', { timeout: 30000 });
  const canvasInfo = await page.evaluate(() => ({
    hasCanvas: Boolean(document.getElementById('canvas')),
    hasSidebar: Boolean(document.querySelector('.sidebar') || document.querySelector('#sidebar')),
  }));
  assertCondition(canvasInfo.hasCanvas, 'canvas rendered');
}

async function loadPipelineIntoUI(page, pipelineId, pipelineName) {
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.evaluate(hash => {
    localStorage.setItem('pipeline_hash', hash);
    localStorage.setItem('ph', hash);
    localStorage.setItem('hash', hash);
    window._pipelineHash = hash;
  }, HASH);
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await waitForCanvas(page);

  const result = await page.evaluate(async (id, name) => {
    await window.switchPipeline(id, name);
    return {
      nodeCount: document.querySelectorAll('.node').length,
      questionCount: document.querySelectorAll('.qcard').length,
      title: document.title,
    };
  }, pipelineId, pipelineName);

  assertCondition(result.nodeCount > 0, 'pipeline rendered nodes', result);
  recordEvent('ui.pipeline_loaded', result);
}

async function answerQuestion(pipelineId, question) {
  const answer = question.suggestion
    || question.metadata?.opciones?.[0]
    || question.metadata?.default_value
    || `Auto answer for ${question.field_key || 'field'}`;
  const response = await api('POST', `/api/pipelines/${pipelineId}/operator-questions/${question.public_id}/answer`, {
    answer,
  });
  state.answers.push({
    questionId: question.public_id,
    fieldKey: question.field_key,
    answer,
    ok: response.ok,
    status: response.status,
  });
  if (!response.ok) {
    throw new Error(`Failed answering operator question ${question.public_id}: ${response.status}`);
  }
}

async function writeArtifacts() {
  const summary = {
    ...state,
    finishedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

  const timeline = state.events
    .map(item => `${item.ts} ${item.event} ${JSON.stringify(item.data)}`)
    .join('\n');
  fs.writeFileSync(path.join(ARTIFACTS_DIR, 'timeline.log'), `${timeline}\n`);
}

async function main() {
  log('INFO', `Artifacts: ${ARTIFACTS_DIR}`);

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    slowMo: HEADLESS ? 0 : 40,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,960'],
    defaultViewport: { width: 1440, height: 960 },
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  page.on('console', msg => {
    if (msg.type() === 'error') {
      state.browserErrors.push(msg.text());
      log('BERR', msg.text().slice(0, 160));
    }
  });
  page.on('pageerror', error => {
    state.pageErrors.push(error.message);
    log('PERR', error.message);
  });
  page.on('requestfailed', request => {
    const failure = `${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'unknown'}`;
    state.requestFailures.push(failure);
    log('REQF', failure.slice(0, 180));
  });

  let sseReq = null;
  const sse = new EventEmitter();
  let pipelineCompleted = false;
  let lastUiCheckAt = 0;

  const onAnyEvent = (eventName, data) => {
    recordEvent(eventName, data);
    if (eventName === 'operator_question_created' && data?.question) {
      state.questions.push(data.question);
    }
  };

  [
    'connected',
    'context_snapshot',
    'pipeline_started',
    'pipeline_tick',
    'agent_status',
    'agent_started',
    'agent_stream',
    'agent_updated',
    'output_ready',
    'asset_ready',
    'operator_question_created',
    'operator_question_answered',
    'assembly_ready',
    'pipeline_completed',
    'pipeline_stopped',
    'pipeline_corrupted',
    'stream_error',
  ].forEach(eventName => {
    sse.on(eventName, data => onAnyEvent(eventName, data));
  });

  sse.on('pipeline_completed', () => {
    pipelineCompleted = true;
    log('DONE', 'pipeline_completed');
  });
  sse.on('pipeline_stopped', data => {
    pipelineCompleted = true;
    log('STOP', data?.reason || 'pipeline_stopped');
  });
  sse.on('pipeline_corrupted', data => {
    throw new Error(`Pipeline corrupted: ${data?.reason || 'unknown'}`);
  });
  sse.on('stream_error', data => {
    log('SSE', data.message || 'stream error');
  });

  try {
    log('STEP', 'creating pipeline');
    const createResult = await api('POST', '/api/pipelines', {
      name: `E2E ${PROMPT} ${Date.now()}`,
    });
    assertCondition(createResult.ok, 'pipeline created', { status: createResult.status, data: createResult.data });
    state.pipelineId = createResult.data.id;
    state.pipelineName = createResult.data.name;

    log('STEP', 'preparing pipeline');
    const prepareResult = await api('POST', `/api/pipelines/${state.pipelineId}/prepare`, {
      prompt: PROMPT,
    });
    state.prepareOk = prepareResult.ok;
    assertCondition(prepareResult.ok, 'pipeline prepared', { status: prepareResult.status });

    log('STEP', 'loading pipeline in browser');
    await loadPipelineIntoUI(page, state.pipelineId, state.pipelineName);
    await takeShot(page, 'pipeline_loaded');

    log('STEP', 'opening SSE stream');
    sseReq = monitorSSE(state.pipelineId, sse);
    await delay(1200);

    log('STEP', 'starting pipeline');
    const startResult = await api('POST', `/api/pipelines/${state.pipelineId}/start`, {});
    state.startOk = startResult.ok;
    assertCondition(startResult.ok, 'pipeline started via API', { status: startResult.status, data: startResult.data });

    const deadline = Date.now() + MONITOR_MS;
    while (Date.now() < deadline && !pipelineCompleted) {
      await delay(1000);

      const newQuestions = state.questions.filter(q => !state.answers.some(a => a.questionId === q.public_id));
      if (AUTO_ANSWER) {
        for (const question of newQuestions) {
          log('Q', `${question.field_key || 'field'} -> auto answer`);
          await answerQuestion(state.pipelineId, question);
        }
      }

      if (Date.now() - lastUiCheckAt > 10000) {
        lastUiCheckAt = Date.now();
        const uiState = await page.evaluate(() => ({
          nodeCount: document.querySelectorAll('.node').length,
          runningNodes: document.querySelectorAll('.node.running').length,
          doneNodes: document.querySelectorAll('.node.done').length,
          questionCards: document.querySelectorAll('.qcard').length,
          runtimeCards: document.querySelectorAll('.runtime-agent-card').length,
        }));
        recordEvent('ui.poll', uiState);
        await takeShot(page, `ui-${Math.round((MONITOR_MS - (deadline - Date.now())) / 1000)}s`);
      }
    }

    const stateResponse = await api('GET', `/api/pipelines/${state.pipelineId}/state`);
    assertCondition(stateResponse.ok, 'pipeline state retrievable', { status: stateResponse.status });

    const completedEvent = state.events.find(item => item.event === 'pipeline_completed');
    const startedEvent = state.events.find(item => item.event === 'pipeline_started');
    const agentEvents = state.events.filter(item => item.event === 'agent_started');
    const outputEvents = state.events.filter(item => item.event === 'output_ready' || item.event === 'asset_ready');

    assertCondition(Boolean(startedEvent), 'received pipeline_started event');
    assertCondition(agentEvents.length > 0, 'received agent activity', { count: agentEvents.length });
    assertCondition(outputEvents.length > 0 || Boolean(completedEvent), 'received outputs or completion', {
      outputs: outputEvents.length,
      completed: Boolean(completedEvent),
    });

    if (!pipelineCompleted) {
      log('WARN', `monitor timeout reached after ${MONITOR_MS}ms`);
    }

    await takeShot(page, pipelineCompleted ? 'pipeline_finished' : 'pipeline_timeout');
    await writeArtifacts();
    log('OK', 'test completed');
  } finally {
    if (sseReq) sseReq.destroy();
    await writeArtifacts().catch(() => {});
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch(error => {
  console.error('\nE2E test failed');
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
