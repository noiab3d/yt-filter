import { CHIP_BAR } from './selectors.js';
import { mountFilterPanel } from '../shared/filterPanel.js';
import { getInstalledAt } from '../shared/storage.js';
import filterPanelStyles from '../shared/filterPanel.css';

const HOST_ID = 'ytf-inpage-host';
const DEFAULT_TOP_OFFSET = 84; // usado quando não encontramos a barra de categorias.
const NEW_BADGE_DURATION_MS = 24 * 60 * 60 * 1000;

// Fixo ao viewport (acompanha o scroll) — anexado diretamente ao body, não à
// árvore do YouTube, para não arriscar que o Polymer o apague ao re-renderizar.
const HOST_STYLES = `
  :host { all: initial; }
  .ytf-toggle {
    position: fixed;
    right: 16px;
    z-index: 2147483647;
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
  .ytf-panel-wrapper {
    position: fixed;
    right: 16px;
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

function computeTopOffset() {
  const chipBar = document.querySelector(CHIP_BAR);
  if (!chipBar) return DEFAULT_TOP_OFFSET;
  return Math.max(chipBar.getBoundingClientRect().bottom + 8, 64);
}

function buildHost(topOffset) {
  const el = document.createElement('div');
  el.id = HOST_ID;
  const shadow = el.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `${filterPanelStyles}\n${HOST_STYLES}`;
  shadow.appendChild(style);

  const button = document.createElement('button');
  button.className = 'ytf-toggle';
  button.style.top = `${topOffset}px`;
  button.textContent = 'Filtros';
  shadow.appendChild(button);

  getInstalledAt().then((installedAt) => {
    if (Date.now() - installedAt >= NEW_BADGE_DURATION_MS) return;
    const badge = document.createElement('span');
    badge.className = 'ytf-new-badge';
    badge.textContent = 'NEW';
    button.appendChild(badge);
  });

  const panelWrapper = document.createElement('div');
  panelWrapper.className = 'ytf-panel-wrapper';
  panelWrapper.style.top = `${topOffset + 36}px`;
  const panelContainer = document.createElement('div');
  panelContainer.className = 'ytf-panel';
  panelWrapper.appendChild(panelContainer);
  shadow.appendChild(panelWrapper);

  button.addEventListener('click', () => panelWrapper.classList.toggle('open'));

  mountFilterPanel(panelContainer);
  return el;
}

export function injectFilterButton() {
  if (host) return;
  host = buildHost(computeTopOffset());
  document.body.appendChild(host);
}

export function removeFilterButton() {
  host?.remove();
  host = null;
}
