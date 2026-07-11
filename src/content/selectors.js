// Seletores DOM do YouTube centralizados aqui — ver skill dom-scraping-resilience.
// Confirmados a partir de HTML real da homepage (ytd-rich-item-renderer.html, 2026-07-11).
// Nenhum outro ficheiro deve ter seletores hardcoded.

// Confirmado indiretamente: o item de vídeo tem a classe "style-scope ytd-rich-grid-renderer"
// (convenção do Polymer, em que o filho recebe "style-scope <tag-do-pai>"), o que confirma
// que o container é este custom element — não vimos o HTML do container em si, só do item.
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

// TODO: confirmar seletor/estrutura de vídeos Shorts com HTML real (ainda não recebido —
// só temos um exemplo de vídeo normal). Não vamos adivinhar um seletor que pode acabar
// por esconder vídeos normais por engano — ver isShort() em extractors.js.
export const SHORTS_INDICATOR = null;
