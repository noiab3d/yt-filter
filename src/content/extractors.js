import {
  VIDEO_LINK,
  VIDEO_TITLE_HEADING,
  VIDEO_DURATION_BADGE,
  VIDEO_METADATA_ROW,
  VIDEO_METADATA_TEXT,
  VIDEO_METADATA_DELIMITER,
  SHORTS_INDICATOR,
} from './selectors.js';

function warn(message, el) {
  console.warn(`[yt-filter] ${message}`, el);
}

const MS_PER_UNIT = {
  segundo: 1000,
  minuto: 60 * 1000,
  hora: 60 * 60 * 1000,
  dia: 24 * 60 * 60 * 1000,
  semana: 7 * 24 * 60 * 60 * 1000,
  mês: 30 * 24 * 60 * 60 * 1000, // aproximado, YouTube não dá granularidade exata
  ano: 365 * 24 * 60 * 60 * 1000, // aproximado, idem
};

export function getVideoId(videoEl) {
  const link = videoEl.querySelector(VIDEO_LINK);
  if (!link) {
    warn('Não encontrou o link do vídeo. Seletor pode ter partido.', videoEl);
    return null;
  }
  const match = link.getAttribute('href')?.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}

export function getTitle(videoEl) {
  const heading = videoEl.querySelector(VIDEO_TITLE_HEADING);
  if (!heading) {
    warn('Não encontrou o título do vídeo. Seletor pode ter partido.', videoEl);
    return null;
  }
  return heading.getAttribute('title')?.trim() ?? heading.textContent.trim();
}

export function parseDurationText(text) {
  const normalized = text.trim();
  if (!/^\d{1,2}(:\d{2}){1,2}$/.test(normalized)) {
    return null;
  }
  return normalized.split(':').reduce((acc, part) => acc * 60 + Number(part), 0);
}

export function getDurationSeconds(videoEl) {
  const badge = videoEl.querySelector(VIDEO_DURATION_BADGE);
  if (!badge) return null; // pode ser Short, direto, ou o seletor partiu — não é erro fatal aqui.
  return parseDurationText(badge.textContent);
}

// Formatos observados: "500 visualizações", "608 mil visualizações", "2,3 mi de visualizações".
export function parseViewsText(text) {
  const normalized = text.replace(/ /g, ' ').trim();
  const match = normalized.match(/^(\d+(?:[.,]\d+)?)\s*(mil|mi)?/i);
  if (!match) return null;

  const value = parseFloat(match[1].replace(',', '.'));
  const multiplier = match[2]?.toLowerCase();
  const factor = multiplier === 'mil' ? 1_000 : multiplier === 'mi' ? 1_000_000 : 1;
  return Math.round(value * factor);
}

// Formatos observados: "há 1 ano", "há 3 dias". Aproximado — o YouTube só dá texto relativo.
export function parseRelativeDateText(text, now = new Date()) {
  const normalized = text.trim().toLowerCase();
  const match = normalized.match(/^há (\d+)\s+(segundo|minuto|hora|dia|semana|mês|mes|ano)s?$/);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2] === 'mes' ? 'mês' : match[2];
  const ms = MS_PER_UNIT[unit];
  if (!ms) return null;

  return new Date(now.getTime() - amount * ms);
}

function getMetadataTexts(videoEl) {
  const rows = videoEl.querySelectorAll(VIDEO_METADATA_ROW);
  for (const row of rows) {
    if (row.querySelector(VIDEO_METADATA_DELIMITER)) {
      return [...row.querySelectorAll(VIDEO_METADATA_TEXT)].map((el) => el.textContent.trim());
    }
  }
  return null;
}

export function getViews(videoEl) {
  const texts = getMetadataTexts(videoEl);
  if (!texts) {
    warn('Não encontrou a linha de views/idade. Seletor pode ter partido.', videoEl);
    return null;
  }
  return parseViewsText(texts[0]);
}

export function getPublishedAt(videoEl) {
  const texts = getMetadataTexts(videoEl);
  if (!texts || texts.length < 2) {
    warn('Não encontrou a linha de views/idade. Seletor pode ter partido.', videoEl);
    return null;
  }
  return parseRelativeDateText(texts[1]);
}

// TODO: sem HTML real de um item Shorts para confirmar a estrutura, nunca assumir que
// um vídeo é Short — mostrar é sempre mais seguro do que esconder por engano.
export function isShort() {
  if (SHORTS_INDICATOR === null) return false;
  return false;
}

export function extractVideoData(videoEl) {
  return {
    id: getVideoId(videoEl),
    title: getTitle(videoEl),
    durationSeconds: getDurationSeconds(videoEl),
    views: getViews(videoEl),
    publishedAt: getPublishedAt(videoEl),
    isShort: isShort(videoEl),
  };
}
