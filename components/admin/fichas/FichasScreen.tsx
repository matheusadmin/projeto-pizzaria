'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import type { Insumo, ProdutoAdmin, TamanhoAdmin } from '@/lib/admin'
import { PageHeader } from '../ui'
import ProdutoLista from './ProdutoLista'
import FichaEditor from './FichaEditor'

interface ProdutoRaw {
  id: string
  nome: string
  disponivel: boolean
  categorias: { nome: string } | { nome: string }[] | null
  produto_tamanhos: TamanhoAdmin[]
}

export default function FichasScreen() {
  const params = useSearchParams()
  const [produtos, setProdutos] = useState<ProdutoAdmin[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [semFicha, setSemFicha] = useState<Set<string>>(new Set())
  const [selecionadoId, setSelecionadoId] = useState<string | null>(params.get('produto'))
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Produto/tamanho sem ficha = CMV zerado na view criada na Etapa 1.
  const carregarSemFicha = useCallback(async () => {
    const { data } = await supabase.from('vw_cmv_produto_tamanho').select('produto_id, cmv')
    if (!data) return
    const s = new Set<string>()
    for (const r of data as { produto_id: string; cmv: number }[]) if (r.cmv <= 0) s.add(r.produto_id)
    setSemFicha(s)
  }, [])

  useEffect(() => {
    ;(async () => {
      const [prods, ins] = await Promise.all([
        supabase
          .from('produtos')
          .select('id, nome, disponivel, categorias(nome), produto_tamanhos(id, nome_tamanho, preco_venda)')
          .order('nome'),
        supabase.from('insumos').select('id, nome, unidade_medida, quantidade_atual, estoque_minimo, custo_unitario').order('nome'),
      ])
      if (prods.error || ins.error) setErro((prods.error ?? ins.error)!.message)
      else {
        setProdutos(
          (prods.data as unknown as ProdutoRaw[]).map((p) => {
            const cat = Array.isArray(p.categorias) ? p.categorias[0] : p.categorias
            return {
              id: p.id,
              nome: p.nome,
              disponivel: p.disponivel,
              categoria: cat?.nome ?? 'Sem categoria',
              produto_tamanhos: [...p.produto_tamanhos].sort((a, b) => a.preco_venda - b.preco_venda),
            }
          })
        )
        setInsumos(ins.data as Insumo[])
      }
      await carregarSemFicha()
      setLoading(false)
    })()
  }, [carregarSemFicha])

  const produto = useMemo(() => produtos.find((p) => p.id === selecionadoId) ?? null, [produtos, selecionadoId])

  return (
    <>
      <PageHeader
        titulo="Fichas técnicas"
        descricao="Defina quanto de cada insumo vai em cada produto e tamanho. É a ficha que calcula o CMV e baixa o estoque a cada venda."
      />

      {erro && <p role="alert" className="mb-3 font-medium text-red-400">Não foi possível carregar: {erro}</p>}
      {loading ? (
        <p className="text-slate-400">Carregando…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <ProdutoLista produtos={produtos} semFicha={semFicha} selecionadoId={selecionadoId} onSelect={setSelecionadoId} />
          <div>
            {produto ? (
              <FichaEditor key={produto.id} produto={produto} insumos={insumos} onChanged={carregarSemFicha} />
            ) : (
              <div className="bg-superficie-alta p-8 text-center text-slate-400">
                <p>Escolha um produto na lista para montar ou revisar a ficha técnica.</p>
                {insumos.length === 0 && (
                  <p className="mt-2">
                    Ainda não há insumos cadastrados. Cadastre-os na tela Insumos (menu acima) primeiro.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
