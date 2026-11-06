-- =====================================================================
-- Kika Pizzaria — Migration de INTEGRIDADE (rodar UMA vez no SQL Editor)
-- Rode DEPOIS de 20261106_seguranca_insumos.sql
-- =====================================================================
-- O que corrige:
--   1) pedidos.total passa a ser calculado pelo banco (subtotal + taxa - desconto).
--      Antes só o app gravava, na baixa financeira: pedidos novos ficavam com total NULL
--      (mesa aparecia R$ 0,00 no Garçom, e pedido criado já pago nunca entrava no caixa).
--   2) kika_registrar_pagamento() só registra o pagamento depois que o pedido sai de
--      'pendente' (quando os itens já existem). Sem isso, o total calculado na criação
--      de um delivery pago seria só a taxa de entrega.
--   3) Registra os pagamentos que faltam (pedidos pagos sem linha em pedido_pagamentos).
--   4) Chaves estrangeiras que faltavam: ficha_tecnica.insumo_id e
--      movimentacoes_estoque.insumo_id -> insumos. Categoria de insumo não apaga mais
--      os insumos em cascata.
--   5) insumos: colunas numéricas obrigatórias (>= 0, exceto quantidade_atual, que pode
--      ficar negativa para não travar a venda) e unidade_medida restrita ao padrão.
--   6) pedidos.numero único.
--
-- Tudo roda numa transação: se qualquer passo falhar, NADA é aplicado.
-- Não exige mudança no código do app.
-- =====================================================================

begin;

-- ---------- 0) Pré-checagens (param com mensagem clara se algo estiver fora do esperado) ----------
do $$
declare
  ruins text;
begin
  if exists (select 1 from public.ficha_tecnica ft
              where not exists (select 1 from public.insumos i where i.id = ft.insumo_id)) then
    raise exception 'ficha_tecnica tem insumo_id que não existe em insumos. Corrija antes de aplicar.';
  end if;

  if exists (select 1 from public.movimentacoes_estoque m
              where not exists (select 1 from public.insumos i where i.id = m.insumo_id)) then
    raise exception 'movimentacoes_estoque tem insumo_id que não existe em insumos. Corrija antes de aplicar.';
  end if;

  select string_agg(distinct coalesce(unidade_medida, '(nulo)'), ', ')
    into ruins
    from public.insumos
   where unidade_medida is null or unidade_medida not in ('kg', 'g', 'l', 'ml', 'un', 'cx');
  if ruins is not null then
    raise exception 'insumos.unidade_medida com valores fora do padrão (kg, g, l, ml, un, cx): %', ruins;
  end if;
end $$;

-- ---------- 1) total calculado pelo banco ----------
create or replace function public.kika_calcular_total_pedido()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.total := greatest(
    0,
    round(coalesce(new.subtotal, 0) + coalesce(new.taxa_entrega, 0) - coalesce(new.desconto, 0), 2)
  );
  return new;
end;
$$;

-- Nome com "d": roda DEPOIS do guard (trg_pedidos_b_guard), que compara o registro novo com o antigo.
drop trigger if exists trg_pedidos_d_total on public.pedidos;
create trigger trg_pedidos_d_total
  before insert or update of subtotal, taxa_entrega, desconto, total
  on public.pedidos
  for each row execute function public.kika_calcular_total_pedido();

-- ---------- 2) pagamento só depois que o pedido sai de 'pendente' ----------
create or replace function public.kika_registrar_pagamento()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.pago
     and coalesce(new.total, 0) > 0
     and new.status not in ('pendente', 'cancelado')
     and not exists (select 1 from public.pedido_pagamentos where pedido_id = new.id) then
    insert into public.pedido_pagamentos (pedido_id, forma, valor, sessao_id)
    values (
      new.id,
      public.kika_forma_norm(new.forma_pagamento),
      new.total,
      (select id from public.caixa_sessoes where status = 'aberto' limit 1)
    );
  end if;
  return new;
end;
$function$;

-- ---------- 3) corrigir dados existentes ----------
-- Desliga SÓ o trigger de pagamento durante o ajuste, para não criar pagamentos
-- de pedidos antigos dentro do caixa que estiver aberto agora.
alter table public.pedidos disable trigger trg_kika_registrar_pagamento;

update public.pedidos
   set total = greatest(0, round(coalesce(subtotal, 0) + coalesce(taxa_entrega, 0) - coalesce(desconto, 0), 2))
 where total is null
    or (subtotal > 0 and total is distinct from
        greatest(0, round(subtotal + coalesce(taxa_entrega, 0) - coalesce(desconto, 0), 2)));

alter table public.pedidos enable trigger trg_kika_registrar_pagamento;

alter table public.pedidos alter column total set default 0;
alter table public.pedidos alter column total set not null;
alter table public.pedidos drop constraint if exists pedidos_total_check;
alter table public.pedidos add constraint pedidos_total_check check (total >= 0);

-- Pedidos pagos sem nenhuma linha de pagamento. Entram SEM sessão de caixa (sessao_id nulo):
-- existem para conciliação, mas não alteram o "esperado" de nenhum fechamento.
insert into public.pedido_pagamentos (pedido_id, forma, valor, sessao_id)
select p.id, public.kika_forma_norm(p.forma_pagamento), p.total, null
  from public.pedidos p
 where p.pago
   and p.total > 0
   and p.status <> 'cancelado'
   and not exists (select 1 from public.pedido_pagamentos g where g.pedido_id = p.id);

-- ---------- 4) chaves estrangeiras ----------
alter table public.ficha_tecnica
  drop constraint if exists ficha_tecnica_insumo_id_fkey;
alter table public.ficha_tecnica
  add constraint ficha_tecnica_insumo_id_fkey
  foreign key (insumo_id) references public.insumos (id) on delete restrict;

alter table public.movimentacoes_estoque
  drop constraint if exists movimentacoes_estoque_insumo_id_fkey;
alter table public.movimentacoes_estoque
  add constraint movimentacoes_estoque_insumo_id_fkey
  foreign key (insumo_id) references public.insumos (id) on delete restrict;

-- Apagar uma categoria de insumo deixava de apagar os insumos em cascata (e levava junto
-- fichas e histórico). Agora o banco recusa se a categoria ainda tiver insumos.
alter table public.insumos drop constraint if exists insumos_categoria_id_fkey;
alter table public.insumos
  add constraint insumos_categoria_id_fkey
  foreign key (categoria_id) references public.categorias_insumos (id) on delete restrict;

-- ---------- 5) insumos: colunas obrigatórias ----------
update public.insumos
   set quantidade_atual = coalesce(quantidade_atual, 0),
       estoque_minimo   = coalesce(estoque_minimo, 0),
       custo_unitario   = coalesce(custo_unitario, 0)
 where quantidade_atual is null or estoque_minimo is null or custo_unitario is null;

alter table public.insumos
  alter column quantidade_atual set not null,
  alter column estoque_minimo   set not null,
  alter column custo_unitario   set not null,
  alter column unidade_medida   set not null;

-- Sem CHECK em quantidade_atual de propósito: se a contagem do sistema divergir da real,
-- o banco não pode bloquear a venda.
alter table public.insumos drop constraint if exists insumos_estoque_minimo_check;
alter table public.insumos add constraint insumos_estoque_minimo_check check (estoque_minimo >= 0);
alter table public.insumos drop constraint if exists insumos_custo_unitario_check;
alter table public.insumos add constraint insumos_custo_unitario_check check (custo_unitario >= 0);
alter table public.insumos drop constraint if exists insumos_unidade_medida_check;
alter table public.insumos add constraint insumos_unidade_medida_check
  check (unidade_medida in ('kg', 'g', 'l', 'ml', 'un', 'cx'));

-- ---------- 6) numero do pedido único ----------
create unique index if not exists pedidos_numero_key on public.pedidos (numero);

commit;

-- =====================================================================
-- VERIFICAÇÃO (rode depois; cada uma deve retornar 0):
--
--   select count(*) from public.pedidos where total is null;
--
--   select count(*) from public.pedidos p
--    where p.pago and p.total > 0 and p.status <> 'cancelado'
--      and not exists (select 1 from public.pedido_pagamentos g where g.pedido_id = p.id);
--
-- TESTE NO APP (logado):
--   a) PDV: pedido DELIVERY com taxa, já marcado como pago. Em /pedidos o valor deve ser
--      itens + taxa (não R$ 0,00) e deve existir 1 linha em pedido_pagamentos com esse valor.
--   b) Garçom: lance um pedido de mesa e abra "mesas abertas": o total da mesa deve aparecer.
--
-- ROLLBACK (só se precisar desfazer o total calculado):
--   drop trigger if exists trg_pedidos_d_total on public.pedidos;
--   drop function if exists public.kika_calcular_total_pedido();
--   alter table public.pedidos alter column total drop not null;
-- =====================================================================
