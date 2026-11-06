'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { brl } from '@/lib/types'
import { DISPLAY } from '@/lib/ui'

interface ItemPedido {
  id: string
  nome_produto: string
  nome_tamanho: string
  quantidade: number
  preco_unitario: number
  observacoes: string | null
}

interface PedidoAberto {
  id: string
  numero: number
  tipo: 'mesa' | 'balcao' | 'retirada' | 'delivery'
  mesa: string | null
  status: string
  pago: boolean
  cliente_nome: string | null
  cliente_telefone: string | null
  endereco_entrega: string | null
  taxa_entrega: number
  subtotal: number
  total: number
  observacoes: string | null
  created_at: string
  itens_pedido: ItemPedido[]
}

interface Props {
  onClose: () => void
  onSucesso: () => void
}

export default function PedidosAbertosModal({ onClose, onSucesso }: Props) {
  const [pedidos, setPedidos] = useState<PedidoAberto[]>([])
  const [aba, setAba] = useState<'mesa' | 'balcao' | 'delivery'>('mesa')
  const [loading, setLoading] = useState(true)
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoAberto | null>(null)

  // Campos do Modal de Pagamento e Fechamento no Caixa
  const [descontoTipo, setDescontoTipo] = useState<'valor' | 'porcentagem'>('valor')
  const [descontoValor, setDescontoValor] = useState<number>(0)
  const [taxaEntrega, setTaxaEntrega] = useState<number>(0)
  const [entregadorNome, setEntregadorNome] = useState<string>('')
  const [formaPagamento, setFormaPagamento] = useState<string>('Pix')
  const [liquidando, setLiquidando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Busca APENAS pedidos com pago = false (pendentes de recebimento no Caixa)
  const carregarPedidos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('pedidos')
      .select('*, itens_pedido(*)')
      .eq('pago', false)
      .neq('status', 'cancelado')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setPedidos(data as PedidoAberto[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    carregarPedidos()
  }, [carregarPedidos])

  function abrirCheckout(p: PedidoAberto) {
    setPedidoSelecionado(p)
    setTaxaEntrega(p.taxa_entrega || 0)
    setDescontoValor(0)
    setErro(null)
  }

  // Retirada aparece junto do Balcão: os dois são pagos e entregues no próprio caixa.
  const pedidosFiltrados = pedidos.filter((p) => (aba === 'balcao' ? p.tipo === 'balcao' || p.tipo === 'retirada' : p.tipo === aba))

  // Cálculos do Checkout
  const subtotal = pedidoSelecionado ? pedidoSelecionado.subtotal || pedidoSelecionado.total : 0
  const valorDesconto = pedidoSelecionado
    ? descontoTipo === 'valor'
      ? descontoValor
      : (subtotal * descontoValor) / 100
    : 0
  const totalFinal = Math.max(0, subtotal + taxaEntrega - valorDesconto)

  // Apenas AQUI no Caixa a venda é dada como PAGA e contabilizada no DRE
  async function liquidarConta() {
    if (!pedidoSelecionado) return
    setLiquidando(true)
    setErro(null)

    try {
      const obsAtualizada = [
        pedidoSelecionado.observacoes,
        entregadorNome.trim() ? `Entregador: ${entregadorNome.trim()}` : null,
      ]
        .filter(Boolean)
        .join(' | ')

      const { error } = await supabase
        .from('pedidos')
        .update({
          pago: true, // REGRA CRÍTICA: Contabiliza no DRE do financeiro
          status: 'entregue', // Ciclo concluído
          taxa_entrega: taxaEntrega,
          desconto: valorDesconto,
          total: totalFinal,
          forma_pagamento: formaPagamento,
          observacoes: obsAtualizada,
        })
        .eq('id', pedidoSelecionado.id)

      if (error) throw error

      setPedidoSelecionado(null)
      carregarPedidos()
      onSucesso()
    } catch (e: any) {
      setErro(e.message || 'Erro ao liquidar pedido.')
    } finally {
      setLiquidando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-superficie-alta text-slate-100 shadow-2xl border border-white/10 overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-superficie">
          <div>
            <h2 className={`${DISPLAY} text-2xl font-bold text-marca`}>📋 Caixas & Frentes Pendentes de Recebimento</h2>
            <p className="text-xs text-slate-400">Somente pedidos com pagamento confirmado pelo Caixa entram na DRE/Financeiro.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20">
            ✕ Fechar
          </button>
        </div>

        {/* Abas por Frente */}
        <div className="flex border-b border-white/10 bg-fundo px-6">
          <button
            type="button"
            onClick={() => setAba('mesa')}
            className={
              'flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-bold transition-colors ' +
              (aba === 'mesa' ? 'border-marca text-marca bg-marca/10' : 'border-transparent text-slate-400 hover:text-white')
            }
          >
            🪑 Mesas Ativas ({pedidos.filter((p) => p.tipo === 'mesa').length})
          </button>
          <button
            type="button"
            onClick={() => setAba('balcao')}
            className={
              'flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-bold transition-colors ' +
              (aba === 'balcao' ? 'border-marca text-marca bg-marca/10' : 'border-transparent text-slate-400 hover:text-white')
            }
          >
            📦 Balcão / Retirada ({pedidos.filter((p) => p.tipo === 'balcao' || p.tipo === 'retirada').length})
          </button>
          <button
            type="button"
            onClick={() => setAba('delivery')}
            className={
              'flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-bold transition-colors ' +
              (aba === 'delivery' ? 'border-marca text-marca bg-marca/10' : 'border-transparent text-slate-400 hover:text-white')
            }
          >
            🛵 Deliveries em Rota / Aguardando Caixa ({pedidos.filter((p) => p.tipo === 'delivery').length})
          </button>
        </div>

        {/* Lista de Pedidos */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="py-20 text-center text-slate-400">Carregando contas pendentes…</p>
          ) : pedidosFiltrados.length === 0 ? (
            <div className="py-24 text-center space-y-2">
              <p className={`${DISPLAY} text-3xl font-semibold text-slate-500`}>Nenhuma conta pendente nesta frente</p>
              <p className="text-sm text-slate-400">Todos os pedidos foram devidamente recebidos e liquidados no Caixa.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pedidosFiltrados.map((p) => {
                const retornouDoEntregador = p.status === 'entregue' && !p.pago
                return (
                  <div key={p.id} className={`flex flex-col justify-between rounded-lg border p-4 shadow ${retornouDoEntregador ? 'border-emerald-500/80 bg-emerald-950/20' : 'border-white/10 bg-superficie'}`}>
                    <div>
                      <div className="flex justify-between items-start border-b border-white/10 pb-2 mb-3">
                        <div>
                          <span className={`${DISPLAY} text-2xl font-bold text-white`}>
                            {p.tipo === 'mesa' ? `Mesa ${p.mesa || '?'}` : `#${p.numero}`}
                          </span>
                          <span className="block text-xs text-slate-400">Pedido #{p.numero}</span>
                        </div>
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${retornouDoEntregador ? 'bg-emerald-500 text-black' : 'bg-marca/20 text-marca'}`}>
                          {retornouDoEntregador ? '🛵 Motoboy Retornou' : p.status}
                        </span>
                      </div>

                      {p.cliente_nome && <p className="text-sm font-medium text-slate-200">👤 {p.cliente_nome}</p>}
                      {p.endereco_entrega && <p className="text-xs text-slate-400 mt-0.5">📍 {p.endereco_entrega}</p>}

                      <div className="mt-3 space-y-1 bg-black/20 p-2 rounded text-xs border border-white/5">
                        {p.itens_pedido?.map((item) => (
                          <div key={item.id} className="flex justify-between text-slate-300">
                            <span>{item.quantidade}x {item.nome_produto} ({item.nome_tamanho})</span>
                            <span className="font-semibold text-slate-200">{brl(item.preco_unitario * item.quantidade)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <span className="block text-xs text-slate-400">A Receber</span>
                        <span className={`${DISPLAY} text-xl font-bold text-marca`}>{brl(p.total)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => abrirCheckout(p)}
                        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors shadow"
                      >
                        💳 Receber & Baixar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Checkout / Fechamento de Conta */}
      {pedidoSelecionado && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-xl bg-superficie-alta p-6 text-slate-100 border border-marca/30 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className={`${DISPLAY} text-2xl font-bold text-marca`}>
                Conferência de Recebimento — {pedidoSelecionado.tipo === 'mesa' ? `Mesa ${pedidoSelecionado.mesa}` : `Pedido #${pedidoSelecionado.numero}`}
              </h3>
              <button type="button" onClick={() => setPedidoSelecionado(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-sm">
              {/* Formas de Pagamento */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Forma de Pagamento Confirmada no Caixa</label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="w-full rounded-md border border-white/20 bg-superficie p-2.5 text-white font-medium focus:outline-none focus:border-marca"
                >
                  <option value="Pix">📱 Pix</option>
                  <option value="Cartão de Crédito">💳 Cartão de Crédito</option>
                  <option value="Cartão de Débito">💳 Cartão de Débito</option>
                  <option value="Dinheiro">💵 Dinheiro (Troco conferido)</option>
                  <option value="Múltiplo (Split)">🔀 Múltiplo (Split)</option>
                </select>
              </div>

              {/* Taxa de Entrega (Se Delivery) */}
              {pedidoSelecionado.tipo === 'delivery' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Taxa de Entrega (R$)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={taxaEntrega}
                      onChange={(e) => setTaxaEntrega(Number(e.target.value))}
                      className="w-full rounded-md border border-white/20 bg-superficie p-2 text-white font-medium focus:outline-none focus:border-marca"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Entregador Responsável</label>
                    <input
                      type="text"
                      placeholder="Nome do Motoboy"
                      value={entregadorNome}
                      onChange={(e) => setEntregadorNome(e.target.value)}
                      className="w-full rounded-md border border-white/20 bg-superficie p-2 text-white font-medium focus:outline-none focus:border-marca"
                    />
                  </div>
                </div>
              )}

              {/* Desconto */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300">Desconto Concedido</label>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setDescontoTipo('valor')}
                      className={`px-2 py-0.5 rounded ${descontoTipo === 'valor' ? 'bg-marca text-fundo' : 'bg-white/10 text-slate-400'}`}
                    >
                      R$
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescontoTipo('porcentagem')}
                      className={`px-2 py-0.5 rounded ${descontoTipo === 'porcentagem' ? 'bg-marca text-fundo' : 'bg-white/10 text-slate-400'}`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  step="0.5"
                  value={descontoValor}
                  onChange={(e) => setDescontoValor(Number(e.target.value))}
                  className="w-full rounded-md border border-white/20 bg-superficie p-2 text-white font-medium focus:outline-none focus:border-marca"
                />
              </div>

              {/* Resumo dos Valores */}
              <div className="rounded-lg bg-superficie p-3 space-y-1.5 border border-white/10 pt-3">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Valor dos Produtos:</span>
                  <span>{brl(subtotal)}</span>
                </div>
                {taxaEntrega > 0 && (
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Taxa de Entrega:</span>
                    <span>+{brl(taxaEntrega)}</span>
                  </div>
                )}
                {valorDesconto > 0 && (
                  <div className="flex justify-between text-xs text-emerald-400">
                    <span>Desconto:</span>
                    <span>-{brl(valorDesconto)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-white border-t border-white/10 pt-2">
                  <span>Valor Efetivamente Recebido:</span>
                  <span className={`${DISPLAY} text-2xl text-marca`}>{brl(totalFinal)}</span>
                </div>
              </div>
            </div>

            {erro && <p className="text-xs text-red-400 font-semibold">{erro}</p>}

            <button
              type="button"
              onClick={liquidarConta}
              disabled={liquidando}
              className="w-full rounded-md bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 shadow-lg text-base"
            >
              {liquidando ? 'Registrando entrada no Caixa…' : '✅ Confirmar Recebimento e Gravar na DRE'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
