// Shape dos filtros e valores por default. Tudo desligado — a extensão nunca
// esconde nada até o utilizador ativar pelo menos um filtro explicitamente.

export const DEFAULT_FILTERS = {
  age: {
    enabled: false,
    mode: 'preset', // 'preset' | 'custom'
    preset: 'lessThan1Day', // 'lessThan1Day' | 'lessThan5Days' | 'moreThan10Days'
    custom: {
      date: null, // string ISO (ex. "2026-07-01")
      comparison: 'before', // 'before' | 'on' | 'after'
    },
  },
  duration: {
    enabled: false,
    maxMinutes: null,
    minMinutes: null,
  },
  views: {
    enabled: false,
    minViews: null,
  },
  hideShorts: {
    enabled: false,
  },
};
