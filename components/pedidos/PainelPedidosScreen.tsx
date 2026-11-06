'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { brl, round2 } from '@/lib/types'
import { parseNum } from '@/lib/admin'
import { FORMAS_CAIXA, idSessaoAberta, type FormaCaixa } from '@/lib/caixa'
import { linkWhatsApp, mensagemPedido } from '@/lib/whatsapp'
import { DISPLAY } from '@/lib/ui'
import SignOutButton from '@/components/SignOutButton'
import Link from 'next/link'

interface ItemPedido {
  id: string
  nome_produto: string
  nome_tamanho: string
  quantidade: number
  preco_unitario: number
  observacoes: string | null
}

interface PedidoAcompanhamento {
  id: string
  numero: number
  tipo: 'mesa' | 'balcao' | 'retirada' | 'delivery'
  mesa: string | null
  status: 'pendente' | 'em_preparo' | 'pronto' | 'saiu_para_entrega' | 'entregue' | 'cancelado'
  pago: boolean
  cliente_nome: string | null
  cliente_telefone: string | null
  endereco_entrega: string | null
  taxa_entrega: number
  desconto: number
  subtotal: number
  total: number
  forma_pagamento: string | null
  observacoes: string | null
  created_at: string
  itens_pedido: ItemPedido[]
}

const BADGES_STATUS: Record<string, { rotulo: string; classe: string }> = {
  pendente: { rotulo: '⏳ Pendente', classe: 'bg-slate-600 text-white' },
  em_preparo: { rotulo: '🔥 Em Preparo na Cozinha', classe: 'bg-yellow-500 text-black font-bold animate-pulse' },
  pronto: { rotulo: '🔔 Pronto / Expedição', classe: 'bg-blue-500 text-white font-bold' },
  saiu_para_entrega: { rotulo: '🛵 Saiu para Entrega', classe: 'bg-purple-600 text-white font-bold' },
  entregue: { rotulo: '✅ Entregue / Aguardando Baixa', classe: 'bg-emerald-600 text-white font-bold' },
  cancelado: { rotulo: '❌ Cancelado', classe: 'bg-red-600 text-white font-bold' },
}

export default function PainelPedidosScreen() {
  const [pedidos, setPedidos] = useState<PedidoAcompanhamento[]>([])
  const [loading, setLoading] = useState(true)
  const [conectado, setConectado] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'mesa' | 'balcao' | 'retirada' | 'delivery'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'ativos' | 'todos' | 'pago' | 'pendente_pagamento'>('ativos')
  const [busca, setBusca] = useState('')
  
  // Modais
  const [pedidoDetalhe, setPedidoDetalhe] = useState<PedidoAcompanhamento | null>(null)
  const [pedidoCheckout, setPedidoCheckout] = useState<PedidoAcompanhamento | null>(null)

  // Estados do Form de Baixa Financeira
  const [descontoTipo, setDescontoTipo] = useState<'valor' | 'porcentagem'>('valor')
  const [descontoValor, setDescontoValor] = useState<number>(0)
  const [taxaEntrega, setTaxaEntrega] = useState<number>(0)
  const [entregadorNome, setEntregadorNome] = useState<string>('')
  const [formaPagamento, setFormaPagamento] = useState<string>('Pix')
  const [liquidando, setLiquidando] = useState(false)
  // Divisão do pagamento (forma "Múltiplo"): cada parte vira uma linha em pedido_pagamentos.
  const [partes, setPartes] = useState<{ forma: FormaCaixa; valorTxt: string }[]>([
    { forma: 'pix', valorTxt: '' },
    { forma: 'dinheiro', valorTxt: '' },
  ])
  const [erro, setErro] = useState<string | null>(null)

  const carregarPedidos = useCallback(async () => {
    let query = supabase
      .from('pedidos')
      .select('*, itens_pedido(*)')
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (!error && data) {
      setPedidos(data as PedidoAcompanhamento[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    carregarPedidos()

    const canal = supabase
      .channel('painel-pedidos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        carregarPedidos()
      })
      .subscribe((status) => {
        setConectado(status === 'SUBSCRIBED')
      })

    const interval = setInterval(carregarPedidos, 15000)

    return () => {
      clearInterval(interval)
      supabase.removeChannel(canal)
    }
  }, [carregarPedidos])

  function abrirBaixaPagamento(p: PedidoAcompanhamento) {
    setPedidoCheckout(p)
    setTaxaEntrega(p.taxa_entrega || 0)
    setDescontoValor(p.desconto || 0)
    setFormaPagamento(p.forma_pagamento && p.forma_pagamento !== 'Misto' ? p.forma_pagamento : 'Pix')
    setPartes([{ forma: 'pix', valorTxt: '' }, { forma: 'dinheiro', valorTxt: '' }])
    setErro(null)
  }

  // Ação de Baixa e Liquidação no Caixa
  async function liquidarPagamento() {
    if (!pedidoCheckout) return
    setLiquidando(true)
    setErro(null)

    try {
      const sub = pedidoCheckout.subtotal || pedidoCheckout.total
      const valorDescontoCalculado = descontoTipo === 'valor' ? descontoValor : (sub * descontoValor) / 100
      const totalFinal = Math.max(0, sub + taxaEntrega - valorDescontoCalculado)

      const obsAtualizada = [
        pedidoCheckout.observacoes,
        entregadorNome.trim() ? `Entregador: ${entregadorNome.trim()}` : null,
      ]
        .filter(Boolean)
        .join(' | ')

      // Pagamento dividido: grava as partes ANTES de marcar como pago (o banco só cria o
      // pagamento único automaticamente quando o pedido ainda não tem nenhuma parte).
      const dividido = formaPagamento === 'Múltiplo (Split)'
      if (dividido) {
        const linhas = partes
          .map((x) => ({ forma: x.forma, valor: parseNum(x.valorTxt) ?? 0 }))
          .filter((x) => x.valor > 0)
        const soma = linhas.reduce((a, x) => a + x.valor, 0)
        if (linhas.length < 2) throw new Error('Informe pelo menos duas formas de pagamento para dividir a conta.')
        if (Math.abs(soma - totalFinal) > 0.009) {
          throw new Error(`A soma das partes (${brl(soma)}) precisa ser igual ao total (${brl(totalFinal)}).`)
        }
        const sessaoId = await idSessaoAberta()
        const { error: errPg } = await supabase.from('pedido_pagamentos').insert(
          linhas.map((x) => ({ pedido_id: pedidoCheckout.id, forma: x.forma, valor: round2(x.valor), sessao_id: sessaoId })),
        )
        if (errPg) throw errPg
      }

      const { error } = await supabase
        .from('pedidos')
        .update({
          pago: true, // Gravado como pago para entrar no DRE e Financeiro
          status: 'entregue',
          taxa_entrega: taxaEntrega,
          desconto: valorDescontoCalculado,
          total: totalFinal,
          forma_pagamento: dividido ? 'Misto' : formaPagamento,
          observacoes: obsAtualizada,
        })
        .eq('id', pedidoCheckout.id)

      if (error) {
        if (dividido) await supabase.from('pedido_pagamentos').delete().eq('pedido_id', pedidoCheckout.id)
        throw error
      }

      setPedidoCheckout(null)
      carregarPedidos()
    } catch (e: any) {
      setErro(e.message || 'Erro ao processar baixa de pagamento.')
    } finally {
      setLiquidando(false)
    }
  }

  // Filtragem dinâmica
  const pedidosFiltrados = pedidos.filter((p) => {
    if (filtroTipo !== 'todos' && p.tipo !== filtroTipo) return false

    if (filtroStatus === 'ativos' && (p.status === 'cancelado' || (p.status === 'entregue' && p.pago))) {
      return false
    }
    if (filtroStatus === 'pago' && !p.pago) return false
    if (filtroStatus === 'pendente_pagamento' && (p.pago || p.status === 'cancelado')) return false

    if (busca.trim()) {
      const q = busca.toLowerCase().trim()
      const numMatch = String(p.numero).includes(q)
      const clienteMatch = p.cliente_nome?.toLowerCase().includes(q)
      const mesaMatch = p.mesa?.toLowerCase().includes(q)
      if (!numMatch && !clienteMatch && !mesaMatch) return false
    }

    return true
  })

  // Cálculos do checkout em modal
  const subtotalCheckout = pedidoCheckout ? pedidoCheckout.subtotal || pedidoCheckout.total : 0
  const valorDescontoModal = pedidoCheckout
    ? descontoTipo === 'valor'
      ? descontoValor
      : (subtotalCheckout * descontoValor) / 100
    : 0
  const totalFinalModal = Math.max(0, subtotalCheckout + taxaEntrega - valorDescontoModal)

  return (
    <div className="flex h-screen flex-col bg-fundo text-slate-100">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-center justify-between border-b border-white/10 bg-superficie px-6 py-3 gap-3">
        <div className="flex items-center gap-4">
          <h1 className={`${DISPLAY} text-2xl font-bold text-marca`}>📊 Central de Acompanhamento & Caixa</h1>
          <span className="flex items-center gap-2 text-xs" role="status">
            <span className={`h-2.5 w-2.5 rounded-full ${conectado ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {conectado ? 'Tempo Real Ativo' : 'Conectando…'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/pdv" className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold hover:bg-white/10">
            ← Ir para PDV
          </Link>
          <SignOutButton className="rounded-md border border-white/30 px-3 py-1.5 text-xs font-medium hover:bg-white/10" />
        </div>
      </header>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-superficie-alta px-6 py-3 gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por Origem/Tipo */}
          <div className="flex rounded-md bg-fundo p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setFiltroTipo('todos')}
              className={`rounded px-3 py-1 text-xs font-semibold ${filtroTipo === 'todos' ? 'bg-marca text-fundo' : 'text-slate-400 hover:text-white'}`}
            >
              Todos os Canais
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipo('mesa')}
              className={`rounded px-3 py-1 text-xs font-semibold ${filtroTipo === 'mesa' ? 'bg-marca text-fundo' : 'text-slate-400 hover:text-white'}`}
            >
              🪑 Mesas
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipo('balcao')}
              className={`rounded px-3 py-1 text-xs font-semibold ${filtroTipo === 'balcao' ? 'bg-marca text-fundo' : 'text-slate-400 hover:text-white'}`}
            >
              📦 Balcão
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipo('retirada')}
              className={`rounded px-3 py-1 text-xs font-semibold ${filtroTipo === 'retirada' ? 'bg-marca text-fundo' : 'text-slate-400 hover:text-white'}`}
            >
              🛍️ Retirada
            </button>
            <button
              type="button"
              onClick={() => setFiltroTipo('delivery')}
              className={`rounded px-3 py-1 text-xs font-semibold ${filtroTipo === 'delivery' ? 'bg-marca text-fundo' : 'text-slate-400 hover:text-white'}`}
            >
              🛵 Delivery
            </button>
          </div>

          {/* Filtro por Situação/Status */}
          <select
            value={filtroStatus}
            onChange={(e: any) => setFiltroStatus(e.target.value)}
            className="rounded-md border border-white/20 bg-fundo px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-marca"
          >
            <option value="ativos">🔥 Somente Pedidos em Andamento</option>
            <option value="pendente_pagamento">💳 Pendentes de Recebimento no Caixa</option>
            <option value="pago">✅ Liquidados / Pagos</option>
            <option value="todos">📜 Histórico Completo</option>
          </select>
        </div>

        {/* Busca por Número / Cliente / Mesa */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="🔍 Buscar por Nº, Cliente ou Mesa..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-md border border-white/20 bg-fundo px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-marca"
          />
        </div>
      </div>

      {/* Tabela Principal */}
      <main className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <p className="py-20 text-center text-slate-400">Carregando central de acompanhamento…</p>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="py-24 text-center space-y-2">
            <p className={`${DISPLAY} text-3xl font-semibold text-slate-500`}>Nenhum pedido encontrado</p>
            <p className="text-xs text-slate-400">Novos pedidos efetuados serão exibidos em tempo real.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-superficie-alta shadow-xl">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="border-b border-white/10 bg-superficie text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Nº / Hora</th>
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Cliente / Detalhe</th>
                  <th className="px-4 py-3">Etapa Atual</th>
                  <th className="px-4 py-3">Situação Financeira</th>
                  <th className="px-4 py-3 text-right">Valor Total</th>
                  <th className="px-4 py-3 text-center">Ações & Liquidação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pedidosFiltrados.map((p) => {
                  const statusInfo = BADGES_STATUS[p.status] || { rotulo: p.status, classe: 'bg-slate-700 text-white' }
                  const hora = new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  const motoboyRetornou = p.status === 'entregue' && !p.pago

                  return (
                    <tr key={p.id} className={`hover:bg-white/5 transition-colors ${motoboyRetornou ? 'bg-emerald-950/20' : ''}`}>
                      <td className="px-4 py-3 font-semibold text-white">
                        <span className={`${DISPLAY} text-xl text-marca block`}>#{p.numero}</span>
                        <span className="text-[10px] text-slate-400">{hora}</span>
                      </td>

                      <td className="px-4 py-3">
                        {p.tipo === 'mesa' && <span className="rounded bg-purple-900/50 text-purple-300 border border-purple-500/30 px-2 py-0.5 text-xs font-semibold">🪑 Mesa {p.mesa || '?'}</span>}
                        {p.tipo === 'balcao' && <span className="rounded bg-marca/15 text-marca border border-marca/30 px-2 py-0.5 text-xs font-semibold">📦 Balcão</span>}
                        {p.tipo === 'retirada' && <span className="rounded bg-emerald-900/50 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-xs font-semibold">🛍️ Retirada</span>}
                        {p.tipo === 'delivery' && <span className="rounded bg-blue-900/50 text-blue-300 border border-blue-500/30 px-2 py-0.5 text-xs font-semibold">🛵 Delivery</span>}
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-100 text-xs">{p.cliente_nome || 'Cliente Salão/Caixa'}</p>
                        {p.endereco_entrega && <p className="text-[11px] text-slate-400 truncate max-w-xs">📍 {p.endereco_entrega}</p>}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-block rounded px-2.5 py-1 text-xs font-semibold ${statusInfo.classe}`}>
                          {motoboyRetornou ? '🛵 Motoboy Retornou' : statusInfo.rotulo}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {p.pago ? (
                          <span className="rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 text-xs font-semibold">
                            ✅ Pago ({p.forma_pagamento || 'Conf.'})
                          </span>
                        ) : (
                          <span className="rounded bg-yellow-950/80 border border-yellow-500/40 text-yellow-300 px-2 py-0.5 text-xs font-semibold">
                            ⏳ Aguardando Baixa
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-slate-100 tabular-nums">
                        {brl(p.total)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!p.pago && p.status !== 'cancelado' ? (
                            <button
                              type="button"
                              onClick={() => abrirBaixaPagamento(p)}
                              className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow flex items-center gap-1"
                            >
                              💳 Receber & Baixar
                            </button>
                          ) : null}

                          {(() => {
                            const msg = p.cliente_telefone ? mensagemPedido(p) : null
                            return msg ? (
                              <a
                                href={linkWhatsApp(p.cliente_telefone, msg)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded bg-emerald-900/60 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-800/70 transition-colors"
                              >
                                💬 Avisar cliente
                              </a>
                            ) : null
                          })()}

                          <button
                            type="button"
                            onClick={() => setPedidoDetalhe(p)}
                            className="rounded bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/20 transition-colors"
                          >
                            👁️ Detalhes
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal de Baixa / Liquidação Financeira */}
      {pedidoCheckout && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-xl bg-superficie-alta p-6 text-slate-100 border border-marca/40 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className={`${DISPLAY} text-2xl font-bold text-marca`}>
                  Liquidar Pedido #{pedidoCheckout.numero}
                </h3>
                <span className="text-xs text-slate-400">
                  {pedidoCheckout.tipo === 'mesa' ? `Mesa ${pedidoCheckout.mesa}` : `Cliente: ${pedidoCheckout.cliente_nome || 'N/I'}`}
                </span>
              </div>
              <button type="button" onClick={() => setPedidoCheckout(null)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Forma de Pagamento */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Forma de Pagamento Confirmada</label>
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="w-full rounded-md border border-white/20 bg-superficie p-2.5 text-white font-medium focus:outline-none focus:border-marca text-sm"
                >
                  <option value="Pix">📱 Pix</option>
                  <option value="Cartão de Crédito">💳 Cartão de Crédito</option>
                  <option value="Cartão de Débito">💳 Cartão de Débito</option>
                  <option value="Dinheiro">💵 Dinheiro (Troco conferido)</option>
                  <option value="Múltiplo (Split)">🔀 Dividir pagamento (várias formas)</option>
                </select>
              </div>

              {formaPagamento === 'Múltiplo (Split)' && (
                <div className="space-y-2 rounded-lg border border-white/10 bg-superficie p-3">
                  <p className="text-slate-400">Informe quanto foi pago em cada forma. A soma deve fechar com o total.</p>
                  {partes.map((parte, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_6rem_auto] items-center gap-2">
                      <select
                        value={parte.forma}
                        onChange={(e) => setPartes(partes.map((x, i) => (i === idx ? { ...x, forma: e.target.value as FormaCaixa } : x)))}
                        className="rounded-md border border-white/20 bg-superficie-alta p-2 text-white"
                      >
                        {FORMAS_CAIXA.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                      <input
                        inputMode="decimal" placeholder="0,00" aria-label="Valor desta parte"
                        value={parte.valorTxt}
                        onChange={(e) => setPartes(partes.map((x, i) => (i === idx ? { ...x, valorTxt: e.target.value } : x)))}
                        className="rounded-md border border-white/20 bg-superficie-alta p-2 text-white"
                      />
                      {partes.length > 2 ? (
                        <button type="button" aria-label="Remover parte" className="text-slate-400 hover:text-red-400"
                          onClick={() => setPartes(partes.filter((_, i) => i !== idx))}>✕</button>
                      ) : <span />}
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <button type="button" className="text-marca underline"
                      onClick={() => setPartes([...partes, { forma: 'dinheiro', valorTxt: '' }])}>
                      + Adicionar forma
                    </button>
                    {(() => {
                      const soma = partes.reduce((a, x) => a + (parseNum(x.valorTxt) ?? 0), 0)
                      const falta = totalFinalModal - soma
                      return (
                        <span className={Math.abs(falta) < 0.01 ? 'text-emerald-400' : 'text-yellow-300'}>
                          {Math.abs(falta) < 0.01 ? 'Soma confere ✓' : falta > 0 ? `Faltam ${brl(falta)}` : `Excede ${brl(-falta)}`}
                        </span>
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* Taxa de Entrega e Entregador */}
              {pedidoCheckout.tipo === 'delivery' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Taxa de Entrega (R$)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={taxaEntrega}
                      onChange={(e) => setTaxaEntrega(Number(e.target.value))}
                      className="w-full rounded-md border border-white/20 bg-superficie p-2 text-white font-medium focus:outline-none focus:border-marca"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Motoboy Responsável</label>
                    <input
                      type="text"
                      placeholder="Nome do entregador"
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
                  <label className="text-slate-300 font-semibold">Desconto Aplicado</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDescontoTipo('valor')}
                      className={`px-2 py-0.5 rounded text-[10px] ${descontoTipo === 'valor' ? 'bg-marca text-fundo' : 'bg-white/10 text-slate-400'}`}
                    >
                      R$
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescontoTipo('porcentagem')}
                      className={`px-2 py-0.5 rounded text-[10px] ${descontoTipo === 'porcentagem' ? 'bg-marca text-fundo' : 'bg-white/10 text-slate-400'}`}
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

              {/* Quadro de Valores */}
              <div className="rounded-lg bg-superficie p-3 space-y-1.5 border border-white/10 pt-3">
                <div className="flex justify-between text-slate-400"><span>Valor dos Produtos:</span><span>{brl(subtotalCheckout)}</span></div>
                {taxaEntrega > 0 && <div className="flex justify-between text-slate-400"><span>Taxa de Entrega:</span><span>+{brl(taxaEntrega)}</span></div>}
                {valorDescontoModal > 0 && <div className="flex justify-between text-emerald-400"><span>Desconto:</span><span>-{brl(valorDescontoModal)}</span></div>}
                <div className="flex justify-between text-sm font-bold text-white border-t border-white/10 pt-2">
                  <span>Valor Efetivamente Recebido:</span>
                  <span className={`${DISPLAY} text-2xl text-marca`}>{brl(totalFinalModal)}</span>
                </div>
              </div>
            </div>

            {erro && <p className="text-xs text-red-400 font-semibold">{erro}</p>}

            <button
              type="button"
              onClick={liquidarPagamento}
              disabled={liquidando}
              className="w-full rounded-md bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50 shadow-lg text-sm"
            >
              {liquidando ? 'Registrando recebimento…' : '✅ Baixar Pagamento & Contabilizar na DRE'}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Pedido */}
      {pedidoDetalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-superficie-alta p-6 text-slate-100 border border-white/10 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className={`${DISPLAY} text-2xl font-bold text-marca`}>Detalhes do Pedido #{pedidoDetalhe.numero}</h3>
                <span className="text-xs text-slate-400">Registrado às {new Date(pedidoDetalhe.created_at).toLocaleTimeString('pt-BR')}</span>
              </div>
              <button type="button" onClick={() => setPedidoDetalhe(null)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-superficie p-3 rounded border border-white/5">
                <div>
                  <span className="block text-slate-400">Tipo de Pedido</span>
                  <span className="font-semibold text-white uppercase">{pedidoDetalhe.tipo} {pedidoDetalhe.mesa ? `(Mesa ${pedidoDetalhe.mesa})` : ''}</span>
                </div>
                <div>
                  <span className="block text-slate-400">Etapa Atual</span>
                  <span className="font-semibold text-marca uppercase">{pedidoDetalhe.status}</span>
                </div>
                <div>
                  <span className="block text-slate-400">Status Financeiro</span>
                  <span className="font-semibold text-white">{pedidoDetalhe.pago ? '✅ Pago' : '⏳ Pendente'}</span>
                </div>
                <div>
                  <span className="block text-slate-400">Forma de Pagamento</span>
                  <span className="font-semibold text-white">{pedidoDetalhe.forma_pagamento || 'Não definida'}</span>
                </div>
              </div>

              {pedidoDetalhe.cliente_nome && (
                <div className="bg-superficie p-3 rounded border border-white/5 space-y-1">
                  <p className="font-semibold text-slate-200">👤 {pedidoDetalhe.cliente_nome}</p>
                  {pedidoDetalhe.cliente_telefone && <p className="text-slate-400">📞 {pedidoDetalhe.cliente_telefone}</p>}
                  {pedidoDetalhe.endereco_entrega && <p className="text-slate-300">📍 {pedidoDetalhe.endereco_entrega}</p>}
                </div>
              )}

              <div>
                <p className="font-semibold text-slate-300 mb-1">Itens do Pedido:</p>
                <div className="bg-superficie p-3 rounded border border-white/5 space-y-2 max-h-48 overflow-y-auto">
                  {pedidoDetalhe.itens_pedido?.map((item) => (
                    <div key={item.id} className="flex justify-between items-start border-b border-white/5 pb-1 last:border-0">
                      <div>
                        <p className="font-semibold text-slate-100">{item.quantidade}x {item.nome_produto}</p>
                        <p className="text-[11px] text-slate-400">{item.nome_tamanho}</p>
                        {item.observacoes && <p className="text-[10px] text-yellow-300">Obs: {item.observacoes}</p>}
                      </div>
                      <span className="font-bold text-marca">{brl(item.preco_unitario * item.quantidade)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {pedidoDetalhe.observacoes && (
                <p className="bg-yellow-500/10 text-yellow-300 p-2 rounded border border-yellow-500/20 text-[11px]">
                  <strong>Observação Geral:</strong> {pedidoDetalhe.observacoes}
                </p>
              )}

              <div className="border-t border-white/10 pt-2 space-y-1">
                <div className="flex justify-between text-slate-400"><span>Subtotal:</span><span>{brl(pedidoDetalhe.subtotal || pedidoDetalhe.total)}</span></div>
                {pedidoDetalhe.taxa_entrega > 0 && <div className="flex justify-between text-slate-400"><span>Taxa de Entrega:</span><span>+{brl(pedidoDetalhe.taxa_entrega)}</span></div>}
                {pedidoDetalhe.desconto > 0 && <div className="flex justify-between text-emerald-400"><span>Desconto:</span><span>-{brl(pedidoDetalhe.desconto)}</span></div>}
                <div className="flex justify-between text-sm font-bold text-white border-t border-white/10 pt-1">
                  <span>Total Final:</span>
                  <span className={`${DISPLAY} text-lg text-marca`}>{brl(pedidoDetalhe.total)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPedidoDetalhe(null)}
              className="w-full rounded bg-white/10 py-2 text-xs font-semibold text-slate-200 hover:bg-white/20 transition-colors"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
