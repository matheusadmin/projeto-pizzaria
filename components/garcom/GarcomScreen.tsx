'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePerfil } from '@/components/RequireRole'
import SignOutButton from '@/components/SignOutButton'
import { useCatalogo } from '@/hooks/useCatalogo'
import { useCart } from '@/hooks/useCart'
import { finalizarPedido, msgErro } from '@/lib/pedidos'
import { brl, type PedidoMeta, type Produto } from '@/lib/types'
import { DISPLAY } from '@/lib/ui'
import CategoryTabs from '@/components/pdv/CategoryTabs'
import ProductGrid from '@/components/pdv/ProductGrid'
import ProductModal from '@/components/pdv/ProductModal'
import { supabase } from '@/lib/supabase/client'

interface ItemComanda {
  id: string
  nome_produto: string
  nome_tamanho: string
  quantidade: number
  preco_unitario: number
  observacoes: string | null
}

interface MesaResumo {
  chave: string
  total: number
  pedidos: number
}

type Passo = 1 | 2 | 3

// Deixa só dígitos e tira zeros à esquerda ("05" e "5" passam a ser a mesma mesa).
const soDigitos = (v: string) => v.replace(/\D/g, '').replace(/^0+(?=\d)/, '')

// Valor gravado em pedidos.mesa: o nº da mesa ou, sem mesa, "C" + nº da comanda.
function chaveAtendimento(mesa: string, comanda: string): string {
  if (mesa) return mesa
  return comanda ? `C${comanda}` : ''
}

const ehComanda = (chave: string) => /^C\d+$/.test(chave)

function rotulo(chave: string): string {
  if (!chave) return 'Mesa ?'
  return ehComanda(chave) ? `Comanda ${chave.slice(1)}` : `Mesa ${chave}`
}

export default function GarcomScreen() {
  const perfil = usePerfil()
  const { categorias, produtos, loading, erro: erroCatalogo, recarregar } = useCatalogo()
  const cart = useCart()

  // 1: Identificação | 2: Cardápio | 3: Comanda / Carrinho
  const [passo, setPasso] = useState<Passo>(1)

  const [garcomNome, setGarcomNome] = useState(perfil.nome || '')
  const [comandaNum, setComandaNum] = useState('')
  const [mesaNum, setMesaNum] = useState('')

  const [categoriaId, setCategoriaId] = useState<string | null>(null)
  const [produtoAberto, setProdutoAberto] = useState<Produto | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const [modalConsulta, setModalConsulta] = useState(false)
  const [mesasAbertas, setMesasAbertas] = useState<MesaResumo[]>([])
  const [loadingMesas, setLoadingMesas] = useState(false)
  const [erroMesas, setErroMesas] = useState<string | null>(null)
  const [itensMesaAtual, setItensMesaAtual] = useState<ItemComanda[]>([])

  const chave = chaveAtendimento(mesaNum, comandaNum)
  const identificado = garcomNome.trim() !== '' && chave !== ''

  const categoriaAtiva = categoriaId ?? categorias[0]?.id ?? null
  const produtosDaCategoria = useMemo(
    () => produtos.filter((p) => p.categoria_id === categoriaAtiva),
    [produtos, categoriaAtiva]
  )

  const qtdTotal = cart.itens.reduce((acc, item) => acc + (item.quantidade || 0), 0)
  const totalEnviado = itensMesaAtual.reduce((acc, it) => acc + it.preco_unitario * it.quantidade, 0)

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), 4000)
    return () => clearTimeout(t)
  }, [aviso])

  // Itens já lançados (e ainda não pagos) da mesa/comanda atual.
  const carregarItensMesaAtual = useCallback(async () => {
    if (!chave) {
      setItensMesaAtual([])
      return
    }
    const { data, error } = await supabase
      .from('pedidos')
      .select('id, itens_pedido(id, nome_produto, nome_tamanho, quantidade, preco_unitario, observacoes)')
      .eq('tipo', 'mesa')
      .eq('mesa', chave)
      .eq('pago', false)
      .neq('status', 'cancelado')

    if (error || !data) {
      setItensMesaAtual([])
      return
    }
    const linhas = data as unknown as { itens_pedido: ItemComanda[] | null }[]
    setItensMesaAtual(linhas.flatMap((p) => p.itens_pedido ?? []))
  }, [chave])

  // Só busca quando a comanda é exibida (passo 3), não a cada tecla digitada.
  useEffect(() => {
    if (passo === 3) carregarItensMesaAtual()
  }, [passo, carregarItensMesaAtual])

  function irPara(p: Passo) {
    if (p !== 1 && !identificado) {
      setErro('Preencha a identificação antes de prosseguir.')
      setPasso(1)
      return
    }
    setErro(null)
    setPasso(p)
  }

  function avancarParaCardapio(e: React.FormEvent) {
    e.preventDefault()
    if (!garcomNome.trim()) {
      setErro('Por favor, informe o nome do garçom.')
      return
    }
    if (!chave) {
      setErro('Informe pelo menos o número da mesa ou da comanda.')
      return
    }
    setErro(null)
    setPasso(2)
  }

  // Lista de mesas/comandas com conta aberta, uma linha por mesa.
  async function carregarTodasMesas() {
    setErroMesas(null)
    setLoadingMesas(true)
    setModalConsulta(true)
    const { data, error } = await supabase
      .from('pedidos')
      .select('id, mesa, total')
      .eq('tipo', 'mesa')
      .eq('pago', false)
      .neq('status', 'cancelado')

    if (error || !data) {
      setErroMesas(error ? msgErro(error) : 'Não foi possível carregar as mesas.')
      setMesasAbertas([])
    } else {
      const porMesa = new Map<string, MesaResumo>()
      for (const p of data as { mesa: string | null; total: number }[]) {
        const k = p.mesa ?? '?'
        const atual = porMesa.get(k) ?? { chave: k, total: 0, pedidos: 0 }
        atual.total += Number(p.total) || 0
        atual.pedidos += 1
        porMesa.set(k, atual)
      }
      setMesasAbertas(
        [...porMesa.values()].sort((a, b) =>
          a.chave.localeCompare(b.chave, 'pt-BR', { numeric: true })
        )
      )
    }
    setLoadingMesas(false)
  }

  function atenderMesa(k: string) {
    if (ehComanda(k)) {
      setComandaNum(k.slice(1))
      setMesaNum('')
    } else {
      setMesaNum(k)
      setComandaNum('')
    }
    setErro(null)
    setModalConsulta(false)
    setPasso(2)
  }

  function novoAtendimento() {
    setMesaNum('')
    setComandaNum('')
    setItensMesaAtual([])
    setErro(null)
    setPasso(1)
  }

  async function enviarParaCozinha() {
    if (!identificado) {
      setErro('Informe o nome do garçom e o número da mesa ou da comanda.')
      setPasso(1)
      return
    }
    if (cart.itens.length === 0) return
    setErro(null)
    setEnviando(true)
    try {
      const obsAtendimento = [
        `Garçom: ${garcomNome.trim()}`,
        comandaNum ? `Comanda FÍSICA: ${comandaNum}` : null,
      ].filter(Boolean).join(' | ')

      const meta: PedidoMeta = {
      tipo: 'mesa',
      mesa: chave,
      clienteNome: `${rotulo(chave)} (${garcomNome.trim()})`,
      clienteTelefone: '',
      endereco: '',
      cidade: 'Umuarama', 
      bairro: 'Salão',    
      taxaEntrega: 0,
      formaPagamento: '',
      pago: false,
      observacoes: obsAtendimento,
    }

      const pedido = await finalizarPedido(cart.itens, meta)
      cart.limpar()
      await carregarItensMesaAtual()
      setAviso(`Pedido #${pedido.numero} enviado com sucesso para a cozinha!`)
      setPasso(3) // mostra o que já foi enviado; "Novo atendimento" limpa a mesa
    } catch (e) {
      setErro(msgErro(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-fundo text-slate-100 antialiased overflow-hidden select-none">

      {/* TopBar Compacta Mobile */}
      <header className="flex flex-wrap h-auto sm:h-14 shrink-0 items-center justify-between border-b border-white/10 bg-superficie px-4 py-2.5 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🪑</span>
          <div>
            <h1 className={`${DISPLAY} text-lg font-bold leading-tight text-marca`}>Garçom App</h1>
            {garcomNome && <p className="text-[10px] text-slate-400">Atendente: <strong className="text-white">{garcomNome}</strong></p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={carregarTodasMesas}
            className="rounded-lg bg-marca/20 border border-marca/40 px-2.5 py-1.5 text-xs font-semibold text-marca active:bg-marca/40"
          >
            🔍 Ver Mesas
          </button>
          <SignOutButton className="rounded-lg border border-white/20 px-2 py-1.5 text-xs font-medium hover:bg-white/10" />
        </div>
      </header>

      {aviso && (
        <div role="status" className="bg-emerald-600 px-4 py-2 text-center text-xs font-bold text-white shadow-md">
          {aviso}
        </div>
      )}

      {/* Navegação por abas */}
      <div className="flex border-b border-white/10 bg-superficie-alta px-4 py-2 gap-2 items-center justify-between">
        <div className="flex gap-1.5 w-full">
          <button
            type="button"
            onClick={() => irPara(1)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${passo === 1 ? 'bg-marca text-fundo shadow' : 'bg-fundo text-slate-400 border border-white/10'}`}
          >
            Identificação
          </button>
          <button
            type="button"
            onClick={() => irPara(2)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${passo === 2 ? 'bg-marca text-fundo shadow' : 'bg-fundo text-slate-400 border border-white/10'}`}
          >
            Cardápio
          </button>
          <button
            type="button"
            onClick={() => irPara(3)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all relative ${passo === 3 ? 'bg-marca text-fundo shadow' : 'bg-fundo text-slate-400 border border-white/10'}`}
          >
            Comanda
            {qtdTotal > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-marca text-[10px] font-bold text-fundo">
                {qtdTotal}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* PASSO 1: Identificação */}
      {passo === 1 && (
        <main className="flex-1 overflow-y-auto p-5 flex flex-col justify-between">
          <form onSubmit={avancarParaCardapio} className="space-y-5 max-w-md mx-auto w-full my-auto">
            <div className="text-center space-y-1">
              <h2 className={`${DISPLAY} text-2xl font-bold text-white`}>Novo Atendimento</h2>
              <p className="text-xs text-slate-400">Informe os dados básicos para iniciar os pedidos.</p>
            </div>

            {erro && (
              <div role="alert" className="rounded-lg bg-red-950/80 border border-red-500/50 p-3 text-center text-xs font-semibold text-red-300">
                {erro}
              </div>
            )}

            <div className="space-y-4 bg-superficie-alta p-5 rounded-2xl border border-white/10 shadow-xl">
              <div>
                <label htmlFor="garcom-nome" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  👤 Nome do Garçom / Atendente
                </label>
                <input
                  id="garcom-nome"
                  type="text"
                  required
                  placeholder="Ex: Carlos, João..."
                  value={garcomNome}
                  onChange={(e) => setGarcomNome(e.target.value)}
                  className="w-full h-12 rounded-xl border border-white/20 bg-fundo px-4 text-base font-semibold text-white focus:border-marca focus:outline-none focus:ring-1 focus:ring-marca"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="garcom-mesa" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    🪑 Nº Mesa
                  </label>
                  <input
                    id="garcom-mesa"
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 5"
                    value={mesaNum}
                    onChange={(e) => setMesaNum(soDigitos(e.target.value))}
                    className="w-full h-14 rounded-xl border border-white/20 bg-fundo text-center text-2xl font-bold text-marca focus:border-marca focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="garcom-comanda" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    🏷️ Nº Comanda
                  </label>
                  <input
                    id="garcom-comanda"
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 102"
                    value={comandaNum}
                    onChange={(e) => setComandaNum(soDigitos(e.target.value))}
                    className="w-full h-14 rounded-xl border border-white/20 bg-fundo text-center text-2xl font-bold text-marca focus:border-marca focus:outline-none"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Com mesa informada, a conta é da mesa. Só com comanda, a conta é da comanda.
              </p>
            </div>

            <button
              type="submit"
              className="w-full h-14 rounded-xl bg-marca font-bold text-lg text-fundo shadow-lg active:bg-marca-claro transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Avançar para o Cardápio ➔
            </button>
          </form>
        </main>
      )}

      {/* PASSO 2: Cardápio */}
      {passo === 2 && (
        <main className="flex-1 flex flex-col min-h-0 bg-fundo">
          <div className="flex justify-between items-center bg-superficie px-4 py-2 border-b border-white/10 text-xs">
            <span className="text-slate-300">
              Atendendo:{' '}
              <strong className="text-marca">
                {[mesaNum && `Mesa ${mesaNum}`, comandaNum && `Comanda #${comandaNum}`].filter(Boolean).join(' · ')}
              </strong>
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
          ) : erroCatalogo ? (
            <div className="space-y-3 py-20 text-center">
              <p className="text-sm font-medium text-red-400">Não foi possível carregar o cardápio.</p>
              <button
                type="button"
                onClick={recarregar}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Tentar novamente
              </button>
            </div>
          ) : categorias.length === 0 ? (
            <p className="py-20 text-center text-slate-400 text-sm">Nenhuma categoria encontrada.</p>
          ) : (
            <>
              <div className="p-3 bg-superficie-alta border-b border-white/10 shrink-0">
                <CategoryTabs
                  categorias={categorias}
                  ativaId={categoriaAtiva}
                  onSelect={setCategoriaId}
                />
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                <ProductGrid
                  produtos={produtosDaCategoria}
                  onSelect={setProdutoAberto}
                />
              </div>

              {cart.itens.length > 0 && (
                <div className="p-3 bg-superficie border-t border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPasso(3)}
                    className="w-full h-12 rounded-xl bg-emerald-600 font-bold text-sm text-white shadow-lg flex items-center justify-between px-4 active:bg-emerald-500 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{qtdTotal} itens</span>
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

      {/* PASSO 3: Comanda e envio */}
      {passo === 3 && (
        <main className="flex-1 flex flex-col min-h-0 bg-fundo p-4 space-y-4 overflow-y-auto">
          <div className="flex justify-between items-center border-b border-white/10 pb-3">
            <div>
              <h2 className={`${DISPLAY} text-xl font-bold text-white`}>Resumo da Comanda</h2>
              <p className="text-xs text-slate-400">
                Atendimento: {rotulo(chave)}{mesaNum && comandaNum ? ` | Comanda ${comandaNum}` : ''}
              </p>
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
              <p className="text-xs font-bold text-marca uppercase tracking-wider">📦 Já Enviado para Cozinha:</p>
              <ul className="divide-y divide-white/5 space-y-1 text-xs">
                {itensMesaAtual.map((it) => (
                  <li key={it.id} className="flex justify-between pt-1 text-slate-300">
                    <span>{it.quantidade}x {it.nome_produto} ({it.nome_tamanho})</span>
                    <span className="font-semibold">{brl(it.preco_unitario * it.quantidade)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t border-white/10 pt-2 text-xs font-bold text-slate-200">
                <span>Total já enviado</span>
                <span>{brl(totalEnviado)}</span>
              </div>
            </div>
          )}

          <div className="flex-1 space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">➕ Novos Itens a Lançar:</p>
            {cart.itens.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500 italic">Nenhum novo item adicionado nesta comanda.</p>
            ) : (
              <ul className="space-y-2">
                {cart.itens.map((i) => (
                  <li key={i.key} className="rounded-xl bg-superficie-alta p-3 border border-white/10 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-white">{i.nome_produto}</p>
                      <p className="text-xs text-slate-400">{i.nome_tamanho}</p>
                      {i.observacoes && <p className="text-[11px] text-yellow-300 mt-0.5">Obs: {i.observacoes}</p>}
                      <span className="text-xs font-bold text-marca mt-1 block">{brl(i.preco_unitario * i.quantidade)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button type="button" aria-label="Diminuir quantidade" onClick={() => cart.alterarQuantidade(i.key, -1)}
                        className="h-8 w-8 rounded-lg bg-white/10 text-base font-bold active:bg-white/20">−</button>
                      <span className="w-5 text-center text-sm font-bold">{i.quantidade}</span>
                      <button type="button" aria-label="Aumentar quantidade" onClick={() => cart.alterarQuantidade(i.key, 1)}
                        className="h-8 w-8 rounded-lg bg-white/10 text-base font-bold active:bg-white/20">+</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-superficie p-4 rounded-2xl border border-white/10 space-y-3">
            {erro && <p role="alert" className="text-xs font-semibold text-red-400">{erro}</p>}

            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400 uppercase font-bold">Total do Envio</span>
              <span className={`${DISPLAY} text-2xl font-bold text-marca`}>{brl(cart.subtotal)}</span>
            </div>

            <button
              type="button"
              onClick={enviarParaCozinha}
              disabled={enviando || cart.itens.length === 0}
              className="w-full h-14 rounded-xl bg-marca font-bold text-base text-fundo shadow-xl active:bg-marca-claro disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {enviando ? 'Enviando para Cozinha…' : '🚀 Disparar Pedido para Cozinha'}
            </button>

            {cart.itens.length === 0 && (
              <button
                type="button"
                onClick={novoAtendimento}
                className="w-full h-11 rounded-xl border border-white/20 text-sm font-semibold text-slate-200 active:bg-white/10"
              >
                Novo atendimento (outra mesa)
              </button>
            )}
          </div>
        </main>
      )}

      {/* Modal: mesas em atendimento */}
      {modalConsulta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="flex h-[85dvh] w-full max-w-md flex-col rounded-2xl bg-superficie-alta text-slate-100 shadow-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-superficie">
              <h3 className={`${DISPLAY} text-lg font-bold text-marca`}>🔍 Mesas & Comandas Abertas</h3>
              <button type="button" onClick={() => setModalConsulta(false)} className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold">
                ✕ Fechar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMesas ? (
                <p className="py-12 text-center text-xs text-slate-400">Buscando mesas ativas…</p>
              ) : erroMesas ? (
                <div className="space-y-3 py-12 text-center">
                  <p role="alert" className="text-xs font-semibold text-red-400">{erroMesas}</p>
                  <button
                    type="button"
                    onClick={carregarTodasMesas}
                    className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : mesasAbertas.length === 0 ? (
                <p className="py-12 text-center text-xs text-slate-500">Nenhuma mesa aberta no momento.</p>
              ) : (
                mesasAbertas.map((m) => (
                  <div key={m.chave} className="rounded-xl border border-white/10 bg-superficie p-3.5 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`${DISPLAY} text-lg font-bold text-white`}>{rotulo(m.chave)}</span>
                      <span className="text-xs font-bold text-marca">{brl(m.total)}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {m.pedidos} {m.pedidos === 1 ? 'pedido' : 'pedidos'} em aberto
                    </p>
                    <button
                      type="button"
                      onClick={() => atenderMesa(m.chave)}
                      className="w-full h-10 rounded-lg bg-marca text-xs font-bold text-fundo active:bg-marca-claro transition-colors"
                    >
                      Atender {rotulo(m.chave)} ➔
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: detalhes do produto */}
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
