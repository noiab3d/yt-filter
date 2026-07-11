// Abre a homepage real do YouTube e verifica se cada seletor em
// src/content/selectors.js ainda encontra pelo menos um elemento — a forma
// mais rápida de saber se o YouTube mudou alguma coisa que nos parte.
//
// Uso:
//   node tests/selector-check.js              # usa a sessão guardada em tests/.yt-session/
//   node tests/selector-check.js --headed      # abre uma janela visível (preciso para o login inicial)
//
// PRECISA DE SESSÃO INICIADA. Confirmado (2026-07-11): a homepage do
// YouTube não mostra nenhum vídeo a uma sessão anónima sem histórico —
// mostra "Pesquise algo para começar", com ou sem aceitar cookies. Isto
// acontece a qualquer browser anónimo, não é deteção de automação. Por
// isso este script usa um perfil persistente local
// (`tests/.yt-session/`, gitignored, nunca vai para o repo — mesma lógica
// do `yt-filter-dev/` que já é usado para testar a extensão manualmente):
//
//   1. Da primeira vez, corre `node tests/selector-check.js --headed` e
//      inicia sessão manualmente na janela do Chromium que abre.
//   2. Fecha a janela — a sessão fica guardada. Os runs seguintes (com ou
//      sem --headed) reutilizam-na automaticamente.
//
// Isto também significa que este script, por agora, só corre localmente —
// não dá para automatizar num runner de CI sem guardar uma sessão real
// algures (ver CLAUDE.md, item pendente da Sessão 6 sobre o GitHub Action
// semanal).

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as selectors from '../src/content/selectors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = path.join(__dirname, '.yt-session');
const YOUTUBE_HOMEPAGE = 'https://www.youtube.com/';
const HEADED = process.argv.includes('--headed');

// Fazem parte do cartão de vídeo normal e da grid em si — devem estar
// presentes em qualquer carga da homepage com sessão iniciada. Se algum
// destes faltar, é quase certo que o YouTube mudou o DOM.
const REQUIRED_SELECTORS = [
  'VIDEO_GRID_CONTAINER',
  'VIDEO_ITEM',
  'VIDEO_LINK',
  'VIDEO_TITLE_HEADING',
  'VIDEO_DURATION_BADGE',
  'VIDEO_METADATA_ROW',
  'VIDEO_METADATA_TEXT',
  'VIDEO_METADATA_DELIMITER',
  'GRID_HEADER',
  'CHIP_BAR',
];

// Só aparecem se esse tipo de cartão calhar de estar no feed nesta carga da
// página (ex. só há uma live se o algoritmo recomendar uma) — a ausência
// não significa necessariamente que o seletor partiu, por isso só avisa,
// nunca falha o script.
const OPPORTUNISTIC_SELECTORS = [
  'SHORTS_SHELF',
  'SHORTS_LOCKUP',
  'SHORTS_LINK',
  'SHORTS_TITLE_HEADING',
  'SHORTS_VIEWS_TEXT',
  'COLLECTION_THUMBNAIL',
  'LIVE_BADGE',
];

async function dismissConsentIfPresent(page) {
  const patterns = ['Rejeitar tudo', 'Reject all', 'Recusar tudo', 'Aceitar tudo', 'Accept all'];
  await page.evaluate((texts) => {
    const button = Array.from(document.querySelectorAll('button')).find((b) =>
      texts.some((t) => b.textContent.includes(t)),
    );
    button?.click();
  }, patterns);
}

async function scrollToLoadMore(page, times) {
  for (let i = 0; i < times; i += 1) {
    await page.mouse.wheel(0, 2400);
    await page.waitForTimeout(800);
  }
}

async function countMatches(page, selector) {
  return page.locator(selector).count();
}

async function run() {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: !HEADED,
    viewport: { width: 1366, height: 900 },
  });
  const page = context.pages()[0] ?? (await context.newPage());

  console.log(`Abrindo ${YOUTUBE_HOMEPAGE}...`);
  await page.goto(YOUTUBE_HOMEPAGE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await dismissConsentIfPresent(page);
  await page.waitForSelector(selectors.VIDEO_GRID_CONTAINER, { timeout: 15000 }).catch(() => {});
  await scrollToLoadMore(page, 4);

  const results = [];
  for (const [name, selector] of Object.entries(selectors)) {
    const count = await countMatches(page, selector).catch(() => 0);
    results.push({ name, selector, count });
  }

  const loggedIn = await page
    .locator('button#avatar-btn')
    .count()
    .catch(() => 0);

  await context.close();

  if (!loggedIn) {
    console.log(
      '\nNão parece haver sessão iniciada (tests/.yt-session/ vazio ou sessão expirada).\n' +
        'Corre `node tests/selector-check.js --headed` e inicia sessão manualmente na janela\n' +
        'que abre — a sessão fica guardada para os próximos runs. Sem sessão, o YouTube não\n' +
        'mostra vídeos na homepage e os resultados abaixo não são fiáveis.\n',
    );
  }

  let hasFailure = false;
  console.log('Resultado:\n');
  for (const { name, selector, count } of results) {
    const found = count > 0;
    const isRequired = REQUIRED_SELECTORS.includes(name);
    const isOpportunistic = OPPORTUNISTIC_SELECTORS.includes(name);

    let status;
    if (found) {
      status = `OK (${count})`;
    } else if (isRequired) {
      status = 'EM FALTA — seletor essencial não encontrou nada';
      hasFailure = true;
    } else if (isOpportunistic) {
      status = 'não apareceu nesta carga (pode ser normal)';
    } else {
      status = 'EM FALTA';
      hasFailure = true;
    }

    console.log(`  ${found ? '✅' : '⚠️ '} ${name.padEnd(24)} ${status}`);
    if (!found) console.log(`     seletor: ${selector}`);
  }

  console.log('');
  if (hasFailure && loggedIn) {
    console.log('Pelo menos um seletor essencial não encontrou nada — o YouTube pode ter mudado o DOM. Ver src/content/selectors.js.');
    process.exitCode = 1;
  } else if (hasFailure) {
    process.exitCode = 1;
  } else {
    console.log('Todos os seletores essenciais continuam a encontrar elementos.');
  }
}

run().catch((error) => {
  console.error('selector-check falhou a correr:', error);
  process.exitCode = 1;
});
