import type { Role } from '@/lib/types'

export interface Rota {
  href: string
  rotulo: string
  roles: Role[]
}

const TODOS: Role[] = ['admin', 'dev', 'caixa', 'cozinha', 'entregador']

/**
 * Fonte única de quem pode acessar cada tela.
 * Usada pelas páginas (RequireRole), pelo hub (app/page.tsx) e pela barra de navegação.
 */
const rota = (href: string, rotulo: string, roles: Role[]): Rota => ({ href, rotulo, roles })

export const ROTAS = {
  hub: rota('/', 'Início', TODOS),
  pdv: rota('/pdv', 'PDV', ['admin', 'dev', 'caixa']),
  pedidos: rota('/pedidos', 'Pedidos', TODOS),
  kds: rota('/kds', 'KDS', ['admin', 'dev', 'caixa', 'cozinha']),
  garcom: rota('/garcom', 'Garçom', ['admin', 'dev', 'caixa']),
  caixa: rota('/caixa', 'Caixa', ['admin', 'dev', 'caixa']),
  entregador: rota('/entregador', 'Entregador', TODOS),
  insumos: rota('/admin/insumos', 'Insumos', ['admin', 'dev']),
  fichas: rota('/admin/fichas', 'Fichas', ['admin', 'dev']),
  compras: rota('/admin/compras', 'Compras', ['admin', 'dev']),
  cardapio: rota('/admin/cardapio', 'Cardápio', ['admin', 'dev']),
  dashboard: rota('/admin/dashboard', 'Dashboard', ['admin', 'dev']),
  financeiro: rota('/admin/financeiro', 'DRE', ['admin', 'dev']),
  contas: rota('/admin/contas', 'Contas', ['admin', 'dev']),
}

/** Ordem dos links na barra de navegação. Cada tela tem o seu próprio item (sem agrupamentos). */
export const MENU: Rota[] = [
  ROTAS.hub,
  ROTAS.pdv,
  ROTAS.pedidos,
  ROTAS.kds,
  ROTAS.garcom,
  ROTAS.caixa,
  ROTAS.entregador,
  ROTAS.insumos,
  ROTAS.fichas,
  ROTAS.compras,
  ROTAS.cardapio,
  ROTAS.dashboard,
  ROTAS.financeiro,
  ROTAS.contas,
]

/** Primeira rota administrativa: o menu desenha um separador antes dela. */
export const PRIMEIRA_ROTA_ADMIN = ROTAS.insumos.href
