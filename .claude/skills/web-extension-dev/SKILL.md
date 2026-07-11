---
name: web-extension-dev
description: Diferenças entre a API browser.* (Firefox) e chrome.* (Chrome/MV3), como usar webextension-polyfill para código único, e fluxo de teste com web-ext run. Usar sempre que se mexer em manifest.json, background scripts, content scripts ou permissions desta extensão.
---

# web-extension-dev

Guia rápido para desenvolver esta extensão cross-browser (Firefox primeiro, Chrome depois).

## browser.* vs chrome.*

- **Firefox**: `browser.*`, baseado em Promises nativamente. API moderna e padrão (WebExtensions).
- **Chrome**: `chrome.*`, baseado em callbacks (exceto algumas APIs mais recentes que já aceitam Promise, mas não é garantido em todas as versões suportadas).
- **Solução**: usar sempre `webextension-polyfill` (`import browser from 'webextention-polyfill'` — cuidado, o pacote chama-se `webextension-polyfill`) e escrever sempre `browser.*` no código. O polyfill expõe `browser.*` com Promises mesmo no Chrome.
- Nunca escrever `chrome.*` diretamente no código partilhado — só faria sentido em código específico de build do Chrome, e mesmo assim normalmente não é necessário.

## Manifest V3: diferenças Firefox vs Chrome

- **Chrome MV3**: `background.service_worker` — um único ficheiro JS, corre como service worker (pode ser terminado e reiniciado a qualquer momento pelo browser). Sem acesso a DOM, sem estado persistente em memória entre execuções.
- **Firefox MV3**: ainda suporta (e para muitos casos prefere) `background.scripts` como event page, mais parecido com o comportamento pré-MV3. Firefox tem vindo a adicionar suporte a `service_worker` mas o suporte é mais recente e menos maduro que no Chrome.
- **Implicação prática**: manter dois manifests separados (`manifest.firefox.json` e `manifest.chrome.json`) em vez de tentar um manifest único com campos condicionais — MV3 não tem um mecanismo limpo para isso entre os dois browsers.
- Este projeto (yt-filter) não precisa de lógica complexa em background — o trabalho todo acontece no content script. Se vier a precisar de um background script, não guardar estado importante em variáveis do módulo (pode desaparecer com o restart do service worker no Chrome) — usar `browser.storage.local`.

## Content scripts

- `content_scripts` no manifest, com `matches: ["*://www.youtube.com/*"]`.
- `run_at: "document_idle"` é o ponto certo para este projeto — dá tempo ao YouTube de montar a grid inicial via JS antes do nosso script correr, mas não bloqueia o carregamento da página.
- YouTube é uma SPA (navegação via `pushState`, sem reload completo entre páginas). Um content script correndo em `document_idle` só corre uma vez no load inicial — para apanhar mudanças de página (ex. o utilizador vai à home depois de ver um vídeo) é preciso ouvir mudanças de URL (ex. observar `document.title` ou eventos de navegação) e não confiar só no evento de load da extensão.

## webextension-polyfill

- Instalar como dependência normal (`npm install webextension-polyfill`).
- Importar no topo dos ficheiros que usam `browser.*`: `import browser from 'webextension-polyfill';`
- Incluir o script/import tanto no bundle do content script como no do background e popup/options — cada contexto de execução (content script, popup, options, background) precisa da sua própria cópia carregada.
- No manifest do Chrome, garantir que o polyfill está incluído antes do código que o usa, se não estiver a usar bundler para isso (aqui estamos a usar esbuild, por isso o bundler resolve isto automaticamente via import).

## Fluxo de teste com web-ext

- `npx web-ext run` na raiz do projeto (aponta por defeito para a pasta atual à procura de manifest.json — ajustar `--source-dir` para apontar para `dist/firefox/`).
- `web-ext run --source-dir dist/firefox` abre uma instância do Firefox com a extensão já carregada, e faz hot-reload automático quando os ficheiros do `source-dir` mudam.
- Combinar com um watch do `esbuild` (`--watch`) para rebuild automático de `dist/firefox/` sempre que o código-fonte muda — assim o `web-ext run` apanha as mudanças e recarrega sozinho.
- Para testar no Chrome: `chrome://extensions` → "Load unpacked" → apontar para `dist/chrome/`. Não há hot-reload automático nativo tão bom como no Firefox; é preciso clicar em "reload" na extensão manualmente (ou usar uma ferramenta extra tipo `web-ext` com suporte experimental a Chromium, mas não é prioridade para este projeto).

## Permissions

- Pedir o mínimo necessário: `storage` (para `browser.storage.local`) e host permission só para `*://www.youtube.com/*`.
- Nada de `<all_urls>`, `tabs`, `webRequest`, etc. — não são precisos e complicam a revisão na AMO.
