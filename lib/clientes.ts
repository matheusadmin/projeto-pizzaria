// CRM leve: reconhece o cliente pelo telefone a partir do histórico de pedidos (sem tabela nova).
import { supabase } from '@/lib/supabase/client'
import { soDigitos } from '@/lib/whatsapp'
import { TAXAS_ENTREGA, bairrosDaCidade, taxaDoBairro } from '@/lib/taxasEntrega'

export interface ClienteConhecido {
  nome: string | null
  telefone: string
  endereco: string        // rua e número
  cidade: string
  bairro: string
  taxa: number | null
  totalPedidos: number
  ultimoPedidoEm: string
  favorito: { produto: string; vezes: number } | null
}

interface LinhaPedido {
  cliente_nome: string | null
  endereco_entrega: string | null
  created_at: string
  itens_pedido: { nome_produto: string; quantidade: number }[] | null
}

/** O endereço é gravado como "rua, bairro, cidade". Devolve as partes que batem com a tabela de taxas. */
export function separarEndereco(texto: string): { endereco: string; cidade: string; bairro: string } {
  const partes = texto.split(',').map((p) => p.trim()).filter(Boolean)
  const cidade = TAXAS_ENTREGA.find((c) => partes.includes(c.cidade))?.cidade ?? ''
  const bairro = cidade ? bairrosDaCidade(cidade).find((b) => partes.includes(b.bairro))?.bairro ?? '' : ''
  const resto = partes.filter((p) => p !== cidade && p !== bairro)
  return { endereco: resto.join(', '), cidade, bairro }
}

export async function buscarClientePorTelefone(telefone: string): Promise<ClienteConhecido | null> {
  const digitos = soDigitos(telefone)
  if (digitos.length < 10) return null

  const { data, error } = await supabase
    .from('pedidos')
    .select('cliente_nome, endereco_entrega, created_at, itens_pedido(nome_produto, quantidade)')
    .eq('cliente_telefone', digitos)
    .neq('status', 'cancelado')
    .order('created_at', { ascending: false })
    .limit(30)
  if (error || !data || data.length === 0) return null

  const pedidos = data as unknown as LinhaPedido[]
  const contagem = new Map<string, number>()
  for (const p of pedidos) {
    for (const i of p.itens_pedido ?? []) {
      contagem.set(i.nome_produto, (contagem.get(i.nome_produto) ?? 0) + Number(i.quantidade))
    }
  }
  const top = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]

  const comEndereco = pedidos.find((p) => p.endereco_entrega)
  const end = comEndereco?.endereco_entrega
    ? separarEndereco(comEndereco.endereco_entrega)
    : { endereco: '', cidade: '', bairro: '' }

  return {
    nome: pedidos.find((p) => p.cliente_nome)?.cliente_nome ?? null,
    telefone: digitos,
    ...end,
    taxa: end.cidade && end.bairro ? taxaDoBairro(end.cidade, end.bairro) : null,
    totalPedidos: pedidos.length,
    ultimoPedidoEm: pedidos[0].created_at,
    favorito: top ? { produto: top[0], vezes: top[1] } : null,
  }
}
