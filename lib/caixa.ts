// Controle de caixa: abertura, sangria/reforço, conferência e fechamento.
import { supabase } from '@/lib/supabase/client'
import { round2 } from '@/lib/types'

export type FormaCaixa = 'dinheiro' | 'pix' | 'credito' | 'debito' | 'outro'

export const FORMAS_CAIXA: { value: FormaCaixa; label: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'Pix' },
  { value: 'credito', label: 'Cartão de crédito' },
  { value: 'debito', label: 'Cartão de débito' },
  { value: 'outro', label: 'Outro' },
]

export type TotaisForma = Record<FormaCaixa, number>

export const totaisVazios = (): TotaisForma => ({ dinheiro: 0, pix: 0, credito: 0, debito: 0, outro: 0 })

export interface SessaoCaixa {
  id: string
  status: 'aberto' | 'fechado'
  aberto_por_nome: string | null
  aberto_em: string
  fundo_inicial: number
  fechado_por_nome: string | null
  fechado_em: string | null
  esperado: TotaisForma | null
  contado: TotaisForma | null
  diferenca: number | null
  observacoes: string | null
}

export interface MovimentoCaixa {
  id: string
  sessao_id: string
  tipo: 'sangria' | 'reforco'
  valor: number
  motivo: string | null
  criado_por_nome: string | null
  created_at: string
}

const COLUNAS_SESSAO =
  'id, status, aberto_por_nome, aberto_em, fundo_inicial, fechado_por_nome, fechado_em, esperado, contado, diferenca, observacoes'

export async function buscarSessaoAberta(): Promise<SessaoCaixa | null> {
  const { data, error } = await supabase
    .from('caixa_sessoes').select(COLUNAS_SESSAO).eq('status', 'aberto').maybeSingle()
  if (error) throw error
  return data as SessaoCaixa | null
}

export async function listarSessoesFechadas(limite = 15): Promise<SessaoCaixa[]> {
  const { data, error } = await supabase
    .from('caixa_sessoes').select(COLUNAS_SESSAO).eq('status', 'fechado')
    .order('fechado_em', { ascending: false }).limit(limite)
  if (error) throw error
  return data as SessaoCaixa[]
}

export async function abrirCaixa(fundoInicial: number, perfil: { id: string; nome: string }) {
  const { error } = await supabase.from('caixa_sessoes').insert({
    fundo_inicial: round2(fundoInicial),
    aberto_por: perfil.id || null,
    aberto_por_nome: perfil.nome,
  })
  if (error) throw error
}

export async function listarMovimentos(sessaoId: string): Promise<MovimentoCaixa[]> {
  const { data, error } = await supabase
    .from('caixa_movimentos').select('id, sessao_id, tipo, valor, motivo, criado_por_nome, created_at')
    .eq('sessao_id', sessaoId).order('created_at', { ascending: true })
  if (error) throw error
  return data as MovimentoCaixa[]
}

export async function registrarMovimento(
  sessaoId: string, tipo: 'sangria' | 'reforco', valor: number, motivo: string,
  perfil: { id: string; nome: string },
) {
  const { error } = await supabase.from('caixa_movimentos').insert({
    sessao_id: sessaoId, tipo, valor: round2(valor), motivo: motivo.trim() || null,
    criado_por: perfil.id || null, criado_por_nome: perfil.nome,
  })
  if (error) throw error
}

/** Vendas recebidas na sessão, somadas por forma de pagamento (pedidos cancelados ficam de fora). */
export async function vendasDaSessao(sessaoId: string): Promise<TotaisForma> {
  const { data, error } = await supabase
    .from('pedido_pagamentos')
    .select('forma, valor, pedidos!inner(status)')
    .eq('sessao_id', sessaoId)
    .neq('pedidos.status', 'cancelado')
  if (error) throw error
  const t = totaisVazios()
  for (const r of (data ?? []) as unknown as { forma: FormaCaixa; valor: number }[]) {
    t[r.forma] = round2(t[r.forma] + Number(r.valor))
  }
  return t
}

/**
 * Valor que deveria existir em cada forma. Só o dinheiro é afetado por fundo, reforços e sangrias,
 * porque são movimentações físicas da gaveta.
 */
export function calcularEsperado(
  sessao: Pick<SessaoCaixa, 'fundo_inicial'>, vendas: TotaisForma, movimentos: MovimentoCaixa[],
): TotaisForma {
  const reforcos = movimentos.filter((m) => m.tipo === 'reforco').reduce((a, m) => a + Number(m.valor), 0)
  const sangrias = movimentos.filter((m) => m.tipo === 'sangria').reduce((a, m) => a + Number(m.valor), 0)
  return { ...vendas, dinheiro: round2(Number(sessao.fundo_inicial) + vendas.dinheiro + reforcos - sangrias) }
}

export const somaTotais = (t: TotaisForma) => round2(Object.values(t).reduce((a, v) => a + v, 0))

export async function fecharCaixa(
  sessaoId: string, esperado: TotaisForma, contado: TotaisForma, observacoes: string,
  perfil: { id: string; nome: string },
) {
  const { error } = await supabase.from('caixa_sessoes').update({
    status: 'fechado',
    fechado_em: new Date().toISOString(),
    fechado_por: perfil.id || null,
    fechado_por_nome: perfil.nome,
    esperado, contado,
    diferenca: round2(somaTotais(contado) - somaTotais(esperado)),
    observacoes: observacoes.trim() || null,
  }).eq('id', sessaoId).eq('status', 'aberto')
  if (error) throw error
}

/** Id do caixa aberto (ou null). Usado ao dividir pagamentos para vincular as linhas à sessão. */
export async function idSessaoAberta(): Promise<string | null> {
  const s = await buscarSessaoAberta()
  return s?.id ?? null
}
