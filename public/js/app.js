// ═══════════════════════════════════════
// AGENT TYPE DEFINITIONS
// ═══════════════════════════════════════
const T={
  pilot:{label:'Agente Piloto',icon:'◈',hbg:'#6a1a1a',hbg2:'#501212',dot:'#c85050',
    meta:'Coordina el pipeline. Asigna tareas y consolida resultados.',goal:'Delegar, monitorear y reportar estado.',
    subtasks:['Leer resultados Agente Resumen','Asignar tareas Agente UI/UX'],
    actions:['Implementar codigo','Comparar interfaz'],actionIcons:['⏸','●'],actionColors:['#3a3028','#1a3a1a'],
    vis:'tasks',cond:true,
    inputType:'json',inputLabel:'Contexto del pipeline',inputDefault:'Usa configuración base del pipeline',
    outputType:'json',outputLabel:'Estado de subagentes',
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

// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let nodes=[],conns=[],outputCards=[],nid=1,ocid=1,cid=1;
let currentPipelineId=null;
// ── Terminal / agentes en vivo ──────────────────────────────
let terminalPipelineId=null;
let sseConnection=null;
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
let palT=null,ctxId=null;
let expandTarget=null,expandFieldName=null;
let customSkills=[],builderMode='agent';
let awinStep=0,awinBuilding={},awinTyping=false,awinPrevH=520,awinMinimized=false;
let logFilter='all',logPrevH=420,logMinimized=false;
let operatorWaiting=false;
let _pendingSeedPrompt=null;
let _userStartedRun=false; // true only when user explicitly pressed Ejecutar

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
    <div class="nio-half">
      <div class="nio-lbl" style="color:${inColor}88">Recibe</div>
      <div class="nio-type"><span class="nio-icon" style="color:${inColor}">${inIcon}</span><span style="color:${inColor}">${inType}</span></div>
      <div style="font-size:9px;color:#706860;margin-top:2px">${inLabel}</div>
      ${inDef?`<div class="nio-default">${inDef}</div>`:''}
    </div>
    <div class="nio-half">
      <div class="nio-lbl" style="color:${outColor}88">Entrega</div>
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
  if(tp.vis==='text')return`<div class="nvis"><div class="nvis-prompt"><div class="nvis-prompt-lbl">Prompt activo</div><div class="nvis-prompt-txt" onclick="openExpandField(event,'${n.id}','promptOut')" style="cursor:pointer">${n.promptOut||tp.promptText||'Esperando guión...'}</div></div></div>`;
  if(tp.vis==='list')return`<div class="nvis"><div class="nvis-list">${(tp.listItems||[]).slice(0,3).map(i=>`<div class="nvis-li"><span style="color:#3a3630">›</span>${i}</div>`).join('')}</div></div>`;
  if(tp.vis==='timeline'){
    const pct=n.status==='done'?100:n.status==='running'?45:0;
    const clr=n.type==='video'?'#4a7abf':'#c87840';
    const clips=n.type==='assembly'?['01','02','03','04','05']:['01','02','03'];
    return`<div class="nvis"><div class="nvis-timeline"><div style="font-size:7px;color:#3a3630;margin-bottom:2px">PROGRESO — ${pct}%</div><div class="ntl-bar"><div class="ntl-fill" style="width:${pct}%;background:${clr}30;border-right:2px solid ${clr}"></div></div><div class="ntl-clips">${clips.map(c=>`<div class="ntl-clip" style="background:${clr}10;border:1px solid ${clr}25">${c}</div>`).join('')}</div></div></div>`;
  }
  if(tp.vis==='human')return`<div class="nvis"><div class="happrove"><div class="happrove-lbl">Operador tactico activo</div><div style="font-size:9px;color:#706860;margin-top:6px">Escucha feedback, adapta prompts y coordina regeneraciones sin detener la linea.</div></div></div>`;
  if(tp.vis==='seed')return`<div class="nvis"><div class="nvis-seed"><div class="nvis-seed-lbl">Prompt inicial</div><div class="nvis-seed-txt">${n.promptOut||n.name||'…'}</div></div></div>`;
  return'';
}

function actionsHTML(n){
  const tp=T[n.type];
  const btns=n.customBtns||tp.actions.map((a,i)=>({label:a,icon:tp.actionIcons[i],bg:tp.actionColors[i]||'#0f0d0c',fg:'#706860',action:''}));
  return`<div class="nactions">${btns.map((b,i)=>`<button class="nact" style="background:${b.bg}" onclick="event.stopPropagation()"><div class="nact-ico" style="background:rgba(0,0,0,.3);color:${b.fg||'#706860'}">${b.icon}</div><span style="color:${b.fg||'#706860'}">${b.label}</span><div class="nstatus-dot ${i===btns.length-1?n.status:'idle'}" style="margin-left:auto"></div></button>`).join('')}</div>`;
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
        <span class="plbl y">SÍ</span><span class="plbl n">NO</span>
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
        ${ioSectionHTML(n)}
        ${metaHTML(n)}
        <div class="nsubtasks">${tp.subtasks.map(s=>`<div class="nsub">· ${s}</div>`).join('')}</div>
        <div id="vis_${n.id}">${visHTML(n)}</div>
        ${actionsHTML(n)}
        <div class="nfoot">
          <span class="nfoot-st" id="fst_${n.id}">${stlabel(n.status)}</span>
          <button class="nfoot-sk" id="fsk_${n.id}" onclick="event.stopPropagation();openSkillAdapt('${n.id}')" style="display:${n.skills&&n.skills.length?'inline-flex':'none'}">⬡ SKILLS</button>
          ${n.type==='pilot'?`<button class="nfoot-ctx" onclick="event.stopPropagation();openContextCard(currentPipelineId)" title="Ver archivo de contexto del pipeline">⬡ contexto</button>`:''}
          <button class="nfoot-out" onclick="event.stopPropagation();(function(){var _n=nodes.find(function(x){return x.id==='${n.id}'});if(_n)dropOutputCard('${n.id}',_n.x+260,_n.y+20);})()" title="Soltar output card">↗ output</button>
          <button class="nfoot-cfg" onclick="openM('${n.id}')">⚙ CONFIG</button>
        </div>
      </div>
    </div>`;

  el.addEventListener('mousedown',e=>nmd(e,n.id));
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
  const n={id:'n'+Math.random().toString(36).slice(2,10),type,x,y,name:tp.label||type,
    status:'idle',img:null,promptOut:null,output:'',meta:'',goal:'',
    model:DEFAULT_MODEL[type]||'claude-haiku-4-5',
    inputType:tp.inputType,outputType:tp.outputType,
    inputLabel:tp.inputLabel,outputLabel:tp.outputLabel,
    inputDefault:tp.inputDefault,
    prompt:tp.prompt||'',verification:tp.verification||'',
    logs:[{t:'--:--',m:'Agente creado',c:''}],skills:[],
    tests:[{name:'Formato input',status:'pend',desc:'Verifica input correcto'},{name:'Formato output',status:'pend',desc:'Valida output JSON'}]
  };
  nodes.push(n);mkNode(n);updateMM();return n;
}

function setNodeModel(id,model){
  const n=nodes.find(x=>x.id===id);if(!n)return;
  n.model=model;
  scheduleSave();
  glog('action',n.name,n.type,'◈ Modelo: '+model);
}
function addNodeCenter(type){addNode(type,(window.innerWidth/2-px)/sc-115,(window.innerHeight/2-py)/sc-120);}

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
  const oc={id:'oc'+Math.random().toString(36).slice(2,10),assetId:'drop-'+n.id,
    fromNodeId:n.id,fromNodeName:n.name,fromDot:tp.dot||'#888',
    type:outputType,label:tp.outputLabel||tp.label+' · output',content,x,y,...extra};
  outputCards.push(oc);mkOutputCard(oc);drawConns();
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

function mkSeedCard(promptText,x,y){
  const id='seed'+Math.random().toString(36).slice(2,8);
  const oc={id,x,y,type:'text',content:promptText,fromNodeName:'Usuario',fromDot:'#c8a040',label:'Prompt inicial'};
  outputCards.push(oc);
  const el=document.createElement('div');
  el.className='output-card seed-input-card';el.id=id;
  el.style.cssText=`left:${x}px;top:${y}px`;
  el.innerHTML=`
    <div class="oc-inner">
      <div class="oc-header">
        <div class="oc-from"><div class="oc-from-dot" style="background:#c8a040"></div><span>Usuario</span></div>
        <span class="oc-type text">✦ text</span>
      </div>
      <div class="oc-body">
        <div class="sic-title">Prompt inicial</div>
        <div class="oc-preview-txt sic-prompt">${promptText}</div>
      </div>
      <div class="oc-footer">
        <span class="oc-size" style="color:#c8a04088">text input</span>
        <div class="oc-connect-port" data-nid="${id}" data-pt="out" title="Conectar al agente"></div>
      </div>
    </div>`;
  el.addEventListener('mousedown',e=>cardMouseDown(e,id));
  el.querySelector('.oc-connect-port').addEventListener('mousedown',e=>{
    e.stopPropagation();setConnFrom({nid:id,pt:'out',src:'card'});
  });
  document.getElementById('canvas').appendChild(el);
  return oc;
}

// ── CONTEXT FILE CARD ──────────────────────────────────────────
function mkContextCard(pipelineId, ctx, x, y){
  const id='ctxfile_'+pipelineId.replace(/[^a-z0-9]/gi,'_');
  document.getElementById(id)?.remove();
  outputCards=outputCards.filter(c=>c.id!==id);

  const pipeName=(ctx?.pipeline_name||pipelineId).replace(/_/g,' ');
  const fullJson=JSON.stringify(ctx||{},null,2);

  // Build rows from all scalar top-level fields
  const SKIP_KEYS=new Set(['pipeline_name','bloques','agentes_activos','assets','logs','_meta']);
  const estadoColors={en_progreso:'#c8a040',completo:'#5acd6a',pausado:'#7888b8',cancelado:'#d06060',iniciando:'#7ec89a',vacío:'#3a3830'};
  const fields=Object.entries(ctx||{})
    .filter(([k,v])=>!SKIP_KEYS.has(k)&&(typeof v==='string'||typeof v==='number'||typeof v==='boolean'))
    .slice(0,8);
  const bloques=Object.keys(ctx?.bloques||{}).length;
  const assets=Object.keys(ctx?.assets||{}).length;

  let rowsHtml='';
  if(fields.length===0&&bloques===0){
    rowsHtml='<div class="ctx-empty-msg">el piloto completará esta estructura</div>';
  } else {
    fields.forEach(([k,v])=>{
      const val=String(v);
      const display=val.length>30?val.slice(0,27)+'…':val;
      const color=k==='estado'?(estadoColors[val]||'#9a8a70'):'';
      rowsHtml+=`<div class="ctx-row"><span class="ctx-lbl">${k}</span><span class="ctx-val"${color?` style="color:${color}"`:''}>${display}</span></div>`;
    });
    if(bloques>0)rowsHtml+=`<div class="ctx-row"><span class="ctx-lbl">bloques</span><span class="ctx-val">${bloques}</span></div>`;
    if(assets>0)rowsHtml+=`<div class="ctx-row"><span class="ctx-lbl">assets</span><span class="ctx-val">${assets}</span></div>`;
  }

  const oc={id,x,y,type:'ctx-file',isCtxFile:true,pipelineId,
    fromNodeName:'Pipeline',fromDot:'#4a7a9a',label:'context.json',
    content:fullJson,_ctx:ctx};
  outputCards.push(oc);

  const el=document.createElement('div');
  el.className='output-card ctx-file-card';el.id=id;
  el.style.cssText=`left:${x}px;top:${y}px`;
  el.innerHTML=`
    <div class="oc-inner">
      <div class="ctx-file-hd">
        <div class="ctx-file-icon">⬡</div>
        <div class="ctx-file-titles">
          <div class="ctx-file-name">context.json</div>
          <div class="ctx-file-pipe">${pipeName}</div>
        </div>
        <button class="ctx-refresh" onclick="event.stopPropagation();refreshContextCard('${id}','${pipelineId}')" title="Actualizar">↺</button>
      </div>
      <div class="ctx-file-body">${rowsHtml}</div>
      <div class="ctx-file-ft">
        <button class="ctx-edit-btn" onclick="event.stopPropagation();expandContextCard('${id}')">⤢ ver / editar completo</button>
      </div>
    </div>`;

  el.addEventListener('mousedown',e=>cardMouseDown(e,id));
  document.getElementById('canvas').appendChild(el);
  return oc;
}

// ── QUESTION CARD (operator drops this to ask user) ──────────────
function mkQuestionCard(opts){
  // opts: {question, suggestion, timeout, pipelineId, fieldKey, onAnswer, x, y}
  const id='qcard_'+Date.now();
  const timeout=opts.timeout||20000;
  const x=opts.x||300, y=opts.y||160;

  // Remove existing question card for same fieldKey
  if(opts.fieldKey){
    outputCards.filter(c=>c.isQuestionCard&&c.fieldKey===opts.fieldKey)
      .forEach(c=>{document.getElementById(c.id)?.remove();});
    outputCards=outputCards.filter(c=>!(c.isQuestionCard&&c.fieldKey===opts.fieldKey));
  }

  const oc={id,x,y,type:'question',isQuestionCard:true,
    fieldKey:opts.fieldKey,pipelineId:opts.pipelineId,
    _suggestion:opts.suggestion,_onAnswer:opts.onAnswer};
  outputCards.push(oc);

  const safeQ=(opts.question||'').replace(/</g,'&lt;');
  const safeSug=(opts.suggestion||'—').replace(/</g,'&lt;');
  const safeSugVal=(opts.suggestion||'').replace(/'/g,"\\'");

  const el=document.createElement('div');
  el.className='output-card question-card';el.id=id;
  el.style.cssText=`left:${x}px;top:${y}px`;
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
        <textarea class="qcard-input" id="qinput_${id}" rows="2" placeholder="Escribe tu respuesta aquí..."></textarea>
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
  document.getElementById('qconfirm_'+id).addEventListener('click',()=>_resolveQuestion(id,true));
  document.getElementById('qskip_'+id).addEventListener('click',()=>_resolveQuestion(id,false));

  // Countdown timer
  const start=Date.now();
  oc._timer=setInterval(()=>{
    const remaining=Math.max(0,timeout-(Date.now()-start));
    const pct=remaining/timeout*100;
    const bar=document.getElementById('qbar_'+id);
    const timerEl=document.getElementById('qtimer_'+id);
    if(bar)bar.style.width=pct+'%';
    if(timerEl)timerEl.textContent=Math.ceil(remaining/1000)+'s';
    if(remaining<=0){clearInterval(oc._timer);_resolveQuestion(id,false);}
  },250);

  glog('think','Operador','human','◎ '+opts.question);
  drawConns();
  return oc;
}

function _resolveQuestion(cardId, useInput){
  const oc=outputCards.find(c=>c.id===cardId);if(!oc)return;
  if(oc._timer)clearInterval(oc._timer);
  const inputEl=document.getElementById('qinput_'+cardId);
  const userVal=inputEl?.value?.trim()||'';
  const answer=useInput&&userVal ? userVal : (oc._suggestion||'');
  const source=useInput&&userVal?'usuario':'sugerencia';

  const el=document.getElementById(cardId);
  if(el){el.style.opacity='0';el.style.transition='opacity .25s';
    setTimeout(()=>{el.remove();outputCards=outputCards.filter(c=>c.id!==cardId);drawConns();},260);}
  else{outputCards=outputCards.filter(c=>c.id!==cardId);}

  glog('decision','Operador','human','Respuesta ('+source+'): '+answer.slice(0,80));
  if(oc._onAnswer)oc._onAnswer(answer,source);
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
}

function getCardPreview(oc){
  if(oc.type==='image'&&oc.content&&(oc.content.startsWith('data:')||oc.content.startsWith('http')))
    return`<img class="oc-preview-img" src="${oc.content}" style="width:100%;display:block;object-fit:cover;max-height:140px"/>`;
  if(oc.type==='json')
    return`<div class="oc-preview-json">${(oc.content||'').slice(0,120)}</div>`;
  return`<div class="oc-preview-txt">${(oc.content||'').slice(0,140)}</div>`;
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

function deleteCard(id){
  const card=outputCards.find(c=>c.id===id);
  if(card?.assetId){
    glog('warn','Canvas','system','Esta card proviene del contexto real. Si el asset sigue vigente o histórico, se volverá a renderizar.');
    return;
  }
  document.getElementById(id)?.remove();
  outputCards=outputCards.filter(c=>c.id!==id);
  conns=conns.filter(c=>c.from!==id&&c.to!==id);
  drawConns();
}

function isProtectedCard(card){
  return card.label==='Prompt inicial'||card.isCtxFile||card.isQuestionCard||document.getElementById(card.id)?.classList.contains('seed-input-card');
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
  const assets=ctx.assets||{};
  Object.values(assets).forEach(asset=>upsertAssetCardFromContext(asset,ctx));
  // Auto-show context card and wire it to pilot
  if(pipelineId){
    const pilot=nodes.find(n=>n.type==='pilot'||n.agentId==='AG-01');
    const seedCard=outputCards.find(c=>c.label==='Prompt inicial');
    const cx=seedCard?(seedCard.x):(pilot?(pilot.x-320):2600);
    const cy=seedCard?(seedCard.y+200):(pilot?(pilot.y+10):2400);
    const existing=outputCards.find(c=>c.isCtxFile&&c.pipelineId===pipelineId);
    const ctxOc=mkContextCard(pipelineId,ctx,existing?.x??cx,existing?.y??cy);
    // Connect context card ↔ pilot if not already wired
    if(pilot&&ctxOc){
      const alreadyIn =conns.some(c=>c.from===ctxOc.id&&c.to===pilot.id);
      const alreadyOut=conns.some(c=>c.from===pilot.id&&(c.to===ctxOc.id||c.fp==='ctx'));
      if(!alreadyIn)conns.push({id:'c'+Math.random().toString(36).slice(2,10),
        from:ctxOc.id,fp:'out',to:pilot.id,tp:'in',active:false,fromCard:true,isCtxConn:true});
      if(!alreadyOut)conns.push({id:'c'+Math.random().toString(36).slice(2,10),
        from:pilot.id,fp:pilot.type==='pilot'?'out-y':'out',to:ctxOc.id,tp:'in',
        active:false,isCtxConn:true,cond:pilot.type==='pilot',condT:'yes'});
    }
    drawConns();
  }

  const agentStates=ctx.agentes_activos||{};
  nodes.forEach(n=>{
    if(!n.agentId)return;
    const ag=agentStates[n.agentId];
    if(!ag)return;
    const statusMap={activo:'running',completado:'done',pausado:'idle',reemplazado:'done',descartado:'idle',running:'running',done:'done',idle:'idle',error:'error',paused:'idle'};
    setStatus(n.id,statusMap[ag.estado]||'idle');
  });

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
  const oc={id:'oc'+Math.random().toString(36).slice(2,10),...cardData};
  outputCards.push(oc);
  mkOutputCard(oc);
  const el=document.getElementById(oc.id);
  if(el&&status==='reemplazado')el.style.opacity='.55';
  drawConns();
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
  else{title=field;content=n[field]||'';}
  document.getElementById('ex-title').textContent=title;
  document.getElementById('expandcontent').innerHTML=`<textarea class="ex-textarea" id="ex-edit">${content}</textarea>`;
  document.getElementById('expandwin').classList.add('open');
}

function saveExpand(){
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
      if(el){const m=el.querySelector('.nmeta');if(m)m.outerHTML=metaHTML(n);}
    }
  } else if(expandTarget?.type==='card'){
    const oc=outputCards.find(c=>c.id===expandTarget.id);
    if(oc){oc.content=val;const el=document.getElementById(oc.id);if(el){const b=el.querySelector('.oc-body');if(b)b.innerHTML=getCardPreview(oc)+`<div class="oc-expand-hint">ver / editar</div>`;}}
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
function stlabel(s){return{idle:'IDLE',running:'RUNNING',done:'DONE',error:'ERROR'}[s]||'IDLE';}

function setStatus(id,s){
  const n=nodes.find(x=>x.id===id);if(!n)return;n.status=s;
  const el=document.getElementById(id);if(!el)return;
  el.classList.toggle('running',s==='running');
  const ft=document.getElementById('fst_'+id);if(ft)ft.textContent=stlabel(s);
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
  // Minimizar ventanas al ejecutar
  const lw=document.getElementById('logwin');
  if(lw&&!lw.classList.contains('minimized'))toggleLogMin();
  const mw=document.getElementById('mtwin');
  if(mw&&!mw.classList.contains('minimized'))toggleMTMin();
  if(!terminalPipelineId||terminalPipelineId!==currentPipelineId)connectSSE(currentPipelineId);
  glog('system','Pipeline','system','▶ Arrancando pipeline con AG-01 Piloto…');
  startPipelineRunClock();
  const res=await fetch('/api/pipelines/'+currentPipelineId+'/start',{
    method:'POST',headers:{'Content-Type':'application/json'},
  }).catch(e=>{glog('error','Pipeline','system','Error: '+e.message);return null;});
  if(!res||!res.ok){
    if(res){
      const e=await res.json().catch(()=>({}));
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
  document.getElementById(sel)?.remove();
  nodes=nodes.filter(n=>n.id!==sel);
  conns=conns.filter(c=>c.from!==sel&&c.to!==sel);
  outputCards=outputCards.filter(c=>c.id!==sel);
  sel=null;drawConns();updateMM();scheduleSave();
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
function finishConn(toId,toPt){
  if(!connFrom)return;
  document.querySelectorAll('.port.port-active,.oc-connect-port.port-active').forEach(el=>el.classList.remove('port-active'));
  const isCond=connFrom.pt==='out-y'||connFrom.pt==='out-n';
  const fromCard=connFrom.src==='card';
  conns.push({id:'c'+Math.random().toString(36).slice(2,10),from:connFrom.nid,fp:connFrom.pt,to:toId,tp:toPt,active:fromCard,cond:isCond,condT:connFrom.pt==='out-y'?'yes':'no',fromCard});
  scheduleSave();
  if(fromCard){
    document.getElementById(connFrom.nid)?.classList.add('connectable');
    glog('action','Canvas','system','Output card conectada a '+( nodes.find(n=>n.id===toId)?.name||toId));
  }
  connFrom=null;document.getElementById('tc').style.display='none';drawConns();updateMM();
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
    path.dataset.connId=c.id;
    path.style.cursor='pointer';
    path.addEventListener('click',e=>{e.stopPropagation();showConnPopup(c,e);});
    svg.appendChild(path);
  });
}

function showConnPopup(c,evt){
  document.querySelectorAll('.conn-popup').forEach(el=>el.remove());
  const fromNode=nodes.find(x=>x.id===c.from)||outputCards.find(x=>x.id===c.from);
  const toNode=nodes.find(x=>x.id===c.to)||outputCards.find(x=>x.id===c.to);
  const fromName=fromNode?.name||fromNode?.fromNodeName||'Nodo';
  const toName=toNode?.name||toNode?.fromNodeName||'Nodo';
  const ftp=fromNode?.type?T[fromNode.type]:null;
  const outputType=fromNode?.outputType||ftp?.outputType||'json';
  const prompt=fromNode?.prompt||ftp?.prompt||'';
  const content=fromNode?.output||fromNode?.content||(prompt?`Prompt: ${prompt}`:`Tipo de dato: ${outputType}`);
  const condBadge=c.cond?`<span style="background:${c.condT==='yes'?'rgba(58,138,58,.2)':'rgba(138,58,58,.2)'};color:${c.condT==='yes'?'#3a8a3a':'#8a3a3a'};padding:1px 6px;border-radius:2px;font-size:8px">${c.condT==='yes'?'SÍ ✓':'NO ✗'}</span>`:'';
  const activeBadge=c.active?`<span style="color:#3a8a3a;font-size:8px">● ACTIVO</span>`:`<span style="color:#3a3630;font-size:8px">○ IDLE</span>`;
  const pop=document.createElement('div');
  pop.className='conn-popup';
  pop.style.cssText=`position:fixed;left:${Math.min(evt.clientX+14,window.innerWidth-380)}px;top:${Math.max(evt.clientY-20,8)}px;z-index:3000;background:#1a1612;border:1px solid rgba(200,160,64,.35);border-radius:7px;padding:12px 14px;min-width:260px;max-width:370px;box-shadow:0 16px 48px rgba(0,0,0,.85)`;
  pop.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px">
      <span style="font-size:8px;color:#c8a040;letter-spacing:.1em;text-transform:uppercase">↗ Conexión ${condBadge}</span>
      <button onclick="this.closest('.conn-popup').remove()" style="background:none;border:none;color:#706860;cursor:pointer;font-size:12px;line-height:1;padding:0">✕</button>
    </div>
    <div style="font-size:11px;font-family:'IBM Plex Mono',monospace;margin-bottom:10px">
      <span style="color:#ddd8cc">${fromName}</span><span style="color:#3a3630"> → </span><span style="color:#ddd8cc">${toName}</span>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
      <span style="font-size:9px;color:#706860">${IO_ICONS[outputType]||'◆'} ${outputType}</span>
      ${activeBadge}
    </div>
    <div style="background:#0a0808;border:1px solid rgba(255,255,255,.06);border-radius:3px;padding:8px;font-size:10px;color:#9a9088;font-family:'IBM Plex Mono',monospace;max-height:130px;overflow-y:auto;line-height:1.6;white-space:pre-wrap">${String(content).slice(0,320)}${String(content).length>320?'…':''}</div>`;
  document.body.appendChild(pop);
  setTimeout(()=>document.addEventListener('click',function close(e){if(!pop.contains(e.target)){pop.remove();document.removeEventListener('click',close);}},10));
}

function autoOutputCard(n){
  const tp=T[n.type];if(!tp)return;
  if(n.type==='pilot'||n.type==='human')return;
  if(outputCards.find(oc=>oc.fromNodeId===n.id&&oc.assetId==='auto-'+n.id))return;
  const outputType=n.outputType||tp.outputType||'json';
  const content=n.output||(outputType==='json'?JSON.stringify({status:'done',agent:n.name,result:'Completado',ts:new Date().toISOString()},null,2):(outputType==='text'?(n.promptOut||tp.promptText||`Output de ${n.name}`):`Output generado por ${n.name}`));
  const oc={id:'oc'+Math.random().toString(36).slice(2,10),assetId:'auto-'+n.id,revisionStatus:'aprobado',fromNodeId:n.id,fromNodeName:n.name,fromDot:tp.dot||'#888',type:outputType,label:tp.label+' · output',content,x:n.x+250,y:n.y+20};
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
  e.preventDefault();const wrap=document.getElementById('wrap').getBoundingClientRect();
  const x=(e.clientX-wrap.left-px)/sc,y=(e.clientY-wrap.top-py)/sc;
  let found=null;
  nodes.forEach(n=>{const el=document.getElementById(n.id);if(!el)return;const h=el.offsetHeight;if(x>=n.x&&x<=n.x+230&&y>=n.y&&y<=n.y+h)found=n.id;});
  if(!found)return;ctxId=found;selN(found);
  const m=document.getElementById('ctx');
  m.innerHTML=`
    <div class="ci" onclick="openM('${found}');hctx()">⚙ Configurar</div>
    <div class="ci" onclick="runNode('${found}');hctx()">▶ Ejecutar</div>
    <div class="ci" onclick="pauseNode('${found}');hctx()">⏸ Pausar</div>
    <div class="csep"></div>
    <div class="ci" onclick="dropOutputCard('${found}',nodes.find(n=>n.id==='${found}').x+250,nodes.find(n=>n.id==='${found}').y+20);hctx()">⬇ Dropear output card</div>
    <div class="ci" onclick="openSkillAssign('${found}');hctx()">⬡ Asignar skill</div>
    <div class="ci" onclick="dupN('${found}');hctx()">⧉ Duplicar</div>
    <div class="csep"></div>
    <div class="ci red" onclick="delSel();hctx()">✕ Eliminar</div>`;
  m.style.cssText=`display:block;left:${e.clientX}px;top:${e.clientY}px`;
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
function pd(e,type){palT=type;palSkill=null;closeSide();}
function sdrag(e,skillId){
  palSkill=skillId;palT=null;closeSide();
  const sk=SKILLS_CATALOG.find(s=>s.id===skillId)||customSkills.find(s=>s.id===skillId);
  const ghost=document.createElement('div');
  ghost.style.cssText='position:fixed;top:-999px;left:-999px;background:#0af;border:2px solid #5df;border-radius:5px;padding:5px 12px;color:#fff;font-family:IBM Plex Mono,monospace;font-size:11px;font-weight:600;box-shadow:0 0 18px #00aaff99,0 0 6px #00ddff44;letter-spacing:.06em;white-space:nowrap;pointer-events:none';
  ghost.textContent='⬡ '+(sk?sk.name:skillId);
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost,ghost.offsetWidth/2+8,ghost.offsetHeight/2);
  setTimeout(()=>{if(ghost.parentNode)ghost.parentNode.removeChild(ghost);},0);
}
function drop(e){
  palSkill=null; // skill dropped on empty canvas — ignore
  if(!palT)return;const wrap=document.getElementById('wrap').getBoundingClientRect();
  addNode(palT,(e.clientX-wrap.left-px)/sc-115,(e.clientY-wrap.top-py)/sc-100);
  palT=null;drawConns();updateMM();
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
  div.innerHTML=`<span class="le-time">${entry.t}</span><span class="le-agent" style="color:${agentColor}">${entry.agent.slice(0,10)}</span><span class="le-msg">${entry.msg}</span>`;
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

function toggleLogMin(){const win=document.getElementById('logwin');logMinimized=!logMinimized;win.classList.toggle('minimized',logMinimized);if(!logMinimized)win.style.height=logPrevH+'px';else logPrevH=win.offsetHeight;}
function toggleLogMax(){const win=document.getElementById('logwin');if(win.offsetHeight<300){logPrevH=win.offsetHeight;win.style.height='400px';}else win.style.height=logPrevH+'px';}

// Log drag
(function(){let dragging=false,ox=0,oy=0;const bar=document.getElementById('logtbar'),win=document.getElementById('logwin');
  bar.addEventListener('mousedown',e=>{if(e.target.classList.contains('ltb-dot'))return;dragging=true;const r=win.getBoundingClientRect();ox=e.clientX-r.left;oy=e.clientY-r.top;e.preventDefault();});
  document.addEventListener('mousemove',e=>{if(!dragging)return;win.style.right='auto';win.style.bottom='auto';win.style.left=Math.max(0,Math.min(window.innerWidth-win.offsetWidth,e.clientX-ox))+'px';win.style.top=Math.max(0,Math.min(window.innerHeight-win.offsetHeight,e.clientY-oy))+'px';});
  document.addEventListener('mouseup',()=>{dragging=false;});
})();
(function(){let resizing=false,startY=0,startH=0;const handle=document.getElementById('logresize'),win=document.getElementById('logwin');
  handle.addEventListener('mousedown',e=>{resizing=true;startY=e.clientY;startH=win.offsetHeight;e.preventDefault();});
  document.addEventListener('mousemove',e=>{if(!resizing)return;win.style.height=Math.max(80,Math.min(window.innerHeight-40,startH-(e.clientY-startY)))+'px';});
  document.addEventListener('mouseup',()=>{resizing=false;});
})();
(function(){let resizing=false,startX=0,startW=0;const handle=document.getElementById('logresize-w'),win=document.getElementById('logwin');
  handle.addEventListener('mousedown',e=>{resizing=true;startX=e.clientX;startW=win.offsetWidth;e.preventDefault();});
  document.addEventListener('mousemove',e=>{if(!resizing)return;const newW=Math.max(280,Math.min(Math.round(window.innerWidth*.9),startW-(e.clientX-startX)));win.style.width=newW+'px';});
  document.addEventListener('mouseup',()=>{resizing=false;});
})();

// Log commands
const LOG_COMMANDS={
  pipeline:{desc:'Gestionar pipelines',actions:[{label:'Nuevo pipeline',icon:'⊕',action:()=>newPipeline()},{label:'Ver todos',icon:'≡',action:()=>openSide()},{label:'Ejecutar',icon:'▶',action:()=>runAll()}]},
  agente:{desc:'Gestionar agentes',actions:[{label:'Crear agente con IA',icon:'✦',action:()=>openAgentBuilder()},{label:'Ver canvas',icon:'⊞',action:()=>fitAll()},{label:'Agregar Piloto',icon:'◈',action:()=>addNodeCenter('pilot')}]},
  skill:{desc:'Gestionar skills',actions:[{label:'Crear nueva skill',icon:'⬡',action:()=>openSkillBuilder()},{label:'Ver lista de skills',icon:'≡',action:()=>listSkillsInLog()},{label:'Asignar a nodo',icon:'→',action:()=>promptAssignSkill()}]},
  run:{desc:'Ejecutar',actions:[{label:'Run All',icon:'▶',action:()=>runAll()}]},
  reset:{desc:'Resetear',actions:[{label:'Reset All',icon:'↺',action:()=>resetAll()}]},
  fit:{desc:'Ajustar vista',actions:[{label:'Fit View',icon:'⊞',action:()=>fitAll()}]},
  help:{desc:'Ayuda',actions:[{label:'Ver comandos',icon:'?',action:()=>Object.entries(LOG_COMMANDS).forEach(([k,v])=>glog('system','Help','system',`/${k} — ${v.desc}`))}]}
};
function listSkillsInLog(){if(!customSkills.length){glog('system','Skills','system','No hay skills. Crea una con /skill');return;}customSkills.forEach(s=>glog('action','Skills','system',`⬡ ${s.name} — ${s.type||''} — ${s.endpoint||''}`))}
function promptAssignSkill(){if(!customSkills.length){glog('warn','Skills','system','No hay skills. Crea una primero.');return;}if(!sel){glog('warn','Skills','system','Selecciona un nodo primero.');return;}openSkillAssign(sel);}
function parseLogCommand(){
  const inp=document.getElementById('log-cmd');const val=inp.value.trim();if(!val)return;
  inp.value='';document.getElementById('cmd-hints').innerHTML='';

  // Comandos locales del canvas (sin /)
  const cmd=val.replace('/','').toLowerCase().trim();
  const match=LOG_COMMANDS[cmd];
  if(match&&val.startsWith('/')){
    glog('action','Terminal','system','> '+val);
    glog('system','Terminal','system',match.desc+':');
    const body=document.getElementById('logbody');
    const row=document.createElement('div');row.style.cssText='display:flex;gap:5px;padding:4px 8px;flex-wrap:wrap;';
    match.actions.forEach(a=>{
      const btn=document.createElement('button');
      btn.style.cssText='padding:4px 10px;background:rgba(200,160,64,.08);border:1px solid rgba(200,160,64,.2);color:#c8a040;font-family:IBM Plex Mono,monospace;font-size:9px;border-radius:3px;cursor:pointer;letter-spacing:.04em';
      btn.innerHTML=`${a.icon} ${a.label}`;btn.onclick=()=>a.action();
      row.appendChild(btn);
    });
    body.appendChild(row);body.scrollTop=body.scrollHeight;
    return;
  }

  // Texto libre → crear pipeline a partir del prompt
  if(!val.startsWith('/')){createPipelineFromPrompt(val);return;}
  sendTerminalInput(val);
}

// ══════════════════════════════
// PIPELINE CREATION FLOW
// ══════════════════════════════
function showCreatingAnimation(promptText){
  let ov=document.getElementById('creating-overlay');
  if(!ov){ov=document.createElement('div');ov.id='creating-overlay';document.getElementById('wrap').appendChild(ov);}
  const short=promptText.length>60?promptText.slice(0,58)+'…':promptText;
  ov.innerHTML=`<div class="co-inner"><div class="co-rings"><div class="co-ring co-r1"></div><div class="co-ring co-r2"></div><div class="co-ring co-r3"></div></div><div class="co-label">Creando pipeline...</div><div class="co-prompt">"${short}"</div></div>`;
  ov.style.display='flex';
}
function hideCreatingAnimation(){
  const ov=document.getElementById('creating-overlay');
  if(ov)ov.style.display='none';
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

document.getElementById('log-cmd').addEventListener('keydown',e=>{
  if(e.key==='Enter'){parseLogCommand();e.preventDefault();}
  if(e.key==='Escape'){const w=document.getElementById('logwin');if(w.classList.contains('spotlight'))toggleLogSpotlight();e.preventDefault();}
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
    fetch('/api/pipelines/'+currentPipelineId+'/state',{
      method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({nodes,conns})
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
  const rs=addNode('research',60,80);
  const hm=addNode('human',360,80);
  const pl=addNode('pilot',640,30);
  const pr=addNode('prompt',920,30);
  const im=addNode('image',60,420);
  const vi=addNode('video',360,420);
  const as=addNode('assembly',660,420);
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
function initAwinResize(){if(_ar)return;_ar=true;let rs=false,sY=0,sH=0;const h=document.getElementById('awin-resize'),win=document.getElementById('agentwin');h.addEventListener('mousedown',e=>{rs=true;sY=e.clientY;sH=win.offsetHeight;e.preventDefault();});document.addEventListener('mousemove',e=>{if(!rs)return;win.style.height=Math.max(200,Math.min(700,sH-(e.clientY-sY)))+'px';awinPrevH=win.offsetHeight;});document.addEventListener('mouseup',()=>{rs=false;});}

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

    const agentes=seed.agent_menu.agentes;
    const orden=seed.seed_template?.orden_produccion||[];

    // Limpiar canvas actual
    nodes.forEach(n=>document.getElementById(n.id)?.remove());
    outputCards.forEach(c=>document.getElementById(c.id)?.remove());
    nodes=[];conns=[];outputCards=[];
    document.getElementById('svgl').innerHTML='';

    // Layout: calcular capas por dependencias
    const layers=buildLayers(agentes,orden);
    const COL_W=380,ROW_H=310;
    // Centre the entire grid around the canvas centre (3000, 2500)
    const CANVAS_CX=3000,CANVAS_CY=2500;
    const gridW=(layers.length-1)*COL_W;
    const gridStartX=CANVAS_CX-gridW/2;

    layers.forEach((layer,col)=>{
      const totalH=(layer.length-1)*ROW_H;
      const startY=CANVAS_CY-totalH/2;
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
          model:DEFAULT_MODEL[type]||'claude-haiku-4-5',
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

    // Crear conexiones basadas en orden_produccion
    buildConnections(orden);

    hideCreatingAnimation();

    const minX=nodes.reduce((m,n)=>Math.min(m,n.x),9999);
    const avgY=nodes.length>0?nodes.reduce((s,n)=>s+n.y,0)/nodes.length:2500;
    const pilotNode=nodes.find(n=>n.type==='pilot'||n.agentId==='AG-01');
    const targetNode=pilotNode||nodes[0];

    // ── Seed drop-card ──
    const seedText=_pendingSeedPrompt||seed.seed_template?.descripcion||seed.agent_menu?.pipeline_id||'Pipeline';
    _pendingSeedPrompt=null;
    const seedCard=mkSeedCard(seedText,Math.max(100,minX-340),avgY-60);
    if(targetNode){
      conns.push({id:'c'+Math.random().toString(36).slice(2,10),from:seedCard.id,fp:'out',to:targetNode.id,tp:'in',active:true,fromSeed:true,fromCard:true});
    }

    // ── Context card (a la derecha del piloto o del primer nodo) ──
    const maxX=nodes.reduce((m,n)=>Math.max(m,n.x),0);
    const ctxX=maxX+280;
    const ctxY=pilotNode?(pilotNode.y-30):avgY-60;
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

// Conecta SSE para un pipeline activo
function connectSSE(pipelineId){
  if(sseConnection){sseConnection.close();sseConnection=null;}
  terminalPipelineId=pipelineId;
  const es=new EventSource('/api/terminal/stream?pipeline_id='+pipelineId);
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
    if(n)setStatus(n.id,'running');
  });
  es.addEventListener('agent_updated',e=>{
    const d=JSON.parse(e.data);
    const n=nodes.find(x=>x.agentId===d.agent_id);
    if(!n)return;
    if(d.status==='completado')setStatus(n.id,'done');
    else if(d.status==='error')setStatus(n.id,'error');
  });
  es.addEventListener('asset_ready',e=>{
    const d=JSON.parse(e.data);
    glog('done',AGENT_NAMES[d.agent_id]||d.agent_id,'agent','Asset listo: '+(d.bloque||d.asset_id||'resultado'));
  });
  es.addEventListener('assembly_ready',e=>{
    const d=JSON.parse(e.data);
    glog('done','Digestor','agent','Ensamblaje '+(d.estado||'listo'));
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
  el.innerHTML=`<span class="le-time">${ts()}</span><span class="le-agent" style="color:#5a5248">Terminal</span><span class="le-msg">${label||'procesando…'}</span>`;
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
  if((e.key==='Delete'||e.key==='Backspace')&&document.activeElement===document.body)delSel();
  if(e.key==='Escape'){connMode=false;setConnFrom(null);document.getElementById('tc').style.display='none';closeM();closeExpand();closeAgentBuilder();closeSkillAdapt();}
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

// ══════════════════════════════
// MODELS & TOKENS WINDOW
// ══════════════════════════════
const PROVIDER_COLORS={anthropic:'#c87840',google:'#4a9a4a',openai:'#3a8aaa',fal:'#8a5abf'};
const PROVIDER_LABELS={anthropic:'Anthropic',google:'Google',openai:'OpenAI',fal:'fal.ai'};
const TIER_MAP={premium:'premium',balanced:'balanced',fast:'fast'};

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
  },4000);
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

function renderMTModels(){
  const rows=document.getElementById('mt-models-rows');
  if(!rows)return;
  const agents=modelsData.agents||{};
  if(!Object.keys(agents).length){rows.innerHTML='<div class="mt-empty">Sin datos de modelos</div>';return;}
  const catalog=modelsData.catalog||{};
  const allModels=Object.entries(catalog).flatMap(([prov,ms])=>ms.map(m=>({provider:prov,...m})));
  const SYSTEM_EDITABLE=['AG-TERM','AG-00'];
  rows.innerHTML=Object.entries(agents).map(([agId,ag])=>{
    const dot=`<span class="mt-provider-dot" style="background:${PROVIDER_COLORS[ag.provider]||'#706860'}"></span>`;
    const tier=getTierForModel(ag.provider,ag.model);
    const custom=ag.is_custom?'<span style="color:#c8a040;font-size:6px"> ✦</span>':'';
    if(SYSTEM_EDITABLE.includes(agId)){
      const opts=allModels.map(m=>{
        const sel=(m.provider===ag.provider&&m.id===ag.model)?'selected':'';
        return`<option value="${m.provider}||${m.id}" ${sel}>[${(PROVIDER_LABELS[m.provider]||m.provider).slice(0,3)}] ${m.id}</option>`;
      }).join('');
      const resetBtn=ag.is_custom
        ?`<button class="mt-reset-btn" onclick="resetAgentModelUI('${agId}')" title="Resetear al default">↺</button>`
        :'';
      return`<div class="mt-model-row mt-model-row-edit">
        <span class="mt-agent-id" style="color:#c8a040">${agId}${custom}</span>
        <select class="mt-model-sel" onchange="const[p,m]=this.value.split('||');setAgentModelUI('${agId}',p,m)">${opts}</select>
        ${resetBtn}
      </div>`;
    }
    return`<div class="mt-model-row">
      <span class="mt-agent-id">${agId}${custom}</span>
      <span class="mt-provider">${dot}<span style="color:${PROVIDER_COLORS[ag.provider]||'#706860'};font-size:7px">${PROVIDER_LABELS[ag.provider]||ag.provider}</span></span>
      <span class="mt-model-name" title="${ag.model}">${ag.model}</span>
      <span class="mt-tier ${TIER_MAP[tier]||'fast'}">${tier}</span>
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
