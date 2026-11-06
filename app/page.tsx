'use client'

import Link from 'next/link'
import { RequireRole, usePerfil } from '@/components/RequireRole'
import SignOutButton from '@/components/SignOutButton'
import { DISPLAY } from '@/lib/ui'
import { ROTAS } from '@/lib/rotas'

type Bloco = { titulo: string; descricao: string; href: string; icone: string; cor: string }

function Cartao({ item }: { item: Bloco }) {
  return (
    <Link
      href={item.href}
      className={`group flex flex-col justify-between rounded-2xl border bg-gradient-to-br ${item.cor} p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-3xl">{item.icone}</span>
          <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">Acessar ➔</span>
        </div>
        <h3 className={`${DISPLAY} text-lg font-bold text-white group-hover:text-marca transition-colors`}>{item.titulo}</h3>
        <p className="text-xs text-slate-400 font-medium leading-relaxed">{item.descricao}</p>
      </div>
    </Link>
  )
}

function Dashboard() {
  const perfil = usePerfil()

  const eAdminOuDev = perfil.role === 'admin' || perfil.role === 'dev'

  // Cada perfil só vê os atalhos das telas que pode abrir (mesma regra das páginas).
  const podeAcessar = (href: string) =>
    Object.values(ROTAS).find((r) => r.href === href)?.roles.includes(perfil.role) ?? false

  const blocosOperacionais = [
    {
      titulo: 'PDV (Caixa)',
      descricao: 'Mesas, Balcão, Retirada e Entrega com faturamento unificado.',
      href: '/pdv',
      icone: '🖥️',
      cor: 'from-marca/20 to-marca/5 border-marca/30 text-marca',
    },
    {
      titulo: 'Acompanhar Pedidos',
      descricao: 'Monitoramento em tempo real, pagamentos e status das vendas.',
      href: '/pedidos',
      icone: '📊',
      cor: 'from-blue-600/20 to-blue-950/40 border-blue-500/30 text-blue-400',
    },
    {
      titulo: 'KDS (Cozinha)',
      descricao: 'Tela touch de preparo com números grandes de mesa/comanda.',
      href: '/kds',
      icone: '👨‍🍳',
      cor: 'from-red-600/20 to-red-950/40 border-red-500/30 text-red-400',
    },
    {
      titulo: 'App do Garçom',
      descricao: 'Lançamento rápido por etapas (Mesa, Comanda e Pedidos).',
      href: '/garcom',
      icone: '🪑',
      cor: 'from-emerald-600/20 to-emerald-950/40 border-emerald-500/30 text-emerald-400',
    },
    {
      titulo: 'Controle de Caixa',
      descricao: 'Abertura com fundo de troco, sangrias, reforços e fechamento conferido.',
      href: '/caixa',
      icone: '🧮',
      cor: 'from-amber-600/20 to-amber-950/40 border-amber-500/30 text-amber-400',
    },
    {
      titulo: 'Entregador',
      descricao: 'Controle de rotas com fechamento automático para faturamento.',
      href: '/entregador',
      icone: '🛵',
      cor: 'from-purple-600/20 to-purple-950/40 border-purple-500/30 text-purple-400',
    },
    {
      titulo: 'Insumos',
      descricao: 'Matérias-primas, entradas de compra, contagem e alertas de estoque mínimo.',
      href: '/admin/insumos',
      icone: '📦',
      cor: 'from-cyan-600/20 to-cyan-950/40 border-cyan-500/30 text-cyan-400',
    },
    {
      titulo: 'Fichas Técnicas',
      descricao: 'Quanto de cada insumo vai em cada produto e tamanho; calcula o CMV e baixa o estoque.',
      href: '/admin/fichas',
      icone: '📐',
      cor: 'from-cyan-600/20 to-cyan-950/40 border-cyan-500/30 text-cyan-400',
    },
    {
      titulo: 'Cardápio e Produtos',
      descricao: 'Cadastre e edite produtos, categorias, tamanhos e preços de venda.',
      href: '/admin/cardapio',
      icone: '📋',
      cor: 'from-cyan-600/20 to-cyan-950/40 border-cyan-500/30 text-cyan-400',
    },
    {
      titulo: 'Lista de Compras',
      descricao: 'Sugestão automática de reposição a partir do estoque mínimo dos insumos.',
      href: '/admin/compras',
      icone: '🛒',
      cor: 'from-cyan-600/20 to-cyan-950/40 border-cyan-500/30 text-cyan-400',
    },
  ]

  const estiloGestao = 'from-slate-700/30 to-slate-900/50 border-slate-600/40 text-slate-300'

  // Financeiro: resultado das vendas.
  const blocosFinanceiros = [
    {
      titulo: 'Dashboard',
      descricao: 'Faturamento, pedidos, mais vendidos, horário de pico e alertas em gráficos.',
      href: '/admin/dashboard',
      icone: '📈',
      cor: estiloGestao,
    },
    {
      titulo: 'DRE',
      descricao: 'Resultado do período, CMV e margem por produto.',
      href: '/admin/financeiro',
      icone: '🧾',
      cor: estiloGestao,
    },
    {
      titulo: 'Contas a pagar/receber',
      descricao: 'Despesas fixas e variáveis e outras receitas, por vencimento.',
      href: '/admin/contas',
      icone: '💳',
      cor: estiloGestao,
    },
  ]

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-fundo text-slate-100 antialiased select-none">
      <header className="flex h-16 items-center justify-between border-b border-white/10 bg-superficie px-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍕</span>
          <div>
            <h1 className={`${DISPLAY} text-lg font-bold text-white tracking-wide`}>
              Kikas Pizzaria <span className="text-marca">&</span> Petiscaria
            </h1>
            <p className="text-[10px] text-slate-400">
              Operador: <strong className="text-marca">{perfil.nome || 'Usuário'}</strong> | Perfil: <span className="uppercase text-white font-bold">{perfil.role}</span>
            </p>
          </div>
        </div>

        <SignOutButton className="rounded-xl border border-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/10 transition-colors" />
      </header>

      <main className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <span className="text-lg">⚡</span>
            <h2 className={`${DISPLAY} text-xl font-bold text-white tracking-wide`}>
              Setor Operacional
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {blocosOperacionais.filter((item) => podeAcessar(item.href)).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex flex-col justify-between rounded-2xl border bg-gradient-to-br ${item.cor} p-5 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{item.icone}</span>
                    <span className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      Acessar ➔
                    </span>
                  </div>
                  <h3 className={`${DISPLAY} text-lg font-bold text-white group-hover:text-marca transition-colors`}>
                    {item.titulo}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    {item.descricao}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {eAdminOuDev && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <span className="text-lg">💰</span>
                <h2 className={`${DISPLAY} text-xl font-bold text-white tracking-wide`}>Financeiro</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {blocosFinanceiros.map((item) => <Cartao key={item.href} item={item} />)}
              </div>
            </section>
        )}
      </main>

      <footer className="py-4 text-center border-t border-white/5 bg-rodape">
        <p className="text-[11px] text-slate-500 font-medium">
          Desenvolvido por <span className="text-slate-300 font-semibold">Matheus Thomaz</span>
        </p>
      </footer>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <RequireRole roles={ROTAS.hub.roles}>
      <Dashboard />
    </RequireRole>
  )
}
