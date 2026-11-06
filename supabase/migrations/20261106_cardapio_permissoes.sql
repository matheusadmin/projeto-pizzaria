-- Permite que admin e dev cadastrem categorias, produtos e tamanhos pela tela /admin/cardapio.
-- Requer a função public.kika_tem_role criada em 20261106_caixa_contas_pagamentos.sql (rode aquela primeiro).
-- As políticas são ADICIONAIS: não removem nenhuma regra de leitura que já exista.

drop policy if exists kika_cardapio_escrita on public.categorias;
create policy kika_cardapio_escrita on public.categorias
  for all to authenticated
  using (public.kika_tem_role(array['admin', 'dev']))
  with check (public.kika_tem_role(array['admin', 'dev']));

drop policy if exists kika_cardapio_escrita on public.produtos;
create policy kika_cardapio_escrita on public.produtos
  for all to authenticated
  using (public.kika_tem_role(array['admin', 'dev']))
  with check (public.kika_tem_role(array['admin', 'dev']));

drop policy if exists kika_cardapio_escrita on public.produto_tamanhos;
create policy kika_cardapio_escrita on public.produto_tamanhos
  for all to authenticated
  using (public.kika_tem_role(array['admin', 'dev']))
  with check (public.kika_tem_role(array['admin', 'dev']));
