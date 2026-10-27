# Recuperação de abertura

O bootstrap permanece visível enquanto o usuário e os espaços são carregados. Requisições têm timeout de 25 segundos. Falha de rede mostra uma ação de tentar novamente e preserva a sessão local. HTTP 401 após a abertura encerra a sessão local e leva ao login. A verificação inicial trata 401/403 no store para evitar redirecionamentos concorrentes.

Falhas de importação de chunks após deploy permitem um recarregamento por sessão; falhas persistentes exibem recuperação. Erros de renderização são capturados pelo componente raiz. O shell estático inicial aparece antes de o Vue carregar.

Este fluxo usa o JWT existente; não introduz refresh tokens nem armazena credenciais adicionais. O cache PWA continua restrito a recursos estáticos, incluindo os logos locais de bancos. Respostas financeiras autenticadas continuam fora do cache.
