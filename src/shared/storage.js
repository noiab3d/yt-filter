import browser from 'webextension-polyfill';
import { DEFAULT_FILTERS } from './defaults.js';

const FILTERS_KEY = 'filters';

export async function getFilters() {
  const stored = await browser.storage.local.get(FILTERS_KEY);
  return stored[FILTERS_KEY] ?? DEFAULT_FILTERS;
}

export async function setFilters(filters) {
  await browser.storage.local.set({ [FILTERS_KEY]: filters });
}

// callback(newFilters) é chamado sempre que outro contexto (popup/options) muda os filtros.
export function onFiltersChanged(callback) {
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[FILTERS_KEY]) {
      callback(changes[FILTERS_KEY].newValue);
    }
  });
}
