import browser from 'webextension-polyfill';
import { DEFAULT_FILTERS } from './defaults.js';

const FILTERS_KEY = 'filters';

// Preenche com os defaults qualquer campo em falta no valor guardado (ex. dados
// parciais de uma versão anterior, ou gravados manualmente) — sem isto, um shape
// incompleto guardado em storage rebenta o resto do código sem avisar.
function withDefaults(defaults, stored) {
  if (typeof defaults !== 'object' || defaults === null) {
    return stored ?? defaults;
  }
  const result = {};
  for (const key of Object.keys(defaults)) {
    result[key] = withDefaults(defaults[key], stored?.[key]);
  }
  return result;
}

export async function getFilters() {
  const stored = await browser.storage.local.get(FILTERS_KEY);
  return withDefaults(DEFAULT_FILTERS, stored[FILTERS_KEY]);
}

export async function setFilters(filters) {
  await browser.storage.local.set({ [FILTERS_KEY]: filters });
}

// callback(newFilters) é chamado sempre que outro contexto (popup/options/painel) muda
// os filtros. Devolve uma função para deixar de ouvir.
export function onFiltersChanged(callback) {
  function listener(changes, area) {
    if (area === 'local' && changes[FILTERS_KEY]) {
      callback(changes[FILTERS_KEY].newValue);
    }
  }

  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

const INSTALLED_AT_KEY = 'installedAt';

// Regista a primeira vez que o content script correu (aproximação razoável da
// instalação, sem precisar de um background script para browser.runtime.onInstalled).
// Usado para mostrar o selo "novo" no botão de filtros durante o primeiro dia.
export async function getInstalledAt() {
  const stored = await browser.storage.local.get(INSTALLED_AT_KEY);
  if (stored[INSTALLED_AT_KEY]) return stored[INSTALLED_AT_KEY];

  const now = Date.now();
  await browser.storage.local.set({ [INSTALLED_AT_KEY]: now });
  return now;
}

const BUTTON_POSITION_KEY = 'buttonPosition';

// Posição do botão in-page depois de o utilizador o arrastar: { side: 'left' | 'right', top }.
// null até à primeira vez que é arrastado — nesse caso usa-se a posição por defeito
// (encostado à direita, por baixo da chip bar).
export async function getButtonPosition() {
  const stored = await browser.storage.local.get(BUTTON_POSITION_KEY);
  return stored[BUTTON_POSITION_KEY] ?? null;
}

export async function setButtonPosition(position) {
  await browser.storage.local.set({ [BUTTON_POSITION_KEY]: position });
}
