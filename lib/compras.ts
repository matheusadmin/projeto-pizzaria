// Lista de compras sugerida a partir do estoque mínimo dos insumos.
import { supabase } from '@/lib/supabase/client'
import { fmtQtd, nivelEstoque, type Insumo, type NivelEstoque } from '@/lib/admin'

export interface ItemCompra {
  insumo: Insumo
  nivel: NivelEstoque
  /** Quantidade sugerida para repor até `cobertura` vezes o estoque mínimo. */
  sugerido: number
  custoEstimado: number
}

export async function buscarInsumos(): Promise<Insumo[]> {
  const { data, error } = await supabase
    .from('insumos')
    .select('id, nome, unidade_medida, quantidade_atual, estoque_minimo, custo_unitario')
    .order('nome', { ascending: true })
  if (error) throw error
  return (data as Insumo[]).map((i) => ({
    ...i,
    quantidade_atual: Number(i.quantidade_atual),
    estoque_minimo: Number(i.estoque_minimo),
    custo_unitario: Number(i.custo_unitario),
  }))
}

/**
 * Insumos abaixo do mínimo (ou exatamente nele) com a quantidade para voltar ao nível-alvo.
 * cobertura = 2 significa "ter o dobro do mínimo depois da compra".
 */
export function montarLista(insumos: Insumo[], cobertura: number): ItemCompra[] {
  return insumos
    .filter((i) => i.estoque_minimo > 0)
    .map((i) => ({ insumo: i, nivel: nivelEstoque(i) }))
    .filter((x) => x.nivel !== 'ok')
    .map(({ insumo, nivel }) => {
      const sugerido = Math.max(0, Math.ceil((insumo.estoque_minimo * cobertura - insumo.quantidade_atual) * 1000) / 1000)
      return { insumo, nivel, sugerido, custoEstimado: sugerido * insumo.custo_unitario }
    })
    .sort((a, b) => (a.nivel === b.nivel ? a.insumo.nome.localeCompare(b.insumo.nome) : a.nivel === 'abaixo' ? -1 : 1))
}

/** Texto pronto para copiar ou enviar por WhatsApp ao fornecedor. */
export function textoLista(itens: ItemCompra[]): string {
  const linhas = itens.map((i) => `• ${i.insumo.nome}: ${fmtQtd(i.sugerido)} ${i.insumo.unidade_medida}`)
  return ['Lista de compras - Kikas Pizzaria', ...linhas].join('\n')
}
