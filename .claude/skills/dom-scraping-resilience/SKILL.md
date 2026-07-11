---
name: dom-scraping-resilience
description: Boas práticas para scraping de DOM que muda com frequência (caso do YouTube) — seletores por semântica em vez de classes ofuscadas, seletores centralizados num único ficheiro, e padrão de fallback chain com log em vez de crash. Usar sempre que se escrever ou alterar código em selectors.js, extractors.js ou observer.js.
---

# dom-scraping-resilience

O YouTube muda o DOM da homepage com frequência (classes CSS ofuscadas/geradas, reestruturação de componentes). Este projeto depende de ler esse DOM sem quebrar a cada atualização do YouTube. Regras:

## 1. Preferir seletores semânticos a classes CSS ofuscadas

- Classes como `.ytd-rich-item-renderer` geradas por sistemas internos do Google podem mudar sem aviso; nomes de tags de custom elements (`ytd-rich-item-renderer`, `ytd-rich-grid-renderer`) tendem a ser mais estáveis porque refletem a arquitetura de componentes, não apenas styling.
- Preferir, por ordem:
  1. Atributos semânticos: `aria-label`, `role`, `id` estável.
  2. Nomes de custom elements (tags): `ytd-rich-item-renderer`, `ytd-video-renderer`, etc.
  3. Estrutura relativa estável (ex. "o `<a>` dentro do primeiro filho de X").
  4. Só como último recurso: classes CSS que pareçam ofuscadas/geradas (ex. `.style-scope-abc123`).
- Nunca depender de texto visível traduzível (ex. não procurar pela palavra "Shorts" no DOM para identificar um Short — isso parte assim que o YouTube muda de idioma; usar antes atributos/estrutura).

## 2. Centralizar todos os seletores em selectors.js

- **Nenhum seletor deve aparecer hardcoded fora de `src/content/selectors.js`.** Sempre que outro ficheiro precisar de encontrar um elemento no DOM do YouTube, importa a constante/função de `selectors.js`.
- Quando o YouTube partir alguma coisa, a correção deve ser possível mexendo só num ficheiro.
- Cada seletor exportado deve ter um nome descritivo do que representa semanticamente (ex. `VIDEO_GRID_CONTAINER`, `VIDEO_ITEM`, `VIDEO_TITLE`, `VIDEO_DURATION_BADGE`), não do valor CSS em si.

## 3. Fallback chain: tentar A, depois B, depois logar aviso (nunca rebentar)

Padrão para qualquer função que procura um elemento/dado no DOM:

```js
function findVideoTitle(videoEl) {
  const el = videoEl.querySelector(SELECTOR_A) ?? videoEl.querySelector(SELECTOR_B);
  if (!el) {
    console.warn('[yt-filter] Não foi possível encontrar o título do vídeo. Seletor pode ter partido.', videoEl);
    return null;
  }
  return el.textContent.trim();
}
```

Regras:
- Nunca deixar um `querySelector` que falha rebentar o resto do content script (não fazer `el.textContent` sem checar `el` primeiro).
- Sempre logar com `console.warn` (prefixo `[yt-filter]` para ser fácil de filtrar na consola) quando um seletor falha, incluindo qual seletor e, se possível, o elemento onde falhou — isto é o que torna possível diagnosticar rapidamente quando o YouTube muda algo.
- Quando um seletor essencial falha (ex. não encontra a grid principal), falhar de forma graciosa: não aplicar nenhum filtro àquele vídeo (mostrar, não esconder) em vez de esconder tudo por engano. Esconder vídeos por erro é pior do que não filtrar.

## 4. Testes de deteção de seletores partidos

- Ver `tests/selector-check.js` — script que abre `youtube.com` e verifica se cada seletor em `selectors.js` ainda encontra pelo menos um elemento. Corre isto sempre que houver dúvidas sobre se o YouTube mudou algo, e nunca assumir que os seletores atuais continuam válidos sem verificar com HTML real.

## 5. Nunca adivinhar seletores

- Se não houver HTML real para confirmar um seletor, marcar claramente no código com `// TODO: confirmar seletor com HTML real` em vez de inventar um seletor plausível. Seletores adivinhados parecem funcionar até ao dia em que alguém descobre que nunca funcionaram.
