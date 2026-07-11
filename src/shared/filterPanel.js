import { getFilters, setFilters, onFiltersChanged } from './storage.js';
import { DEFAULT_FILTERS } from './defaults.js';
import { strings } from '../locales/pt.js';

// Único sítio que sabe montar o HTML do painel a partir do dicionário de
// strings — trocar de idioma no futuro não deve exigir tocar aqui, só no
// ficheiro em src/locales/.
function buildTemplate(t) {
  return `
  <button type="button" class="ytf-reset-all" data-widget="reset-all">${t.panel.resetAll}</button>

  <section class="ytf-filter" data-filter="age">
    <label class="ytf-filter-header">
      <input type="checkbox" data-field="age.enabled" />
      <span>${t.panel.age.title}</span>
    </label>
    <div class="ytf-filter-body">
      <div class="ytf-chips" data-widget="age-chips"></div>
      <div data-widget="age-custom" class="ytf-age-custom">
        <div class="ytf-chips" data-widget="age-comparison-chips"></div>
        <div data-widget="age-calendar" class="ytf-calendar"></div>
      </div>
      <p class="ytf-hint">${t.panel.age.hint}</p>
    </div>
  </section>

  <section class="ytf-filter" data-filter="duration">
    <label class="ytf-filter-header">
      <input type="checkbox" data-field="duration.enabled" />
      <span>${t.panel.duration.title}</span>
    </label>
    <div class="ytf-filter-body">
      <div class="ytf-chips" data-widget="duration-chips"></div>
      <label class="ytf-row">
        <span>${t.panel.duration.minutesLabel}</span>
        <input
          type="number"
          min="0"
          step="1"
          inputmode="numeric"
          pattern="[0-9]*"
          data-field="duration.minutes"
          placeholder="${t.panel.duration.minutesPlaceholder}"
        />
      </label>
    </div>
  </section>

  <section class="ytf-filter" data-filter="views">
    <label class="ytf-filter-header">
      <input type="checkbox" data-field="views.enabled" />
      <span>${t.panel.views.title}</span>
    </label>
    <div class="ytf-filter-body">
      <div data-widget="views-slider" class="ytf-slider"></div>
    </div>
  </section>

  <section class="ytf-filter" data-filter="hideShorts">
    <label class="ytf-filter-header">
      <input type="checkbox" data-field="hideShorts.enabled" />
      <span>${t.panel.hideShorts}</span>
    </label>
  </section>

  <section class="ytf-filter">
    <div class="ytf-filter-title">${t.panel.other.title}</div>
    <div class="ytf-filter-body">
      <label class="ytf-toggle-row">
        <input type="checkbox" data-field="hideCollections.enabled" />
        <span>${t.panel.other.hideCollections}</span>
      </label>
      <label class="ytf-toggle-row">
        <input type="checkbox" data-field="hideLive.enabled" />
        <span>${t.panel.other.hideLive}</span>
      </label>
    </div>
  </section>
`;
}

function getPath(obj, path) {
  return path.split('.').reduce((value, key) => value?.[key], obj);
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((value, key) => (value[key] ??= {}), obj);
  target[lastKey] = value;
}

function countActiveFilters(filters) {
  return [
    filters.age.enabled,
    filters.duration.enabled,
    filters.views.enabled,
    filters.hideShorts.enabled,
    filters.hideCollections.enabled,
    filters.hideLive.enabled,
  ].filter(Boolean).length;
}

function updateAgeCustomVisibility(container, mode) {
  container.querySelector('[data-widget="age-custom"]').style.display = mode === 'custom' ? '' : 'none';
}

// Grupo de chips de seleção única (usado para presets de idade, comparação
// personalizada, e modo de duração). Devolve um controlador com update(valorAtivo).
function createChipGroup(container, { options, onSelect }) {
  const buttons = options.map(({ value, label }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ytf-chip';
    btn.textContent = label;
    btn.addEventListener('click', () => onSelect(value));
    container.appendChild(btn);
    return { btn, value };
  });

  return {
    update(activeValue) {
      buttons.forEach(({ btn, value }) => btn.classList.toggle('is-active', value === activeValue));
    },
  };
}

const WEEKDAY_LABELS = strings.calendar.weekdays;
const MONTH_LABELS = strings.calendar.months;

function toDateValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Calendário minimalista próprio — um <input type="date"> nativo não dá para
// estilizar o popup do calendário, e o pedido era um design sleek consistente
// com o resto do painel.
function createCalendar(container, { onSelect }) {
  let viewDate = new Date();
  viewDate.setDate(1);
  let selectedValue = null;

  const header = document.createElement('div');
  header.className = 'ytf-calendar-header';
  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'ytf-calendar-nav';
  prevBtn.textContent = '‹';
  const label = document.createElement('span');
  label.className = 'ytf-calendar-label';
  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'ytf-calendar-nav';
  nextBtn.textContent = '›';
  header.append(prevBtn, label, nextBtn);

  const weekdaysRow = document.createElement('div');
  weekdaysRow.className = 'ytf-calendar-weekdays';
  WEEKDAY_LABELS.forEach((w) => {
    const el = document.createElement('span');
    el.textContent = w;
    weekdaysRow.appendChild(el);
  });

  const grid = document.createElement('div');
  grid.className = 'ytf-calendar-grid';

  container.append(header, weekdaysRow, grid);

  function renderGrid() {
    label.textContent = `${MONTH_LABELS[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
    grid.innerHTML = '';

    const firstWeekday = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();

    for (let i = 0; i < firstWeekday; i++) {
      grid.appendChild(document.createElement('span'));
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const cellValue = toDateValue(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ytf-calendar-day';
      btn.textContent = String(day);
      btn.classList.toggle('is-selected', cellValue === selectedValue);
      btn.addEventListener('click', () => {
        selectedValue = cellValue;
        renderGrid();
        onSelect(cellValue);
      });
      grid.appendChild(btn);
    }
  }

  prevBtn.addEventListener('click', () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    renderGrid();
  });
  nextBtn.addEventListener('click', () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    renderGrid();
  });

  renderGrid();

  return {
    update(value) {
      selectedValue = value ?? null;
      if (value) {
        const [y, m] = value.split('-').map(Number);
        viewDate = new Date(y, m - 1, 1);
      }
      renderGrid();
    },
  };
}

// Escala não-linear (0 a 10M+) — uma escala linear tornaria impossível escolher
// com precisão intervalos pequenos como "menos de 10 mil views".
const VIEWS_STEPS = [0, 100, 500, 1_000, 5_000, 10_000, 50_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000];
const VIEWS_LAST_INDEX = VIEWS_STEPS.length - 1;

function formatViewsStep(index) {
  if (index === 0) return '0';
  if (index === VIEWS_LAST_INDEX) return `${VIEWS_STEPS[VIEWS_LAST_INDEX] / 1_000_000}M+`;
  const value = VIEWS_STEPS[index];
  if (value >= 1_000_000) return `${value / 1_000_000}M`;
  if (value >= 1_000) return `${value / 1_000}K`;
  return String(value);
}

function viewsValueToIndex(value, fallbackIndex) {
  if (value == null) return fallbackIndex;
  const index = VIEWS_STEPS.indexOf(value);
  return index === -1 ? fallbackIndex : index;
}

// Slider de dois handles independentes — nos extremos (0 e 10M+) esse lado
// fica sem limite; só o handle que o utilizador moveu passa a valer.
function createViewsSlider(container, { onChange }) {
  let minIndex = 0;
  let maxIndex = VIEWS_LAST_INDEX;
  let dragging = null;

  const track = document.createElement('div');
  track.className = 'ytf-slider-track';
  const range = document.createElement('div');
  range.className = 'ytf-slider-range';
  const minHandle = document.createElement('button');
  minHandle.type = 'button';
  minHandle.className = 'ytf-slider-handle';
  minHandle.setAttribute('aria-label', strings.panel.views.minAriaLabel);
  const maxHandle = document.createElement('button');
  maxHandle.type = 'button';
  maxHandle.className = 'ytf-slider-handle';
  maxHandle.setAttribute('aria-label', strings.panel.views.maxAriaLabel);
  track.append(range, minHandle, maxHandle);

  const labels = document.createElement('div');
  labels.className = 'ytf-slider-labels';
  const minLabel = document.createElement('span');
  const maxLabel = document.createElement('span');
  labels.append(minLabel, maxLabel);

  container.append(track, labels);

  function indexToPercent(index) {
    return (index / VIEWS_LAST_INDEX) * 100;
  }

  function render() {
    minHandle.style.left = `${indexToPercent(minIndex)}%`;
    maxHandle.style.left = `${indexToPercent(maxIndex)}%`;
    range.style.left = `${indexToPercent(minIndex)}%`;
    range.style.width = `${indexToPercent(maxIndex) - indexToPercent(minIndex)}%`;
    minLabel.textContent = formatViewsStep(minIndex);
    maxLabel.textContent = formatViewsStep(maxIndex);
  }

  function commit() {
    onChange({
      minViews: minIndex === 0 ? null : VIEWS_STEPS[minIndex],
      maxViews: maxIndex === VIEWS_LAST_INDEX ? null : VIEWS_STEPS[maxIndex],
    });
  }

  function indexFromPointer(clientX) {
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(ratio * VIEWS_LAST_INDEX);
  }

  function handlePointerMove(event) {
    if (!dragging) return;
    const index = indexFromPointer(event.clientX);
    if (dragging === 'min') {
      minIndex = Math.min(index, maxIndex);
    } else {
      maxIndex = Math.max(index, minIndex);
    }
    render();
  }

  function handlePointerUp() {
    if (!dragging) return;
    dragging = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    commit();
  }

  function startDrag(which) {
    return (event) => {
      event.preventDefault();
      dragging = which;
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    };
  }

  minHandle.addEventListener('pointerdown', startDrag('min'));
  maxHandle.addEventListener('pointerdown', startDrag('max'));

  render();

  return {
    update(viewsFilter) {
      if (dragging) return; // não interromper um arrasto em curso
      minIndex = viewsValueToIndex(viewsFilter.minViews, 0);
      maxIndex = viewsValueToIndex(viewsFilter.maxViews, VIEWS_LAST_INDEX);
      render();
    },
  };
}

function fillGenericFields(container, filters) {
  container.querySelectorAll('[data-field]').forEach((input) => {
    const path = input.dataset.field;
    const value = getPath(filters, path);
    if (input.type === 'checkbox') {
      input.checked = Boolean(value);
    } else {
      input.value = value ?? '';
    }
  });
}

// Monta o painel de filtros dentro de `container`. Devolve uma função de limpeza.
export function mountFilterPanel(container) {
  container.innerHTML = buildTemplate(strings);

  let currentFilters = null;
  let debounceTimer = null;

  function renderWidgets() {
    if (!currentFilters) return;

    const ageChipValue = currentFilters.age.mode === 'custom' ? 'custom' : currentFilters.age.preset;
    ageChips.update(ageChipValue);
    updateAgeCustomVisibility(container, currentFilters.age.mode);
    ageComparisonChips.update(currentFilters.age.custom.comparison);
    ageCalendar.update(currentFilters.age.custom.date);

    durationChips.update(currentFilters.duration.mode);
    viewsSlider.update(currentFilters.views);

    const activeCount = countActiveFilters(currentFilters);
    resetAllButton.disabled = activeCount === 0;
    resetAllButton.classList.toggle('is-active', activeCount >= 2);
  }

  function commit(mutate) {
    if (!currentFilters) return;
    const next = structuredClone(currentFilters);
    mutate(next);
    currentFilters = next;
    renderWidgets();

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => setFilters(currentFilters), 250);
  }

  const resetAllButton = container.querySelector('[data-widget="reset-all"]');
  resetAllButton.addEventListener('click', () => commit((filters) => Object.assign(filters, structuredClone(DEFAULT_FILTERS))));

  const ageChips = createChipGroup(container.querySelector('[data-widget="age-chips"]'), {
    options: [
      { value: 'lessThan1Day', label: strings.panel.age.presets.lessThan1Day },
      { value: 'lessThan5Days', label: strings.panel.age.presets.lessThan5Days },
      { value: 'moreThan10Days', label: strings.panel.age.presets.moreThan10Days },
      { value: 'custom', label: strings.panel.age.presets.custom },
    ],
    onSelect: (value) =>
      commit((filters) => {
        if (value === 'custom') {
          filters.age.mode = 'custom';
        } else {
          filters.age.mode = 'preset';
          filters.age.preset = value;
        }
      }),
  });

  const ageComparisonChips = createChipGroup(container.querySelector('[data-widget="age-comparison-chips"]'), {
    options: [
      { value: 'before', label: strings.panel.age.comparison.before },
      { value: 'after', label: strings.panel.age.comparison.after },
    ],
    onSelect: (value) =>
      commit((filters) => {
        filters.age.custom.comparison = value;
      }),
  });

  const ageCalendar = createCalendar(container.querySelector('[data-widget="age-calendar"]'), {
    onSelect: (value) =>
      commit((filters) => {
        filters.age.custom.date = value;
      }),
  });

  const durationChips = createChipGroup(container.querySelector('[data-widget="duration-chips"]'), {
    options: [
      { value: 'lessThan', label: strings.panel.duration.lessThan },
      { value: 'moreThan', label: strings.panel.duration.moreThan },
    ],
    onSelect: (value) =>
      commit((filters) => {
        filters.duration.mode = value;
      }),
  });

  const viewsSlider = createViewsSlider(container.querySelector('[data-widget="views-slider"]'), {
    onChange: ({ minViews, maxViews }) =>
      commit((filters) => {
        filters.views.minViews = minViews;
        filters.views.maxViews = maxViews;
      }),
  });

  function handleGenericInput(event) {
    const path = event.target.dataset.field;
    if (!path) return;

    commit((filters) => {
      if (event.target.type === 'checkbox') {
        setPath(filters, path, event.target.checked);
      } else if (path === 'duration.minutes') {
        // Só dígitos — protege contra colar texto/símbolos no campo.
        const digitsOnly = event.target.value.replace(/[^0-9]/g, '');
        if (digitsOnly !== event.target.value) event.target.value = digitsOnly;
        setPath(filters, path, digitsOnly === '' ? null : Number(digitsOnly));
      } else {
        setPath(filters, path, event.target.value || null);
      }
    });
  }

  container.addEventListener('input', handleGenericInput);
  container.addEventListener('change', handleGenericInput);

  const unsubscribe = onFiltersChanged((newFilters) => {
    currentFilters = newFilters;
    fillGenericFields(container, currentFilters);
    renderWidgets();
  });

  getFilters().then((filters) => {
    currentFilters = filters;
    fillGenericFields(container, currentFilters);
    renderWidgets();
  });

  return () => {
    clearTimeout(debounceTimer);
    unsubscribe?.();
  };
}
