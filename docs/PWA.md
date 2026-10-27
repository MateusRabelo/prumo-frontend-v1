# Prumo como PWA

Manifesto com nome, identidade estável, ícones PNG 192/512, ícone maskable, apple-touch-icon e display standalone. Instalação requer HTTPS (localhost é permitido para desenvolvimento).

No Android, o convite usa beforeinstallprompt quando disponível e dispara a janela nativa somente após o toque do usuário. Se não houver evento nativo, mostra instruções pelo menu do navegador. No iPhone/iPad, orienta Compartilhar → Adicionar à Tela de Início; no iOS recente, manter Abrir como App ativado.

O convite automático aparece apenas em dispositivos móveis, após seis segundos de uso visível e online, e no máximo uma vez a cada sete dias por navegador/origem. O instante é registrado ao mostrar, mesmo quando o usuário fecha ou recarrega. Outras abas acompanham alterações no armazenamento. Se não for possível persistir o intervalo, não há convite automático.

O convite é suprimido no modo standalone e após confirmação appinstalled. Aceitar o diálogo nativo, sozinho, não é tratado como instalação concluída. O navegador não oferece uma API universal para descobrir instalações em outros navegadores, perfis ou no Safari fora do modo app. No iOS, o armazenamento do app instalado pode ser separado do navegador; por isso não é possível garantir detecção de instalação em todas as visitas pelo Safari. Limpar os dados do navegador também limpa o histórico do convite.

O service worker pré-carrega apenas HTML, JS, CSS, fontes e imagens. Respostas da API, tokens e dados financeiros não são gravados no Cache Storage. O app exibe aviso sem conexão; operações financeiras dependem da rede e não entram em fila para envio posterior. Uma nova versão solicita atualização explícita para evitar recarregar formulários sem aviso.

Validação: build de produção e testes de navegador em layouts iPhone/Android, incluindo intervalo exato de sete dias, recarregamento, instalação, standalone, manifesto, cache offline e ausência de respostas autenticadas no cache. A emulação não substitui teste de instalação em aparelhos físicos.

Executar: pnpm run build; node --test tests/pwa.test.mjs. Os testes PWA iniciam automaticamente um preview na porta 4175. Os demais testes usam FRONTEND_TEST_URL ou http://localhost:5174.
