// Tipos e utilidades do painel administrativo.

export type UnidadeMedida = 'kg' | 'g' | 'l' | 'ml' | 'un'

export const UNIDADES: { value: UnidadeMedida; label: string }[] = [
  { value: 'kg', label: 'Quilo (kg)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'l', label: 'Litro (l)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'un', label: 'Unidade (un)' },
]

export interface Insumo {
  id: string
  nome: string
  unidade_medida: UnidadeMedida
  quantidade_atual: number
  estoque_minimo: number
  custo_unitario: number
}

export interface TamanhoAdmin { id: string; nome_tamanho: string; preco_venda: number }

export interface ProdutoAdmin {
  id: string
  nome: string
  disponivel: boolean
  categoria: string
  produto_tamanhos: TamanhoAdmin[]
}

export interface CmvTamanho {
  tamanho_id: string
  produto_id: string
  produto: string
  nome_tamanho: string
  preco_venda: number
  cmv: number
  margem_bruta: number
}

export interface Dre {
  qtd_pedidos: number
  faturamento_bruto: number
  total_descontos: number
  receita_liquida: number
  cmv_total: number
  lucro_bruto: number
  margem_bruta_pct: number | null
  total_taxas_entrega: number
  ticket_medio: number
}

// ---------- Estoque ----------
export type NivelEstoque = 'abaixo' | 'no_minimo' | 'ok'

export function nivelEstoque(i: Pick<Insumo, 'quantidade_atual' | 'estoque_minimo'>): NivelEstoque {
  if (i.quantidade_atual < i.estoque_minimo) return 'abaixo'
  if (i.estoque_minimo > 0 && i.quantidade_atual === i.estoque_minimo) return 'no_minimo'
  return 'ok'
}

// ---------- CMV ----------
/** Meta padrão de CMV (% do preço de venda). Pizzarias e hamburguerias costumam mirar 30% a 35%. */
export const META_CMV_PADRAO = 35

export type NivelMargem = 'boa' | 'atencao' | 'ruim' | 'sem_ficha'

/** Compara o CMV% com a meta: até a meta = boa; até meta+10 pontos = atenção; acima = ruim. */
export function nivelMargem(cmvPct: number | null, meta: number): NivelMargem {
  if (cmvPct == null) return 'sem_ficha'
  if (cmvPct <= meta) return 'boa'
  if (cmvPct <= meta + 10) return 'atencao'
  return 'ruim'
}

export const COR_NIVEL: Record<NivelMargem, { texto: string; fundo: string; rotulo: string }> = {
  boa: { texto: 'text-[#2F7D4F]', fundo: 'bg-[#2F7D4F]', rotulo: 'Dentro da meta' },
  atencao: { texto: 'text-[#8A6500]', fundo: 'bg-[#F2B705]', rotulo: 'Atenção' },
  ruim: { texto: 'text-[#D7372B]', fundo: 'bg-[#D7372B]', rotulo: 'Margem baixa' },
  sem_ficha: { texto: 'text-slate-500', fundo: 'bg-slate-400', rotulo: 'Sem ficha técnica' },
}

// ---------- Formatação ----------
export const fmtQtd = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })

export const brl4 = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4 })

export const fmtPct = (n: number | null | undefined) =>
  n == null ? '—' : `${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

/** Aceita "1,5", "0.5" e "1.234,56". Retorna null se vazio ou inválido. */
export function parseNum(s: string): number | null {
  let t = s.trim()
  if (!t) return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** Número -> texto de input em pt-BR. */
export const numParaInput = (n: number) => String(n).replace('.', ',')

export const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
