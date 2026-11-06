-- Habilita o tipo de pedido "retirada" (cliente busca no balcão).
-- Rode UMA vez no SQL Editor do Supabase ANTES de usar a aba Retirada no PDV.
-- Ajuste conforme o desenho da Etapa 1: o script cobre os dois casos comuns (enum ou CHECK).

do $$
begin
  -- Caso 1: coluna usa ENUM (ex.: tipo_pedido)
  if exists (select 1 from pg_type where typname = 'tipo_pedido') then
    alter type tipo_pedido add value if not exists 'retirada';
  end if;
end $$;

-- Caso 2: coluna usa CHECK constraint. Descomente e ajuste o nome se for o seu caso:
-- alter table public.pedidos drop constraint if exists pedidos_tipo_check;
-- alter table public.pedidos add constraint pedidos_tipo_check
--   check (tipo in ('delivery','mesa','balcao','retirada'));
