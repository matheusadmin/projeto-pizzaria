-- Caixa (abertura/sangria/reforço/fechamento), pagamentos por pedido (suporta divisão)
-- e contas a pagar/receber. Rode UMA vez no SQL Editor do Supabase.
-- Depende apenas das tabelas já existentes: pedidos (id, status, pago, total, forma_pagamento) e perfis (id, role, ativo).

-- ---------- Helper de permissão (usa a tabela perfis) ----------
create or replace function public.kika_tem_role(roles text[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = auth.uid() and p.ativo and p.role::text = any (roles)
  );
$$;

-- Normaliza o texto livre de forma_pagamento ('pix', 'Pix', 'cartao_credito', 'Cartão de Crédito'...).
create or replace function public.kika_forma_norm(f text)
returns text
language sql immutable
as $$
  select case
    when f is null then 'outro'
    when lower(f) like '%pix%' then 'pix'
    when lower(f) like '%dinheiro%' then 'dinheiro'
    when lower(f) like '%cr%dito%' then 'credito'
    when lower(f) like '%d%bito%' then 'debito'
    else 'outro'
  end;
$$;

-- ---------- Caixa ----------
create table if not exists public.caixa_sessoes (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'aberto' check (status in ('aberto', 'fechado')),
  aberto_por uuid references auth.users (id),
  aberto_por_nome text,
  aberto_em timestamptz not null default now(),
  fundo_inicial numeric(12,2) not null default 0 check (fundo_inicial >= 0),
  fechado_por uuid references auth.users (id),
  fechado_por_nome text,
  fechado_em timestamptz,
  esperado jsonb,            -- { dinheiro, pix, credito, debito, outro }
  contado jsonb,             -- idem, o que o operador conferiu
  diferenca numeric(12,2),   -- contado - esperado (total)
  observacoes text
);

-- Só pode existir UM caixa aberto por vez.
create unique index if not exists caixa_um_aberto on public.caixa_sessoes ((status)) where status = 'aberto';

create table if not exists public.caixa_movimentos (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references public.caixa_sessoes (id) on delete cascade,
  tipo text not null check (tipo in ('sangria', 'reforco')),
  valor numeric(12,2) not null check (valor > 0),
  motivo text,
  criado_por uuid references auth.users (id),
  criado_por_nome text,
  created_at timestamptz not null default now()
);
create index if not exists caixa_movimentos_sessao on public.caixa_movimentos (sessao_id);

-- ---------- Pagamentos por pedido (um pedido pode ter vários) ----------
create table if not exists public.pedido_pagamentos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  forma text not null check (forma in ('dinheiro', 'pix', 'credito', 'debito', 'outro')),
  valor numeric(12,2) not null check (valor > 0),
  sessao_id uuid references public.caixa_sessoes (id),
  created_at timestamptz not null default now()
);
create index if not exists pedido_pagamentos_pedido on public.pedido_pagamentos (pedido_id);
create index if not exists pedido_pagamentos_sessao on public.pedido_pagamentos (sessao_id);

-- Quando um pedido passa a "pago" e ainda não tem pagamentos lançados, registra um pagamento único
-- (forma_pagamento + total) no caixa aberto. Se a tela dividiu o pagamento, ela já inseriu as linhas
-- antes e o trigger não faz nada. total > 0: no PDV o total só existe depois que os itens entram.
create or replace function public.kika_registrar_pagamento()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.pago and coalesce(new.total, 0) > 0 and new.status <> 'cancelado'
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
$$;

drop trigger if exists trg_kika_registrar_pagamento on public.pedidos;
create trigger trg_kika_registrar_pagamento
  after insert or update of pago, total, status on public.pedidos
  for each row execute function public.kika_registrar_pagamento();

-- ---------- Contas a pagar / receber ----------
create table if not exists public.contas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('pagar', 'receber')),
  descricao text not null,
  categoria text not null default 'Outros',
  fornecedor_cliente text,
  valor numeric(12,2) not null check (valor > 0),
  vencimento date not null,
  pago_em date,                     -- preenchido quando quitada
  cancelada boolean not null default false,
  observacoes text,
  created_at timestamptz not null default now()
);
create index if not exists contas_vencimento on public.contas (vencimento);

-- ---------- RLS ----------
alter table public.caixa_sessoes enable row level security;
alter table public.caixa_movimentos enable row level security;
alter table public.pedido_pagamentos enable row level security;
alter table public.contas enable row level security;

-- Caixa: admin, dev e caixa.
drop policy if exists caixa_sessoes_all on public.caixa_sessoes;
create policy caixa_sessoes_all on public.caixa_sessoes
  for all to authenticated
  using (public.kika_tem_role(array['admin', 'dev', 'caixa']))
  with check (public.kika_tem_role(array['admin', 'dev', 'caixa']));

drop policy if exists caixa_movimentos_all on public.caixa_movimentos;
create policy caixa_movimentos_all on public.caixa_movimentos
  for all to authenticated
  using (public.kika_tem_role(array['admin', 'dev', 'caixa']))
  with check (public.kika_tem_role(array['admin', 'dev', 'caixa']));

drop policy if exists pedido_pagamentos_all on public.pedido_pagamentos;
create policy pedido_pagamentos_all on public.pedido_pagamentos
  for all to authenticated
  using (public.kika_tem_role(array['admin', 'dev', 'caixa']))
  with check (public.kika_tem_role(array['admin', 'dev', 'caixa']));

-- Contas: só admin e dev.
drop policy if exists contas_all on public.contas;
create policy contas_all on public.contas
  for all to authenticated
  using (public.kika_tem_role(array['admin', 'dev']))
  with check (public.kika_tem_role(array['admin', 'dev']));
