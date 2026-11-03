'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { brl } from '@/lib/types'
import {
  COR_NIVEL, fmtPct, META_CMV_PADRAO, nivelMargem, norm, numParaInput, parseNum, type CmvTamanho,
} from '@/lib/admin'
import { DISPLAY, INPUT } from '@/lib/ui'
import { Tag } from '../ui'

type Ordem = 'pior' | 'melhor' | 'nome'

export default function MargemProdutos() {
  const [dados, setDados] = useState<CmvTamanho[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [metaTxt, setMetaTxt] = useState(numParaInput(META_CMV_PADRAO))
  const [ordem, setOrdem] = useState<Ordem>('pior')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    supabase
      .from('vw_cmv_produto_tamanho')
      .select('tamanho_id, produto_id, produto, nome_tamanho, preco_venda, cmv, margem_bruta')
      .then(({ data, error }) => {
        if (error) setErro(error.message)
        else setDados(data as CmvTamanho[])
        setLoading(false)
      })
  }, [])

  const meta = Math.min(100, Math.max(1, parseNum(metaTxt) ?? META_CMV_PADRAO))

  const linhas = useMemo(() => {
    const q = norm(busca)
    return dados
      .filter((d) => !q || norm(d.produto).includes(q))
      .map((d) => {
        const semFicha = d.cmv <= 0
        const cmvPct = semFicha || d.preco_venda <= 0 ? null : (d.cmv / d.preco_venda) * 100
        const margemPct = cmvPct == null ? null : 100 - cmvPct
        return { ...d, cmvPct, margemPct, nivel: nivelMargem(cmvPct, meta) }
      })
      .sort((a, b) => {
        if (ordem === 'nome') return a.produto.localeCompare(b.produto) || a.preco_venda - b.preco_venda
        const ka = a.margemPct ?? -Infinity // sem ficha: primeiro em "pior", último em "melhor"
        const kb = b.margemPct ?? -Infinity
        return ordem === 'pior' ? ka - kb : kb - ka
      })
  }, [dados, busca, meta, ordem])

  const abaixoMeta = linhas.filter((l) => l.nivel === 'atencao' || l.nivel === 'ruim').length
  const semFicha = linhas.filter((l) => l.nivel === 'sem_ficha').length

  return (
    <section className="bg-white p-6">
      <h2 className={`${DISPLAY} text-3xl font-bold`}>Margem por produto</h2>
      <p className="mb-4 max-w-2xl text-sm text-slate-600">
        Preço de venda contra o custo de fabricação calculado pela ficha técnica, por tamanho.
        Custos usam o valor atual dos insumos.
      </p>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Buscar produto
          <input className={`${INPUT} w-52`} value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Meta de CMV (%)
          <input className={`${INPUT} w-24`} inputMode="decimal" value={metaTxt} onChange={(e) => setMetaTxt(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm font-medium text-slate-700">
          Ordenar por
          <select className={`${INPUT} w-48`} value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)}>
            <option value="pior">Pior margem primeiro</option>
            <option value="melhor">Melhor margem primeiro</option>
            <option value="nome">Nome do produto</option>
          </select>
        </label>
        <div className="flex gap-2 pb-2 text-sm">
          {abaixoMeta > 0 && <Tag tone="red">{abaixoMeta} fora da meta</Tag>}
          {semFicha > 0 && <Tag tone="slate">{semFicha} sem ficha</Tag>}
        </div>
      </div>

      {erro && <p role="alert" className="mb-3 font-medium text-[#B42318]">Não foi possível carregar: {erro}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead className="border-b border-slate-300 text-slate-600">
            <tr>
              <th className="py-3 pr-4 font-medium">Produto</th>
              <th className="px-4 py-3 text-right font-medium">Preço de venda</th>
              <th className="px-4 py-3 text-right font-medium">Custo (CMV)</th>
              <th className="px-4 py-3 text-right font-medium">CMV %</th>
              <th className="px-4 py-3 text-right font-medium">Margem R$</th>
              <th className="py-3 pl-4 font-medium">Margem %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading && <tr><td colSpan={6} className="py-8 text-center text-slate-600">Carregando…</td></tr>}
            {!loading && linhas.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-slate-600">Nenhum produto com preço cadastrado.</td></tr>
            )}
            {linhas.map((l) => {
              const cor = COR_NIVEL[l.nivel]
              return (
                <tr key={l.tamanho_id}>
                  <td className="py-2.5 pr-4">
                    <span className="font-semibold">{l.produto}</span>
                    <span className="ml-2 text-slate-600">{l.nome_tamanho}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{brl(l.preco_venda)}</td>
                  {l.nivel === 'sem_ficha' ? (
                    <td colSpan={3} className="px-4 py-2.5 text-right">
                      <Link href={`/admin/fichas?produto=${l.produto_id}`} className="font-medium text-[#14181F] underline">
                        Cadastrar ficha técnica
                      </Link>
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 text-right tabular-nums">{brl(l.cmv)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtPct(l.cmvPct)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{brl(l.margem_bruta)}</td>
                    </>
                  )}
                  <td className="py-2.5 pl-4">
                    {l.margemPct == null ? (
                      <Tag tone="slate">Sem ficha</Tag>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-24 bg-slate-200" role="img" aria-label={`Margem de ${fmtPct(l.margemPct)}, ${cor.rotulo}`}>
                          <div className={`h-full ${cor.fundo}`} style={{ width: `${Math.min(100, Math.max(0, l.margemPct))}%` }} />
                        </div>
                        <span className={`w-14 font-bold tabular-nums ${cor.texto}`}>{fmtPct(l.margemPct)}</span>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
