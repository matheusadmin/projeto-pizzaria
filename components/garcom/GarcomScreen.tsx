'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePerfil } from '@/components/RequireRole'
import SignOutButton from '@/components/SignOutButton'
import { useCatalogo } from '@/hooks/useCatalogo'
import { useCart } from '@/hooks/useCart'
import { finalizarPedido, msgErro } from '@/lib/pedidos'
import { brl, type PedidoMeta, type Produto } from '@/lib/types'
import { DISPLAY } from '@/lib/ui'
import ProductModal from '@/components/pdv/ProductModal'
import CategoryTabs from '@/components/pdv/CategoryTabs'
import ProductGrid from '@/components/pdv/ProductGrid'
import { supabase } from '@/lib/supabase/client'

interface ItemComanda {
  id: string
  nome_produto: string
  nome_tamanho: string
  quantidade: number
  preco_unitario: number
  observacoes: string | null
}

interface MesaAberta {
  id: string
  numero: number
  mesa: string | null
  status: string
  subtotal: number
  total: number
  created_at: string
  pedido_itens: ItemComanda[]
}

export default function GarcomScreen() {
  const perfil = usePerfil()
  const { categorias, produtos, loading, erro: erroCatalogo, recarregar } = useCatalogo()
  const cart = useCart()

  const [passo, setPasso] = useState<1 | 2 | 3>(1)

  const [garcomNome, setGarcomNome] = useState(perfil.nome || '')
  const [comandaNum, setComandaNum] = useState('')
  const [mesaNum, setMesaNum] = useState('')

  const [categoriaId, setCategoriaId] = useState<string | null>(null)
  const [produtoAberto, setProdutoAberto] = useState<Produto | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const [modalConsulta, setModalConsulta] = useState(false)
  const [mesasAbertas, setMesasAbertas] = useState<MesaAberta[]>([])
  const [loadingMesas, setLoadingMesas] = useState(false)
  const [itensMesaAtual, setItensMesaAtual] = useState<ItemComanda[]>([])

  const categoriaAtiva = categoriaId ?? categorias[0]?.id ?? null
  const produtosDaCategoria = useMemo(
    () => produtos.filter((p) => p.categoria_id === categoriaAtiva),
    [produtos, categoriaAtiva]
  )

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 4000)
    return () => clearTimeout(t)
  }, [aviso])

  const carregarItensMesaAtual = useCallback(async () => {
    if (!mesaNum.trim() && !comandaNum.trim()) return
    let q = supabase.from('pedidos').select('id, pedido_itens(*)').eq('tipo', 'mesa').eq('pago', false).neq('status', 'cancelado')
    
    if (mesaNum.trim()) q = q.eq('mesa', mesaNum.trim())

    const { data, error } = await q

    if (!error && data) {
      const todosItens: ItemComanda[] = []
      data.forEach((p: any) => {
        if (p.pedido_itens) todosItens.push(...p.pedido_itens)
      })
      setItensMesaAtual(todosItens)
    } else {
      setItensMesaAtual([])
    }
  }, [mesaNum, comandaNum])

  useEffect(() => {
    carregarItensMesaAtual()
  }, [carregarItensMesaAtual])

  function avancarParaCardapio(e: React.FormEvent) {
    e.preventDefault()
    if (!garcomNome.trim()) {
      setErro('Por favor, informe o nome do garçom.')
      return
    }
    if (!mesaNum.trim() && !comandaNum.trim()) {
      setErro('Informe pelo menos o número da mesa ou da comanda.')
      return
    }
    setErro(null)
    setPasso(2)
  }

  async function carregarTodasMesas() {
    setLoadingMesas(true)
    const { data, error } = await supabase
      .from('pedidos')
      .select('id, numero, mesa, status, subtotal, total, created_at, pedido_itens(*)')
      .eq('tipo', 'mesa')
      .eq('pago', false)
      .neq('status', 'cancelado')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setMesasAbertas(data as MesaAberta[])
    }
    setLoadingMesas(false)
    setModalConsulta(true)
  }

  async function enviarParaCozinha() {
    if (!mesaNum.trim() && !comandaNum.trim()) {
      setErro('Informe o número da mesa ou comanda.')
      setPasso(1)
      return
    }
    setErro(null)
    setEnviando(true)
    try {
      const idAtendimento = mesaNum.trim() ? `Mesa ${mesaNum.trim()}` : `Comanda #${comandaNum.trim()}`
      const obsAtendimento = [
        `Garçom: ${garcomNome.trim()}`,
        comandaNum.trim() ? `Comanda FÍSICA: ${comandaNum.trim()}` : null
      ].filter(Boolean).join(' | ')

      const meta: PedidoMeta = {
        tipo: 'mesa',
        mesa: mesaNum.trim() || comandaNum.trim(),
        clienteNome: `${idAtendimento} (${garcomNome.trim()})`,
        clienteTelefone: '',
        endereco: '',
        taxaEntrega: 0,
        formaPagamento: '',
        pago: false,
        observacoes: obsAtendimento,
      }

      const pedido = await finalizarPedido(cart.itens, meta)
      cart.limpar()
      carregarItensMesaAtual()
      setAviso(`Pedido #${pedido.numero} enviado com sucesso para a cozinha!`)
      setPasso(1)
    } catch (e) {
      setErro(msgErro(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[#10151C] text-slate-100 antialiased overflow-hidden select-none">
      
      {/* TopBar Compacta Mobile responsiva */}
      <header className="flex flex-wrap h-auto sm:h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#14181F] px-4 py-2.5 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🪑</span>
          <div>
            <h1 className={`${DISPLAY} text-lg font-bold leading-tight text-orange-500`}>Garçom App</h1>
            {garcomNome && <p className="text-[10px] text-slate-400">Atendente: <strong className="text-white">{garcomNome}</strong></p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={carregarTodasMesas}
            className="rounded-lg bg-orange-600/20 border border-orange-500/40 px-2.5 py-1.5 text-xs font-semibold text-orange-300 active:bg-orange-600/40"
          >
            🔍 Ver Mesas
          </button>
          <SignOutButton className="rounded-lg border border-white/20 px-2 py-1.5 text-xs font-medium hover:bg-white/10" />
        </div>
      </header>

      {aviso && (
        <div role="status" className="bg-emerald-600 px-4 py-2 text-center text-xs font-bold text-white shadow-md animate-bounce">
          {aviso}
        </div>
      )}

      {/* Navegação por Abas Limpas (sem poluir com numeração excessiva) */}
      <div className="flex border-b border-white/10 bg-[#1A212B] px-4 py-2 gap-2 items-center justify-between">
        <div className="flex gap-1.5 w-full">
          <button
            type="button"
            onClick={() => setPasso(1)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${passo === 1 ? 'bg-orange-600 text-white shadow' : 'bg-[#10151C] text-slate-400 border border-white/10'}`}
          >
            Identificação
          </button>
          <button
            type="button"
            onClick={() => (garcomNome && (mesaNum || comandaNum)) ? setPasso(2) : setErro('Preencha a identificação antes')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${passo === 2 ? 'bg-orange-600 text-white shadow' : 'bg-[#10151C] text-slate-400 border border-white/10'}`}
          >
            Cardápio
          </button>
          <button
            type="button"
            onClick={() => setPasso(3)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all relative ${passo === 3 ? 'bg-orange-600 text-white shadow' : 'bg-[#10151C] text-slate-400 border border-white/10'}`}
          >
            Comanda
            {cart.itens.length > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                {cart.itens?.reduce((acc, item) => acc + (item.quantidade || 0), 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {passo === 1 && (
        <main className="flex-1 overflow-y-auto p-5 flex flex-col justify-between">
          <form onSubmit={avancarParaCardapio} className="space-y-5 max-w-md mx-auto w-full my-auto">
            <div className="text-center space-y-1">
              <h2 className={`${DISPLAY} text-2xl font-bold text-white`}>Novo Atendimento</h2>
              <p className="text-xs text-slate-400">Informe os dados básicos para iniciar os pedidos.</p>
            </div>

            {erro && (
              <div className="rounded-lg bg-red-950/80 border border-red-500/50 p-3 text-center text-xs font-semibold text-red-300">
                {erro}
              </div>
            )}

            <div className="space-y-4 bg-[#1A212B] p-5 rounded-2xl border border-white/10 shadow-xl">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  👤 Nome do Garçom / Atendente
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos, João..."
                  value={garcomNome}
                  onChange={(e) => setGarcomNome(e.target.value)}
                  className="w-full h-12 rounded-xl border border-white/20 bg-[#10151C] px-4 text-base font-semibold text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    🪑 Nº Mesa
                  </label>
                  <input
                    type="number"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="Ex: 05"
                    value={mesaNum}
                    onChange={(e) => setMesaNum(e.target.value)}
                    className="w-full h-14 rounded-xl border border-white/20 bg-[#10151C] text-center text-2xl font-bold text-orange-400 focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    🏷️ Nº Comanda
                  </label>
                  <input
                    type="number"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="Ex: 102"
                    value={comandaNum}
                    onChange={(e) => setComandaNum(e.target.value)}
                    className="w-full h-14 rounded-xl border border-white/20 bg-[#10151C] text-center text-2xl font-bold text-orange-400 focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full h-14 rounded-xl bg-orange-600 font-bold text-lg text-white shadow-lg active:bg-orange-500 transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Avançar para o Cardápio ➔
            </button>
          </form>
        </main>
      )}

      {passo === 2 && (
        <main className="flex-1 flex flex-col min-h-0 bg-[#10151C]">
          <div className="flex justify-between items-center bg-[#14181F] px-4 py-2 border-b border-white/10 text-xs">
            <span className="text-slate-300">
              Atendendo: <strong className="text-orange-400">{mesaNum ? `Mesa ${mesaNum}` : ''} {comandaNum ? `Comanda #${comandaNum}` : ''}</strong>
            </span>
            <button
              type="button"
              onClick={() => setPasso(1)}
              className="text-slate-400 underline font-medium"
            >
              Alterar
            </button>
          </div>

          {loading ? (
            <p className="py-20 text-center text-slate-400 text-sm">Carregando cardápio…</p>
          ) : categorias.length === 0 ? (
            <p className="py-20 text-center text-slate-400 text-sm">Nenhuma categoria encontrada.</p>
          ) : (
            <>
              {/* Filtro de Categorias Fluido (CategoryTabs) */}
              <div className="p-3 bg-[#1A212B] border-b border-white/10 shrink-0">
                <CategoryTabs
                  categorias={categorias}
                  ativaId={categoriaAtiva}
                  onSelect={setCategoriaId}
                />
              </div>

              {/* Grid de Produtos (ProductGrid) */}
              <div className="flex-1 overflow-y-auto p-3">
                <ProductGrid
                  produtos={produtosDaCategoria}
                  onSelect={setProdutoAberto}
                />
              </div>

              {cart.itens.length > 0 && (
                <div className="p-3 bg-[#14181F] border-t border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPasso(3)}
                    className="w-full h-12 rounded-xl bg-green-600 font-bold text-sm text-white shadow-lg flex items-center justify-between px-4 active:bg-green-500 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{cart.itens.reduce((acc, item) => acc + (item.quantidade || 0), 0)} itens</span>
                      Ver Comanda
                    </span>
                    <span className={`${DISPLAY} text-lg`}>{brl(cart.subtotal)} ➔</span>
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      )}

      {passo === 3 && (
        <main className="flex-1 flex flex-col min-h-0 bg-[#10151C] p-4 space-y-4 overflow-y-auto">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div>
              <h2 className={`${DISPLAY} text-xl font-bold text-white`}>Resumo da Comanda</h2>
              <p className="text-xs text-slate-400">Atendimento: Mesa {mesaNum || '-'} | Comanda {comandaNum || '-'}</p>
            </div>
            <button
              type="button"
              onClick={() => setPasso(2)}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300"
            >
              + Adicionar mais
            </button>
          </div>

          {itensMesaAtual.length > 0 && (
            <div className="rounded-xl bg-black/40 p-3 border border-white/10 space-y-2">
              <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">📦 Já Enviado para Cozinha:</p>
              <ul className="divide-y divide-white/5 space-y-1 text-xs">
                {itensMesaAtual.map((it, idx) => (
                  <li key={idx} className="flex justify-between pt-1 text-slate-300">
                    <span>{it.quantidade}x {it.nome_produto} ({it.nome_tamanho})</span>
                    <span className="font-semibold">{brl(it.preco_unitario * it.quantidade)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex-1 space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">➕ Novos Itens a Lançar:</p>
            {cart.itens.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500 italic">Nenhum novo item adicionado nesta comanda.</p>
            ) : (
              <ul className="space-y-2">
                {cart.itens.map((i) => (
                  <li key={i.key} className="rounded-xl bg-[#1A212B] p-3 border border-white/10 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-white">{i.nome_produto}</p>
                      <p className="text-xs text-slate-400">{i.nome_tamanho}</p>
                      {i.observacoes && <p className="text-[11px] text-yellow-300 mt-0.5">Obs: {i.observacoes}</p>}
                      <span className="text-xs font-bold text-orange-400 mt-1 block">{brl(i.preco_unitario * i.quantidade)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => cart.alterarQuantidade(i.key, -1)}
                        className="h-8 w-8 rounded-lg bg-white/10 text-base font-bold active:bg-white/20">−</button>
                      <span className="w-5 text-center text-sm font-bold">{i.quantidade}</span>
                      <button type="button" onClick={() => cart.alterarQuantidade(i.key, 1)}
                        className="h-8 w-8 rounded-lg bg-white/10 text-base font-bold active:bg-white/20">+</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-[#14181F] p-4 rounded-2xl border border-white/10 space-y-3">
            {erro && <p role="alert" className="text-xs font-semibold text-red-400">{erro}</p>}
            
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 uppercase font-bold">Total do Envio</span>
              <span className={`${DISPLAY} text-2xl font-bold text-orange-500`}>{brl(cart.subtotal)}</span>
            </div>

            <button
              type="button"
              onClick={enviarParaCozinha}
              disabled={enviando || cart.itens.length === 0}
              className="w-full h-14 rounded-xl bg-orange-600 font-bold text-base text-white shadow-xl active:bg-orange-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {enviando ? 'Enviando para Cozinha…' : '🚀 Disparar Pedido para Cozinha'}
            </button>
          </div>
        </main>
      )}

      {modalConsulta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="flex h-[85dvh] w-full max-w-md flex-col rounded-2xl bg-[#1A212B] text-slate-100 shadow-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-[#14181F]">
              <h3 className={`${DISPLAY} text-lg font-bold text-orange-500`}>🔍 Mesas & Comandas Abertas</h3>
              <button type="button" onClick={() => setModalConsulta(false)} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
                ✕ Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMesas ? (
                <p className="py-12 text-center text-xs text-slate-400">Buscando mesas ativas…</p>
              ) : mesasAbertas.length === 0 ? (
                <p className="py-12 text-center text-xs text-slate-500">Nenhuma mesa aberta no momento.</p>
              ) : (
                mesasAbertas.map((m) => (
                  <div key={m.id} className="rounded-xl border border-white/10 bg-[#14181F] p-3.5 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`${DISPLAY} text-lg font-bold text-white`}>Mesa {m.mesa || '?'}</span>
                      <span className="text-xs font-bold text-orange-400">{brl(m.total || m.subtotal)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (m.mesa) setMesaNum(m.mesa)
                        setModalConsulta(false)
                        setPasso(2)
                      }}
                      className="w-full h-10 rounded-lg bg-orange-600 text-xs font-bold text-white active:bg-orange-500 transition-colors"
                    >
                      Atender Mesa {m.mesa} ➔
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {produtoAberto && (
        <ProductModal
          produto={produtoAberto}
          onClose={() => setProdutoAberto(null)}
          onConfirm={(item) => {
            cart.adicionar(item)
            setProdutoAberto(null)
          }}
        />
      )}
    </div>
  )
}