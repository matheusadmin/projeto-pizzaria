// Cadastro de cardápio: categorias, produtos e tamanhos/preços.
import { supabase } from '@/lib/supabase/client'
import { round2 } from '@/lib/types'

export interface TamanhoCard { id: string; nome_tamanho: string; preco_venda: number }
export interface CategoriaCard { id: string; nome: string }
export interface ProdutoCard {
  id: string
  categoria_id: string | null
  nome: string
  descricao: string | null
  disponivel: boolean
  produto_tamanhos: TamanhoCard[]
}

export async function carregarCardapio(): Promise<{ categorias: CategoriaCard[]; produtos: ProdutoCard[] }> {
  const [cats, prods] = await Promise.all([
    supabase.from('categorias').select('id, nome').order('nome'),
    supabase
      .from('produtos')
      .select('id, categoria_id, nome, descricao, disponivel, produto_tamanhos(id, nome_tamanho, preco_venda)')
      .order('nome'),
  ])
  if (cats.error) throw cats.error
  if (prods.error) throw prods.error
  return {
    categorias: cats.data as CategoriaCard[],
    produtos: (prods.data as unknown as ProdutoCard[]).map((p) => ({
      ...p,
      produto_tamanhos: [...p.produto_tamanhos]
        .map((t) => ({ ...t, preco_venda: Number(t.preco_venda) }))
        .sort((a, b) => a.preco_venda - b.preco_venda),
    })),
  }
}

export async function criarCategoria(nome: string): Promise<string> {
  const { data, error } = await supabase.from('categorias').insert({ nome: nome.trim() }).select('id').single()
  if (error) throw error
  return data.id as string
}

export interface LinhaTamanho { id: string | null; nome: string; preco: number }

export interface DadosProduto {
  id: string | null          // null = produto novo
  nome: string
  categoria_id: string
  descricao: string
  disponivel: boolean
  tamanhos: LinhaTamanho[]
  removidos: string[]        // ids de tamanhos existentes que o usuário tirou da lista
}

/** Grava produto + tamanhos. Devolve o id do produto. */
export async function salvarProduto(d: DadosProduto): Promise<string> {
  const base = {
    nome: d.nome.trim(),
    categoria_id: d.categoria_id,
    descricao: d.descricao.trim() || null,
    disponivel: d.disponivel,
  }

  let id = d.id
  if (id) {
    const { error } = await supabase.from('produtos').update(base).eq('id', id)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('produtos').insert(base).select('id').single()
    if (error) throw error
    id = data.id as string
  }

  if (d.removidos.length > 0) {
    const { error } = await supabase.from('produto_tamanhos').delete().in('id', d.removidos)
    if (error) {
      throw new Error(
        'Não foi possível excluir um tamanho que já foi vendido ou tem ficha técnica. ' +
          'Para tirar do cardápio, deixe o produto indisponível. (' + error.message + ')',
      )
    }
  }

  for (const t of d.tamanhos) {
    const linha = { nome_tamanho: t.nome.trim(), preco_venda: round2(t.preco) }
    const { error } = t.id
      ? await supabase.from('produto_tamanhos').update(linha).eq('id', t.id)
      : await supabase.from('produto_tamanhos').insert({ ...linha, produto_id: id })
    if (error) throw error
  }
  return id
}

export async function definirDisponibilidade(id: string, disponivel: boolean) {
  const { error } = await supabase.from('produtos').update({ disponivel }).eq('id', id)
  if (error) throw error
}
