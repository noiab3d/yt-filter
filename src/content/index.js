import browser from 'webextension-polyfill';
import { start, stop } from './observer.js';
import { injectFilterButton, removeFilterButton } from './inPagePanel.js';

const HOMEPAGE_PATH = '/';
const ORPHAN_CHECK_INTERVAL_MS = 3000;

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

// O Firefox remove sozinho instâncias órfãs do content script quando a
// extensão recarrega (ver "Lições aprendidas" #2 no CLAUDE.md) — o Chrome
// não. Sem isto, recarregar a extensão no Chrome deixava instâncias antigas
// a correr em abas já abertas do YouTube (botão duplicado, chamadas a
// browser.storage a rebentar porque o contexto já é inválido).
// browser.runtime.id fica undefined assim que o contexto é invalidado.
const orphanCheck = setInterval(() => {
  if (browser.runtime?.id) return;
  clearInterval(orphanCheck);
  deactivate();
}, ORPHAN_CHECK_INTERVAL_MS);
