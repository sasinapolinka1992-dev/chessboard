// === ХРАНЕНИЕ ДАННЫХ ===
const STORAGE_KEY = 'chessboard-data';
const LOG_STORAGE_KEY = 'chessboard-logs';

function loadFromStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [
    { id: 1, floor: 1, section: 1, number: "101", area: 54, status: "Свободно", rooms: 2 },
    { id: 2, floor: 1, section: 2, number: "102", area: 68, status: "Продано", rooms: 3 },
    { id: 3, floor: 2, section: 1, number: "201", area: 52, status: "Свободно", rooms: 1 },
    { id: 4, floor: 2, section: 2, number: "202", area: 65, status: "Свободно", rooms: 2 },
    { id: 5, floor: 3, section: 1, number: "301", area: 50, status: "Свободно", rooms: 1 },
    { id: 6, floor: 3, section: 2, number: "302", area: 70, status: "Свободно", rooms: 3 }
  ];
}

function saveToStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getLogs() {
  const saved = localStorage.getItem(LOG_STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

function logAction(type, message) {
  const logs = getLogs();
  logs.push({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    type,
    message
  });
  if (logs.length > 100) logs.shift(); // Ограничение истории
  localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
}

// === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ===
let chessboardData = loadFromStorage();
let selectedCells = new Set();
let activeMode = null;
let dragItem = null;
let isLassoActive = false;
let dontAskAgain = false;

// === DOM ELEMENTS ===
const chessboard = document.getElementById('chessboard');
const modalConfirm = document.getElementById('modal-confirm');
const modalEdit = document.getElementById('modal-edit');
const modalLogs = document.getElementById('modal-logs');
const btnCancel = document.getElementById('btn-cancel');
const btnMove = document.getElementById('btn-move');
const btnEdit = document.getElementById('btn-edit');
const btnDelete = document.getElementById('btn-delete');
const btnLogs = document.getElementById('btn-logs');
const btnRecalc = document.getElementById('btn-recalc');
const btnLasso = document.getElementById('btn-lasso');

// === ОТРИСОВКА ШАХМАТКИ ===
function renderChessboard() {
  chessboard.innerHTML = '';
  const floors = [...new Set(chessboardData.map(p => p.floor))].sort((a, b) => a - b);
  const sections = [...new Set(chessboardData.map(p => p.section))].sort((a, b) => a - b);

  // Заголовок пустой
  const header0 = document.createElement('div');
  header0.textContent = '';
  chessboard.appendChild(header0);

  // Заголовки стояков
  sections.forEach(sec => {
    const header = document.createElement('div');
    header.textContent = `Стояк ${sec}`;
    header.style.fontWeight = 'bold';
    header.style.backgroundColor = '#EAEAEA';
    header.title = `Выделить стояк ${sec}`;
    header.onclick = () => selectSection(sec);
    chessboard.appendChild(header);
  });

  // Кнопка добавления секции
  const addSection = document.createElement('div');
  addSection.textContent = '+';
  addSection.style.border = '1px dashed #DDD';
  addSection.style.backgroundColor = '#EAEAEA';
  addSection.title = 'Добавить секцию';
  chessboard.appendChild(addSection);

  // Строки этажей
  floors.forEach(floor => {
    const floorHeader = document.createElement('div');
    floorHeader.textContent = `Этаж ${floor}`;
    floorHeader.style.fontWeight = 'bold';
    floorHeader.style.backgroundColor = '#EAEAEA';
    floorHeader.title = `Выделить этаж ${floor}`;
    floorHeader.onclick = () => selectFloor(floor);
    chessboard.appendChild(floorHeader);

    sections.forEach(sec => {
      const unit = chessboardData.find(u => u.floor === floor && u.section === sec);
      const cell = createCell(unit);
      chessboard.appendChild(cell);
    });

    // Добавление этажа
    const addFloor = document.createElement('div');
    addFloor.textContent = '+';
    addFloor.style.border = '1px dashed #DDD';
    addFloor.style.backgroundColor = '#EAEAEA';
    addFloor.title = 'Добавить этаж';
    chessboard.appendChild(addFloor);
  });
}

function createCell(unit) {
  const cell = document.createElement('div');
  if (!unit) {
    cell.textContent = '+';
    cell.style.border = '1px dashed #DDD';
    return cell;
  }

  cell.innerHTML = `<div class="number">${unit.number}</div><div class="area">${unit.area} м²</div>`;
  cell.dataset.id = unit.id;
  cell.dataset.floor = unit.floor;
  cell.dataset.section = unit.section;

  if (unit.status !== 'Свободно') {
    cell.style.backgroundColor = '#FFEBEE';
  }
  if (selectedCells.has(unit.id)) {
    cell.classList.add('selected');
  }

  // Drag & Drop
  cell.draggable = true;
  cell.ondragstart = (e) => {
    dragItem = unit;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => cell.style.opacity = '0.5', 0);
  };

  cell.ondragend = () => {
    cell.style.opacity = '1';
  };

  cell.ondragover = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  cell.ondrop = () => {
    if (!dragItem) return;
    const targetId = parseInt(cell.dataset.id);
    if (isNaN(targetId)) return;

    const target = chessboardData.find(u => u.id === targetId);
    if (!target) return;

    if (!dontAskAgain && !confirm(`Заменить помещение ${target.number}?`)) return;

    const oldNum = target.number;
    target.number = dragItem.number;
    dragItem.number = oldNum;

    logAction('Перемещение', `Помещения ${target.number} и ${dragItem.number} поменялись местами`);
    saveToStorage(chessboardData);
    renderChessboard();
    dragItem = null;
  };

  cell.onclick = (e) => {
    if (activeMode === 'move' || isLassoActive) return;
    e.stopPropagation();
    toggleSelect(unit.id);
  };

  return cell;
}

// === ВЫДЕЛЕНИЕ ===
function toggleSelect(id) {
  if (selectedCells.has(id)) {
    selectedCells.delete(id);
  } else {
    selectedCells.add(id);
  }
  renderChessboard();
}

function selectFloor(floor) {
  chessboardData.forEach(u => {
    if (u.floor === floor) selectedCells.add(u.id);
  });
  renderChessboard();
}

function selectSection(section) {
  chessboardData.forEach(u => {
    if (u.section === section) selectedCells.add(u.id);
  });
  renderChessboard();
}

// === ЛАССО-РЕЖИМ ===
let isDrawingLasso = false;
let lassoRect = null;
let startX, startY;

chessboard.parentNode.style.position = 'relative';

btnLasso.onclick = () => {
  isLassoActive = !isLassoActive;
  btnLasso.classList.toggle('active', isLassoActive);
  if (isLassoActive) {
    activeMode = null;
    btnCancel.style.display = 'inline-block';
  }
};

chessboard.parentNode.onmousedown = (e) => {
  if (!isLassoActive) return;
  const rect = chessboard.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return;

  isDrawingLasso = true;
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;

  lassoRect = document.createElement('div');
  lassoRect.style.position = 'absolute';
  lassoRect.style.left = startX + 'px';
  lassoRect.style.top = startY + 'px';
  lassoRect.style.border = '2px dashed #69C';
  lassoRect.style.pointerEvents = 'none';
  lassoRect.style.zIndex = '10';
  lassoRect.style.borderRadius = '6px';
  chessboard.parentNode.appendChild(lassoRect);
};

chessboard.parentNode.onmousemove = (e) => {
  if (!isDrawingLasso || !isLassoActive) return;
  const rect = chessboard.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const width = Math.abs(x - startX);
  const height = Math.abs(y - startY);
  const left = Math.min(startX, x);
  const top = Math.min(startY, y);

  lassoRect.style.width = width + 'px';
  lassoRect.style.height = height + 'px';
  lassoRect.style.left = left + 'px';
  lassoRect.style.top = top + 'px';
};

chessboard.parentNode.onmouseup = () => {
  if (!isDrawingLasso || !isLassoActive) return;
  isDrawingLasso = false;

  const cells = document.querySelectorAll('#chessboard > div[data-id]');
  const rectLasso = lassoRect.getBoundingClientRect();

  cells.forEach(cell => {
    const cellRect = cell.getBoundingClientRect();
    const cx = (cellRect.left + cellRect.right) / 2;
    const cy = (cellRect.top + cellRect.bottom) / 2;

    if (cx >= rectLasso.left && cx <= rectLasso.right &&
        cy >= rectLasso.top && cy <= rectLasso.bottom) {
      selectedCells.add(parseInt(cell.dataset.id));
    }
  });

  chessboard.parentNode.removeChild(lassoRect);
  lassoRect = null;
  renderChessboard();
};

// === РЕЖИМЫ ===
btnMove.onclick = () => {
  activeMode = 'move';
  isLassoActive = false;
  btnLasso.classList.remove('active');
  btnCancel.style.display = 'inline-block';
  alert('Режим перемещения. Перетащите помещение в другую ячейку.');
};

btnEdit.onclick = () => {
  if (selectedCells.size === 0) {
    alert('Сначала выделите помещения.');
    return;
  }
  document.getElementById('edit-count').textContent = `Изменение ${selectedCells.size} помещений`;
  modalEdit.style.display = 'flex';
};

btnDelete.onclick = () => {
  if (selectedCells.size === 0) {
    alert('Ничего не выделено.');
    return;
  }
  const numbers = Array.from(selectedCells)
    .map(id => chessboardData.find(u => u.id === id)?.number)
    .filter(Boolean)
    .join(', ');
  document.getElementById('modal-message').textContent = `Удалить ${selectedCells.size} помещений: ${numbers}?`;
  document.getElementById('dont-ask').checked = false;
  modalConfirm.style.display = 'flex';
};

btnCancel.onclick = () => {
  selectedCells.clear();
  activeMode = null;
  isLassoActive = false;
  btnLasso.classList.remove('active');
  btnCancel.style.display = 'none';
  if (lassoRect) {
    try { chessboard.parentNode.removeChild(lassoRect); } catch {}
    lassoRect = null;
  }
  renderChessboard();
};

// === МОДАЛЬНЫЕ ОКНА ===
document.getElementById('modal-cancel').onclick = () => {
  modalConfirm.style.display = 'none';
};

document.getElementById('modal-confirm-btn').onclick = () => {
  dontAskAgain = document.getElementById('dont-ask').checked;

  if (selectedCells.size > 0) {
    const numbers = Array.from(selectedCells)
      .map(id => chessboardData.find(u => u.id === id)?.number)
      .filter(Boolean)
      .join(', ');

    logAction('Удаление', `Удалено ${selectedCells.size} помещений: ${numbers}`);
    chessboardData = chessboardData.filter(u => !selectedCells.has(u.id));
    saveToStorage(chessboardData);
  }

  selectedCells.clear();
  activeMode = null;
  btnCancel.style.display = 'none';
  renderChessboard();
  modalConfirm.style.display = 'none';
};

// === МАССОВОЕ ИЗМЕНЕНИЕ ===
document.getElementById('edit-save').onclick = () => {
  const status = document.getElementById('edit-status').value;
  const area = document.getElementById('edit-area').value;
  const number = document.getElementById('edit-number').value;

  logAction('Изменение', `Изменено ${selectedCells.size} помещений: статус → "${status}", площадь → ${area} м²`);
  alert(`Изменено ${selectedCells.size} помещений`);
  modalEdit.style.display = 'none';
  btnCancel.click();
};

document.getElementById('edit-cancel').onclick = () => {
  modalEdit.style.display = 'none';
};

// === ПЕРЕСЧЁТ НОМЕРОВ ===
btnRecalc.onclick = () => {
  let num = 101;
  chessboardData.forEach(u => { u.number = num++; });
  saveToStorage(chessboardData);
  logAction('Система', `Пересчитаны номера: обновлено ${chessboardData.length} помещений`);
  renderChessboard();
  alert('Номера пересчитаны.');
};

// === ЛОГИ ===
btnLogs.onclick = () => {
  renderLogs();
  modalLogs.style.display = 'flex';
};

document.getElementById('close-logs').onclick = () => {
  modalLogs.style.display = 'none';
};

document.getElementById('log-filter').onchange = renderLogs;

document.getElementById('clear-logs').onclick = () => {
  if (confirm('Очистить всю историю изменений?')) {
    localStorage.setItem(LOG_STORAGE_KEY, '[]');
    renderLogs();
  }
};

function renderLogs() {
  const logs = getLogs().reverse();
  const container = document.getElementById('logs-list');
  const filter = document.getElementById('log-filter').value;

  container.innerHTML = '';

  const filtered = filter === 'all' ? logs : logs.filter(l => l.type === filter);

  if (filtered.length === 0) {
    container.innerHTML = '<div class="log-entry"><em>Нет записей для отображения</em></div>';
    return;
  }

  filtered.forEach(log => {
    const date = new Date(log.timestamp).toLocaleString('ru-RU');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `
      <div class="log-time">${date}</div>
      <div class="log-type" data-type="${log.type}">${log.type}</div>
      <div class="log-message">${log.message}</div>
    `;
    container.appendChild(entry);
  });
}

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', () => {
  renderChessboard();
  renderLogs();
});
