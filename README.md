# InstaBlock

Extensão Chrome (WXT + Svelte 5, Manifest V3) para bloquear ou deixar de seguir uma lista de
perfis do Instagram usando os botões da aba já autenticada. Interface do popup em português;
controles do Instagram reconhecidos em português e inglês.

[Site](https://johngrandson.github.io/instablock/) ·
[Privacidade](https://johngrandson.github.io/instablock/privacy.html) ·
[Suporte](https://github.com/johngrandson/instablock/issues)

## Desenvolvimento

```sh
pnpm install
pnpm test
pnpm check
pnpm build
pnpm zip
pnpm dev
```

Carregue `.output/chrome-mv3` em `chrome://extensions`, com o modo de desenvolvedor ativado.
Após atualizar a extensão, recarregue a aba do Instagram antes de iniciar uma campanha.
O ZIP de produção é gerado em `.output/`; não envie o código-fonte como pacote da extensão.

## Uso

1. Abra o Instagram no Chrome e confira qual conta está conectada.
2. Cole nomes, `@nomes` ou URLs de perfis, separados por linha, espaço ou vírgula.
   Entradas inválidas são ignoradas e contadas junto ao campo.
3. Escolha **Bloquear** ou **Deixar de seguir** e clique em **Iniciar**.
   Uma nova campanha começa com Bloquear selecionado; ao retomar, a ação anterior é preservada.
4. Mantenha a aba aberta e sem navegar. O popup pode ser fechado.
5. **Parar** cancela esperas e impede novos cliques. Ações já enviadas ao Instagram não são desfeitas.
   Reabra o popup para retomar manualmente os perfis pendentes.

Só há uma campanha por vez. Fechar a aba, recarregar durante uma etapa, navegar para outra página,
reiniciar o navegador ou atualizar a extensão interrompe a execução. Uma falha de confirmação
interrompe a campanha e mantém o alvo pendente. Perfis explicitamente indisponíveis são pulados.

## Pausas e limitações

A extensão espera de 30 a 60 segundos entre perfis, com uma pausa adicional de 1 a 2 minutos a cada dez.
Atua entre 08h e 23h no horário local e encerra uma sessão após 40 perfis. Esses limites não são
quotas diárias nem garantem ausência de restrições do Instagram. Não há retomada automática após
uma parada e nenhuma tentativa de contornar checkpoints ou desafios de autenticação.

Os cliques são eventos de script (`isTrusted: false`). Mudanças no site ou idiomas não reconhecidos
podem impedir o funcionamento. InstaBlock não é afiliado ao Instagram ou à Meta.

## Estrutura

- `src/lib/campaign.ts`: domínio e validação de nomes/URLs.
- `src/lib/coordinator.ts`: escritor único do estado; identifica campanha, aba e documento.
- `src/lib/messages.ts`: protocolo validado entre popup, conteúdo e service worker.
- `src/lib/runner.ts`: execução cancelável de uma etapa na aba.
- `src/lib/instagram.ts`: controles restritos ao cabeçalho do perfil e diálogos.
- `src/lib/pacing.ts`: intervalos e horário de atividade.
- `src/entrypoints/`: popup Svelte, content script e service worker WXT.
- `docs/`: todos os arquivos do GitHub Pages.
- `store/`: textos e imagens para publicação na Chrome Web Store.

## GitHub Pages e publicação

O site é HTML/CSS estático. Em **Settings → Pages**, selecione **Deploy from a branch**,
branch **main**, pasta **/docs**. Alterações em `docs/` publicadas em `main` atualizam o site;
nenhum build ou workflow personalizado é necessário. Preserve `docs/.nojekyll`.

Antes de enviar uma versão à loja, execute os testes, o check e o build; valide o pacote no Chrome,
a política de privacidade e as capturas correspondentes à versão. Atualize a versão em
`package.json` e gere o ZIP com `pnpm zip`. A análise e aprovação são feitas pelo Google.
