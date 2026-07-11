import { strings as pt } from './pt.js';
import { strings as en } from './en.js';

const LOCALES = { pt, en };
const DEFAULT_LOCALE = 'en';

// Deteção automática via navigator.language, sem seletor manual na UI
// (decisão confirmada com o David, 2026-07-11). Se o idioma do browser não
// tiver tradução, cai para PT-PT.
function detectLocale() {
  const lang = navigator.language?.slice(0, 2).toLowerCase();
  return lang in LOCALES ? lang : DEFAULT_LOCALE;
}

export const strings = LOCALES[detectLocale()];
