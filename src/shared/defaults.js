// Shape dos filtros e valores por default. Tudo desligado — a extensão nunca
// esconde nada até o utilizador ativar pelo menos um filtro explicitamente.

export const DEFAULT_FILTERS = {
  age: {
    enabled: false,
    mode: 'preset', // 'preset' | 'custom'
    preset: 'lessThan1Day', // 'lessThan1Day' | 'lessThan5Days' | 'moreThan10Days'
    custom: {
      date: null, // string ISO (ex. "2026-07-01")
      comparison: 'before', // 'before' | 'after'
    },
  },
  duration: {
    enabled: false,
    mode: 'lessThan', // 'lessThan' | 'moreThan'
    minutes: 5, // predefinido para o filtro já fazer algo assim que é ativado
  },
  views: {
    enabled: false,
    minViews: null, // null = sem mínimo (handle no "0")
    maxViews: null, // null = sem máximo (handle no "10M+")
  },
  hideShorts: {
    enabled: false,
  },
  hideCollections: {
    enabled: false, // Mixes e playlists
  },
  hideLive: {
    enabled: false,
  },
};
