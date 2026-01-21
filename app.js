// Основная логика прототипа (имитация)
const state = {
  numSections: 2, // секции (A, B)
  numStoaks: 3, // стояки (колонки внутри секции)
  numFloors: 5, // этажи (строки внутри секции)
  displayMode: 'number',
  freeOnly: true,
  cells: [],
  selected: new Set(),
  logs: []
}

function uid(section,floor,stoak){return `s${section}f${floor}t${stoak}`}

function seed(){
  // data: sections -> floors -> stoaks
  state.cells = []
  let base = 100
  for(let s=0;s<state.numSections;s++){
    const sec = []
    for(let f=0;f<state.numFloors;f++){
      const row = []
      for(let t=0;t<state.numStoaks;t++){
        const rooms = []
        // single room per cell for simplicity
        const number = base + (s*100) + (state.numFloors - f)*10 + t
        const status = (Math.random()>0.7) ? 'Продано' : 'Свободно'
        rooms.push({id:uid(s,f,t), number: number, area: 38 + t*5, rooms: 1 + (t%3), status})
        row.push({section:s,floor:f,stoak:t,rooms})
      }
      sec.push(row)
    }
    state.cells.push(sec)
  }
}

function renderChess(){
  const wrap = document.getElementById('chessboard')
  wrap.innerHTML=''
  // render each section as separate board (side-by-side)
  for(let s=0;s<state.numSections;s++){
    const secWrap = document.createElement('div')
    secWrap.className = 'section-board'
    const title = document.createElement('div')
    title.className='section-title'
    title.textContent = 'Секция ' + String.fromCharCode(65+s)
    secWrap.appendChild(title)

    // header: stoaks
    const header = document.createElement('div')
    header.className='section-header'
    const emptyCorner = document.createElement('div'); emptyCorner.className='corner'
    header.appendChild(emptyCorner)
    for(let t=0;t<state.numStoaks;t++){
      const h = document.createElement('div'); h.className='headerCell'; h.textContent = 'СТОЯК ' + (t+1); h.title='Нажмите для выбора стояка'; h.dataset.stoak=t; h.addEventListener('click',()=>toggleSelectStoack(s,t)); header.appendChild(h)
    }
    secWrap.appendChild(header)

    // floors (descending: top floor first)
    for(let f=0;f<state.numFloors;f++){
      const floorIndex = f // 0 top
      const row = document.createElement('div'); row.className='section-row'
      const floorNum = state.numFloors - f
      const side = document.createElement('div'); side.className='floor-label';
      const radio = document.createElement('input'); radio.type='radio'; radio.name='floor-select-'+s; radio.className='floor-radio'; radio.id=`s${s}-floor-${floorNum}`
      const lab = document.createElement('label'); lab.htmlFor = radio.id; lab.innerHTML = floorNum + ' эт.'; lab.className='floor-label-text'
      side.appendChild(radio); side.appendChild(lab)
      side.addEventListener('click',()=>{ toggleSelectFloor(s,floorIndex) })
      row.appendChild(side)

      for(let t=0;t<state.numStoaks;t++){
        const cell = state.cells[s][f][t]
        const anyFree = cell.rooms.some(x=>x.status==='Свободно')
        if(state.freeOnly && !anyFree){
          const empty = document.createElement('div'); empty.className='cell empty'; row.appendChild(empty); continue
        }
        const el = document.createElement('div')
        el.className = 'cell ' + (anyFree? 'free':'sold')
        el.dataset.s = s; el.dataset.f = f; el.dataset.t = t
        el.id = uid(s,f,t)
        el.title = 'Клик — выделить (или снять выделение). Двойной клик — открыть редактирование помещения.'
        el.addEventListener('click',onCellClick)
        el.addEventListener('dblclick',onCellDblClick)
        const main = document.createElement('div'); main.className='main'; main.textContent = cell.rooms.map(x=>displayFor(x)).join(' | ')
        const meta = document.createElement('div'); meta.className='meta';
        meta.innerHTML = cell.rooms.map(x=>{
          const cls = x.status==='Свободно' ? 'free' : (x.status==='Продано' ? 'sold' : 'blocked')
          const label = x.status==='Свободно' ? 'СВОБ' : (x.status==='Продано' ? 'ПРОД' : 'ЗАБР')
          return `<span class="status ${cls}" title="${x.status}">${label}</span>`
        }).join(' ')
        el.appendChild(main); el.appendChild(meta); row.appendChild(el)
      }
      secWrap.appendChild(row)
    }
    wrap.appendChild(secWrap)
  }
}

// Info banner control
function showInfoBanner(mode){
  const banner = document.getElementById('infoBanner')
  const title = document.getElementById('infoTitle')
  const text = document.getElementById('infoText')
  if(!banner) return
  if(!mode){ banner.style.display='none'; return }
  banner.style.display='flex'
  if(mode==='move'){ title.textContent='Перемещение'; text.textContent='Выбран элемент. Теперь выберите целевую позицию. Для отмены — Отмена.' }
  else if(mode==='delete'){ title.textContent='Удаление — режим активен'; text.textContent='Выберите помещения для удаления. Затем нажмите «Сохранить» или «Отмена».' }
  else if(mode==='copy'){ title.textContent='Копирование — режим активен'; text.textContent='Выберите источник, затем цель вставки. Номера пересчитаются автоматически.' }
  else if(mode==='edit'){ title.textContent='Массовое изменение'; text.textContent='Выберите помещения и задайте параметры в модальном окне.' }
}

function displayFor(room){
  if(state.displayMode==='number') return room.number
  if(state.displayMode==='area') return room.area + 'м²'
  return room.rooms+'к'
}

function onCellClick(e){
  const id = e.currentTarget.id
  if(state.mode==='delete' || state.mode==='select' || state.mode==='move' || state.mode==='copy' || state.mode==='edit'){
    if(state.selected.has(id)) state.selected.delete(id); else state.selected.add(id)
    e.currentTarget.classList.toggle('selected')
    updateHint()
  }
}
function onCellDblClick(e){
  // open edit modal slide
  openSlide('slide-add')
}

function toggleSelectColumn(c){
  // legacy: noop for new layout
  console.warn('toggleSelectColumn deprecated')
}
function toggleSelectRow(r){
  console.warn('toggleSelectRow deprecated')
}

function toggleSelectStoack(section,stoak){
  // select all cells in given stoak (column) within section
  for(let f=0; f<state.numFloors; f++){
    const id = uid(section,f,stoak)
    state.selected.add(id)
    const el = document.getElementById(id)
    if(el) el.classList.add('selected')
  }
  updateHint()
}

function toggleSelectFloor(section,floorIndex){
  // select all cells in given floorIndex (0 top) within section
  for(let t=0; t<state.numStoaks; t++){
    const id = uid(section,floorIndex,t)
    state.selected.add(id)
    const el = document.getElementById(id)
    if(el) el.classList.add('selected')
  }
  updateHint()
}

function updateHint(){
  const hint = document.getElementById('hintbar')
  hint.textContent = state.selected.size + ' выбранных помещений. Нажмите Сохранить или Отмена.'
  // show save button when there are changes or selections
  const saveBtn = document.getElementById('btn-save')
  const hasChanged = !!document.querySelector('.cell.changed')
  if(saveBtn){
    if(state.selected.size>0 || hasChanged) saveBtn.style.display='inline-block' ; else saveBtn.style.display='none'
  }
}

// Modes
state.mode = null
function setMode(m){
  state.mode = m
  // show cancel button when mode active
  ensureCancel(m)
  showInfoBanner(m)
}
function ensureCancel(m){
  let btn = document.getElementById('btn-cancel')
  if(!btn){
    btn = document.createElement('button')
    btn.id='btn-cancel'
    btn.className='btn primary'
    btn.textContent='Отмена'
    btn.addEventListener('click',()=>{state.mode=null;state.selected.clear();document.querySelectorAll('.cell.selected').forEach(x=>x.classList.remove('selected'));updateHint();btn.remove()})
    document.querySelector('.toolbar .left').appendChild(btn)
  }
  if(!m){ if(btn) btn.remove() }
}

// Slides / modals
function openSlide(id){
  // animated navigation to slide
  document.getElementById('overlay').style.display='block'
  document.getElementById('overlay').ariaHidden=false
  goToSlide(id)
}
function closeSlides(){
  document.getElementById('overlay').style.display='none'
  document.querySelectorAll('.slides .slide').forEach(s=>{ s.classList.remove('active','from-right','to-left') })
}

function goToSlide(id){
  const current = document.querySelector('.slides .slide.active')
  const next = document.getElementById(id)
  if(current === next) return
  // prepare next
  if(next){ next.classList.add('from-right') }
  if(!current){
    // no current, just show next
    if(next){ next.classList.add('active'); requestAnimationFrame(()=> next.classList.remove('from-right')) }
    return
  }
  // animate current out to left
  current.classList.add('to-left')
  // after transition, hide current and show next
  const onEnd = (e)=>{
    current.classList.remove('active','to-left')
    current.removeEventListener('transitionend', onEnd)
    if(next){ next.classList.add('active'); requestAnimationFrame(()=> next.classList.remove('from-right')) }
  }
  current.addEventListener('transitionend', onEnd)
}

// Logs
function log(msg){
  state.logs.push({t:Date.now(),msg})
  const list = document.getElementById('logList')
  if(list){
    const el = document.createElement('div')
    el.textContent = new Date().toLocaleTimeString()+': '+msg
    list.prepend(el)
  }
}

// Drag & drop simulation
function simulateDrag(fromId,toEl){
  // draw arrow animation overlay between elements
  const fromEl = document.getElementById(fromId)
  if(!fromEl || !toEl) return
  const rect1 = fromEl.getBoundingClientRect(); const rect2 = toEl.getBoundingClientRect();
  const arrow = document.createElement('div')
  arrow.className='drag-arrow'
  arrow.style.position='fixed'
  arrow.style.left = rect1.right + 'px'
  arrow.style.top = rect1.top + 'px'
  arrow.style.width = Math.max(40, Math.abs(rect2.left - rect1.right)) + 'px'
  arrow.style.height = '4px'
  arrow.style.background = '#69C'
  arrow.style.borderRadius='4px'
  arrow.style.zIndex = 9999
  document.body.appendChild(arrow)
  setTimeout(()=>{arrow.style.opacity=0;setTimeout(()=>arrow.remove(),400)},800)
}

// create animated arrow between two elements (with pulse highlight)
function animateArrow(fromEl, toEl, opts={duration:700}){
  if(!fromEl || !toEl) return
  const r1 = fromEl.getBoundingClientRect(); const r2 = toEl.getBoundingClientRect();
  const arrow = document.createElement('div'); arrow.className='step-arrow';
  const head = document.createElement('div'); head.className='arrow-head';
  document.body.appendChild(arrow); document.body.appendChild(head);
  // position
  const startX = r1.left + (r1.width/2);
  const startY = r1.top + (r1.height/2);
  const endX = r2.left + (r2.width/2);
  const endY = r2.top + (r2.height/2);
  const dx = endX - startX; const dy = endY - startY; const dist = Math.sqrt(dx*dx+dy*dy);
  const angle = Math.atan2(dy,dx) * 180 / Math.PI;
  arrow.style.left = startX + 'px'; arrow.style.top = startY + 'px';
  arrow.style.width = '0px'; arrow.style.transform = `rotate(${angle}deg)`;
  arrow.style.opacity = 1; arrow.style.transition = `width ${opts.duration}ms ease-out, opacity 300ms`;
  head.style.left = (startX) + 'px'; head.style.top = (startY) + 'px'; head.style.opacity = 1; head.style.transition = `left ${opts.duration}ms ease-out, top ${opts.duration}ms ease-out, opacity 300ms`;
  // trigger animation
  requestAnimationFrame(()=>{
    arrow.style.width = dist + 'px'
    head.style.left = endX + 'px'; head.style.top = endY + 'px';
  })
  setTimeout(()=>{ arrow.style.opacity = 0; head.style.opacity = 0; setTimeout(()=>{arrow.remove(); head.remove()},400) }, opts.duration+300)
}

// pulse highlight helper
function pulseEl(el){ if(!el) return; el.classList.add('pulse'); setTimeout(()=>el.classList.remove('pulse'), 3000) }

// Scenario visual sequences
function runDeleteScenarioAnimation(exampleIds){
  // highlight sequence and arrow to zone-cancel
  const zone = document.getElementById('zone-cancel')
  exampleIds.forEach((id, idx)=>{
    setTimeout(()=>{
      const el = document.getElementById(id)
      if(el){ pulseEl(el); animateArrow(el, zone, {duration:600}); }
    }, idx*700)
  })
}

function runCopyScenarioAnimation(sourceId, targetId){
  const src = document.getElementById(sourceId)
  const tgt = document.getElementById(targetId)
  if(src && tgt){ pulseEl(src); setTimeout(()=>{ animateArrow(src, tgt, {duration:700}); pulseEl(tgt) }, 400) }
}

// UI wiring
function initUI(){
  document.getElementById('freeOnly').addEventListener('change',e=>{state.freeOnly = e.target.checked;renderChess()})
  document.getElementById('displayModeBtn').addEventListener('click',()=>document.getElementById('displayModeMenu').classList.toggle('open'))
  document.querySelectorAll('.dropdown-item').forEach(it=>it.addEventListener('click',e=>{state.displayMode = e.currentTarget.dataset.mode;document.getElementById('displayModeBtn').textContent = 'Показать: '+e.currentTarget.textContent+' ▾';document.getElementById('displayModeMenu').classList.remove('open');renderChess()}))

  document.getElementById('btn-delete').addEventListener('click',()=>{setMode('delete');log('Activated delete mode');updateHint()})
  document.getElementById('btn-move').addEventListener('click',()=>{setMode('move');log('Activated move mode');updateHint();})
  document.getElementById('btn-copy').addEventListener('click',()=>{setMode('copy');log('Activated copy mode');updateHint();})
  document.getElementById('btn-edit').addEventListener('click',()=>{setMode('edit');openSlide('slide-confirm');document.getElementById('confirm-text').textContent = state.selected.size + ' помещений будет изменено.'})
  document.getElementById('btn-logs').addEventListener('click',()=>{openSlide('slide-logs');})
  document.getElementById('btn-recount').addEventListener('click',()=>{log('Recount numbers'); alert('Номера пересчитаны (имитация)')})
  document.getElementById('btn-save').addEventListener('click',()=>{
    // open confirm with counts
    openSlide('slide-confirm')
    const cnt = state.selected.size || document.querySelectorAll('.cell.changed').length
    document.getElementById('confirm-count').textContent = cnt + ' помещений будет изменено.'
    document.getElementById('confirm-text').textContent = 'Вы уверены, что хотите сохранить изменения? Проверьте корректность данных.'
  })
  document.getElementById('btn-scn-delete').addEventListener('click',()=>{openSlide('slide-scenario-delete')})
  document.getElementById('btn-scn-copy').addEventListener('click',()=>{openSlide('slide-scenario-copy')})

  // scenario delete steps
  document.getElementById('scn-delete-step1').addEventListener('click',()=>{ setMode('delete'); log('Scenario: activated delete mode'); })
  document.getElementById('scn-delete-step2').addEventListener('click',()=>{ scenarioSelectExample(['s0f0t0','s1f1t1','s0f2t2']) })
  document.getElementById('scn-delete-step3').addEventListener('click',()=>{ openSlide('slide-confirm'); document.getElementById('confirm-text').textContent = 'Подтвердите удаление выделенных помещений.'; document.getElementById('confirm-count').textContent = state.selected.size + ' помещений будет удалено.'; runDeleteScenarioAnimation(Array.from(state.selected)) })
  document.getElementById('scn-delete-close').addEventListener('click',()=>{ closeSlides(); state.selected.clear(); document.querySelectorAll('.cell.selected').forEach(x=>x.classList.remove('selected')); setMode(null); renderChess() })

  // scenario copy steps
  document.getElementById('scn-copy-step1').addEventListener('click',()=>{ setMode('copy'); log('Scenario: activated copy mode'); })
  document.getElementById('scn-copy-step2').addEventListener('click',()=>{ scenarioSelectExample(['s0f0t1']) })
  document.getElementById('scn-copy-step3').addEventListener('click',()=>{ openSlide('slide-confirm'); document.getElementById('confirm-text').textContent = 'Подтвердите копирование выделенных помещений.'; document.getElementById('confirm-count').textContent = state.selected.size + ' помещений будет скопировано.'; // animate copy from first selected to example target
    const sel = Array.from(state.selected)
    if(sel.length>0){ const src = sel[0]; // choose a target cell visually (e.g., r0c2) - pick next cell
      const target = document.getElementById('s0f0t2') || document.querySelector('.cell')
      runCopyScenarioAnimation(src, target && target.id ? target.id : 's0f0t2') }
  })
  document.getElementById('scn-copy-close').addEventListener('click',()=>{ closeSlides(); state.selected.clear(); document.querySelectorAll('.cell.selected').forEach(x=>x.classList.remove('selected')); setMode(null); renderChess() })

  // add controls
  document.getElementById('addColTop').addEventListener('click',()=>{openSlide('slide-add');})
  document.getElementById('addRowLeft').addEventListener('click',()=>{openSlide('slide-add');})
  document.getElementById('addColRight').addEventListener('click',()=>{openSlide('slide-add');})

  // modal buttons
  document.getElementById('add-save').addEventListener('click',()=>{closeSlides();log('Added new rooms (simulated)');seed();renderChess()})
  document.getElementById('add-cancel').addEventListener('click',()=>{closeSlides()})
  document.getElementById('confirm-yes').addEventListener('click',()=>{closeSlides();log('Confirmed bulk edit of '+state.selected.size+' items');state.selected.clear();document.querySelectorAll('.cell.selected').forEach(x=>x.classList.remove('selected'));renderChess()})
  document.getElementById('confirm-no').addEventListener('click',()=>{closeSlides()})
  document.getElementById('logs-close').addEventListener('click',()=>{closeSlides()})

  // overlay click closes
  document.getElementById('overlay').addEventListener('click',closeSlides)

  // info banner actions
  const infoDone = document.getElementById('infoDone')
  const infoCancel = document.getElementById('infoCancel')
  if(infoDone) infoDone.addEventListener('click', ()=>{ log('Info: done'); state.mode=null; showInfoBanner(null); document.getElementById('btn-save').style.display='inline-block' })
  if(infoCancel) infoCancel.addEventListener('click', ()=>{ log('Info: cancel'); state.mode=null; showInfoBanner(null); document.querySelectorAll('.cell.selected').forEach(x=>x.classList.remove('selected')); state.selected.clear(); updateHint() })

  // basic drag simulation: when in move mode, click source then click target
  document.getElementById('chessboard').addEventListener('click',e=>{
    if(state.mode==='move'){
      const target = e.target.closest('.cell')
      if(!target) return
      // if no source selected, make this source
      if(!state.moveSource){
        state.moveSource = target.id
        target.classList.add('selected')
        updateHint();
      } else {
        // perform simulate move
        simulateDrag(state.moveSource,target)
        log('Moved '+state.moveSource+' to '+target.id+' (simulated)')
        // mark both as changed (outline)
        target.classList.add('selected')
        document.getElementById(state.moveSource).classList.add('changed')
        state.moveSource = null
      }
    }
  })

  // lasso (simple rectangle draw)
  let lasso = null
  let lassoEl = null
  document.getElementById('chessboard').addEventListener('pointerdown', (e)=>{
    if(state.mode!=='select' && state.mode!=='delete') return
    lasso = {x0:e.clientX,y0:e.clientY}
    lassoEl = document.createElement('div'); lassoEl.className='lasso'; lassoEl.style.position='fixed'; lassoEl.style.border='2px dashed #69C'; lassoEl.style.background='rgba(105,153,204,0.06)'; lassoEl.style.zIndex=9999; document.body.appendChild(lassoEl)
    function move(ev){
      const x = Math.min(ev.clientX, lasso.x0); const y = Math.min(ev.clientY, lasso.y0); const w=Math.abs(ev.clientX-lasso.x0); const h=Math.abs(ev.clientY-lasso.y0);
      lassoEl.style.left = x+'px'; lassoEl.style.top = y+'px'; lassoEl.style.width = w+'px'; lassoEl.style.height = h+'px'
    }
    function up(ev){
      move(ev)
      // select intersecting cells
      document.querySelectorAll('.cell').forEach(cell=>{
        const r = cell.getBoundingClientRect();
        const lx = parseFloat(lassoEl.style.left); const ly = parseFloat(lassoEl.style.top); const lw = parseFloat(lassoEl.style.width); const lh = parseFloat(lassoEl.style.height);
        if(r.left<lx+lw && r.right>lx && r.top<ly+lh && r.bottom>ly){ cell.classList.add('selected'); state.selected.add(cell.id) }
      })
      lassoEl.remove(); lasso=null; document.removeEventListener('pointermove',move); document.removeEventListener('pointerup',up); updateHint()
    }
    document.addEventListener('pointermove',move); document.addEventListener('pointerup',up)
  })
}

// helper to select example cells by ids and highlight them
function scenarioSelectExample(list){
  // clear previous
  state.selected.clear(); document.querySelectorAll('.cell.selected').forEach(x=>x.classList.remove('selected'))
  list.forEach(id=>{
    // id may be like 'r0c0' or raw; ensure element exists
    const el = document.getElementById(id)
    if(el){ el.classList.add('selected'); state.selected.add(id) }
  })
  updateHint()
}

// init
seed();renderChess();initUI();

// warn on unload if unsaved changes exist
window.addEventListener('beforeunload', (e)=>{
  const hasUnsaved = state.selected.size>0 || document.querySelectorAll('.cell.changed').length>0
  if(hasUnsaved){ e.preventDefault(); e.returnValue = ''; }
})

// small CSS for dynamic lasso/changed
const style = document.createElement('style'); style.innerHTML = `.lasso{pointer-events:none}.cell.changed{box-shadow:0 0 0 2px rgba(105,153,204,0.3) inset}`; document.head.appendChild(style)
