// Abre a homepage real do YouTube e verifica se cada seletor em
// src/content/selectors.js ainda encontra pelo menos um elemento — a forma
// mais rápida de saber se o YouTube mudou alguma coisa que nos parte.
//
// Uso:
//   node tests/selector-check.js --login       # PRIMEIRO USO: mostra o comando para iniciar sessão
//   node tests/selector-check.js               # corre o check (headless), usa a sessão guardada
//   node tests/selector-check.js --headed      # corre o check com a janela visível (só para debug)
//
// PRECISA DE SESSÃO INICIADA. Confirmado (2026-07-11): a homepage do
// YouTube não mostra nenhum vídeo a uma sessão anónima sem histórico —
// mostra "Pesquise algo para começar", com ou sem aceitar cookies. Isto
// acontece a qualquer browser anónimo, não é deteção de automação.
//
// IMPORTANTE: o login em si NÃO pode ser feito através deste script. O
// Google bloqueia ativamente qualquer sign-in feito a partir de um browser
// controlado por automação (Playwright/CDP) — "This browser or app may not
// be secure" — de propósito, como proteção contra roubo de credenciais.
// Não há forma limpa de contornar isso, e não convém tentar.
//
// Por isso o login tem de ser feito no Chrome normal (sem Playwright a
// controlar nada), apontado para a mesma pasta de perfil que este script
// usa (`tests/.yt-session/`, gitignored, nunca vai para o repo — mesma
// lógica do `yt-filter-dev/` já usado para testar a extensão manualmente):
//
//   1. `node tests/selector-check.js --login` mostra o comando exato a
//      copiar para o terminal (auto-deteta o caminho do Chrome instalado).
//   2. Corre esse comando — abre o Chrome normal, sem automação. Inicia
//      sessão normalmente, depois fecha a janela.
//   3. `node tests/selector-check.js` (headless) reutiliza os cookies
//      guardados nessa pasta — esta parte não precisa de fazer login, só de
//      ler a página já autenticada, por isso não é bloqueada pelo Google.
//
// Isto também significa que este script, por agora, só corre localmente —
// não dá para automatizar num runner de CI sem guardar uma sessão real
// algures (ver CLAUDE.md, item pendente da Sessão 6 sobre o GitHub Action
// semanal).

import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import * as selectors from '../src/content/selectors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFILE_DIR = path.join(__dirname, '.yt-session');
const YOUTUBE_HOMEPAGE = 'https://www.youtube.com/';
const LOGIN = process.argv.includes('--login');
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

// Playwright descarrega o seu próprio Chromium (para o headless), com um
// número de build que muda a cada atualização — procurar em vez de assumir
// a versão. Serve como último recurso: correr este binário diretamente
// (sem passar pelo lançador do Playwright, ver printLoginInstructions) não
// ativa a deteção de automação do Google, porque essa deteção depende das
// flags/CDP que o Playwright adiciona ao lançar, não do binário em si.
function findBundledPlaywrightChromium() {
  const base = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'ms-playwright') : null;
  if (!base || !existsSync(base)) return null;
  const dir = readdirSync(base).find((name) => name.startsWith('chromium-') && !name.includes('headless'));
  if (!dir) return null;
  const candidate = path.join(base, dir, 'chrome-win64', 'chrome.exe');
  return existsSync(candidate) ? candidate : null;
}

function findChromeExecutable() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : null,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate)) ?? findBundledPlaywrightChromium();
}

function printLoginInstructions() {
  const chromePath = findChromeExecutable() ?? '<caminho para o teu chrome.exe>';
  console.log(
    '\nO login não pode ser feito por este script — o Google bloqueia sign-in a partir de\n' +
      'browsers controlados por automação (Playwright/CDP), de propósito. Faz login no teu\n' +
      'Chrome normal, apontado para a mesma pasta de perfil que este script usa:\n',
  );
  console.log(`  & "${chromePath}" --user-data-dir="${PROFILE_DIR}" https://www.youtube.com\n`);
  console.log(
    'Cola isto num terminal (PowerShell), inicia sessão normalmente na janela que abrir,\n' +
      'depois fecha essa janela. Os cookies ficam guardados em tests/.yt-session/ e o\n' +
      '`npm run test:selectors` seguinte já os reutiliza — essa parte não faz login, só lê\n' +
      'a página já autenticada, por isso não é bloqueada.\n',
  );
}

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
  if (LOGIN) {
    printLoginInstructions();
    return;
  }

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
    console.log('\nNão parece haver sessão iniciada (tests/.yt-session/ vazio ou sessão expirada).');
    printLoginInstructions();
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
