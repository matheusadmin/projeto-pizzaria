'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePerfil } from '@/components/RequireRole'
import SignOutButton from '@/components/SignOutButton'
import { useCatalogo } from '@/hooks/useCatalogo'
import { useCart } from '@/hooks/useCart'
import { finalizarPedido, msgErro } from '@/lib/pedidos'
import { META_INICIAL, round2, type PedidoMeta, type Produto } from '@/lib/types'
import { DISPLAY } from '@/lib/ui'
import CategoryTabs from './CategoryTabs'
import ProductGrid from './ProductGrid'
import ProductModal from './ProductModal'
import OrderSummary from './OrderSummary'

export default function PdvScreen() {
  const perfil = usePerfil()
  const { categorias, produtos, loading, erro: erroCatalogo, recarregar } = useCatalogo()
  const cart = useCart()

  const [meta, setMeta] = useState<PedidoMeta>(META_INICIAL)
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

  const taxa = meta.tipo === 'delivery' ? meta.taxaEntrega : 0
  const total = round2(cart.subtotal + taxa)

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 5000)
    return () => clearTimeout(t)
  }, [aviso])

  async function finalizar() {
    setErro(null)
    setEnviando(true)
    try {
      const pedido = await finalizarPedido(cart.itens, meta)
      cart.limpar()
      setMeta(META_INICIAL)
      setAviso(`Pedido #${pedido.numero} enviado para a cozinha.`)
    } catch (e) {
      setErro(msgErro(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-[#E9ECEF] text-[#14181F]">
      <header className="flex items-center justify-between bg-[#14181F] px-4 py-3 text-white">
        <h1 className={`${DISPLAY} text-2xl font-bold`}>Caixa</h1>
        <div className="flex items-center gap-4 text-sm">
          <span>{perfil.nome}</span>
          <SignOutButton className="rounded-md border border-white/30 px-3 py-1.5 font-medium hover:bg-white/10" />
        </div>
      </header>

      {aviso && (
        <p role="status" className="bg-[#2F7D4F] px-4 py-2 text-center font-semibold text-white">{aviso}</p>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {loading ? (
            <p className="py-12 text-center text-slate-600">Carregando cardápio…</p>
          ) : erroCatalogo ? (
            <div className="space-y-3 py-12 text-center">
              <p className="font-medium text-[#B42318]">Não foi possível carregar o cardápio: {erroCatalogo}</p>
              <button type="button" onClick={recarregar} className="rounded-md bg-[#14181F] px-4 py-2 font-semibold text-white">
                Tentar de novo
              </button>
            </div>
          ) : categorias.length === 0 ? (
            <p className="py-12 text-center text-slate-600">
              Nenhuma categoria cadastrada. Cadastre categorias e produtos para começar a vender.
            </p>
          ) : (
            <>
              <CategoryTabs categorias={categorias} ativaId={categoriaAtiva} onSelect={setCategoriaId} />
              <ProductGrid produtos={produtosDaCategoria} onSelect={setProdutoAberto} />
            </>
          )}
        </section>

        <OrderSummary
          itens={cart.itens}
          meta={meta}
          subtotal={cart.subtotal}
          total={total}
          enviando={enviando}
          erro={erro}
          onMetaChange={(patch) => setMeta((m) => ({ ...m, ...patch }))}
          onQuantidade={cart.alterarQuantidade}
          onRemover={cart.remover}
          onLimpar={cart.limpar}
          onFinalizar={finalizar}
        />
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
