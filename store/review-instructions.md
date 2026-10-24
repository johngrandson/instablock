# Instruções de teste para a Chrome Web Store

1. Entre no Instagram em uma conta de teste do revisor. A extensão não fornece nem solicita credenciais.
2. Use um perfil destinado a teste que essa conta já siga. Abra o popup, informe o nome e selecione
   “Deixar de seguir”. Clique em “Iniciar” e mantenha a aba aberta.
3. A execução ocorre entre 08h e 23h no horário local; a primeira ação inclui uma breve espera.
   Confira a mudança de “Seguindo/Following” para “Seguir/Follow” e o resultado no popup.
4. Para testar “Bloquear”, use um perfil destinado a teste e confira a mudança para “Desbloquear/Unblock”.
   Essas operações alteram relações reais da conta; use somente perfis autorizados.
5. Com dois perfis, clique em “Parar” durante uma espera. Não deve haver novos cliques. Ao reabrir
   o popup, a lista pendente e a ação anterior devem ser preservadas.
6. Uma segunda campanha não pode começar enquanto a anterior estiver ativa. Em uma página fora do
   Instagram, o popup deve explicar que é necessário abrir/recarregar uma aba do Instagram.

Idiomas reconhecidos no Instagram: português e inglês. O popup usa português do Brasil.
A extensão não usa código remoto, API privada ou servidor próprio. Dados da campanha ficam em
chrome.storage.local. Alterações de layout, desafios de login ou falhas de confirmação interrompem a execução.
