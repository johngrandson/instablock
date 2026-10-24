# InstaBlock — Chrome Web Store

Nome: InstaBlock
Idioma: Português (Brasil)
Preço: gratuito
Distribuição: pública, todas as regiões disponíveis
Publicação: automática após aprovação
Site: https://johngrandson.github.io/instablock/
Privacidade: https://johngrandson.github.io/instablock/privacy.html
Suporte: https://github.com/johngrandson/instablock/issues

## Descrição curta

Bloqueie ou deixe de seguir uma lista de perfis do Instagram, com pausas e controle de execução.

## Descrição detalhada

O InstaBlock ajuda você a bloquear ou deixar de seguir uma lista de perfis do Instagram no Chrome.
Cole nomes, @nomes ou URLs, escolha a ação e acompanhe os resultados no popup.

• Usa os botões da aba do Instagram já conectada; não pede sua senha.
• Mantém a campanha e os resultados no armazenamento local do navegador.
• Executa uma campanha por vez, com pausas entre os perfis.
• Permite parar a execução e retomar manualmente os perfis pendentes, preservando a ação escolhida.
• Interrompe a campanha quando não consegue confirmar uma ação.

Mantenha a aba do Instagram aberta e sem navegar durante a execução. O popup pode ser fechado.
A extensão reconhece os controles do Instagram em português e inglês e atua entre 08h e 23h no
horário do computador. Uma sessão processa até 40 perfis.

Parar impede novos cliques, mas não desfaz ações já enviadas ao Instagram. As pausas não garantem
ausência de restrições na conta. Mudanças na interface do Instagram podem afetar o funcionamento.
InstaBlock é um projeto independente, sem afiliação ao Instagram ou à Meta.

## Finalidade única

Gerenciar uma lista de perfis fornecida pelo usuário para bloquear ou deixar de seguir no Instagram,
usando os controles da aba conectada e com acompanhamento local da execução.

## Justificativas

storage: guardar localmente a lista pendente, ação, resultados e identificadores de execução para
acompanhar a campanha e permitir retomada manual entre aberturas do popup.

Acesso a https://www.instagram.com/*: localizar e acionar os controles dos perfis solicitados,
identificar diálogos e confirmar os resultados das ações na aba conectada.

Código remoto: não. Todo o código executável da extensão está incluído no pacote.

## Tratamento de dados

Declarar o tratamento local de nomes de usuário, URLs de perfis e resultados das ações nas categorias
correspondentes do formulário. Não declarar leitura de credenciais, cookies de autenticação ou
histórico geral do navegador: essas funções não existem. Não há analytics, venda de dados nem
transmissão de listas ao desenvolvedor. As navegações e ações solicitadas são processadas pelo Instagram.

## Arquivos para upload

- Pacote: `.output/instablock-0.1.1-chrome.zip` (gerado por `pnpm zip`).
- Ícone: `public/icon/128.png`.
- Captura: `store/screenshot-1280x800.jpg` (interface de produção com perfis fictícios).
- Instruções para o revisor: `store/review-instructions.md`.
