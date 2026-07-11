# YT Filter — Extensão de filtragem da homepage do YouTube

## Contexto do projeto

Extensão de browser (Firefox primeiro, Chrome depois) que manipula a "For You
page" (homepage de recomendações) do YouTube **depois** dos dados chegarem ao
DOM. Não interage com o algoritmo de recomendação — apenas esconde
(`display: none`) vídeos que não cumprem os filtros ativos do utilizador.

Open source, vai ser publicada na AMO (addons.mozilla.org) e mais tarde na
Chrome Web Store. Vai ficar num repo GitHub público.

**Owner do projeto:** David (Lisboa, freelancer motion design/3D, também faz
UX/UI). Prefere soluções diretas, sem over-engineering, e comunica em
português. Não gosta de respostas em corporate-speak.

---

## Skills a instalar/otimizar para este projeto

Antes de começar, instala e configura estas skills (ou cria SKILL.md
equivalentes se não existirem no ambiente):

1. **`web-extension-dev`** (criar se não existir) — deve conter:
   - Diferenças de API `browser.*` (Firefox, promise-based nativo) vs
     `chrome.*` (callback-based, precisa de polyfill)
   - Regras do Manifest V3: `background.service_worker` vs
     `background.scripts` (Firefox ainda usa scripts persistentes/event page)
   - Como usar `webextension-polyfill` para código único cross-browser
   - Fluxo de teste com `web-ext run` (Mozilla) para hot-reload no Firefox

2. **`dom-scraping-resilience`** (criar se não existir) — encoding de boas
   práticas para scraping de DOM que muda com frequência:
   - Preferir seletores por atributos semânticos/aria-label a classes CSS
     ofuscadas
   - Isolar TODOS os seletores num único ficheiro de configuração
     (`selectors.js`) para facilitar manutenção quando o YouTube mudar o DOM
   - Padrão de "fallback chain": tentar seletor A, se falhar tentar B, se
     falhar logar aviso em vez de rebentar

3. Se existir uma skill de **frontend-design** no ambiente, usa-a para a UI
   do popup/options page (queremos algo limpo, não um formulário genérico de
   browser extension dos anos 2010).

4. Se existir skill de **skill-creator**, usa-a para consolidar, no fim do
   projeto, tudo o que aprendemos sobre os seletores do YouTube numa skill
   reutilizável (`youtube-dom-selectors`) — vai ser útil quando tivermos de
   corrigir seletores partidos daqui a uns meses.

---

## Arquitetura

- **Manifest V3**, desenvolvido e testado primeiro no Firefox (via `web-ext`),
  depois validado no Chrome.
- `webextension-polyfill` para ter uma única codebase `browser.*`.
- **Content script** injetado em `*://www.youtube.com/*`, a correr em
  `document_idle`.
- `MutationObserver` a vigiar o container da grid de recomendações
  (provavelmente `ytd-rich-grid-renderer` — CONFIRMAR com HTML real, ver
  secção "Primeira sessão" abaixo).
- Cada vídeo novo detetado (`ytd-rich-item-renderer` ou equivalente) é
  processado: extrai metadata → aplica filtros ativos → esconde ou mostra.
- **Popup** (ícone da toolbar): toggle rápido de filtros + atalho para
  opções completas.
- **Options page**: configuração completa e persistente dos filtros.
- Armazenamento: `browser.storage.local` (sync não é necessário para já).
- Zero telemetria, zero pedidos de rede fora do necessário — importante para
  aprovação na AMO e para a política de privacidade (não recolhemos dados
  nenhuns).

### Bundler

`esbuild` com um script simples de build para `dist/firefox/` e
`dist/chrome/` (o manifest difere ligeiramente entre os dois, mas o resto do
código é partilhado). Nada de frameworks pesados — isto é uma extensão
pequena, não precisa de React nem de Vite completo. Vanilla JS/TS é
suficiente. Usa TypeScript se achares que compensa a robustez extra ao
lidar com DOM instável; se David preferir JS puro por simplicidade, respeita
isso.

---

## Estrutura de pastas

```
yt-filter/
├── CLAUDE.md
├── README.md
├── LICENSE (MIT)
├── package.json
├── build.js                    # script esbuild
├── manifest.firefox.json
├── manifest.chrome.json
├── src/
│   ├── content/
│   │   ├── index.js             # entry point, arranca o observer
│   │   ├── observer.js          # MutationObserver logic
│   │   ├── selectors.js         # TODOS os seletores DOM centralizados
│   │   ├── extractors.js        # parsing de views/idade/duração do DOM
│   │   └── filters.js           # lógica de aplicar filtros a um vídeo
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── options/
│   │   ├── options.html
│   │   ├── options.js
│   │   └── options.css
│   ├── shared/
│   │   ├── storage.js           # wrapper sobre browser.storage.local
│   │   ├── i18n.js              # sistema de tradução simples (ver abaixo)
│   │   └── defaults.js          # filtros default
│   └── locales/
│       └── pt.js                # dicionário PT inicial
├── icons/
├── tests/
│   └── selector-check.js        # ver secção "manutenção" abaixo
└── docs/
    └── PRIVACY.md
```

---

## Especificação dos filtros (MVP)

Todos os filtros são combináveis (AND lógico entre eles). Cada filtro tem um
toggle on/off independente — se desligado, não filtra por esse critério.

### 1. Idade do vídeo
- Presets: `< 1 dia`, `< 5 dias`, `> 10 dias` (mais os que fizerem sentido:
  considerar também `< 1 semana`, `< 1 mês`, `> 1 ano` como extras depois do
  MVP)
- **Custom**: date picker. O utilizador escolhe uma data e um modo:
  - "antes de" (esconde vídeos publicados depois dessa data)
  - "nesse dia"
  - "depois de" (esconde vídeos publicados antes dessa data)
- Extração: parsing de texto tipo "há 3 dias", "há 2 semanas", "há 1 ano" →
  converter para data absoluta aproximada. Nota: o YouTube só dá granularidade
  relativa na homepage (não a data exata), por isso os cálculos são
  aproximados — documentar isto claramente na UI ("aproximado, baseado no
  texto do YouTube").

### 2. Duração do vídeo
- Slider ou input numérico: "esconder vídeos com mais de X minutos"
- Extração: já vem como texto limpo tipo "12:34" no thumbnail — fácil de
  parsear para segundos.
- Considerar também um mínimo (esconder vídeos muito curtos, ex. clips de
  30s que não sejam Shorts oficiais).

### 3. Views mínimas
- Input numérico com suporte a abreviações (o utilizador escreve "10000" ou
  "10K")
- Extração: parsing de "2,3 mi de visualizações", "150 mil visualizações",
  "500 visualizações" → número absoluto. Este é o parser mais chato porque o
  formato varia (vírgula decimal PT vs ponto).

### 4. Esconder Shorts
- Toggle simples on/off. Provavelmente o mais fácil de implementar
  (Shorts costumam ter um container/atributo distinto na grid).

---

## Sistema de i18n

1. Fase 1 (MVP): só PT. Todas as strings da UI (popup/options) e todos os
   parsers de extração (views/idade) só precisam de reconhecer texto em
   PT-PT.
2. Fase 2: criar `locales/en.js` como segundo dicionário, e um pequeno
   sistema em `shared/i18n.js` que:
   - Deteta o idioma da interface do YouTube/browser (`navigator.language`)
   - Carrega o dicionário certo para a UI da extensão
   - Tem uma tabela de parsers de extração por idioma (porque "há 3 dias" vs
     "3 days ago" têm estruturas diferentes)
3. Fase 3 (mais tarde, não MVP): a partir do dicionário EN, gerar outros
   idiomas via tradução simples (não é prioridade agora, só deixar a
   arquitetura pronta para não bloquear isto no futuro — ou seja, nunca
   hardcodar strings em PT fora de `locales/pt.js`).

---

## Manutenção — deteção de seletores partidos

Criar `tests/selector-check.js`: um script que corre com `web-ext` ou
Playwright, abre `youtube.com`, e verifica se os seletores em
`selectors.js` ainda encontram elementos. Se algum seletor não encontrar
nada, falha com uma mensagem clara a dizer qual seletor partiu.

Sugestão: configurar isto para correr semanalmente via GitHub Actions
(cron job), e abrir automaticamente uma issue no repo se algo partir.
Não é crítico ter isto já na primeira sessão — mas deixar o esqueleto do
script pronto.

---

## Plano de execução (ordem sugerida para o Claude Code)

Segue esta ordem. Não saltes passos — cada um depende do anterior estar a
funcionar.

### Sessão 1 — Esqueleto e primeiro sinal de vida
1. Criar estrutura de pastas acima.
2. `package.json`, `build.js` com esbuild, `manifest.firefox.json` mínimo
   (permissions: `storage`, host permissions para `youtube.com`).
3. Content script mínimo que só faz `console.log` quando deteta a grid de
   recomendações — objetivo é confirmar que a injeção funciona e que
   conseguimos correr com `web-ext run`.
4. **IMPORTANTE**: pedir a David HTML real da homepage dele (pode ser via
   "Inspecionar elemento" → copiar outerHTML de um `ytd-rich-item-renderer`,
   ou um screenshot da estrutura no devtools). Não adivinhar seletores —
   o DOM do YouTube muda com frequência e adivinhar vai gerar retrabalho.
   Se não for possível obter HTML real nesta sessão, marcar claramente no
   código com `// TODO: confirmar seletor com HTML real` em vez de assumir.

### Sessão 2 — Extração de dados
5. `selectors.js` com os seletores confirmados.
6. `extractors.js`: funções puras (fáceis de testar) que recebem um
   elemento de vídeo e devolvem `{ views, publishedAt, durationSeconds,
   isShort }`.
7. Testar manualmente estas funções no console do browser antes de as ligar
   ao resto — confirmar que os parsers de "há 3 dias" e "2,3 mi
   visualizações" funcionam com exemplos reais.

### Sessão 3 — Filtros e storage
8. `defaults.js` com a shape dos filtros default (tudo desligado por
   default — a extensão não deve esconder nada até o utilizador configurar).
9. `storage.js` wrapper sobre `browser.storage.local`.
10. `filters.js`: função pura `shouldHide(videoData, activeFilters) →
    boolean`.

### Sessão 4 — Ligar tudo no content script
11. `observer.js`: MutationObserver que, para cada novo vídeo, chama
    extractor → filters → aplica `display:none` ou remove-o.
12. Lidar com o problema do infinite scroll: se a grid visível ficar muito
    curta por causa de filtros agressivos, considerar disparar scroll
    automático (discutir com David antes de implementar — pode ser
    intrusivo).

### Sessão 5 — UI
13. `popup.html/js/css`: toggles rápidos.
14. `options.html/js/css`: configuração completa, incluindo o date picker
    custom do filtro de idade.
15. Aplicar boas práticas de design (skill de frontend-design se disponível)
    — nada de UI genérica de extensão de 2012.

### Sessão 6 — Polimento e publicação
16. `docs/PRIVACY.md` (declarar claramente: zero recolha de dados, tudo
    local).
17. `README.md` completo com instruções de instalação, screenshots,
    contribuição.
18. Preparar para submissão à AMO (rever permissões pedidas — pedir o
    mínimo possível).
19. Configurar GitHub Actions para o `selector-check.js` semanal.
20. Manifest para Chrome (`manifest.chrome.json`) e validar a extensão lá
    também.

---

## Regras gerais para o Claude Code durante este projeto

- Nunca assumir a estrutura do DOM do YouTube sem confirmação — pedir
  sempre HTML real quando houver dúvida, em vez de inventar seletores
  plausíveis.
- Filtros vêm todos desligados por default. A extensão nunca deve esconder
  nada sem o utilizador ter ativado explicitamente pelo menos um filtro.
- Código simples e direto — este é um projeto pequeno, evitar abstrações
  desnecessárias ou dependências pesadas.
- Isolar toda a lógica de parsing/seletores para facilitar manutenção
  futura (o YouTube vai partir isto eventualmente, é expectável).
- Commits pequenos e frequentes, mensagens claras — é um repo open source
  com colaboração esperada.
