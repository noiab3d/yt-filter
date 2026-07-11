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

// Um vídeo normal (não Short/Mix/live) só está "completo" quando tem views E
// idade — se a linha de metadata existe mas ainda não tinha o texto final no
// instante da leitura (o YouTube preenche isto por partes, não tudo de uma
// vez), extractVideoData() não devolve null (tem id/título), só campos a
// null lá dentro. Isso passava despercebido ao check anterior de "não
// cachear null" — o objeto inteiro não é null, só um campo dentro dele.
// Short/Mix/live têm estes campos a null por design (ver extractShortData/
// extractCollectionData/extractLiveData), por isso não se aplica a eles.
function isDataComplete(videoData) {
  if (videoData.isShort || videoData.isCollection || videoData.isLive) return true;
  return videoData.views != null && videoData.publishedAt != null;
}

// Nunca guarda dados incompletos em cache (ver isDataComplete): o YouTube por
// vezes ainda não acabou de preencher o badge de Mix/Live ou o texto de
// views/idade no instante exato em que o cartão aparece no DOM (assíncrono,
// separado da inserção do próprio elemento — e por vezes chega via mudança
// de texto num <span> já existente, não um elemento novo). Se guardássemos
// isso em cache, o vídeo ficava preso visível para sempre — o código nunca
// mais tentava reextrair. Sem cache no incompleto, a próxima chamada (nova
// mutação na subtree do grid, ou mudança de filtro que corre
// applyAllFilters) tenta outra vez, e por essa altura o DOM já assentou.
function getOrExtractVideoData(videoEl) {
  const cached = videoDataCache.get(videoEl);
  if (cached) return cached;
  const videoData = extractVideoData(videoEl);
  if (videoData && isDataComplete(videoData)) videoDataCache.set(videoEl, videoData);
  return videoData;
}

function applyFilter(videoEl) {
  const videoData = getOrExtractVideoData(videoEl);
  if (!videoData) return; // Mix/live ainda a renderizar, anúncio, ou outro cartão desconhecido — nunca mexer.

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

// O YouTube preenche o conteúdo de um cartão (badge de Mix/Live, texto de
// views/idade) de forma assíncrona e por partes — às vezes via um elemento
// novo (apanhado por handleAddedNode acima), às vezes só mudando o texto de
// um <span> que já existia (isso é uma mutação `characterData`, não dispara
// handleAddedNode, que só reage a nós ELEMENT). Reage-se a QUALQUER mutação
// perto de um cartão já existente, procurando o ancestral VIDEO_ITEM mais
// próximo do alvo da mutação e reaplicando o filtro — barato, porque
// getOrExtractVideoData() só refaz trabalho a sério enquanto os dados desse
// cartão continuarem incompletos (ver isDataComplete).
function reapplyNearestItem(node) {
  const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  const parentItem = el?.closest?.(VIDEO_ITEM);
  if (parentItem) applyFilter(parentItem);
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
      reapplyNearestItem(mutation.target);
    }
    scheduleNudgeCheck();
  });

  gridObserver.observe(grid, { childList: true, subtree: true, characterData: true });
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
