// Contas a pagar e a receber (alimentam o DRE).
import { supabase } from '@/lib/supabase/client'
import { iso } from '@/lib/periodo'
import { round2 } from '@/lib/types'

export type TipoConta = 'pagar' | 'receber'

export interface Conta {
  id: string
  tipo: TipoConta
  descricao: string
  categoria: string
  fornecedor_cliente: string | null
  valor: number
  vencimento: string      // YYYY-MM-DD
  pago_em: string | null
  cancelada: boolean
  observacoes: string | null
}

export const CATEGORIAS_PAGAR = [
  'Fornecedores / Insumos', 'Aluguel', 'Água', 'Energia', 'Gás', 'Internet / Telefone',
  'Salários', 'Impostos', 'Manutenção', 'Marketing', 'Outros',
]
export const CATEGORIAS_RECEBER = ['Eventos / Encomendas', 'Convênios', 'Fiado', 'Outros']

export type SituacaoConta = 'paga' | 'vencida' | 'a_vencer' | 'cancelada'

export function situacaoConta(c: Pick<Conta, 'pago_em' | 'cancelada' | 'vencimento'>, hoje = iso(new Date())): SituacaoConta {
  if (c.cancelada) return 'cancelada'
  if (c.pago_em) return 'paga'
  return c.vencimento < hoje ? 'vencida' : 'a_vencer'
}

const COLUNAS = 'id, tipo, descricao, categoria, fornecedor_cliente, valor, vencimento, pago_em, cancelada, observacoes'

/** Contas com vencimento dentro do período (datas locais inclusivas). */
export async function listarContas(de: string, ate: string): Promise<Conta[]> {
  const { data, error } = await supabase
    .from('contas').select(COLUNAS).gte('vencimento', de).lte('vencimento', ate)
    .order('vencimento', { ascending: true })
  if (error) throw error
  return (data as Conta[]).map((c) => ({ ...c, valor: Number(c.valor) }))
}

export type NovaConta = Omit<Conta, 'id' | 'pago_em' | 'cancelada'> & { pago_em?: string | null }

export async function criarConta(c: NovaConta) {
  const { error } = await supabase.from('contas').insert({ ...c, valor: round2(c.valor) })
  if (error) throw error
}

export async function atualizarConta(id: string, patch: Partial<Omit<Conta, 'id'>>) {
  const { error } = await supabase.from('contas').update(patch).eq('id', id)
  if (error) throw error
}

export interface ResumoContas { despesas: number; outrasReceitas: number; despesasPagas: number; despesasAbertas: number }

export function resumirContas(contas: Conta[]): ResumoContas {
  const r: ResumoContas = { despesas: 0, outrasReceitas: 0, despesasPagas: 0, despesasAbertas: 0 }
  for (const c of contas) {
    if (c.cancelada) continue
    if (c.tipo === 'pagar') {
      r.despesas += c.valor
      if (c.pago_em) r.despesasPagas += c.valor
      else r.despesasAbertas += c.valor
    } else {
      r.outrasReceitas += c.valor
    }
  }
  return {
    despesas: round2(r.despesas), outrasReceitas: round2(r.outrasReceitas),
    despesasPagas: round2(r.despesasPagas), despesasAbertas: round2(r.despesasAbertas),
  }
}
