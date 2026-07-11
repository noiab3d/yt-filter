import { VIDEO_GRID_CONTAINER, VIDEO_ITEM, SHORTS_SHELF, SHORTS_LOCKUP } from './selectors.js';
import { extractVideoData } from './extractors.js';
import { shouldHide } from './filters.js';
import { getFilters, onFiltersChanged } from '../shared/storage.js';
import { startAutoScroll, stopAutoScroll, scheduleNudgeCheck } from './autoScroll.js';

let currentFilters = null;
let gridObserver = null;
let bodyObserver = null;
let unsubscribeFilters = null;

// O conteúdo de um vídeo já renderizado não muda — extrair os dados (várias
// consultas ao DOM) só é preciso uma vez por item, não a cada mudança de filtro.
const videoDataCache = new WeakMap();

// Nunca guarda `null` em cache: o YouTube por vezes ainda não acabou de
// renderizar o badge de Mix/Live ou a linha de metadata no instante exato em
// que o cartão aparece no DOM (assíncrono, separado da inserção do próprio
// elemento). Se guardássemos esse `null` transitório, o vídeo ficava preso
// visível para sempre — o código nunca mais tentava reextrair. Sem cache no
// `null`, a próxima chamada (nova mutação do grid, ou mudança de filtro que
// corre applyAllFilters) tenta outra vez, e por essa altura o DOM já assentou.
function getOrExtractVideoData(videoEl) {
  const cached = videoDataCache.get(videoEl);
  if (cached) return cached;
  const videoData = extractVideoData(videoEl);
  if (videoData) videoDataCache.set(videoEl, videoData);
  return videoData;
}

const RETRY_DELAY_MS = 1000;
// Uma tentativa extra por elemento chega — se ainda falhar depois de 1s, é
// mesmo um anúncio ou outro cartão desconhecido (extractVideoData() devolve
// null de propósito para esses, não é um erro de timing).
const retriedElements = new WeakSet();

function applyFilter(videoEl) {
  const videoData = getOrExtractVideoData(videoEl);
  if (!videoData) {
    if (!retriedElements.has(videoEl)) {
      retriedElements.add(videoEl);
      setTimeout(() => applyFilter(videoEl), RETRY_DELAY_MS);
    }
    return; // Mix/live ainda a renderizar, anúncio, ou outro cartão desconhecido — nunca mexer.
  }

  const hide = shouldHide(videoData, currentFilters);
  videoEl.style.display = hide ? 'none' : '';
}

// A prateleira de Shorts tem o seu próprio título/cabeçalho ("Shorts") fora dos
// itens em si — escondê-los um a um deixava o título visível sozinho. Aqui
// escondemos a prateleira inteira quando é mesmo uma prateleira de Shorts.
function applyShelfFilter(shelfEl) {
  if (!shelfEl.querySelector(SHORTS_LOCKUP)) return; // não é uma prateleira de Shorts, não mexer.
  const hide = Boolean(currentFilters?.hideShorts?.enabled);
  shelfEl.style.display = hide ? 'none' : '';
}

function handleAddedNode(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  if (node.matches(VIDEO_ITEM)) applyFilter(node);
  node.querySelectorAll(VIDEO_ITEM).forEach(applyFilter);

  if (node.matches(SHORTS_SHELF)) applyShelfFilter(node);
  node.querySelectorAll(SHORTS_SHELF).forEach(applyShelfFilter);
}

// Mudar um filtro esconde/mostra vídeos por toda a grid — em vez de deixar o
// utilizador algures a meio de um resultado potencialmente muito diferente,
// volta sempre ao topo (suave), como "recomeçar a ver" com o novo filtro.
function applyAllFilters() {
  document.querySelectorAll(VIDEO_ITEM).forEach(applyFilter);
  document.querySelectorAll(SHORTS_SHELF).forEach(applyShelfFilter);

  window.scrollTo({ top: 0, behavior: 'smooth' });
  scheduleNudgeCheck();
}

function watchGrid(grid) {
  grid.querySelectorAll(VIDEO_ITEM).forEach(applyFilter);
  grid.querySelectorAll(SHORTS_SHELF).forEach(applyShelfFilter);

  gridObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach(handleAddedNode);
    }
    scheduleNudgeCheck();
  });

  gridObserver.observe(grid, { childList: true, subtree: true });
}

function waitForGrid() {
  const existingGrid = document.querySelector(VIDEO_GRID_CONTAINER);
  if (existingGrid) {
    watchGrid(existingGrid);
    return;
  }

  console.log('[yt-filter] Grid ainda não está no DOM, a vigiar...');
  bodyObserver = new MutationObserver(() => {
    const grid = document.querySelector(VIDEO_GRID_CONTAINER);
    if (grid) {
      bodyObserver.disconnect();
      bodyObserver = null;
      watchGrid(grid);
    }
  });
  bodyObserver.observe(document.body, { childList: true, subtree: true });
}

// Carrega os filtros antes de começar a vigiar, para nunca decidir esconder/mostrar
// com currentFilters ainda por definir.
export async function start() {
  currentFilters = await getFilters();

  unsubscribeFilters = onFiltersChanged((newFilters) => {
    currentFilters = newFilters;
    applyAllFilters();
  });

  startAutoScroll();
  waitForGrid();
}

// Desliga tudo (observers, subscrição de filtros) e repõe os vídeos visíveis.
// Chamado ao navegar para fora da homepage ou quando a extensão é recarregada,
// para nunca deixar uma instância antiga a correr ao lado de uma nova.
export function stop() {
  stopAutoScroll();
  gridObserver?.disconnect();
  gridObserver = null;
  bodyObserver?.disconnect();
  bodyObserver = null;
  unsubscribeFilters?.();
  unsubscribeFilters = null;
  currentFilters = null;

  document.querySelectorAll(VIDEO_ITEM).forEach((el) => {
    el.style.display = '';
  });
  document.querySelectorAll(SHORTS_SHELF).forEach((el) => {
    el.style.display = '';
  });
}
