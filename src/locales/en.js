// Tradução inglesa da UI — mesmo shape exato de pt.js, ver src/locales/index.js
// para a deteção automática de idioma (navigator.language).
export const strings = {
  panel: {
    resetAll: 'Disable all filters',
    age: {
      title: 'Video age',
      hint: 'Approximate — YouTube only shows relative dates ("3 days ago").',
      presets: {
        lessThan1Day: '< 1 day',
        lessThan5Days: '< 5 days',
        moreThan10Days: '> 10 days',
        custom: 'Custom',
      },
      comparison: {
        before: 'Before',
        after: 'After',
      },
    },
    duration: {
      title: 'Video duration',
      minutesLabel: 'Minutes',
      minutesPlaceholder: 'e.g. 15',
      lessThan: '−',
      moreThan: '+',
    },
    views: {
      title: 'Views',
      minAriaLabel: 'Minimum views',
      maxAriaLabel: 'Maximum views',
    },
    hideShorts: 'Hide Shorts',
    other: {
      title: 'Other',
      hideCollections: 'Hide Mixes and playlists',
      hideLive: 'Hide live streams',
    },
  },
  calendar: {
    weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    months: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ],
  },
  inPageButton: {
    toggle: 'Filters',
    newBadge: 'NEW',
    dragHandleTitle: 'Drag to move',
  },
};
