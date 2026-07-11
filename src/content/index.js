import { start, stop } from './observer.js';
import { injectFilterButton, removeFilterButton } from './inPagePanel.js';

const HOMEPAGE_PATH = '/';

let active = false;

function isHomepage() {
  return location.pathname === HOMEPAGE_PATH;
}

function activate() {
  if (active) return;
  active = true;
  start();
  injectFilterButton();
}

function deactivate() {
  if (!active) return;
  active = false;
  stop();
  removeFilterButton();
}

function handleNavigation() {
  if (isHomepage()) {
    activate();
  } else {
    deactivate();
  }
}

handleNavigation();
// O YouTube é uma SPA — navegar para um vídeo não recarrega a página nem reinjeta
// o content script. Este evento é disparado pelo próprio YouTube no fim de cada
// navegação client-side, e é como sabemos entrar/sair da homepage.
document.addEventListener('yt-navigate-finish', handleNavigation);
