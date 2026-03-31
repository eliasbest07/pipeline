(function () {
  'use strict';

  // ── CONSTANTS ──────────────────────────────────────────────
  var MOBILE_BP = 640;
  var SEEN_KEY = 'pipeline_mobile_v1';
  var ONBOARD_KEY = 'pipeline_onboarded_v1';

  // ── STATE ───────────────────────────────────────────────────
  var mState = 'HOME';
  var mMenuOpen = false;
  var mCurrentAgentIdx = null;
  var mTermTimer = null;
  var mTimerInterval = null;
  var mTimerSecs = 0;
  var mAgentCards = [];
  var mCurrentSuggestion = null;
  var mTermMsgIdx = 0;
  var mCurrentEditTab = 'cfg';
  var mTourActive = false;
  var mTypewriterSkip = false;
  var mPendingMsgs = null;
  var mPendingAgents = null;
  var mConfigTimeout = null;

  var $ = function (id) { return document.getElementById(id); };
  var isMobile = function () { return window.innerWidth <= MOBILE_BP; };

  // ── NODE COLORS ─────────────────────────────────────────────
  var NODE_COLORS = {
    pilot: '#c85050',
    research: '#3a9a6a',
    prompt: '#c8a040',
    image: '#8a5abf',
    video: '#4a8abf',
    assembly: '#c87840',
    human: '#c8a040',
    system: '#4a6a8a'
  };

  // ── SUGGESTIONS ─────────────────────────────────────────────
  var SUGGESTIONS = [
    {
      icon: '✦', text: 'Guía fotografía RAW', desc: 'Tutorial paso a paso', key: 'foto',
      agents: [
        { type: 'pilot', name: 'Agente Piloto', meta: 'Coordina el pipeline fotográfico' },
        { type: 'research', name: 'Agente Investigación', meta: 'Busca técnicas RAW y tips' },
        { type: 'prompt', name: 'Agente Escritor', meta: 'Redacta la guía completa' }
      ]
    },
    {
      icon: '⬡', text: 'Crea cuento con 3 imágenes', desc: 'Historia + ilustraciones', key: 'cuento',
      agents: [
        { type: 'pilot', name: 'Agente Piloto', meta: 'Coordina narrativa e imágenes' },
        { type: 'prompt', name: 'Agente Escritor', meta: 'Escribe el cuento completo' },
        { type: 'image', name: 'Agente Imagen', meta: 'Genera 3 ilustraciones HD' },
        { type: 'assembly', name: 'Agente Ensamblaje', meta: 'Une texto e imágenes en PDF' }
      ]
    },
    {
      icon: '♪', text: 'Clean Sonidos D&D', desc: 'Limpieza de audio RPG', key: 'audio',
      agents: [
        { type: 'pilot', name: 'Agente Piloto', meta: 'Coordina proceso de audio' },
        { type: 'prompt', name: 'Agente Filtros', meta: 'Aplica filtros de limpieza' },
        { type: 'assembly', name: 'Agente Ensamblaje', meta: 'Exporta audio final limpio' }
      ]
    },
    {
      icon: '▶', text: 'Video pipeline v1', desc: 'Script → imágenes → video', key: 'video',
      agents: [
        { type: 'pilot', name: 'Agente Piloto', meta: 'Coordina producción del video' },
        { type: 'research', name: 'Agente Guión', meta: 'Escribe el guión del video' },
        { type: 'prompt', name: 'Agente Prompt', meta: 'Genera prompts por escena' },
        { type: 'image', name: 'Agente Imagen', meta: 'Genera imágenes por escena' },
        { type: 'video', name: 'Agente Video', meta: 'Anima cada clip 8 segundos' },
        { type: 'assembly', name: 'Agente Ensamblaje', meta: 'Une todos los clips MP4' }
      ]
    }
  ];

  // ── TERMINAL MESSAGES ────────────────────────────────────────
  var TERM_MSGS = {
    cuento: [
      { type: 'think', text: 'Agente Piloto inicializando contexto del cuento...' },
      { type: 'action', text: 'Analizando prompt: "Crea cuento con 3 imágenes"' },
      { type: 'think', text: 'Determinando estructura narrativa: introducción, nudo, desenlace' },
      { type: 'action', text: 'Agente Escritor: generando historia base...' },
      { type: 'think', text: 'Personajes definidos: protagonista, antagonista, mundo creado' },
      { type: 'action', text: 'Agente Imagen: generando ilustración escena 1/3...' },
      { type: 'think', text: 'Verificando coherencia visual con el texto del cuento' },
      { type: 'action', text: 'Agente Imagen: generando ilustración escena 2/3...' },
      { type: 'action', text: 'Agente Imagen: generando ilustración escena 3/3...' },
      { type: 'think', text: 'Agente Ensamblaje: combinando texto e imágenes...' },
      { type: 'done', text: 'Pipeline completado — cuento con 3 imágenes listo' }
    ],
    foto: [
      { type: 'think', text: 'Agente Piloto: analizando parámetros fotografía RAW...' },
      { type: 'action', text: 'Agente Investigación: buscando técnicas de exposición...' },
      { type: 'think', text: 'Recopilando tips de encuadre, luz y ISO...' },
      { type: 'action', text: 'Agente Escritor: compilando guía paso a paso...' },
      { type: 'think', text: 'Añadiendo ejemplos prácticos y errores comunes...' },
      { type: 'done', text: 'Guía fotografía RAW completada — lista para descargar' }
    ],
    audio: [
      { type: 'think', text: 'Agente Piloto: analizando archivos de audio D&D...' },
      { type: 'action', text: 'Agente Filtros: aplicando reducción de ruido de fondo...' },
      { type: 'think', text: 'Normalizando niveles de volumen...' },
      { type: 'action', text: 'Eliminando clicks, pops y distorsiones...' },
      { type: 'done', text: 'Audio limpio exportado — 0 artefactos detectados' }
    ],
    video: [
      { type: 'think', text: 'Agente Piloto: inicializando pipeline de video...' },
      { type: 'action', text: 'Agente Guión: escribiendo script por escenas...' },
      { type: 'think', text: 'Estructura de 5 escenas de 8 segundos definida' },
      { type: 'action', text: 'Agente Prompt: generando prompt visual por escena...' },
      { type: 'action', text: 'Agente Imagen: renderizando imágenes HD 16:9...' },
      { type: 'think', text: 'Verificando coherencia de estilo entre escenas...' },
      { type: 'action', text: 'Agente Video: animando clips — movimiento de cámara...' },
      { type: 'action', text: 'Agente Ensamblaje: uniendo clips con transiciones...' },
      { type: 'done', text: 'Video final exportado — 40 segundos, calidad HD' }
    ],
    'default': [
      { type: 'think', text: 'Agente Piloto inicializando...' },
      { type: 'action', text: 'Analizando objetivo del pipeline...' },
      { type: 'think', text: 'Delegando tareas a sub-agentes...' },
      { type: 'action', text: 'Procesando información...' },
      { type: 'think', text: 'Verificando coherencia de resultados...' },
      { type: 'done', text: 'Pipeline completado exitosamente' }
    ]
  };

  // ── OUTPUTS PER AGENT TYPE ───────────────────────────────────
  var AGENT_OUTPUTS = {
    pilot: 'Contexto analizado. Subtareas distribuidas a 3 agentes en paralelo. ETA estimado: completado.',
    research: 'Se encontraron 12 fuentes relevantes. Datos estructurados listos para el siguiente agente.',
    prompt: 'Prompt generado: 847 tokens. Tono: profesional. Formato: markdown con secciones.',
    image: 'Imagen generada: 1024×1024px, JPEG 94%. Tiempo: 8.3s. Modelo: flux-dev.',
    video: 'Clip de 8s generado: 1280×720 H.264. FPS: 24. Transición: fade-in aplicada.',
    assembly: 'Archivo ensamblado correctamente. Tamaño final: 2.4 MB. Formato: PDF/MP4.',
    human: 'Operador notificado. Esperando confirmación manual antes de continuar.',
    system: 'Sistema verificado. Sin errores detectados en el pipeline.'
  };

  // ────────────────────────────────────────────────────────────
  //  SCREEN MANAGEMENT
  // ────────────────────────────────────────────────────────────
  function showScreen(name) {
    var homeEl = $('m-home');
    var pipelineEl = $('m-pipeline');
    var editEl = $('m-agent-edit');

    if (homeEl) homeEl.classList.add('hidden');
    if (pipelineEl) pipelineEl.classList.add('hidden');
    if (editEl) editEl.classList.add('hidden');

    if (name === 'HOME' && homeEl) {
      homeEl.classList.remove('hidden');
    } else if (name === 'PIPELINE' && pipelineEl) {
      pipelineEl.classList.remove('hidden');
    } else if (name === 'AGENT_EDIT' && editEl) {
      editEl.classList.remove('hidden');
    }

    mState = name;
  }

  // ────────────────────────────────────────────────────────────
  //  TIMER
  // ────────────────────────────────────────────────────────────
  function formatTime(secs) {
    var m = Math.floor(secs / 60);
    var s = secs % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  function startTimer() {
    stopTimer();
    mTimerSecs = 0;
    var timerEl = $('m-timer');
    if (timerEl) {
      timerEl.textContent = '00:00';
      timerEl.classList.add('live');
    }
    mTimerInterval = setInterval(function () {
      mTimerSecs++;
      if (timerEl) timerEl.textContent = formatTime(mTimerSecs);
    }, 1000);
  }

  function stopTimer() {
    if (mTimerInterval) {
      clearInterval(mTimerInterval);
      mTimerInterval = null;
    }
    var timerEl = $('m-timer');
    if (timerEl) timerEl.classList.remove('live');
  }

  // ────────────────────────────────────────────────────────────
  //  TERMINAL
  // ────────────────────────────────────────────────────────────
  function showTerminalMsg(msgs, idx, agents) {
    var terminal = $('m-terminal');
    if (!terminal) return;

    // Remove any existing cursor
    var existingCursor = terminal.querySelector('.m-term-cursor');
    if (existingCursor) existingCursor.remove();

    // Keep max 3 messages — fade out oldest if needed
    var existing = terminal.querySelectorAll('.m-term-msg');
    if (existing.length >= 3) {
      var oldest = existing[0];
      oldest.classList.add('fading');
      setTimeout(function () {
        if (oldest.parentNode) oldest.parentNode.removeChild(oldest);
      }, 400);
    }

    var msgData = msgs[idx];
    if (!msgData) return;

    var msgEl = document.createElement('div');
    msgEl.className = 'm-term-msg type-' + msgData.type;
    msgEl.textContent = msgData.text;

    var cursor = document.createElement('span');
    cursor.className = 'm-term-cursor';
    msgEl.appendChild(cursor);

    terminal.appendChild(msgEl);

    // Trigger show animation on next frame
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        msgEl.classList.add('show');
      });
    });

    // Update agent card status based on message position in pipeline
    if (agents && agents.length > 0) {
      var progress = idx / (msgs.length - 1);
      var activeAgentIdx = Math.min(
        Math.floor(progress * agents.length),
        agents.length - 1
      );

      // Set previous agents as done
      for (var i = 0; i < activeAgentIdx; i++) {
        setCardStatus(i, 'done');
        if (!mAgentCards[i] || !mAgentCards[i].hasOutput) {
          showCardOutput(i, AGENT_OUTPUTS[agents[i].type] || 'Tarea completada.');
          if (mAgentCards[i]) mAgentCards[i].hasOutput = true;
        }
      }

      // Set current agent as running
      setCardStatus(activeAgentIdx, 'running');

      // If it's the last message, complete everything
      if (idx === msgs.length - 1) {
        setTimeout(function () {
          for (var j = 0; j < agents.length; j++) {
            setCardStatus(j, 'done');
            if (!mAgentCards[j] || !mAgentCards[j].hasOutput) {
              showCardOutput(j, AGENT_OUTPUTS[agents[j].type] || 'Tarea completada.');
              if (mAgentCards[j]) mAgentCards[j].hasOutput = true;
            }
          }
        }, 1200);
      }
    }
  }

  function startTerminal(msgs, agents) {
    if (mTermTimer) {
      clearTimeout(mTermTimer);
      mTermTimer = null;
    }
    mTermMsgIdx = 0;
    mPendingMsgs = msgs;
    mPendingAgents = agents;

    // Clear terminal
    var terminal = $('m-terminal');
    if (terminal) terminal.innerHTML = '';

    function scheduleNext() {
      if (mTermMsgIdx >= msgs.length) {
        stopTimer();
        return;
      }
      showTerminalMsg(msgs, mTermMsgIdx, agents);
      mTermMsgIdx++;

      if (mTermMsgIdx < msgs.length) {
        // Randomize delay between 5000ms and 7000ms
        var delay = 5000 + Math.floor(Math.random() * 2000);
        mTermTimer = setTimeout(scheduleNext, delay);
      } else {
        // Last message shown — stop timer after a short delay
        mTermTimer = setTimeout(function () {
          stopTimer();
        }, 3000);
      }
    }

    scheduleNext();
  }

  // ────────────────────────────────────────────────────────────
  //  AGENT CARDS
  // ────────────────────────────────────────────────────────────
  function setCardStatus(idx, status) {
    var card = mAgentCards[idx];
    if (!card || !card.el) return;
    var dot = card.el.querySelector('.m-card-status');
    if (!dot) return;
    dot.className = 'm-card-status ' + status;
    card.status = status;

    // Update card border class
    card.el.className = 'm-agent-card ' + status;
  }

  function showCardOutput(idx, text) {
    var card = mAgentCards[idx];
    if (!card || !card.el) return;
    var outputEl = card.el.querySelector('.m-card-output');
    if (!outputEl) return;
    var textEl = outputEl.querySelector('.m-card-output-text');
    if (textEl) textEl.textContent = text;
    outputEl.classList.add('visible');
    card.outputText = text;
  }

  function buildAgentCards(agents) {
    var area = $('m-agents-area');
    if (!area) return;
    area.innerHTML = '';
    mAgentCards = [];

    agents.forEach(function (agent, idx) {
      var color = NODE_COLORS[agent.type] || '#706860';

      var card = document.createElement('div');
      card.className = 'm-agent-card';
      card.innerHTML =
        '<div class="m-card-header">' +
          '<div class="m-card-color-bar" style="background:' + color + '"></div>' +
          '<div class="m-card-info">' +
            '<div class="m-card-name">' + escapeHtml(agent.name) + '</div>' +
            '<div class="m-card-meta">' + escapeHtml(agent.meta) + '</div>' +
          '</div>' +
          '<div class="m-card-status idle"></div>' +
          '<div class="m-card-actions">' +
            '<button class="m-card-btn" onclick="window.mViewOutput(' + idx + ')">Output</button>' +
            '<button class="m-card-btn" onclick="window.mEditAgent(' + idx + ')">Config</button>' +
          '</div>' +
        '</div>' +
        '<div class="m-card-output">' +
          '<div class="m-card-output-text"></div>' +
        '</div>';

      area.appendChild(card);
      mAgentCards.push({
        el: card,
        agent: agent,
        status: 'idle',
        hasOutput: false,
        outputText: ''
      });
    });
  }

  // ────────────────────────────────────────────────────────────
  //  PIPELINE
  // ────────────────────────────────────────────────────────────
  function startPipeline(suggestion) {
    mCurrentSuggestion = suggestion;

    // Update header title
    var titleEl = $('m-title');
    if (titleEl) titleEl.textContent = suggestion.text;

    // Build agent cards
    buildAgentCards(suggestion.agents);

    // Switch to pipeline screen
    showScreen('PIPELINE');

    // Start timer
    startTimer();

    // Get messages for this pipeline type
    var msgs = TERM_MSGS[suggestion.key] || TERM_MSGS['default'];

    // Start terminal animation
    startTerminal(msgs, suggestion.agents);

    // Mark as seen
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
  }

  // ────────────────────────────────────────────────────────────
  //  SUGGESTIONS
  // ────────────────────────────────────────────────────────────
  function renderSuggestions() {
    var container = $('m-suggestions');
    if (!container) return;
    container.innerHTML = '<div class="m-sugg-label">Empieza con una sugerencia</div>';

    SUGGESTIONS.forEach(function (s) {
      var item = document.createElement('div');
      item.className = 'm-sugg-item';
      item.innerHTML =
        '<span class="m-sugg-icon">' + s.icon + '</span>' +
        '<div class="m-sugg-body">' +
          '<div class="m-sugg-text">' + escapeHtml(s.text) + '</div>' +
          '<div class="m-sugg-desc">' + escapeHtml(s.desc) + '</div>' +
        '</div>' +
        '<span class="m-sugg-arrow">›</span>';

      item.addEventListener('click', function () {
        startPipeline(s);
      });

      container.appendChild(item);
    });
  }

  // ────────────────────────────────────────────────────────────
  //  HOME SEND BUTTON
  // ────────────────────────────────────────────────────────────
  function handleSend() {
    var input = $('m-main-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;

    // Find closest suggestion or use default
    var matched = null;
    var textLower = text.toLowerCase();
    for (var i = 0; i < SUGGESTIONS.length; i++) {
      if (textLower.indexOf(SUGGESTIONS[i].key) !== -1 ||
          SUGGESTIONS[i].text.toLowerCase().indexOf(textLower) !== -1) {
        matched = SUGGESTIONS[i];
        break;
      }
    }

    if (!matched) {
      // Create a custom suggestion from input
      matched = {
        icon: '✦',
        text: text,
        desc: 'Pipeline personalizado',
        key: 'default',
        agents: [
          { type: 'pilot', name: 'Agente Piloto', meta: 'Coordina el pipeline' },
          { type: 'prompt', name: 'Agente Ejecutor', meta: 'Procesa la tarea principal' },
          { type: 'assembly', name: 'Agente Ensamblaje', meta: 'Consolida los resultados' }
        ]
      };
    }

    input.value = '';
    startPipeline(matched);
  }

  // ────────────────────────────────────────────────────────────
  //  TOUR
  // ────────────────────────────────────────────────────────────

  // Types text into an input char by char; checks mTypewriterSkip to jump to end
  function typeIntoField(inputEl, text, speed, onDone) {
    inputEl.value = '';
    var i = 0;
    function next() {
      if (mTypewriterSkip) {
        inputEl.value = text;
        inputEl.scrollTop = inputEl.scrollHeight;
        if (onDone) onDone();
        return;
      }
      if (i >= text.length) { if (onDone) onDone(); return; }
      inputEl.value += text[i];
      inputEl.scrollTop = inputEl.scrollHeight;
      i++;
      setTimeout(next, speed + Math.floor(Math.random() * 18));
    }
    next();
  }

  // Opens the agent config modal and auto-fills fields with typewriter animation
  function runTourConfigDemo(agentIdx, configData) {
    // Open the modal
    mEditAgent(agentIdx);

    setTimeout(function () {
      // Type into Goal field
      var goalInput = $('m-edit-goal');
      if (goalInput) {
        typeIntoField(goalInput, configData.goal, 30, function () {
          // Small pause then type Prompt
          setTimeout(function () {
            var promptInput = $('m-edit-prompt');
            if (promptInput) {
              typeIntoField(promptInput, configData.prompt, 22, function () {
                // Wait then auto-save and close
                setTimeout(function () {
                  var saveBtn = $('m-edit-save');
                  if (saveBtn) saveBtn.classList.add('tour-highlight');
                  setTimeout(function () {
                    if (saveBtn) saveBtn.classList.remove('tour-highlight');
                    saveEditAgent();
                  }, 900);
                }, 1000);
              });
            }
          }, 500);
        });
      }
    }, 700);
  }

  function updateLiveBtn(active) {
    var btn = $('m-live-btn');
    if (!btn) return;
    btn.classList.toggle('live', !!active);
  }

  function completeTour() {
    if (!mTourActive) return;

    // Cancel all pending timers
    if (mTermTimer) { clearTimeout(mTermTimer); mTermTimer = null; }
    if (mConfigTimeout) { clearTimeout(mConfigTimeout); mConfigTimeout = null; }

    // Instantly complete any running typewriter
    mTypewriterSkip = true;

    // Show all remaining terminal messages at once
    var terminal = $('m-terminal');
    if (terminal && mPendingMsgs) {
      while (mTermMsgIdx < mPendingMsgs.length) {
        var msgData = mPendingMsgs[mTermMsgIdx];
        var msgEl = document.createElement('div');
        msgEl.className = 'm-term-msg type-' + msgData.type + ' show';
        msgEl.textContent = msgData.text;
        terminal.appendChild(msgEl);
        mTermMsgIdx++;
      }
      // Keep only last 3
      var all = terminal.querySelectorAll('.m-term-msg');
      for (var k = 0; k < all.length - 3; k++) all[k].remove();
    }

    // Mark all agents done
    var agents = mPendingAgents || [];
    for (var j = 0; j < mAgentCards.length; j++) {
      setCardStatus(j, 'done');
      if (!mAgentCards[j].hasOutput) {
        showCardOutput(j, AGENT_OUTPUTS[(agents[j] && agents[j].type)] || 'Tarea completada.');
        mAgentCards[j].hasOutput = true;
      }
    }

    stopTimer();
    mTourActive = false;
    mTypewriterSkip = false;
    updateLiveBtn(false);

    // If config modal is open, save and return
    if (mState === 'AGENT_EDIT') saveEditAgent();
  }

  function startTour() {
    mTourActive = true;
    updateLiveBtn(true);
    startPipeline(SUGGESTIONS[0]);

    // After the first terminal message (~6s), demo the agent config
    mConfigTimeout = setTimeout(function () {
      runTourConfigDemo(1, {
        goal: 'Buscar técnicas avanzadas de fotografía RAW: exposición, balance de blancos y postprocesado en Lightroom.',
        prompt: 'Eres un agente investigador especializado en fotografía RAW. Encuentra las mejores técnicas para principiantes e intermedios. Responde en español, claro y estructurado con ejemplos prácticos.'
      });
    }, 7000);
  }

  // ────────────────────────────────────────────────────────────
  //  AGENT EDIT SCREEN
  // ────────────────────────────────────────────────────────────
  function mEditAgent(idx) {
    mCurrentAgentIdx = idx;
    var cardData = mAgentCards[idx];
    if (!cardData) return;
    var agent = cardData.agent;

    var editTitle = $('m-edit-title');
    if (editTitle) editTitle.textContent = agent.name;

    // Populate Config tab
    var nameInput = $('m-edit-name');
    var goalInput = $('m-edit-goal');
    var promptInput = $('m-edit-prompt');
    var contextInput = $('m-edit-context');

    if (nameInput) nameInput.value = agent.name;
    if (goalInput) goalInput.value = agent.meta;
    if (promptInput) promptInput.value = 'Eres ' + agent.name + '. Tu objetivo es: ' + agent.meta + '. Responde en español, de forma clara y estructurada.';
    if (contextInput) contextInput.value = 'Contexto del piloto: Pipeline "' + (mCurrentSuggestion ? mCurrentSuggestion.text : 'Pipeline') + '". Estado: ' + (cardData.status || 'idle') + '.';

    // Switch to config tab
    switchEditTab('cfg');

    // Show edit screen
    showScreen('AGENT_EDIT');
  }
  window.mEditAgent = mEditAgent;

  function mViewOutput(idx) {
    var card = mAgentCards[idx];
    if (!card || !card.el) return;
    var outputEl = card.el.querySelector('.m-card-output');
    if (!outputEl) return;
    outputEl.classList.toggle('visible');
  }
  window.mViewOutput = mViewOutput;

  function switchEditTab(tabName) {
    mCurrentEditTab = tabName;
    var tabs = document.querySelectorAll('.m-edit-tab');
    var panels = document.querySelectorAll('.m-tab-panel');

    tabs.forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    panels.forEach(function (panel) {
      panel.classList.toggle('active', panel.dataset.panel === tabName);
    });
  }

  function saveEditAgent() {
    if (mCurrentAgentIdx === null) return;
    var card = mAgentCards[mCurrentAgentIdx];
    if (!card) return;

    var nameInput = $('m-edit-name');
    var goalInput = $('m-edit-goal');

    if (nameInput && nameInput.value.trim()) {
      card.agent.name = nameInput.value.trim();
      var nameEl = card.el.querySelector('.m-card-name');
      if (nameEl) nameEl.textContent = card.agent.name;
    }

    if (goalInput && goalInput.value.trim()) {
      card.agent.meta = goalInput.value.trim();
      var metaEl = card.el.querySelector('.m-card-meta');
      if (metaEl) metaEl.textContent = card.agent.meta;
    }

    showScreen('PIPELINE');
  }

  // ────────────────────────────────────────────────────────────
  //  MENU SHEET
  // ────────────────────────────────────────────────────────────
  function openMenu() {
    mMenuOpen = true;
    var overlay = $('m-menu-overlay');
    var sheet = $('m-menu-sheet');
    if (overlay) {
      overlay.style.display = 'block';
      requestAnimationFrame(function () {
        overlay.classList.add('open');
      });
    }
    if (sheet) {
      sheet.classList.add('open');
    }
    renderMenuPipelines();
  }

  function closeMenu() {
    mMenuOpen = false;
    var overlay = $('m-menu-overlay');
    var sheet = $('m-menu-sheet');
    if (overlay) {
      overlay.classList.remove('open');
      setTimeout(function () {
        overlay.style.display = 'none';
      }, 250);
    }
    if (sheet) {
      sheet.classList.remove('open');
    }
  }

  function renderMenuPipelines() {
    var listEl = $('m-sheet-pipelines');
    if (!listEl) return;

    listEl.innerHTML = '';

    // Show suggestions as available pipelines
    SUGGESTIONS.forEach(function (s) {
      var item = document.createElement('div');
      item.className = 'm-sheet-item' + (mCurrentSuggestion && mCurrentSuggestion.key === s.key ? ' active' : '');
      item.innerHTML =
        '<div class="m-sheet-dot" style="background:' + (NODE_COLORS[s.agents[0].type] || '#706860') + '"></div>' +
        '<span class="m-sheet-item-name">' + escapeHtml(s.text) + '</span>' +
        '<span class="m-sheet-item-sub">' + s.agents.length + ' agentes</span>';

      item.addEventListener('click', function () {
        closeMenu();
        startPipeline(s);
      });

      listEl.appendChild(item);
    });
  }

  // ────────────────────────────────────────────────────────────
  //  UTILITY
  // ────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ────────────────────────────────────────────────────────────
  //  BUILD MOBILE HTML
  // ────────────────────────────────────────────────────────────
  function buildMobileHTML() {
    var app = $('mobile-app');
    if (!app) return;

    app.innerHTML =
      // HEADER
      '<div id="m-header">' +
        '<button id="m-menu-btn" aria-label="Menú">' +
          '<svg viewBox="0 0 16 12" width="16" height="12" fill="none" stroke="currentColor" stroke-width="1.5">' +
            '<line x1="0" y1="1.5" x2="16" y2="1.5"/>' +
            '<line x1="0" y1="6" x2="16" y2="6"/>' +
            '<line x1="0" y1="10.5" x2="16" y2="10.5"/>' +
          '</svg>' +
        '</button>' +
        '<div id="m-title-area">' +
          '<div id="m-title">Pipeline OS</div>' +
          '<div id="m-subtitle">v4</div>' +
        '</div>' +
        '<span id="m-timer">00:00</span>' +
        '<div id="m-header-actions">' +
          '<button class="m-hbtn" title="Info">?</button>' +
          '<button class="m-hbtn" title="Alertas">!</button>' +
          '<button class="m-hbtn" title="Favoritos">♡</button>' +
        '</div>' +
      '</div>' +

      // HOME SCREEN
      '<div id="m-home" class="m-screen">' +
        '<div id="m-input-area">' +
          '<textarea id="m-main-input" rows="2" placeholder="Escribe tu idea de aplicación..."></textarea>' +
          '<button id="m-send-btn">↑</button>' +
        '</div>' +
        '<div id="m-tour-btn">' +
          '<span class="m-tour-icon">⚡</span>' +
          '<div class="m-tour-text">' +
            '<div class="m-tour-title">Tour interactivo</div>' +
            '<div class="m-tour-sub">Ve Pipeline OS en acción</div>' +
          '</div>' +
          '<span style="color:#4a6a8a">›</span>' +
        '</div>' +
        '<div id="m-suggestions"></div>' +
      '</div>' +

      // PIPELINE SCREEN
      '<div id="m-pipeline" class="m-screen hidden">' +
        '<div id="m-terminal"></div>' +
        '<div id="m-agents-area"></div>' +
        '<div id="m-stop-bar">' +
          '<button id="m-back-home-btn">← Inicio</button>' +
          '<button id="m-live-btn">● LIVE</button>' +
          '<button id="m-stop-btn">■ Detener</button>' +
        '</div>' +
      '</div>' +

      // AGENT EDIT SCREEN
      '<div id="m-agent-edit" class="m-screen hidden">' +
        '<div id="m-edit-header">' +
          '<button id="m-edit-back">←</button>' +
          '<div id="m-edit-title">Agente</div>' +
          '<button id="m-edit-save">Guardar</button>' +
        '</div>' +
        '<div id="m-edit-tabs">' +
          '<div class="m-edit-tab active" data-tab="cfg">Config</div>' +
          '<div class="m-edit-tab" data-tab="ctx">Contexto</div>' +
          '<div class="m-edit-tab" data-tab="tests">Tests</div>' +
          '<div class="m-edit-tab" data-tab="out">Output</div>' +
        '</div>' +
        '<div id="m-edit-body">' +
          // Config panel
          '<div class="m-tab-panel active" data-panel="cfg">' +
            '<div class="m-field-group">' +
              '<label class="m-field-label">Nombre</label>' +
              '<input id="m-edit-name" class="m-field-input" type="text" placeholder="Nombre del agente">' +
            '</div>' +
            '<div class="m-field-group">' +
              '<label class="m-field-label">Objetivo</label>' +
              '<input id="m-edit-goal" class="m-field-input" type="text" placeholder="Objetivo del agente">' +
            '</div>' +
            '<div class="m-field-group">' +
              '<label class="m-field-label">Prompt del sistema</label>' +
              '<textarea id="m-edit-prompt" class="m-field-input m-field-textarea" placeholder="Instrucciones del sistema..."></textarea>' +
            '</div>' +
          '</div>' +
          // Context panel
          '<div class="m-tab-panel" data-panel="ctx">' +
            '<div class="m-context-box">' +
              '<div class="m-context-label">Contexto del piloto</div>' +
              '<textarea id="m-edit-context" class="m-context-input" placeholder="El piloto enviará este contexto..."></textarea>' +
            '</div>' +
            '<div class="m-field-group" style="margin-top:8px">' +
              '<label class="m-field-label">Variables de entorno</label>' +
              '<textarea class="m-field-input m-field-textarea" placeholder="KEY=valor&#10;API_KEY=..."></textarea>' +
            '</div>' +
          '</div>' +
          // Tests panel
          '<div class="m-tab-panel" data-panel="tests">' +
            '<div class="m-field-group">' +
              '<label class="m-field-label">Input de prueba</label>' +
              '<textarea class="m-field-input m-field-textarea" placeholder="Escribe un input para probar el agente..."></textarea>' +
            '</div>' +
            '<div class="m-field-group">' +
              '<label class="m-field-label">Output esperado</label>' +
              '<textarea class="m-field-input m-field-textarea" placeholder="Describe el resultado esperado..."></textarea>' +
            '</div>' +
          '</div>' +
          // Output panel
          '<div class="m-tab-panel" data-panel="out">' +
            '<div class="m-field-group">' +
              '<label class="m-field-label">Último output</label>' +
              '<div id="m-edit-output-display" class="m-field-input m-field-textarea" style="color:#9a9088;min-height:120px;overflow-y:auto">Sin output aún.</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div id="m-edit-actions">' +
          '<button class="m-action-btn">⬡ Skills</button>' +
          '<button class="m-action-btn">✦ Agentes</button>' +
          '<button class="m-action-btn">👤 Human</button>' +
          '<button class="m-action-btn">◈ Modelo</button>' +
        '</div>' +
      '</div>';
  }

  function buildMenuSheet() {
    var overlay = $('m-menu-overlay');
    var sheet = $('m-menu-sheet');
    if (!sheet) return;

    sheet.innerHTML =
      '<div id="m-sheet-handle"></div>' +
      '<div id="m-sheet-header">' +
        '<span id="m-sheet-title">Pipelines</span>' +
        '<button id="m-sheet-new">+ Nuevo</button>' +
      '</div>' +
      '<div id="m-sheet-body">' +
        '<div class="m-sheet-sec">' +
          '<div class="m-sheet-sec-label">Mis Pipelines</div>' +
          '<div id="m-sheet-pipelines"></div>' +
        '</div>' +
        '<div class="m-sheet-divider"></div>' +
        '<div class="m-sheet-sec">' +
          '<div class="m-sheet-sec-label">Skills</div>' +
          '<div class="m-sheet-item">' +
            '<div class="m-sheet-dot" style="background:#2a6a8a"></div>' +
            '<span class="m-sheet-item-name">⌕ web_search</span>' +
            '<span class="m-sheet-item-sub">búsqueda</span>' +
          '</div>' +
          '<div class="m-sheet-item">' +
            '<div class="m-sheet-dot" style="background:#2a2a5a"></div>' +
            '<span class="m-sheet-item-name">📋 notion_mcp</span>' +
            '<span class="m-sheet-item-sub">MCP</span>' +
          '</div>' +
          '<div class="m-sheet-item">' +
            '<div class="m-sheet-dot" style="background:#2a1060"></div>' +
            '<span class="m-sheet-item-name">⬡ image_gen</span>' +
            '<span class="m-sheet-item-sub">imagen</span>' +
          '</div>' +
        '</div>' +
        '<div class="m-sheet-divider"></div>' +
        '<div class="m-sheet-sec">' +
          '<div class="m-sheet-sec-label">Agentes personalizados</div>' +
          '<div class="m-sheet-empty">Sin agentes creados aún</div>' +
        '</div>' +
      '</div>';
  }

  // ────────────────────────────────────────────────────────────
  //  EVENT BINDING
  // ────────────────────────────────────────────────────────────
  function bindEvents() {
    // Menu button
    var menuBtn = $('m-menu-btn');
    if (menuBtn) menuBtn.addEventListener('click', openMenu);

    // Menu overlay close
    var overlay = $('m-menu-overlay');
    if (overlay) overlay.addEventListener('click', closeMenu);

    // Sheet new pipeline
    var sheetNew = $('m-sheet-new');
    if (sheetNew) sheetNew.addEventListener('click', function () {
      closeMenu();
      var input = $('m-main-input');
      if (input) input.focus();
    });

    // Send button
    var sendBtn = $('m-send-btn');
    if (sendBtn) sendBtn.addEventListener('click', handleSend);

    // Main input enter key
    var mainInput = $('m-main-input');
    if (mainInput) {
      mainInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      });
    }

    // Tour button
    var tourBtn = $('m-tour-btn');
    if (tourBtn) tourBtn.addEventListener('click', startTour);

    // Live button — toggle tour complete/start
    var liveBtn = $('m-live-btn');
    if (liveBtn) liveBtn.addEventListener('click', function () {
      if (mTourActive) completeTour();
      else startTour();
    });

    // Terminal click — complete tour animation instantly
    var termEl = $('m-terminal');
    if (termEl) termEl.addEventListener('click', function () {
      if (mTourActive) completeTour();
    });

    // Back home button
    var backHomeBtn = $('m-back-home-btn');
    if (backHomeBtn) backHomeBtn.addEventListener('click', function () {
      if (mTermTimer) clearTimeout(mTermTimer);
      stopTimer();
      var titleEl = $('m-title');
      if (titleEl) titleEl.textContent = 'Pipeline OS';
      showScreen('HOME');
    });

    // Stop pipeline button
    var stopBtn = $('m-stop-btn');
    if (stopBtn) stopBtn.addEventListener('click', function () {
      if (mTermTimer) clearTimeout(mTermTimer);
      stopTimer();
      // Mark remaining running agents as idle
      mAgentCards.forEach(function (card, i) {
        if (card.status === 'running') setCardStatus(i, 'idle');
      });
      var terminal = $('m-terminal');
      if (terminal) {
        var cursor = terminal.querySelector('.m-term-cursor');
        if (cursor) cursor.remove();
        var stopMsg = document.createElement('div');
        stopMsg.className = 'm-term-msg type-warn show';
        stopMsg.textContent = 'Pipeline detenido por el usuario.';
        terminal.appendChild(stopMsg);
      }
    });

    // Edit screen back button
    var editBack = $('m-edit-back');
    if (editBack) editBack.addEventListener('click', function () {
      showScreen('PIPELINE');
    });

    // Edit screen save button
    var editSave = $('m-edit-save');
    if (editSave) editSave.addEventListener('click', saveEditAgent);

    // Edit tabs
    var editTabs = document.querySelectorAll('.m-edit-tab');
    editTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        switchEditTab(tab.dataset.tab);
        // Update output display when switching to out tab
        if (tab.dataset.tab === 'out' && mCurrentAgentIdx !== null) {
          var outDisplay = $('m-edit-output-display');
          var card = mAgentCards[mCurrentAgentIdx];
          if (outDisplay && card && card.outputText) {
            outDisplay.textContent = card.outputText;
          }
        }
      });
    });
  }

  // ────────────────────────────────────────────────────────────
  //  INIT
  // ────────────────────────────────────────────────────────────
  function initMobile() {
    // No isMobile() guard — CSS media query controls visibility.
    // Always run so events work regardless of resize.
    renderSuggestions();

    // Hide tour button if user has seen it before
    var seen = false;
    try { seen = !!localStorage.getItem(SEEN_KEY); } catch (e) {}
    if (seen) {
      var tourBtn = $('m-tour-btn');
      if (tourBtn) tourBtn.style.display = 'none';
    }

    bindEvents();
  }

  // ────────────────────────────────────────────────────────────
  //  BOOT
  // ────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobile);
  } else {
    initMobile();
  }

}());
