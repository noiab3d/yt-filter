// Todo o texto visível ao utilizador vive aqui — única fonte da UI em
// português (PT-PT). Para traduzir a extensão para outro idioma, duplicar
// este ficheiro (ex. en.js) mantendo exatamente o mesmo shape e trocar só
// os valores; nada no resto do código depende de PT-PT diretamente.
export const strings = {
  panel: {
    resetAll: 'Desativar todos os filtros',
    age: {
      title: 'Idade do vídeo',
      hint: 'Aproximado — o YouTube só indica datas relativas ("há 3 dias").',
      presets: {
        lessThan1Day: '< 1 dia',
        lessThan5Days: '< 5 dias',
        moreThan10Days: '> 10 dias',
        custom: 'Personalizado',
      },
      comparison: {
        before: 'Antes de',
        after: 'Depois de',
      },
    },
    duration: {
      title: 'Duração do vídeo',
      minutesLabel: 'Minutos',
      minutesPlaceholder: 'ex. 15',
      lessThan: '−',
      moreThan: '+',
    },
    views: {
      title: 'Views',
      minAriaLabel: 'Views mínimas',
      maxAriaLabel: 'Views máximas',
    },
    hideShorts: 'Esconder Shorts',
    other: {
      title: 'Outros',
      hideCollections: 'Esconder Mixes e playlists',
      hideLive: 'Esconder lives',
    },
  },
  calendar: {
    weekdays: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
    months: [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ],
  },
  inPageButton: {
    toggle: 'Filtros',
    newBadge: 'NEW',
    dragHandleTitle: 'Arrastar para mover',
  },
};
