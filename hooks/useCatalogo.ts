'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Categoria, Produto } from '@/lib/types'

// A tabela categorias não tem coluna de ordem; esta lista define a ordem das abas.
const ORDEM = ['pizza', 'hamburg', 'petisc', 'bebid']
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const peso = (nome: string) => {
  const i = ORDEM.findIndex((o) => norm(nome).includes(o))
  return i === -1 ? 99 : i
}

export function useCatalogo() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)

    const [cats, prods] = await Promise.all([
      supabase.from('categorias').select('id, nome'),
      supabase
        .from('produtos')
        .select('id, categoria_id, nome, descricao, disponivel, produto_tamanhos(id, produto_id, nome_tamanho, preco_venda)')
        .eq('disponivel', true)
        .order('nome'),
    ])

    if (cats.error || prods.error) {
      setErro((cats.error ?? prods.error)!.message)
    } else {
      setCategorias(
        [...(cats.data as Categoria[])].sort(
          (a, b) => peso(a.nome) - peso(b.nome) || a.nome.localeCompare(b.nome)
        )
      )
      setProdutos(
        (prods.data as unknown as Produto[]).map((p) => ({
          ...p,
          // menor -> maior preço (25cm ... 40cm, P ... G)
          produto_tamanhos: [...p.produto_tamanhos].sort((a, b) => a.preco_venda - b.preco_venda),
        }))
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  return { categorias, produtos, loading, erro, recarregar: carregar }
}
