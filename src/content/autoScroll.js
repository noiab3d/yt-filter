// Quando os filtros escondem muitos vídeos, a grid fica fisicamente mais curta e o
// YouTube às vezes não repara que devia carregar mais conteúdo (o gatilho dele
// parece depender de um scroll real, não só do reflow do display:none). Isto dá um
// pequeno "empurrão" de scroll — só quando já estás perto do fundo do conteúdo
// carregado, nunca puxa a tua posição se estiveres a meio da grid.

const NEAR_BOTTOM_PX = 600;
const NUDGE_PX = 80;
const DEBOUNCE_MS = 400;

let debounceTimer = null;
let active = false;

function isNearBottom() {
  return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - NEAR_BOTTOM_PX;
}

function nudge() {
  if (!active || !isNearBottom()) return;
  window.scrollBy(0, NUDGE_PX);
  window.scrollBy(0, -NUDGE_PX);
}

function handleScroll() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(nudge, DEBOUNCE_MS);
}

// Chamado depois de aplicar filtros (ex. novo lote de vídeos escondidos) — o reflow
// pode ter colocado o utilizador perto do fundo sem ele ter scrollado agora mesmo.
export function scheduleNudgeCheck() {
  if (!active) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(nudge, DEBOUNCE_MS);
}

export function startAutoScroll() {
  active = true;
  window.addEventListener('scroll', handleScroll, { passive: true });
}

export function stopAutoScroll() {
  active = false;
  window.removeEventListener('scroll', handleScroll);
  clearTimeout(debounceTimer);
  debounceTimer = null;
}
