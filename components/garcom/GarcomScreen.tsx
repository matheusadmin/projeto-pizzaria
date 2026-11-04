'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePerfil } from '@/components/RequireRole'
import SignOutButton from '@/components/SignOutButton'
import { useCatalogo } from '@/hooks/useCatalogo'
import { useCart } from '@/hooks/useCart'
import { finalizarPedido, msgErro } from '@/lib/pedidos'
import { brl, type PedidoMeta, type Produto } from '@/lib/types'
import { DISPLAY, INPUT } from '@/lib/ui'
import ProductModal from '@/components/pdv/ProductModal'

export default function GarcomScreen() {
  const perfil = usePerfil()
  const { categorias, produtos, loading, erro: erroCatalogo, recarregar } = useCatalogo()
  const cart = useCart()

  const [mesa, setMesa] = useState('1')
  const [garcomNome, setGarcomNome] = useState(perfil.nome || 'Garçom')
  const [categoriaId, setCategoriaId] = useState<string | null>(null)
  const [produtoAberto, setProdutoAberto] = useState<Produto | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

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

  async function enviarParaCozinha() {
    if (!mesa.trim()) {
      setErro('Informe o número da mesa.')
      return
    }
    setErro(null)
    setEnviando(true)
    try {
      const meta: PedidoMeta = {
        tipo: 'mesa',
        mesa: mesa.trim(),
        clienteNome: `Mesa ${mesa.trim()} (${garcomNome})`,
        clienteTelefone: '',
        endereco: '',
        taxaEntrega: 0,
        formaPagamento: '',
        pago: false,
        observacoes: `Lançado por Garçom: ${garcomNome}`,
      }
      const pedido = await finalizarPedido(cart.itens, meta)
      cart.limpar()
      setAviso(`Comanda da Mesa ${mesa} enviada para a cozinha! (Pedido #${pedido.numero})`)
    } catch (e) {
      setErro(msgErro(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-[#14181F] text-slate-100">
      <header className="flex flex-wrap items-center justify-between bg-[#1A212B] px-5 py-3 border-b border-white/10">
        <div className="flex items-center gap-4">
          <h1 className={`${DISPLAY} text-2xl font-bold text-orange-500`}>🪑 Comanda do Garçom</h1>
          <span className="text-sm text-slate-300">Atendente: <strong>{garcomNome}</strong></span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#14181F] px-3 py-1.5 rounded-md border border-white/20">
            <label htmlFor="mesa-num" className="text-sm font-semibold">Mesa:</label>
            <input 
              id="mesa-num"
              type="text" 
              className="w-16 bg-transparent text-center font-bold text-orange-400 focus:outline-none text-lg" 
              value={mesa} 
              onChange={(e) => setMesa(e.target.value)} 
            />
          </div>
          <SignOutButton className="rounded-md border border-white/30 px-3 py-1.5 text-sm font-medium hover:bg-white/10" />
        </div>
      </header>

      {aviso && (
        <div role="status" className="bg-[#2F7D4F] px-4 py-2 text-center font-semibold text-white">
          {aviso}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Catálogo de Produtos */}
        <section className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {loading ? (
            <p className="py-12 text-center text-slate-400">Carregando cardápio…</p>
          ) : erroCatalogo ? (
            <div className="space-y-3 py-12 text-center">
              <p className="font-medium text-red-400">Erro ao carregar cardápio: {erroCatalogo}</p>
              <button type="button" onClick={recarregar} className="rounded-md bg-orange-600 px-4 py-2 font-semibold text-white">
                Tentar novamente
              </button>
            </div>
          ) : categorias.length === 0 ? (
            <p className="py-12 text-center text-slate-400">Nenhuma categoria encontrada.</p>
          ) : (
            <>
              {/* Abas de categorias */}
              <nav aria-label="Categorias" className="flex gap-2 overflow-x-auto pb-2">
                {categorias.map((c) => {
                  const ativa = c.id === categoriaAtiva
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoriaId(c.id)}
                      className={
                        'shrink-0 rounded-md border px-4 py-2.5 text-sm font-semibold transition-colors ' +
                        (ativa ? 'border-orange-500 bg-orange-600 text-white' : 'border-white/20 bg-[#1A212B] text-slate-300 hover:border-orange-500')
                      }
                    >
                      {c.nome}
                    </button>
                  )
                })}
              </nav>

              {/* Grid de produtos */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {produtosDaCategoria.map((p) => {
                  const semPreco = p.produto_tamanhos.length === 0
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={semPreco}
                      onClick={() => setProdutoAberto(p)}
                      className="flex h-full w-full flex-col justify-between gap-2 rounded-md border border-white/15 bg-[#1A212B] p-4 text-left transition-colors hover:border-orange-500 disabled:opacity-50"
                    >
                      <div>
                        <span className="block text-base font-semibold text-white">{p.nome}</span>
                        {p.descricao && <span className="mt-1 line-clamp-2 block text-xs text-slate-400">{p.descricao}</span>}
                      </div>
                      <div className="flex items-baseline justify-between pt-2">
                        <span className="text-xs text-slate-400">
                          {semPreco ? 'Indisponível' : p.produto_tamanhos.length > 1 ? 'A partir de' : 'Preço'}
                        </span>
                        {!semPreco && (
                          <span className={`${DISPLAY} text-xl font-semibold text-orange-400`}>
                            {brl(p.produto_tamanhos[0].preco_venda)}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </section>

        {/* Carrinho / Comanda da Mesa */}
        <aside className="flex h-full min-h-0 w-full flex-col border-t lg:border-t-0 lg:border-l border-white/10 bg-[#1A212B] lg:w-[24rem]">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <h2 className={`${DISPLAY} text-2xl font-bold text-white`}>Comanda Mesa {mesa || '?'}</h2>
            {cart.itens.length > 0 && (
              <button type="button" onClick={cart.limpar} className="text-xs font-medium text-slate-400 underline hover:text-white">
                Limpar
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
            {cart.itens.length === 0 ? (
              <p className="py-12 text-center text-slate-400 text-sm">Nenhum item adicionado à comanda desta mesa.</p>
            ) : (
              <ul className="divide-y divide-white/10 space-y-3">
                {cart.itens.map((i) => (
                  <li key={i.key} className="pt-3 first:pt-0">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-semibold text-sm text-white">{i.nome_produto}</p>
                        <p className="text-xs text-slate-400">{i.nome_tamanho}</p>
                        {i.observacoes && (
                          <p className="mt-1 bg-yellow-500/20 text-yellow-300 px-1.5 py-0.5 rounded text-xs">
                            Obs: {i.observacoes}
                          </p>
                        )}
                      </div>
                      <span className={`${DISPLAY} text-lg font-bold text-orange-400`}>{brl(i.preco_unitario * i.quantidade)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => cart.alterarQuantidade(i.key, -1)}
                          className="h-7 w-7 rounded bg-white/10 text-sm font-bold hover:bg-white/20">−</button>
                        <span className="w-6 text-center text-sm font-semibold">{i.quantidade}</span>
                        <button type="button" onClick={() => cart.alterarQuantidade(i.key, 1)}
                          className="h-7 w-7 rounded bg-white/10 text-sm font-bold hover:bg-white/20">+</button>
                      </div>
                      <button type="button" onClick={() => cart.remover(i.key)} className="text-xs text-red-400 underline">
                        Remover
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-white/10 bg-[#10151C] p-4 space-y-3">
            {erro && <p role="alert" className="text-xs font-medium text-red-400">{erro}</p>}
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-slate-300">Total da Comanda</span>
              <span className={`${DISPLAY} text-3xl font-bold text-orange-500`}>{brl(cart.subtotal)}</span>
            </div>
            <button
              type="button"
              onClick={enviarParaCozinha}
              disabled={enviando || cart.itens.length === 0}
              className="w-full rounded-md bg-orange-600 py-3.5 text-base font-semibold text-white shadow hover:bg-orange-500 disabled:opacity-50 transition-colors"
            >
              {enviando ? 'Enviando para Cozinha…' : '🚀 Enviar para Cozinha (KDS)'}
            </button>
          </div>
        </aside>
      </div>

      {produtoAberto && (
        <ProductModal
          produto={produtoAberto}
          onClose={() => setProdutoAberto(null)}
          onConfirm={cart.adicionar}
        />
      )}
    </div>
  )
}
