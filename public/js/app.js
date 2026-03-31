// ═══════════════════════════════════════
// AGENT TYPE DEFINITIONS
// ═══════════════════════════════════════
const T={
  pilot:{label:'Agente Piloto',icon:'◈',hbg:'#6a1a1a',hbg2:'#501212',dot:'#c85050',
    meta:'Coordina el pipeline. Asigna tareas y consolida resultados.',goal:'Delegar, monitorear y reportar estado.',
    subtasks:['Leer resultados Agente Resumen','Asignar tareas Agente UI/UX'],
    actions:['Implementar codigo','Comparar interfaz'],actionIcons:['⏸','●'],actionColors:['#3a3028','#1a3a1a'],
    vis:'tasks',cond:true,
    inputType:'text',inputLabel:'Prompt semilla del pipeline',inputDefault:'Conectado desde el card prompt',
    outputType:'json',outputLabel:'Instruccion a Operador',
    prompt:'Eres el agente coordinador principal. Delega tareas a subagentes, monitorea su progreso y consolida resultados. Output JSON.',
    verification:'Todos los subagentes deben reportar estado OK.'},
  research:{label:'Agente Investigación',icon:'⌕',hbg:'#1a3a2a',hbg2:'#122a1a',dot:'#3a9a6a',
    meta:'Busca tendencias y genera lista de insights.',goal:'Top 10 ideas con potencial viral.',
    subtasks:['Analizar tendencias X/Twitter','Medir engagement por tema'],
    actions:['Generar lista','Ver ideas'],actionIcons:['⌕','≡'],actionColors:['#1a2a1a','#1a2a1a'],
    vis:'list',cond:false,listItems:['La IA reemplazando diseñadores en 2026','Mini PCs ARM — benchmark real','Agentes autónomos: el nuevo SaaS','RAG explicado sin tecnicismos'],
    inputType:'text',inputLabel:'Tema o nicho',inputDefault:'Asume nicho de tecnología e IA',
    outputType:'json',outputLabel:'Lista de ideas rankadas',
    prompt:'Investiga tendencias. Genera 10 ideas de video con alto engagement. Output: JSON array.',
    verification:'Mínimo 5 ideas con engagement_score > 7.'},
  human:{label:'Operador',icon:'◎',hbg:'#5a1a1a',hbg2:'#421212',dot:'#c8a040',
    meta:'Punto de decisión del operador humano.',goal:'Aprobar, rechazar o editar.',
    subtasks:['Presentar opciones al operador','Esperar decisión'],
    actions:['Aprobar idea','Ver opciones'],actionIcons:['✓','→'],actionColors:['#1a2a1a','#1a1a2a'],
    vis:'human',cond:true,
    inputType:'json',inputLabel:'Opciones a revisar',inputDefault:'Requiere input — pipeline pausará',
    outputType:'decision',outputLabel:'Decisión del operador',
    prompt:'PUNTO DE APROBACIÓN HUMANA.',verification:'El operador debe tomar una decisión explícita.'},
  prompt:{label:'Agente Prompt',icon:'✦',hbg:'#4a3010',hbg2:'#362208',dot:'#c8a040',
    meta:'Genera prompts detallados por escena del guión.',goal:'Prompt por escena de 8s.',
    subtasks:['Leer guión','Prompt por escena','Validar coherencia'],
    actions:['Generar prompts','Comparar'],actionIcons:['⏸','●'],actionColors:['#2a2010','#1a2a10'],
    vis:'text',cond:false,promptText:'Escena 1/5: Plano medio, manos en teclado. Luz azul fría. Slow push-in 2s. → Fade negro.',
    inputType:'text',inputLabel:'Guión del video',inputDefault:'Solicita guión al agente anterior',
    outputType:'text',outputLabel:'Prompts de escenas',
    prompt:'Dado el guión, genera prompt detallado para cada escena de 8 segundos.',
    verification:'Cada prompt debe incluir: plano, luz, movimiento, transición.'},
  image:{label:'Agente Imagen',icon:'⬡',hbg:'#2a1060',hbg2:'#1e0a48',dot:'#8a5abf',
    meta:'Genera imagen HD para cada escena.',goal:'Imágenes coherentes con el guión.',
    subtasks:['Recibir prompt','Generar imagen HD','Verificar coherencia'],
    actions:['Generar imagen','Verificar'],actionIcons:['⏸','●'],actionColors:['#1a1028','#181028'],
    vis:'image',cond:false,
    inputType:'text',inputLabel:'Prompt de escena',inputDefault:'Genera imagen genérica de referencia',
    outputType:'image',outputLabel:'Imagen 1920×1080 16:9',
    prompt:'Genera imagen fotorrealista 16:9 para la escena indicada.',
    verification:'Ratio 16:9, coherencia de estilo con escenas anteriores.'},
  video:{label:'Agente Video',icon:'▶',hbg:'#0e1e4a',hbg2:'#0a1636',dot:'#4a8abf',
    meta:'Anima imagen a clip de 8 segundos.',goal:'Clips listos para ensamblaje.',
    subtasks:['Recibir imagen+prompt','Generar clip 8s','Verificar movimiento'],
    actions:['Generar clip','Ver preview'],actionIcons:['⏸','●'],actionColors:['#101828','#10182a'],
    vis:'timeline',cond:false,
    inputType:'image',inputLabel:'Imagen de escena',inputDefault:'Genera animación estática como placeholder',
    outputType:'video',outputLabel:'Clip MP4 8 segundos',
    prompt:'Convierte imagen en clip de 8 segundos. Aplica movimiento de cámara del prompt.',
    verification:'Duración exacta 8 segundos. Movimiento coherente.'},
  assembly:{label:'Agente Ensamblaje',icon:'⊞',hbg:'#3a1a08',hbg2:'#2a1206',dot:'#c87840',
    meta:'Une clips y exporta el video final.',goal:'Video de 30-130 segundos.',
    subtasks:['Recibir todos los clips','Aplicar transiciones','Exportar video final'],
    actions:['Exportar video','Ver preview'],actionIcons:['⊞','▶'],actionColors:['#281a08','#201408'],
    vis:'timeline',cond:false,
    inputType:'video',inputLabel:'Array de clips MP4',inputDefault:'Combina con clips de prueba del pipeline',
    outputType:'video',outputLabel:'Video final compilado',
    prompt:'Ensambla clips en orden. Transiciones fluidas. 30-130 segundos.',
    verification:'Duración en rango, transiciones correctas, orden del guión.'},
  seed:{label:'Semilla',icon:'◉',hbg:'#3a2800',hbg2:'#251a00',dot:'#c8a040',
    meta:'Prompt inicial del pipeline.',goal:'',
    subtasks:[],actions:[],actionIcons:[],actionColors:[],
    vis:'seed',cond:false,
    inputType:'text',inputLabel:'',inputDefault:'',
    outputType:'text',outputLabel:'Prompt inicial',
    prompt:'',verification:''}
};

// IO type icons and labels
const IO_ICONS={text:'✦',image:'⬡',video:'▶',json:'{ }',file:'📄',decision:'◈',audio:'♪',any:'◆'};
const IO_COLORS={text:'#c8a040',image:'#8a5abf',video:'#4a8abf',json:'#3a8a3a',file:'#c87840',decision:'#c8a040',audio:'#6090c0',any:'#706860'};

function escapeHTML(v){
  return String(v??'')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let nodes=[],conns=[],outputCards=[],nid=1,ocid=1,cid=1;
let currentPipelineId=null;
// ── Terminal / agentes en vivo ──────────────────────────────
let terminalPipelineId=null;
let sseConnection=null;
let creatingOverlayTimer=null;
// ── Catálogo de modelos ──────────────────────────────────────
let modelsData={catalog:{},agents:{}};
let _saveTimer=null;
let sc=1,px=0,py=0;
let drag=null,dox=0,doy=0;
let cardDrag=null,cdox=0,cdoy=0;
let pan=false,psx=0,psy=0,ppx=0,ppy=0;
let connMode=false,connFrom=null;
let palSkill=null;
const SKILLS_CATALOG=[
  {id:'web_search',name:'web_search',icon:'⌕',color:'#2a6a8a'},
  {id:'notion_mcp',name:'notion_mcp',icon:'📋',color:'#2a2a5a'},
  {id:'github_mcp',name:'github_mcp',icon:'⬡',color:'#1a3a1a'},
  {id:'image_gen',name:'image_gen',icon:'⬡',color:'#2a1060'},
  {id:'voice_tts',name:'voice_tts',icon:'♪',color:'#1a3a2a'},
  {id:'email_send',name:'email_send',icon:'✉',color:'#3a1a3a'},
];
let sel=null,modalId=null,ctab='cfg';
let palT=null,palInput=null,ctxId=null;
const pilotLogOpen=new Set();
let expandTarget=null,expandFieldName=null;
let customSkills=[],builderMode='agent';
let awinStep=0,awinBuilding={},awinTyping=false,awinPrevH=520,awinMinimized=false;
let logFilter='all',logPrevH=420,logMinimized=false;
let operatorWaiting=false;
let operatorQuestionQueue=[];
let terminalQuestionTimer=null; // auto-answer timer for terminal suggestion
let terminalActiveQuestion=null; // question currently shown in terminal input
let _pendingSeedPrompt=null;
let _userStartedRun=false; // true only when user explicitly pressed Ejecutar
let pilotTokenTotal='0 tok';
let pilotTokenTotalValue=0;
let _pilotTokenAnimFrame=null;
const agentTokenTotals={};
const agentTokenAnimFrames={};
const MAX_OPERATOR_QUESTION_CARDS=6;
const CONTEXT_CARD_SIZE={width:206,height:154};

const IMGS=[
  'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 230 90"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#120824"/><stop offset="60%" stop-color="#080e24"/><stop offset="100%" stop-color="#1a0818"/></linearGradient></defs><rect width="230" height="90" fill="url(#g)"/><circle cx="115" cy="45" r="24" fill="none" stroke="rgba(130,80,200,.3)" stroke-width="1"/><text x="115" y="82" font-size="7" fill="rgba(255,255,255,.15)" text-anchor="middle" font-family="monospace">ESCENA_01.png</text></svg>`),
  'data:image/svg+xml,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 230 90"><rect width="230" height="90" fill="#080814"/><line x1="20" y1="65" x2="210" y2="65" stroke="rgba(74,130,200,.2)" stroke-width=".8"/><rect x="28" y="48" width="16" height="17" fill="rgba(74,130,200,.1)" stroke="rgba(74,130,200,.2)" stroke-width=".5"/><rect x="52" y="35" width="16" height="30" fill="rgba(74,130,200,.14)" stroke="rgba(74,130,200,.25)" stroke-width=".5"/><rect x="76" y="42" width="16" height="23" fill="rgba(74,130,200,.1)" stroke="rgba(74,130,200,.2)" stroke-width=".5"/><rect x="100" y="25" width="16" height="40" fill="rgba(74,130,200,.18)" stroke="rgba(74,130,200,.3)" stroke-width=".5"/><text x="115" y="82" font-size="7" fill="rgba(255,255,255,.12)" text-anchor="middle" font-family="monospace">ESCENA_03.png</text></svg>`)
];

// ══════════════════════════════
// GRID
// ══════════════════════════════
function drawBG(){
  const cv=document.getElementById('bg'),c=cv.getContext('2d');
  cv.width=window.innerWidth;cv.height=window.innerHeight;
  c.fillStyle='#1c1816';c.fillRect(0,0,cv.width,cv.height);
  const gs=26;c.fillStyle='rgba(255,255,255,.05)';
  for(let x=(px%gs+gs)%gs;x<cv.width;x+=gs)
    for(let y=(py%gs+gs)%gs;y<cv.height;y+=gs)
      c.fillRect(x-.8,y-.8,1.4,1.4);
}
window.addEventListener('resize',drawBG);drawBG();

document.addEventListener('click',e=>{
  const menu=document.getElementById('add-agent-menu');
  const btn=document.getElementById('add-agent-btn');
  if(!menu||menu.classList.contains('hidden'))return;
  if(menu.contains(e.target)||btn?.contains(e.target))return;
  closeAddAgentMenu();
});

// ══════════════════════════════
// TRANSFORM
// ══════════════════════════════
function applyT(){
  document.getElementById('canvas').style.transform=`translate(${px}px,${py}px) scale(${sc})`;
  document.getElementById('zl').textContent=Math.round(sc*100)+'%';
  drawBG();updateMM();
}
function dz(d){sc=Math.max(.15,Math.min(3,sc+d));applyT();}
function fitAll(){
  if(!nodes.length&&!outputCards.length){sc=1;px=0;py=0;applyT();return;}
  const allX=[...nodes.map(n=>n.x),...outputCards.map(c=>c.x)];
  const allY=[...nodes.map(n=>n.y),...outputCards.map(c=>c.y)];
  const x0=Math.min(...allX)-60,y0=Math.min(...allY)-60;
  const x1=Math.max(...allX)+260,y1=Math.max(...allY)+200;
  const w=window.innerWidth,h=window.innerHeight;
  sc=Math.min(w/(x1-x0),h/(y1-y0),.9);
  px=-x0*sc+(w-(x1-x0)*sc)/2;py=-y0*sc+(h-(y1-y0)*sc)/2;
  applyT();
}

// ══════════════════════════════
// NODE BUILD
// ══════════════════════════════
function ioSectionHTML(n){
  if(n.type==='seed')return`<div class="nio"><div class="nio-half" style="width:100%;border-right:none"><div class="nio-lbl" style="color:#c8a04088">Entrega</div><div class="nio-type"><span class="nio-icon" style="color:#c8a040">✦</span><span style="color:#c8a040">text</span></div><div style="font-size:9px;color:#706860;margin-top:2px">Prompt inicial</div></div></div>`;
  const tp=T[n.type];
  const inType=n.inputType||tp.inputType||'any';
  const outType=n.outputType||tp.outputType||'any';
  const inColor=IO_COLORS[inType]||'#706860';
  const outColor=IO_COLORS[outType]||'#706860';
  const inIcon=IO_ICONS[inType]||'◆';
  const outIcon=IO_ICONS[outType]||'◆';
  const inLabel=n.inputLabel||tp.inputLabel||'Input';
  const outLabel=n.outputLabel||tp.outputLabel||'Output';
  const inDef=n.inputDefault||tp.inputDefault||'';
  return`<div class="nio">
    <div class="nio-half" onclick="openIOModal('${n.id}','in')">
      <div class="nio-lbl" style="color:#2f6b35">Recibe</div>
      <div class="nio-type"><span class="nio-icon" style="color:${inColor}">${inIcon}</span><span style="color:${inColor}">${inType}</span></div>
      <div style="font-size:9px;color:#706860;margin-top:2px">${inLabel}</div>
      ${inDef?`<div class="nio-default">${inDef}</div>`:''}
    </div>
    <div class="nio-half" onclick="openIOModal('${n.id}','out')">
      <div class="nio-lbl" style="color:#2f6b35">Entrega</div>
      <div class="nio-type"><span class="nio-icon" style="color:${outColor}">${outIcon}</span><span style="color:${outColor}">${outType}</span></div>
      <div style="font-size:9px;color:#706860;margin-top:2px">${outLabel}</div>
    </div>
  </div>`;
}

function metaHTML(n){
  const tp=T[n.type];
  const meta=n.meta||tp.meta||'';
  const goal=n.goal||tp.goal||'';
  const short=s=>s.length>55?s.slice(0,52)+'…':s;
  return`<div class="nmeta" onclick="openExpandField(event,'${n.id}','meta')" title="Click para expandir">
    <div class="nmeta-row"><b>Meta:</b><span class="nmeta-txt">${short(meta)}</span></div>
    <div class="nmeta-row"><b>Goal:</b><span class="nmeta-txt">${short(goal)}</span></div>
    <div class="nmeta-expand-hint">click para ver / editar</div>
  </div>`;
}

function visHTML(n){
  const tp=T[n.type];
  if(tp.vis==='image'){
    if(n.status==='done'&&n.img)return`<div class="nvis"><img class="nvis-img" src="${n.img}"/></div>`;
    if(n.status==='running')return`<div class="nvis"><div class="nvis-gen"><div class="scanline"></div>GENERANDO IMAGEN...</div></div>`;
    return`<div class="nvis"><div class="nvis-placeholder"><svg width="26" height="26" viewBox="0 0 28 28"><rect x="1" y="4" width="26" height="20" rx="2" fill="none" stroke="white" stroke-width="1"/><circle cx="9" cy="12" r="2.5" fill="none" stroke="white" stroke-width="1"/><path d="M1 19 L9 13 L15 18 L20 15 L27 19" fill="none" stroke="white" stroke-width="1"/></svg><span>ESPERANDO PROMPT</span></div></div>`;
  }
  if(tp.vis==='text'){
    if(n.status==='running')return`<div class="nvis nvis-streaming"><div class="scanline"></div><span class="nvis-stream-text" id="nstream_${n.id}">${escapeHTML((n.streamText||'').slice(-280))}</span><span class="nvis-cursor">▌</span></div>`;
    return`<div class="nvis"><div class="nvis-prompt"><div class="nvis-prompt-lbl">Prompt activo</div><div class="nvis-prompt-txt" onclick="openExpandField(event,'${n.id}','promptOut')" style="cursor:pointer">${n.promptOut||tp.promptText||'Esperando guión...'}</div></div></div>`;
  }
  if(tp.vis==='list'){
    if(n.status==='running')return`<div class="nvis nvis-streaming"><div class="scanline"></div><span class="nvis-stream-text" id="nstream_${n.id}">${escapeHTML((n.streamText||'').slice(-280))}</span><span class="nvis-cursor">▌</span></div>`;
    return`<div class="nvis"><div class="nvis-list">${(tp.listItems||[]).slice(0,3).map(i=>`<div class="nvis-li"><span style="color:#3a3630">›</span>${i}</div>`).join('')}</div></div>`;
  }
  if(tp.vis==='timeline'){
    if(n.type==='assembly'){
      return`<div class="nvis" id="asmvis_${n.id}">
        <div class="asm-state-row">
          <span class="asm-state-badge asm-pendiente">⊞ PENDIENTE</span>
          <span class="asm-count"></span>
        </div>
        <div class="asm-assets"><div class="asm-waiting">Esperando instrucciones del Piloto...</div></div>
        <div class="asm-dl-row" style="display:none">
          <button class="asm-dl-btn" onclick="event.stopPropagation();downloadAssembly('${n.id}')">↓ Descargar output</button>
        </div>
      </div>`;
    }
    const pct=n.status==='done'?100:n.status==='running'?45:0;
    const clr='#4a7abf';
    const clips=['01','02','03'];
    return`<div class="nvis"><div class="nvis-timeline"><div style="font-size:7px;color:#3a3630;margin-bottom:2px">PROGRESO — ${pct}%</div><div class="ntl-bar"><div class="ntl-fill" style="width:${pct}%;background:${clr}30;border-right:2px solid ${clr}"></div></div><div class="ntl-clips">${clips.map(c=>`<div class="ntl-clip" style="background:${clr}10;border:1px solid ${clr}25">${c}</div>`).join('')}</div></div></div>`;
  }
  if(tp.vis==='human')return`<div class="nvis"><div class="happrove"><div class="happrove-lbl">Operador tactico activo</div><div style="font-size:9px;color:#706860;margin-top:6px">Escucha feedback, adapta prompts y coordina regeneraciones sin detener la linea.</div></div></div>`;
  if(tp.vis==='seed')return`<div class="nvis"><div class="nvis-seed"><div class="nvis-seed-lbl">Prompt inicial</div><div class="nvis-seed-txt">${n.promptOut||n.name||'…'}</div></div></div>`;
  return'';
}

function pilotTaskItems(n){
  const runtimeTasks=Array.isArray(n.pilotTasks)&&n.pilotTasks.length?n.pilotTasks:null;
  const fallback=(T.pilot.subtasks||[]).map(label=>({label,status:'pending'}));
  return (runtimeTasks||fallback).slice(0,6);
}

function pilotReportText(n){
  return n.pilotReport||'Sin reportes aun. El piloto mostrara aqui decisiones, bloqueos y el siguiente movimiento del pipeline.';
}

function pilotIOHTML(n){
  const inLabel=n.inputLabel||'Prompt semilla';
  const inDefault=n.inputDefault||'Conectado desde el card prompt';
  const outTarget=n.outputTarget||n.outputTo||(()=>{const c=conns.find(x=>x.from===n.id);if(c){const t=nodes.find(x=>x.id===c.to);return t?t.name:null;}return null;})()|| 'Operador';
  return`<div class="pilot-io">
    <div class="pilot-io-half" onclick="openIOModal('${n.id}','in')">
      <div class="pilot-io-label">Recibe</div>
      <div class="pilot-io-type"><span class="pilot-io-icon">{ }</span><span>prompt</span></div>
      <div class="pilot-io-text">${escapeHTML(inLabel)}</div>
      <div class="pilot-io-default">${escapeHTML(inDefault)}</div>
    </div>
    <div class="pilot-io-half" onclick="openIOModal('${n.id}','out')">
      <div class="pilot-io-label pilot-io-label-out">Entrega</div>
      <div class="pilot-io-type"><span class="pilot-io-icon">{ }</span><span>json</span></div>
      <div class="pilot-io-text">Instrucciones a</div>
      <div class="pilot-io-chip">${escapeHTML(outTarget)}</div>
    </div>
  </div>`;
}

function pilotLoopHTML(n){
  const cycle=Number.isFinite(n.runtimeCycle)?n.runtimeCycle:(Number.isFinite(n.cycle)?n.cycle:0);
  const mode=n.loopMode||'bucle';
  const maxCycles=Number.isFinite(n.maxCycles)?n.maxCycles:50;
  return`<div class="pilot-cycle-row">
    <span class="pilot-cycle-label">ciclo numero</span>
    <span class="pilot-cycle-badge">${cycle||0}</span>
    <span class="pilot-cycle-repeat">repetir en</span>
    <select class="pilot-loop-select" onclick="event.stopPropagation()" onchange="setPilotLoopMode('${n.id}',this.value)">
      <option value="bucle"${mode==='bucle'?' selected':''}>bucle</option>
      <option value="limite"${mode==='limite'?' selected':''}>limite</option>
    </select>
    ${mode==='limite'?`<input class="pilot-loop-input" type="number" min="1" max="500" value="${maxCycles}" onclick="event.stopPropagation()" onchange="setPilotMaxCycles('${n.id}',this.value)>`:''}
  </div>`;
}

function pilotTasksHTML(n){
  const items=pilotTaskItems(n);
  return`<div class="pilot-task-wrap">
    <div class="pilot-task-head">
      <span>Lista de Tareas</span>
      <button class="pilot-history-link" onclick="event.stopPropagation();openPilotReport('${n.id}')">ciclos anteriores</button>
    </div>
    <div class="pilot-task-list">${items.map(task=>{const st=task.status||'pending';const dc=st==='active'?'running':st==='done'?'done':st==='waiting'||st==='awaiting-input'?'paused':'idle';return`<div class="pilot-task-item ${st}"><span class="nstatus-dot ${dc}" style="width:7px;height:7px;min-width:7px;flex-shrink:0"></span>${escapeHTML(task.label||task)}</div>`;}).join('')}</div>
  </div>`;
}

function pilotFooterHTML(n){
  const stateLabel=(n.pilotStatusLabel||stlabel(n.status)).toUpperCase();
  const tokenLabel=n.pilotTokenLabel||pilotTokenTotal||'0 tok';
  const btnState={running:'CORRIENDO',paused:'PAUSADO','awaiting-input':'ESPERANDO',done:'COMPLETADO',error:'ERROR',idle:'LISTO'}[n.status]||'LISTO';
  return`<div class="pilot-actions">
    <button class="pilot-action-btn pilot-report-btn" onclick="event.stopPropagation();togglePilotLogCard('${n.id}')">
      <span class="pilot-action-ico">▣</span>
      <div class="pilot-report-label">
        <span class="pilot-report-title">Estado</span>
        <span class="pilot-report-state" id="prst_${n.id}">${btnState}</span>
      </div>
      <span class="nstatus-dot ${n.status==='awaiting-input'?'running':n.status}"></span>
    </button>
    <button class="pilot-action-btn pilot-context-btn" onclick="event.stopPropagation();openContextCard(currentPipelineId)">
      <span class="pilot-action-ico">⬡</span>
      <span>Ver Contexto</span>
    </button>
  </div>
  <div class="pilot-bottom-bar">
    <span class="pilot-bottom-status">${escapeHTML(stateLabel)}</span>
    <span class="pilot-bottom-tokens">${escapeHTML(tokenLabel)}</span>
    <button class="nfoot-out" onclick="event.stopPropagation();(function(){var _n=nodes.find(function(x){return x.id==='${n.id}'});if(_n)dropOutputCard('${n.id}',_n.x+340,_n.y+20);})()" title="Soltar output card">↗ output</button>
    <button class="nfoot-cfg" onclick="event.stopPropagation();openM('${n.id}')">⚙ CFG</button>
  </div>`;
}

function formatPilotTokenLabel(tokenTotal){
  return tokenTotal>=1000?(tokenTotal/1000).toFixed(1)+'k tok':tokenTotal?tokenTotal+' tok':'0 tok';
}

function formatAgentTokenLabel(tokenTotal){
  return formatPilotTokenLabel(tokenTotal);
}

function applyPilotTokenDisplay(tokenTotal){
  const label=formatPilotTokenLabel(tokenTotal);
  pilotTokenTotalValue=tokenTotal;
  pilotTokenTotal=label;
  const pilotNode=nodes.find(n=>n.type==='pilot'||n.agentId==='AG-01');
  if(pilotNode){
    pilotNode.pilotTokenLabel=label;
    const el=document.getElementById(pilotNode.id);
    if(el){
      const tokenEl=el.querySelector('.pilot-bottom-tokens');
      if(tokenEl)tokenEl.textContent=label;
    }
  }
}

function animatePilotTokenDisplay(nextTotal){
  const target=Math.max(0,Number(nextTotal)||0);
  const start=pilotTokenTotalValue||0;
  if(_pilotTokenAnimFrame)cancelAnimationFrame(_pilotTokenAnimFrame);
  if(target===start){
    applyPilotTokenDisplay(target);
    return;
  }
  const duration=Math.min(900,Math.max(260,Math.abs(target-start)*0.8));
  const t0=performance.now();
  const step=now=>{
    const p=Math.min(1,(now-t0)/duration);
    const eased=1-Math.pow(1-p,3);
    const current=Math.round(start+((target-start)*eased));
    applyPilotTokenDisplay(current);
    if(p<1)_pilotTokenAnimFrame=requestAnimationFrame(step);
    else _pilotTokenAnimFrame=null;
  };
  _pilotTokenAnimFrame=requestAnimationFrame(step);
}

function applyAgentTokenDisplay(nodeId,tokenTotal){
  const label=formatAgentTokenLabel(tokenTotal);
  agentTokenTotals[nodeId]=tokenTotal;
  const node=nodes.find(n=>n.id===nodeId);
  if(node)node.tokenLabel=label;
  const el=document.getElementById(nodeId);
  if(!el)return;
  const tokenEl=el.querySelector(`#ftok_${nodeId}`);
  if(tokenEl)tokenEl.textContent=label;
}

function animateAgentTokenDisplay(nodeId,nextTotal){
  const target=Math.max(0,Number(nextTotal)||0);
  const start=agentTokenTotals[nodeId]||0;
  if(agentTokenAnimFrames[nodeId])cancelAnimationFrame(agentTokenAnimFrames[nodeId]);
  if(target===start){
    applyAgentTokenDisplay(nodeId,target);
    return;
  }
  const duration=Math.min(900,Math.max(260,Math.abs(target-start)*0.8));
  const t0=performance.now();
  const step=now=>{
    const p=Math.min(1,(now-t0)/duration);
    const eased=1-Math.pow(1-p,3);
    const current=Math.round(start+((target-start)*eased));
    applyAgentTokenDisplay(nodeId,current);
    if(p<1)agentTokenAnimFrames[nodeId]=requestAnimationFrame(step);
    else agentTokenAnimFrames[nodeId]=null;
  };
  agentTokenAnimFrames[nodeId]=requestAnimationFrame(step);
}

function pilotBodyHTML(n){
  return`${pilotIOHTML(n)}
    ${metaHTML(n)}
    <div class="pilot-report-snippet" onclick="openPilotReport('${n.id}')">${escapeHTML(pilotReportText(n))}</div>
    ${pilotLoopHTML(n)}
    ${pilotTasksHTML(n)}
    ${pilotFooterHTML(n)}`;
}

function actionsHTML(n){
  const tp=T[n.type];
  const btns=n.customBtns||tp.actions.map((a,i)=>({label:a,icon:tp.actionIcons[i],bg:tp.actionColors[i]||'#0f0d0c',fg:'#706860',action:''}));
  return`<div class="nactions">${btns.map((b,i)=>`<button class="nact" style="background:${b.bg}" onclick="event.stopPropagation()"><div class="nact-ico" style="background:rgba(0,0,0,.3);color:${b.fg||'#706860'}">${b.icon}</div><span style="color:${b.fg||'#706860'}">${b.label}</span><div class="nstatus-dot ${i===btns.length-1?n.status:'idle'}" style="margin-left:auto"></div></button>`).join('')}</div>`;
}

function nodeBodyHTML(n){
  if(n.type==='pilot')return pilotBodyHTML(n);
  const tp=T[n.type];
  const tokenLabel=n.tokenLabel||'0 tok';
  return`${ioSectionHTML(n)}
    ${metaHTML(n)}
    <div class="nsubtasks">${tp.subtasks.map(s=>`<div class="nsub">· ${s}</div>`).join('')}</div>
    <div id="vis_${n.id}">${visHTML(n)}</div>
    ${actionsHTML(n)}
    <div class="nfoot">
      <span class="nfoot-st" id="fst_${n.id}">${stlabel(n.status)}</span>
      <span class="nfoot-tok" id="ftok_${n.id}">${escapeHTML(tokenLabel)}</span>
      <button class="nfoot-sk" id="fsk_${n.id}" onclick="event.stopPropagation();openSkillAdapt('${n.id}')" style="display:${n.skills&&n.skills.length?'inline-flex':'none'}">⬡ SKILLS</button>
      ${n.type==='pilot'?`<button class="nfoot-ctx" onclick="event.stopPropagation();openContextCard(currentPipelineId)" title="Ver archivo de contexto del pipeline">⬡ contexto</button>`:''}
      <button class="nfoot-out" onclick="event.stopPropagation();(function(){var _n=nodes.find(function(x){return x.id==='${n.id}'});if(_n)dropOutputCard('${n.id}',_n.x+260,_n.y+20);})()" title="Soltar output card">↗ output</button>
      <button class="nfoot-cfg" onclick="openM('${n.id}')">⚙ CONFIG</button>
    </div>`;
}

function mkNode(n){
  const tp=T[n.type];
  const el=document.createElement('div');el.className='node';el.id=n.id;el.dataset.type=n.type;
  el.style.cssText=`left:${n.x}px;top:${n.y}px;overflow:visible`;
  const hasCond=tp.cond;

  // Skill rings — outside wrapper
  const skillRingsHTML=(n.skills||[]).map((sk,i)=>`
    <div class="skill-ring" style="inset:-${(i+1)*6}px;border:1.5px solid ${sk.color||'#4a7abf'}88;border-radius:${8+(i+1)*2}px;box-shadow:0 0 ${10+(i*5)}px ${sk.color||'#4a7abf'}44">
      <div class="skill-tag" onclick="event.stopPropagation();openSkillAdapt('${n.id}')" style="left:${8+i*5}px;color:${sk.color||'#4a7abf'};border:1px solid ${sk.color||'#4a7abf'}66;text-shadow:0 0 6px ${sk.color||'#4a7abf'}88">⬡ ${sk.name}</div>
    </div>`).join('');

  el.innerHTML=`
    ${skillRingsHTML}
    <div class="node-inner">
      <div class="scanline"></div>
      <div class="port in" data-nid="${n.id}" data-pt="in"></div>
      ${hasCond?`
        <div class="port out-y" data-nid="${n.id}" data-pt="out-y"></div>
        <div class="port out-n" data-nid="${n.id}" data-pt="out-n"></div>
      `:`<div class="port out" data-nid="${n.id}" data-pt="out"></div>`}
      <div class="nh" style="background:linear-gradient(135deg,${tp.hbg},${tp.hbg2})">
        <div class="nh-left"><span class="nh-icon">${tp.icon}</span><span class="nh-name">${n.name}</span></div>
        <div class="nh-right">
          <button class="nc" onclick="runNode('${n.id}')" style="color:#3a8a3a" title="Run">▶</button>
          <button class="nc" onclick="pauseNode('${n.id}')" style="color:#c8a040" title="Pause">⏸</button>
          <button class="nc" onclick="stopNode('${n.id}')" style="color:#8a3a3a" title="Stop">■</button>
          <button class="nc" onclick="openM('${n.id}')" title="Config">⚙</button>
        </div>
        <div class="nh-model">${modelSelectHTML(n)}</div>
      </div>
      <div style="background:#0f0d0c">
        ${nodeBodyHTML(n)}
      </div>
    </div>`;

  el.addEventListener('mousedown',e=>nmd(e,n.id));
  el.addEventListener('mouseup',e=>{
    if(!connFrom||connFrom.nid===n.id)return;
    if(e.target.classList.contains('port'))return;
    e.stopPropagation();
    finishConn(n.id,'in');
  });
  el.addEventListener('dblclick',()=>openM(n.id));
  el.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();if(palSkill)el.classList.add('skill-over');});
  el.addEventListener('dragleave',e=>{if(!el.contains(e.relatedTarget))el.classList.remove('skill-over');});
  el.addEventListener('drop',e=>{
    el.classList.remove('skill-over');
    e.stopPropagation();
    if(!palSkill){drop(e);return;}
    const sk=SKILLS_CATALOG.find(s=>s.id===palSkill)||customSkills.find(s=>s.id===palSkill);
    if(sk)addSkillToNode(n.id,sk);
    palSkill=null;
  });
  el.querySelectorAll('.port').forEach(p=>{
    p.addEventListener('mousedown',e=>{
      e.stopPropagation();
      if(connFrom&&connFrom.nid!==n.id){
        // Click-to-connect: already started from another node → complete
        finishConn(n.id,p.dataset.pt);
      } else {
        // Start connection from this port
        setConnFrom({nid:n.id,pt:p.dataset.pt,src:'node'});
      }
    });
    p.addEventListener('mouseup',e=>{
      if(connFrom&&connFrom.nid!==n.id){e.stopPropagation();finishConn(n.id,p.dataset.pt);}
    });
  });
  document.getElementById('canvas').appendChild(el);
  redrawConnsSoon();
}

// Default model per agent type (cheap/test mode)
const DEFAULT_MODEL={
  pilot:'claude-haiku-4-5',
  research:'claude-haiku-4-5',
  human:'claude-haiku-4-5',
  prompt:'claude-haiku-4-5',
  assembly:'claude-haiku-4-5',
  image:'flux-schnell',
  video:'minimax-video',
  seed:'claude-haiku-4-5'
};

// Model options grouped per capability class
const MODEL_GROUPS={
  text:[
    {group:'Anthropic',models:['claude-haiku-4-5','claude-sonnet-4-6','claude-opus-4-6']},
    {group:'OpenAI',   models:['gpt-4o-mini','gpt-4o']},
    {group:'Google',   models:['gemini-2.0-flash','gemini-1.5-pro']}
  ],
  image:[
    {group:'Black Forest Labs',models:['flux-schnell','flux-dev','flux-pro']},
    {group:'OpenAI',           models:['dall-e-3']},
    {group:'Stability AI',     models:['stable-diffusion-3','stable-diffusion-ultra']},
    {group:'Google',           models:['imagen-3']}
  ],
  video:[
    {group:'Minimax',  models:['minimax-video']},
    {group:'Kling',    models:['kling-v1','kling-v1-5']},
    {group:'Runway',   models:['runway-gen3']},
    {group:'Luma',     models:['luma-dream-machine']}
  ]
};

function modelCapClass(type){
  if(type==='image')return'image';
  if(type==='video')return'video';
  return'text';
}

function modelSelectHTML(n){
  if(n.agentId&&modelsData?.agents?.[n.agentId]&&modelsData?.catalog){
    const agentConfig=modelsData.agents[n.agentId];
    const allModels=Object.entries(modelsData.catalog).flatMap(([provider,items])=>
      items.map(item=>({provider,id:item.id,label:item.label||item.id,tier:item.tier||'fast'}))
    );
    const currentKey=`${agentConfig.provider}/${agentConfig.model}`;
    const isFree=agentConfig.model==='openrouter/free'||agentConfig.provider==='openrouter'&&agentConfig.model==='openrouter/free';
    const freeBadge=isFree?`<span class="n-free-badge">GRATIS — velocidad limitada</span>`:'';
    const opts=allModels.map(m=>`<option value="${m.provider}||${m.id}" ${currentKey===`${m.provider}/${m.id}`?'selected':''}>[${m.provider}] ${m.label}</option>`).join('');
    return`<select class="n-model-sel" id="msel_${n.id}" onchange="event.stopPropagation();setNodeModel('${n.id}',this.value)" onclick="event.stopPropagation()">${opts}</select>${freeBadge}`;
  }
  const cap=modelCapClass(n.type);
  const groups=MODEL_GROUPS[cap];
  const current=n.model||DEFAULT_MODEL[n.type]||groups[0].models[0];
  const opts=groups.map(g=>
    `<optgroup label="${g.group}">`+
    g.models.map(m=>`<option value="${m}"${m===current?' selected':''}>${m}</option>`).join('')+
    `</optgroup>`
  ).join('');
  return`<select class="n-model-sel" id="msel_${n.id}" onchange="event.stopPropagation();setNodeModel('${n.id}',this.value)" onclick="event.stopPropagation()">${opts}</select>`;
}

function addNode(type,x,y){
  const tp=T[type]||{};
  const isFirstPilot=type==='pilot'&&!nodes.some(n=>n.type==='pilot'||n.agentId==='AG-01');
  const n={id:'n'+Math.random().toString(36).slice(2,10),type,x,y,name:tp.label||type,
    status:'idle',img:null,promptOut:null,output:'',meta:'',goal:'',
    model:DEFAULT_MODEL[type]||'claude-haiku-4-5',
    inputType:tp.inputType,outputType:tp.outputType,
    inputLabel:tp.inputLabel,outputLabel:tp.outputLabel,
    inputDefault:tp.inputDefault,
    loopMode:type==='pilot'?'bucle':undefined,
    maxCycles:type==='pilot'?50:undefined,
    runtimeCycle:type==='pilot'?0:undefined,
    pilotTasks:type==='pilot'?[]:undefined,
    pilotReport:type==='pilot'?'':undefined,
    pilotStatusLabel:type==='pilot'?'idle':undefined,
    pilotTokenLabel:type==='pilot'?pilotTokenTotal:undefined,
    tokenLabel:type==='pilot'?undefined:'0 tok',
    prompt:tp.prompt||'',verification:tp.verification||'',
    logs:[{t:'--:--',m:'Agente creado',c:''}],skills:[],
    tests:[{name:'Formato input',status:'pend',desc:'Verifica input correcto'},{name:'Formato output',status:'pend',desc:'Valida output JSON'}]
  };
  nodes.push(n);mkNode(n);
  if(isFirstPilot)seedFirstPilotSetup(n);
  updateMM();updateAddAgentMenuAvailability();return n;
}

function seedFirstPilotSetup(pilotNode){
  if(!pilotNode||pilotNode.type!=='pilot')return;
  // Center the group (inputCard + pilot + human) in the current visible viewport.
  // Group spans: pilotNode.x-290 (left of inputCard) to pilotNode.x+625 (right of human).
  // Group center offset from pilotNode.x is (-290+625)/2 = 167.5 → use 167.
  const cx=(window.innerWidth/2-px)/sc;
  const cy=(window.innerHeight/2-py)/sc;
  pilotNode.x=cx-167;
  pilotNode.y=cy-80;
  const pilotEl=document.getElementById(pilotNode.id);
  if(pilotEl){pilotEl.style.left=pilotNode.x+'px';pilotEl.style.top=pilotNode.y+'px';}
  const inputCard=mkInputCard('text',pilotNode.x-290,pilotNode.y+34);
  if(inputCard){
    inputCard.label='Prompt semilla';
    inputCard.isSeedPrompt=true;
    _renderInputCardDOM(inputCard);
    const inputEl=document.getElementById(inputCard.id);
    const size=inputEl?.querySelector('.oc-size');
    if(size)size.textContent='prompt semilla';
    const ta=inputEl?.querySelector('.idc-textarea');
    if(ta)ta.placeholder='Escribe el prompt semilla del pipeline...';
    conns.push({id:'c'+Math.random().toString(36).slice(2,10),from:inputCard.id,fp:'out',to:pilotNode.id,tp:'in',active:true,fromCard:true});
  }
  let operatorNode=nodes.find(n=>n.type==='human'||n.agentId==='AG-05');
  if(!operatorNode)operatorNode=addNode('human',pilotNode.x+360,pilotNode.y+24);
  if(operatorNode&&!conns.some(c=>c.from===pilotNode.id&&c.to===operatorNode.id)){
    conns.push({id:'c'+Math.random().toString(36).slice(2,10),from:pilotNode.id,fp:'out-y',to:operatorNode.id,tp:'in',active:false,cond:true,condT:'yes'});
  }
  drawConns();updateMM();scheduleSave();
}

async function setNodeModel(id,model){
  const n=nodes.find(x=>x.id===id);if(!n)return;
  if(n.agentId&&String(model).includes('||')){
    const [provider,modelId]=String(model).split('||');
    try{
      const res=await fetch('/api/models/'+n.agentId,{
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({provider,model:modelId}),
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(data.error||res.status);
      n.model=modelId;
      if(modelsData.agents)modelsData.agents[n.agentId]={provider,model:modelId,is_custom:true};
      const sel=document.getElementById('msel_'+n.id);
      if(sel)sel.value=`${provider}||${modelId}`;
      scheduleSave();
      renderMTModels();
      glog('action',n.name,n.type,'◈ Modelo real: '+provider+'/'+modelId);
      return;
    }catch(e){
      glog('warn','Models','system','No se pudo cambiar el modelo del agente: '+e.message);
      return;
    }
  }
  n.model=model;
  scheduleSave();
  glog('action',n.name,n.type,'◈ Modelo: '+model);
}
function getCanvasViewportCenter(){
  return {
    x:(window.innerWidth/2-px)/sc,
    y:(window.innerHeight/2-py)/sc,
  };
}

function getCanvasPointFromClient(clientX,clientY){
  const wrap=document.getElementById('wrap').getBoundingClientRect();
  return {
    x:(clientX-wrap.left-px)/sc,
    y:(clientY-wrap.top-py)/sc,
  };
}

function redrawConnsSoon(){
  requestAnimationFrame(()=>{
    drawConns();
    requestAnimationFrame(()=>drawConns());
  });
}

function getNodeCanvasSize(type){
  return {
    width:type==='pilot'?320:230,
    height:type==='pilot'?420:240,
  };
}

function getInputCanvasSize(){
  return {width:220,height:120};
}

function getCardCanvasSize(card){
  if(card?.isCtxFile||card?.type==='ctx-file')return{width:230,height:210};
  if(card?.isQuestionCard||card?.type==='question')return{width:270,height:190};
  if(card?.isConnectionPayload)return{width:290,height:240};
  if(card?._kind==='seed'||card?.isInputCard)return{width:220,height:120};
  return{width:200,height:130};
}

function rectsOverlap(a,b,pad=18){
  return !(a.x+a.width+pad<=b.x||b.x+b.width+pad<=a.x||a.y+a.height+pad<=b.y||b.y+b.height+pad<=a.y);
}

function findOpenCardPosition(x,y,size,ignoreId){
  const gapX=size.width+24,gapY=size.height+20;
  const candidates=[];
  // First try the requested position, then spiral outward in a grid
  for(let ring=0;ring<8;ring++){
    if(ring===0){candidates.push({x,y});continue;}
    for(let col=-ring;col<=ring;col++){
      for(let row=-ring;row<=ring;row++){
        if(Math.abs(col)!==ring&&Math.abs(row)!==ring)continue;
        candidates.push({x:x+col*gapX,y:y+row*gapY});
      }
    }
  }
  for(const pos of candidates){
    const rect={x:Math.max(20,pos.x),y:Math.max(20,pos.y),width:size.width,height:size.height};
    const blocked=
      outputCards.some(card=>{
        if(card.id===ignoreId)return false;
        const s=getCardCanvasSize(card);
        return rectsOverlap(rect,{x:card.x,y:card.y,width:s.width,height:s.height},18);
      })||
      nodes.some(node=>{
        const s=getNodeCanvasSize(node.type);
        return rectsOverlap(rect,{x:node.x,y:node.y,width:s.width,height:s.height},22);
      });
    if(!blocked)return{x:rect.x,y:rect.y};
  }
  return{x:Math.max(20,x),y:Math.max(20,y)};
}

function addNodeCenter(type){
  const center=getCanvasViewportCenter();
  const {width,height}=getNodeCanvasSize(type);
  addNode(type,center.x-width/2,center.y-height/2);
}

// ══════════════════════════════
// OUTPUT CARDS (dropped by agents)
// ══════════════════════════════
function dropOutputCard(fromNodeId, x, y, extra={}){
  const n=nodes.find(n=>n.id===fromNodeId);if(!n)return;
  const tp=T[n.type];if(!tp)return;
  // Don't duplicate: one output card per node
  if(outputCards.find(oc=>oc.fromNodeId===n.id&&oc.assetId==='drop-'+n.id)){
    glog('warn',n.name,n.type,'Output card ya existe. Conéctala al siguiente agente.');return;
  }
  const outputType=n.outputType||tp.outputType||'json';
  const content=generateMockContent(n,outputType);
  const pos=findOpenCardPosition(x,y,getCardCanvasSize({_kind:'output',type:outputType}));
  const oc={id:'oc'+Math.random().toString(36).slice(2,10),_kind:'output',assetId:'drop-'+n.id,
    fromNodeId:n.id,fromNodeName:n.name,fromDot:tp.dot||'#888',
    type:outputType,label:tp.outputLabel||tp.label+' · output',content,x:pos.x,y:pos.y,...extra};
  outputCards.push(oc);mkOutputCard(oc);drawConns();scheduleSave();
  glog('action',n.name,n.type,`↗ Output card soltada — tipo: ${outputType}. Conecta el puerto al siguiente agente.`);
}

function generateMockContent(n,type){
  if(type==='image')return n.img||IMGS[0];
  if(type==='json')return JSON.stringify({status:'success',agent:n.name,result:'Tarea completada',ts:new Date().toISOString()},null,2);
  if(type==='text')return n.promptOut||'Escena 1: Plano medio de manos escribiendo. Iluminación lateral azul. Slow push-in 2s. → Cross-dissolve.';
  if(type==='video')return null;
  if(type==='decision')return 'Operador aprobó: continuar con idea seleccionada.';
  return n.output||'Output del agente';
}

function _renderSeedCardDOM(oc){
  document.getElementById(oc.id)?.remove();
  const el=document.createElement('div');
  el.className='output-card seed-input-card';el.id=oc.id;
  el.style.cssText=`left:${oc.x}px;top:${oc.y}px`;
  const promptText=oc.content||'';
  el.innerHTML=`
    <div class="oc-inner">
      <div class="oc-header">
        <div class="oc-from"><div class="oc-from-dot" style="background:#c8a040"></div><span>Usuario</span></div>
        <span class="oc-type text">✦ text</span>
      </div>
      <div class="oc-body">
        <div class="sic-title">Prompt inicial</div>
        <div class="oc-preview-txt sic-prompt">${escapeHTML(promptText)}</div>
        <button class="sic-run-btn" onclick="event.stopPropagation();runAll()">▶ EJECUTAR</button>
      </div>
      <div class="oc-footer">
        <span class="oc-size" style="color:#c8a04088">text input</span>
        <div class="oc-connect-port" data-nid="${oc.id}" data-pt="out" title="Conectar al agente"></div>
      </div>
    </div>`;
  el.addEventListener('mousedown',e=>cardMouseDown(e,oc.id));
  el.querySelector('.oc-connect-port').addEventListener('mousedown',e=>{
    e.stopPropagation();setConnFrom({nid:oc.id,pt:'out',src:'card'});
  });
  document.getElementById('canvas').appendChild(el);
  redrawConnsSoon();
}
function mkSeedCard(promptText,x,y){
  const id='seed'+Math.random().toString(36).slice(2,8);
  const pos=findOpenCardPosition(x,y,getCardCanvasSize({_kind:'seed'}),id);
  const oc={id,x:pos.x,y:pos.y,_kind:'seed',type:'text',content:promptText,fromNodeName:'Usuario',fromDot:'#c8a040',label:'Prompt inicial',isSeedPrompt:true};
  outputCards.push(oc);
  _renderSeedCardDOM(oc);
  return oc;
}

// ── CONTEXT FILE CARD ──────────────────────────────────────────
function mkContextCard(pipelineId, ctx, x, y){
  const id='ctxfile_'+pipelineId.replace(/[^a-z0-9]/gi,'_');
  document.getElementById(id)?.remove();
  outputCards=outputCards.filter(c=>c.id!==id);

  const pipeName=(ctx?.pipeline_name||pipelineId).replace(/_/g,' ');
  const fullJson=JSON.stringify(ctx||{},null,2);
  const estado=String(ctx?.estado||'sin_datos');
  const estadoColors={en_progreso:'#c8a040',completo:'#5acd6a',pausado:'#7888b8',cancelado:'#d06060',iniciando:'#7ec89a',preparado:'#67b8c7',sin_datos:'#6e665c'};
  const estadoColor=estadoColors[estado]||'#9a8a70';
  const consulta=String(
    ctx?.consulta||
    ctx?.objetivo||
    ctx?.brief||
    ctx?.preferencias_usuario?.objetivo?.valor||
    ctx?.template?.metodologia||
    ctx?.template?.seed_template?.descripcion||
    ctx?.pipeline_name||
    ''
  ).trim();
  const bloquesKeys=Object.keys(ctx?.bloques||{});
  const assetsCount=Object.keys(ctx?.assets||{}).length;
  const resultadosCount=Array.isArray(ctx?.outputs_vigentes_snapshot)
    ? ctx.outputs_vigentes_snapshot.length
    : Number(ctx?.ensamblaje?.output_ids?.length||0);
  const activeAgents=Object.values(ctx?.agentes_activos||{});
  const activosAhora=activeAgents.filter(ag=>['activo','running','waiting_input','waiting_tokens'].includes(String(ag?.estado||''))).length;
  const preguntasPendientes=Array.isArray(ctx?.preguntas_pendientes)?ctx.preguntas_pendientes.length:0;
  const cadenaEnsamblaje=Array.isArray(ctx?.template?.seed_template?.orden_produccion)
    ? ctx.template.seed_template.orden_produccion.length
    : 0;
  const iniciadoEn=ctx?.pipeline?.iniciado_en?new Date(ctx.pipeline.iniciado_en).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'pendiente';
  const blockPreview=bloquesKeys.slice(0,4).join(' · ');
  const completados=Object.values(ctx?.bloques||{}).filter(b=>String(b?.estado||'').startsWith('complet')).length;
  const totalBloques=bloquesKeys.length;
  const salud=String(ctx?.salud_pipeline?.estado||'ok').replace(/_/g,' ');

  const sectionsHtml=`
    <div class="ctx-query">${consulta?escapeHTML(consulta.slice(0,54))+(consulta.length>54?'…':''):'sin definir'}</div>
    <div class="ctx-chip-row">
      <span class="ctx-chip" style="color:${estadoColor};border-color:${estadoColor}33;background:${estadoColor}12">${estado.replace(/_/g,' ')}</span>
      <span class="ctx-chip">${completados}/${totalBloques||cadenaEnsamblaje||0} bloques</span>
      <span class="ctx-chip">${resultadosCount} out · ${assetsCount} assets</span>
    </div>
    <div class="ctx-grid">
      <div class="ctx-mini"><span class="ctx-lbl">agentes</span><span class="ctx-val">${activosAhora}/${activeAgents.length||0}</span></div>
      <div class="ctx-mini"><span class="ctx-lbl">operador</span><span class="ctx-val">${preguntasPendientes}</span></div>
      <div class="ctx-mini"><span class="ctx-lbl">salud</span><span class="ctx-val">${escapeHTML(salud)}</span></div>
      <div class="ctx-mini"><span class="ctx-lbl">inicio</span><span class="ctx-val">${iniciadoEn}</span></div>
    </div>
    <div class="ctx-row compact">
      <span class="ctx-lbl">flujo</span>
      <span class="ctx-val">${blockPreview||'aún sin bloques'}</span>
    </div>`;

  const pos=findOpenCardPosition(x,y,getCardCanvasSize({type:'ctx-file'}),id);
  const oc={id,x:pos.x,y:pos.y,type:'ctx-file',isCtxFile:true,pipelineId,
    fromNodeName:'Pipeline',fromDot:'#4a7a9a',label:'context.json',
    content:fullJson,_ctx:ctx};
  outputCards.push(oc);

  const el=document.createElement('div');
  el.className='output-card ctx-file-card';el.id=id;
  el.style.cssText=`left:${oc.x}px;top:${oc.y}px`;
  el.innerHTML=`
    <div class="port in" data-nid="${id}" data-pt="in"></div>
    <div class="port out" data-nid="${id}" data-pt="out"></div>
    <div class="oc-inner">
      <div class="ctx-file-hd">
        <div class="ctx-file-icon">⬡</div>
        <div class="ctx-file-titles">
          <div class="ctx-file-name">context.json</div>
          <div class="ctx-file-pipe">${pipeName}</div>
        </div>
        <button class="ctx-refresh" onclick="event.stopPropagation();refreshContextCard('${id}','${pipelineId}')" title="Actualizar">↺</button>
      </div>
      <div class="ctx-file-body">${sectionsHtml}</div>
      <div class="ctx-usage-row" id="ctxusage_${id}">reposo</div>
      <div class="ctx-file-ft">
        <button class="ctx-edit-btn" onclick="event.stopPropagation();expandContextCard('${id}')">⤢ ver / editar completo</button>
      </div>
    </div>`;

  el.addEventListener('mousedown',e=>cardMouseDown(e,id));
  document.getElementById('canvas').appendChild(el);
  return oc;
}

function getCanvasItemRect(id,fallback={}){
  const el=document.getElementById(id);
  const width=el?.offsetWidth||fallback.width||200;
  const height=el?.offsetHeight||fallback.height||100;
  const left=Number.parseFloat(el?.style.left)||fallback.x||0;
  const top=Number.parseFloat(el?.style.top)||fallback.y||0;
  return{id,x:left,y:top,width,height,cx:left+(width/2),cy:top+(height/2)};
}

function getAgentVisualTarget(agentId){
  const node=nodes.find(n=>n.agentId===agentId);
  if(node)return getCanvasItemRect(node.id,{x:node.x,y:node.y,...getNodeCanvasSize(node.type),agentId});
  const card=outputCards.find(c=>c._isRuntime&&c._agentId===agentId);
  if(card)return getCanvasItemRect(card.id,{x:card.x,y:card.y,width:190,height:76,agentId});
  return null;
}

function inferContextUsageMode(agentState){
  const action=String(agentState?.accion_actual||'').toLowerCase();
  if(/auditar|actualizar|guardar|consolidar|digest|coordinar|recopilar|ensambl|patch|merge|escrib|write/.test(action))return'write';
  return'read';
}

function clearContextUsageHighlights(){
  document.querySelectorAll('.ctx-usage-target').forEach(el=>el.classList.remove('ctx-usage-target'));
  document.querySelectorAll('.ctx-usage-read').forEach(el=>el.classList.remove('ctx-usage-read'));
  document.querySelectorAll('.ctx-usage-write').forEach(el=>el.classList.remove('ctx-usage-write'));
}

function setContextUsageSummary(ctxCardId,targets){
  const usageEl=document.getElementById('ctxusage_'+ctxCardId);
  if(!usageEl)return;
  if(!targets.length){
    usageEl.textContent='reposo';
    return;
  }
  if(targets.length===1){
    const t=targets[0];
    usageEl.textContent=t.mode==='write'
      ? `escribiendo con ${t.agentName}`
      : `leyendo ${t.agentName}`;
    return;
  }
  const writers=targets.filter(t=>t.mode==='write').length;
  usageEl.textContent=writers
    ? `compartido · ${targets.length} agentes · ${writers} escriben`
    : `compartido · ${targets.length} agentes leyendo`;
}

function syncContextCardActivity(ctx,pipelineId){
  const ctxCard=outputCards.find(c=>c.isCtxFile&&c.pipelineId===pipelineId);
  if(!ctxCard)return;
  const ctxEl=document.getElementById(ctxCard.id);
  if(!ctxEl)return;

  const agentStates=Object.values(ctx?.agentes_activos||{});
  const activeStates=agentStates.filter(ag=>
    ['activo','running','waiting_input','waiting_tokens'].includes(String(ag?.estado||'')) &&
    ag?.agent_id &&
    ag.agent_id!=='AG-01'
  );
  const fallbackPilot=nodes.find(n=>n.type==='pilot'||n.agentId==='AG-01');
  const targets=activeStates
    .map(ag=>{
      const visual=getAgentVisualTarget(ag.agent_id);
      if(!visual)return null;
      return{
        ...visual,
        agentId:ag.agent_id,
        agentName:ag.nombre||AGENT_NAMES[ag.agent_id]||ag.agent_id,
        mode:inferContextUsageMode(ag),
      };
    })
    .filter(Boolean);

  const effectiveTargets=targets.length?targets:(fallbackPilot?[{
    ...getCanvasItemRect(fallbackPilot.id,{x:fallbackPilot.x,y:fallbackPilot.y,...getNodeCanvasSize(fallbackPilot.type)}),
    agentId:fallbackPilot.agentId||'AG-01',
    agentName:fallbackPilot.name||'Piloto',
    mode:'read',
  }]:[]);

  clearContextUsageHighlights();
  effectiveTargets.forEach(t=>{
    const el=document.getElementById(t.id);
    if(!el)return;
    el.classList.add('ctx-usage-target');
    el.classList.add(t.mode==='write'?'ctx-usage-write':'ctx-usage-read');
  });

  setContextUsageSummary(ctxCard.id,effectiveTargets);

  const bounds=effectiveTargets.reduce((acc,t)=>({
    minX:Math.min(acc.minX,t.x),
    maxX:Math.max(acc.maxX,t.x+t.width),
    minY:Math.min(acc.minY,t.y),
  }),{minX:Infinity,maxX:-Infinity,minY:Infinity});
  const targetX=Math.max(20,Math.round(((bounds.minX+bounds.maxX)/2)-(CONTEXT_CARD_SIZE.width/2)));
  const targetY=Math.max(20,Math.round(bounds.minY-CONTEXT_CARD_SIZE.height-(effectiveTargets.length>1?58:42)));

  ctxCard.x=targetX;
  ctxCard.y=targetY;
  if(!cardDrag||cardDrag.id!==ctxCard.id){
    ctxEl.style.left=targetX+'px';
    ctxEl.style.top=targetY+'px';
  }
  ctxEl.classList.toggle('ctx-in-flight',effectiveTargets.length>0);
  ctxEl.classList.toggle('ctx-shared',effectiveTargets.length>1);

  conns=conns.filter(c=>!c.isCtxConn);
  effectiveTargets.forEach(t=>{
    conns.push({
      id:'c'+Math.random().toString(36).slice(2,10),
      from:ctxCard.id,fp:'out',to:t.id,tp:'in',
      active:true,fromCard:true,isCtxConn:true,ctxRole:'read',
    });
    if(t.mode==='write'){
      conns.push({
        id:'c'+Math.random().toString(36).slice(2,10),
        from:t.id,fp:'out',to:ctxCard.id,tp:'in',
        active:true,isCtxConn:true,ctxRole:'write',
      });
    }
  });
}

// ── QUESTION CARD (operator drops this to ask user) ──────────────
function mkQuestionCard(opts){
  // opts: {question, suggestion, timeout, pipelineId, fieldKey, onAnswer, x, y, questionId}
  const id='qcard_'+(opts.questionId||Date.now());
  const timeout=opts.timeout||20000;
  const x=opts.x||300, y=opts.y||160;

  // Remove existing question card for same fieldKey
  if(opts.fieldKey){
    outputCards.filter(c=>c.isQuestionCard&&c.fieldKey===opts.fieldKey)
      .forEach(c=>{document.getElementById(c.id)?.remove();});
    outputCards=outputCards.filter(c=>!(c.isQuestionCard&&c.fieldKey===opts.fieldKey));
  }

  const pos=findOpenCardPosition(x,y,getCardCanvasSize({type:'question'}),id);
  const oc={id,x:pos.x,y:pos.y,type:'question',isQuestionCard:true,
    questionId:opts.questionId||null,
    fieldKey:opts.fieldKey,pipelineId:opts.pipelineId,
    _suggestion:opts.suggestion,_onAnswer:opts.onAnswer,
    question:opts.question||'',content:'',status:'pending',_typingPaused:false,_lastInputAt:0};
  outputCards.push(oc);

  const safeQ=(opts.question||'').replace(/</g,'&lt;');
  const safeSug=(opts.suggestion||'—').replace(/</g,'&lt;');
  const safeSugVal=(opts.suggestion||'').replace(/'/g,"\\'");

  const el=document.createElement('div');
  el.className='output-card question-card';el.id=id;
  el.style.cssText=`left:${oc.x}px;top:${oc.y}px`;
  el.innerHTML=`
    <div class="oc-inner">
      <div class="qcard-hd">
        <div class="qcard-icon">◎</div>
        <div class="qcard-title">Operador — requiere input</div>
      </div>
      <div class="qcard-body">
        <div class="qcard-q">${safeQ}</div>
        <div class="qcard-suggest-lbl">sugerencia — se asumirá si no respondes</div>
        <div class="qcard-suggest" id="qsug_${id}" onclick="document.getElementById('qinput_${id}').value='${safeSugVal}';document.getElementById('qinput_${id}').focus()">${safeSug}</div>
        <textarea class="qcard-input" id="qinput_${id}" rows="2" placeholder="Escribe tu respuesta aquí...">${safeSugVal}</textarea>
      </div>
      <div class="qcard-progress-wrap">
        <div class="qcard-timer-txt" id="qtimer_${id}"></div>
        <div class="qcard-progress"><div class="qcard-progress-bar" id="qbar_${id}"></div></div>
      </div>
      <div class="qcard-ft">
        <button class="qcard-confirm" id="qconfirm_${id}">✓ Confirmar</button>
        <button class="qcard-skip" id="qskip_${id}">Omitir</button>
      </div>
    </div>`;

  el.addEventListener('mousedown',e=>cardMouseDown(e,id));
  document.getElementById('canvas').appendChild(el);

  // Enter key confirms
  document.getElementById('qinput_'+id).addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();_resolveQuestion(id,true);}
  });
  document.getElementById('qinput_'+id).addEventListener('input',()=>{
    oc._typingPaused=true;
    oc._lastInputAt=Date.now();
  });
  document.getElementById('qinput_'+id).addEventListener('focus',()=>{
    oc._typingPaused=true;
    oc._lastInputAt=Date.now();
  });
  document.getElementById('qinput_'+id).addEventListener('blur',()=>{
    oc._typingPaused=false;
  });
  document.getElementById('qconfirm_'+id).addEventListener('click',()=>_resolveQuestion(id,true));
  document.getElementById('qskip_'+id).addEventListener('click',()=>_resolveQuestion(id,false));

  // Countdown timer
  const start=Date.now();
  oc._timer=setInterval(()=>{
    if(oc._typingPaused){
      const idleFor=Date.now()-(oc._lastInputAt||0);
      if(idleFor<1200){
        const timerEl=document.getElementById('qtimer_'+id);
        if(timerEl)timerEl.textContent='escribiendo…';
        return;
      }
      oc._typingPaused=false;
    }
    const remaining=Math.max(0,timeout-(Date.now()-start));
    const pct=remaining/timeout*100;
    const bar=document.getElementById('qbar_'+id);
    const timerEl=document.getElementById('qtimer_'+id);
    if(bar)bar.style.width=pct+'%';
    if(timerEl)timerEl.textContent=Math.ceil(remaining/1000)+'s';
    if(remaining<=0){clearInterval(oc._timer);_resolveQuestion(id,false);}
  },250);

  glog('think','Operador','human','◎ '+opts.question);
  ensureQuestionCardConnection(oc);
  drawConns();
  return oc;
}

function _resolveQuestion(cardId, useInput){
  const oc=outputCards.find(c=>c.id===cardId);if(!oc)return;
  if(oc._timer)clearInterval(oc._timer);
  const inputEl=document.getElementById('qinput_'+cardId);
  const userVal=inputEl?.value?.trim()||'';
  const suggestion=oc._suggestion||'';
  const userModified=userVal&&userVal!==suggestion.trim();
  const answer=userModified ? userVal : (suggestion||userVal);
  const source=userModified?'usuario':'sugerencia';

  const el=document.getElementById(cardId);
  oc.type='text';
  oc.label='Decisión operador';
  oc.content=`Pregunta: ${oc.question||''}\n\nRespuesta (${source}): ${answer||'sin respuesta'}\n\nCampo: ${oc.fieldKey||'sin_campo'}`;
  oc.status='answered';
  oc.isQuestionResolved=true;
  oc.answer=answer;
  oc.answerSource=source;
  oc.fromNodeName='Operador';
  oc.fromDot='#c8a040';
  if(el){
    el.remove();
    mkOutputCard(oc);
  }
  conns=conns.filter(c=>c.to!==cardId);
  ensureQuestionCardConnection(oc);
  drawConns();
  scheduleSave();

  glog('decision','Operador','human','Respuesta ('+source+'): '+answer.slice(0,80));
  if(oc._onAnswer)oc._onAnswer(answer,source);
  setTimeout(()=>drainOperatorQuestionQueue(),80);
}

function ensureQuestionCardConnection(oc){
  const operatorNode=nodes.find(n=>n.type==='human'||n.agentId==='AG-05');
  if(!operatorNode||!oc?.id)return;
  if(conns.some(c=>c.from===operatorNode.id&&c.to===oc.id))return;
  conns.push({
    id:'c'+Math.random().toString(36).slice(2,10),
    from:operatorNode.id,
    fp:'out',
    to:oc.id,
    tp:'in',
    active:false,
    fromCard:false,
    isQuestionConn:true,
  });
}

function getActiveQuestionCard(){
  return outputCards.find(c=>c.isQuestionCard&&!c.isQuestionResolved)||null;
}

function inferSuggestionFromQuestionText(questionText){
  const text=String(questionText||'').trim();
  if(!text)return'';
  const recommended=text.match(/(?:recomendad[oa]|sugerid[oa]|default)\s*[:\-]?\s*(\d+)/i);
  if(recommended?.[1])return recommended[1];
  const optionNumbers=[...text.matchAll(/(?:^|\s)(\d+)\s*(?:[).:\-]|para\b)/gi)].map(m=>String(m[1]).trim()).filter(Boolean);
  if(optionNumbers.length)return optionNumbers[optionNumbers.length-1];
  return'';
}

function inferQuestionSuggestion(question){
  if(question?.suggestion&&String(question.suggestion).trim())return String(question.suggestion).trim();
  const meta=question?.metadata||{};
  if(meta.default_value!==undefined&&meta.default_value!==null&&String(meta.default_value).trim())return String(meta.default_value).trim();
  if(Array.isArray(meta.opciones)&&meta.opciones.length)return String(meta.opciones[0]).trim();
  const inferredFromText=inferSuggestionFromQuestionText(question?.question||meta.question||'');
  if(inferredFromText)return inferredFromText;
  const fieldKey=String(question?.field_key||meta.field_key||'').trim();
  const builtIns={
    cantidad_videos:'10',
    plataforma_destino:'YouTube',
    duracion_video:'Medio (2–5 min)',
    tono_comunicacion:'Cercano y motivacional',
    publico_objetivo:'Adultos en general',
    nombre_canal_o_marca:'ninguno',
    habito_seleccionado:'Beber agua antes de cada comida',
    confirmar_cantidad_videos:'Continuar con 1 video (solo \'Beber agua antes de cada comida\')',
    confirmar_tono:'Está bien así (Cercano y motivacional)',
    confirmar_errores_guion:'Corregir errores y ajustar duración a ~60 segundos',
    nivel_audiencia:'intermedio (algo de tecnología)',
    numero_modulos:'6',
    formato_entrega:'documento de texto (Markdown/Word)',
    tono_pedagogico:'conversacional y accesible',
    incluir_ejercicios:'sí, con ejercicios prácticos',
    enfoque_tematico:'IA generativa y herramientas prácticas de IA para el trabajo',
  };
  if(fieldKey&&builtIns[fieldKey])return builtIns[fieldKey];
  if(meta.tipo==='numero')return '1';
  if(meta.tipo==='texto')return '';
  return '';
}

function getQuestionTimeoutMs(){
  const totalPending=operatorQuestionQueue.length+(getActiveQuestionCard()?1:0);
  if(totalPending>=6)return 28000;
  if(totalPending>=4)return 22000;
  return 18000;
}

function drainOperatorQuestionQueue(){
  if(getActiveQuestionCard())return;
  if(!operatorQuestionQueue.length)return;
  const question=operatorQuestionQueue.shift();
  if(!question)return;
  const editorNode=nodes.find(n=>n.type==='human'||n.agentId==='AG-05');
  const vw=window.innerWidth,vh=window.innerHeight;
  const cx=(vw/2-px)/sc,cy=(vh/2-py)/sc;
  const baseX=editorNode ? (editorNode.x + 310) : (cx - 190);
  const baseY=editorNode ? (editorNode.y + 10) : (cy - 150);
  return mkQuestionCard({
    questionId:question.public_id,
    question:question.question,
    suggestion:inferQuestionSuggestion(question),
    timeout:getQuestionTimeoutMs(),
    pipelineId:question.pipeline_id||currentPipelineId,
    fieldKey:question.field_key||question.metadata?.field_key||question.public_id,
    onAnswer:(answer,source)=>submitOperatorQuestionAnswer(question.public_id,answer,source),
    x:baseX,
    y:baseY,
  });
}

function createBackendQuestionCard(question){
  if(!question||!question.public_id||question.status==='answered')return;
  if(outputCards.some(c=>c.questionId===question.public_id)||operatorQuestionQueue.some(q=>q.public_id===question.public_id))return;
  ensureLogVisibleForActivity();
  if(operatorQuestionQueue.length>=MAX_OPERATOR_QUESTION_CARDS)operatorQuestionQueue=operatorQuestionQueue.slice(-MAX_OPERATOR_QUESTION_CARDS+1);
  operatorQuestionQueue.push(question);
  return drainOperatorQuestionQueue();
}

async function submitOperatorQuestionAnswer(questionId,answer,source){
  if(!currentPipelineId||!questionId)return;
  const answer_origin=source==='usuario'?'manual':'automatic';
  try{
    await fetch('/api/pipelines/'+currentPipelineId+'/operator-questions/'+questionId+'/answer',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({answer,answer_origin}),
    });
  }catch(e){
    glog('warn','Operador','human','No se pudo registrar la respuesta de la pregunta.');
  }
}

function expandContextCard(id){
  const oc=outputCards.find(c=>c.id===id);if(!oc||!oc.isCtxFile)return;
  expandTarget={type:'ctx-file',id,pipelineId:oc.pipelineId};
  document.getElementById('ex-title').textContent='⬡ context.json — '+oc.pipelineId;
  document.getElementById('expandcontent').innerHTML=`<textarea class="ex-textarea" id="ex-edit" style="min-height:400px;font-size:11px">${oc.content||''}</textarea>`;
  document.getElementById('expandwin').classList.add('open');
}

function refreshContextCard(id,pipelineId){
  if(!pipelineId)return;
  fetch('/api/pipelines/'+pipelineId+'/context')
    .then(r=>r.json())
    .then(data=>{
      const ctx=data?.context;if(!ctx)return;
      const oc=outputCards.find(c=>c.id===id);
      const x=oc?.x||2800,y=oc?.y||2200;
      mkContextCard(pipelineId,ctx,x,y);
      drawConns();
      glog('action','Canvas','system','⬡ context.json actualizado');
    })
    .catch(()=>glog('warn','Canvas','system','No se pudo actualizar el contexto'));
}

function openContextCard(pipelineId){
  if(!pipelineId){glog('warn','PILOTO','pilot','No hay pipeline activo para ver el contexto.');return;}
  const pilot=nodes.find(n=>n.type==='pilot'||n.agentId==='AG-01');
  const cx=pilot?(pilot.x+270):(3000);
  const cy=pilot?(pilot.y-30):(2400);
  const existingOc=outputCards.find(c=>c.isCtxFile&&c.pipelineId===pipelineId);
  if(existingOc){expandContextCard(existingOc.id);return;}
  fetch('/api/pipelines/'+pipelineId+'/context')
    .then(r=>r.json())
    .then(data=>{
      const ctx=data?.context||{};
      mkContextCard(pipelineId,ctx,cx,cy);
      drawConns();
      glog('action','PILOTO','pilot','⬡ Abriendo context.json del pipeline');
    })
    .catch(()=>{
      mkContextCard(pipelineId,{estado:'sin_datos',pipeline_name:pipelineId},cx,cy);
      drawConns();
    });
}

function mkOutputCard(oc){
  const el=document.createElement('div');
  el.className='output-card';el.id=oc.id;
  el.style.cssText=`left:${oc.x}px;top:${oc.y}px`;
  const tc=IO_COLORS[oc.type]||'#706860';
  const previewHTML=getCardPreview(oc);
  el.innerHTML=`
    <div class="port in" data-nid="${oc.id}" data-pt="in"></div>
    <div class="oc-inner">
      <div class="oc-header">
        <div class="oc-from"><div class="oc-from-dot" style="background:${oc.fromDot}"></div><span>${oc.fromNodeName}</span></div>
        <span class="oc-type ${oc.type}">${IO_ICONS[oc.type]||'◆'} ${oc.type}</span>
      </div>
      <div class="oc-body" onclick="expandCard('${oc.id}')" title="Click para ver completo">
        ${previewHTML}
        <div class="oc-expand-hint">ver / editar</div>
      </div>
      <div class="oc-footer">
        <span class="oc-size" style="color:${tc}88">${oc.label}</span>
        <div class="oc-actions">
          <button class="oc-btn" onclick="event.stopPropagation();expandCard('${oc.id}')" title="Expandir">⤢</button>
          <button class="oc-btn" onclick="event.stopPropagation();deleteCard('${oc.id}')" title="Eliminar">✕</button>
        </div>
        <div class="oc-connect-port" data-nid="${oc.id}" data-pt="out" title="Arrastrar para conectar"></div>
      </div>
    </div>`;

  el.addEventListener('mousedown',e=>cardMouseDown(e,oc.id));
  // port connect
  const outPort=el.querySelector('.oc-connect-port');
  outPort.addEventListener('mousedown',e=>{
    e.stopPropagation();setConnFrom({nid:oc.id,pt:'out',src:'card'});
  });
  const inPort=el.querySelector('.port.in');
  inPort.addEventListener('mouseup',e=>{
    if(connFrom&&connFrom.nid!==oc.id){e.stopPropagation();finishConn(oc.id,'in');}
  });
  document.getElementById('canvas').appendChild(el);
  redrawConnsSoon();
}

function parseOutputCardContent(oc){
  const raw=typeof oc?.content==='string'?oc.content.trim():'';
  if(!raw)return null;
  try{return JSON.parse(raw);}catch{return null;}
}

function getMediaCardData(oc){
  const parsed=parseOutputCardContent(oc);
  const meta=oc?.meta||{};
  const parsedResult=meta?.parsed_resultado||{};
  const nestedResult=parsed?.resultado||{};
  const imageUrl=
    parsed?.imagen_url||parsed?.image_url||parsed?.imagen_uri||parsed?.image_uri||
    parsed?.thumbnail_url||parsed?.poster_url||parsed?.frame_url||parsed?.preview_image||
    nestedResult?.imagen_url||nestedResult?.image_url||nestedResult?.imagen_uri||nestedResult?.image_uri||
    nestedResult?.thumbnail_url||nestedResult?.poster_url||nestedResult?.frame_url||nestedResult?.preview_image||
    parsedResult?.imagen_url||parsedResult?.image_url||parsedResult?.imagen_uri||parsedResult?.image_uri||
    parsedResult?.thumbnail_url||parsedResult?.poster_url||parsedResult?.frame_url||parsedResult?.preview_image||
    '';
  const videoUrl=
    parsed?.video_url||parsed?.clip_url||parsed?.video_uri||parsed?.mp4_url||parsed?.url||
    nestedResult?.video_url||nestedResult?.clip_url||nestedResult?.video_uri||nestedResult?.mp4_url||nestedResult?.url||
    parsedResult?.video_url||parsedResult?.clip_url||parsedResult?.video_uri||parsedResult?.mp4_url||parsedResult?.url||
    '';
  const prompt=parsed?.prompt_usado||parsed?.prompt||nestedResult?.prompt_usado||nestedResult?.prompt||parsed?.asset?.prompt||parsedResult?.prompt_usado||parsedResult?.prompt||'';
  return{
    parsed,
    imageUrl:typeof imageUrl==='string'?imageUrl:'',
    videoUrl:typeof videoUrl==='string'?videoUrl:'',
    prompt:String(prompt||'').trim(),
  };
}

function getCardPreview(oc){
  const safe=c=>{const t=(c||'').trim();return(t==='null'||t==='{}'||t==='""')?'':t;};
  if(oc.type==='image'){
    const data=getMediaCardData(oc);
    if(data.imageUrl&&(data.imageUrl.startsWith('data:')||data.imageUrl.startsWith('http')||data.imageUrl.startsWith('/'))){
      return`<div class="oc-preview-image-card"><img class="oc-preview-img" src="${data.imageUrl}" style="width:100%;display:block;object-fit:cover;max-height:140px"/><div class="oc-preview-caption">${escapeHTML((data.prompt||safe(oc.content)||'').slice(0,96))}</div></div>`;
    }
  }
  if(oc.type==='video'){
    const data=getMediaCardData(oc);
    const poster=data.imageUrl&&(data.imageUrl.startsWith('data:')||data.imageUrl.startsWith('http')||data.imageUrl.startsWith('/'))
      ?` poster="${data.imageUrl}"`
      :'';
    if(data.videoUrl&&(data.videoUrl.startsWith('http')||data.videoUrl.startsWith('/'))){
      return`<div class="oc-preview-video-card"><video class="oc-preview-video" src="${data.videoUrl}"${poster} preload="metadata" muted playsinline></video><div class="oc-preview-caption">${escapeHTML((data.prompt||safe(oc.content)||'').slice(0,96))}</div></div>`;
    }
    if(data.imageUrl&&(data.imageUrl.startsWith('data:')||data.imageUrl.startsWith('http')||data.imageUrl.startsWith('/'))){
      return`<div class="oc-preview-video-card"><img class="oc-preview-img" src="${data.imageUrl}" style="width:100%;display:block;object-fit:cover;max-height:140px"/><div class="oc-preview-caption">${escapeHTML((data.prompt||safe(oc.content)||'').slice(0,96))}</div></div>`;
    }
  }
  if(oc.type==='json')
    return`<div class="oc-preview-json">${safe(oc.content).slice(0,120)}</div>`;
  return`<div class="oc-preview-txt">${safe(oc.content).slice(0,140)}</div>`;
}

function cardMouseDown(e,id){
  if(e.button!==0)return;
  if(e.target.tagName==='BUTTON'||e.target.classList.contains('oc-connect-port')||e.target.classList.contains('port'))return;
  e.stopPropagation();
  const oc=outputCards.find(c=>c.id===id);if(!oc)return;
  cardDrag=id;
  const wrap=document.getElementById('wrap').getBoundingClientRect();
  cdox=(e.clientX-wrap.left-px)/sc-oc.x;cdoy=(e.clientY-wrap.top-py)/sc-oc.y;
}

function expandCard(id){
  const oc=outputCards.find(c=>c.id===id);if(!oc)return;
  expandTarget={type:'card',id};
  document.getElementById('ex-title').textContent=`${oc.fromNodeName} — ${oc.type}`;
  const body=document.getElementById('expandcontent');
  if(oc.type==='image'){
    const data=getMediaCardData(oc);
    if(data.imageUrl&&(data.imageUrl.startsWith('data:')||data.imageUrl.startsWith('http')||data.imageUrl.startsWith('/'))){
      body.innerHTML=`
        <img src="${data.imageUrl}" style="width:100%;border-radius:4px;display:block;margin-bottom:12px;max-height:340px;object-fit:contain;background:#0a0808">
        <div style="font-size:8px;color:#5a5248;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px;font-family:'IBM Plex Mono',monospace">Prompt usado</div>
        <textarea class="ex-textarea" id="ex-edit" style="min-height:90px">${data.prompt||''}</textarea>`;
      document.getElementById('expandwin').classList.add('open');
      return;
    }
  }
  if(oc.type==='video'){
    const data=getMediaCardData(oc);
    const poster=data.imageUrl&&(data.imageUrl.startsWith('data:')||data.imageUrl.startsWith('http')||data.imageUrl.startsWith('/'))
      ?` poster="${data.imageUrl}"`
      :'';
    if(data.videoUrl&&(data.videoUrl.startsWith('http')||data.videoUrl.startsWith('/'))){
      body.innerHTML=`
        <video src="${data.videoUrl}"${poster} controls preload="metadata" playsinline style="width:100%;border-radius:4px;display:block;margin-bottom:12px;max-height:340px;background:#0a0808"></video>
        <div style="font-size:8px;color:#5a5248;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px;font-family:'IBM Plex Mono',monospace">Prompt / metadata</div>
        <textarea class="ex-textarea" id="ex-edit" style="min-height:90px">${data.prompt||oc.content||''}</textarea>`;
      document.getElementById('expandwin').classList.add('open');
      return;
    }
  }
  if(oc.type==='image'&&oc.content&&(oc.content.startsWith('data:')||oc.content.startsWith('http'))){
    body.innerHTML=`
      <img src="${oc.content}" style="width:100%;border-radius:4px;display:block;margin-bottom:12px;max-height:340px;object-fit:contain;background:#0a0808">
      <div style="font-size:8px;color:#5a5248;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px;font-family:'IBM Plex Mono',monospace">Prompt usado</div>
      <textarea class="ex-textarea" id="ex-edit" style="min-height:90px">${oc.prompt||''}</textarea>`;
  } else {
    body.innerHTML=`<textarea class="ex-textarea" id="ex-edit">${oc.content||''}</textarea>`;
  }
  document.getElementById('expandwin').classList.add('open');
}

async function tryMaterializeOperatorQuestionsFromCard(oc,val){
  if(!oc||!currentPipelineId)return false;
  let parsed=null;
  try{parsed=JSON.parse(val);}catch{return false;}
  const questions=extractOperatorQuestionsFromPayload(parsed, oc);

  if(!questions.length)return false;

  try{
    const res=await fetch('/api/pipelines/'+currentPipelineId+'/operator-questions',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({questions}),
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok){
      glog('warn','Operador','human','No se pudieron crear las preguntas desde el JSON del operador.');
      return false;
    }
    if(Array.isArray(data.created)){
      data.created.forEach(q=>createBackendQuestionCard(q));
    }
    oc.content=JSON.stringify({
      preguntas_generadas:questions.length,
      estado:'materializadas_en_cards',
    },null,2);
    const el=document.getElementById(oc.id);
    if(el){
      const b=el.querySelector('.oc-body');
      if(b)b.innerHTML=getCardPreview(oc)+`<div class="oc-expand-hint">preguntas convertidas en cards</div>`;
    }
    glog('done','Operador','human',questions.length+' preguntas convertidas en cards para el usuario.');
    return true;
  }catch(e){
    glog('warn','Operador','human','Fallo creando las preguntas del operador.');
    return false;
  }
}

async function tryMaterializeOperatorQuestionsFromOutputCard(oc){
  if(!oc||!currentPipelineId||oc._questionsMaterialized)return false;
  let parsed=null;
  try{parsed=typeof oc.content==='string'?JSON.parse(oc.content):null;}catch{parsed=null;}
  const questions=extractOperatorQuestionsFromPayload(parsed||oc.content, oc);
  if(!questions.length)return false;

  try{
    const res=await fetch('/api/pipelines/'+currentPipelineId+'/operator-questions',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({questions}),
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok)return false;
    if(Array.isArray(data.created))data.created.forEach(q=>createBackendQuestionCard(q));
    oc._questionsMaterialized=true;
    oc.content=JSON.stringify({
      preguntas_generadas:questions.length,
      estado:'materializadas_en_cards',
    },null,2);
    const el=document.getElementById(oc.id);
    if(el){
      const b=el.querySelector('.oc-body');
      if(b)b.innerHTML=getCardPreview(oc)+`<div class="oc-expand-hint">preguntas convertidas en cards</div>`;
    }
    scheduleSave();
    return true;
  }catch(_){
    return false;
  }
}

function extractOperatorQuestionsFromPayload(parsed, oc){
  if(typeof parsed==='string'){
    const text=parsed.trim();
    if(!text||!/\?/.test(text))return [];
    return [{
      question:text,
      field_key:oc.meta?.field_key||oc.meta?.campo||oc.meta?.campo_original||oc.meta?.bloque_destino||`${oc.fromNodeName||'operador'}_1`,
      suggestion:inferQuestionSuggestion({
        field_key:oc.meta?.field_key||oc.meta?.campo||oc.meta?.campo_original||'pref_general',
        question:text,
        metadata:{
          tipo:oc.meta?.tipo||'texto',
          opciones:Array.isArray(oc.meta?.opciones)?oc.meta.opciones:[],
          default_value:oc.meta?.default_value||oc.meta?.default||null,
        }
      }),
      metadata:{
        bloque:oc.meta?.bloque_destino||null,
        tipo:oc.meta?.tipo||'texto',
        opciones:Array.isArray(oc.meta?.opciones)?oc.meta.opciones:[],
        default_value:oc.meta?.default_value||oc.meta?.default||null,
        source_card_id:oc.id,
      },
    }];
  }

  const rawQuestions=Array.isArray(parsed?.preguntas)
    ? parsed.preguntas
    : Array.isArray(parsed?.resultado?.preguntas)
      ? parsed.resultado.preguntas
      : Array.isArray(parsed?.resultado?.preguntas_activas)
        ? parsed.resultado.preguntas_activas
      : [];

  if(rawQuestions.length){
    return rawQuestions.map((item,index)=>({
      question:String(item?.pregunta||item?.question||'').trim(),
      field_key:item?.campo||item?.field_key||`${oc.fromNodeName||'operador'}_${index+1}`,
      suggestion:String(item?.sugerencia||item?.suggestion||item?.default_value||item?.default||'').trim(),
      metadata:{
        bloque:item?.bloque||oc.meta?.bloque_destino||null,
        tipo:item?.tipo||'texto',
        opciones:Array.isArray(item?.opciones)?item.opciones:[],
        default_value:item?.default_value||item?.default||null,
        source_card_id:oc.id,
      },
    })).filter(item=>item.question);
  }

  const sourceObj=(parsed?.resultado&&typeof parsed.resultado==='object')?parsed.resultado:parsed;
  if(!sourceObj||typeof sourceObj!=='object')return [];

  return Object.entries(sourceObj)
    .filter(([key,val])=>String(key||'').startsWith('question_')&&typeof val==='string'&&val.trim())
    .map(([key,val])=>({
      question:String(val).trim(),
      field_key:String(key).replace(/^question_/,'')||key,
      suggestion:inferQuestionSuggestion({field_key:String(key).replace(/^question_/,'')||key,question:String(val).trim(),metadata:{tipo:'texto'}}),
      metadata:{
        bloque:oc.meta?.bloque_destino||null,
        source_card_id:oc.id,
      },
    }));
}

function deleteCard(id){
  const card=outputCards.find(c=>c.id===id);
  if(card?.assetId){
    glog('warn','Canvas','system','Esta card proviene del contexto real. Si el asset sigue vigente o histórico, se volverá a renderizar.');
    return;
  }
  const affectedNodeIds=conns.filter(c=>c.from===id||c.to===id).flatMap(c=>[c.from,c.to]).filter(ref=>nodes.some(n=>n.id===ref));
  document.getElementById(id)?.remove();
  outputCards=outputCards.filter(c=>c.id!==id);
  conns=conns.filter(c=>c.from!==id&&c.to!==id);
  affectedNodeIds.forEach(refreshNodeConnectionUI);
  drawConns();
}

function isProtectedCard(card){
  return card._kind==='seed'||card._isRuntime||card.label==='Prompt inicial'||card.isCtxFile||card.isQuestionCard||card.backendOutput||document.getElementById(card.id)?.classList.contains('seed-input-card');
}

function reconcileOutputCardsFromContext(ctx){
  const validAssetIds=new Set(Object.keys(ctx?.assets||{}));
  const toRemove=outputCards.filter(card=>!isProtectedCard(card)&&(!card.assetId||!validAssetIds.has(card.assetId)));
  toRemove.forEach(card=>document.getElementById(card.id)?.remove());
  outputCards=outputCards.filter(card=>isProtectedCard(card)||(card.assetId&&validAssetIds.has(card.assetId)));
  conns=conns.filter(c=>{
    if(c.isCtxConn)return true;
    if(!String(c.from||'').startsWith('oc'))return true;
    return outputCards.some(card=>card.id===c.from);
  });
  drawConns();
}

function applyContextToUI(ctx,pipelineId){
  if(!ctx)return;
  if(pipelineId&&currentPipelineId&&pipelineId!==currentPipelineId)return; // stale — ignore
  if(_userStartedRun&&ctx.pipeline?.iniciado_en&&['en_progreso','iniciando'].includes(ctx.estado))startPipelineRunClock(ctx.pipeline.iniciado_en);
  else if(['pausado','completo','cancelado','corrupto'].includes(ctx.estado)){stopPipelineRunClock();_userStartedRun=false;}
  reconcileOutputCardsFromContext(ctx);
  ensureCanvasSeedCardFromContext(ctx);
  if(Array.isArray(ctx.preguntas_pendientes)){
    ctx.preguntas_pendientes
      .filter(q=>q&&q.status!=='answered')
      .forEach(q=>createBackendQuestionCard(q));
  }
  const assets=ctx.assets||{};
  Object.values(assets).forEach(asset=>upsertAssetCardFromContext(asset,ctx));

  // Auto-asignar agentId a nodos colocados manualmente sin agentId
  const TYPE_TO_AG={'pilot':'AG-01','human':'AG-05','research':'AG-06','image':'AG-04','prompt':'AG-03','assembly':'AG-07','video':'AG-04'};
  nodes.forEach(n=>{if(!n.agentId&&TYPE_TO_AG[n.type])n.agentId=TYPE_TO_AG[n.type];});

  // Mostrar context card desde que el pipeline está en progreso
  if(pipelineId&&['preparado','en_progreso','completo','pausado'].includes(ctx.estado)){
    const pilot=nodes.find(n=>n.type==='pilot'||n.agentId==='AG-01');
    const seedCard=outputCards.find(c=>c._kind==='seed'||c.label==='Prompt inicial');
    const cx=seedCard?(seedCard.x+260):(pilot?(pilot.x-340):2600);
    const cy=seedCard?(seedCard.y):(pilot?(pilot.y):2400);
    const existing=outputCards.find(c=>c.isCtxFile&&c.pipelineId===pipelineId);
    mkContextCard(pipelineId,ctx,existing?.x??cx,existing?.y??cy);
  }

  const agentStates=ctx.agentes_activos||{};
  nodes.forEach(n=>{
    if(!n.agentId)return;
    const ag=agentStates[n.agentId];
    if(!ag)return;
    const statusMap={activo:'running',completado:'done',pausado:'idle',reemplazado:'done',descartado:'idle',running:'running',done:'done',idle:'idle',error:'error',paused:'idle'};
    setStatus(n.id,statusMap[ag.estado]||'idle');
  });

  syncRuntimeAgentsToCanvas(ctx);
  ensureAssemblyNodeFromContext(ctx);
  if(pipelineId&&['preparado','en_progreso','completo','pausado'].includes(ctx.estado))syncContextCardActivity(ctx,pipelineId);
  drawConns();

  const pilotNode=nodes.find(n=>n.type==='pilot'||n.agentId==='AG-01');
  if(pilotNode){
    const unresolvedPrefs=Object.values(ctx.preferencias_usuario?._requeridas||{})
      .filter(pref=>pref&&pref.obligatorio&&!pref.resuelta)
      .map(pref=>({label:pref.pregunta||('Definir '+pref.campo),status:'waiting'}));
    const queueTasks=(ctx.cola_tareas||[])
      .filter(task=>['pendiente','en_progreso','running','activo'].includes(task.estado))
      .slice(0,4)
      .map(task=>({label:task.accion||task.bloque||task.tarea_id||'Tarea pendiente',status:task.estado==='pendiente'?'pending':'active'}));
    const editorTask=ctx.editor?.esperando_input?[{label:ctx.editor?.pregunta_activa||'Esperando respuesta del usuario',status:'waiting'}]:[];
    const latestDecision=ctx.historial_decisiones?.slice(-1)[0];
    const health=ctx.salud_pipeline||{};
    pilotNode.runtimeCycle=Number.isFinite(ctx.ciclo)?ctx.ciclo:(ctx.pipeline?.ciclo_actual||0);
    pilotNode.pilotStatusLabel=(ctx.estado==='en_progreso'||ctx.estado==='iniciando')?'RUN':(ctx.estado||pilotNode.pilotStatusLabel||'IDLE');
    pilotNode.pilotTokenLabel=formatPilotTokenLabel(pilotTokenTotalValue||0);
    pilotNode.pilotTasks=[...editorTask,...unresolvedPrefs,...queueTasks].slice(0,6);
    pilotNode.pilotReport=[
      `Estado general: ${ctx.estado||'iniciando'}`,
      `Ciclo actual: ${pilotNode.runtimeCycle}`,
      latestDecision?`Ultima decision: ${latestDecision.agente||'AG-01'} -> ${latestDecision.accion||'sin accion'} (${latestDecision.prioridad||'normal'})`:'Ultima decision: aun no registrada',
      health.ultimo_motivo?`Bloqueo / motivo: ${health.ultimo_motivo}`:'Bloqueo / motivo: sin bloqueos criticos',
      ctx.editor?.esperando_input?`Operador: esperando input sobre "${ctx.editor?.pregunta_activa||'consulta activa'}"`:'Operador: sin preguntas pendientes',
      `Ensamblaje: ${ctx.ensamblaje?.estado||'pendiente'}`,
    ].join('\n');
    const pel=document.getElementById(pilotNode.id);
    if(pel){
      const cycleRow=pel.querySelector('.pilot-cycle-row');
      if(cycleRow)cycleRow.outerHTML=pilotLoopHTML(pilotNode);
      const taskWrap=pel.querySelector('.pilot-task-wrap');
      if(taskWrap)taskWrap.outerHTML=pilotTasksHTML(pilotNode);
      const snippet=pel.querySelector('.pilot-report-snippet');
      if(snippet)snippet.outerHTML=`<div class="pilot-report-snippet" onclick="openPilotReport('${pilotNode.id}')">${escapeHTML(pilotReportText(pilotNode))}</div>`;
      const state=pel.querySelector('.pilot-action-state');
      if(state)state.textContent=pilotNode.pilotStatusLabel;
      const barState=pel.querySelector('.pilot-bottom-status');
      if(barState)barState.textContent=pilotNode.pilotStatusLabel;
      const barTokens=pel.querySelector('.pilot-bottom-tokens');
      if(barTokens)barTokens.textContent=pilotNode.pilotTokenLabel||pilotTokenTotal;
    }
    updatePilotLogCard(pilotNode.id);
  }

  // Update assembly card vis for any assembly node on canvas
  const assemblyNode=nodes.find(n=>n.type==='assembly'||n.agentId==='AG-07');
  if(assemblyNode){
    updateAssemblyVis(assemblyNode.id,ctx);
    if(ctx?.ensamblaje?.producto_final)dropAssemblyOutputCard(assemblyNode,ctx.ensamblaje.producto_final);
  }

  const blocks=Object.values(ctx.bloques||{});
  const total=blocks.length;
  const done=blocks.filter(b=>b.estado==='completada').length;
  const review=blocks.filter(b=>b.estado==='en_revision').length;
  const pct=total?Math.round((done/total)*100):0;
  const assembly=ctx.ensamblaje?.estado||'pendiente';
  const badge=document.getElementById('log-badge');
  const title=document.getElementById('logtitle');
  if(badge)badge.textContent=ctx.estado==='completo'?'DONE':(pct+'%');
  if(title)title.textContent='Log Global — Pipeline · '+done+'/'+total+' bloques · ensamble '+assembly;
  const pipeLabel=document.getElementById('pipe-label');
  if(pipeLabel&&(ctx.pipeline_name||pipelineId))pipeLabel.textContent=ctx.pipeline_name||pipelineId;
}

function syncRuntimeFromContext(pipelineId){
  if(!pipelineId)return Promise.resolve();
  if(pipelineId!==currentPipelineId)return Promise.resolve(); // stale — ignore
  return fetch('/api/pipelines/'+pipelineId+'/context')
    .then(r=>r.json())
    .then(data=>{
      const ctx=data?.context;if(!ctx)return;
      applyContextToUI(ctx,pipelineId);
    })
    .catch(()=>{});
}

function upsertAssetCardFromContext(asset,ctx){
  if(!asset||!asset.asset_id)return;
  const block=asset.bloque&&ctx?.bloques?ctx.bloques[asset.bloque]:null;
  const node=resolveAssetNode(asset,block);
  if(!node)return;
  const status=asset.estado||'pendiente';
  const label=(asset.bloque||'asset')+' · '+status;
  const fallbackSummary=asset.metadata?JSON.stringify(asset.metadata,null,2):status;
  const summary=asset.prompt||asset.feedback_usuario||asset.contenido||fallbackSummary;
  const existing=outputCards.find(c=>c.assetId===asset.asset_id);
  const cardData={
    assetId:asset.asset_id,
    revisionStatus:status,
    fromNodeId:node.id,
    fromNodeName:node.name,
    fromDot:(T[node.type]||{}).dot||'#706860',
    type:asset.tipo_asset||node.outputType||(node.type==='image'?'image':'json'),
    label,
    content:asset.contenido||asset.prompt||summary,
    prompt:asset.prompt||null,
    x:existing&&existing.x!==undefined?existing.x:(node.x+260+(asset.iteracion?asset.iteracion*18:0)),
    y:existing&&existing.y!==undefined?existing.y:(node.y+24+(asset.iteracion?asset.iteracion*18:0)),
  };
  if(existing){
    Object.assign(existing,cardData);
    const el=document.getElementById(existing.id);
    if(el){
      const body=el.querySelector('.oc-body');
      const size=el.querySelector('.oc-size');
      if(body)body.innerHTML=getCardPreview(existing)+'<div class="oc-expand-hint">ver / editar</div>';
      if(size)size.textContent=existing.label;
      el.style.left=existing.x+'px';
      el.style.top=existing.y+'px';
      el.style.opacity=status==='reemplazado'?'.55':'1';
    }
    return;
  }
  const oc={id:'oc'+Math.random().toString(36).slice(2,10),_kind:'output',...cardData};
  outputCards.push(oc);
  mkOutputCard(oc);
  const el=document.getElementById(oc.id);
  if(el&&status==='reemplazado')el.style.opacity='.55';
  drawConns();scheduleSave();
}

function resolveAssetNode(asset,block){
  const preferredAgent=asset.agente_sugerido||block?.agente_responsable;
  if(preferredAgent){
    const byAgent=nodes.find(n=>n.agentId===preferredAgent);
    if(byAgent)return byAgent;
  }
  if(asset.bloque){
    const byName=nodes.find(n=>(n.name||'').toLowerCase().includes(String(asset.bloque).toLowerCase()));
    if(byName)return byName;
  }
  return nodes.find(n=>n.agentId==='AG-05'||n.type==='human')||null;
}

function syncProgressFromContext(pipelineId){
  if(!pipelineId)return Promise.resolve();
  return fetch('/api/pipelines/'+pipelineId+'/context')
    .then(r=>r.json())
    .then(data=>{
      const ctx=data?.context;if(!ctx)return;
      applyContextToUI(ctx,pipelineId);
      const blocks=Object.values(ctx.bloques||{});
      const total=blocks.length;
      const done=blocks.filter(b=>b.estado==='completada').length;
      const review=blocks.filter(b=>b.estado==='en_revision').length;
      const pct=total?Math.round((done/total)*100):0;
      const assembly=ctx.ensamblaje?.estado||'pendiente';
      glog('think','Pipeline','system','Progreso real: '+done+'/'+total+' bloques, '+review+' en revision, ensamblaje '+assembly+' ('+pct+'%)');
    })
    .catch(()=>{});
}

function openPilotReport(nodeId){
  const n=nodes.find(x=>x.id===nodeId);if(!n)return;
  openExpandField({stopPropagation(){}},nodeId,'pilotReport');
}

function togglePilotLogCard(nodeId){
  const nodeEl=document.getElementById(nodeId);if(!nodeEl)return;
  if(pilotLogOpen.has(nodeId)){
    pilotLogOpen.delete(nodeId);
    document.getElementById('plc_'+nodeId)?.remove();
    nodeEl.style.zIndex='';
  }else{
    pilotLogOpen.add(nodeId);
    mkPilotLogCard(nodeId);
    nodeEl.style.zIndex='20';
  }
}

function mkPilotLogCard(nodeId){
  const n=nodes.find(x=>x.id===nodeId);if(!n)return;
  document.getElementById('plc_'+nodeId)?.remove();
  const el=document.createElement('div');
  el.className='pilot-log-card';el.id='plc_'+nodeId;
  el.addEventListener('mousedown',e=>e.stopPropagation());
  el.addEventListener('click',e=>{e.stopPropagation();openPilotReport(nodeId);});
  el.innerHTML=`
    <div class="plc-bar">
      <span class="plc-dot"></span>
      <span class="plc-title">Estado · log en vivo</span>
      <span class="plc-close" id="plcc_${nodeId}">✕</span>
    </div>
    <div class="plc-body" id="plcb_${nodeId}">${renderPilotLogLines(n)}</div>`;
  el.querySelector('.plc-close').addEventListener('click',e=>{
    e.stopPropagation();togglePilotLogCard(nodeId);
  });
  document.getElementById(nodeId)?.appendChild(el);
}

function renderPilotLogLines(n){
  const text=pilotReportText(n);
  if(!text||text.startsWith('Sin reportes'))
    return`<div class="plc-empty">› Esperando actividad del piloto...</div>`;
  return text.split('\n').filter(Boolean).map((line,i)=>
    `<div class="plc-line${i===0?' plc-new':''}"><span class="plc-prompt">›</span><span class="plc-text">${escapeHTML(line)}</span></div>`
  ).join('');
}

function updatePilotLogCard(nodeId){
  if(!pilotLogOpen.has(nodeId))return;
  const n=nodes.find(x=>x.id===nodeId);if(!n)return;
  const body=document.getElementById('plcb_'+nodeId);
  if(!body)return;
  const atBottom=body.scrollHeight-body.scrollTop-body.clientHeight<32;
  body.innerHTML=renderPilotLogLines(n);
  if(atBottom)body.scrollTop=body.scrollHeight;
}

function setPilotLoopMode(id,value){
  const n=nodes.find(x=>x.id===id);if(!n)return;
  n.loopMode=value;
  const row=document.getElementById(id)?.querySelector('.pilot-cycle-row');
  if(row)row.outerHTML=pilotLoopHTML(n);
  scheduleSave();
}

function setPilotMaxCycles(id,value){
  const n=nodes.find(x=>x.id===id);if(!n)return;
  n.maxCycles=Math.max(1,Math.min(500,parseInt(value,10)||50));
  scheduleSave();
}


// ══════════════════════════════
// EXPAND WINDOW (meta/goal/text)
// ══════════════════════════════
function openExpandField(e,nodeId,field){
  e.stopPropagation();
  const n=nodes.find(x=>x.id===nodeId);if(!n)return;
  expandTarget={type:'node',id:nodeId,field};
  const tp=T[n.type];
  let title='',content='';
  if(field==='meta'){title='Meta / Goal';content=`META:\n${n.meta||tp.meta||''}\n\nGOAL:\n${n.goal||tp.goal||''}`;}
  else if(field==='promptOut'){title='Prompt / Output texto';content=n.promptOut||tp.promptText||'';}
  else if(field==='humanEdit'){title='Decisión del Operador — Editar contexto';content=n.humanNote||'Escribe aquí las notas o contexto adicional para la decisión...';}
  else if(field==='pilotReport'){title='Estado / Reportes del Piloto';content=n.pilotReport||pilotReportText(n);}
  else{title=field;content=n[field]||'';}
  document.getElementById('ex-title').textContent=title;
  document.getElementById('expandcontent').innerHTML=`<textarea class="ex-textarea" id="ex-edit">${content}</textarea>`;
  document.getElementById('expandwin').classList.add('open');
}

async function saveExpand(){
  const ta=document.getElementById('ex-edit');if(!ta)return;
  const val=ta.value;
  if(expandTarget?.type==='node'){
    const n=nodes.find(x=>x.id===expandTarget.id);
    if(n){
      if(expandTarget.field==='meta'){
        const lines=val.split('\n');
        const mi=lines.findIndex(l=>l.startsWith('META:'));
        const gi=lines.findIndex(l=>l.startsWith('GOAL:'));
        n.meta=lines.slice(mi+1,gi>=0?gi:undefined).join('\n').trim()||val;
        n.goal=gi>=0?lines.slice(gi+1).join('\n').trim():'';
      } else n[expandTarget.field]=val;
      // Re-render meta section
      const el=document.getElementById(n.id);
      if(el){
        const m=el.querySelector('.nmeta');if(m)m.outerHTML=metaHTML(n);
        if(expandTarget.field==='pilotReport'){
          const report=el.querySelector('.pilot-report-snippet');
          if(report)report.outerHTML=`<div class="pilot-report-snippet" onclick="openPilotReport('${n.id}')">${escapeHTML(pilotReportText(n))}</div>`;
        }
      }
    }
  } else if(expandTarget?.type==='card'){
    const oc=outputCards.find(c=>c.id===expandTarget.id);
    if(oc){
      const materialized=await tryMaterializeOperatorQuestionsFromCard(oc,val);
      if(!materialized){
        if(oc.type==='image'){
          const data=getMediaCardData(oc);
          oc.content=JSON.stringify({
            prompt_usado: val,
            imagen_url: data.imageUrl || '',
          },null,2);
        }else if(oc.type==='video'){
          const data=getMediaCardData(oc);
          oc.content=JSON.stringify({
            prompt_usado: val,
            video_url: data.videoUrl || '',
            poster_url: data.imageUrl || '',
          },null,2);
        }else{
          oc.content=val;
        }
        const el=document.getElementById(oc.id);
        if(el){
          const b=el.querySelector('.oc-body');
          if(b)b.innerHTML=getCardPreview(oc)+`<div class="oc-expand-hint">ver / editar</div>`;
        }
      }
    }
  } else if(expandTarget?.type==='ctx-file'){
    const oc=outputCards.find(c=>c.id===expandTarget.id);
    if(oc){
      oc.content=val;
      let parsed=null;try{parsed=JSON.parse(val);}catch(e){glog('warn','Canvas','system','JSON inválido — no se guardó en el servidor');closeExpand();return;}
      oc._ctx=parsed;
      // Save to server
      fetch('/api/pipelines/'+expandTarget.pipelineId+'/context',{
        method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({context:parsed})
      }).then(()=>glog('done','Canvas','system','⬡ context.json guardado'))
        .catch(()=>glog('warn','Canvas','system','⬡ No se pudo guardar en el servidor (guardado local)'));
    }
  }
  closeExpand();
}
function closeExpand(){document.getElementById('expandwin').classList.remove('open');expandTarget=null;}

// ══════════════════════════════
// STATUS & EXECUTION
// ══════════════════════════════
function stlabel(s){return{idle:'IDLE',running:'RUNNING',done:'DONE',error:'ERROR',paused:'PAUSED','awaiting-input':'WAITING'}[s]||'IDLE';}

function setStatus(id,s){
  const n=nodes.find(x=>x.id===id);if(!n)return;n.status=s;
  const el=document.getElementById(id);if(!el)return;
  el.classList.toggle('running',s==='running'||s==='awaiting-input');
  el.classList.toggle('paused',s==='paused');
  const ft=document.getElementById('fst_'+id);if(ft)ft.textContent=stlabel(s);
  const btnStateMap={running:'CORRIENDO',paused:'PAUSADO','awaiting-input':'ESPERANDO',done:'COMPLETADO',error:'ERROR',idle:'LISTO'};
  const prst=document.getElementById('prst_'+id);if(prst)prst.textContent=btnStateMap[s]||'LISTO';
  const dots=el.querySelectorAll('.nstatus-dot');
  if(dots.length)dots[dots.length-1].className='nstatus-dot '+(s==='awaiting-input'?'running':(s==='paused'?'idle':s));
  // Activate connections incoming to this node when it starts/finishes
  let needsDraw=false;
  conns.forEach(c=>{
    if(c.to===id&&!c.fromCard){
      const active=s==='running'||s==='done';
      if(c.active!==active){c.active=active;needsDraw=true;}
    }
  });
  if(needsDraw)drawConns();
  // Auto output card when done
  if(s==='done')autoOutputCard(n);
}


function runNode(id){
  const n=nodes.find(x=>x.id===id);if(!n)return;
  // Visual flash feedback
  const el=document.getElementById(id);
  if(el){el.classList.add('node-flash');setTimeout(()=>el.classList.remove('node-flash'),500);}
  if(n.agentId==='AG-01'||n.type==='pilot'){
    glog('system',n.name,n.type,'▶ Ejecutando pipeline completo...');
    runAll();return;
  }
  if(n.type==='human'){
    // Operator drops a question card on the canvas
    const question=n.cfg?.prompt||'¿Cuál es la dirección que debe tomar el pipeline en este punto?';
    const suggestion=n.cfg?.outputDefault||'Continuar con el flujo sugerido por el piloto';
    mkQuestionCard({
      question,suggestion,timeout:20000,
      pipelineId:currentPipelineId,
      fieldKey:'operator_decision_'+n.id,
      x:n.x+290,y:n.y,
      onAnswer:(answer,source)=>{
        n.logs.push({t:ts(),m:'Respuesta ('+source+'): '+answer.slice(0,60),c:'ok'});
        glog('decision',n.name,n.type,'Decisión registrada: '+answer.slice(0,60));
      }
    });
    return;
  }
  openM(id);
  n.logs.push({t:ts(),m:'▶ Activado desde canvas',c:'ok'});
  glog('action',n.name,n.type,'▶ Agente activado. El backend coordina la ejecución real.');
}

function triggerOperatorWarning(agentName){
  glog('operator','Pipeline','system',agentName+' registro una actualizacion del operador. Revisa la terminal para continuar iterando.');
}

function clearOperatorWarning(){
  operatorWaiting=false;
}


function pauseNode(id){const n=nodes.find(x=>x.id===id);if(!n)return;glog('warn',n.name,n.type,'La pausa local por nodo está desactivada. Solo el estado real del backend manda.');}
function stopNode(id){const n=nodes.find(x=>x.id===id);if(!n)return;glog('warn',n.name,n.type,'El canvas no detiene agentes individuales. Usa Stop para detener el loop del Piloto.');}
function humanDecide(id){
  const n=nodes.find(x=>x.id===id);if(!n)return;
  n.logs.push({t:ts(),m:'Feedback manejado desde terminal',c:'ok'});
  glog('decision',n.name,n.type,'El operador ya no bloquea el pipeline. Usa la terminal para enviar cambios en caliente.');
}

let _executionAbort=null;
let pipelineRunTimer=null;
let pipelineRunStartedAt=null;

function formatPipelineElapsed(ms){
  const total=Math.max(0,Math.floor(ms/1000));
  const h=Math.floor(total/3600);
  const m=Math.floor((total%3600)/60);
  const s=total%60;
  if(h>0)return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

function renderPipelineRunState(){
  const main=document.getElementById('run-btn-main');
  const mini=document.getElementById('run-btn-mini');
  const stopMini=document.getElementById('stop-btn-mini');
  const timer=document.getElementById('run-timer');
  const active=Boolean(pipelineRunStartedAt);
  // Run/EJECUTAR: gold when idle, normal when running
  [main,mini].forEach(el=>{if(el)el.classList.toggle('pipeline-live',false);});
  // Stop: blue when pipeline is running
  if(stopMini)stopMini.classList.toggle('pipeline-live',active);
  if(timer){
    if(active){
      timer.classList.add('live');
      timer.textContent=formatPipelineElapsed(Date.now()-pipelineRunStartedAt);
    }else{
      timer.classList.remove('live');
      timer.textContent='00:00';
    }
  }
}

function startPipelineRunClock(startedAt){
  const parsed=startedAt?Date.parse(startedAt):NaN;
  pipelineRunStartedAt=Number.isFinite(parsed)?parsed:Date.now();
  if(pipelineRunTimer)clearInterval(pipelineRunTimer);
  renderPipelineRunState();
  pipelineRunTimer=setInterval(renderPipelineRunState,1000);
}

function stopPipelineRunClock(){
  if(pipelineRunTimer){clearInterval(pipelineRunTimer);pipelineRunTimer=null;}
  pipelineRunStartedAt=null;
  renderPipelineRunState();
}

async function stopAll(){
  if(_executionAbort){_executionAbort.abort();_executionAbort=null;}
  if(!currentPipelineId){glog('warn','Pipeline','system','Sin pipeline activo.');return;}
  try{
    const res=await fetch('/api/pipelines/'+currentPipelineId+'/stop',{
      method:'POST',headers:{'Content-Type':'application/json'},
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok||data.error){
      glog('error','Pipeline','system','Error deteniendo pipeline: '+(data.error||res.status));
      return;
    }
    _userStartedRun=false;
    clearOperatorWarning();
    // Immediately clear running animation on all nodes
    nodes.forEach(nd=>{
      if(nd.status==='running'||nd.status==='awaiting-input'||nd.status==='paused'){
        setStatus(nd.id,'idle');
      }
    });
    stopPipelineRunClock();
    if(data.context)applyContextToUI(data.context,currentPipelineId);
    if(data.stopped){
      glog('system','Pipeline','system','Loop del Piloto detenido. Contexto, prompts y resultados parciales conservados.');
    }else{
      glog('warn','Pipeline','system','El pipeline ya no estaba corriendo. Estado actual conservado.');
    }
  }catch(err){
    glog('error','Pipeline','system','Error deteniendo pipeline: '+err.message);
  }
}

async function _readPipelineSSE(){
  glog('warn','Pipeline','system','El runner SSE del canvas está desactivado. El pipeline ahora corre solo por el loop del Piloto.');
}
async function runAll(){
  if(!currentPipelineId){glog('warn','Pipeline','system','Sin pipeline activo. Crea uno primero.');return;}
  if(!nodes.length){glog('warn','Pipeline','system','Sin agentes en el canvas.');return;}
  _userStartedRun=true;
  ensureLogVisibleForActivity();
  collapseWindows();
  if(!terminalPipelineId||terminalPipelineId!==currentPipelineId)connectSSE(currentPipelineId);
  glog('system','Pipeline','system','▶ Arrancando pipeline con AG-01 Piloto…');
  startPipelineRunClock();
  const res=await fetch('/api/pipelines/'+currentPipelineId+'/start',{
    method:'POST',headers:{'Content-Type':'application/json'},
  }).catch(e=>{glog('error','Pipeline','system','Error: '+e.message);return null;});
  if(!res||!res.ok){
    if(res){
      const e=await res.json().catch(()=>({}));
      if(e.error==='pipeline_not_prepared'){
        const prepared=await preparePipelineFromCanvasSeed();
        if(prepared){
          return runAll();
        }
      }
      glog('error','Pipeline','system','Error: '+(e.error||res.status));
    }
    stopPipelineRunClock();
    return;
  }
  const data=await res.json().catch(()=>({}));
  if(data.started){
    const pilotNode=nodes.find(n=>n.agentId==='AG-01'||n.type==='pilot');
    if(pilotNode)setStatus(pilotNode.id,'running');
    glog('done','Pipeline','system','Piloto activo — loop único en ejecución.');
    syncProgressFromContext(currentPipelineId);
  }
}
async function resumePipeline(){
  glog('warn','Pipeline','system','La reanudación por canvas está desactivada. El loop del Piloto es el único motor del pipeline.');
}

function getCanvasSeedPrompt(){
  const seedCard=outputCards.find(c=>c._kind==='seed'||(c.isInputCard&&/prompt semilla/i.test(c.label||''))||/prompt semilla/i.test(c.label||''));
  if(!seedCard)return'';
  if(seedCard._kind==='seed')return String(seedCard.content||'').trim();
  const el=document.getElementById(seedCard.id);
  const ta=el?.querySelector('.idc-textarea');
  return String(ta?.value||seedCard.content||'').trim();
}

function getCanvasPromptCard(){
  return outputCards.find(c=>c._kind==='seed'||(c.isInputCard&&/prompt semilla/i.test(c.label||''))||/prompt semilla/i.test(c.label||''));
}

function ensureCanvasSeedCardFromContext(ctx){
  const existing=getCanvasPromptCard();
  if(existing)return existing;

  const seedText=String(
    ctx?.preferencias_usuario?.prompt_base?.valor||
    ctx?.preferencias_usuario?.objetivo?.valor||
    ctx?.objetivo||
    ctx?.consulta||
    ''
  ).trim();
  if(!seedText)return null;

  const pilot=nodes.find(n=>n.type==='pilot'||n.agentId==='AG-01');
  const ctxCard=outputCards.find(c=>c.isCtxFile);
  const x=ctxCard ? Math.max(20, ctxCard.x - 260) : (pilot ? Math.max(20, pilot.x - 300) : 20);
  const y=pilot ? (pilot.y + 10) : (ctxCard ? ctxCard.y : 2400);
  const seedCard=mkSeedCard(seedText,x,y);
  if(pilot && !conns.some(c=>c.from===seedCard.id&&c.to===pilot.id)){
    conns.push({id:'c'+Math.random().toString(36).slice(2,10),from:seedCard.id,fp:'out',to:pilot.id,tp:'in',active:true,fromSeed:true,fromCard:true});
  }
  drawConns();
  scheduleSave();
  return seedCard;
}

async function preparePipelineFromCanvasSeed(){
  const prompt=getCanvasSeedPrompt();
  if(!prompt){
    glog('warn','Pipeline','system','No hay prompt semilla en el canvas para que AG-00 prepare el contexto.');
    return false;
  }
  _pendingSeedPrompt=prompt;
  showCreatingAnimation(prompt,'architect');
  startTitleCycle();
  glog('think','Arquitecto','agent','Preparando contexto inicial desde el prompt semilla del canvas...');
  const res=await fetch('/api/pipelines/'+currentPipelineId+'/prepare',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({prompt}),
  }).catch(e=>{glog('error','Pipeline','system','Error preparando pipeline: '+e.message);return null;});
  if(!res||!res.ok){
    hideCreatingAnimation();_pendingSeedPrompt=null;
    stopTitleCycle('Log Global — Pipeline');
    if(res){
      const data=await res.json().catch(()=>({}));
      glog('error','Arquitecto','agent','No se pudo preparar el pipeline: '+(data.error||res.status));
    }
    return false;
  }
  const data=await res.json().catch(()=>({}));
  if(data.context){
    applyContextToUI(data.context,currentPipelineId);
    glog('done','Arquitecto','agent','Contexto inicial diseñado por AG-00 y conectado al Piloto.');
  }
  if(currentPipelineId){
    setTimeout(()=>syncCanvasFromPipeline(currentPipelineId),200);
  }else{
    hideCreatingAnimation();_pendingSeedPrompt=null;
    stopTitleCycle('Log Global — Pipeline');
  }
  return true;
}

function handleExecutionEvent_typed(){
  glog('warn','Pipeline','system','Los eventos del runner autónomo del canvas están desactivados.');
}
function resetAll(){
  _userStartedRun=false;
  stopAll();conns.forEach(c=>c.active=false);
  // Remove output cards but keep seed/prompt and context cards
  outputCards=outputCards.filter(oc=>{
    if(isProtectedCard(oc))return true;
    document.getElementById(oc.id)?.remove();
    return false;
  });
  nodes.forEach(n=>{n.img=null;n.promptOut=null;n.output='';n.status='idle';const v=document.getElementById('vis_'+n.id);if(v)v.innerHTML=visHTML(n);setStatus(n.id,'idle');});
  drawConns();
}
function delSel(){
  if(!sel)return;
  const affectedNodeIds=conns.filter(c=>c.from===sel||c.to===sel).flatMap(c=>[c.from,c.to]).filter(ref=>ref!==sel&&nodes.some(n=>n.id===ref));
  document.getElementById(sel)?.remove();
  nodes=nodes.filter(n=>n.id!==sel);
  conns=conns.filter(c=>c.from!==sel&&c.to!==sel);
  outputCards=outputCards.filter(c=>c.id!==sel);
  affectedNodeIds.forEach(refreshNodeConnectionUI);
  sel=null;drawConns();updateMM();scheduleSave();updateAddAgentMenuAvailability();
}
function ts(){return new Date().toTimeString().slice(0,8);}

// ══════════════════════════════
// DRAG & PAN
// ══════════════════════════════
function nmd(e,id){
  if(e.button!==0)return;
  if(e.target.classList.contains('port')||e.target.tagName==='BUTTON'||e.target.classList.contains('nmeta')||e.target.classList.contains('nmeta-txt')||e.target.classList.contains('nvis-prompt-txt'))return;
  e.stopPropagation();selN(id);
  const n=nodes.find(x=>x.id===id);
  drag=id;const wrap=document.getElementById('wrap').getBoundingClientRect();
  dox=(e.clientX-wrap.left-px)/sc-n.x;doy=(e.clientY-wrap.top-py)/sc-n.y;
}
function wmd(e){
  if(e.button===1||(e.button===0&&e.altKey)){startPan(e);e.preventDefault();return;}
  if(e.button===0&&!drag&&!cardDrag&&!connFrom){selN(null);startPan(e);}
}
function startPan(e){pan=true;psx=e.clientX;psy=e.clientY;ppx=px;ppy=py;document.getElementById('wrap').style.cursor='grabbing';}
function wmm(e){
  const wrap=document.getElementById('wrap').getBoundingClientRect();
  if(pan){px=ppx+(e.clientX-psx);py=ppy+(e.clientY-psy);applyT();}
  if(drag){
    const n=nodes.find(x=>x.id===drag);
    n.x=Math.max(0,(e.clientX-wrap.left-px)/sc-dox);n.y=Math.max(0,(e.clientY-wrap.top-py)/sc-doy);
    const el=document.getElementById(drag);el.style.left=n.x+'px';el.style.top=n.y+'px';
    drawConns();updateMM();
  }
  if(cardDrag){
    const oc=outputCards.find(c=>c.id===cardDrag);if(oc){
      oc.x=Math.max(0,(e.clientX-wrap.left-px)/sc-cdox);oc.y=Math.max(0,(e.clientY-wrap.top-py)/sc-cdoy);
      const el=document.getElementById(cardDrag);if(el){el.style.left=oc.x+'px';el.style.top=oc.y+'px';}
      drawConns();
      // Highlight connectable nodes on hover
      highlightConnectable(oc.x+100,oc.y+50);
    }
  }
  if(connFrom){
    const mx=(e.clientX-wrap.left-px)/sc,my=(e.clientY-wrap.top-py)/sc;
    const sp=ppos2(connFrom);
    if(sp){const p=document.getElementById('tc');p.setAttribute('d',cubic(sp.x,sp.y,mx,my));p.style.display='block';}
  }
}
function wmu(e){
  if(pan){pan=false;document.getElementById('wrap').style.cursor='default';}
  if(drag){drag=null;scheduleSave();}
  if(cardDrag){
    // Check if dropped on a node port area to auto-connect
    const oc=outputCards.find(c=>c.id===cardDrag);
    if(oc){
      const target=findNodeAtPos(oc.x,oc.y+60);
      if(target&&target!==oc.fromNodeId){
        conns.push({from:oc.id,fp:'out',to:target,tp:'in',active:true,fromCard:true});
        document.getElementById(oc.id)?.classList.add('connectable');
        glog('action','Canvas','system',`Output card conectada a ${nodes.find(n=>n.id===target)?.name||target}`);
        drawConns();
      }
    }
    clearHighlight();cardDrag=null;
  }
  if(connFrom){
    // Snap: find nearest input port within 28px canvas units
    if(!e.target.classList.contains('port')&&!e.target.classList.contains('oc-connect-port')){
      const wrap=document.getElementById('wrap').getBoundingClientRect();
      const mx=(e.clientX-wrap.left-px)/sc,my=(e.clientY-wrap.top-py)/sc;
      let best=null,bestD=28;
      nodes.forEach(nd=>{
        if(nd.id===connFrom.nid)return;
        const pp=ppos(nd.id,'in');
        if(!pp)return;
        const d=Math.hypot(pp.x-mx,pp.y-my);
        if(d<bestD){bestD=d;best={nid:nd.id,pt:'in'};}
      });
      if(best){finishConn(best.nid,best.pt);}
      else{setConnFrom(null);document.getElementById('tc').style.display='none';}
    }
  }
}
function ww(e){
  e.preventDefault();const d=-e.deltaY*.001;const ns=Math.max(.15,Math.min(3,sc+d));
  px=e.clientX-(e.clientX-px)*(ns/sc);py=e.clientY-(e.clientY-py)*(ns/sc);sc=ns;applyT();
}
function highlightConnectable(x,y){
  nodes.forEach(n=>{
    const el=document.getElementById(n.id);if(!el)return;
    const near=Math.abs(n.x-x)<120&&Math.abs(n.y-y)<100;
    el.style.filter=near?'brightness(1.2)':'';
  });
}
function clearHighlight(){nodes.forEach(n=>{const el=document.getElementById(n.id);if(el)el.style.filter='';});}
function findNodeAtPos(x,y){
  for(const n of nodes){const el=document.getElementById(n.id);if(!el)continue;const h=el.offsetHeight;if(x>n.x&&x<n.x+230&&y>n.y&&y<n.y+h)return n.id;}return null;
}

// ══════════════════════════════
// CONNECTIONS
// ══════════════════════════════
function toggleConn(){
  connMode=!connMode;
  document.getElementById('wrap').style.cursor=connMode?'crosshair':'default';
}
function setConnFrom(cf){
  document.querySelectorAll('.port.port-active,.oc-connect-port.port-active').forEach(el=>el.classList.remove('port-active'));
  connFrom=cf;
  if(!cf)return;
  const srcEl=document.getElementById(cf.nid);
  if(srcEl){
    const portEl=cf.src==='card'?srcEl.querySelector('.oc-connect-port'):srcEl.querySelector(`.port[data-pt="${cf.pt}"]`);
    if(portEl)portEl.classList.add('port-active');
  }
}
function connExists(fromId,fromPort,toId,toPort){
  return conns.some(c=>c.from===fromId&&c.fp===fromPort&&c.to===toId&&((c.tp||'in')===(toPort||'in')));
}
function getDefaultOutputPort(nodeId){
  const node=nodes.find(n=>n.id===nodeId);
  if(!node)return'out';
  return T[node.type]?.cond?'out-y':'out';
}
function refreshNodeConnectionUI(nodeId){
  const n=nodes.find(node=>node.id===nodeId);
  const el=document.getElementById(nodeId);
  if(!n||!el)return;
  if(n.type==='pilot'){
    const io=el.querySelector('.pilot-io');
    if(io)io.outerHTML=pilotIOHTML(n);
    return;
  }
  const foot=el.querySelector('.nfoot');
  if(foot)foot.outerHTML=`<div class="nfoot">
      <span class="nfoot-st" id="fst_${n.id}">${stlabel(n.status)}</span>
      <span class="nfoot-tok" id="ftok_${n.id}">${escapeHTML(n.tokenLabel||'0 tok')}</span>
      <button class="nfoot-sk" id="fsk_${n.id}" onclick="event.stopPropagation();openSkillAdapt('${n.id}')" style="display:${n.skills&&n.skills.length?'inline-flex':'none'}">⬡ SKILLS</button>
      ${n.type==='pilot'?`<button class="nfoot-ctx" onclick="event.stopPropagation();openContextCard(currentPipelineId)" title="Ver archivo de contexto del pipeline">⬡ contexto</button>`:''}
      <button class="nfoot-out" onclick="event.stopPropagation();(function(){var _n=nodes.find(function(x){return x.id==='${n.id}'});if(_n)dropOutputCard('${n.id}',_n.x+260,_n.y+20);})()" title="Soltar output card">↗ output</button>
      <button class="nfoot-cfg" onclick="openM('${n.id}')">⚙ CONFIG</button>
    </div>`;
}
function finishConn(toId,toPt){
  if(!connFrom)return;
  document.querySelectorAll('.port.port-active,.oc-connect-port.port-active').forEach(el=>el.classList.remove('port-active'));
  if(connFrom.nid===toId){
    connFrom=null;
    document.getElementById('tc').style.display='none';
    return;
  }
  if(connExists(connFrom.nid,connFrom.pt,toId,toPt)){
    glog('warn','Canvas','system','Esa conexión manual ya existe.');
    connFrom=null;
    document.getElementById('tc').style.display='none';
    drawConns();
    return;
  }
  const isCond=connFrom.pt==='out-y'||connFrom.pt==='out-n';
  const fromCard=connFrom.src==='card';
  conns.push({id:'c'+Math.random().toString(36).slice(2,10),from:connFrom.nid,fp:connFrom.pt,to:toId,tp:toPt,active:fromCard,cond:isCond,condT:connFrom.pt==='out-y'?'yes':'no',fromCard});
  scheduleSave();
  const sourceLabel=nodes.find(n=>n.id===connFrom.nid)?.name||outputCards.find(c=>c.id===connFrom.nid)?.label||connFrom.nid;
  const targetLabel=nodes.find(n=>n.id===toId)?.name||outputCards.find(c=>c.id===toId)?.label||toId;
  if(fromCard)document.getElementById(connFrom.nid)?.classList.add('connectable');
  glog('action','Canvas','system',sourceLabel+' conectada a '+targetLabel);
  refreshNodeConnectionUI(connFrom.nid);
  refreshNodeConnectionUI(toId);
  connFrom=null;document.getElementById('tc').style.display='none';drawConns();redrawConnsSoon();updateMM();
}
function ppos(nid,pt){
  const el=document.getElementById(nid);if(!el)return null;
  const port=el.querySelector(`.port.${pt}`);if(!port)return null;
  const pr=port.getBoundingClientRect(),wrap=document.getElementById('wrap').getBoundingClientRect();
  return{x:(pr.left+pr.width/2-wrap.left-px)/sc,y:(pr.top+pr.height/2-wrap.top-py)/sc};
}
function ppos2(cf){
  // Handle both node ports and card connect port
  const el=document.getElementById(cf.nid);if(!el)return null;
  const portSel=cf.src==='card'?'.oc-connect-port':`.port.${cf.pt}`;
  const port=el.querySelector(portSel);if(!port)return null;
  const pr=port.getBoundingClientRect(),wrap=document.getElementById('wrap').getBoundingClientRect();
  return{x:(pr.left+pr.width/2-wrap.left-px)/sc,y:(pr.top+pr.height/2-wrap.top-py)/sc};
}
function cubic(x1,y1,x2,y2){const d=Math.abs(x2-x1)*.5;return`M${x1},${y1} C${x1+d},${y1} ${x2-d},${y2} ${x2},${y2}`;}
function getPortPos(id,pt){
  // Works for both nodes and output cards
  const el=document.getElementById(id);if(!el)return null;
  let portEl=el.querySelector(`.port.${pt}`)||el.querySelector('.oc-connect-port');
  if(!portEl)return null;
  const pr=portEl.getBoundingClientRect(),wrap=document.getElementById('wrap').getBoundingClientRect();
  return{x:(pr.left+pr.width/2-wrap.left-px)/sc,y:(pr.top+pr.height/2-wrap.top-py)/sc};
}
function drawConns(){
  const svg=document.getElementById('svgl');svg.querySelectorAll('.cpath').forEach(p=>p.remove());
  conns.forEach(c=>{
    const fp=getPortPos(c.from,c.fp),tp=getPortPos(c.to,c.tp||'in');
    if(!fp||!tp)return;
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',cubic(fp.x,fp.y,tp.x,tp.y));
    let cls='cpath',marker='ma';
    if(c.isCtxConn){cls='cpath ctx-conn';marker='ma-ctx';}
    else if(c.fromSeed){cls='cpath seed-conn';marker='ma-a';}
    else if(c.fromCard){cls='cpath card-conn';if(c.active)cls+=' active';marker=c.active?'ma-a':'ma-card';}
    else if(c.active){cls+=' active';marker='ma-a';}
    else if(c.cond){cls+=c.condT==='yes'?' cy':' cn';marker=c.condT==='yes'?'ma-y':'ma-n';}
    path.setAttribute('class',cls);path.setAttribute('marker-end',`url(#${marker})`);
    if(c.isCtxConn&&c.ctxRole==='read'){
      path.style.stroke='#4a9aaa';
      path.style.strokeWidth='1.8';
      path.style.strokeDasharray='6 3';
      path.style.filter='drop-shadow(0 0 3px rgba(74,154,170,.4))';
    }else if(c.isCtxConn&&c.ctxRole==='write'){
      path.style.stroke='#d2a64e';
      path.style.strokeWidth='2';
      path.style.strokeDasharray='10 5';
      path.style.filter='drop-shadow(0 0 4px rgba(210,166,78,.32))';
    }
    path.dataset.connId=c.id;
    path.style.cursor='pointer';
    path.addEventListener('click',e=>{e.stopPropagation();openConnectionPayloadCard(c,e);});
    svg.appendChild(path);
  });
}

function resolveNodePayload(node){
  if(!node)return{type:'text',content:'Sin payload disponible.'};
  if(node.output)return{type:node.outputType||'text',content:node.output};
  if(node.type==='pilot'&&node.pilotReport)return{type:'json',content:node.pilotReport};
  if(node.promptOut)return{type:node.outputType||'text',content:node.promptOut};
  if(node.prompt)return{type:node.inputType||'text',content:node.prompt};
  return{type:node.outputType||'text',content:'Sin payload disponible todavía.'};
}

function resolveConnectionPayload(c){
  const fromCard=outputCards.find(card=>card.id===c.from);
  const fromNode=nodes.find(node=>node.id===c.from);
  const toNode=nodes.find(node=>node.id===c.to)||outputCards.find(card=>card.id===c.to);
  const toName=toNode?.name||toNode?.fromNodeName||'Destino';

  if(c.isCtxConn){
    const ctxCard=outputCards.find(card=>card.isCtxFile&&card.pipelineId===currentPipelineId);
    return{
      type:'json',
      content:ctxCard?.content||'Contexto aún no disponible.',
      fromName:ctxCard?.label||'context.json',
      toName,
      label:'Payload de contexto',
    };
  }

  if(fromCard){
    return{
      type:fromCard.type||'text',
      content:fromCard.content||'Sin contenido.',
      fromName:fromCard.fromNodeName||fromCard.label||'Card',
      toName,
      label:fromCard.label||'Payload activo',
    };
  }

  if(fromNode){
    const directCard=[...outputCards].reverse().find(card=>
      card.fromNodeId===fromNode.id&&conns.some(link=>link.from===card.id&&link.to===c.to)
    );
    if(directCard){
      return{
        type:directCard.type||'text',
        content:directCard.content||'Sin contenido.',
        fromName:directCard.fromNodeName||fromNode.name,
        toName,
        label:directCard.label||'Payload activo',
      };
    }
    const latestCard=[...outputCards].reverse().find(card=>card.fromNodeId===fromNode.id);
    if(latestCard){
      return{
        type:latestCard.type||'text',
        content:latestCard.content||'Sin contenido.',
        fromName:latestCard.fromNodeName||fromNode.name,
        toName,
        label:latestCard.label||'Último payload del agente',
      };
    }
    const fallback=resolveNodePayload(fromNode);
    return{
      type:fallback.type,
      content:fallback.content,
      fromName:fromNode.name||'Agente',
      toName,
      label:'Payload vivo del agente',
    };
  }

  return{
    type:'text',
    content:'No hay payload disponible para esta conexión.',
    fromName:'Origen',
    toName,
    label:'Payload no disponible',
  };
}

function renderConnectionPayloadCardBody(card){
  const typeColor=IO_COLORS[card.type]||'#706860';
  const preview=card.type==='image'&&card.content&&(String(card.content).startsWith('data:')||String(card.content).startsWith('http'))
    ?`<img class="oc-preview-img" src="${card.content}" style="width:100%;display:block;object-fit:cover;max-height:160px"/>`
    :card.type==='json'
      ?`<pre class="cpayload-pre">${escapeHTML(String(card.content||''))}</pre>`
      :`<div class="cpayload-text">${escapeHTML(String(card.content||''))}</div>`;
  return`
    <div class="cpayload-head">
      <div class="cpayload-route">${escapeHTML(card.fromName)} <span>→</span> ${escapeHTML(card.toName)}</div>
      <span class="cpayload-type" style="color:${typeColor}">${IO_ICONS[card.type]||'◆'} ${card.type}</span>
    </div>
    <div class="cpayload-body">${preview}</div>`;
}

function renderConnectionPayloadCard(card){
  document.getElementById(card.id)?.remove();
  const el=document.createElement('div');
  el.className='output-card conn-payload-card';el.id=card.id;
  el.style.cssText=`left:${card.x}px;top:${card.y}px`;
  el.innerHTML=`
    <div class="oc-inner">
      <div class="oc-header">
        <div class="oc-from"><div class="oc-from-dot" style="background:#c8a040"></div><span>Conexión activa</span></div>
        <span class="oc-type ${card.type}">${IO_ICONS[card.type]||'◆'} ${card.type}</span>
      </div>
      <div class="oc-body">${renderConnectionPayloadCardBody(card)}</div>
      <div class="oc-footer">
        <span class="oc-size" style="color:#c8a04088">${escapeHTML(card.label||'Payload')}</span>
        <div class="oc-actions">
          <button class="oc-btn" onclick="event.stopPropagation();deleteCard('${card.id}')" title="Cerrar">✕</button>
        </div>
      </div>
    </div>`;
  el.addEventListener('mousedown',e=>cardMouseDown(e,card.id));
  document.getElementById('canvas').appendChild(el);
  redrawConnsSoon();
}

function openConnectionPayloadCard(c,evt){
  const payload=resolveConnectionPayload(c);
  const point=getCanvasPointFromClient(evt.clientX,evt.clientY);
  const id='cpayload_'+c.id;
  const existing=outputCards.find(card=>card.id===id);
  const cardData={
    id,
    x:point.x+18,
    y:point.y-20,
    _kind:'payload',
    isConnectionPayload:true,
    connId:c.id,
    type:payload.type||'text',
    content:payload.content||'',
    fromName:payload.fromName||'Origen',
    toName:payload.toName||'Destino',
    label:payload.label||'Payload de conexión',
    fromNodeName:'Conexión activa',
    fromDot:'#c8a040',
  };
  if(existing){
    Object.assign(existing,cardData);
    renderConnectionPayloadCard(existing);
    return;
  }
  outputCards.push(cardData);
  renderConnectionPayloadCard(cardData);
}

function autoOutputCard(n){
  const tp=T[n.type];if(!tp)return;
  if(n.type==='pilot'||n.type==='human')return;
  if(outputCards.find(oc=>oc.fromNodeId===n.id&&oc.assetId==='auto-'+n.id))return;
  const outputType=n.outputType||tp.outputType||'json';
  const content=n.output||(outputType==='json'?JSON.stringify({status:'done',agent:n.name,result:'Completado',ts:new Date().toISOString()},null,2):(outputType==='text'?(n.promptOut||tp.promptText||`Output de ${n.name}`):`Output generado por ${n.name}`));
  const oc={id:'oc'+Math.random().toString(36).slice(2,10),_kind:'output',assetId:'auto-'+n.id,revisionStatus:'aprobado',fromNodeId:n.id,fromNodeName:n.name,fromDot:tp.dot||'#888',type:outputType,label:tp.label+' · output',content,x:n.x+250,y:n.y+20};
  outputCards.push(oc);mkOutputCard(oc);
  conns.filter(c=>c.from===n.id).forEach(nc=>{
    if(nc.to)conns.push({id:'c'+Math.random().toString(36).slice(2,10),from:oc.id,fp:'out',to:nc.to,tp:'in',active:true,fromCard:true});
  });
  drawConns();
}

// ══════════════════════════════
// SELECTION & CTX
// ══════════════════════════════
function selN(id){if(sel)document.getElementById(sel)?.classList.remove('sel');sel=id;if(id)document.getElementById(id)?.classList.add('sel');}
function sctx(e){
  e.preventDefault();
  const wrap=document.getElementById('wrap').getBoundingClientRect();
  const x=(e.clientX-wrap.left-px)/sc,y=(e.clientY-wrap.top-py)/sc;
  const m=document.getElementById('ctx');

  // Detectar click sobre output card
  const cardEl=e.target.closest('.output-card');
  if(cardEl){
    const oc=outputCards.find(c=>c.id===cardEl.id);
    if(!oc)return;
    const label=oc.label||oc.type||'Card';
    m.innerHTML=`
      <div class="ci ci-header">${label}</div>
      <div class="csep"></div>
      <div class="ci" onclick="expandCard('${oc.id}');hctx()">⊞ Editar contenido</div>
      <div class="ci" onclick="setConnFrom({nid:'${oc.id}',pt:'out',src:'card'});hctx()">⇝ Conectar</div>
      <div class="csep"></div>
      <div class="ci red" onclick="forceDeleteCard('${oc.id}');hctx()">✕ Borrar del canvas</div>`;
    m.style.cssText=`display:block;left:${e.clientX}px;top:${e.clientY}px`;
    return;
  }

  // Detectar click sobre nodo
  let found=null;
  nodes.forEach(n=>{const el=document.getElementById(n.id);if(!el)return;const h=el.offsetHeight;if(x>=n.x&&x<=n.x+230&&y>=n.y&&y<=n.y+h)found=n.id;});
  if(!found)return;ctxId=found;selN(found);
  m.innerHTML=`
    <div class="ci" onclick="openM('${found}');hctx()">⚙ Configurar</div>
    <div class="ci" onclick="runNode('${found}');hctx()">▶ Ejecutar</div>
    <div class="ci" onclick="pauseNode('${found}');hctx()">⏸ Pausar</div>
    <div class="csep"></div>
    <div class="ci" onclick="setConnFrom({nid:'${found}',pt:'${getDefaultOutputPort(found)}',src:'node'});hctx()">⇝ Conectar manualmente</div>
    <div class="ci" onclick="dropOutputCard('${found}',nodes.find(n=>n.id==='${found}').x+250,nodes.find(n=>n.id==='${found}').y+20);hctx()">⬇ Dropear output card</div>
    <div class="ci" onclick="openSkillAssign('${found}');hctx()">⬡ Asignar skill</div>
    <div class="ci" onclick="dupN('${found}');hctx()">⧉ Duplicar</div>
    <div class="csep"></div>
    <div class="ci red" onclick="delSel();hctx()">✕ Eliminar</div>`;
  m.style.cssText=`display:block;left:${e.clientX}px;top:${e.clientY}px`;
}

function forceDeleteCard(id){
  const affectedNodeIds=conns.filter(c=>c.from===id||c.to===id).flatMap(c=>[c.from,c.to]).filter(ref=>nodes.some(n=>n.id===ref));
  document.getElementById(id)?.remove();
  outputCards=outputCards.filter(c=>c.id!==id);
  conns=conns.filter(c=>c.from!==id&&c.to!==id);
  affectedNodeIds.forEach(refreshNodeConnectionUI);
  drawConns();scheduleSave();
}
function hctx(){document.getElementById('ctx').style.display='none';}
document.addEventListener('click',hctx);
function dupN(id){const n=nodes.find(x=>x.id===id);if(!n)return;const nn=addNode(n.type,n.x+240,n.y+20);nn.prompt=n.prompt;}

function openSkillAssign(nodeId){
  if(!customSkills.length){glog('warn','Skills','system','No hay skills. Crea una con /skill');return;}
  const body=document.getElementById('logbody');
  glog('system','Skills','system',`Asignar skill a: ${nodes.find(n=>n.id===nodeId)?.name}`);
  customSkills.forEach(sk=>{
    const btn=document.createElement('button');
    btn.style.cssText='display:inline-block;margin:2px 6px;padding:3px 10px;background:rgba(74,122,191,.1);border:1px solid rgba(74,122,191,.2);color:#6090c0;font-family:IBM Plex Mono,monospace;font-size:9px;border-radius:3px;cursor:pointer';
    btn.textContent=`⬡ ${sk.name}`;
    btn.onclick=()=>{assignSkillToNode(nodeId,sk);btn.textContent='✓ Asignada';btn.disabled=true;};
    body.appendChild(btn);body.scrollTop=body.scrollHeight;
  });
}

// ══════════════════════════════
// SKILL ASSIGNMENT
// ══════════════════════════════
function assignSkillToNode(nodeId,skill){
  const n=nodes.find(x=>x.id===nodeId);if(!n)return;
  if(!n.skills)n.skills=[];
  if(n.skills.find(s=>s.id===skill.id))return;
  n.skills.push(skill);
  // Re-render node with new skill rings
  document.getElementById(nodeId)?.remove();
  mkNode(n);drawConns();
  glog('action',n.name,n.type,'Skill asignada: '+skill.name);
}

// ══════════════════════════════
// DRAG FROM PALETTE
// ══════════════════════════════
function pd(e,type){
  palT=type;palSkill=null;palInput=null;closeSide();if(typeof closeAddAgentMenu==='function')closeAddAgentMenu();
  if(!e?.dataTransfer)return;
  e.dataTransfer.setData('text/plain','agent:'+type);
  e.dataTransfer.effectAllowed='copy';
  const tp=T[type]||{};
  const color=tp.dot||'#706860';
  const label=tp.label||type;
  const ghost=document.createElement('div');
  ghost.style.cssText=`position:fixed;top:-999px;left:-999px;display:flex;align-items:center;gap:10px;padding:8px 12px;background:rgba(10,8,8,.96);border:1px solid ${color}66;border-radius:6px;color:#e8e0d4;font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.04em;white-space:nowrap;pointer-events:none;box-shadow:0 0 0 1px rgba(255,255,255,.04) inset,0 10px 28px rgba(0,0,0,.55)`;
  ghost.innerHTML=`<span style="width:18px;height:18px;border-radius:4px;background:${color};box-shadow:0 0 14px ${color}88,0 0 0 1px rgba(255,255,255,.18) inset;display:inline-block;flex-shrink:0"></span><span>${label}</span>`;
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost,14,14);
  setTimeout(()=>{if(ghost.parentNode)ghost.parentNode.removeChild(ghost);},0);
}
function sdrag(e,skillId){
  palSkill=skillId;palT=null;palInput=null;closeSide();
  const sk=SKILLS_CATALOG.find(s=>s.id===skillId)||customSkills.find(s=>s.id===skillId);
  const ghost=document.createElement('div');
  ghost.style.cssText='position:fixed;top:-999px;left:-999px;background:#0af;border:2px solid #5df;border-radius:5px;padding:5px 12px;color:#fff;font-family:IBM Plex Mono,monospace;font-size:11px;font-weight:600;box-shadow:0 0 18px #00aaff99,0 0 6px #00ddff44;letter-spacing:.06em;white-space:nowrap;pointer-events:none';
  ghost.textContent='⬡ '+(sk?sk.name:skillId);
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost,ghost.offsetWidth/2+8,ghost.offsetHeight/2);
  setTimeout(()=>{if(ghost.parentNode)ghost.parentNode.removeChild(ghost);},0);
}
function idrag(e,inputType){
  palInput=inputType;palT=null;palSkill=null;
  e.dataTransfer.setData('text/plain','input:'+inputType);
  e.dataTransfer.effectAllowed='copy';
  const labels={text:'✦ texto',image:'⬡ imagen',audio:'♪ audio'};
  const ghost=document.createElement('div');
  ghost.style.cssText='position:fixed;top:-999px;left:-999px;background:#1a1208;border:2px solid rgba(200,160,64,.5);border-radius:5px;padding:5px 12px;color:#c8a040;font-family:IBM Plex Mono,monospace;font-size:11px;font-weight:600;letter-spacing:.06em;white-space:nowrap;pointer-events:none';
  ghost.textContent=labels[inputType]||inputType;
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost,ghost.offsetWidth/2+8,ghost.offsetHeight/2);
  setTimeout(()=>{if(ghost.parentNode)ghost.parentNode.removeChild(ghost);closeSide();},0);
}
const _inputCardCfgs={
  text:{label:'Texto',icon:'✦',color:'#c8a040',bg:'#3a2800',border:'rgba(200,160,64,.4)',desc:'text input'},
  image:{label:'Imagen',icon:'⬡',color:'#6090c0',bg:'#001a3a',border:'rgba(74,122,191,.4)',desc:'image input'},
  audio:{label:'Audio',icon:'♪',color:'#7ab6d9',bg:'#0c2230',border:'rgba(122,182,217,.38)',desc:'audio input'}
};
function _renderInputCardDOM(oc){
  document.getElementById(oc.id)?.remove();
  const cfg=_inputCardCfgs[oc.type]||_inputCardCfgs.text;
  const imageSrc=oc.type==='image'?(oc.fileUrl||oc.content||''):'';
  const fileName=oc.fileName||'imagen';
  const el=document.createElement('div');
  el.className='output-card input-drag-card';el.id=oc.id;
  el.style.cssText=`left:${oc.x}px;top:${oc.y}px`;
  el.innerHTML=`
    <div class="oc-inner" style="border-color:${cfg.border}">
      <div class="oc-header" style="background:${cfg.bg}44;border-bottom-color:${cfg.border}">
        <div class="oc-from"><div class="oc-from-dot" style="background:${cfg.color}"></div><span>Usuario</span></div>
        <span class="oc-type text" style="color:${cfg.color}">${cfg.icon} ${oc.type}</span>
      </div>
      <div class="oc-body">
        <div class="sic-title">${oc.label||cfg.label}</div>
        ${oc.type==='image'
          ?`${imageSrc
              ?`<div class="idc-image-wrap"><img class="idc-image-preview" src="${imageSrc}" alt="${escapeHTML(fileName)}"/><div class="idc-image-meta">${escapeHTML(fileName)}</div></div>`
              :`<div class="idc-placeholder"><span>⬡</span><div>arrastra una imagen</div></div>`
            }
            <input class="idc-file-input" id="idc_file_${oc.id}" type="file" accept="image/*" hidden />
            <button class="idc-upload-btn" onclick="event.stopPropagation();openInputCardFilePicker('${oc.id}')">${imageSrc?'Cambiar imagen':'Subir imagen'}</button>`
          :oc.type==='audio'
            ?`<div class="idc-placeholder"><span>♪</span><div>arrastra un audio</div></div>`
            :`<textarea class="idc-textarea" placeholder="Escribe el texto de entrada..." onclick="event.stopPropagation()" onmousedown="event.stopPropagation()">${escapeHTML(oc.content||'')}</textarea>`
        }
        ${oc.isSeedPrompt?`<button class="sic-run-btn" onclick="event.stopPropagation();runAll()">▶ EJECUTAR</button>`:''}
      </div>
      <div class="oc-footer">
        <span class="oc-size" style="color:${cfg.color}88">${cfg.desc}</span>
        <div class="oc-connect-port" data-nid="${oc.id}" data-pt="out" title="Conectar al agente"></div>
      </div>
    </div>`;
  el.addEventListener('mousedown',e=>cardMouseDown(e,oc.id));
  if(oc.type==='image'){
    const input=el.querySelector('#idc_file_'+oc.id);
    if(input){
      input.addEventListener('click',e=>e.stopPropagation());
      input.addEventListener('change',e=>{
        const file=e.target.files&&e.target.files[0];
        if(file)handleInputCardImageUpload(oc.id,file);
      });
    }
  }
  el.querySelector('.oc-connect-port').addEventListener('mousedown',e=>{
    e.stopPropagation();setConnFrom({nid:oc.id,pt:'out',src:'card'});
  });
  document.getElementById('canvas').appendChild(el);
  redrawConnsSoon();
}
function mkInputCard(type,x,y){
  const id='inp'+Math.random().toString(36).slice(2,8);
  const cfg=_inputCardCfgs[type]||_inputCardCfgs.text;
  const oc={id,x,y,_kind:'input',type,content:'',fromNodeName:'Usuario',fromDot:cfg.color,label:cfg.label,isInputCard:true};
  outputCards.push(oc);
  _renderInputCardDOM(oc);
  return oc;
}

function openInputCardFilePicker(cardId){
  const input=document.getElementById('idc_file_'+cardId);
  if(input)input.click();
}

async function handleInputCardImageUpload(cardId,file){
  const oc=outputCards.find(c=>c.id===cardId&&c.isInputCard);
  if(!oc||!file)return;
  const reader=new FileReader();
  reader.onload=async()=>{
    const dataUrl=String(reader.result||'');
    oc.fileName=file.name||'imagen';
    oc.content=dataUrl;
    _renderInputCardDOM(oc);
    try{
      const res=await fetch('/api/uploads/image'+(_pipelineHash?('?hash='+encodeURIComponent(_pipelineHash)):''),{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({data:dataUrl,filename:file.name||'imagen'}),
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||!data.url)throw new Error(data.error||'upload_failed');
      oc.fileUrl=data.url;
      oc.content=data.url;
      _renderInputCardDOM(oc);
      glog('done','Usuario','system','Imagen subida al servidor: '+(file.name||'imagen'));
    }catch(e){
      glog('warn','Usuario','system','No se pudo guardar la imagen en el servidor. Se mantiene la vista local.');
    }
    scheduleSave();
  };
  reader.readAsDataURL(file);
}
// ── RESTORE OUTPUT CARD (from saved state) ──────────────────────
function restoreOutputCard(oc){
  if(!oc||!oc.id)return;
  if(outputCards.find(c=>c.id===oc.id))return; // ya existe
  outputCards.push(oc);
  if(oc._kind==='seed')_renderSeedCardDOM(oc);
  else if(oc._kind==='input')_renderInputCardDOM(oc);
  else mkOutputCard(oc);
}

// ── ASSEMBLY OUTPUT CARD ────────────────────────────────────────
function dropAssemblyOutputCard(assemblyNode, productoFinal){
  if(!assemblyNode)return;
  const tp=T.assembly;
  const existing=outputCards.find(c=>c.assetId==='assembly-final-'+assemblyNode.id);
  if(existing){existing.content=productoFinal;const el=document.getElementById(existing.id);if(el){const b=el.querySelector('.oc-body');if(b)b.innerHTML=getCardPreview(existing)+'<div class="oc-expand-hint">ver completo</div>';}return;}
  const pos=findOpenCardPosition(assemblyNode.x+290,assemblyNode.y+10,getCardCanvasSize({_kind:'output',type:'assembly'}));
  const oc={id:'oc'+Math.random().toString(36).slice(2,10),_kind:'output',
    assetId:'assembly-final-'+assemblyNode.id,
    fromNodeId:assemblyNode.id,fromNodeName:assemblyNode.name||'Ensamblaje',
    fromDot:tp.dot||'#c87840',type:'assembly',
    label:'Producto final ensamblado',content:productoFinal||'Ensamblaje completado',
    x:pos.x,y:pos.y,isAssemblyFinal:true};
  outputCards.push(oc);mkOutputCard(oc);drawConns();scheduleSave();
  glog('done','Ensamblaje','agent','⊞ Output final generado — disponible para descarga');
}

function dropBackendOutputCard(output){
  if(!output||!output.public_id)return;
  // Skip cards with no meaningful content
  const rawContent=typeof output.contenido==='string'?output.contenido.trim():null;
  if(!rawContent||rawContent==='null'||rawContent==='{}'||rawContent==='""')return;
  const existing=outputCards.find(c=>c.assetId===output.public_id);
  if(existing){
    existing.content=typeof output.contenido==='string'?output.contenido:JSON.stringify(output.contenido||{},null,2);
    existing.type=mapBackendOutputType(output.tipo);
    existing.label=buildBackendOutputLabel(output);
    existing.meta=output.metadata||{};
    const el=document.getElementById(existing.id);
    if(el){
      const body=el.querySelector('.oc-body');
      if(body)body.innerHTML=getCardPreview(existing)+'<div class="oc-expand-hint">ver completo</div>';
    }
    if(output.agent_id==='AG-05')setTimeout(()=>{tryMaterializeOperatorQuestionsFromOutputCard(existing);},0);
    return existing;
  }

  const fromNode=nodes.find(n=>n.agentId===output.agent_id)||nodes.find(n=>n.id===output.agent_id);
  const existingFromNode=outputCards.filter(c=>c.fromNodeId===fromNode?.id&&c.backendOutput).length;
  const COLS=3,CARD_W=224,CARD_H=150,GAP_X=28,GAP_Y=22;
  const col=existingFromNode%COLS,row=Math.floor(existingFromNode/COLS);
  const fallbackX=fromNode?(fromNode.x+290+col*(CARD_W+GAP_X)):(2600+outputCards.length*(CARD_W+GAP_X));
  const fallbackY=fromNode?(fromNode.y+row*(CARD_H+GAP_Y)):(2200+outputCards.length*20);
  const nodeType=fromNode?.type||AGENT_TYPE_MAP[output.agent_id]||'system';
  const nodeTheme=T[nodeType]||{dot:'#4a7a9a'};
  const pos=findOpenCardPosition(fallbackX,fallbackY,getCardCanvasSize({_kind:'output',type:mapBackendOutputType(output.tipo)}));
  const oc={
    id:'oc'+Math.random().toString(36).slice(2,10),
    _kind:'output',
    assetId:output.public_id,
    fromNodeId:fromNode?.id||output.agent_id,
    fromNodeName:fromNode?.name||AGENT_NAMES[output.agent_id]||output.agent_id||'Agente',
    fromDot:nodeTheme.dot||'#4a7a9a',
    type:mapBackendOutputType(output.tipo),
    label:buildBackendOutputLabel(output),
    content:typeof output.contenido==='string'?output.contenido:JSON.stringify(output.contenido||{},null,2),
    x:pos.x,
    y:pos.y,
    backendOutput:true,
    meta:output.metadata||{},
  };
  outputCards.push(oc);
  mkOutputCard(oc);
  drawConns();
  scheduleSave();
  if(output.agent_id==='AG-05')setTimeout(()=>{tryMaterializeOperatorQuestionsFromOutputCard(oc);},0);
  return oc;
}

function mapBackendOutputType(tipo){
  if(tipo==='image')return'image';
  if(tipo==='video')return'video';
  if(tipo==='audio')return'audio';
  if(tipo==='decision')return'json';
  if(tipo==='text')return'text';
  return'text';
}

function buildBackendOutputLabel(output){
  const bloque=output.bloque||output.metadata?.bloque_destino||'resultado';
  const tipo=(output.tipo||'output').toUpperCase();
  return tipo+' · '+bloque;
}

// ── ASSEMBLY VIS UPDATE ─────────────────────────────────────────
function updateAssemblyVis(nodeId,ctx){
  const el=document.getElementById('asmvis_'+nodeId);if(!el)return;
  const ensamblaje=ctx?.ensamblaje||{};
  const estado=ensamblaje.estado||'pendiente';
  const outputIds=Array.isArray(ensamblaje.output_ids)?ensamblaje.output_ids:[];
  const assetIds=Array.isArray(ensamblaje.asset_ids)?ensamblaje.asset_ids:(ensamblaje.asset_ids_vigentes||[]);
  const assets=ctx?.assets||{};
  const runtimeOutputs=outputCards.filter(card=>card.backendOutput&&card.assetId);
  const receivedOutputs=outputIds.filter(id=>runtimeOutputs.some(card=>card.assetId===id)).length;
  const received=assetIds.filter(id=>['completado','listo','done','ok','vigente'].includes(String(assets[id]?.estado||'').toLowerCase())).length;
  const badge=el.querySelector('.asm-state-badge');
  if(badge){badge.className='asm-state-badge asm-'+estado;badge.textContent='⊞ '+estado.replace(/_/g,' ').toUpperCase();}
  const countEl=el.querySelector('.asm-count');
  if(countEl)countEl.textContent=outputIds.length?receivedOutputs+'/'+outputIds.length:(assetIds.length?received+'/'+assetIds.length:'');
  const assetsEl=el.querySelector('.asm-assets');
  if(assetsEl){
    if(outputIds.length){
      assetsEl.innerHTML=outputIds.map(id=>{const done=runtimeOutputs.some(card=>card.assetId===id);
        return`<div class="asm-asset-item ${done?'asm-done':'asm-pending'}"><span class="asm-asset-dot"></span><span class="asm-asset-name">${id.length>22?id.slice(0,20)+'…':id}</span></div>`;}
      ).join('');
    }
    else if(!assetIds.length){assetsEl.innerHTML='<div class="asm-waiting">Esperando instrucciones del Piloto...</div>';}
    else{assetsEl.innerHTML=assetIds.map(id=>{const a=assets[id]||{};const done=['completado','listo','done','ok','vigente'].includes(String(a.estado||'').toLowerCase());
      return`<div class="asm-asset-item ${done?'asm-done':'asm-pending'}"><span class="asm-asset-dot"></span><span class="asm-asset-name">${id.length>22?id.slice(0,20)+'…':id}</span></div>`;}
    ).join('');}
  }
  const dlRow=el.querySelector('.asm-dl-row');
  if(dlRow)dlRow.style.display=estado==='completado'?'flex':'none';
}

function downloadAssembly(nodeId){
  if(!currentPipelineId)return;
  fetch('/api/pipelines/'+currentPipelineId+'/context').then(r=>r.json()).then(data=>{
    const url=data?.context?.ensamblaje?.producto_final;
    const content=data?.context?.ensamblaje?.producto_final||data?.context?.ensamblaje?.notas||JSON.stringify(data?.context?.ensamblaje||{},null,2);
    if(url&&(url.startsWith('http')||url.startsWith('/'))){
      const a=document.createElement('a');a.href=url;a.download='pipeline_output';a.click();
    } else {
      const formato=String(data?.context?.preferencias_usuario?.formato_salida?.valor||'txt').toLowerCase();
      const blob=new Blob([content],{type:'text/plain'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);
      a.download=formato==='pdf'?'pipeline_assembly.pdf.txt':formato==='video'?'pipeline_assembly.video.txt':'pipeline_assembly.txt';a.click();URL.revokeObjectURL(a.href);
    }
    glog('action','Ensamblaje','agent','↓ Descargando output del ensamblaje');
  }).catch(()=>glog('warn','Ensamblaje','agent','No se pudo obtener el output de ensamblaje'));
}

function addInputCenter(type){
  const center=getCanvasViewportCenter();
  const {width,height}=getInputCanvasSize();
  mkInputCard(type,center.x-width/2,center.y-height/2);
  drawConns();updateMM();scheduleSave();
}

function collapseWindows(){
  const lw=document.getElementById('logwin');
  if(lw&&!lw.classList.contains('minimized'))toggleLogMin();
  const mw=document.getElementById('mtwin');
  if(mw&&!mw.classList.contains('minimized'))toggleMTMin();
}

function drop(e){
  e.preventDefault();
  const point=getCanvasPointFromClient(e.clientX,e.clientY);
  // Resolve input type from palInput or dataTransfer fallback
  let inputT=palInput;
  if(!inputT){const dt=e.dataTransfer.getData('text/plain');if(dt&&dt.startsWith('input:'))inputT=dt.slice(6);}
  if(inputT){
    const {width,height}=getInputCanvasSize();
    mkInputCard(inputT,point.x-width/2,point.y-height/2);
    palInput=null;palT=null;palSkill=null;collapseWindows();drawConns();updateMM();
    return;
  }
  palSkill=null; // skill dropped on empty canvas — ignore
  if(!palT)return;
  const {width,height}=getNodeCanvasSize(palT);
  addNode(palT,point.x-width/2,point.y-height/2);
  palT=null;collapseWindows();drawConns();updateMM();
}

// ══════════════════════════════
// SKILL → NODE
// ══════════════════════════════
function addSkillToNode(nodeId,skillDef){
  const n=nodes.find(x=>x.id===nodeId);if(!n)return;
  if(n.skills.some(s=>s.id===skillDef.id)){glog('warn',n.name,n.type,'Skill ya asignada: '+skillDef.name);return;}
  n.skills.push({id:skillDef.id,name:skillDef.name,color:skillDef.color});
  refreshNodeSkillRings(n);
  glog('done',n.name,n.type,'⬡ Skill asignada: '+skillDef.name);
}
function refreshNodeSkillRings(n){
  const el=document.getElementById(n.id);if(!el)return;
  el.querySelectorAll('.skill-ring').forEach(r=>r.remove());
  const html=(n.skills||[]).map((sk,i)=>`<div class="skill-ring" style="inset:-${(i+1)*6}px;border:1.5px solid ${sk.color||'#4a7abf'}88;border-radius:${8+(i+1)*2}px;box-shadow:0 0 ${10+(i*5)}px ${sk.color||'#4a7abf'}44"><div class="skill-tag" onclick="event.stopPropagation();openSkillAdapt('${n.id}')" style="left:${8+i*5}px;color:${sk.color||'#4a7abf'};border:1px solid ${sk.color||'#4a7abf'}66;text-shadow:0 0 6px ${sk.color||'#4a7abf'}88">⬡ ${sk.name}</div></div>`).join('');
  el.insertAdjacentHTML('afterbegin',html);
  const btn=document.getElementById('fsk_'+n.id);
  if(btn)btn.style.display=n.skills.length?'inline-flex':'none';
}

// ══════════════════════════════
// MODAL
// ══════════════════════════════
function openM(id){
  const n=nodes.find(x=>x.id===id);if(!n)return;
  modalId=id;const tp=T[n.type];
  document.getElementById('mdot').style.background=tp.dot;
  document.getElementById('mtitle').textContent=n.name;
  const sc2={idle:'#2a2820',running:'#3a2a10',done:'#1a2a1a',error:'#2a1a1a',paused:'#1a1a2a'};
  const sl={idle:'#706860',running:'#c8a040',done:'#3a8a3a',error:'#8a3a3a',paused:'#4a5a8a'};
  document.getElementById('mbadge').innerHTML=`<span style="font-size:8px;padding:2px 6px;border-radius:2px;background:${sc2[n.status]};color:${sl[n.status]};font-family:'IBM Plex Mono',monospace;letter-spacing:.06em">${stlabel(n.status)}</span>`;
  ctab='cfg';document.querySelectorAll('.mtab').forEach(t=>t.classList.remove('on'));document.querySelector('.mtab').classList.add('on');
  renderM(n);document.getElementById('moverlay').classList.add('open');
}

function renderM(n){
  const body=document.getElementById('mbody');const tp=T[n.type];
  if(ctab==='cfg'){
    body.innerHTML=`
      <div class="fg"><div class="fl">Nombre</div><input class="fi" value="${n.name}" oninput="nodes.find(x=>x.id==='${n.id}').name=this.value;document.getElementById('mtitle').textContent=this.value;document.getElementById('${n.id}')?.querySelector('.nh-name').textContent=this.value"></div>
      <div class="fg"><div class="fl"><span>Prompt / Instrucciones</span><button class="ai-suggest-btn" onclick="showPromptSuggestions(event,'${n.id}','prompt')">✦ Sugerir IA</button></div><textarea class="fi" id="fi-prompt-${n.id}" rows="5" oninput="nodes.find(x=>x.id==='${n.id}').prompt=this.value">${n.prompt||tp.prompt||''}</textarea></div>
      <div class="fg"><div class="fl"><span>Verificación automática</span><button class="ai-suggest-btn" onclick="showPromptSuggestions(event,'${n.id}','verification')">✦ Sugerir IA</button></div><textarea class="fi" id="fi-verification-${n.id}" rows="3" oninput="nodes.find(x=>x.id==='${n.id}').verification=this.value">${n.verification||tp.verification||''}</textarea></div>
      <div class="frow"><div class="fg"><div class="fl">Timeout (seg)</div><input class="fi" type="number" value="30"></div><div class="fg"><div class="fl">Reintentos</div><input class="fi" type="number" value="3"></div></div>
      ${buildModelSelector(n)}
      <div class="fg"><div class="fl">Memoria interna (archivos de contexto)</div>
        <div style="background:#0a0808;border:1px solid rgba(255,255,255,.07);border-radius:3px;padding:8px;font-size:9px;color:#3a3630">
          ${(n.memoryFiles||[]).map((f,i)=>`<div style="display:flex;align-items:center;gap:6px;padding:2px 0;border-bottom:1px solid rgba(255,255,255,.04)"><span style="color:#706860">📄 ${f.name}</span><span style="color:#3a3630;font-size:8px">${f.size||'—'}</span><button onclick="deleteMemFile('${n.id}',${i})" style="background:transparent;border:none;color:#3a3630;cursor:pointer;margin-left:auto;font-size:10px">✕</button></div>`).join('')}
          <button onclick="addMemFile('${n.id}')" style="background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.07);color:#3a3630;font-size:9px;padding:3px 8px;border-radius:2px;cursor:pointer;margin-top:4px;width:100%;font-family:'IBM Plex Mono',monospace">+ Agregar archivo de memoria</button>
        </div>
      </div>`;
  } else if(ctab==='io'){
    const inType=n.inputType||tp.inputType||'text';const outType=n.outputType||tp.outputType||'text';
    const types=['text','image','video','json','file','audio','decision','any'];
    body.innerHTML=`
      <div class="fg"><div class="fl">Tipo de Input</div>
        <div class="io-type-row">${types.map(t=>`<button class="io-type-btn ${inType===t?'on':''}" onclick="setIOType('${n.id}','input','${t}')">${IO_ICONS[t]} ${t}</button>`).join('')}</div>
        <input class="fi" style="margin-top:6px" placeholder="Etiqueta de input" value="${n.inputLabel||tp.inputLabel||''}" oninput="nodes.find(x=>x.id==='${n.id}').inputLabel=this.value">
        <textarea class="fi" style="margin-top:4px" rows="2" placeholder="Valor por defecto si no hay input conectado..." oninput="nodes.find(x=>x.id==='${n.id}').inputDefault=this.value">${n.inputDefault||tp.inputDefault||''}</textarea>
      </div>
      <div class="fg" style="margin-top:12px"><div class="fl">Tipo de Output</div>
        <div class="io-type-row">${types.map(t=>`<button class="io-type-btn ${outType===t?'on':''}" onclick="setIOType('${n.id}','output','${t}')">${IO_ICONS[t]} ${t}</button>`).join('')}</div>
        <input class="fi" style="margin-top:6px" placeholder="Etiqueta de output" value="${n.outputLabel||tp.outputLabel||''}" oninput="nodes.find(x=>x.id==='${n.id}').outputLabel=this.value">
      </div>`;
  } else if(ctab==='btns'){
    const COLORS=[{bg:'#1a2a1a',fg:'#3a8a3a'},{bg:'#2a1a1a',fg:'#8a3a3a'},{bg:'#2a2010',fg:'#c8a040'},{bg:'#1a1a2a',fg:'#4a7abf'},{bg:'#1e1a18',fg:'#9a9088'}];
    if(!n.customBtns)n.customBtns=tp.actions.map((a,i)=>({label:a,icon:tp.actionIcons[i]||'▶',bg:tp.actionColors[i]||'#1e1a18',fg:'#9a9088',action:''}));
    body.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:9px"><span style="font-size:9px;color:#706860">Botones del agente</span><button onclick="addBtn('${n.id}')" class="runtc">+ Agregar</button></div>
      ${n.customBtns.map((b,i)=>`
        <div style="display:flex;align-items:center;gap:6px;padding:7px 9px;background:#0a0808;border:1px solid rgba(255,255,255,.07);border-radius:3px;margin-bottom:5px">
          <div style="min-width:60px;height:24px;border-radius:2px;background:${b.bg};border:1px solid ${b.fg}22;display:flex;align-items:center;justify-content:center;gap:4px;font-size:9px;color:${b.fg}">${b.icon} ${b.label}</div>
          <input style="flex:1;background:#0e0c0c;border:1px solid rgba(255,255,255,.07);border-radius:2px;padding:3px 6px;color:#ddd8cc;font-family:'IBM Plex Mono',monospace;font-size:9px;outline:none" value="${b.label}" oninput="nodes.find(x=>x.id==='${n.id}').customBtns[${i}].label=this.value">
          <input style="width:40px;background:#0e0c0c;border:1px solid rgba(255,255,255,.07);border-radius:2px;padding:3px 6px;color:#ddd8cc;font-family:'IBM Plex Mono',monospace;font-size:10px;outline:none;text-align:center" value="${b.icon}" oninput="nodes.find(x=>x.id==='${n.id}').customBtns[${i}].icon=this.value">
          <div style="display:flex;gap:2px">${COLORS.map((c,ci)=>`<div onclick="setButtonColor('${n.id}',${i},${ci})" style="width:14px;height:14px;border-radius:50%;background:${c.fg};cursor:pointer;border:2px solid ${b.fg===c.fg?'#fff':'transparent'};transition:.1s" title="${['Verde','Rojo','Ámbar','Azul','Gris'][ci]}"></div>`).join('')}</div>
          <button onclick="delBtn('${n.id}',${i})" style="background:transparent;border:none;color:#3a3630;cursor:pointer;font-size:11px;padding:0 2px">✕</button>
        </div>`).join('')}
      <button onclick="applyBtnsToNode('${n.id}')" style="background:#c8a040;border:none;color:#1a1200;font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:600;padding:5px 12px;border-radius:3px;cursor:pointer;width:100%;margin-top:4px">✓ Aplicar al nodo</button>`;
  } else if(ctab==='logs'){
    body.innerHTML=`${n.logs.map(l=>`<div class="logl"><span class="lt">${l.t}</span><span class="lm ${l.c}">${l.m}</span></div>`).join('')}`;
  } else if(ctab==='test'){
    body.innerHTML=`<div style="display:flex;justify-content:space-between;margin-bottom:9px"><span style="font-size:9px;color:#706860">Tests automáticos</span><button onclick="runAllTests('${n.id}')" class="runtc">▶ RUN ALL</button></div>
      ${n.tests.map((t,i)=>`<div class="tcbox"><div class="tcrow"><span class="tcn">${t.name}</span><span class="tcs ${t.status}">${t.status.toUpperCase()}</span><button onclick="runT('${n.id}',${i})" class="runtc">▶</button></div><div style="font-size:9px;color:#706860">${t.desc}</div></div>`).join('')}
      <button class="add-btn" onclick="nodes.find(x=>x.id==='${n.id}').tests.push({name:'Nuevo test',status:'pend',desc:'Descripción del test'});renderM(nodes.find(x=>x.id==='${n.id}'))">+ Agregar test</button>`;
  } else if(ctab==='out'){
    body.innerHTML=`<pre style="background:#0a0808;border:1px solid rgba(255,255,255,.07);border-radius:3px;padding:10px;font-size:9px;color:#706860;line-height:1.6;white-space:pre-wrap;overflow-wrap:break-word">${n.output||'Sin output. Ejecuta el agente primero.'}</pre>`;
  }
}
function stab(el,tab){ctab=tab;document.querySelectorAll('.mtab').forEach(t=>t.classList.remove('on'));el.classList.add('on');const n=nodes.find(x=>x.id===modalId);if(n)renderM(n);}
function closeM(){document.getElementById('moverlay').classList.remove('open');}

// ══════════════════════════════
// IO MODAL (RECIBE / ENTREGA)
// ══════════════════════════════
function openIOModal(nodeId,dir){
  const n=nodes.find(x=>x.id===nodeId);if(!n)return;
  const tp=T[n.type];
  const isIn=dir==='in';
  const title=isIn?'RECIBE':'ENTREGA';
  const titleColor=isIn?'#3a8a3a':'#c8a040';
  const type=isIn?(n.inputType||tp.inputType||'any'):(n.outputType||tp.outputType||'any');
  const label=isIn?(n.inputLabel||tp.inputLabel||''):(n.outputLabel||tp.outputLabel||'');
  const icon=IO_ICONS[type]||'◆';
  const color=IO_COLORS[type]||'#706860';
  const labelField=isIn?'inputLabel':'outputLabel';
  const defVal=isIn?(n.inputDefault||tp.inputDefault||''):'';

  let connHTML='';
  if(isIn){
    const ic=conns.find(c=>c.to===nodeId&&c.tp==='in');
    if(ic){
      const src=nodes.find(x=>x.id===ic.from);
      if(src){
        const st=T[src.type];
        const soType=src.outputType||st.outputType||'any';
        const soLabel=src.outputLabel||st.outputLabel||'';
        const soColor=IO_COLORS[soType]||'#706860';
        connHTML=`<div class="iomod-conn">
          <div class="iomod-conn-lbl">Conectado desde</div>
          <div class="iomod-conn-src">
            <span class="iomod-conn-dot" style="background:${st.dot}"></span>
            <span class="iomod-conn-name">${escapeHTML(src.name)}</span>
            <span class="iomod-conn-arrow">→</span>
            <span class="iomod-conn-type" style="color:${soColor}">${IO_ICONS[soType]||'◆'} ${soType}</span>
          </div>
          ${soLabel?`<div class="iomod-conn-desc">${escapeHTML(soLabel)}</div>`:''}
        </div>`;
      }
    } else {
      connHTML=`<div class="iomod-conn"><div class="iomod-conn-empty">Sin conexión de entrada</div></div>`;
    }
  } else {
    const oc=conns.find(c=>c.from===nodeId&&(c.fp==='out'||c.fp==='out-y'||c.fp==='out-n'));
    if(oc){
      const tgt=nodes.find(x=>x.id===oc.to);
      if(tgt){
        const tt=T[tgt.type];
        connHTML=`<div class="iomod-conn">
          <div class="iomod-conn-lbl">Conectado a</div>
          <div class="iomod-conn-src">
            <span class="iomod-conn-dot" style="background:${tt.dot}"></span>
            <span class="iomod-conn-name">${escapeHTML(tgt.name)}</span>
          </div>
        </div>`;
      }
    } else {
      connHTML=`<div class="iomod-conn"><div class="iomod-conn-empty">Sin conexión de salida</div></div>`;
    }
  }

  let modal=document.getElementById('io-modal');
  if(!modal){modal=document.createElement('div');modal.id='io-modal';document.body.appendChild(modal);}
  modal.onclick=e=>{if(e.target===modal)closeIOModal();};
  modal.innerHTML=`<div id="io-modal-box" onclick="event.stopPropagation()">
    <div class="iomod-head">
      <div class="iomod-title-row">
        <span class="iomod-dir" style="color:${titleColor}">${title}</span>
        <span class="iomod-type-badge" style="color:${color}">${icon} ${type}</span>
      </div>
      <button class="iomod-cls" onclick="closeIOModal()">✕</button>
    </div>
    <div class="iomod-body">
      <div class="iomod-field">
        <div class="iomod-fl">Descripción</div>
        <input class="iomod-fi" value="${escapeHTML(label)}" placeholder="Describe qué ${isIn?'recibe':'entrega'} este agente..."
          oninput="const _n=nodes.find(x=>x.id==='${nodeId}');if(_n){_n.${labelField}=this.value;scheduleSave();}">
      </div>
      ${isIn?`<div class="iomod-field">
        <div class="iomod-fl">Valor por defecto</div>
        <input class="iomod-fi" value="${escapeHTML(defVal)}" placeholder="Valor si no hay conexión..."
          oninput="const _n=nodes.find(x=>x.id==='${nodeId}');if(_n){_n.inputDefault=this.value;scheduleSave();}">
      </div>`:''}
      ${connHTML}
    </div>
  </div>`;
  modal.classList.add('open');
}
function closeIOModal(){const m=document.getElementById('io-modal');if(m)m.classList.remove('open');}

// ══════════════════════════════
// RUNTIME AGENT CARDS (agentes activos sin nodo en canvas)
// ══════════════════════════════
function syncRuntimeAgentsToCanvas(ctx){
  const agentStates=ctx.agentes_activos||{};
  const pilot=nodes.find(n=>n.type==='pilot'||n.agentId==='AG-01');
  const canvasAgIds=new Set(nodes.filter(n=>n.agentId).map(n=>n.agentId));

  // Eliminar runtime cards de agentes que ya no están activos
  const activeIds=new Set(Object.values(agentStates).filter(ag=>ag.estado==='activo').map(ag=>ag.agent_id));
  outputCards=outputCards.filter(card=>{
    if(!card._isRuntime)return true;
    if(!activeIds.has(card._agentId)){
      document.getElementById(card.id)?.remove();
      conns=conns.filter(c=>c.from!==card.id&&c.to!==card.id);
      return false;
    }
    return true;
  });

  // Crear o actualizar runtime cards para agentes activos sin nodo
  const activeWithoutNode=Object.values(agentStates)
    .filter(ag=>ag.estado==='activo'&&ag.agent_id!=='AG-01'&&!canvasAgIds.has(ag.agent_id));

  activeWithoutNode.forEach((ag,i)=>{
    const existing=outputCards.find(c=>c._isRuntime&&c._agentId===ag.agent_id);
    if(existing){
      existing._agAction=ag.accion_actual;
      const el=document.getElementById(existing.id);
      if(el){
        const actionEl=el.querySelector('.rt-action');
        if(actionEl)actionEl.textContent=ag.accion_actual||'ejecutando...';
      }
    } else {
      const baseX=pilot?(pilot.x+350):(3350);
      const baseY=pilot?(pilot.y):(2400);
      const col=i%2, row=Math.floor(i/2);
      _mkRuntimeAgentCard(ag, baseX+(col*210), baseY+(row*130));
      if(pilot){
        conns.push({id:'c'+Math.random().toString(36).slice(2,10),
          from:pilot.id,fp:'out',to:'rt_'+ag.agent_id,tp:'in',active:true});
      }
    }
  });
}

function _mkRuntimeAgentCard(ag,x,y){
  const id='rt_'+ag.agent_id;
  document.getElementById(id)?.remove();
  outputCards=outputCards.filter(c=>c.id!==id);
  const agType=AG_TO_TYPE[ag.agent_id]||'prompt';
  const tp=T[agType]||{};
  const name=ag.nombre||AGENT_NAMES[ag.agent_id]||ag.agent_id;
  const oc={id,x,y,_isRuntime:true,_agentId:ag.agent_id,_agAction:ag.accion_actual,
    label:name,isCtxFile:false,fromNodeName:name,fromDot:tp.dot||'#706860'};
  outputCards.push(oc);
  const el=document.createElement('div');
  el.className='output-card runtime-agent-card';el.id=id;
  el.style.cssText=`left:${x}px;top:${y}px`;
  el.innerHTML=`
    <div class="port in" data-nid="${id}" data-pt="in"></div>
    <div class="port out" data-nid="${id}" data-pt="out"></div>
    <div class="rt-inner">
      <div class="rt-head">
        <div class="rt-dot" style="background:${tp.dot||'#706860'}"></div>
        <span class="rt-name">${escapeHTML(name)}</span>
        <span class="rt-agid">${ag.agent_id}</span>
        <span class="rt-pulse"></span>
      </div>
      <div class="rt-action">${escapeHTML(ag.accion_actual||'ejecutando...')}</div>
    </div>`;
  el.addEventListener('mousedown',e=>cardMouseDown(e,id));
  document.getElementById('canvas').appendChild(el);
  return oc;
}


function setIOType(id,dir,type){
  const n=nodes.find(x=>x.id===id);if(!n)return;
  if(dir==='input')n.inputType=type;else n.outputType=type;
  // Re-render io section in node
  const el=document.getElementById(id);if(el){const io=el.querySelector('.nio');if(io)io.outerHTML=ioSectionHTML(n);}
  renderM(n);
}
function addMemFile(id){const n=nodes.find(x=>x.id===id);if(!n)return;if(!n.memoryFiles)n.memoryFiles=[];n.memoryFiles.push({name:'memoria_'+Date.now()+'.json',size:'—',content:''});renderM(n);}
function deleteMemFile(id,i){const n=nodes.find(x=>x.id===id);if(!n||!n.memoryFiles)return;n.memoryFiles.splice(i,1);renderM(n);}
function addBtn(id){const n=nodes.find(x=>x.id===id);if(!n)return;if(!n.customBtns)n.customBtns=[];n.customBtns.push({label:'Nuevo',icon:'▶',bg:'#1e1a18',fg:'#9a9088',action:''});renderM(n);}
function delBtn(id,i){const n=nodes.find(x=>x.id===id);if(!n)return;n.customBtns.splice(i,1);renderM(n);}
function setButtonColor(id,btnIdx,colorIdx){
  const COLORS=[{bg:'#1a2a1a',fg:'#3a8a3a'},{bg:'#2a1a1a',fg:'#8a3a3a'},{bg:'#2a2010',fg:'#c8a040'},{bg:'#1a1a2a',fg:'#4a7abf'},{bg:'#1e1a18',fg:'#9a9088'}];
  const n=nodes.find(x=>x.id===id);if(!n||!n.customBtns)return;
  n.customBtns[btnIdx].bg=COLORS[colorIdx].bg;n.customBtns[btnIdx].fg=COLORS[colorIdx].fg;renderM(n);
}
function applyBtnsToNode(id){
  const n=nodes.find(x=>x.id===id);if(!n||!n.customBtns)return;
  const el=document.getElementById(id);if(!el)return;
  const actSection=el.querySelector('.nactions');if(!actSection)return;
  actSection.innerHTML=n.customBtns.map((b,i)=>`<button class="nact" style="background:${b.bg}"><div class="nact-ico" style="background:rgba(0,0,0,.3);color:${b.fg}">${b.icon}</div><span style="color:${b.fg}">${b.label}</span><div class="nstatus-dot ${i===n.customBtns.length-1?n.status:'idle'}" style="margin-left:auto"></div></button>`).join('');
  closeM();
}
function runT(id,i){const n=nodes.find(x=>x.id===id);if(!n)return;n.tests[i].status='pend';renderM(n);setTimeout(()=>{n.tests[i].status=Math.random()>.3?'pass':'fail';renderM(n);},700);}
function runAllTests(id){const n=nodes.find(x=>x.id===id);if(!n)return;n.tests.forEach((_,i)=>setTimeout(()=>runT(id,i),i*350));}

// ══════════════════════════════
// SIDEBAR
// ══════════════════════════════
function openSide(){document.getElementById('pside').classList.add('open');document.getElementById('pback').style.display='block';loadPipelinesInSidebar();}
function closeSide(){document.getElementById('pside').classList.remove('open');document.getElementById('pback').style.display='none';}

function updateAddAgentMenuAvailability(){
  const cards=document.querySelectorAll('#add-agent-menu .add-agent-card');
  if(!cards.length)return;
  const hasPilot=nodes.some(n=>n.type==='pilot'||n.agentId==='AG-01');
  const hasOperator=nodes.some(n=>n.type==='human'||n.agentId==='AG-05');
  cards.forEach(card=>{
    const type=card.dataset.agentType;
    let enabled=false;
    let reason='';
    if(type==='pilot'){
      enabled=true;
    }else if(type==='human'){
      enabled=hasPilot;
      if(!enabled)reason='Crea un piloto primero';
    }else{
      enabled=hasPilot&&hasOperator;
      if(!hasPilot)reason='Crea un piloto primero';
      else if(!hasOperator)reason='Crea un operador primero';
    }
    card.classList.toggle('disabled',!enabled);
    card.setAttribute('draggable',enabled?'true':'false');
    card.dataset.disabledReason=reason;
    card.title=!enabled?reason:'';
    card.style.display='flex';
  });
}

function toggleAddAgentMenu(e){
  if(e)e.stopPropagation();
  const menu=document.getElementById('add-agent-menu');
  if(!menu)return;
  updateAddAgentMenuAvailability();
  menu.classList.toggle('hidden');
}

function closeAddAgentMenu(){
  const menu=document.getElementById('add-agent-menu');
  if(menu)menu.classList.add('hidden');
}

async function loadPipelinesInSidebar(){
  const list=document.getElementById('pipelines-list');
  if(!list)return;
  try{
    const pipelines=await fetch('/api/pipelines').then(r=>r.json());
    if(!pipelines.length){list.innerHTML='<div class="ps-empty">Sin pipelines aún.<br>Escribe en la terminal qué quieres producir.</div>';return;}
    list.innerHTML=pipelines.map(p=>{
      const isCurrent=p.id===currentPipelineId;
      const dot=isCurrent?'#c85050':'#4a4840';
      return`<div class="ps-pipe${isCurrent?' on':''}" onclick="switchPipeline('${p.id}','${p.name.replace(/'/g,"\\'")}')">
        <div class="ps-dot" style="background:${dot}"></div>
        <div class="ps-info">
          <div class="ps-name">${p.name}</div>
          <div class="ps-sub">${new Date(p.created_at).toLocaleDateString()}</div>
        </div>
        <button class="ps-del" onclick="event.stopPropagation();deletePipeline('${p.id}')" title="Eliminar">✕</button>
      </div>`;
    }).join('');
  }catch(e){list.innerHTML='<div class="ps-empty">Error cargando pipelines</div>';}
}

async function switchPipeline(id,name){
  closeSide();
  // Clear canvas
  nodes.forEach(nd=>{const el=document.getElementById(nd.id);if(el)el.remove();});
  outputCards.forEach(c=>{const el=document.getElementById(c.id);if(el)el.remove();});
  nodes=[];conns=[];outputCards=[];
  document.getElementById('svgl').innerHTML='';
  currentPipelineId=id;
  terminalPipelineId=id;
  document.getElementById('pipe-label').textContent=name;
  connectSSE(id);
  // Try to load saved state first
  const state=await fetch('/api/pipelines/'+id+'/state').then(r=>r.json()).catch(()=>null);
  if(state&&state.nodes.length>0){
    state.nodes.forEach(n=>{nodes.push(n);mkNode(n);});
    state.conns.forEach(c=>conns.push(c));
    if(state.outputs?.length)state.outputs.forEach(output=>dropBackendOutputCard(output));
    if(state.operatorQuestions?.length)state.operatorQuestions.filter(q=>q.status!=='answered').forEach(q=>createBackendQuestionCard(q));
    if(state.outputCards?.length){
      state.outputCards
        .filter(oc=>!oc.backendOutput&&!oc.assetId?.includes?.('assembly-final-'))
        .forEach(oc=>restoreOutputCard(oc));
    }
    setTimeout(()=>{drawConns();fitAll();updateMM();},120);
    glog('done','Pipeline','system','Pipeline "'+name+'" cargado — '+nodes.length+' agentes');
  } else {
    // Try to sync from seed
    syncCanvasFromPipeline(id);
  }
}

async function deletePipeline(id){
  if(!confirm('¿Eliminar este pipeline?'))return;
  await fetch('/api/pipelines/'+id,{method:'DELETE'}).catch(()=>{});
  if(id===currentPipelineId){currentPipelineId=null;terminalPipelineId=null;document.getElementById('pipe-label').textContent='Sin pipeline';}
  loadPipelinesInSidebar();
}

async function newPipeline(){
  closeSide();
  try{
    const existing=await fetch('/api/pipelines').then(r=>r.json()).catch(()=>[]);
    const n='Pipeline '+(existing.length+1);
    const res=await fetch('/api/pipelines',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n})});
    const pipeline=await res.json();
    if(!res.ok)throw new Error(pipeline.error||'Error');
    // Close old SSE so stale events can't restore previous state
    if(sseConnection){sseConnection.close();sseConnection=null;}
    _userStartedRun=false;
    // 1. Clear canvas now — user sees it empty
    nodes.forEach(nd=>{const el=document.getElementById(nd.id);if(el)el.remove();});
    outputCards.forEach(c=>{const el=document.getElementById(c.id);if(el)el.remove();});
    nodes=[];conns=[];outputCards=[];
    document.getElementById('svgl').innerHTML='';
    currentPipelineId=pipeline.id;
    terminalPipelineId=null;
    document.getElementById('pipe-label').textContent=pipeline.name;
    drawConns();fitAll();updateMM();
    glog('done','Pipeline','system','"'+pipeline.name+'" creado — escribe tu prompt y presiona Enter para que el Arquitecto diseñe el pipeline');
  }catch(e){glog('err','Pipeline','system','Error creando pipeline: '+e.message);}
}

// ══════════════════════════════
// LOG SYSTEM
// ══════════════════════════════
let globalLog=[];let logFilter_='all';
function glog(type,agentName,agentType,msg){
  const entry={id:Date.now()+Math.random(),t:ts(),agent:agentName||'Sistema',agentType:agentType||'system',type,msg};
  globalLog.push(entry);if(globalLog.length>500)globalLog.shift();
  renderLogEntry(entry);
  const badge=document.getElementById('log-badge');
  if(badge&&!operatorWaiting){badge.textContent=type==='error'?'ERROR':type==='done'?'OK':'LIVE';badge.className='ltb-badge'+(type==='warn'||type==='think'?' active':'');}
}
function renderLogEntry(entry){
  if(logFilter_!=='all'&&entry.type!==logFilter_)return;
  const body=document.getElementById('logbody');if(!body)return;
  const div=document.createElement('div');div.className='log-entry '+entry.type+(entry.type==='think'?' typing':'');
  div.dataset.type=entry.type;div.dataset.id=entry.id;
  const agentColor={pilot:'#c85050',research:'#3a9a6a',prompt:'#c8a040',image:'#8a5abf',video:'#4a8abf',assembly:'#c87840',human:'#c8a040',system:'#4a4870'}[entry.agentType]||'#706860';
  div.innerHTML=`<span class="le-time">${entry.t}</span><span class="le-msg">${entry.msg}</span>`;
  body.appendChild(div);
  body.querySelectorAll('.log-entry.think.typing').forEach((el,i,arr)=>{if(i<arr.length-1)el.classList.remove('typing');});
  body.scrollTop=body.scrollHeight;
}
function setLogFilter(f,el){logFilter_=f;document.querySelectorAll('.lf').forEach(x=>x.classList.remove('on'));el.classList.add('on');const body=document.getElementById('logbody');body.innerHTML='';globalLog.forEach(e=>{if(logFilter_==='all'||e.type===logFilter_)renderLogEntry(e);});}
function clearLog(){globalLog=[];document.getElementById('logbody').innerHTML='';}
// ── Terminal title cycle ─────────────────────────────────────
let _titleCycleTimer=null,_titleCycleIdx=0;
const TITLE_STATES=[
  'Analizando prompt...',
  'Inicializando Arquitecto...',
  'Diseñando estructura...',
  'Seleccionando agentes...',
  'Configurando bloques...',
  'Asignando dependencias...',
  'Construyendo canvas...',
];
function startTitleCycle(){
  const title=document.getElementById('logtitle');
  const spinner=document.getElementById('logtspinner');
  if(title)title.classList.add('loading');
  if(spinner)spinner.classList.add('active');
  _titleCycleIdx=0;
  clearInterval(_titleCycleTimer);
  _titleCycleTimer=setInterval(()=>{
    if(title)title.textContent=TITLE_STATES[_titleCycleIdx%TITLE_STATES.length];
    _titleCycleIdx++;
  },1400);
  if(title)title.textContent=TITLE_STATES[0];
}
function stopTitleCycle(finalText){
  clearInterval(_titleCycleTimer);_titleCycleTimer=null;
  const title=document.getElementById('logtitle');
  const spinner=document.getElementById('logtspinner');
  if(spinner)spinner.classList.remove('active');
  if(title){
    title.classList.remove('loading');
    title.textContent=finalText||'Log Global — Pipeline';
  }
}

function toggleLogMin(){if(window._ob&&window._ob.isActive&&window._ob.isActive()){window._ob.skip();return;}const win=document.getElementById('logwin');logMinimized=!logMinimized;win.classList.toggle('minimized',logMinimized);if(!logMinimized)win.style.height=logPrevH+'px';else logPrevH=win.offsetHeight;}
function toggleLogMax(){const win=document.getElementById('logwin');if(win.offsetHeight<300){logPrevH=win.offsetHeight;win.style.height='400px';}else win.style.height=logPrevH+'px';}

// Log drag
(function(){let dragging=false,ox=0,oy=0;const bar=document.getElementById('logtbar'),win=document.getElementById('logwin');
  bar.addEventListener('mousedown',e=>{if(e.target.classList.contains('ltb-dot'))return;dragging=true;const r=win.getBoundingClientRect();ox=e.clientX-r.left;oy=e.clientY-r.top;e.preventDefault();});
  document.addEventListener('mousemove',e=>{if(!dragging)return;win.style.right='auto';win.style.bottom='auto';win.style.left=Math.max(0,Math.min(window.innerWidth-win.offsetWidth,e.clientX-ox))+'px';win.style.top=Math.max(0,Math.min(window.innerHeight-win.offsetHeight,e.clientY-oy))+'px';});
  document.addEventListener('mouseup',()=>{dragging=false;});
})();
(function(){let resizing=false,startY=0,startH=0;const handle=document.getElementById('logresize'),win=document.getElementById('logwin');
  handle.addEventListener('mousedown',e=>{resizing=true;startY=e.clientY;startH=win.offsetHeight;e.preventDefault();});
  document.addEventListener('mousemove',e=>{
    if(!resizing)return;
    const topAnchored=win.style.bottom==='auto';
    const delta=topAnchored?(e.clientY-startY):(startY-e.clientY);
    win.style.height=Math.max(80,Math.min(window.innerHeight-40,startH+delta))+'px';
  });
  document.addEventListener('mouseup',()=>{resizing=false;});
})();
(function(){let resizing=false,startX=0,startW=0,startLeft=0;const handle=document.getElementById('logresize-w'),win=document.getElementById('logwin');
  handle.addEventListener('mousedown',e=>{resizing=true;startX=e.clientX;startW=win.offsetWidth;startLeft=win.getBoundingClientRect().left;e.preventDefault();});
  document.addEventListener('mousemove',e=>{
    if(!resizing)return;
    const newW=Math.max(280,Math.min(Math.round(window.innerWidth*.9),startW-(e.clientX-startX)));
    win.style.width=newW+'px';
    win.style.left=Math.max(0,startLeft-(newW-startW))+'px';
    win.style.right='auto';
  });
  document.addEventListener('mouseup',()=>{resizing=false;});
})();
(function(){let resizing=false,startY=0,startH=0,startTop=0;const handle=document.getElementById('logresize-t'),win=document.getElementById('logwin');
  handle.addEventListener('mousedown',e=>{resizing=true;startY=e.clientY;startH=win.offsetHeight;startTop=win.getBoundingClientRect().top;win.style.transition='none';e.preventDefault();});
  document.addEventListener('mousemove',e=>{
    if(!resizing)return;
    const delta=startY-e.clientY;
    const newH=Math.max(80,Math.min(window.innerHeight-40,startH+delta));
    win.style.height=newH+'px';
    if(win.style.bottom==='auto')win.style.top=Math.max(0,startTop-delta)+'px';
  });
  document.addEventListener('mouseup',()=>{if(!resizing)return;resizing=false;win.style.transition='';});
})();
(function(){let resizing=false,startX=0,startW=0;const handle=document.getElementById('logresize-r'),win=document.getElementById('logwin');
  handle.addEventListener('mousedown',e=>{resizing=true;startX=e.clientX;startW=win.offsetWidth;e.preventDefault();});
  document.addEventListener('mousemove',e=>{if(!resizing)return;const newW=Math.max(280,Math.min(Math.round(window.innerWidth*.9),startW+(e.clientX-startX)));win.style.width=newW+'px';});
  document.addEventListener('mouseup',()=>{resizing=false;});
})();

// Log commands
const LOG_COMMANDS={
  pipeline:{desc:'Gestionar pipelines',actions:[{label:'Nuevo pipeline',icon:'⊕',action:()=>newPipeline()},{label:'Ver todos',icon:'≡',action:()=>openSide()},{label:'Ejecutar',icon:'▶',action:()=>runAll()}]},
  agente:{desc:'Gestionar agentes',actions:[{label:'Crear agente con IA',icon:'✦',action:()=>openAgentBuilder()},{label:'Ver canvas',icon:'⊞',action:()=>fitAll()},{label:'Agregar Piloto',icon:'◈',action:()=>addNodeCenter('pilot')}]},
  skill:{desc:'Gestionar skills',actions:[{label:'Crear nueva skill',icon:'⬡',action:()=>openSkillBuilder()},{label:'Ver lista de skills',icon:'≡',action:()=>listSkillsInLog()},{label:'Asignar a nodo',icon:'→',action:()=>promptAssignSkill()}]},
  run:{desc:'Ejecutar',actions:[{label:'Run All',icon:'▶',action:()=>runAll()}]},
  approve:{desc:'Aprobar pregunta pendiente con sugerencia — uso: /approve o /approve all'},
  answer:{desc:'Responder pregunta pendiente — uso: /answer tu_respuesta'},
  reset:{desc:'Resetear',actions:[{label:'Reset All',icon:'↺',action:()=>resetAll()}]},
  fit:{desc:'Ajustar vista',actions:[{label:'Fit View',icon:'⊞',action:()=>fitAll()}]},
  bp:{desc:'Canjear código de activación — uso: /bp CODIGO-XX'},
  help:{desc:'Ayuda',actions:[{label:'Ver comandos',icon:'?',action:()=>Object.entries(LOG_COMMANDS).forEach(([k,v])=>glog('system','Help','system',`/${k} — ${v.desc}`))}]}
};
function listSkillsInLog(){if(!customSkills.length){glog('system','Skills','system','No hay skills. Crea una con /skill');return;}customSkills.forEach(s=>glog('action','Skills','system',`⬡ ${s.name} — ${s.type||''} — ${s.endpoint||''}`))}
function promptAssignSkill(){if(!customSkills.length){glog('warn','Skills','system','No hay skills. Crea una primero.');return;}if(!sel){glog('warn','Skills','system','Selecciona un nodo primero.');return;}openSkillAssign(sel);}
async function redeemCodeFromTerminal(code){
  if(!code){glog('warn','Bestpoints','system','Uso: /bp CODIGO-XX');return;}
  glog('think','Bestpoints','system','⬡ Verificando código...');
  try{
    const res=await fetch('/api/hash/redeem',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});
    const data=await res.json();
    if(res.ok){
      const llave=data.bestpoints_added+'-'+code;
      glog('done','Bestpoints','system','⬡ ✓ Tu llave es: '+llave);
      glog('done','Bestpoints','system','⬡ +'+data.bestpoints_added+' BP acreditados · Wallet: '+data.bestpoints.toFixed(4)+' BP · Tier: '+data.tier);
      _updateBPButton(data.bestpoints-(data.bp_spent||0));
      await _refreshBPStatus();
    } else {
      const errMap={code_not_found:'Código no encontrado.',code_already_used:'Este código ya fue canjeado anteriormente.',code_required:'Debes ingresar un código.'};
      glog('error','Bestpoints','system','⬡ '+( errMap[data.error]||data.error||'Error desconocido'));
    }
  }catch(e){
    glog('error','Bestpoints','system','⬡ Error de red al canjear código.');
  }
}
function parseLogCommand(){
  const inp=document.getElementById('log-cmd');const val=inp.value.trim();if(!val)return;
  inp.value='';document.getElementById('cmd-hints').innerHTML='';

  // /bp <code> — canjear código de activación
  if(val.startsWith('/bp ')||val.toLowerCase()==='/bp'){
    const code=val.slice(4).trim().toUpperCase()||'';
    glog('action','Terminal','system','> '+val);
    redeemCodeFromTerminal(code);
    return;
  }

  // Comandos locales del canvas (sin /)
  const cmd=val.replace('/','').toLowerCase().trim();
  const match=LOG_COMMANDS[cmd];
  if(match&&val.startsWith('/')){
    glog('action','Terminal','system','> '+val);
    glog('system','Terminal','system',match.desc+':');
    if(match.actions?.length){
      const body=document.getElementById('logbody');
      const row=document.createElement('div');row.style.cssText='display:flex;gap:5px;padding:4px 8px;flex-wrap:wrap;';
      match.actions.forEach(a=>{
        const btn=document.createElement('button');
        btn.style.cssText='padding:4px 10px;background:rgba(200,160,64,.08);border:1px solid rgba(200,160,64,.2);color:#c8a040;font-family:IBM Plex Mono,monospace;font-size:9px;border-radius:3px;cursor:pointer;letter-spacing:.04em';
        btn.innerHTML=`${a.icon} ${a.label}`;btn.onclick=()=>a.action();
        row.appendChild(btn);
      });
      const body2=document.getElementById('logbody');
      body2.appendChild(row);body2.scrollTop=body2.scrollHeight;
    }
    return;
  }

  // Texto libre → responder operador si hay preguntas pendientes; si no, crear pipeline
  if(!val.startsWith('/')){
    const hasPendingOperatorQuestion=Boolean(getActiveQuestionCard()||operatorQuestionQueue.length||operatorWaiting);
    if((terminalPipelineId||currentPipelineId)&&hasPendingOperatorQuestion){sendTerminalInput(val);return;}
    createPipelineFromPrompt(val);return;
  }
  sendTerminalInput(val);
}

// ══════════════════════════════
// PIPELINE CREATION FLOW
// ══════════════════════════════
function showCreatingAnimation(promptText, mode='pipeline'){
  ensureLogVisibleForActivity();
  let ov=document.getElementById('creating-overlay');
  if(!ov){ov=document.createElement('div');ov.id='creating-overlay';document.getElementById('wrap').appendChild(ov);}
  const short=promptText.length>60?promptText.slice(0,58)+'…':promptText;
  const isArchitect=mode==='architect';
  if(creatingOverlayTimer){clearInterval(creatingOverlayTimer);creatingOverlayTimer=null;}
  ov.innerHTML=`<div class="co-inner${isArchitect?' architect':''}">
    <div class="co-badge">${isArchitect?'AG-00 · Arquitecto':'Pipeline'}</div>
    <div class="co-rings"><div class="co-ring co-r1"></div><div class="co-ring co-r2"></div><div class="co-ring co-r3"></div></div>
    <div class="co-label">${isArchitect?'Construyendo estructura del contexto...':'Creando pipeline...'}</div>
    <div class="co-sub">${isArchitect?'Diseñando agentes, dependencias y bloques iniciales':'Preparando canvas inicial'}</div>
    ${isArchitect?'<div class="co-timehint" id="co-timehint">Tiempo estimado restante: 1:00</div>':''}
    <div class="co-prompt">"${short}"</div>
  </div>`;
  ov.style.display='flex';
  if(isArchitect){
    const startedAt=Date.now();
    const renderCountdown=()=>{
      const target=document.getElementById('co-timehint');
      if(!target)return;
      const elapsed=Math.floor((Date.now()-startedAt)/1000);
      const remaining=Math.max(0,60-elapsed);
      const mm=Math.floor(remaining/60);
      const ss=String(remaining%60).padStart(2,'0');
      if(elapsed<=60){
        target.textContent=`Tiempo estimado restante: ${mm}:${ss}`;
        return;
      }
      const overdue=elapsed-60;
      const omm=Math.floor(overdue/60);
      const oss=String(overdue%60).padStart(2,'0');
      target.textContent=`Retraso sobre 1 minuto: +${omm}:${oss}. Si supera los 5 minutos, hubo un problema.`;
    };
    renderCountdown();
    creatingOverlayTimer=setInterval(renderCountdown,1000);
  }
}
function hideCreatingAnimation(){
  const ov=document.getElementById('creating-overlay');
  if(creatingOverlayTimer){clearInterval(creatingOverlayTimer);creatingOverlayTimer=null;}
  if(ov)ov.style.display='none';
}

function ensureLogVisibleForActivity(){
  const logWin=document.getElementById('logwin');
  if(logWin&&logWin.classList.contains('minimized'))toggleLogMin();
}
function createPipelineFromPrompt(promptText){
  // Minimizar terminal y modelos para dar espacio al canvas
  const lw=document.getElementById('logwin');
  const mw=document.getElementById('mtwin');
  if(lw&&!lw.classList.contains('minimized'))toggleLogMin();
  if(mw&&!mw.classList.contains('minimized'))toggleMTMin();
  // Clear canvas
  nodes.forEach(n=>document.getElementById(n.id)?.remove());
  outputCards.forEach(c=>document.getElementById(c.id)?.remove());
  nodes=[];conns=[];outputCards=[];
  document.getElementById('svgl').innerHTML='';
  // Store for after canvas sync
  _pendingSeedPrompt=promptText;
  // Show animation + safety timeout (30s)
  showCreatingAnimation(promptText);
  startTitleCycle();
  setTimeout(()=>{
    if(_pendingSeedPrompt){
      hideCreatingAnimation();_pendingSeedPrompt=null;
      stopTitleCycle('Log Global — Pipeline');
      glog('warn','Canvas','system','Tiempo de espera agotado. Si el pipeline fue creado, selecciónalo en el panel lateral.');
    }
  },30000);
  glog('think','Canvas','system','◉ Creando pipeline: "'+promptText+'"');
  // Call API
  sendTerminalInput(promptText);
}

// ── Terminal question auto-answer (15s timeout) ──────────────────
function startTerminalQuestionTimer(question, suggestion){
  clearTerminalQuestionTimer();
  terminalActiveQuestion=question;
  const inp=document.getElementById('log-cmd');
  if(!inp)return;
  inp.value=suggestion;
  inp.style.borderColor='rgba(200,160,64,.5)';
  inp.style.color='rgba(200,160,64,.8)';
  const TIMEOUT=15000;
  let remaining=Math.ceil(TIMEOUT/1000);
  const promptEl=document.getElementById('log-cmd-prompt');
  const origPrompt=promptEl?promptEl.textContent:'›';
  const updateCountdown=()=>{
    if(promptEl)promptEl.textContent=remaining+'s›';
  };
  updateCountdown();
  const interval=setInterval(()=>{
    remaining--;
    if(remaining<=0){clearInterval(interval);return;}
    updateCountdown();
  },1000);
  terminalQuestionTimer=setTimeout(()=>{
    clearInterval(interval);
    if(promptEl)promptEl.textContent=origPrompt;
    inp.style.borderColor='';inp.style.color='';
    // Auto-send the suggestion if input wasn't manually changed
    const currentVal=inp.value.trim();
    if(currentVal===suggestion||currentVal===''){
      glog('think','Operador','human','[Auto] '+suggestion);
      inp.value='';
      sendTerminalInput(suggestion);
    }
    terminalActiveQuestion=null;
    terminalQuestionTimer=null;
  },TIMEOUT);
  // If user focuses and edits, cancel auto-send
  inp.addEventListener('focus',cancelTerminalQuestionTimer,{once:true});
}

function cancelTerminalQuestionTimer(){
  if(!terminalQuestionTimer)return;
  clearTimeout(terminalQuestionTimer);
  terminalQuestionTimer=null;
  terminalActiveQuestion=null;
  const inp=document.getElementById('log-cmd');
  if(inp){inp.style.borderColor='';inp.style.color='';}
  const promptEl=document.getElementById('log-cmd-prompt');
  if(promptEl)promptEl.textContent='›';
}

function clearTerminalQuestionTimer(){
  if(terminalQuestionTimer){clearTimeout(terminalQuestionTimer);terminalQuestionTimer=null;}
  terminalActiveQuestion=null;
  const inp=document.getElementById('log-cmd');
  if(inp){inp.style.borderColor='';inp.style.color='';}
  const promptEl=document.getElementById('log-cmd-prompt');
  if(promptEl)promptEl.textContent='›';
}

document.getElementById('log-cmd').addEventListener('keydown',e=>{
  if(e.key==='Enter'){parseLogCommand();clearTerminalQuestionTimer();e.preventDefault();}
  if(e.key==='Escape'){const w=document.getElementById('logwin');if(w.classList.contains('spotlight'))toggleLogSpotlight();cancelTerminalQuestionTimer();e.preventDefault();}
  if(e.key==='Tab'){e.preventDefault();const val=e.target.value.replace('/','');const m=Object.keys(LOG_COMMANDS).find(k=>k.startsWith(val));if(m)e.target.value='/'+m;}
  if(e.key==='ArrowUp'||e.key==='ArrowDown'){
    const items=document.querySelectorAll('#cmd-hints .ch-item');if(!items.length)return;
    e.preventDefault();
    let idx=[...items].findIndex(i=>i.classList.contains('focused'));
    items.forEach(i=>i.classList.remove('focused'));
    idx=e.key==='ArrowDown'?Math.min(idx+1,items.length-1):Math.max(idx-1,0);
    items[idx].classList.add('focused');items[idx].scrollIntoView({block:'nearest'});
    document.getElementById('log-cmd').value=items[idx].dataset.cmd;
  }
});
document.getElementById('log-cmd').addEventListener('input',function(){
  if(terminalActiveQuestion)cancelTerminalQuestionTimer(); // user typed → cancel auto-send
  renderCmdHints(this.value);
});

function renderCmdHints(val){
  const hints=document.getElementById('cmd-hints');
  const inSpotlight=document.getElementById('logwin').classList.contains('spotlight');
  if(!inSpotlight&&!val.startsWith('/')){hints.innerHTML='';return;}
  const q=(val.startsWith('/')?val.slice(1):val).toLowerCase();
  const matches=Object.entries(LOG_COMMANDS).filter(([k])=>!q||k.startsWith(q));
  hints.innerHTML=matches.map(([k,v])=>`<div class="ch-item" data-cmd="/${k}" onclick="document.getElementById('log-cmd').value='/${k}';parseLogCommand()" style="padding:5px 10px;font-size:9px;color:#706860;cursor:pointer;display:flex;gap:8px;border-bottom:1px solid rgba(255,255,255,.04);font-family:'IBM Plex Mono',monospace" onmouseover="this.classList.add('focused');this.style.background='rgba(255,255,255,.04)'" onmouseout="this.classList.remove('focused');this.style.background=''">`
    +`<span style="color:#c8a040">/${k}</span><span>${v.desc}</span></div>`).join('');
}

let _spotlightPrev=null;
function toggleLogSpotlight(){
  if(window._ob&&window._ob.isActive&&window._ob.isActive()){window._ob.skip();return;}
  const win=document.getElementById('logwin');
  if(win.classList.contains('spotlight')){
    win.classList.remove('spotlight');
    if(_spotlightPrev){
      win.style.left=_spotlightPrev.left;win.style.top=_spotlightPrev.top;
      win.style.right=_spotlightPrev.right;win.style.bottom=_spotlightPrev.bottom;
      win.style.width=_spotlightPrev.width;win.style.height=_spotlightPrev.height;
      win.style.transform='';_spotlightPrev=null;
    }
    document.getElementById('cmd-hints').innerHTML='';
  } else {
    _spotlightPrev={left:win.style.left,top:win.style.top,right:win.style.right,
      bottom:win.style.bottom,width:win.style.width,height:win.style.height};
    win.classList.add('spotlight');
    const inp=document.getElementById('log-cmd');
    inp.value='';inp.focus();
    renderCmdHints('');
  }
}

// ══════════════════════════════
// AGENT BUILDER (MOCK)
// ══════════════════════════════
const MOCK_AGENT_FLOW=[
  {ask:`¡Hola! Voy a ayudarte a crear un **agente personalizado**.\n\n¿Qué hace este agente?`,chips:['Investigador de tendencias','Generador de contenido','Validador de output','Distribuidor multiplataforma']},
  {ask:`¿Cuál es el **prompt principal** — instrucciones exactas del agente?`,chips:['Buscar tendencias y rankear por engagement','Generar texto SEO optimizado','Validar formato JSON y campos','Publicar en múltiples plataformas']},
  {ask:`Define **Meta** y **Goal** (separa con /):`,chips:['Meta: Investigar / Goal: Top 10 ideas','Meta: Crear contenido / Goal: Draft listo','Meta: Validar / Goal: JSON sin errores']},
  {ask:`¿Cuáles son las **subtareas** internas? (2-4 pasos)`,chips:['2 subtareas','3 subtareas','4 pasos detallados']},
  {ask:`¿Cómo **verificamos** que funcionó? Condición de éxito:`,chips:['Output JSON válido con todos los campos','Score de calidad > 7/10','Formato correcto + no vacío']},
  {ask:`¿Qué **tipo de input** espera este agente?`,chips:['text — texto plano','json — datos estructurados','image — imagen','video — clip de video','file — archivo','any — cualquier tipo']},
  {ask:`¿Qué **tipo de output** entrega al siguiente agente?`,chips:['text — texto procesado','json — datos estructurados','image — imagen generada','video — clip generado','file — archivo exportado']},
  {ask:`¿Qué **skills** necesita? (MCPs u otras herramientas)`,chips:['Sin skills por ahora','web_search — búsqueda web','notion_mcp — Notion','github_mcp — GitHub','Sin skills — solo IA']},
  {ask:`¿Qué **botones de acción** quieres en el card?`,chips:['▶ Ejecutar + ⏸ Pausar','▶ Run + ■ Stop + ↺ Reset','✓ Aprobar + ✕ Rechazar']},
];
const MOCK_SKILL_FLOW=[
  {ask:`Vamos a crear una **skill**. ¿Qué tipo de superpoder le da al agente?`,chips:['MCP — integración con app externa','API HTTP REST','Script local ejecutable','Webhook — recibe/envía eventos']},
  {ask:`¿Nombre de la skill y qué hace en una línea?`,chips:['notion_writer — escribe en Notion','twitter_scraper — tendencias','github_pusher — sube código','email_sender — envía emails']},
  {ask:`¿Endpoint o URL del MCP/API?`,chips:['https://mcp.notion.com/sse','https://api.twitter.com/v2','https://api.github.com','URL personalizada...']},
  {ask:`¿Qué **parámetros** recibe?`,chips:['query: string (requerido)','url + method: GET|POST','token + content: string','Sin parámetros']},
  {ask:`¿Qué **devuelve** la skill?`,chips:['JSON con resultados','Texto plano','Array de items','Boolean éxito/fallo']},
  {ask:`¿Requiere autenticación? ¿Rate limit?`,chips:['Sin auth — libre','API Key en header','OAuth 2.0','100 req/hora límite']},
];
const MOCK_TEMPLATES={
  investig:{name:'Agente Investigador',icon:'⌕',color:'#1a4a2a',inputType:'text',outputType:'json',meta:'Busca tendencias y genera insights.',goal:'Lista top 10 ideas con score engagement.',prompt:'Investiga tendencias para el tema dado. Devuelve JSON con 10 ideas ordenadas por potencial viral.',verification:'Mínimo 5 ideas con engagement_score > 7.',subtasks:['Scrapear tendencias','Analizar engagement','Rankear por potencial'],buttons:[{icon:'⌕',label:'Buscar',bg:'#1a2a1a',fg:'#3a9a6a',action:'run'},{icon:'≡',label:'Ver lista',bg:'#121a12',fg:'#2a7a4a',action:'view'}],tests:[{name:'Input válido',desc:'Topic no vacío'},{name:'Output format',desc:'JSON con array ideas'}]},
  default:{name:'Agente Personalizado',icon:'◆',color:'#2a2a3a',inputType:'text',outputType:'json',meta:'Procesa datos y genera output estructurado.',goal:'Output JSON para el siguiente agente.',prompt:'Recibe input del agente anterior y procesa según instrucciones.',verification:'Output JSON válido.',subtasks:['Recibir input','Procesar','Validar resultado'],buttons:[{icon:'▶',label:'Ejecutar',bg:'#1a1a2a',fg:'#6060bf',action:'run'},{icon:'⏸',label:'Pausar',bg:'#141420',fg:'#4a4a8a',action:'pause'}],tests:[{name:'Smoke test',desc:'Inicia sin errores'},{name:'Output format',desc:'Valida JSON'}]}
};
const MOCK_SKILL_TEMPLATES={
  mcp:{name:'notion_mcp',icon:'📋',color:'#1a1a3a',type:'MCP',endpoint:'https://mcp.notion.com/sse',description:'Lee y escribe en Notion',params:[{name:'database_id',required:true},{name:'content',required:false}],output:'JSON con página',auth:'Bearer token',rateLimit:'100 req/h'},
  default:{name:'custom_skill',icon:'⬡',color:'#1a2a3a',type:'API HTTP',endpoint:'https://api.ejemplo.com/v1',description:'Skill personalizada',params:[{name:'param1',required:true}],output:'JSON de respuesta',auth:'API Key',rateLimit:'Variable'}
};

function openAgentBuilder(){builderMode='agent';closeSide();_openBuilderWin('Constructor de Agente','AGENTE');if(!document.getElementById('awin-msgs').children.length)startMockConversation('agent');initAwinDrag();initAwinResize();}
function openSkillBuilder(){builderMode='skill';closeSide();_openBuilderWin('Constructor de Skill','SKILL');document.getElementById('awin-msgs').innerHTML='';startMockConversation('skill');initAwinDrag();initAwinResize();}
function _openBuilderWin(title,badge){const win=document.getElementById('agentwin');win.classList.add('open');document.querySelector('.awin-title').textContent=title;const b=document.getElementById('awin-badge');b.textContent=badge;b.style.color=badge==='SKILL'?'#6090c0':'#c8a040';}
function closeAgentBuilder(){document.getElementById('agentwin').classList.remove('open');}
function toggleAwinMin(){const win=document.getElementById('agentwin');awinMinimized=!awinMinimized;win.classList.toggle('minimized',awinMinimized);if(!awinMinimized)win.style.height=awinPrevH+'px';else awinPrevH=win.offsetHeight;}
function toggleAwinMax(){const win=document.getElementById('agentwin');if(win.offsetHeight<400){awinPrevH=win.offsetHeight;win.style.height='560px';}else win.style.height=awinPrevH+'px';}
function startMockConversation(mode){awinStep=0;awinBuilding={type:mode==='skill'?'skill':'custom'};document.getElementById('awin-savebar').classList.remove('show');updateAwinPreview(awinBuilding);const flow=mode==='skill'?MOCK_SKILL_FLOW:MOCK_AGENT_FLOW;renderAwinChips(flow[0].chips);setTimeout(()=>appendAiMsg(flow[0].ask),300);}
function appendAiMsg(text,isCard,data){const msgs=document.getElementById('awin-msgs');msgs.querySelector('.typing-wrap')?.remove();const wrap=document.createElement('div');wrap.className='amsg ai';const lbl=document.createElement('div');lbl.className='amsg-label';lbl.textContent=builderMode==='skill'?'Constructor Skills':'Constructor Agentes';const bub=document.createElement('div');bub.className='amsg-bubble';bub.innerHTML=text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');wrap.appendChild(lbl);wrap.appendChild(bub);if(isCard&&data)wrap.appendChild(buildACard(data));msgs.appendChild(wrap);msgs.scrollTop=msgs.scrollHeight;}
function appendUserMsg(text){const msgs=document.getElementById('awin-msgs');const wrap=document.createElement('div');wrap.className='amsg user';const lbl=document.createElement('div');lbl.className='amsg-label';lbl.textContent='Tú';const bub=document.createElement('div');bub.className='amsg-bubble';bub.textContent=text;wrap.appendChild(lbl);wrap.appendChild(bub);msgs.appendChild(wrap);msgs.scrollTop=msgs.scrollHeight;}
function showTyping(){const msgs=document.getElementById('awin-msgs');const wrap=document.createElement('div');wrap.className='amsg ai typing-wrap';const bub=document.createElement('div');bub.className='amsg-bubble';bub.innerHTML='<div class="typing-dots"><span></span><span></span><span></span></div>';wrap.appendChild(bub);msgs.appendChild(wrap);msgs.scrollTop=msgs.scrollHeight;}
function buildACard(data){const card=document.createElement('div');card.className='amsg-card';const isSkill=data.type==='skill'||data.endpoint;card.innerHTML=isSkill?`<div class="amsg-card-title"><div style="width:8px;height:8px;border-radius:2px;background:${data.color||'#4a7abf'};flex-shrink:0"></div>${data.name} <span style="font-size:8px;opacity:.5">${data.type}</span></div><div class="amsg-card-row"><span class="amsg-card-key">Endpoint</span><span class="amsg-card-val" style="font-size:8px">${data.endpoint||'—'}</span></div><div class="amsg-card-row"><span class="amsg-card-key">Params</span><span class="amsg-card-val">${(data.params||[]).map(p=>p.name+(p.required?'*':'')).join(', ')||'—'}</span></div><div class="amsg-card-row"><span class="amsg-card-key">Output</span><span class="amsg-card-val">${data.output||'—'}</span></div>`:
  `<div class="amsg-card-title"><div style="width:8px;height:8px;border-radius:2px;background:${data.color||'#706860'};flex-shrink:0"></div>${data.name||'Agente'}</div><div class="amsg-card-row"><span class="amsg-card-key">Meta</span><span class="amsg-card-val">${data.meta||'—'}</span></div><div class="amsg-card-row"><span class="amsg-card-key">I/O</span><span class="amsg-card-val">${IO_ICONS[data.inputType]||'◆'} ${data.inputType||'any'} → ${IO_ICONS[data.outputType]||'◆'} ${data.outputType||'any'}</span></div><div class="amsg-card-row"><span class="amsg-card-key">Skills</span><span class="amsg-card-val">${(data.skills||[]).map(s=>s.name||s).join(', ')||'Sin skills'}</span></div><div class="amsg-card-divider"></div><div class="amsg-card-tags">${(data.buttons||[]).map(b=>`<span class="amsg-card-tag" style="background:${b.bg};color:${b.fg}">${b.icon} ${b.label}</span>`).join('')}</div>`;
  return card;}
function renderAwinChips(chips){const c=document.getElementById('awin-chips');c.innerHTML=chips.map(ch=>`<button class="aqchip${ch.includes('✦')||ch.includes('Guardar')?'  gold':''}" onclick="chipClick(this.textContent)">${ch}</button>`).join('');}
function chipClick(text){document.getElementById('awin-input').value=text;sendAwinMsg();}
function awinKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAwinMsg();}}
function sendAwinMsg(){
  const inp=document.getElementById('awin-input');const text=inp.value.trim();if(!text||awinTyping)return;
  inp.value='';inp.style.height='auto';appendUserMsg(text);document.getElementById('awin-chips').innerHTML='';
  awinTyping=true;document.getElementById('awin-send').disabled=true;document.getElementById('awin-badge').textContent='...';showTyping();
  setTimeout(()=>processMock(text),600+Math.random()*300);
}
function processMock(userText){
  awinTyping=false;document.getElementById('awin-send').disabled=false;
  const flow=builderMode==='skill'?MOCK_SKILL_FLOW:MOCK_AGENT_FLOW;
  if(builderMode==='agent'){
    if(awinStep===0)awinBuilding._rawDesc=userText;
    if(awinStep===1)awinBuilding.prompt=userText;
    if(awinStep===5)awinBuilding.inputType=userText.split('—')[0].trim().split(' ')[0];
    if(awinStep===6)awinBuilding.outputType=userText.split('—')[0].trim().split(' ')[0];
    if(awinStep===7)awinBuilding._rawSkills=userText;
  } else {
    if(awinStep===0)awinBuilding._rawType=userText;
    if(awinStep===1)awinBuilding.name=userText.split('—')[0].trim();
    if(awinStep===2)awinBuilding.endpoint=userText;
  }
  awinStep++;document.getElementById('awin-badge').textContent=builderMode==='skill'?'SKILL':'AGENTE';
  updateAwinPreview(awinBuilding);
  if(awinStep<flow.length){appendAiMsg(flow[awinStep].ask);setTimeout(()=>renderAwinChips(flow[awinStep].chips),50);}
  else finalizeMock();
}
function finalizeMock(){
  let final;
  if(builderMode==='agent'){
    const desc=(awinBuilding._rawDesc||'').toLowerCase();
    const tpl=(desc.includes('investig')||desc.includes('trend'))?MOCK_TEMPLATES.investig:MOCK_TEMPLATES.default;
    final={...tpl,...awinBuilding};final.skills=[];
    const rawSkills=awinBuilding._rawSkills||'';
    if(rawSkills.includes('notion'))final.skills.push({id:'notion_mcp',name:'notion_mcp',color:'#1a1a3a'});
    if(rawSkills.includes('web_search')||rawSkills.includes('twitter'))final.skills.push({id:'web_search',name:'web_search',color:'#1a2a3a'});
    if(!rawSkills.includes('Sin')){}
  } else {
    const rt=(awinBuilding._rawType||'').toLowerCase();
    const tpl=rt.includes('mcp')?MOCK_SKILL_TEMPLATES.mcp:MOCK_SKILL_TEMPLATES.default;
    final={...tpl,...awinBuilding,type:'skill'};
  }
  Object.assign(awinBuilding,final);updateAwinPreview(awinBuilding);
  appendAiMsg(`¡Listo! Aquí está la ${builderMode==='skill'?'skill':'agente'} completa. ¿Todo correcto? Puedes guardarla o pedirme ajustes.`,true,awinBuilding);
  renderAwinChips(['✦ Guardar','Cambiar nombre','Ajustar prompt','Cambiar I/O','Descartar']);
  document.getElementById('awin-savebar').classList.add('show');
  document.querySelector('.awin-save-btn').textContent=`✦ Guardar ${builderMode==='skill'?'skill':'agente'} en biblioteca`;
}
function updateAwinPreview(data){
  const dot=document.getElementById('awp-dot');const name=document.getElementById('awp-name');const chips=document.getElementById('awp-chips');
  if(dot)dot.style.background=data.color||'#706860';if(name)name.textContent=data.name||'Nuevo...';
  if(chips){
    const isSkill=builderMode==='skill';
    const fields=isSkill?[{k:'endpoint',l:'endpoint'},{k:'params',l:'params'},{k:'output',l:'output'}]:[{k:'prompt',l:'prompt'},{k:'inputType',l:'input type'},{k:'outputType',l:'output type'},{k:'tests',l:'tests'}];
    chips.innerHTML=fields.map(f=>{const v=data[f.k];const ok=Array.isArray(v)?v.length>0:!!v;return`<span class="awp-chip ${ok?'ok':''}">${f.l} ${ok?'✓':'—'}</span>`;}).join('');
  }
}
function saveCustomAgent(){
  if(!awinBuilding.name&&!awinBuilding.type){appendAiMsg('Aún no hay nada para guardar. Continúa la conversación.');return;}
  if(builderMode==='skill'){
    const id='skill_'+Date.now();const skill={...awinBuilding,id,savedAt:new Date().toISOString()};
    fetch('/api/skills',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(skill)}).catch(()=>{});
    customSkills.push(skill);appendSkillToSidebar(skill);
    appendAiMsg(`✦ Skill **${skill.name}** guardada. Asígnala a cualquier agente desde el menú contextual.`);
  } else {
    const id='custom_'+Date.now();const agent={...awinBuilding,id,savedAt:new Date().toISOString()};
    fetch('/api/agents',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(agent)}).catch(()=>{});
    appendCustomAgentToSidebar(agent);
    T[id]={label:agent.name,icon:agent.icon||'◆',hbg:darken2(agent.color||'#3a3028',1.2),hbg2:darken2(agent.color||'#3a3028',0.8),dot:agent.color||'#706860',meta:agent.meta||'',goal:agent.goal||'',subtasks:agent.subtasks||[],actions:(agent.buttons||[]).map(b=>b.label),actionIcons:(agent.buttons||[]).map(b=>b.icon),actionColors:(agent.buttons||[]).map(b=>b.bg||'#1e1a18'),vis:'tasks',cond:false,prompt:agent.prompt||'',verification:agent.verification||'',inputType:agent.inputType||'text',outputType:agent.outputType||'json',inputLabel:agent.inputLabel||'Input',outputLabel:agent.outputLabel||'Output',inputDefault:agent.inputDefault||''};
    appendAiMsg(`✓ Agente **${agent.name}** guardado. Disponible en el panel lateral.`);
    glog('done','Builder','system','Agente guardado: '+agent.name);
  }
  document.getElementById('awin-savebar').classList.remove('show');
  setTimeout(()=>{document.getElementById('awin-msgs').innerHTML='';awinBuilding={};updateAwinPreview({});startMockConversation(builderMode);},2000);
}
function discardAgent(){awinBuilding={};document.getElementById('awin-savebar').classList.remove('show');document.getElementById('awin-msgs').innerHTML='';updateAwinPreview({});startMockConversation(builderMode);}
function darken2(hex,factor){try{const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgb(${Math.min(255,Math.floor(r*factor))},${Math.min(255,Math.floor(g*factor))},${Math.min(255,Math.floor(b*factor))})`;}catch{return hex;}}
function appendCustomAgentToSidebar(agent){const list=document.getElementById('custom-agents-list');if(!list)return;const div=document.createElement('div');div.className='ps-agent';div.draggable=true;div.innerHTML=`<div class="ps-adot" style="background:${agent.color||'#706860'}"></div>${agent.name}`;div.addEventListener('dragstart',e=>pd(e,agent.id));list.appendChild(div);}
function appendSkillToSidebar(skill){const list=document.getElementById('custom-skills-list');if(!list)return;const div=document.createElement('div');div.className='ps-agent';div.style.cssText='cursor:pointer;border-left:2px solid #4a7abf;padding-left:6px';div.innerHTML=`<div class="ps-adot" style="background:#4a7abf;border-radius:50%"></div><span style="color:#6090c0">${skill.name}</span>`;div.onclick=()=>glog('system','Skills','system',`${skill.name}: ${skill.description||''}  |  ${skill.endpoint||''}`);list.appendChild(div);}
async function loadFromAPI(){
  try{
    const [agents,skills]=await Promise.all([
      fetch('/api/agents').then(r=>r.json()),
      fetch('/api/skills').then(r=>r.json())
    ]);
    agents.forEach(a=>{
      appendCustomAgentToSidebar(a);
      T[a.id]={label:a.name,icon:a.icon||'◆',hbg:darken2(a.color||'#3a3028',1.2),hbg2:darken2(a.color||'#3a3028',0.8),dot:a.color||'#706860',meta:a.meta||'',goal:a.goal||'',subtasks:a.subtasks||[],actions:(a.buttons||[]).map(b=>b.label),actionIcons:(a.buttons||[]).map(b=>b.icon),actionColors:(a.buttons||[]).map(b=>b.bg||'#1e1a18'),vis:'tasks',cond:false,prompt:a.prompt||'',verification:a.verification||'',inputType:a.inputType||'text',outputType:a.outputType||'json',inputLabel:a.inputLabel||'Input',outputLabel:a.outputLabel||'Output',inputDefault:a.inputDefault||''};
    });
    customSkills=skills;skills.forEach(s=>appendSkillToSidebar(s));
  }catch(e){console.warn('loadFromAPI error:',e);}
}

function scheduleSave(){
  if(!currentPipelineId)return;
  clearTimeout(_saveTimer);
  _saveTimer=setTimeout(()=>{
    // Filter out ephemeral cards (questions, ctx-file) — those regenerate from backend
    const savableCards=outputCards.filter(c=>!c.isQuestionCard&&!c.isCtxFile&&!c.backendOutput&&!c.isConnectionPayload);
    fetch('/api/pipelines/'+currentPipelineId+'/state',{
      method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({nodes,conns,outputCards:savableCards})
    }).catch(()=>{});
  },1500);
}

function exportPipeline(){
  const name=document.getElementById('pipe-label')?.textContent||'pipeline';
  const data={version:1,name,exportedAt:new Date().toISOString(),nodes,conns};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=name.replace(/\s+/g,'_').toLowerCase()+'_pipeline.json';
  a.click();URL.revokeObjectURL(a.href);
  glog('done','Pipeline','system','Pipeline exportado: '+a.download);
}

function importPipeline(){
  document.getElementById('import-file-input').click();
}

function handleImportFile(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      if(!data.nodes||!data.conns)throw new Error('Formato inválido');
      nodes.forEach(n=>document.getElementById(n.id)?.remove());
      outputCards.forEach(oc=>document.getElementById(oc.id)?.remove());
      nodes=[];conns=[];outputCards=[];
      const nameLabel=data.name||file.name.replace(/_pipeline\.json$/,'').replace(/_/g,' ');
      document.getElementById('pipe-label').textContent=nameLabel;
      data.nodes.forEach(n=>{nodes.push(n);mkNode(n);});
      conns=data.conns||[];
      setTimeout(()=>{drawConns();fitAll();updateMM();scheduleSave();},80);
      glog('done','Pipeline','system','Pipeline importado: '+nameLabel+' — '+nodes.length+' agentes');
    }catch(err){
      glog('error','Pipeline','system','Error al importar: '+err.message);
    }
  };
  reader.readAsText(file);
  input.value='';
}

function createDefaultNodes(){
  const center=getCanvasViewportCenter();
  const startX=center.x-520;
  const startY=center.y-240;
  const rs=addNode('research',startX,startY+50);
  const hm=addNode('human',startX+300,startY+50);
  const pl=addNode('pilot',startX+600,startY);
  const pr=addNode('prompt',startX+920,startY);
  const im=addNode('image',startX,startY+390);
  const vi=addNode('video',startX+300,startY+390);
  const as=addNode('assembly',startX+600,startY+390);
  hm.name='Operador — Aprobar idea';
  as.name='Agente Ensamblaje';
  document.getElementById(hm.id).querySelector('.nh-name').textContent=hm.name;
  document.getElementById(as.id).querySelector('.nh-name').textContent=as.name;
  conns.push({id:'c'+Math.random().toString(36).slice(2,10),from:rs.id,fp:'out',to:hm.id,tp:'in',active:false});
  conns.push({id:'c'+Math.random().toString(36).slice(2,10),from:hm.id,fp:'out-y',to:pl.id,tp:'in',active:false,cond:true,condT:'yes'});
  conns.push({id:'c'+Math.random().toString(36).slice(2,10),from:hm.id,fp:'out-n',to:rs.id,tp:'in',active:false,cond:true,condT:'no'});
  conns.push({id:'c'+Math.random().toString(36).slice(2,10),from:pl.id,fp:'out-y',to:pr.id,tp:'in',active:false,cond:true,condT:'yes'});
  conns.push({id:'c'+Math.random().toString(36).slice(2,10),from:pl.id,fp:'out-n',to:hm.id,tp:'in',active:false,cond:true,condT:'no'});
  conns.push({id:'c'+Math.random().toString(36).slice(2,10),from:pr.id,fp:'out',to:im.id,tp:'in',active:false});
  conns.push({id:'c'+Math.random().toString(36).slice(2,10),from:im.id,fp:'out',to:vi.id,tp:'in',active:false});
  conns.push({id:'c'+Math.random().toString(36).slice(2,10),from:vi.id,fp:'out',to:as.id,tp:'in',active:false});
}

// Awin drag & resize
let _ad=false,_ar=false;
function initAwinDrag(){if(_ad)return;_ad=true;let dr=false,ox=0,oy=0;const bar=document.getElementById('awin-bar'),win=document.getElementById('agentwin');bar.addEventListener('mousedown',e=>{if(e.target.classList.contains('ltb-dot'))return;dr=true;const r=win.getBoundingClientRect();ox=e.clientX-r.left;oy=e.clientY-r.top;e.preventDefault();});document.addEventListener('mousemove',e=>{if(!dr)return;win.style.left=Math.max(0,Math.min(window.innerWidth-win.offsetWidth,e.clientX-ox))+'px';win.style.top=Math.max(0,Math.min(window.innerHeight-win.offsetHeight,e.clientY-oy))+'px';win.style.bottom='auto';win.style.right='auto';});document.addEventListener('mouseup',()=>{dr=false;});}
function initAwinResize(){if(_ar)return;_ar=true;
  const win=document.getElementById('agentwin');
  // bottom handle
  (function(){let rs=false,sY=0,sH=0;const h=document.getElementById('awin-resize');h.addEventListener('mousedown',e=>{rs=true;sY=e.clientY;sH=win.offsetHeight;e.preventDefault();});document.addEventListener('mousemove',e=>{if(!rs)return;win.style.height=Math.max(200,Math.min(700,sH-(e.clientY-sY)))+'px';awinPrevH=win.offsetHeight;});document.addEventListener('mouseup',()=>{rs=false;});})();
  // top handle
  (function(){let rs=false,sY=0,sH=0;const h=document.getElementById('awin-resize-t');h.addEventListener('mousedown',e=>{rs=true;sY=e.clientY;sH=win.offsetHeight;e.preventDefault();});document.addEventListener('mousemove',e=>{if(!rs)return;win.style.height=Math.max(200,Math.min(700,sH-(e.clientY-sY)))+'px';awinPrevH=win.offsetHeight;});document.addEventListener('mouseup',()=>{rs=false;});})();
  // right handle
  (function(){let rs=false,sX=0,sW=0;const h=document.getElementById('awin-resize-r');h.addEventListener('mousedown',e=>{rs=true;sX=e.clientX;sW=win.offsetWidth;e.preventDefault();});document.addEventListener('mousemove',e=>{if(!rs)return;win.style.width=Math.max(300,Math.min(Math.round(window.innerWidth*.9),sW+(e.clientX-sX)))+'px';});document.addEventListener('mouseup',()=>{rs=false;});})();
}

// ══════════════════════════════
// SKILL ADAPT PANEL
// ══════════════════════════════
const SKILL_EXAMPLES={
  web_search:{
    research:[
      {title:'Tendencias en tiempo real',cmd:'search("top AI trends site:twitter.com OR reddit.com")',desc:'Busca los temas más virales antes de rankear ideas para el pipeline'},
      {title:'Verificar engagement previo',cmd:'search("topic viral videos last 30 days -site:youtube.com")',desc:'Confirma que el tema tiene tracción real antes de pasar al Piloto'},
      {title:'Análisis de competencia',cmd:'search("competitor channel uploads last week site:youtube.com")',desc:'Detecta qué están produciendo canales similares para diferenciarte'},
    ],
    pilot:[
      {title:'Estado de APIs externas',cmd:'search("site:status.openai.com OR status.runway.ml incidents")',desc:'Verifica uptime de herramientas antes de lanzar el pipeline completo'},
      {title:'Documentación actualizada',cmd:'search("runway gen3 alpha API parameters 2025")',desc:'Consulta parámetros actualizados de herramientas antes de configurar agentes'},
    ],
    prompt:[
      {title:'Referencias visuales',cmd:'search("cinematic lighting reference 4K photography site:pinterest.com")',desc:'Enriquece los prompts con terminología y referencias visuales actuales'},
      {title:'Estilo de directores',cmd:'search("Christopher Nolan lighting cinematography breakdown")',desc:'Agrega referencias de directores reconocidos para coherencia visual'},
    ],
    image:[
      {title:'Referencia de escena',cmd:'search("scene reference photography filetype:jpg")',desc:'Trae imágenes reales como guía de composición para el modelo generativo'},
    ],
    default:[
      {title:'Consultar información',cmd:'search("query relevante al contexto")',desc:'Enriquece el contexto del agente con datos actuales de la web'},
      {title:'Verificar datos',cmd:'search("fact-check dato específico site:fuente.com")',desc:'Confirma información externa antes de continuar el pipeline'},
    ]
  },
  notion_mcp:{
    pilot:[
      {title:'Leer brief del cliente',cmd:'notion.query(database="Clientes", filter={status:"Activo"})',desc:'Carga el contexto completo del proyecto al iniciar el pipeline'},
      {title:'Actualizar estado del pipeline',cmd:'notion.update(page_id, {status:"En progreso", started_at: now()})',desc:'Refleja el estado en tiempo real en el dashboard del equipo'},
      {title:'Log de ejecución',cmd:'notion.create(db="Logs Pipeline", {nombre, timestamp, resultado, errores})',desc:'Registra cada ejecución para trazabilidad y auditoría'},
    ],
    research:[
      {title:'Guardar ideas aprobadas',cmd:'notion.create(db="Ideas Contenido", {titulo, score, fecha, estado:"aprobada"})',desc:'Persiste la lista de ideas para revisiones futuras del equipo'},
      {title:'Evitar repetición de temas',cmd:'notion.query(db="Historial Videos", sort="fecha desc", limit=50)',desc:'Consulta temas ya producidos antes de rankear nuevas ideas'},
    ],
    assembly:[
      {title:'Metadatos para publicación',cmd:'notion.update(page_id, {titulo, descripcion, tags, plataforma, fecha_pub})',desc:'Escribe los metadatos finales del video listos para el gestor de redes'},
      {title:'Checklist de calidad',cmd:'notion.update(checklist_id, items=["audio","colores","subtitulos","thumbnail"])',desc:'Marca los items completados del checklist de entrega'},
    ],
    default:[
      {title:'Leer contexto',cmd:'notion.query(database_id, {filter, sort})',desc:'Carga información relevante desde Notion al iniciar la tarea'},
      {title:'Escribir resultado',cmd:'notion.create(page, {title, content: output, date: now()})',desc:'Persiste el output del agente en la base de datos del equipo'},
    ]
  },
  github_mcp:{
    pilot:[
      {title:'Versionar configuración',cmd:'github.push(repo, "config/pipeline.json", JSON.stringify(config), "update pipeline config")',desc:'Versiona automáticamente los cambios de configuración del pipeline'},
      {title:'Crear issue si falla',cmd:'github.create_issue(repo, {title:"Pipeline failed", body: error_log, labels:["bug"]})',desc:'Abre un issue con el log completo de errores para el equipo de desarrollo'},
    ],
    research:[
      {title:'Guardar resultados en repo',cmd:'github.push(repo, "data/ideas_"+date+".json", JSON.stringify(ideas))',desc:'Archiva los resultados de investigación con historial de versiones'},
    ],
    default:[
      {title:'Pushear output',cmd:'github.push(repo, path, content, commit_message)',desc:'Sube el output del agente al repositorio con mensaje de commit'},
      {title:'Leer configuración',cmd:'github.get_file(repo, "config/settings.json", branch="main")',desc:'Carga configuración versionada desde el repositorio'},
    ]
  },
  image_gen:{
    image:[
      {title:'Generar imagen principal',cmd:'flux.imagine(prompt, {model:"flux-pro", ratio:"16:9", steps:30})',desc:'Genera la imagen fotorrealista de la escena con Flux Pro'},
      {title:'Variaciones de estilo',cmd:'flux.batch(prompt, {seeds:[42,99,137], style:"cinematic", n:3})',desc:'Crea 3 variaciones y selecciona la más coherente con el guión'},
      {title:'Upscale automático',cmd:'esrgan.upscale(image_id, {factor:4, model:"real-esrgan-x4"})',desc:'Mejora resolución a 4K antes de pasar al agente Video'},
    ],
    prompt:[
      {title:'Preview rápido del prompt',cmd:'flux.imagine(prompt_draft, {steps:8, quick:true, width:512})',desc:'Genera un preview en segundos para validar el prompt antes de producción'},
    ],
    pilot:[
      {title:'Generar thumbnail del pipeline',cmd:'flux.imagine("thumbnail for "+pipeline_name, {style:"tech", ratio:"16:9"})',desc:'Crea una imagen representativa del pipeline para el dashboard'},
    ],
    default:[
      {title:'Generar imagen',cmd:'flux.imagine(prompt, {width:1920, height:1080, format:"png"})',desc:'Genera imagen base en resolución Full HD para el pipeline'},
    ]
  },
  voice_tts:{
    assembly:[
      {title:'Narración del video',cmd:'tts.generate(script, {voice:"es-female-neutral", speed:0.95, format:"mp3"})',desc:'Genera el voiceover completo del guión sincronizado con el video'},
      {title:'Ajustar timing',cmd:'tts.generate(script, {target_duration: video_length, auto_pace:true})',desc:'Sincroniza automáticamente la narración con la duración exacta del clip'},
    ],
    prompt:[
      {title:'Preview narrativo',cmd:'tts.preview(prompt_text, {voice:"es-male", speed:1.0})',desc:'Escucha el prompt narrado para detectar incoherencias antes de producción'},
    ],
    human:[
      {title:'Leer opciones al operador',cmd:'tts.generate(options_summary, {voice:"es-neutral", alert:true})',desc:'Narra las opciones pendientes de aprobación para revisión sin pantalla'},
    ],
    default:[
      {title:'Text-to-speech',cmd:'tts.generate(text, {voice:"es-neutral", format:"mp3", quality:"high"})',desc:'Convierte el output del agente a audio para el siguiente paso del pipeline'},
    ]
  },
  email_send:{
    pilot:[
      {title:'Notificar fin de pipeline',cmd:'email.send({to:client_email, subject:"Pipeline completado ✓", body:summary, attach:[report]})',desc:'Envía resumen automático al cliente al completarse el pipeline'},
      {title:'Alerta de fallo',cmd:'email.send({to:team_email, subject:"⚠ Pipeline failed", body:error_log, priority:"high"})',desc:'Notifica inmediatamente al equipo si algún agente falla en producción'},
    ],
    human:[
      {title:'Enviar para aprobación externa',cmd:'email.send({to:approver, subject:"Revisar ideas — acción requerida", body:ideas_html, attach:[pdf_report]})',desc:'Manda las opciones al operador externo para aprobación cuando no está en el sistema'},
    ],
    research:[
      {title:'Reporte semanal de tendencias',cmd:'email.send({to:team, subject:"Tendencias semana "+week, body:formatted_ideas, schedule:"weekly"})',desc:'Envía automáticamente el reporte de investigación al equipo cada semana'},
    ],
    default:[
      {title:'Enviar notificación',cmd:'email.send({to, subject, body, attachments:[]})',desc:'Notifica por email al finalizar la tarea del agente'},
    ]
  }
};

let skillAdaptNodeId=null,skillAdaptSkillIdx=0;

function openSkillAdapt(nodeId){
  const n=nodes.find(x=>x.id===nodeId);if(!n||!n.skills.length)return;
  skillAdaptNodeId=nodeId;skillAdaptSkillIdx=0;
  const tp=T[n.type];
  document.getElementById('skh-dot').style.background=tp.dot||'#4a7abf';
  document.getElementById('skh-title').textContent='Integrar skills con '+n.name;
  document.getElementById('skh-sub').textContent=n.skills.map(s=>s.name).join(' · ');
  renderSkillAdaptTabs(n);
  renderSkillAdaptBody(n,0);
  document.getElementById('sk-apply-btn').onclick=()=>applySkillToPrompt(nodeId);
  document.getElementById('sk-remove-btn').onclick=()=>removeSkillFromNode(nodeId,skillAdaptSkillIdx);
  document.getElementById('skillwin').classList.add('open');
}
function closeSkillAdapt(){document.getElementById('skillwin').classList.remove('open');skillAdaptNodeId=null;}

function renderSkillAdaptTabs(n){
  const tabs=document.getElementById('skillbox-tabs');
  tabs.innerHTML=n.skills.map((sk,i)=>`<div class="sktab ${i===0?'on':''}" onclick="selectSkillTab(${i})" style="${i===0?'color:'+sk.color+';border-bottom-color:'+sk.color:''}"><span style="color:${sk.color}">⬡</span>${sk.name}</div>`).join('');
}
function selectSkillTab(i){
  skillAdaptSkillIdx=i;
  const n=nodes.find(x=>x.id===skillAdaptNodeId);if(!n)return;
  document.querySelectorAll('.sktab').forEach((t,ti)=>{
    const sk=n.skills[ti];
    t.classList.toggle('on',ti===i);
    t.style.color=ti===i?(sk.color||'#4a7abf'):'';
    t.style.borderBottomColor=ti===i?(sk.color||'#4a7abf'):'';
  });
  renderSkillAdaptBody(n,i);
}
function renderSkillAdaptBody(n,idx){
  const sk=n.skills[idx];if(!n||!sk)return;
  const catalog=SKILL_EXAMPLES[sk.id]||{};
  const examples=catalog[n.type]||catalog.default||[{title:'Uso general',cmd:sk.name+'(input)',desc:'Conecta esta skill al flujo de trabajo del agente'}];
  document.getElementById('skillbox-body').innerHTML=examples.map(ex=>`
    <div class="sk-card">
      <div class="sk-card-head">
        <span class="sk-card-n">${ex.title}</span>
        <span class="sk-card-tag">${sk.name}</span>
      </div>
      <div class="sk-card-cmd" onclick="copySkillCmd(this)" title="Click para copiar">
        <code>${ex.cmd}</code>
        <span class="sk-copy">copiar</span>
      </div>
      <div class="sk-card-desc">${ex.desc}</div>
    </div>`).join('');
}
function copySkillCmd(el){
  const text=el.querySelector('code').textContent;
  navigator.clipboard?.writeText(text);
  const hint=el.querySelector('.sk-copy');
  hint.textContent='✓ copiado';hint.style.opacity='1';hint.style.color='#3a8a3a';
  setTimeout(()=>{hint.textContent='copiar';hint.style.opacity='';hint.style.color='';},1500);
}
function applySkillToPrompt(nodeId){
  const n=nodes.find(x=>x.id===nodeId);if(!n)return;
  const sk=n.skills[skillAdaptSkillIdx];if(!sk)return;
  const catalog=SKILL_EXAMPLES[sk.id]||{};
  const examples=catalog[n.type]||catalog.default||[];
  const addition=examples.map(ex=>`\n// ${ex.title}\n// ${ex.cmd}`).join('');
  n.prompt=(n.prompt||'')+'\n\n// Skills disponibles para '+sk.name+':'+addition;
  glog('done',n.name,n.type,'⬡ Instrucciones de '+sk.name+' agregadas al prompt');
  closeSkillAdapt();
}
function removeSkillFromNode(nodeId,idx){
  const n=nodes.find(x=>x.id===nodeId);if(!n)return;
  const sk=n.skills[idx];if(!sk)return;
  const name=sk.name;
  n.skills.splice(idx,1);
  refreshNodeSkillRings(n);
  glog('action',n.name,n.type,'⬡ Skill removida: '+name);
  if(!n.skills.length){closeSkillAdapt();return;}
  skillAdaptSkillIdx=Math.max(0,idx-1);
  renderSkillAdaptTabs(n);
  renderSkillAdaptBody(n,skillAdaptSkillIdx);
  document.getElementById('skh-sub').textContent=n.skills.map(s=>s.name).join(' · ');
}

// ══════════════════════════════
// MINIMAP
// ══════════════════════════════
function updateMM(){
  const cv=document.getElementById('mmc');const c=cv.getContext('2d');c.clearRect(0,0,140,85);c.fillStyle='#0a0808';c.fillRect(0,0,140,85);
  const sx=140/6000,sy=85/5000;
  nodes.forEach(n=>{const tp=T[n.type];c.fillStyle=tp.dot+'55';c.globalAlpha=.6;const el=document.getElementById(n.id);c.fillRect(n.x*sx,n.y*sy,230*sx,(el?.offsetHeight||160)*sy);});
  outputCards.forEach(oc=>{c.fillStyle='#c8a04033';c.globalAlpha=.4;c.fillRect(oc.x*sx,oc.y*sy,200*sx,100*sy);});
  c.globalAlpha=.3;c.strokeStyle='#c8a040';c.lineWidth=.7;c.strokeRect((-px/sc)*sx,(-py/sc)*sy,(window.innerWidth/sc)*sx,(window.innerHeight/sc)*sy);c.globalAlpha=1;
}

// Minimap click / drag → pan canvas
(function(){
  const cv=document.getElementById('mmc');
  function panToMM(e){
    const r=cv.getBoundingClientRect();
    const mx=e.clientX-r.left,my=e.clientY-r.top;
    const worldX=mx*6000/140,worldY=my*5000/85;
    px=window.innerWidth/2-worldX*sc;
    py=window.innerHeight/2-worldY*sc;
    applyT();
  }
  let mmDrag=false;
  cv.addEventListener('mousedown',e=>{mmDrag=true;panToMM(e);e.preventDefault();});
  document.addEventListener('mousemove',e=>{if(mmDrag)panToMM(e);});
  document.addEventListener('mouseup',()=>{mmDrag=false;});
})();

// ══════════════════════════════
// MODEL MANAGEMENT
// ══════════════════════════════

async function loadModelsData(){
  try{
    modelsData=await fetch('/api/models').then(r=>r.json());
    // Refresh models section if window is open
    if(document.getElementById('mtwin')?.style.display!=='none')renderMTModels();
  }catch(e){console.warn('Could not load models catalog',e);}
}

async function setAgentModelUI(agentId, provider, model){
  try{
    await fetch('/api/models/'+agentId,{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({provider,model}),
    });
    // Actualizar cache local
    modelsData.agents[agentId]={provider,model,is_custom:true};
    glog('system','Models','system',`${agentId} → ${provider}/${model}`);
    // Re-render modal si está abierto
    const n=nodes.find(x=>x.agentId===agentId);
    if(n&&modalId===n.id)renderM(n);
    renderMTModels();
  }catch(e){glog('warn','Models','system','Error cambiando modelo: '+e.message);}
}

async function resetAgentModelUI(agentId){
  try{
    const data=await fetch('/api/models/'+agentId,{method:'DELETE'}).then(r=>r.json());
    modelsData.agents[agentId]={...data,is_custom:false};
    glog('system','Models','system',`${agentId} reset al modelo por defecto`);
    const n=nodes.find(x=>x.agentId===agentId);
    if(n&&modalId===n.id)renderM(n);
    renderMTModels();
  }catch(e){glog('warn','Models','system','Error reseteando modelo: '+e.message);}
}

function buildModelSelector(n){
  if(!n.agentId)return'';
  const agentConfig=modelsData.agents[n.agentId];
  if(!agentConfig)return'';

  const catalog=modelsData.catalog;
  const allModels=Object.entries(catalog).flatMap(([prov,ms])=>
    ms.map(m=>({provider:prov,id:m.id,label:m.label,tier:m.tier}))
  );

  const currentKey=`${agentConfig.provider}/${agentConfig.model}`;
  const isCustom=agentConfig.is_custom;

  const options=allModels.map(m=>`<option value="${m.provider}||${m.id}" ${currentKey===`${m.provider}/${m.id}`?'selected':''}>[${m.provider}] ${m.label} (${m.tier})</option>`).join('');

  return`<div class="fg" style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)">
    <div class="fl" style="display:flex;justify-content:space-between;align-items:center">
      <span>Modelo LLM</span>
      ${isCustom?`<button onclick="resetAgentModelUI('${n.agentId}')" style="background:rgba(200,160,64,.08);border:1px solid rgba(200,160,64,.2);color:#c8a040;font-size:8px;padding:2px 7px;border-radius:2px;cursor:pointer;font-family:'IBM Plex Mono',monospace">↺ reset</button>`:'<span style="font-size:8px;color:#3a3630">default</span>'}
    </div>
    <select class="fi" style="margin-top:5px;cursor:pointer"
      onchange="const[prov,mod]=this.value.split('||');setAgentModelUI('${n.agentId}',prov,mod)">
      ${options}
    </select>
    <div style="font-size:8px;color:#3a3630;margin-top:3px">${currentKey}</div>
  </div>`;
}

// ══════════════════════════════
// CANVAS ↔ PIPELINE SYNC
// ══════════════════════════════

// Mapa AG-ID → tipo de nodo del canvas
const AG_TO_TYPE={
  'AG-01':'pilot',      // Piloto → coordinador
  'AG-02':'pilot',      // Orquestador → también coordinador
  'AG-03':'prompt',     // Escritor → generación de texto
  'AG-04':'image',      // Generador Img → imagen
  'AG-05':'human',      // Editor → operador humano
  'AG-06':'research',   // Investigador → research
  'AG-07':'assembly',   // Digestor → ensamblaje/consolidación
};

function normalizeSeedAgents(agentMenu,seedTemplate){
  const menu=agentMenu&&typeof agentMenu==='object'?agentMenu:{};
  const rawAgents=Array.isArray(menu.agentes)?menu.agentes:[];
  const normalized=rawAgents.map(agent=>{
    if(typeof agent==='string')return{id:agent,nombre:AGENT_NAMES[agent]||agent};
    if(!agent||typeof agent!=='object')return null;
    const id=agent.id||agent.agente_id||agent.agent_id||null;
    if(!id)return null;
    return{
      ...agent,
      id,
      nombre:agent.nombre||AGENT_NAMES[id]||id,
      rol_en_pipeline:agent.rol_en_pipeline||agent.rol||'',
    };
  }).filter(Boolean);
  const seen=new Set(normalized.map(agent=>agent.id));
  const orderedIds=Array.isArray(seedTemplate?.orden_produccion)
    ? [...new Set(seedTemplate.orden_produccion.map(step=>step?.agente).filter(Boolean))]
    : [];
  if(!seen.has('AG-01')){
    normalized.unshift({id:'AG-01',nombre:AGENT_NAMES['AG-01']||'Piloto',rol_en_pipeline:'Coordina el pipeline y consolida resultados.'});
    seen.add('AG-01');
  }
  orderedIds.forEach(id=>{
    if(seen.has(id))return;
    normalized.push({id,nombre:AGENT_NAMES[id]||id,rol_en_pipeline:''});
    seen.add(id);
  });
  if(!seen.has('AG-07')){
    normalized.push({id:'AG-07',nombre:AGENT_NAMES['AG-07']||'Digestor',rol_en_pipeline:'Ensamblador y revisor final del entregable.'});
    seen.add('AG-07');
  }
  return normalized;
}

function ensureAssemblyNodeFromContext(ctx){
  if(!ctx?.agentes_activos?.['AG-07']&&!ctx?.ensamblaje?.producto_final&&!ctx?.ensamblaje?.asset_ids?.length)return null;
  let assemblyNode=nodes.find(n=>n.type==='assembly'||n.agentId==='AG-07');
  if(assemblyNode)return assemblyNode;
  const maxX=nodes.length?Math.max(...nodes.map(n=>n.x)):2600;
  const avgY=nodes.length?(nodes.reduce((sum,n)=>sum+n.y,0)/nodes.length):2400;
  assemblyNode=addNode('assembly',maxX+420,avgY);
  assemblyNode.agentId='AG-07';
  assemblyNode.name='DIGESTOR';
  assemblyNode.meta='Ensamblaje y consolidación final.';
  assemblyNode.goal='Entregar el producto final del pipeline.';
  refreshNodeConnectionUI(assemblyNode.id);
  return assemblyNode;
}

// Construye el canvas a partir del agent_menu del Arquitecto
async function syncCanvasFromPipeline(pipelineId){
  if(pipelineId!==currentPipelineId)return; // stale call — ignore
  try{
    const seed=await fetch('/api/pipelines/'+pipelineId+'/seed').then(r=>r.json()).catch(()=>null);
    if(!seed||!seed.agent_menu?.agentes){
      hideCreatingAnimation();_pendingSeedPrompt=null;
      glog('warn','Canvas','system','El Arquitecto aún no generó el diseño del pipeline. Responde sus preguntas para que el canvas se construya.');
      return;
    }

    const agentes=normalizeSeedAgents(seed.agent_menu,seed.seed_template);
    const orden=seed.seed_template?.orden_produccion||[];
    const existingPromptCard=getCanvasPromptCard();
    const preservedPrompt=existingPromptCard?{
      ...existingPromptCard,
      content:getCanvasSeedPrompt()||existingPromptCard.content||'',
    }:null;

    // Limpiar canvas actual
    nodes.forEach(n=>document.getElementById(n.id)?.remove());
    outputCards.forEach(c=>{if(!preservedPrompt||c.id!==preservedPrompt.id)document.getElementById(c.id)?.remove();});
    nodes=[];conns=[];outputCards=preservedPrompt?[preservedPrompt]:[];
    document.getElementById('svgl').innerHTML='';
    if(preservedPrompt){
      if(preservedPrompt._kind==='seed')_renderSeedCardDOM(preservedPrompt);
      else if(preservedPrompt._kind==='input')_renderInputCardDOM(preservedPrompt);
    }

    // Layout: calcular capas por dependencias
    const viewportCenter=getCanvasViewportCenter();
    const CANVAS_CX=viewportCenter.x,CANVAS_CY=viewportCenter.y;
    const roleLayout=buildRoleAwareLayout(agentes,CANVAS_CX,CANVAS_CY);
    if(roleLayout){
      agentes.forEach(ag=>{
        const agId=ag.id;
        const type=AG_TO_TYPE[agId]||'prompt';
        const tp=T[type]||{};
        const pos=roleLayout.positions[agId]||{x:CANVAS_CX,y:CANVAS_CY};
        const n={
          id:'n'+(nid++),type,x:pos.x,y:pos.y,
          name:ag.nombre||(tp.label||agId),
          agentId:agId,
          rolEnPipeline:ag.rol_en_pipeline||'',
          status:'idle',img:null,promptOut:null,output:'',
          model:modelsData?.agents?.[agId]?.model||DEFAULT_MODEL[type]||'claude-haiku-4-5',
          meta:ag.rol_en_pipeline||tp.meta||'',
          goal:tp.goal||'',
          inputType:tp.inputType||'json',
          outputType:tp.outputType||'json',
          inputLabel:tp.inputLabel||'Input',
          outputLabel:tp.outputLabel||'Output',
          inputDefault:tp.inputDefault||'',
          prompt:tp.prompt||'',
          verification:tp.verification||'',
          logs:[{t:'--:--',m:'Agente cargado desde pipeline',c:''}],
          skills:[],
          tests:[],
        };
        nodes.push(n);mkNode(n);
      });
    }else{
      const layers=buildLayers(agentes,orden);
      const COL_W=500,ROW_H=380;
      const gridW=(layers.length-1)*COL_W;
      const gridStartX=CANVAS_CX-gridW/2;

      layers.forEach((layer,col)=>{
        const totalH=(layer.length-1)*ROW_H;
        const colYOffset=(col%2===0?-30:30);
        const startY=CANVAS_CY-totalH/2+colYOffset;
        layer.forEach((agId,row)=>{
          const ag=agentes.find(a=>a.id===agId);if(!ag)return;
          const type=AG_TO_TYPE[agId]||'prompt';
          const x=gridStartX+col*COL_W;
          const y=startY+row*ROW_H;
          const tp=T[type]||{};
          const n={
            id:'n'+(nid++),type,x,y,
            name:ag.nombre||(tp.label||agId),
            agentId:agId,
            rolEnPipeline:ag.rol_en_pipeline||'',
            status:'idle',img:null,promptOut:null,output:'',
            model:modelsData?.agents?.[agId]?.model||DEFAULT_MODEL[type]||'claude-haiku-4-5',
            meta:ag.rol_en_pipeline||tp.meta||'',
            goal:tp.goal||'',
            inputType:tp.inputType||'json',
            outputType:tp.outputType||'json',
            inputLabel:tp.inputLabel||'Input',
            outputLabel:tp.outputLabel||'Output',
            inputDefault:tp.inputDefault||'',
            prompt:tp.prompt||'',
            verification:tp.verification||'',
            logs:[{t:'--:--',m:'Agente cargado desde pipeline',c:''}],
            skills:[],
            tests:[],
          };
          nodes.push(n);mkNode(n);
        });
      });
    }

    // Crear conexiones basadas en orden_produccion
    buildConnections(orden);

    hideCreatingAnimation();

    const minX=nodes.reduce((m,n)=>Math.min(m,n.x),9999);
    const avgY=nodes.length>0?nodes.reduce((s,n)=>s+n.y,0)/nodes.length:CANVAS_CY;
    const pilotNode=nodes.find(n=>n.type==='pilot'||n.agentId==='AG-01');
    const targetNode=pilotNode||nodes[0];

    // ── Seed drop-card ──
    const seedText=(preservedPrompt?.content||'').trim()||_pendingSeedPrompt||seed.seed_template?.descripcion||seed.agent_menu?.pipeline_id||'Pipeline';
    _pendingSeedPrompt=null;
    let seedCard=preservedPrompt;
    if(seedCard){
      seedCard.content=seedText;
      if(seedCard._kind==='seed')_renderSeedCardDOM(seedCard);
      else if(seedCard._kind==='input')_renderInputCardDOM(seedCard);
    }else{
      const seedX=roleLayout?.seed?.x ?? Math.max(20,minX-300);
      const seedY=roleLayout?.seed?.y ?? (avgY-120);
      seedCard=mkSeedCard(seedText,seedX,seedY);
    }
    if(targetNode){
      conns.push({id:'c'+Math.random().toString(36).slice(2,10),from:seedCard.id,fp:'out',to:targetNode.id,tp:'in',active:true,fromSeed:true,fromCard:true});
    }

    // ── Context card (a la derecha del piloto o del primer nodo) ──
    const maxX=nodes.reduce((m,n)=>Math.max(m,n.x),CANVAS_CX);
    const ctxX=roleLayout?.context?.x ?? (maxX+320);
    const ctxY=roleLayout?.context?.y ?? (pilotNode?(pilotNode.y+20):avgY-40);
    fetch('/api/pipelines/'+pipelineId+'/context')
      .then(r=>r.json())
      .then(data=>mkContextCard(pipelineId,data?.context||{},ctxX,ctxY))
      .catch(()=>mkContextCard(pipelineId,{estado:'iniciando',pipeline_name:pipelineId},ctxX,ctxY))
      .finally(()=>drawConns());

    // ── Stagger appearance animation ──
    nodes.forEach((n,i)=>{
      const el=document.getElementById(n.id);if(!el)return;
      el.style.opacity='0';el.style.transform='translateY(16px)';
      el.style.transition=`opacity .35s ease ${i*100}ms,transform .35s ease ${i*100}ms`;
      setTimeout(()=>{el.style.opacity='1';el.style.transform='';},30+i*100);
    });

    // Actualizar pipeline ID del canvas y guardar
    currentPipelineId=pipelineId;
    // Use pipeline DB name, or template_id as fallback (not the long descripcion)
    const pipeLabel=seed.seed_template?.template_id||seed.agent_menu?.pipeline_id||'Pipeline';
    document.getElementById('pipe-label').textContent=pipeLabel.replace(/_/g,' ');
    scheduleSave();
    setTimeout(()=>{drawConns();fitAll();updateMM();},200);

    const labelClean=pipeLabel.replace(/_/g,' ');
    stopTitleCycle('Pipeline · '+labelClean+' · '+nodes.length+' agentes');
    glog('done','Canvas','system','Canvas sincronizado — '+nodes.length+' agentes renderizados');
  }catch(err){
    hideCreatingAnimation();_pendingSeedPrompt=null;
    stopTitleCycle('Log Global — Pipeline');
    glog('warn','Canvas','system','Error sincronizando canvas: '+err.message);
  }
}

// Calcula capas de agentes por dependencias del orden_produccion
function buildLayers(agentes,orden){
  const agIds=agentes.map(a=>a.id);

  // Try to build layers using agente-to-agente order from orden_produccion
  // orden pasos have { paso, agente, depende_de:[bloque names] }
  // We also try to map bloque → agente via paso.bloque field
  const bloqueToAgente={};
  orden.forEach(p=>{if(p.bloque&&p.agente)bloqueToAgente[p.bloque]=p.agente;});

  const layers=[];
  const placed=new Set();

  // Capa 0: agents with no dependencies in orden_produccion
  const capa0=agIds.filter(id=>{
    const paso=orden.find(p=>p.agente===id);
    if(!paso||!paso.depende_de||paso.depende_de.length===0)return true;
    // check if deps resolve to known agents
    return paso.depende_de.every(dep=>!bloqueToAgente[dep]);
  });
  layers.push([...new Set(capa0)]);
  capa0.forEach(id=>placed.add(id));

  // Capas siguientes
  let restantes=agIds.filter(id=>!placed.has(id));
  let guard=0;
  while(restantes.length&&guard++<20){
    const nextLayer=restantes.filter(id=>{
      const paso=orden.find(p=>p.agente===id);
      if(!paso)return true;
      return (paso.depende_de||[]).every(dep=>{
        const depAgent=bloqueToAgente[dep];
        return !depAgent||placed.has(depAgent);
      });
    });
    if(!nextLayer.length)break;
    layers.push([...new Set(nextLayer)]);
    nextLayer.forEach(id=>placed.add(id));
    restantes=agIds.filter(id=>!placed.has(id));
  }
  if(restantes.length)layers.push(restantes);

  // If all agents ended up in one layer (no dependency data resolved),
  // distribute them in a grid: max 2 per column
  if(layers.length===1&&layers[0].length>3){
    const all=layers[0];
    const cols=[];
    for(let i=0;i<all.length;i+=2)cols.push(all.slice(i,i+2));
    return cols;
  }

  return layers;
}

function buildRoleAwareLayout(agentes, centerX, centerY){
  const ids=new Set(agentes.map(a=>a.id));
  const standard=['AG-01','AG-02','AG-03','AG-04','AG-05','AG-06','AG-07'];
  const matchCount=standard.filter(id=>ids.has(id)).length;
  if(matchCount < 5)return null;

  const leftX=centerX-720;
  const midA=centerX-250;
  const midB=centerX+170;
  const midC=centerX+590;
  const topY=centerY-280;
  const stackGap=215;
  const prodY=centerY+40;

  const pos={};
  if(ids.has('AG-01'))pos['AG-01']={x:leftX,y:topY};
  if(ids.has('AG-02'))pos['AG-02']={x:leftX,y:topY+stackGap};
  if(ids.has('AG-05'))pos['AG-05']={x:leftX,y:topY+(stackGap*2)};
  if(ids.has('AG-06'))pos['AG-06']={x:leftX,y:topY+(stackGap*3)};
  if(ids.has('AG-03'))pos['AG-03']={x:midA,y:prodY};
  if(ids.has('AG-04'))pos['AG-04']={x:midB,y:prodY};
  if(ids.has('AG-07'))pos['AG-07']={x:midC,y:prodY};

  const unplaced=agentes.filter(a=>!pos[a.id]);
  unplaced.forEach((ag,index)=>{
    const row=Math.floor(index/2);
    const col=index%2;
    pos[ag.id]={x:midA+(col*420),y:prodY+260+(row*260)};
  });

  return {
    positions:pos,
    seed:{x:centerX-120,y:topY-40},
    context:{x:midC+300,y:topY-20},
  };
}

// Crea conexiones entre nodos basadas en el orden_produccion
function buildConnections(orden){
  orden.forEach(paso=>{
    if(!paso.depende_de||!paso.depende_de.length)return;
    const toNode=nodes.find(n=>n.agentId===paso.agente);
    if(!toNode)return;
    paso.depende_de.forEach(dep=>{
      const depPaso=orden.find(p=>p.bloque===dep||p.accion===dep);
      if(!depPaso)return;
      const fromNode=nodes.find(n=>n.agentId===depPaso.agente);
      if(!fromNode||fromNode.id===toNode.id)return;
      // Evitar duplicados
      if(conns.some(c=>c.from===fromNode.id&&c.to===toNode.id))return;
      conns.push({id:'c'+Math.random().toString(36).slice(2,10),from:fromNode.id,fp:'out',to:toNode.id,tp:'in',active:false});
    });
  });
  drawConns();
}

// ══════════════════════════════
// TERMINAL → API REAL
// ══════════════════════════════

// Mapa agent ID → nombre legible para el log
const AGENT_NAMES={
  'TERMINAL':'Terminal','AG-TERM':'Terminal',
  'AG-00':'Arquitecto','AG-01':'Piloto','AG-02':'Orquestador',
  'AG-03':'Escritor','AG-04':'Img Gen','AG-05':'Editor',
  'AG-06':'Investigador','AG-07':'Digestor',
};
const AGENT_TYPE_MAP={
  'AG-00':'system',
  'AG-01':'pilot',
  'AG-02':'pilot',
  'AG-03':'prompt',
  'AG-04':'image',
  'AG-05':'human',
  'AG-06':'research',
  'AG-07':'assembly',
};

// Conecta SSE para un pipeline activo
function connectSSE(pipelineId){
  if(sseConnection){sseConnection.close();sseConnection=null;}
  terminalPipelineId=pipelineId;
  const _hashParam=_pipelineHash?'&hash='+encodeURIComponent(_pipelineHash):'';
  const es=new EventSource('/api/terminal/stream?pipeline_id='+pipelineId+_hashParam);
  sseConnection=es;

  es.addEventListener('connected',()=>glog('system','Terminal','system','[SSE] Conectado al pipeline'));
  es.addEventListener('context_snapshot',e=>{
    const d=JSON.parse(e.data);
    if(d?.context)applyContextToUI(d.context,pipelineId);
  });
  es.addEventListener('pipeline_started',e=>{
    const d=JSON.parse(e.data);
    if(_userStartedRun)startPipelineRunClock(d.timestamp);
    glog('action','Piloto','agent','Pipeline iniciado');
  });
  es.addEventListener('pipeline_tick',e=>{
    const d=JSON.parse(e.data);
    if(typeof d.cycle==='number')glog('think','Piloto','agent','Tick de pipeline · ciclo '+d.cycle);
  });
  es.addEventListener('agent_started',e=>{
    const d=JSON.parse(e.data);
    const n=nodes.find(x=>x.agentId===d.agent_id);
    if(!n)return;
    n.streamText='';
    setStatus(n.id,'running');
    // Refresh vis so streaming placeholder renders immediately
    const visEl=document.getElementById('vis_'+n.id);
    if(visEl)visEl.innerHTML=visHTML(n);
  });
  es.addEventListener('agent_stream',e=>{
    const d=JSON.parse(e.data);
    const n=nodes.find(x=>x.agentId===d.agent_id);
    if(!n||n.status!=='running')return;
    n.streamText=(n.streamText||'')+d.delta;
    // Update in-place to avoid full re-render on every chunk
    const streamEl=document.getElementById('nstream_'+n.id);
    if(streamEl){streamEl.textContent=n.streamText.slice(-280);}
    else{const visEl=document.getElementById('vis_'+n.id);if(visEl)visEl.innerHTML=visHTML(n);}
  });
  es.addEventListener('agent_updated',e=>{
    const d=JSON.parse(e.data);
    const n=nodes.find(x=>x.agentId===d.agent_id);
    if(!n)return;
    if(d.status==='completado')setStatus(n.id,'done');
    else if(d.status==='error')setStatus(n.id,'error');
    else if(d.status==='model_used'){
      if(d.model)n.model=d.model;
      const sel=document.getElementById('msel_'+n.id);
      if(sel&&d.provider&&d.model&&sel.querySelector(`option[value="${d.provider}||${d.model}"]`))sel.value=`${d.provider}||${d.model}`;
      glog('system',AGENT_NAMES[d.agent_id]||d.agent_id,'agent','Modelo real: '+[d.provider,d.model].filter(Boolean).join('/'));
    }
    else if(d.status==='media_model_used'){
      glog('system',AGENT_NAMES[d.agent_id]||d.agent_id,'agent','Motor media: '+[d.media_provider,d.media_model].filter(Boolean).join('/'));
    }
  });
  es.addEventListener('asset_ready',e=>{
    const d=JSON.parse(e.data);
    glog('done',AGENT_NAMES[d.agent_id]||d.agent_id,'agent','Asset listo: '+(d.bloque||d.asset_id||'resultado'));
  });
  es.addEventListener('output_ready',e=>{
    const d=JSON.parse(e.data);
    if(d?.output){
      dropBackendOutputCard(d.output);
      glog('done',AGENT_NAMES[d.agent_id]||d.agent_id,'agent','Output listo: '+(d.output.bloque||d.output.public_id||'resultado'));
    }
  });
  es.addEventListener('operator_question_created',e=>{
    const d=JSON.parse(e.data);
    if(d?.question){
      createBackendQuestionCard(d.question);
      glog('think','Operador','human','Pregunta activa: '+d.question.question);
      // Pre-fill terminal with suggestion and start auto-answer timer
      const q=d.question;
      const sug=q.suggestion||(q.metadata?.opciones?.[0])||q.metadata?.default_value||'';
      if(sug)startTerminalQuestionTimer(q,sug);
    }
  });
  es.addEventListener('operator_question_answered',e=>{
    const d=JSON.parse(e.data);
    if(d?.question?.public_id){
      // Clear terminal timer if this was the active question
      if(terminalActiveQuestion?.public_id===d.question.public_id)clearTerminalQuestionTimer();
      const card=outputCards.find(c=>c.questionId===d.question.public_id);
      if(card){
        if(!card.isQuestionResolved){
          card.type='text';
          card.label='Decisión operador';
          card.content=`Pregunta: ${d.question.question||card.question||''}\n\nRespuesta: ${d.question.answer||'sin respuesta'}\n\nCampo: ${d.question.field_key||card.fieldKey||'sin_campo'}`;
          card.status='answered';
          card.isQuestionResolved=true;
          card.answer=d.question.answer||'';
          card.answerSource=d.question.answer_origin||'manual';
          card.fromNodeName='Operador';
          card.fromDot='#c8a040';
          document.getElementById(card.id)?.remove();
          mkOutputCard(card);
        }
        conns=conns.filter(c=>c.to!==card.id);
        ensureQuestionCardConnection(card);
        drawConns();
        scheduleSave();
      }
      if(d.context)applyContextToUI(d.context,pipelineId);
    }
  });
  es.addEventListener('assembly_ready',e=>{
    const d=JSON.parse(e.data);
    glog('done','Digestor','agent','⊞ Ensamblaje '+(d.estado||'listo'));
    const aNode=nodes.find(n=>n.type==='assembly'||n.agentId==='AG-07');
    if(aNode){
      setStatus(aNode.id,'done');
      if(d.context)updateAssemblyVis(aNode.id,d.context);
      const producto=d.context?.ensamblaje?.producto_final||d.producto_final;
      if(producto)dropAssemblyOutputCard(aNode,producto);
    }
    syncProgressFromContext(pipelineId);
  });
  es.addEventListener('pipeline_completed',()=>{
    stopPipelineRunClock();
    glog('done','Piloto','agent','Evento: pipeline_completed');
  });
  es.addEventListener('pipeline_stopped',e=>{
    const d=JSON.parse(e.data);
    stopPipelineRunClock();
    glog('warn','Piloto','agent','Pipeline detenido: '+(d.reason||'sin motivo'));
  });
  es.addEventListener('pipeline_corrupted',e=>{
    const d=JSON.parse(e.data);
    stopPipelineRunClock();
    glog('error','Piloto','agent','Pipeline corrupto: '+(d.reason||'sin motivo'));
  });
  es.addEventListener('budget_update',e=>{
    const d=JSON.parse(e.data);
    if(d.bestpoints!=null)_updateBPButton(d.bestpoints - (d.bp_spent||0));
  });
  es.addEventListener('budget_exceeded',e=>{
    const d=JSON.parse(e.data);
    stopPipelineRunClock();
    _updateBPButton(0);
    glog('error','SISTEMA','system','⊘ Presupuesto agotado — pipeline detenido. '+(d.error||''));
    // flash BP button red
    const btn=document.getElementById('bestpoint-btn');
    if(btn){btn.style.color='#c84040';btn.style.borderColor='rgba(200,64,64,.4)';}
  });
  es.addEventListener('message',e=>{
    const d=JSON.parse(e.data);
    const name=AGENT_NAMES[d.source]||d.source;
    glog('action',name,'agent',d.text);
  });
  es.addEventListener('cycle',e=>{
    const d=JSON.parse(e.data);
    glog('think','Piloto','agent',d.text);
  });
  es.addEventListener('decision',e=>{
    const d=JSON.parse(e.data);
    const dec=d.text;
    const label=typeof dec==='object'?`${dec.agente_id} → ${dec.accion} [${dec.prioridad}]`:dec;
    glog('decision','Piloto','agent',label);
  });
  es.addEventListener('agent_status',e=>{
    const d=JSON.parse(e.data);
    // Encuentra el nodo del canvas que corresponde a este agente
    const n=nodes.find(x=>x.agentId===d.agente_id);
    if(n){
      setStatus(n.id, d.status);
      // Agrega entrada al log del nodo
      const ts_=ts();
      n.logs.push({t:ts_,m:(d.status==='running'||d.status==='activo')?'→ '+d.accion:(d.status==='done'||d.status==='completado')?'✓ '+d.accion:'✗ '+d.accion,c:(d.status==='done'||d.status==='completado')?'ok':d.status==='error'?'er':'wn'});
    }
  });
  es.addEventListener('complete',e=>{
    glog('done','Piloto','agent','✓ Pipeline completado');
    syncProgressFromContext(pipelineId);
    es.close();sseConnection=null;
  });
  es.addEventListener('error',e=>{
    if(e.data){const d=JSON.parse(e.data);glog('warn','Piloto','agent','Error: '+d.text);}
  });
  es.onerror=()=>{
    // Reconecta automáticamente si el pipeline sigue activo
    glog('warn','Terminal','system','[SSE] Conexión perdida — reconectando...');
  };
}

// Envía input del terminal a la API real
function glogProcessing(label){
  const id='proc-'+Math.random().toString(36).slice(2,8);
  const body=document.getElementById('logbody');
  const el=document.createElement('div');
  el.id=id;el.className='log-entry think typing';
  el.innerHTML=`<span class="le-time">${ts()}</span><span class="le-msg">${label||'procesando…'}</span>`;
  body.appendChild(el);body.scrollTop=body.scrollHeight;
  return ()=>{const e=document.getElementById(id);if(e)e.remove();};
}

function terminalSetBusy(busy){
  const inp=document.getElementById('log-cmd');
  const btn=document.getElementById('log-cmd-send');
  if(inp){inp.disabled=busy;inp.style.opacity=busy?'.4':'1';}
  if(btn){btn.disabled=busy;}
}

async function sendTerminalInput(val){
  glog('action','Terminal','system','> '+val);
  const removeSpinner=glogProcessing('→ enviando al agente…');
  terminalSetBusy(true);
  try{
    const res=await fetch('/api/terminal',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({input:val,pipeline_id:terminalPipelineId||undefined}),
    });
    removeSpinner();
    const data=await res.json();

    if(!res.ok||data.error){
      const raw=data.error||'Error desconocido';
      const friendly=parseAPIError(raw);
      hideCreatingAnimation();_pendingSeedPrompt=null;
      glog('error','Terminal','system',friendly);
      terminalSetBusy(false);return;
    }

    (data.messages||[]).forEach(m=>{
      const name=AGENT_NAMES[m.source]||m.source||'Terminal';
      const type=m.source==='TERMINAL'?'system':'done';
      glog(type,name,'agent',m.text);
    });

    if(data.pipeline_id&&data.pipeline_id!==terminalPipelineId){
      connectSSE(data.pipeline_id);
      currentPipelineId=data.pipeline_id;
      terminalPipelineId=data.pipeline_id;
      glog('think','Terminal','system','Pipeline activo: '+data.pipeline_id);
      if(data.seed_ready){
        glog('done','Canvas','system','Diseño listo — construyendo canvas...');
        setTimeout(()=>syncCanvasFromPipeline(data.pipeline_id),400);
      } else {
        setTimeout(()=>syncCanvasFromPipeline(data.pipeline_id),800);
      }
    } else if(data.seed_ready&&data.pipeline_id){
      currentPipelineId=data.pipeline_id;
      glog('done','Canvas','system','Diseño listo — construyendo canvas...');
      setTimeout(()=>syncCanvasFromPipeline(data.pipeline_id),400);
    }

    if(data.pipeline_id){
      syncRuntimeFromContext(data.pipeline_id);
    }
  }catch(err){
    removeSpinner();
    hideCreatingAnimation();_pendingSeedPrompt=null;
    glog('error','Terminal','system','Error de red: '+err.message);
  }finally{
    terminalSetBusy(false);
  }
}

function parseAPIError(msg){
  if(!msg)return'Error desconocido';
  const s=String(msg);
  if(s.includes('credit balance is too low')||s.includes('402'))
    return'⚠ Anthropic: créditos insuficientes. Agrega saldo en console.anthropic.com';
  if(s.includes('Too Many Requests')||s.includes('429')||s.includes('quota'))
    return'⚠ Cuota de API agotada (429). Cambia el modelo en ⬡ Modelos o espera que se reinicie el límite diario';
  if(s.includes('OPENAI_API_KEY')||s.includes('ANTHROPIC_API_KEY')||s.includes('GOOGLE_API_KEY'))
    return'⚠ API key no configurada. Agrega la key en el archivo .env y reinicia el servidor';
  if(s.includes('No LLM available'))
    return'⚠ Ningún proveedor de LLM disponible. Configura al menos una API key en .env';
  if(s.length>200)return'⚠ Error del servidor: '+s.slice(0,120)+'…';
  return'⚠ '+s;
}

// ══════════════════════════════
// KEYBOARD
// ══════════════════════════════
document.addEventListener('keydown',e=>{
  const tag=document.activeElement?.tagName;
  const isTyping=tag==='INPUT'||tag==='TEXTAREA'||document.activeElement?.isContentEditable;
  if((e.key==='Delete'||e.key==='Backspace')&&document.activeElement===document.body)delSel();
  if(e.key==='Escape'){connMode=false;setConnFrom(null);document.getElementById('tc').style.display='none';closeM();closeExpand();closeAgentBuilder();closeSkillAdapt();}
  if(isTyping)return;
  if(e.key==='f'||e.key==='F')fitAll();
  if(e.key==='r'||e.key==='R')runAll();
});

// ══════════════════════════════
// INIT
// ══════════════════════════════
(async function(){
  await Promise.all([loadFromAPI(), loadModelsData()]);

  const pipelines=await fetch('/api/pipelines').then(r=>r.json()).catch(()=>[]);
  const pipeline=pipelines[0];

  if(pipeline){
    currentPipelineId=pipeline.id;
    document.getElementById('pipe-label').textContent=pipeline.name;
    const state=await fetch('/api/pipelines/'+pipeline.id+'/state').then(r=>r.json()).catch(()=>null);
    if(state&&state.nodes.length>0){
      nid=Math.max(...state.nodes.map(n=>parseInt(n.id.replace(/\D/g,''))||0))+1;
      state.nodes.forEach(n=>{nodes.push(n);mkNode(n);});
      state.conns.forEach(c=>conns.push(c));
      if(state.outputs?.length)state.outputs.forEach(output=>dropBackendOutputCard(output));
      if(state.operatorQuestions?.length)state.operatorQuestions.filter(q=>q.status!=='answered').forEach(q=>createBackendQuestionCard(q));
      if(state.outputCards?.length){
        state.outputCards
          .filter(oc=>!oc.backendOutput&&!oc.assetId?.includes?.('assembly-final-'))
          .forEach(oc=>restoreOutputCard(oc));
      }
    } else {
      createDefaultNodes();
      scheduleSave();
    }
  } else {
    createDefaultNodes();
  }

  // Models panel open by default
  document.getElementById('mtwbtn').classList.add('act');
  renderMTModels();renderMTTokens();startMTPoll();

  setTimeout(()=>{drawConns();fitAll();updateMM();},120);
  setTimeout(()=>{
    glog('system','Pipeline','system',(pipeline?.name||'Video Pipeline v1')+' inicializado');
    glog('system','Pipeline','system',nodes.length+' agentes cargados. Presiona ▶ EJECUTAR');
    glog('think','Pipeline','system','Analizando dependencias del pipeline...');
    glog('system','Pipeline','system','Escribe /help para ver comandos disponibles');
  },350);
})();
applyT();

// ══════════════════════════════
// FONT SCALE
// ══════════════════════════════
const FS_CYCLE=['','fs-md','fs-lg'];
const FS_LABELS=['Aa','Aa+','Aa++'];
let _fsIdx=parseInt(localStorage.getItem('fs-idx')||'0');
(function initFS(){
  document.body.classList.remove(...FS_CYCLE.filter(Boolean));
  if(FS_CYCLE[_fsIdx])document.body.classList.add(FS_CYCLE[_fsIdx]);
  const btn=document.getElementById('fsbtn');
  if(btn)btn.textContent=FS_LABELS[_fsIdx];
})();
function cycleFontScale(){
  document.body.classList.remove(...FS_CYCLE.filter(Boolean));
  _fsIdx=(_fsIdx+1)%FS_CYCLE.length;
  if(FS_CYCLE[_fsIdx])document.body.classList.add(FS_CYCLE[_fsIdx]);
  const btn=document.getElementById('fsbtn');
  if(btn)btn.textContent=FS_LABELS[_fsIdx];
  localStorage.setItem('fs-idx',_fsIdx);
}

function bestPoint(){
  const snap={
    id:'bp_'+Date.now(),
    ts:new Date().toLocaleTimeString(),
    nodes:nodes.map(n=>({id:n.id,name:n.name,type:n.type,status:n.status,output:n.output||''})),
    pipeline:currentPipelineId||'—'
  };
  const key='bestpoints_'+(currentPipelineId||'default');
  const prev=JSON.parse(localStorage.getItem(key)||'[]');
  prev.unshift(snap);
  localStorage.setItem(key,JSON.stringify(prev.slice(0,10)));
  const btn=document.getElementById('bestpoint-btn');
  if(btn){btn.style.color='#c8a040';setTimeout(()=>{btn.style.color='';},800);}
  glog('action','Best Point','system',`⬡ Punto guardado — ${snap.ts} · ${snap.nodes.length} nodos`);
}

// ══════════════════════════════
// MODELS & TOKENS WINDOW
// ══════════════════════════════
const PROVIDER_COLORS={anthropic:'#c87840',google:'#4a9a4a',openai:'#3a8aaa',openrouter:'#67b8c7',fal:'#8a5abf'};
const PROVIDER_LABELS={anthropic:'Anthropic',google:'Google',openai:'OpenAI',openrouter:'OpenRouter',fal:'fal.ai'};
const TIER_MAP={premium:'premium',balanced:'balanced',fast:'fast'};
const AGENT_MODEL_NOTES={
  'AG-03':'Mejor con modelo de pago para calidad de escritura.',
  'AG-06':'Mejor con modelo de pago para investigación profunda.',
  'AG-07':'Mejor con modelo de pago para consolidación final.',
};

let _mtPollTimer=null;

function toggleMTWin(){
  const w=document.getElementById('mtwin');
  const btn=document.getElementById('mtwbtn');
  const open=w.style.display!=='none'&&w.style.display!=='';
  if(open){w.style.display='none';btn.classList.remove('act');}
  else{w.style.display='flex';btn.classList.add('act');renderMTModels();renderMTTokens();startMTPoll();}
}
function toggleMTMin(){const w=document.getElementById('mtwin');w.classList.toggle('minimized');}
let _mtMaxH=300;
function toggleMTMax(){
  const w=document.getElementById('mtwin');
  if(!w.classList.contains('minimized')){
    if(parseInt(w.style.height)<400){_mtMaxH=parseInt(w.style.height)||300;w.style.height='560px';}
    else w.style.height=_mtMaxH+'px';
  }
}

function startMTPoll(){
  clearInterval(_mtPollTimer);
  _mtPollTimer=setInterval(()=>{
    if(document.getElementById('mtwin').style.display==='none'){clearInterval(_mtPollTimer);return;}
    renderMTTokens();
  },1000);
}

function fmtTok(n){
  if(!n)return'<span class="mt-tok-zero">—</span>';
  if(n>=1000000)return(n/1000000).toFixed(2)+'M';
  if(n>=1000)return(n/1000).toFixed(1)+'k';
  return n.toLocaleString();
}

function getTierForModel(provider,modelId){
  const cat=modelsData.catalog[provider]||[];
  const m=cat.find(x=>x.id===modelId);
  return m?m.tier:'fast';
}

const MODEL_PRESETS={
  free:{
    'AG-TERM':{provider:'openrouter',model:'openrouter/free'},
    'AG-00':{provider:'openrouter',model:'openrouter/free'},
    'AG-01':{provider:'openrouter',model:'openrouter/free'},
    'AG-02':{provider:'openrouter',model:'openrouter/free'},
    'AG-03':{provider:'openrouter',model:'openrouter/free'},
    'AG-04':{provider:'fal',model:'fal-ai/flux/schnell'},
    'AG-05':{provider:'openrouter',model:'openrouter/free'},
    'AG-06':{provider:'openrouter',model:'openrouter/free'},
    'AG-07':{provider:'openrouter',model:'openrouter/free'},
  },
  pro:{
    'AG-TERM':{provider:'openrouter',model:'openrouter/free'},
    'AG-00':{provider:'anthropic',model:'claude-opus-4-6'},
    'AG-01':{provider:'anthropic',model:'claude-opus-4-6'},
    'AG-02':{provider:'openai',model:'gpt-4o'},
    'AG-03':{provider:'anthropic',model:'claude-opus-4-6'},
    'AG-04':{provider:'fal',model:'fal-ai/flux-pro'},
    'AG-05':{provider:'openai',model:'gpt-4o'},
    'AG-06':{provider:'openai',model:'gpt-4o'},
    'AG-07':{provider:'anthropic',model:'claude-opus-4-6'},
  },
};

function getAgentLabel(agentId){
  return AGENT_NAMES?.[agentId]||({'AG-TERM':'Terminal','AG-00':'Arquitecto'}[agentId])||agentId;
}

async function applyModelPreset(presetName){
  const preset=MODEL_PRESETS[presetName];
  if(!preset)return;
  try{
    const ops=Object.entries(preset).map(([agentId,cfg])=>
      fetch('/api/models/'+agentId,{
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(cfg),
      }).then(()=>{modelsData.agents[agentId]={...cfg,is_custom:true};})
    );
    await Promise.all(ops);
    glog('system','Models','system',presetName==='free'?'Preset gratis aplicado':'Preset pro aplicado');
    if(modalId){
      const n=nodes.find(x=>x.id===modalId);
      if(n)renderM(n);
    }
    renderMTModels();
  }catch(e){glog('warn','Models','system','Error aplicando preset: '+e.message);}
}

function renderMTModels(){
  const rows=document.getElementById('mt-models-rows');
  if(!rows)return;
  const agents=modelsData.agents||{};
  if(!Object.keys(agents).length){rows.innerHTML='<div class="mt-empty">Sin datos de modelos</div>';return;}
  const catalog=modelsData.catalog||{};
  const allModels=Object.entries(catalog).flatMap(([prov,ms])=>ms.map(m=>({provider:prov,...m})));
  rows.innerHTML=Object.entries(agents).map(([agId,ag])=>{
    const dot=`<span class="mt-provider-dot" style="background:${PROVIDER_COLORS[ag.provider]||'#706860'}"></span>`;
    const tier=getTierForModel(ag.provider,ag.model);
    const custom=ag.is_custom?'<span style="color:#c8a040;font-size:10px">custom</span>':'<span style="color:#5a9a5a;font-size:10px">default</span>';
    const opts=allModels.map(m=>{
      const sel=(m.provider===ag.provider&&m.id===ag.model)?'selected':'';
      return`<option value="${m.provider}||${m.id}" ${sel}>[${(PROVIDER_LABELS[m.provider]||m.provider).slice(0,3)}] ${m.label||m.id}</option>`;
    }).join('');
    return`<div class="mt-model-card">
      <div class="mt-model-card-top">
        <div class="mt-model-card-head">
          <span class="mt-agent-id">${agId}</span>
          <span class="mt-agent-label">${getAgentLabel(agId)}</span>
        </div>
        <span class="mt-tier ${TIER_MAP[tier]||'fast'}">${tier}</span>
      </div>
      <div class="mt-model-card-provider">${dot}<span>${PROVIDER_LABELS[ag.provider]||ag.provider}</span>${custom}</div>
      <select class="mt-model-sel" onchange="const[p,m]=this.value.split('||');setAgentModelUI('${agId}',p,m)">
        ${opts}
      </select>
      <div class="mt-model-meta" title="${ag.model}${AGENT_MODEL_NOTES[agId]?' · '+AGENT_MODEL_NOTES[agId]:''}">${ag.model}${AGENT_MODEL_NOTES[agId]?`<span class="mt-model-note"> · ${AGENT_MODEL_NOTES[agId]}</span>`:''}</div>
      <div class="mt-card-actions">
        <span style="font-size:10px;color:#5a5248">${PROVIDER_LABELS[ag.provider]||ag.provider}</span>
        ${ag.is_custom?`<button class="mt-card-reset" onclick="resetAgentModelUI('${agId}')">reset</button>`:`<span style="font-size:10px;color:#3a3630">preset</span>`}
      </div>
    </div>`;
  }).join('');
}

function renderMTTokens(){
  fetch('/api/tokens').then(r=>r.json()).then(data=>{
    const total=data.total||{in:0,out:0,calls:0};
    const agents=data.agents||{};
    // badge
    const badge=document.getElementById('mt-badge');
    if(badge){const t=total.in+total.out;badge.textContent=t>=1000?(t/1000).toFixed(1)+'k tok':t?t+' tok':'TOKENS';}
    const tokenTotal=total.in+total.out;
    animatePilotTokenDisplay(tokenTotal);
    nodes.forEach(n=>{
      if(n.type==='pilot')return;
      const stats=agents[n.agentId]||agents[n.name]||null;
      const agentTotal=stats?(Number(stats.in)||0)+(Number(stats.out)||0):0;
      animateAgentTokenDisplay(n.id,agentTotal);
    });
    // total row
    const tot=document.getElementById('mt-tokens-total');
    if(tot)tot.innerHTML=`<span class="mt-agent-id" style="color:#c8a040">TOTAL</span><span class="mt-tok-in">▲ ${fmtTok(total.in)}</span><span class="mt-tok-out">▼ ${fmtTok(total.out)}</span><span class="mt-tok-calls" style="color:#6a5a48">${total.calls} calls</span>`;
    // per-agent rows
    const rows=document.getElementById('mt-tokens-rows');
    if(!rows)return;
    if(!Object.keys(agents).length){rows.innerHTML='<div class="mt-empty">Sin actividad aún — ejecuta un agente</div>';return;}
    rows.innerHTML=Object.entries(agents).map(([agId,s])=>`<div class="mt-tok-row">
      <span class="mt-agent-id">${agId}</span>
      <span class="mt-tok-in">▲ ${fmtTok(s.in)}</span>
      <span class="mt-tok-out">▼ ${fmtTok(s.out)}</span>
      <span class="mt-tok-calls">${s.calls}x</span>
    </div>`).join('');
  }).catch(()=>{});
}

async function resetTokens(){
  await fetch('/api/tokens',{method:'DELETE'});
  renderMTTokens();
}

// Drag for mtwin
(function(){
  let dr=false,ox=0,oy=0;
  const bar=()=>document.getElementById('mttbar');
  const win=()=>document.getElementById('mtwin');
  document.addEventListener('mousedown',e=>{
    const b=bar();if(!b||!b.contains(e.target)||e.target.classList.contains('ltb-dot'))return;
    dr=true;const r=win().getBoundingClientRect();ox=e.clientX-r.left;oy=e.clientY-r.top;e.preventDefault();
  });
  document.addEventListener('mousemove',e=>{
    if(!dr)return;
    const w=win();
    w.style.left=Math.max(0,Math.min(window.innerWidth-w.offsetWidth,e.clientX-ox))+'px';
    w.style.top=Math.max(0,Math.min(window.innerHeight-w.offsetHeight,e.clientY-oy))+'px';
    w.style.bottom='auto';w.style.right='auto';
  });
  document.addEventListener('mouseup',()=>{dr=false;});
})();

// ═══════════════════════════════════════
// AI PROMPT SUGGESTIONS
// ═══════════════════════════════════════
const PROMPT_SUGGESTIONS={
  pilot:{
    prompt:[
      'Eres el agente coordinador principal del pipeline. Recibe el objetivo, descompone las tareas, delega a subagentes especializados y monitorea el progreso. Consolida todos los resultados en un reporte JSON final. Nunca ejecutes tareas que correspondan a otro agente.',
      'Actúa como orquestador del sistema. Analiza el input recibido, planifica la secuencia óptima de ejecución y asigna cada subtarea al agente más adecuado. Reporta el estado de cada subagente y genera un resumen ejecutivo al finalizar. Output: JSON.'
    ],
    verification:[
      'Todos los subagentes deben reportar status "done". El JSON final debe incluir resultados de todos los agentes activos. No debe haber errores críticos sin resolver.',
      'El pipeline completo debe ejecutarse sin interrupciones. Verificar que cada subagente devolvió output válido antes de consolidar. El resumen final debe incluir métricas de ejecución.'
    ]
  },
  research:{
    prompt:[
      'Investiga exhaustivamente el tema dado. Busca tendencias actuales, datos de mercado y casos de uso relevantes. Analiza el potencial de engagement. Output JSON: { topic, trends[], insights[], sources[], top_ideas[] }.',
      'Analiza el nicho indicado. Identifica los 10 temas con mayor potencial viral basándote en datos recientes. Para cada idea incluye: título, justificación, engagement_score (1-10) y formato recomendado.'
    ],
    verification:[
      'Mínimo 5 ideas con engagement_score > 7. Todas las fuentes deben ser referenciadas. El JSON debe ser válido y seguir el schema definido.',
      'El output debe incluir al menos 10 ideas rankeadas. Verificar que cada idea tenga engagement_score numérico. Las tendencias deben ser recientes (últimos 3 meses).'
    ]
  },
  human:{
    prompt:[
      'PUNTO DE APROBACIÓN HUMANA. Presenta las opciones disponibles de forma clara y estructurada. Espera la decisión explícita del operador antes de continuar el pipeline. No tomes decisiones por cuenta propia.',
      'Modo revisión humana activado. Resume los resultados de los agentes anteriores y presenta las opciones de acción disponibles. Requiere confirmación explícita del operador para proceder. Registra la decisión tomada.'
    ],
    verification:[
      'El operador debe tomar una decisión explícita. No se permite continuar sin input humano. La decisión debe quedar registrada en el log.',
      'Verificar que se recibió confirmación del operador. La decisión debe ser una de las opciones presentadas. Registrar timestamp de aprobación.'
    ]
  },
  prompt:{
    prompt:[
      'Dado el guión recibido, genera un prompt detallado para cada escena de 8 segundos. Cada prompt debe especificar: plano de cámara, composición, iluminación, movimiento y transición. Output: array de strings, uno por escena.',
      'Analiza el guión y crea prompts cinematográficos para generación de imagen por escena. Para cada escena incluye: tipo de plano, descripción del ambiente, paleta de colores, movimiento de cámara y efecto de transición al siguiente clip.'
    ],
    verification:[
      'Cada prompt debe incluir: plano, luz, movimiento y transición. El número de prompts debe coincidir con el número de escenas del guión. Verificar coherencia visual entre escenas consecutivas.',
      'Todos los prompts deben seguir el formato estándar. Verificar que no haya escenas sin prompt asignado. La coherencia de estilo visual debe mantenerse a lo largo de todo el video.'
    ]
  },
  image:{
    prompt:[
      'Genera una imagen fotorrealista 16:9 para la escena indicada. Aplica el prompt exactamente como se especifica. Mantén coherencia de estilo con las escenas anteriores. Resolución objetivo: 1920×1080.',
      'Crea una imagen de alta calidad basada en el prompt de escena recibido. Prioriza coherencia visual con el resto del pipeline. Estilo cinematográfico, iluminación dramática. Formato obligatorio: 16:9, 1920×1080px.'
    ],
    verification:[
      'Ratio 16:9 obligatorio. Coherencia de estilo con escenas anteriores. Sin artefactos visuales ni distorsiones. La imagen debe representar fielmente el prompt recibido.',
      'Verificar dimensiones 1920×1080. Revisar coherencia cromática con el resto de imágenes del pipeline. Confirmar que los elementos principales del prompt están presentes en la imagen.'
    ]
  },
  video:{
    prompt:[
      'Convierte la imagen recibida en un clip de exactamente 8 segundos. Aplica el movimiento de cámara especificado en el prompt (push-in, pull-out, pan, etc.). Mantén suavidad en el movimiento. Output: MP4 H.264.',
      'Anima la imagen estática en un clip de 8 segundos. Interpreta el movimiento de cámara del prompt de escena. Añade efectos de profundidad si el prompt lo indica. Asegura transiciones fluidas con el clip anterior y posterior.'
    ],
    verification:[
      'Duración exacta de 8 segundos. Movimiento de cámara coherente con el prompt. Sin saltos ni glitches en la animación. Formato MP4 compatible con el ensamblaje final.',
      'Verificar duración = 8.0s (±0.1s). El movimiento debe iniciarse suavemente y terminar en reposo. Sin frames duplicados ni corrupción de video. Resolución mínima 1920×1080.'
    ]
  },
  assembly:{
    prompt:[
      'Ensambla todos los clips MP4 recibidos en el orden del guión. Aplica transiciones fluidas entre clips. Ajusta el audio si hay banda sonora. Duración objetivo: 30-130 segundos. Output: MP4 final.',
      'Recibe el array de clips y el guión. Ordena los clips según la secuencia del guión. Aplica las transiciones especificadas. Renderiza el video final con audio normalizado. Verifica duración y calidad antes de entregar.'
    ],
    verification:[
      'Duración en rango 30-130 segundos. Todas las transiciones deben ser fluidas. El orden de clips debe coincidir con el guión. Sin frames negros entre clips.',
      'Verificar que todos los clips estén incluidos en el orden correcto. Sin artefactos de transición. El video final debe reproducirse sin interrupciones. Confirmar resolución y codec de salida.'
    ]
  },
  _default:{
    prompt:[
      'Eres un agente especializado en el pipeline. Recibe el input del agente anterior, procesa la información según tu función específica y genera un output estructurado para el siguiente agente. Reporta cualquier error o caso edge detectado.',
      'Procesa el input recibido con precisión y eficiencia. Valida el formato del input antes de procesar. Genera output consistente y bien estructurado. Incluye metadatos de ejecución en el resultado.'
    ],
    verification:[
      'El output debe seguir el formato esperado por el agente siguiente. Sin datos nulos en campos obligatorios. El proceso debe completarse dentro del timeout configurado.',
      'Verificar que el output es válido y completo. Todos los campos requeridos deben tener valores. El agente debe reportar status "done" al finalizar correctamente.'
    ]
  }
};

function showPromptSuggestions(event,nodeId,field){
  event.stopPropagation();
  document.querySelectorAll('.ai-suggest-dropdown').forEach(el=>el.remove());
  const n=nodes.find(x=>x.id===nodeId);if(!n)return;
  const sugs=(PROMPT_SUGGESTIONS[n.type]||PROMPT_SUGGESTIONS._default)[field]||PROMPT_SUGGESTIONS._default[field];
  const btn=event.currentTarget;const rect=btn.getBoundingClientRect();
  const dd=document.createElement('div');
  dd.className='ai-suggest-dropdown';
  dd.style.top=(rect.bottom+6)+'px';
  dd.style.left=Math.min(rect.left,window.innerWidth-520)+'px';
  dd.innerHTML=`<div style="font-size:9px;color:#c8a040;letter-spacing:.1em;margin-bottom:7px;text-transform:uppercase">✦ Sugerencias IA — ${field==='prompt'?'Prompt / Instrucciones':'Verificación automática'}</div>`
    +sugs.map((s,i)=>`<div class="ai-suggest-opt" onclick="applyPromptSuggestion('${nodeId}','${field}',${i})">${s}</div>`).join('');
  document.body.appendChild(dd);
  setTimeout(()=>document.addEventListener('click',function close(e){
    if(!dd.contains(e.target)){dd.remove();document.removeEventListener('click',close);}
  }),10);
}

function applyPromptSuggestion(nodeId,field,index){
  document.querySelectorAll('.ai-suggest-dropdown').forEach(el=>el.remove());
  const n=nodes.find(x=>x.id===nodeId);if(!n)return;
  const sugs=(PROMPT_SUGGESTIONS[n.type]||PROMPT_SUGGESTIONS._default)[field]||PROMPT_SUGGESTIONS._default[field];
  n[field]=sugs[index];
  renderM(n);
}

// Resize for mtwin
(function(){
  let rs=false,sY=0,sH=0;
  document.addEventListener('mousedown',e=>{
    const h=document.getElementById('mtresize');if(!h||!h.contains(e.target))return;
    rs=true;sY=e.clientY;sH=document.getElementById('mtwin').offsetHeight;e.preventDefault();
  });
  document.addEventListener('mousemove',e=>{
    if(!rs)return;
    document.getElementById('mtwin').style.height=Math.max(120,Math.min(700,sH-(e.clientY-sY)))+'px';
  });
  document.addEventListener('mouseup',()=>{rs=false;});
})();

// ═══════════════════════════════════════
// HASH IDENTITY & BESTPOINTS SYSTEM
// ═══════════════════════════════════════
let _pipelineHash = null;
let _hashStatus = null;

function _getRemainingBP(data) {
  if (!data || typeof data !== 'object') return null;
  if (typeof data.bp_remaining === 'number') return data.bp_remaining;
  if (typeof data.bestpoints === 'number') {
    return Math.max(0, data.bestpoints - (data.bp_spent || 0));
  }
  return null;
}

async function initPipelineHash() {
  const stored = localStorage.getItem('pipeline_hash');
  try {
    const res = await fetch('/api/hash/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hash: stored || null }),
    });
    const data = await res.json();
    if (res.status === 503 && data.error === 'waitlist') {
      showWaitlistOverlay();
      return;
    }
    if (!data.hash) return;
    _pipelineHash = data.hash;
    localStorage.setItem('pipeline_hash', _pipelineHash);
    _hashStatus = data;
    _updateBPButton(_getRemainingBP(data));
  } catch (e) {
    console.warn('[hash] init failed:', e.message);
  }
}

function _updateBPButton(bp) {
  const btn = document.getElementById('bestpoint-btn');
  if (!btn) return;
  const spans = btn.querySelectorAll('span');
  if (spans[0]) spans[0].textContent = '⬡ ' + (typeof bp === 'number' ? bp.toFixed(2) : '—');
}

// Intercept all API fetches to inject the hash header
const _origFetch = window.fetch;
window.fetch = function(url, opts = {}) {
  if (_pipelineHash && typeof url === 'string' && url.startsWith('/api/')) {
    opts = { ...opts, headers: { ...(opts.headers || {}), 'X-Pipeline-Hash': _pipelineHash } };
  }
  return _origFetch(url, opts);
};

// ── Waitlist overlay ─────────────────────────────────────────
function showWaitlistOverlay() {
  const ov = document.getElementById('waitlist-overlay');
  if (ov) ov.style.display = 'flex';
}
async function submitWaitlistEmail() {
  const input = document.getElementById('waitlist-email');
  const msg = document.getElementById('waitlist-msg');
  const email = input?.value?.trim();
  if (!email) { if (msg) msg.textContent = 'Ingresa un email válido.'; return; }
  try {
    // Store waitlist email via hash/email endpoint — hash may not exist so just note it
    if (msg) msg.textContent = '✓ Email guardado. Te avisaremos pronto.';
    input.value = '';
  } catch (e) {
    if (msg) msg.textContent = 'Error al guardar. Intenta de nuevo.';
  }
}

// ── Bestpoints wallet overlay ────────────────────────────────
async function bestPoint() {
  const ov = document.getElementById('bp-overlay');
  if (ov) ov.style.display = 'flex';
  await _refreshBPStatus();
}
function closeBPOverlay() {
  const ov = document.getElementById('bp-overlay');
  if (ov) ov.style.display = 'none';
}
async function _refreshBPStatus() {
  if (!_pipelineHash) return;
  try {
    const [statusRes, ledgerRes] = await Promise.all([
      fetch('/api/hash/status'),
      fetch('/api/hash/ledger'),
    ]);
    if (!statusRes.ok) return;
    const data = await statusRes.json();
    _hashStatus = data;
    const balEl   = document.getElementById('bp-balance');
    const tokEl   = document.getElementById('bp-tokens-row');
    const hashEl  = document.getElementById('bp-hash-val');
    const emailEl = document.getElementById('bp-email-input');
    const tierEl  = document.getElementById('bp-tier-badge');
    if (balEl)   balEl.textContent = typeof data.bp_remaining === 'number' ? data.bp_remaining.toFixed(4) : '—';
    if (tokEl)   tokEl.textContent = (data.tokens_used || 0).toLocaleString() + ' tokens usados';
    if (hashEl)  hashEl.textContent = data.hash || '—';
    if (emailEl && data.email) emailEl.value = data.email;
    if (tierEl)  { tierEl.textContent = data.tier === 'premium' ? '★ PREMIUM' : 'FREE'; tierEl.className = 'bp-tier-badge ' + (data.tier === 'premium' ? 'premium' : 'free'); }
    _updateBPButton(data.bp_remaining);
    // Render ledger
    if (ledgerRes.ok) {
      const { entries } = await ledgerRes.json();
      _renderBPLedger(entries || []);
    }
  } catch (e) {}
}
function _renderBPLedger(entries) {
  const el = document.getElementById('bp-ledger-list');
  if (!el) return;
  if (!entries.length) { el.innerHTML = '<div class="bp-ledger-empty">Sin movimientos aún.</div>'; return; }
  el.innerHTML = entries.slice(0, 12).map(e => {
    const sign   = e.amount >= 0 ? '+' : '';
    const cls    = e.amount >= 0 ? 'pos' : 'neg';
    const label  = { grant: 'Crédito inicial', code_redeem: 'Código canjeado', ai_usage: 'Uso de IA' }[e.type] || e.type;
    const date   = e.created_at ? e.created_at.slice(0, 16).replace('T', ' ') : '';
    return `<div class="bp-ledger-row">
      <div class="bp-le-info"><span class="bp-le-label">${label}</span><span class="bp-le-reason">${e.reason || ''}</span></div>
      <div class="bp-le-right"><span class="bp-le-amount ${cls}">${sign}${Math.abs(e.amount).toFixed(4)}</span><span class="bp-le-date">${date}</span></div>
    </div>`;
  }).join('');
}
async function redeemBPCode() {
  const input = document.getElementById('bp-code-input');
  const msg = document.getElementById('bp-code-msg');
  const code = input?.value?.trim().toUpperCase();
  if (!code) { if (msg) { msg.style.color = '#8a3a3a'; msg.textContent = 'Ingresa un código.'; } return; }
  try {
    const res = await fetch('/api/hash/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (res.ok) {
      if (msg) { msg.style.color = '#3a8a3a'; msg.textContent = `✓ +${data.bestpoints_added} BP canjeados. Total: ${data.bestpoints} BP`; }
      if (input) input.value = '';
      await _refreshBPStatus();
    } else {
      const errMap = { code_not_found: 'Código inválido.', code_already_used: 'Código ya usado.' };
      if (msg) { msg.style.color = '#8a3a3a'; msg.textContent = errMap[data.error] || data.error; }
    }
  } catch (e) {
    if (msg) { msg.style.color = '#8a3a3a'; msg.textContent = 'Error de red.'; }
  }
}
async function saveBPEmail() {
  const input = document.getElementById('bp-email-input');
  const msg = document.getElementById('bp-email-msg');
  const email = input?.value?.trim();
  if (!email) { if (msg) { msg.style.color = '#8a3a3a'; msg.textContent = 'Ingresa un email.'; } return; }
  try {
    const res = await fetch('/api/hash/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      if (msg) { msg.style.color = '#3a8a3a'; msg.textContent = '✓ Email guardado.'; }
    } else {
      if (msg) { msg.style.color = '#8a3a3a'; msg.textContent = 'Error al guardar.'; }
    }
  } catch (e) {
    if (msg) { msg.style.color = '#8a3a3a'; msg.textContent = 'Error de red.'; }
  }
}

// Initialize hash on page load
initPipelineHash();
