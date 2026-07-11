const DAY_MS = 24 * 60 * 60 * 1000;

const AGE_PRESET_MAX_MS = {
  lessThan1Day: 1 * DAY_MS,
  lessThan5Days: 5 * DAY_MS,
};

// Cada passesXFilter devolve true se o vídeo CUMPRE o filtro (deve ficar visível).
// Sem dados extraídos (null), nunca reprova o filtro — mais vale mostrar de mais
// do que esconder por engano por causa de um seletor que partiu.

function passesAgeFilter(videoData, ageFilter) {
  if (!ageFilter?.enabled) return true;
  if (!videoData.publishedAt) return true;

  if (ageFilter.mode === 'custom') {
    if (!ageFilter.custom?.date) return true;
    const target = new Date(ageFilter.custom.date);
    const published = videoData.publishedAt;
    switch (ageFilter.custom.comparison) {
      case 'before':
        return published <= target;
      case 'after':
        return published >= target;
      case 'on':
        return published.toDateString() === target.toDateString();
      default:
        return true;
    }
  }

  const ageMs = Date.now() - videoData.publishedAt.getTime();
  switch (ageFilter.preset) {
    case 'lessThan1Day':
      return ageMs < AGE_PRESET_MAX_MS.lessThan1Day;
    case 'lessThan5Days':
      return ageMs < AGE_PRESET_MAX_MS.lessThan5Days;
    case 'moreThan10Days':
      return ageMs > 10 * DAY_MS;
    default:
      return true;
  }
}

function passesDurationFilter(videoData, durationFilter) {
  if (!durationFilter?.enabled) return true;
  if (videoData.durationSeconds == null) return true;

  const minutes = videoData.durationSeconds / 60;
  if (durationFilter.maxMinutes != null && minutes > durationFilter.maxMinutes) return false;
  if (durationFilter.minMinutes != null && minutes < durationFilter.minMinutes) return false;
  return true;
}

function passesViewsFilter(videoData, viewsFilter) {
  if (!viewsFilter?.enabled) return true;
  if (videoData.views == null) return true;
  if (viewsFilter.minViews == null) return true;
  return videoData.views >= viewsFilter.minViews;
}

function passesShortsFilter(videoData, hideShortsFilter) {
  if (!hideShortsFilter?.enabled) return true;
  return !videoData.isShort;
}

export function shouldHide(videoData, activeFilters) {
  if (!activeFilters) return false;

  const passesAllFilters =
    passesAgeFilter(videoData, activeFilters.age) &&
    passesDurationFilter(videoData, activeFilters.duration) &&
    passesViewsFilter(videoData, activeFilters.views) &&
    passesShortsFilter(videoData, activeFilters.hideShorts);

  return !passesAllFilters;
}
