// Seletores DOM do YouTube centralizados aqui — ver skill dom-scraping-resilience.
// Confirmados a partir de HTML real da homepage (ytd-rich-item-renderer.html, 2026-07-11).
// Nenhum outro ficheiro deve ter seletores hardcoded.

// Confirmado diretamente numa captura completa da homepage (2026-07-11).
export const VIDEO_GRID_CONTAINER = 'ytd-rich-grid-renderer';

export const VIDEO_ITEM = 'ytd-rich-item-renderer';

// O link do vídeo aparece duas vezes (imagem e título) — qualquer um serve para extrair o ID.
export const VIDEO_LINK = 'a.ytLockupViewModelContentImage, a.ytLockupMetadataViewModelTitle';

export const VIDEO_TITLE_HEADING = 'h3.ytLockupMetadataViewModelHeadingReset';

// A mesma classe é usada para vários tipos de badge no thumbnail (duração, "AO VIVO", etc.).
// extractors.js valida o conteúdo com regex antes de assumir que é uma duração.
export const VIDEO_DURATION_BADGE = 'div.ytBadgeShapeText';

// Cada "row" de metadata pode ser o nome do canal ou as views + idade relativa.
// extractors.js identifica a row certa pela presença do span delimitador (ver abaixo).
export const VIDEO_METADATA_ROW = 'div.ytContentMetadataViewModelMetadataRow';
export const VIDEO_METADATA_TEXT = 'span.ytContentMetadataViewModelMetadataText';
export const VIDEO_METADATA_DELIMITER = 'span.ytContentMetadataViewModelDelimiter';

// Confirmado com HTML real de uma prateleira de Shorts (2026-07-11). Os Shorts usam um
// componente completamente diferente do vídeo normal (ytm-shorts-lockup-view-model),
// sem badge de duração nem linha de idade — só título, link /shorts/ID e views.
export const SHORTS_SHELF = 'ytd-rich-shelf-renderer';
export const SHORTS_LOCKUP = 'ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2';
export const SHORTS_LINK =
  'a.shortsLockupViewModelHostOutsideMetadataEndpoint, a.shortsLockupViewModelHostEndpoint';
export const SHORTS_TITLE_HEADING = 'h3.shortsLockupViewModelHostMetadataTitle';
export const SHORTS_VIEWS_TEXT = 'div.shortsLockupViewModelHostMetadataSubhead span';

// Confirmado com HTML real de um Mix e de uma Playlist (2026-07-13). Ambos usam o
// mesmo componente de thumbnail em pilha, distinto do vídeo normal — não distinguimos
// Mix de Playlist propositadamente, o pedido é escondê-los como um grupo só.
export const COLLECTION_THUMBNAIL = 'yt-collection-thumbnail-view-model';

// Confirmado com HTML real de uma live (2026-07-13) — o badge tem uma classe própria
// (ytBadgeShapeThumbnailLive), distinta do badge de duração normal
// (ytBadgeShapeThumbnailDefault), por isso não precisamos de comparar o texto "AO VIVO".
export const LIVE_BADGE = 'badge-shape.ytBadgeShapeThumbnailLive';

// Confirmado numa captura completa da homepage (2026-07-11) — usado para ancorar o
// botão de filtros injetado na página (Sessão 5). Se não for encontrado, o botão
// simplesmente não é injetado (logamos aviso) em vez de arriscar partir a página.
export const GRID_HEADER = 'ytd-rich-grid-renderer #header';
export const CHIP_BAR = 'ytd-feed-filter-chip-bar-renderer';
