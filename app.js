// Основная логика прототипа (имитация)
const state = {
  floors: 4, // horizontal (этажи)
  sections: 3, // vertical (секции/стояки)
  displayMode: 'number',
  freeOnly: true,
  cells: [],
  selected: new Set(),
  logs: []
}

function uid(r,c){return `r${r}c${c}`}

function seed(){
  // create placeholder data: floors across columns, sections rows (3 sections x 4 floors)
  state.cells = []
  let base = 100
  for(let r=0;r<state.sections;r++){
    const row = []
    for(let c=0;c<state.floors;c++){
      const rooms = []
      // 2 rooms per cell sample
      for(let k=0;k<2;k++){
        const number = base + (c+1)*10 + r*2 + k
        const status = (Math.random()>0.75) ? 'Продано' : 'Свободно'
        rooms.push({id:uid(r,c)+"-"+k, number: number, area: 38 + k*7, rooms: 1 + k, status})
      }
      row.push({row:r,col:c,rooms})
    }
    state.cells.push(row)
  }
}

function renderChess(){
  const wrap = document.getElementById('chessboard')
  wrap.innerHTML=''
  const grid = document.createElement('div')
  grid.className='grid'
  // build header row with floor labels (horizontal)
  const headerRow = document.createElement('div')
  headerRow.style.display='grid'
  headerRow.style.gridTemplateColumns = `repeat(${state.floors}, 120px)`
  headerRow.style.gap = '10px'
  for(let c=0;c<state.floors;c++){
    const h = document.createElement('div')
    h.className='headerCell'
    h.title = 'Нажмите для выбора всех помещений этажа'
    h.textContent = 'Этаж ' + (c+1)
    h.dataset.col = c
    h.addEventListener('click',()=>toggleSelectColumn(c))
    headerRow.appendChild(h)
  }
  wrap.appendChild(headerRow)

  // rows
  for(let r=0;r<state.sections;r++){
    const rowWrap = document.createElement('div')
    rowWrap.style.display='flex'
    rowWrap.style.gap='10px'
    // side label
    const side = document.createElement('div')
    side.className='sideCell'
    side.textContent = 'Стояк ' + (r+1)
    side.title='Нажмите для выбора всех помещений стояка (секции)'
    side.addEventListener('click',()=>toggleSelectRow(r))
    rowWrap.appendChild(side)

    for(let c=0;c<state.floors;c++){
      const cell = state.cells[r][c]
      // filter
      const anyFree = cell.rooms.some(x=>x.status==='Свободно')
      if(state.freeOnly && !anyFree) continue
      const el = document.createElement('div')
      el.className = 'cell ' + (anyFree? 'free':'sold')
      el.dataset.r = r
      el.dataset.c = c
      el.id = uid(r,c)
      el.title = 'Клик — выделить (или снять выделение). Двойной клик — открыть редактирование помещения.'
      el.addEventListener('click',onCellClick)
      el.addEventListener('dblclick',onCellDblClick)

      const main = document.createElement('div')
      main.className='main'
      main.textContent = cell.rooms.map(x=>displayFor(x)).join(' | ')
      const meta = document.createElement('div')
      meta.className='meta'
      meta.textContent = cell.rooms.map(x=>x.status).join(', ')

      el.appendChild(main);el.appendChild(meta)
      rowWrap.appendChild(el)
    }
    wrap.appendChild(rowWrap)
  }
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
  // select all cells in column c
  for(let r=0;r<state.sections;r++){
    const id = uid(r,c)
    state.selected.add(id)
    const el = document.getElementById(id)
    if(el) el.classList.add('selected')
  }
  updateHint()
}
function toggleSelectRow(r){
  for(let c=0;c<state.floors;c++){
    const id = uid(r,c)
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
  document.getElementById('scn-delete-step2').addEventListener('click',()=>{ scenarioSelectExample(['r0c0','r1c1','r2c2']) })
  document.getElementById('scn-delete-step3').addEventListener('click',()=>{ openSlide('slide-confirm'); document.getElementById('confirm-text').textContent = 'Подтвердите удаление выделенных помещений.'; document.getElementById('confirm-count').textContent = state.selected.size + ' помещений будет удалено.'; runDeleteScenarioAnimation(Array.from(state.selected)) })
  document.getElementById('scn-delete-close').addEventListener('click',()=>{ closeSlides(); state.selected.clear(); document.querySelectorAll('.cell.selected').forEach(x=>x.classList.remove('selected')); setMode(null); renderChess() })

  // scenario copy steps
  document.getElementById('scn-copy-step1').addEventListener('click',()=>{ setMode('copy'); log('Scenario: activated copy mode'); })
  document.getElementById('scn-copy-step2').addEventListener('click',()=>{ scenarioSelectExample(['r0c1']) })
  document.getElementById('scn-copy-step3').addEventListener('click',()=>{ openSlide('slide-confirm'); document.getElementById('confirm-text').textContent = 'Подтвердите копирование выделенных помещений.'; document.getElementById('confirm-count').textContent = state.selected.size + ' помещений будет скопировано.'; // animate copy from first selected to example target
    const sel = Array.from(state.selected)
    if(sel.length>0){ const src = sel[0]; // choose a target cell visually (e.g., r0c2) - pick next cell
      const target = document.getElementById('r0c2') || document.querySelector('.cell')
      runCopyScenarioAnimation(src, target && target.id ? target.id : 'r0c2') }
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
