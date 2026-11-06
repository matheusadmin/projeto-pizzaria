'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { brl } from '@/lib/types'
import { norm, numParaInput, parseNum } from '@/lib/admin'
import {
  carregarCardapio, criarCategoria, definirDisponibilidade, salvarProduto,
  type CategoriaCard, type ProdutoCard,
} from '@/lib/cardapio'
import { msgErro } from '@/lib/pedidos'
import { DISPLAY, INPUT } from '@/lib/ui'
import { BTN_DARK, BTN_GHOST, Campo, PageHeader, Tag } from '../ui'

const NOVA = '__nova__'

export default function CardapioScreen() {
  const [categorias, setCategorias] = useState<CategoriaCard[]>([])
  const [produtos, setProdutos] = useState<ProdutoCard[]>([])
  const [selecionado, setSelecionado] = useState<string | 'novo' | null>(null)
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    try {
      const r = await carregarCardapio()
      setCategorias(r.categorias)
      setProdutos(r.produtos)
      setErro(null)
    } catch (e) {
      setErro(msgErro(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { recarregar() }, [recarregar])

  const nomeCategoria = useMemo(() => new Map(categorias.map((c) => [c.id, c.nome])), [categorias])

  const grupos = useMemo(() => {
    const q = norm(busca)
    const mapa = new Map<string, ProdutoCard[]>()
    for (const p of produtos) {
      if (q && !norm(p.nome).includes(q)) continue
      const cat = (p.categoria_id && nomeCategoria.get(p.categoria_id)) || 'Sem categoria'
      mapa.set(cat, [...(mapa.get(cat) ?? []), p])
    }
    return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [produtos, busca, nomeCategoria])

  const produto = produtos.find((p) => p.id === selecionado) ?? null

  return (
    <>
      <PageHeader
        titulo="Cardápio e produtos"
        descricao="Cadastre produtos, tamanhos e preços. Depois monte a ficha técnica de cada um para calcular o CMV."
        acao={<button type="button" className={BTN_DARK} onClick={() => setSelecionado('novo')}>＋ Novo produto</button>}
      />

      {erro && <p role="alert" className="mb-3 font-medium text-red-400">Não foi possível carregar: {erro}</p>}

      {loading ? (
        <p className="text-slate-400">Carregando…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="bg-superficie-alta">
            <div className="border-b border-white/10 p-3">
              <input className={INPUT} placeholder="Buscar produto" aria-label="Buscar produto"
                value={busca} onChange={(e) => setBusca(e.target.value)} />
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {grupos.length === 0 && <p className="p-4 text-sm text-slate-400">Nenhum produto cadastrado.</p>}
              {grupos.map(([categoria, itens]) => (
                <section key={categoria}>
                  <h2 className="bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-300">{categoria}</h2>
                  <ul>
                    {itens.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => setSelecionado(p.id)}
                          aria-current={p.id === selecionado ? 'true' : undefined}
                          className={'flex w-full items-center justify-between gap-2 border-l-4 px-3 py-2.5 text-left text-sm ' +
                            (p.id === selecionado ? 'border-marca bg-white/5 font-semibold' : 'border-transparent hover:bg-white/5')}>
                          <span className={p.disponivel ? '' : 'text-slate-400 line-through'}>{p.nome}</span>
                          {!p.disponivel && <Tag tone="slate">Oculto</Tag>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>

          <div>
            {selecionado === 'novo' ? (
              <ProdutoForm key="novo" produto={null} categorias={categorias}
                onSalvo={async (id) => { await recarregar(); setSelecionado(id) }}
                onCancelar={() => setSelecionado(null)} />
            ) : produto ? (
              <ProdutoForm key={produto.id} produto={produto} categorias={categorias}
                onSalvo={async (id) => { await recarregar(); setSelecionado(id) }}
                onCancelar={() => setSelecionado(null)} />
            ) : (
              <div className="bg-superficie-alta p-8 text-center text-slate-400">
                Escolha um produto para editar ou clique em “Novo produto”.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

interface LinhaForm { id: string | null; nome: string; precoTxt: string }

function ProdutoForm({ produto, categorias, onSalvo, onCancelar }: {
  produto: ProdutoCard | null
  categorias: CategoriaCard[]
  onSalvo: (id: string) => void | Promise<void>
  onCancelar: () => void
}) {
  const [nome, setNome] = useState(produto?.nome ?? '')
  const [categoriaId, setCategoriaId] = useState(produto?.categoria_id ?? categorias[0]?.id ?? NOVA)
  const [novaCategoria, setNovaCategoria] = useState('')
  const [descricao, setDescricao] = useState(produto?.descricao ?? '')
  const [disponivel, setDisponivel] = useState(produto?.disponivel ?? true)
  const [linhas, setLinhas] = useState<LinhaForm[]>(
    produto && produto.produto_tamanhos.length > 0
      ? produto.produto_tamanhos.map((t) => ({ id: t.id, nome: t.nome_tamanho, precoTxt: numParaInput(t.preco_venda) }))
      : [{ id: null, nome: 'Único', precoTxt: '' }],
  )
  const [removidos, setRemovidos] = useState<string[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  function atualizar(i: number, patch: Partial<LinhaForm>) {
    setLinhas(linhas.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function remover(i: number) {
    const l = linhas[i]
    if (l.id) setRemovidos([...removidos, l.id])
    setLinhas(linhas.filter((_, idx) => idx !== i))
  }

  async function salvar() {
    setErro(null)
    setAviso(null)
    if (!nome.trim()) return setErro('Informe o nome do produto.')
    if (categoriaId === NOVA && !novaCategoria.trim()) return setErro('Informe o nome da nova categoria.')
    if (linhas.length === 0) return setErro('Cadastre pelo menos um tamanho com preço.')
    const tamanhos = []
    for (const l of linhas) {
      const preco = parseNum(l.precoTxt)
      if (!l.nome.trim()) return setErro('Todo tamanho precisa de um nome (ex.: Grande, 35cm, Único).')
      if (preco == null || preco <= 0) return setErro(`Informe um preço válido para o tamanho “${l.nome}”.`)
      tamanhos.push({ id: l.id, nome: l.nome, preco })
    }

    setSalvando(true)
    try {
      const catId = categoriaId === NOVA ? await criarCategoria(novaCategoria) : categoriaId
      const id = await salvarProduto({
        id: produto?.id ?? null, nome, categoria_id: catId, descricao, disponivel, tamanhos, removidos,
      })
      setAviso('Produto salvo.')
      await onSalvo(id)
    } catch (e) {
      setErro(msgErro(e))
    } finally {
      setSalvando(false)
    }
  }

  async function alternarDisponibilidade() {
    if (!produto) return
    try {
      await definirDisponibilidade(produto.id, !produto.disponivel)
      await onSalvo(produto.id)
    } catch (e) {
      setErro(msgErro(e))
    }
  }

  return (
    <section className="space-y-4 bg-superficie-alta p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={`${DISPLAY} text-3xl font-bold`}>{produto ? produto.nome : 'Novo produto'}</h2>
        {produto && (
          <Link href={`/admin/fichas?produto=${produto.id}`} className={BTN_GHOST}>Abrir ficha técnica →</Link>
        )}
      </div>

      <Campo label="Nome do produto">
        <input className={INPUT} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Pizza Calabresa" />
      </Campo>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Categoria">
          <select className={INPUT} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            <option value={NOVA}>＋ Nova categoria…</option>
          </select>
        </Campo>
        {categoriaId === NOVA && (
          <Campo label="Nome da nova categoria">
            <input className={INPUT} value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} placeholder="Ex.: Pizzas Doces" />
          </Campo>
        )}
      </div>

      <Campo label="Descrição (opcional)">
        <input className={INPUT} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: molho, mussarela, calabresa e cebola" />
      </Campo>

      <div>
        <p className="mb-1 text-sm font-medium text-slate-300">Tamanhos e preços</p>
        <div className="space-y-2">
          {linhas.map((l, i) => (
            <div key={l.id ?? `novo-${i}`} className="grid grid-cols-[1fr_8rem_auto] items-center gap-2">
              <input className={INPUT} value={l.nome} aria-label="Nome do tamanho" placeholder="Ex.: Grande"
                onChange={(e) => atualizar(i, { nome: e.target.value })} />
              <input className={INPUT} value={l.precoTxt} inputMode="decimal" aria-label="Preço de venda" placeholder="R$ 0,00"
                onChange={(e) => atualizar(i, { precoTxt: e.target.value })} />
              <button type="button" aria-label={`Remover tamanho ${l.nome}`} className="px-2 text-slate-400 hover:text-red-400"
                onClick={() => remover(i)}>✕</button>
            </div>
          ))}
        </div>
        <button type="button" className="mt-2 text-sm text-marca underline"
          onClick={() => setLinhas([...linhas, { id: null, nome: '', precoTxt: '' }])}>
          + Adicionar tamanho
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" className="h-5 w-5 accent-sucesso" checked={disponivel} onChange={(e) => setDisponivel(e.target.checked)} />
        Disponível no PDV e no app do garçom
      </label>

      {erro && <p role="alert" className="text-sm font-medium text-red-400">{erro}</p>}
      {aviso && <p role="status" className="text-sm font-medium text-sucesso-claro">{aviso}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={BTN_DARK} disabled={salvando} onClick={salvar}>
          {salvando ? 'Salvando…' : produto ? 'Salvar alterações' : 'Cadastrar produto'}
        </button>
        <button type="button" className={BTN_GHOST} onClick={onCancelar}>Fechar</button>
        {produto && (
          <button type="button" className={BTN_GHOST} onClick={alternarDisponibilidade}>
            {produto.disponivel ? 'Tirar do cardápio' : 'Voltar ao cardápio'}
          </button>
        )}
      </div>

      {produto && produto.produto_tamanhos.length > 0 && (
        <p className="text-xs text-slate-500">
          Preços atuais: {produto.produto_tamanhos.map((t) => `${t.nome_tamanho} ${brl(t.preco_venda)}`).join(' · ')}.
          Produtos já vendidos não podem ser excluídos; use “Tirar do cardápio”.
        </p>
      )}
    </section>
  )
}
