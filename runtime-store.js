const pipelineState = new Map();
const persistenceTimers = new Map();

function ensurePipelineState(pipelineId) {
  if (!pipelineState.has(pipelineId)) {
    pipelineState.set(pipelineId, {
      context: null,
      outputs: [],
      operatorQuestions: [],
      persistence: {
        contextDirty: false,
        outputsDirty: false,
        questionsDirty: false,
        lastContextSerialized: null,
        lastPersistedContextSerialized: null,
      },
    });
  }
  return pipelineState.get(pipelineId);
}

function setContext(pipelineId, context) {
  const state = ensurePipelineState(pipelineId);
  state.context = context;
  state.persistence.contextDirty = true;
  state.persistence.lastContextSerialized = JSON.stringify(context || {});
  return state.context;
}

function getContext(pipelineId) {
  return ensurePipelineState(pipelineId).context;
}

function hasContext(pipelineId) {
  return Boolean(ensurePipelineState(pipelineId).context);
}

function clearContext(pipelineId) {
  const state = ensurePipelineState(pipelineId);
  state.context = null;
  state.persistence.contextDirty = true;
}

function setOutputs(pipelineId, outputs) {
  const state = ensurePipelineState(pipelineId);
  state.outputs = Array.isArray(outputs) ? outputs : [];
  state.persistence.outputsDirty = true;
  return state.outputs;
}

function getOutputs(pipelineId) {
  return ensurePipelineState(pipelineId).outputs;
}

function upsertOutput(pipelineId, output) {
  const state = ensurePipelineState(pipelineId);
  const idx = state.outputs.findIndex(item => item.public_id === output.public_id);
  if (idx >= 0) state.outputs[idx] = { ...state.outputs[idx], ...output };
  else state.outputs.push(output);
  state.persistence.outputsDirty = true;
  return output;
}

function setOperatorQuestions(pipelineId, questions) {
  const state = ensurePipelineState(pipelineId);
  state.operatorQuestions = Array.isArray(questions) ? questions : [];
  state.persistence.questionsDirty = true;
  return state.operatorQuestions;
}

function getOperatorQuestions(pipelineId) {
  return ensurePipelineState(pipelineId).operatorQuestions;
}

function upsertOperatorQuestion(pipelineId, question) {
  const state = ensurePipelineState(pipelineId);
  const idx = state.operatorQuestions.findIndex(item => item.public_id === question.public_id);
  if (idx >= 0) state.operatorQuestions[idx] = { ...state.operatorQuestions[idx], ...question };
  else state.operatorQuestions.push(question);
  state.persistence.questionsDirty = true;
  return question;
}

function getPersistence(pipelineId) {
  return ensurePipelineState(pipelineId).persistence;
}

function setPersistenceTimer(pipelineId, timer) {
  clearPersistenceTimer(pipelineId);
  persistenceTimers.set(pipelineId, timer);
}

function clearPersistenceTimer(pipelineId) {
  const timer = persistenceTimers.get(pipelineId);
  if (timer) clearTimeout(timer);
  persistenceTimers.delete(pipelineId);
}

function clearPipeline(pipelineId) {
  clearPersistenceTimer(pipelineId);
  pipelineState.delete(pipelineId);
}

module.exports = {
  ensurePipelineState,
  setContext,
  getContext,
  hasContext,
  clearContext,
  setOutputs,
  getOutputs,
  upsertOutput,
  setOperatorQuestions,
  getOperatorQuestions,
  upsertOperatorQuestion,
  getPersistence,
  setPersistenceTimer,
  clearPersistenceTimer,
  clearPipeline,
};
