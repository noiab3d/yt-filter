# Política de privacidade — YT Filter

**Resumo: o YT Filter não recolhe, armazena remotamente, nem transmite
nenhum dado sobre ti ou sobre a tua utilização do YouTube. Zero
telemetria, zero pedidos de rede além dos que o próprio YouTube já faz.**

## O que a extensão faz

O YT Filter corre inteiramente dentro do teu browser. Quando estás na
homepage do YouTube, lê os vídeos que **já estão carregados na página**
(título, duração, views, idade relativa, tipo de cartão) e, com base nos
filtros que tu ativaste, esconde (`display: none`) os que não cumprem
esses critérios. Não interage com o algoritmo de recomendação do
YouTube, não bloqueia anúncios, e não modifica nenhum outro
comportamento da página.

## Que dados são recolhidos

Nenhum. Especificamente:

- **Não há telemetria.** A extensão não contacta nenhum servidor,
  próprio ou de terceiros.
- **Não há analytics nem tracking** de qualquer tipo (Google Analytics,
  Sentry, etc.).
- **Não há contas nem login.** Nada é associado à tua identidade.
- **Não é enviado nada para fora do teu browser.** Os únicos pedidos de
  rede que acontecem são os que o próprio YouTube faz normalmente para
  carregar a página — a extensão não adiciona nenhum.

## Que dados são guardados localmente

Os teus filtros (idade, duração, views, Shorts, etc.) e a posição do
botão flutuante são guardados apenas no teu computador, através da API
`browser.storage.local` do próprio browser — o equivalente a uma
preferência local, como o zoom de uma página. Esses dados:

- Nunca saem do teu dispositivo.
- Não são sincronizados com nenhum servidor.
- São apagados automaticamente se desinstalares a extensão.

## Permissões pedidas e porquê

- **`storage`** — para guardar os teus filtros e a posição do botão
  localmente, como descrito acima.
- **Acesso a `www.youtube.com`** — para o content script poder ler os
  vídeos da homepage e esconder os que não cumprem os filtros. A
  extensão não pede acesso a nenhum outro site.

Não é pedida nenhuma permissão de rede, histórico de navegação, cookies,
ou acesso a outras abas.

## Código aberto

O código-fonte completo está disponível em
[github.com/noiab3d/yt-filter](https://github.com/noiab3d/yt-filter)
sob licença MIT — qualquer pessoa pode inspecionar exatamente o que a
extensão faz.

## Contacto

Dúvidas ou preocupações sobre privacidade podem ser colocadas como
[issue no GitHub](https://github.com/noiab3d/yt-filter/issues).
