// Tabela de taxas de entrega por cidade e bairro.
//
// EDITE AQUI: os valores abaixo são EXEMPLOS. Troque pelas cidades, bairros e taxas reais da Kikas.
// Ao escolher cidade + bairro no PDV, a taxa é preenchida sozinha (o caixa ainda pode ajustar à mão).
// Quando quiser gerenciar isso pelo painel admin, esta lista pode virar uma tabela no Supabase
// sem mudar a assinatura de `taxaDoBairro`.

export interface BairroTaxa { bairro: string; taxa: number }
export interface CidadeTaxas { cidade: string; bairros: BairroTaxa[] }

export const TAXAS_ENTREGA: CidadeTaxas[] = [
  {
    cidade: 'Cidade principal',
    bairros: [
      { bairro: 'Centro', taxa: 5 },
      { bairro: 'Bairro 2', taxa: 7 },
      { bairro: 'Bairro 3', taxa: 10 },
    ],
  },
]

/** Valor usado quando o caixa escolhe "Outro bairro" e ainda não digitou a taxa. */
export const OUTRO = '__outro__'

export const cidades = () => TAXAS_ENTREGA.map((c) => c.cidade)

export const bairrosDaCidade = (cidade: string): BairroTaxa[] =>
  TAXAS_ENTREGA.find((c) => c.cidade === cidade)?.bairros ?? []

/** Taxa cadastrada para cidade + bairro; null se não houver (caixa digita manualmente). */
export function taxaDoBairro(cidade: string, bairro: string): number | null {
  return bairrosDaCidade(cidade).find((b) => b.bairro === bairro)?.taxa ?? null
}
