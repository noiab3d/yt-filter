import { CHIP_BAR, VIDEO_GRID_CONTAINER } from './selectors.js';
import { mountFilterPanel } from '../shared/filterPanel.js';
import { getInstalledAt, getButtonPosition, setButtonPosition } from '../shared/storage.js';
import { strings } from '../locales/index.js';
import filterPanelStyles from '../shared/filterPanel.css';

const HOST_ID = 'ytf-inpage-host';
const DEFAULT_TOP_OFFSET = 84; // usado quando não encontramos a barra de categorias.
const NEW_BADGE_DURATION_MS = 24 * 60 * 60 * 1000;
const EDGE_MARGIN = 16;
const PANEL_WIDTH = 320; // mantido sincronizado com o width de .ytf-panel-wrapper abaixo
const PANEL_GAP = 8;
const PANEL_MIN_HEIGHT = 160;
const HOVER_ZONE_PADDING = 32; // margem à volta do botão que também conta como "rato perto"

// Fixo ao viewport (acompanha o scroll) — anexado diretamente ao body, não à
// árvore do YouTube, para não arriscar que o Polymer o apague ao re-renderizar.
const HOST_STYLES = `
  :host { all: initial; }
  .ytf-toggle-wrapper {
    position: fixed;
    z-index: 2147483647;
  }
  .ytf-toggle-wrapper.dragging {
    transition: none;
    cursor: grabbing;
  }
  .ytf-toggle-wrapper.snapping {
    transition: left 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
      top 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .ytf-toggle {
    position: relative;
    display: block;
    background: rgba(20, 20, 20, 0.72);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: #f1f1f1;
    border: 1px solid #3f3f3f;
    border-radius: 8px;
    padding: 6px 16px;
    font: 500 14px/20px 'Roboto', Arial, sans-serif;
    cursor: pointer;
  }
  .ytf-toggle:hover {
    background: rgba(40, 40, 40, 0.8);
    box-shadow: 0 0 8px rgba(62, 166, 255, 0.35);
  }
  .ytf-new-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    background: #f5c518;
    color: #1a1a1a;
    font-size: 8px;
    line-height: 1;
    font-weight: 700;
    padding: 2px 4px;
    border-radius: 6px;
    letter-spacing: 0.2px;
    box-shadow: 0 0 6px rgba(245, 197, 24, 0.6);
  }
  .ytf-handle {
    position: absolute;
    top: 50%;
    width: 4px;
    height: 26px;
    border-radius: 3px;
    background: #3ea6ff;
    box-shadow: 0 0 6px rgba(62, 166, 255, 0.75);
    cursor: grab;
    opacity: 0;
    touch-action: none;
    transition: opacity 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
  }
  .ytf-handle:active {
    cursor: grabbing;
  }
  /* Invisível em repouso (o próprio botão é translúcido, não faz sentido ter
     uma caixa visível ao lado dele) — só aparece quando o rato se aproxima
     do botão (ver .near, aplicada por JS numa zona maior que o próprio
     botão), deslizando para fora do lado de dentro. */
  .ytf-toggle-wrapper.side-right .ytf-handle {
    left: -12px;
    transform: translateY(-50%) translateX(10px);
  }
  .ytf-toggle-wrapper.side-left .ytf-handle {
    right: -12px;
    transform: translateY(-50%) translateX(-10px);
  }
  .ytf-toggle-wrapper.side-right.near .ytf-handle,
  .ytf-toggle-wrapper.side-right.dragging .ytf-handle,
  .ytf-toggle-wrapper.side-left.near .ytf-handle,
  .ytf-toggle-wrapper.side-left.dragging .ytf-handle {
    transform: translateY(-50%) translateX(0);
    opacity: 1;
    box-shadow: 0 0 10px rgba(62, 166, 255, 0.9);
  }
  .ytf-panel-wrapper {
    position: fixed;
    z-index: 2147483647;
    width: 320px;
    max-height: 70vh;
    overflow-y: auto;
    border: 1px solid #303030;
    border-radius: 10px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(62, 166, 255, 0.15);
    display: none;
  }
  .ytf-panel-wrapper.open {
    display: block;
  }
`;

let host = null;
let cleanupHoverZone = null;

function computeTopOffset() {
  const chipBar = document.querySelector(CHIP_BAR);
  if (!chipBar) return DEFAULT_TOP_OFFSET;
  return Math.max(chipBar.getBoundingClientRect().bottom + 8, 64);
}

// A grid de vídeos não ocupa a viewport inteira (há uma sidebar fixa à
// esquerda) — usamos os limites reais da grid para o íman, para o botão
// nunca ficar preso em cima da sidebar. Sem grid encontrada (raro, só nos
// primeiros instantes da página), cai para os limites da viewport.
function gridBounds() {
  const grid = document.querySelector(VIDEO_GRID_CONTAINER);
  return grid ? grid.getBoundingClientRect() : null;
}

// Distância em px a partir da esquerda da viewport para encostar um elemento
// de largura `elementWidth` ao lado indicado da área de vídeos.
function edgeLeft(side, elementWidth) {
  const bounds = gridBounds();
  if (side === 'left') {
    return bounds ? bounds.left + EDGE_MARGIN : EDGE_MARGIN;
  }
  const rightBound = bounds ? bounds.right - EDGE_MARGIN : window.innerWidth - EDGE_MARGIN;
  return rightBound - elementWidth;
}

function clampTop(top, elementHeight) {
  const max = Math.max(EDGE_MARGIN, window.innerHeight - elementHeight - EDGE_MARGIN);
  return Math.min(Math.max(top, EDGE_MARGIN), max);
}

function currentSide(wrapper) {
  return wrapper.classList.contains('side-left') ? 'left' : 'right';
}

// A aba só é fácil de agarrar se aparecer antes do rato tocar exatamente no
// botão — por isso a deteção de proximidade usa uma zona maior que o botão
// em si (HOVER_ZONE_PADDING), em vez de depender só de :hover no botão.
function attachHoverZone(wrapper) {
  let near = false;

  function handlePointerMove(event) {
    const rect = wrapper.getBoundingClientRect();
    const isNear =
      event.clientX >= rect.left - HOVER_ZONE_PADDING &&
      event.clientX <= rect.right + HOVER_ZONE_PADDING &&
      event.clientY >= rect.top - HOVER_ZONE_PADDING &&
      event.clientY <= rect.bottom + HOVER_ZONE_PADDING;

    if (isNear === near) return;
    near = isNear;
    wrapper.classList.toggle('near', near);
  }

  document.addEventListener('pointermove', handlePointerMove);
  return () => document.removeEventListener('pointermove', handlePointerMove);
}

// Posiciona só o botão — o painel só é posicionado quando abre (ver positionPanel).
function applyPosition(wrapper, side, top) {
  wrapper.classList.toggle('side-left', side === 'left');
  wrapper.classList.toggle('side-right', side !== 'left');
  wrapper.style.left = `${edgeLeft(side, wrapper.offsetWidth)}px`;
  wrapper.style.top = `${top}px`;
}

// Chamado sempre que o painel abre: decide se abre para baixo (normal) ou
// para cima, consoante o espaço livre por baixo do botão nesse momento —
// evita que o painel fique cortado quando o botão está perto do fundo.
function positionPanel(wrapper, panelWrapper, side) {
  const rect = wrapper.getBoundingClientRect();
  panelWrapper.style.left = `${edgeLeft(side, PANEL_WIDTH)}px`;

  const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP - EDGE_MARGIN;
  const spaceAbove = rect.top - PANEL_GAP - EDGE_MARGIN;
  const openUpward = spaceBelow < PANEL_MIN_HEIGHT && spaceAbove > spaceBelow;

  if (openUpward) {
    panelWrapper.style.top = 'auto';
    panelWrapper.style.bottom = `${window.innerHeight - rect.top + PANEL_GAP}px`;
    panelWrapper.style.maxHeight = `${Math.max(spaceAbove, PANEL_MIN_HEIGHT)}px`;
  } else {
    panelWrapper.style.bottom = 'auto';
    panelWrapper.style.top = `${rect.bottom + PANEL_GAP}px`;
    panelWrapper.style.maxHeight = `${Math.max(spaceBelow, PANEL_MIN_HEIGHT)}px`;
  }
}

// Arrastar pela aba: X é sempre "magnético" (ao largar, encosta ao lado mais
// próximo), Y fica onde o utilizador largar. O botão em si nunca inicia o
// arrasto — só a aba — por isso um clique normal no botão nunca é confundido
// com um arrasto.
function makeDraggable(wrapper, panelWrapper, panelOpenState, onSettled) {
  const handle = wrapper.querySelector('.ytf-handle');
  let drag = null;

  handle.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = wrapper.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      height: rect.height,
    };
    handle.setPointerCapture(event.pointerId);
    wrapper.classList.remove('snapping');
    wrapper.classList.add('dragging');
    if (panelOpenState.open) {
      panelOpenState.open = false;
      panelWrapper.classList.remove('open');
    }
    wrapper.style.left = `${rect.left}px`;
  });

  handle.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    wrapper.style.left = `${event.clientX - drag.offsetX}px`;
    wrapper.style.top = `${clampTop(event.clientY - drag.offsetY, drag.height)}px`;
  });

  function endDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const rect = wrapper.getBoundingClientRect();
    const bounds = gridBounds();
    const midpoint = bounds ? (bounds.left + bounds.right) / 2 : window.innerWidth / 2;
    const side = rect.left + rect.width / 2 < midpoint ? 'left' : 'right';
    const top = clampTop(rect.top, rect.height);
    drag = null;
    wrapper.classList.remove('dragging');
    wrapper.classList.add('snapping');
    applyPosition(wrapper, side, top);
    onSettled({ side, top });
  }

  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);
}

function buildHost() {
  const el = document.createElement('div');
  el.id = HOST_ID;
  const shadow = el.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `${filterPanelStyles}\n${HOST_STYLES}`;
  shadow.appendChild(style);

  const wrapper = document.createElement('div');
  wrapper.className = 'ytf-toggle-wrapper';
  shadow.appendChild(wrapper);

  const button = document.createElement('button');
  button.className = 'ytf-toggle';
  button.textContent = strings.inPageButton.toggle;
  wrapper.appendChild(button);

  const handle = document.createElement('div');
  handle.className = 'ytf-handle';
  handle.title = strings.inPageButton.dragHandleTitle;
  wrapper.appendChild(handle);

  getInstalledAt().then((installedAt) => {
    if (Date.now() - installedAt >= NEW_BADGE_DURATION_MS) return;
    const badge = document.createElement('span');
    badge.className = 'ytf-new-badge';
    badge.textContent = strings.inPageButton.newBadge;
    button.appendChild(badge);
  });

  const panelWrapper = document.createElement('div');
  panelWrapper.className = 'ytf-panel-wrapper';
  const panelContainer = document.createElement('div');
  panelContainer.className = 'ytf-panel';
  panelWrapper.appendChild(panelContainer);
  shadow.appendChild(panelWrapper);

  const panelOpenState = { open: false };
  button.addEventListener('click', () => {
    panelOpenState.open = !panelOpenState.open;
    if (panelOpenState.open) {
      positionPanel(wrapper, panelWrapper, currentSide(wrapper));
    }
    panelWrapper.classList.toggle('open', panelOpenState.open);
  });

  mountFilterPanel(panelContainer);

  return { el, wrapper, panelWrapper, panelOpenState };
}

export function injectFilterButton() {
  if (host) return;
  const { el, wrapper, panelWrapper, panelOpenState } = buildHost();
  host = el;
  document.body.appendChild(host);

  // Só dá para medir larguras (offsetWidth) depois de o host estar no DOM.
  applyPosition(wrapper, 'right', computeTopOffset());
  makeDraggable(wrapper, panelWrapper, panelOpenState, (position) => {
    setButtonPosition(position);
  });
  cleanupHoverZone = attachHoverZone(wrapper);

  getButtonPosition().then((saved) => {
    if (!saved || !host) return;
    applyPosition(wrapper, saved.side, clampTop(saved.top, wrapper.offsetHeight));
  });
}

export function removeFilterButton() {
  host?.remove();
  host = null;
  cleanupHoverZone?.();
  cleanupHoverZone = null;
}
