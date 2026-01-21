<template>
  <div class="chessboard-container">
    <h1>Шахматка</h1>

    <div class="toolbar">
      <button @click="activateMode('move')">Переместить</button>
      <button @click="activateMode('edit')">Изменить</button>
      <button @click="activateMode('delete')">Удалить</button>
      <button @click="isLassoActive = !isLassoActive" :class="{ active: isLassoActive }">Лассо</button>
      <button @click="recalculateNumbers" class="accent">Пересчитать номера</button>
      <button v-if="activeMode || isLassoActive" @click="cancelAll" class="accent">Отмена</button>
    </div>

    <div ref="chessboard" class="chessboard" @mousedown="startLasso" @mousemove="updateLasso" @mouseup="endLasso">
      <div v-for="cell in grid" :key="cell.key"
           :class="['cell', { selected: cell.selected, 'header': cell.header, 'add': cell.add }]"
           :data-id="cell.id"
           :draggable="cell.draggable"
           @dragstart="onDragStart(cell)"
           @dragover="onDragOver"
           @drop="onDrop(cell)"
           @click="onClickCell(cell)">
        <div v-if="!cell.header && !cell.add">
          <div class="number">{{ cell.number }}</div>
          <div class="area">{{ cell.area }} м²</div>
        </div>
        <div v-else>{{ cell.label }}</div>
      </div>
    </div>

    <div v-if="isDrawingLasso" class="lasso" :style="lassoStyle"></div>

    <!-- Модальное окно логов -->
    <div v-if="showLogs" class="modal">
      <div class="modal-content" style="width: 700px;">
        <h2>История изменений</h2>
        <select v-model="logFilter">
          <option value="all">Все</option>
          <option value="Добавление">Добавление</option>
          <option value="Удаление">Удаление</option>
          <option value="Изменение">Изменение</option>
          <option value="Перемещение">Перемещение</option>
          <option value="Система">Система</option>
        </select>
        <button @click="clearLogs" style="background: #FF5252; color: white; padding: 4px 8px; border: none; border-radius: 4px; font-size: 12px;">Очистить</button>
        <div class="logs-list">
          <div v-for="log in filteredLogs" :key="log.id" class="log-entry">
            <div class="log-time">{{ new Date(log.timestamp).toLocaleString('ru-RU') }}</div>
            <div class="log-type" :data-type="log.type">{{ log.type }}</div>
            <div class="log-message">{{ log.message }}</div>
          </div>
        </div>
        <button @click="showLogs = false">Закрыть</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Chessboard',
  data() {
    return {
      units: JSON.parse(localStorage.getItem('chessboard-vue') || JSON.stringify([
        { id: 1, floor: 1, section: 1, number: "101", area: 54, status: "Свободно" },
        { id: 2, floor: 1, section: 2, number: "102", area: 68, status: "Продано" },
      ])),
      selected: new Set(),
      activeMode: null,
      isLassoActive: false,
      isDrawingLasso: false,
      lasso: { startX: 0, startY: 0, width: 0, height: 0 },
      dragItem: null,
      logs: JSON.parse(localStorage.getItem('chessboard-logs-vue') || '[]'),
      showLogs: false,
      logFilter: 'all'
    };
  },
  computed: {
    grid() {
      const floors = [...new Set(this.units.map(u => u.floor))].sort();
      const sections = [...new Set(this.units.map(u => u.section))].sort();
      const grid = [];

      grid.push({ key: 'empty', header: true, label: '' });
      sections.forEach(s => grid.push({ key: `sec-${s}`, header: true, label: `Стояк ${s}` }));

      floors.forEach(f => {
        grid.push({ key: `floor-${f}`, header: true, label: `Этаж ${f}` });
        sections.forEach(s => {
          const unit = this.units.find(u => u.floor === f && u.section === s);
          if (unit) {
            grid.push({
              ...unit,
              key: `unit-${unit.id}`,
              selected: this.selected.has(unit.id),
              draggable: true
            });
          } else {
            grid.push({ key: `add-${f}-${s}`, add: true, label: '+' });
          }
        });
      });
      return grid;
    },
    lassoStyle() {
      return {
        left: this.lasso.startX + 'px',
        top: this.lasso.startY + 'px',
        width: this.lasso.width + 'px',
        height: this.lasso.height + 'px'
      };
    },
    filteredLogs() {
      return this.logFilter === 'all'
        ? this.logs.slice().reverse()
        : this.logs.filter(l => l.type === this.logFilter).reverse();
    }
  },
  methods: {
    save() {
      localStorage.setItem('chessboard-vue', JSON.stringify(this.units));
    },
    logAction(type, message) {
      const log = { id: Date.now(), timestamp: new Date().toISOString(), type, message };
      this.logs.push(log);
      if (this.logs.length > 100) this.logs.shift();
      localStorage.setItem('chessboard-logs-vue', JSON.stringify(this.logs));
    },
    activateMode(mode) {
      this.activeMode = mode;
      this.isLassoActive = false;
    },
    cancelAll() {
      this.selected.clear();
      this.activeMode = null;
      this.isLassoActive = false;
      this.isDrawingLasso = false;
    },
    onClickCell(cell) {
      if (this.isLassoActive || !cell.id) return;
      if (this.selected.has(cell.id)) {
        this.selected.delete(cell.id);
      } else {
        this.selected.add(cell.id);
      }
    },
    onDragStart(cell) {
      this.dragItem = cell;
    },
    onDragOver(e) {
      e.preventDefault();
    },
    onDrop(target) {
      if (!this.dragItem || !target.id) return;
      const targetUnit = this.units.find(u => u.id === target.id);
      if (!targetUnit) return;

      if (!confirm(`Заменить ${target.number}?`)) return;

      const temp = targetUnit.number;
      targetUnit.number = this.dragItem.number;
      this.dragItem.number = temp;
      this.save();
      this.logAction('Перемещение', `Помещения ${target.number} и ${this.dragItem.number} поменялись местами`);
      this.dragItem = null;
    },
    startLasso(e) {
      if (!this.isLassoActive) return;
      const rect = this.$refs.chessboard.getBoundingClientRect();
      this.isDrawingLasso = true;
      this.lasso.startX = e.clientX - rect.left;
      this.lasso.startY = e.clientY - rect.top;
    },
    updateLasso(e) {
      if (!this.isDrawingLasso) return;
      const rect = this.$refs.chessboard.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.lasso.width = Math.abs(x - this.lasso.startX);
      this.lasso.height = Math.abs(y - this.lasso.startY);
    },
    endLasso() {
      this.isDrawingLasso = false;
    },
    recalculateNumbers() {
      let num = 101;
      this.units.forEach(u => { u.number = num++; });
      this.save();
      this.logAction('Система', `Пересчитаны номера: ${this.units.length} помещений`);
    },
    clearLogs() {
      if (confirm('Очистить историю?')) {
        this.logs = [];
        localStorage.setItem('chessboard-logs-vue', '[]');
      }
    }
  }
};
</script>

<style scoped>
/* Стили аналогичны CSS выше */
</style>
