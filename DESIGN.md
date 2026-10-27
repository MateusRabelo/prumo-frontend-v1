# Prumo — sistema visual do frontend

A referência de marca é `docs/prumo-manual-de-marca.html`, fornecida pelo usuário. A aplicação mantém Vue 3, Pinia, Vue Router, Tailwind 3 e os contratos de API existentes.

## Marca e escala

- Verde Prumo `#0F5B4F`, Tinta `#0B2420`, Névoa `#F2F6F4` e Musgo `#D6E6E0` formam a estrutura.
- Folha `#2E9E6B` identifica entradas nos gráficos; Brasa `#D5503F` identifica saídas. Textos pequenos usam variantes mais escuras para contraste. Sinais e rótulos acompanham as cores.
- Latão `#E9A23B` aparece no ponto do símbolo e no indicador de foco, sem decoração espalhada.
- Bricolage Grotesque 600/800: títulos e valores em destaque. Figtree 400/500/700: controles, tabelas e texto. Os arquivos WOFF2 e licenças OFL são locais em `public/fonts`; nenhuma requisição a Google Fonts é necessária no navegador.
- Corpo e navegação: 16 px. Apoio: 14 px. Título de tela: 32 px no desktop, 28 px no celular. Seções: 20–24 px. Saldo principal: 38–48 px quando há espaço.
- Campos de formulário: 16 px, altura mínima 48 px. Ações principais: 48 px. Alvos com ícones: pelo menos 44 px.
- Cantos: 12–18 px. Bordas finas. Sem elevação pesada. Valores usam números tabulares e formato brasileiro.
- O símbolo segue a geometria do manual. A palavra do logotipo foi convertida em curvas no SVG `public/prumo-wordmark.svg`.

## Estrutura

- `src/style.css`: tokens, controles, navegação, superfícies, tabelas, diálogos, família, autenticação e dashboard.
- `components/ui/BrandLogo.vue`: marca compartilhada.
- `components/ui/AuthLayout.vue`: composição comum de entrada, cadastro e recuperação.
- `components/ui/AppDialog.vue`: diálogo nativo, nome acessível, associação de rótulos, contenção de foco e Escape.
- `components/layout/SpaceSwitcher.vue`: seleção de espaço com opções nomeadas, escolha atual explícita e fechamento por teclado ou clique externo.
- `useFeedback`: mensagens e confirmação compartilhadas.

## Telas

- Visão geral prioriza saldo, entradas, saídas e compromissos; gráficos e detalhamento vêm depois.
- Lançamentos usa tabela no desktop e lista no celular. Filtros não alargam a página; atalhos de categoria e pendência preservam seus filtros.
- Contas e cartões usa painéis financeiros, com fatura, limite, conta e vencimento explícitos.
- Parcelamentos, orçamentos, metas, relatórios e preferências compartilham escala, controles, contraste e estados.
- Família mantém a separação entre espaços, integrantes com acesso e responsáveis por lançamentos.
- O formulário de lançamento mostra primeiro os campos essenciais e mantém forma de pagamento, classificação e observações em “Mais detalhes”.
- Valores digitados como `1.234,56` são interpretados como `1234.56`; entradas inválidas não são parcialmente convertidas.

## Validação

```sh
npm run build
# Com o frontend aberto em localhost:5174:
npm run test:ui
# Outro endereço:
FRONTEND_TEST_URL=http://localhost:5175 npm run test:ui
```

Os testes de navegador usam respostas simuladas e não alteram dados reais. Cobrem:

1. Seleção, persistência e isolamento de espaços, permissões e erro de convite.
2. Nove telas preenchidas em 1920, 1366 e 390 px, fontes, valores e ausência de overflow da página.
3. Formulários financeiros, tamanho dos campos, foco e Escape em laptop e celular.
4. Envio correto de valor monetário brasileiro à API.
5. Faturas, pagamento em diálogo sobreposto, pagamento de parcela, aporte e histórico de meta.
6. Entrada, cadastro e recuperação, com marca e controles legíveis.

As capturas de estados preenchidos de teste contêm dados fictícios. A aplicação em execução continua usando os dados reais do espaço selecionado.

## Compatibilidade de dados

Os nomes internos de armazenamento `msfinancas_*` foram preservados para manter as sessões e a seleção de espaço existentes. Esta reformulação não adiciona migrações, não apaga contas e não modifica associações entre famílias. O SMTP de recuperação continua dependendo da configuração do ambiente.
