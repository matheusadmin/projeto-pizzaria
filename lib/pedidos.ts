import { supabase } from '@/lib/supabase/client'
import { round2, type CartItem, type PedidoMeta } from '@/lib/types'
import { OUTRO } from '@/lib/taxasEntrega'
import { soDigitos } from '@/lib/whatsapp'

/** Extrai mensagem legível de erros do Supabase (PostgrestError não é instância de Error). */
export function msgErro(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'object' && e && 'message' in e) return String((e as { message: unknown }).message)
  return 'Erro inesperado. Tente novamente.'
}

function validar(itens: CartItem[], meta: PedidoMeta): string | null {
  if (itens.length === 0) return 'Adicione pelo menos um item ao pedido.'
  if (meta.tipo === 'mesa' && !meta.mesa.trim()) return 'Informe o número da mesa.'
  if (meta.tipo === 'delivery' && !meta.endereco.trim()) return 'Informe o endereço de entrega.'
  if (meta.tipo === 'retirada' && !meta.clienteNome.trim()) return 'Informe o nome de quem vai retirar.'
  return null
}

/**
 * Cria o pedido em 3 passos para que a cozinha NUNCA veja um pedido incompleto:
 *  1) insere o pedido como 'pendente' (o KDS só lista 'em_preparo');
 *  2) insere os itens (o trigger recalcula o subtotal);
 *  3) muda para 'em_preparo' -> o banco dá baixa no estoque e o KDS recebe via Realtime.
 * Se algo falhar depois do passo 1, o pedido é marcado como 'cancelado'
 * (o caixa não tem permissão de DELETE, por desenho da Etapa 1).
 */
export async function finalizarPedido(itens: CartItem[], meta: PedidoMeta) {
  const problema = validar(itens, meta)
  if (problema) throw new Error(problema)

  const delivery = meta.tipo === 'delivery'
  const bairro = meta.bairro && meta.bairro !== OUTRO ? meta.bairro : ''
  const enderecoCompleto = [meta.endereco.trim(), bairro, meta.cidade].filter(Boolean).join(', ')

  const { data: pedido, error: errPedido } = await supabase
    .from('pedidos')
    .insert({
      tipo: meta.tipo,
      status: 'pendente',
      mesa: meta.tipo === 'mesa' ? meta.mesa.trim() : null,
      cliente_nome: meta.clienteNome.trim() || null,
      // Só dígitos: o cadastro por telefone (CRM) reconhece o mesmo cliente em qualquer formatação.
      cliente_telefone: soDigitos(meta.clienteTelefone) || null,
      endereco_entrega: delivery ? enderecoCompleto : null,
      taxa_entrega: delivery ? round2(meta.taxaEntrega) : 0,
      forma_pagamento: meta.formaPagamento || null,
      pago: meta.pago,
      observacoes: meta.observacoes.trim() || null,
    })
    .select('id, numero')
    .single()
  if (errPedido) throw errPedido

  const cancelar = () =>
    supabase.from('pedidos').update({ status: 'cancelado' }).eq('id', pedido.id)

  const { error: errItens } = await supabase.from('itens_pedido').insert(
    itens.map((i) => ({
      pedido_id: pedido.id,
      produto_id: i.produto_id,
      tamanho_id: i.tamanho_id,
      nome_produto: i.nome_produto,
      nome_tamanho: i.nome_tamanho,
      quantidade: i.quantidade,
      preco_unitario: i.preco_unitario,
      observacoes: i.observacoes || null,
    }))
  )
  if (errItens) {
    await cancelar()
    throw errItens
  }

  const { error: errStatus } = await supabase
    .from('pedidos')
    .update({ status: 'em_preparo' })
    .eq('id', pedido.id)
  if (errStatus) {
    await cancelar()
    throw errStatus
  }

  return pedido as { id: string; numero: number }
}
