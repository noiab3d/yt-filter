import {
  VIDEO_LINK,
  VIDEO_TITLE_HEADING,
  VIDEO_DURATION_BADGE,
  VIDEO_METADATA_ROW,
  VIDEO_METADATA_TEXT,
  VIDEO_METADATA_DELIMITER,
  SHORTS_LOCKUP,
  SHORTS_LINK,
  SHORTS_TITLE_HEADING,
  SHORTS_VIEWS_TEXT,
  COLLECTION_THUMBNAIL,
  LIVE_BADGE,
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

// PT e EN mapeiam para as mesmas chaves canónicas acima — evita duplicar
// MS_PER_UNIT por idioma. Multiplicadores de views também são partilhados
// (ver parseViewsText): "mil"/"mi" (PT) e "k"/"m" (EN) nunca colidem porque
// "mil" é sempre tentado antes de "mi" no regex.
const VIEWS_MULTIPLIERS = { mil: 1_000, mi: 1_000_000, k: 1_000, m: 1_000_000 };

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

// Formatos observados (2026-07-11, com sessão real, PT e EN): "500 visualizações",
// "608 mil visualizações", "2,3 mi de visualizações" / "36 views", "1.4K views",
// "33M views". O número em si já serve os dois idiomas ("," e "." são ambos aceites
// como separador decimal) — só o sufixo multiplicador muda, por isso não precisa de
// branch por idioma.
export function parseViewsText(text) {
  const normalized = text.replace(/ /g, ' ').trim();
  const match = normalized.match(/^(\d+(?:[.,]\d+)?)\s*(mil|mi|k|m)?/i);
  if (!match) return null;

  const value = parseFloat(match[1].replace(',', '.'));
  const multiplier = match[2]?.toLowerCase();
  const factor = multiplier ? VIEWS_MULTIPLIERS[multiplier] : 1;
  return Math.round(value * factor);
}

// "mês" pluraliza de forma irregular ("meses", não "mêss"/"mess") — todas as outras
// unidades (PT e EN) seguem o padrão regular (+s). Cada chave canónica mapeia para
// os padrões de todos os idiomas suportados. Cada padrão testa a palavra da unidade
// já isolada do número, depois de extraída pelo regex principal.
const UNIT_PATTERNS = {
  segundo: [/^segundos?$/, /^seconds?$/],
  minuto: [/^minutos?$/, /^minutes?$/],
  hora: [/^horas?$/, /^hours?$/],
  dia: [/^dias?$/, /^days?$/],
  semana: [/^semanas?$/, /^weeks?$/],
  mês: [/^m[êe]s(es)?$/, /^months?$/],
  ano: [/^anos?$/, /^years?$/],
};

// Dois formatos observados (2026-07-11, com sessão real): PT "há N unidade" ("há 1
// ano", "há 3 dias") e EN "N unit ago" ("3 days ago", "9 months ago"). Nenhum dos
// dois regexes está ancorado ao início — vídeos que foram lives (já terminadas) têm
// um prefixo antes ("Transmitido há 1 mês" / "Streamed 1 month ago", confirmado nos
// dados reais); ancorar ^ fazia este caso falhar silenciosamente, em PT também, não
// só em EN. Tentamos os dois formatos sempre, sem depender de deteção de idioma — é
// o texto real que decide, não parte se o idioma da UI não bater certo com o idioma
// em que o YouTube decidiu mostrar esta página em concreto.
const RELATIVE_DATE_REGEXES = [
  /\bhá\s+(\d+)\s+(\S+)/, // PT
  /(\d+)\s+(\S+)\s+ago\b/, // EN
];

export function parseRelativeDateText(text, now = new Date()) {
  const normalized = text.trim().toLowerCase();

  for (const regex of RELATIVE_DATE_REGEXES) {
    const match = normalized.match(regex);
    if (!match) continue;

    const amount = Number(match[1]);
    const unitText = match[2];
    const unit = Object.keys(UNIT_PATTERNS).find((key) => UNIT_PATTERNS[key].some((pattern) => pattern.test(unitText)));
    if (unit) return new Date(now.getTime() - amount * MS_PER_UNIT[unit]);
  }

  return null;
}

// Mixes/playlists e outros cartões não-vídeo não têm esta linha (não há um único
// "views + idade" para uma coleção de vídeos) — usado por extractVideoData() para
// distinguir um vídeo normal de outro tipo de cartão, sem avisar.
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
  if (!texts) return null;
  return parseViewsText(texts[0]);
}

export function getPublishedAt(videoEl) {
  const texts = getMetadataTexts(videoEl);
  if (!texts || texts.length < 2) return null;
  return parseRelativeDateText(texts[1]);
}

export function isShort(videoEl) {
  return videoEl.querySelector(SHORTS_LOCKUP) !== null;
}

// Os Shorts usam um componente completamente diferente do vídeo normal — sem badge de
// duração nem linha de idade, só título, link /shorts/ID e views.
function extractShortData(videoEl) {
  const link = videoEl.querySelector(SHORTS_LINK);
  const id = link?.getAttribute('href')?.match(/\/shorts\/([^/?]+)/)?.[1] ?? null;

  const titleEl = videoEl.querySelector(SHORTS_TITLE_HEADING);
  const title = titleEl ? (titleEl.getAttribute('title')?.trim() ?? titleEl.textContent.trim()) : null;

  const viewsEl = videoEl.querySelector(SHORTS_VIEWS_TEXT);
  const views = viewsEl ? parseViewsText(viewsEl.textContent) : null;

  return {
    id,
    title,
    durationSeconds: null, // não mostrado na prateleira de Shorts da homepage
    views,
    publishedAt: null, // idem
    isShort: true,
    isCollection: false,
    isLive: false,
  };
}

export function isCollection(videoEl) {
  return videoEl.querySelector(COLLECTION_THUMBNAIL) !== null;
}

export function isLive(videoEl) {
  return videoEl.querySelector(LIVE_BADGE) !== null;
}

// Mixes e playlists partilham o mesmo link/título do vídeo normal (yt-lockup-view-model),
// só o thumbnail é que é o componente "collection" — não mostram duração nem views/idade
// fiáveis (mostram nº de episódios, "Atualizada hoje", lista de artistas, etc.).
function extractCollectionData(videoEl) {
  return {
    id: getVideoId(videoEl),
    title: getTitle(videoEl),
    durationSeconds: null,
    views: null,
    publishedAt: null,
    isShort: false,
    isCollection: true,
    isLive: false,
  };
}

// Lives não têm duração (estão a decorrer) nem uma data relativa fiável (mostram
// "X a ver" em vez de views/idade).
function extractLiveData(videoEl) {
  return {
    id: getVideoId(videoEl),
    title: getTitle(videoEl),
    durationSeconds: null,
    views: null,
    publishedAt: null,
    isShort: false,
    isCollection: false,
    isLive: true,
  };
}

// Devolve null quando o item não parece ser um vídeo, Short, Mix/playlist nem live
// (anúncio ou outro tipo de cartão desconhecido — reconhecido pela ausência da linha
// de views/idade) — o resto do pipeline (filters.js, observer.js) ignora esses itens
// por completo e nunca lhes mexe. A extensão não é um bloqueador de anúncios.
export function extractVideoData(videoEl) {
  if (isShort(videoEl)) return extractShortData(videoEl);
  if (isCollection(videoEl)) return extractCollectionData(videoEl);
  if (isLive(videoEl)) return extractLiveData(videoEl);
  if (!getMetadataTexts(videoEl)) return null;

  return {
    id: getVideoId(videoEl),
    title: getTitle(videoEl),
    durationSeconds: getDurationSeconds(videoEl),
    views: getViews(videoEl),
    publishedAt: getPublishedAt(videoEl),
    isShort: false,
    isCollection: false,
    isLive: false,
  };
}
