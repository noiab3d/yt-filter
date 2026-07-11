import { VIDEO_GRID_CONTAINER } from './selectors.js';

// Sessão 1: só confirmar que o content script é injetado e consegue encontrar
// a grid de recomendações. Lógica de filtragem real vem nas sessões seguintes.

function logGridFound(grid) {
  console.log('[yt-filter] Grid de recomendações encontrada:', grid);
}

const existingGrid = document.querySelector(VIDEO_GRID_CONTAINER);
if (existingGrid) {
  logGridFound(existingGrid);
} else {
  console.log('[yt-filter] Grid ainda não está no DOM, a vigiar...');

  const observer = new MutationObserver(() => {
    const grid = document.querySelector(VIDEO_GRID_CONTAINER);
    if (grid) {
      logGridFound(grid);
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
