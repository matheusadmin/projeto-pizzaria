// Dados e agregações do Dashboard (admin). Funções puras, fáceis de testar.
import { supabase } from '@/lib/supabase/client'
import { iso } from '@/lib/periodo'

export interface ItemVenda {
  nome_produto: string
  nome_tamanho: string
  quantidade: number
  preco_unitario: number
}

export interface PedidoVenda {
  id: string
  tipo: string
  status: string
  subtotal: number
  desconto: number
  taxa_entrega: number
  total: number
  forma_pagamento: string | null
  created_at: string
  itens_pedido: ItemVenda[]
}

const SELECT = `
  id, tipo, status, subtotal, desconto, taxa_entrega, total, forma_pagamento, created_at,
  itens_pedido ( nome_produto, nome_tamanho, quantidade, preco_unitario )
`
const PAGINA = 1000 // o Supabase devolve no máximo 1000 linhas por consulta

/** Pedidos confirmados do período [inicio, fim). Pagina para não perder vendas em períodos longos. */
export async function buscarPedidosPeriodo(inicio: string, fim: string): Promise<PedidoVenda[]> {
  const todos: PedidoVenda[] = []
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await supabase
      .from('pedidos')
      .select(SELECT)
      .gte('created_at', inicio)
      .lt('created_at', fim)
      .not('status', 'in', '(cancelado,pendente)')
      .order('created_at', { ascending: true })
      .range(de, de + PAGINA - 1)
    if (error) throw error
    const lote = data as unknown as PedidoVenda[]
    todos.push(...lote)
    if (lote.length < PAGINA) break
  }
  return todos
}

const n = (v: unknown) => Number(v) || 0

export interface Ponto { rotulo: string; valor: number; dica?: string }

const ddmm = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

/** Faturamento (valor dos itens) por dia, com zero nos dias sem venda. */
export function faturamentoPorDia(pedidos: PedidoVenda[], de: string, ate: string): Ponto[] {
  const soma = new Map<string, number>()
  for (const p of pedidos) {
    const k = iso(new Date(p.created_at))
    soma.set(k, (soma.get(k) ?? 0) + n(p.subtotal))
  }
  const dias: Ponto[] = []
  const fim = new Date(`${ate}T00:00:00`)
  for (const d = new Date(`${de}T00:00:00`); d <= fim; d.setDate(d.getDate() + 1)) {
    dias.push({ rotulo: ddmm(d), valor: soma.get(iso(d)) ?? 0 })
  }
  return dias
}

/** Quantidade de pedidos por hora do dia (horário de pico). */
export function pedidosPorHora(pedidos: PedidoVenda[]): Ponto[] {
  const horas = Array.from({ length: 24 }, (_, h) => ({ rotulo: `${h}h`, valor: 0 }))
  for (const p of pedidos) horas[new Date(p.created_at).getHours()].valor += 1
  return horas
}

const CANAIS: Record<string, string> = { mesa: 'Salão', balcao: 'Balcão', retirada: 'Retirada', delivery: 'Entrega' }

export function faturamentoPorCanal(pedidos: PedidoVenda[]): Ponto[] {
  const m = new Map<string, number>()
  for (const p of pedidos) {
    const r = CANAIS[p.tipo] ?? p.tipo
    m.set(r, (m.get(r) ?? 0) + n(p.subtotal))
  }
  return [...m.entries()].map(([rotulo, valor]) => ({ rotulo, valor })).sort((a, b) => b.valor - a.valor)
}

// forma_pagamento chega como 'pix' (PDV) ou 'Pix' (caixa): normaliza para um rótulo único.
function rotuloPagamento(v: string | null): string {
  if (!v) return 'Não informado'
  const t = v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (t.includes('misto') || t.includes('multiplo') || t.includes('split')) return 'Misto'
  if (t.includes('pix')) return 'Pix'
  if (t.includes('dinheiro')) return 'Dinheiro'
  if (t.includes('credito')) return 'Crédito'
  if (t.includes('debito')) return 'Débito'
  return 'Outro'
}

export function faturamentoPorPagamento(pedidos: PedidoVenda[]): Ponto[] {
  const m = new Map<string, number>()
  for (const p of pedidos) {
    const r = rotuloPagamento(p.forma_pagamento)
    m.set(r, (m.get(r) ?? 0) + n(p.subtotal))
  }
  return [...m.entries()].map(([rotulo, valor]) => ({ rotulo, valor })).sort((a, b) => b.valor - a.valor)
}

export interface ProdutoVendido { produto: string; quantidade: number; receita: number }

/** Mais vendidos por quantidade (soma todos os tamanhos do mesmo produto). */
export function maisVendidos(pedidos: PedidoVenda[], limite = 8): ProdutoVendido[] {
  const m = new Map<string, ProdutoVendido>()
  for (const p of pedidos) {
    for (const i of p.itens_pedido ?? []) {
      const atual = m.get(i.nome_produto) ?? { produto: i.nome_produto, quantidade: 0, receita: 0 }
      atual.quantidade += n(i.quantidade)
      atual.receita += n(i.quantidade) * n(i.preco_unitario)
      m.set(i.nome_produto, atual)
    }
  }
  return [...m.values()].sort((a, b) => b.quantidade - a.quantidade).slice(0, limite)
}

/** Variação percentual; null quando não há base de comparação. */
export const variacao = (atual: number, anterior: number | null | undefined): number | null =>
  anterior == null || anterior === 0 ? null : ((atual - anterior) / anterior) * 100
