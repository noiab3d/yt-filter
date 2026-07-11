import { VIDEO_GRID_CONTAINER, VIDEO_ITEM } from './selectors.js';
import { extractVideoData } from './extractors.js';
import { shouldHide } from './filters.js';
import { getFilters, setFilters, onFiltersChanged } from '../shared/storage.js';

let currentFilters = null;

function applyFilter(videoEl) {
  const videoData = extractVideoData(videoEl);
  if (!videoData) return; // Mix, anúncio, ou outro tipo de cartão — nunca mexer.

  const hide = shouldHide(videoData, currentFilters);
  videoEl.style.display = hide ? 'none' : '';
}

function handleAddedNode(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (node.matches(VIDEO_ITEM)) applyFilter(node);
  node.querySelectorAll(VIDEO_ITEM).forEach(applyFilter);
}

function watchGrid(grid) {
  grid.querySelectorAll(VIDEO_ITEM).forEach(applyFilter);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(handleAddedNode);
    }
  });

  observer.observe(grid, { childList: true, subtree: true });
}

function waitForGrid() {
  const existingGrid = document.querySelector(VIDEO_GRID_CONTAINER);
  if (existingGrid) {
    watchGrid(existingGrid);
    return;
  }

  console.log('[yt-filter] Grid ainda não está no DOM, a vigiar...');
  const bodyObserver = new MutationObserver(() => {
    const grid = document.querySelector(VIDEO_GRID_CONTAINER);
    if (grid) {
      bodyObserver.disconnect();
      watchGrid(grid);
    }
  });
  bodyObserver.observe(document.body, { childList: true, subtree: true });
}

// TEMPORÁRIO — só para testar filtros manualmente na consola normal da página
// antes de existir popup/options (Sessão 5). Remover quando a UI real estiver pronta.
function exposeDebugBridge() {
  if (typeof exportFunction !== 'function' || typeof cloneInto !== 'function') return;

  window.wrappedJSObject.ytFilterDebugSetFilters = exportFunction((filters) => {
    setFilters(filters);
  }, window);

  window.wrappedJSObject.ytFilterDebugGetFilters = exportFunction(() => {
    return getFilters().then((filters) => cloneInto(filters, window));
  }, window);

  console.log('[yt-filter] Debug: usa ytFilterDebugSetFilters({...}) e ytFilterDebugGetFilters() nesta consola.');
}

// Carrega os filtros antes de começar a vigiar, para nunca decidir esconder/mostrar
// com currentFilters ainda por definir.
export async function start() {
  currentFilters = await getFilters();

  onFiltersChanged((newFilters) => {
    currentFilters = newFilters;
    document.querySelectorAll(VIDEO_ITEM).forEach(applyFilter);
  });

  waitForGrid();
  exposeDebugBridge();
}
