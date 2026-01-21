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

  // Строки этаж
