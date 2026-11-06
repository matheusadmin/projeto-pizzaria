# Kikas Pizzaria & Petiscaria — Sistema operacional

Next.js + Supabase. Dark Mode profissional, pensado para cozinha, balcão e salão.
Desenvolvido por Matheus Thomaz.

## Telas
| Rota | Função | Perfis |
|---|---|---|
| `/` | Hub central (RBAC) | todos |
| `/pdv` | PDV: Salão, Balcão, Retirada, Entrega (taxa por bairro) | admin, dev, caixa |
| `/kds` | Cozinha em colunas: Em preparo / Pronto | admin, dev, caixa, cozinha |
| `/garcom` | Lançamento por etapas no salão | admin, dev, caixa |
| `/entregador` | Rotas e fechamento de entregas | todos |
| `/caixa` | Controle de caixa: abertura com fundo de troco, sangria, reforço e fechamento conferido por forma de pagamento | admin, dev, caixa |
| `/pedidos` | Acompanhamento, baixa financeira (com pagamento dividido) e botão "Avisar cliente" no WhatsApp | todos |
| `/admin/insumos`, `/admin/fichas` | Estoque e fichas técnicas (Insumos está no Setor Operacional do Hub) | admin, dev |
| `/admin/dashboard` | Dashboard: KPIs, faturamento por dia, mais vendidos, horário de pico, canais e pagamentos | admin, dev |
| `/admin/financeiro` | DRE (com despesas e resultado operacional), margem por produto e contas a pagar/receber | admin, dev |
| `/admin/compras` | Lista de compras sugerida pelo estoque mínimo (copiar, WhatsApp, imprimir) | admin, dev |

## Configurar
1. `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. Rodar no SQL Editor do Supabase, nesta ordem: `supabase/migrations/20261105_retirada.sql` (tipo "retirada") e `supabase/migrations/20261106_caixa_contas_pagamentos.sql` (caixa, pagamentos por pedido, contas a pagar/receber e RLS).
3. Editar `lib/taxasEntrega.ts` com as cidades, bairros e taxas reais.
4. `npm install && npm run dev`.

## Design
Tokens de cor em `app/globals.css` (`bg-fundo`, `bg-superficie`, `text-marca`, `bg-sucesso`...). Não use hex solto nos componentes.
Campos: `INPUT` de `lib/ui.ts`. Rotas e permissões: `lib/rotas.ts`.

## Novidades (06/11/2026)
- **Caixa**: um caixa aberto por vez. Todo pedido que vira "pago" gera um registro em `pedido_pagamentos` (trigger no banco) ligado ao caixa aberto; o fechamento compara esperado x contado por forma.
- **Pagamento dividido**: na baixa do `/pedidos`, escolha "Dividir pagamento". O pedido fica com forma `Misto` e cada parte entra no caixa na sua forma.
- **Contas a pagar/receber**: entram no DRE pelo mês de vencimento. Suporta repetição mensal (aluguel, salários).
- **CRM por telefone**: o PDV reconhece o cliente pelo histórico de pedidos (nome, último endereço, favorito). O telefone passa a ser gravado só com dígitos; pedidos antigos formatados não são reconhecidos.
- **WhatsApp**: links `wa.me` com mensagem pronta por etapa (sem API). Envio automático exige a API oficial (servidor + token).
