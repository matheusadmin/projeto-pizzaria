# Banco de dados (Supabase)

As migrations em `supabase/migrations/` são rodadas **manualmente**, uma vez cada, no
SQL Editor do Supabase. Os nomes usam só a data (sem hora), então não servem para
`supabase db push` sem antes renomear para timestamps de 14 dígitos.

## Ordem

1. `20261105_retirada.sql`
2. `20261106_caixa_contas_pagamentos.sql`
3. `20261106_cardapio_permissoes.sql`
4. `20261106_seguranca_insumos.sql` — **copie para esta pasta** (não estava no projeto)
5. `20261106_integridade.sql` — depende da 2 (função de pagamento) e da 4

## Lacuna conhecida

Nenhuma migration aqui cria as tabelas-base (`pedidos`, `itens_pedido`, `insumos`,
`ficha_tecnica`, `perfis`...), a view `vw_cmv_produto_tamanho` nem as funções
`dre_periodo` e `movimentar_estoque`. Para o repositório reconstruir o banco sozinho,
salve o schema atual em `supabase/schema.sql`:

    pg_dump "postgresql://postgres.<REF>:<SENHA>@aws-1-sa-east-1.pooler.supabase.com:5432/postgres" \
      --schema-only --schema=public --no-owner --no-privileges -f supabase/schema.sql

Nunca commite a senha do banco. O Supabase Free não faz backup automático: veja
"Backup" abaixo.

## Backup manual (plano Free)

Mesmo comando, sem `--schema-only`, guardando o arquivo fora do computador da loja:

    pg_dump "<mesma-string>" --schema=public --no-owner --no-privileges \
      -f kikas_backup_AAAA-MM-DD.sql

Isso salva os dados do schema `public` (pedidos, cardápio, insumos, caixa...). Os logins
(schema `auth`) não vão junto: numa restauração em projeto novo, recrie os usuários e
os perfis. Use um `pg_dump` de versão igual ou maior que a do servidor.
