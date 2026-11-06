'use client'

import { useMemo, useState } from 'react'
import { norm, type ProdutoAdmin } from '@/lib/admin'
import { INPUT } from '@/lib/ui'
import { Tag } from '../ui'

interface Props {
  produtos: ProdutoAdmin[]
  semFicha: Set<string>        // produtos com pelo menos um tamanho sem ficha técnica
  selecionadoId: string | null
  onSelect: (id: string) => void
}

export default function ProdutoLista({ produtos, semFicha, selecionadoId, onSelect }: Props) {
  const [busca, setBusca] = useState('')

  const grupos = useMemo(() => {
    const q = norm(busca)
    const mapa = new Map<string, ProdutoAdmin[]>()
    for (const p of produtos) {
      if (q && !norm(p.nome).includes(q)) continue
      mapa.set(p.categoria, [...(mapa.get(p.categoria) ?? []), p])
    }
    return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [produtos, busca])

  return (
    <div className="bg-superficie-alta">
      <div className="border-b border-white/10 p-3">
        <input className={INPUT} placeholder="Buscar produto" aria-label="Buscar produto"
          value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      <div className="max-h-[70vh] overflow-y-auto">
        {grupos.length === 0 && <p className="p-4 text-sm text-slate-400">Nenhum produto encontrado.</p>}
        {grupos.map(([categoria, itens]) => (
          <section key={categoria}>
            <h2 className="bg-white/5 px-3 py-1.5 text-sm font-semibold text-slate-300">{categoria}</h2>
            <ul>
              {itens.map((p) => {
                const ativo = p.id === selecionadoId
                return (
                  <li key={p.id}>
                    <button type="button" aria-current={ativo ? 'true' : undefined} onClick={() => onSelect(p.id)}
                      className={
                        'flex w-full items-center justify-between gap-2 border-l-4 px-3 py-2.5 text-left text-sm ' +
                        (ativo ? 'border-marca bg-white/5 font-semibold' : 'border-transparent hover:bg-white/5')
                      }>
                      <span className={p.disponivel ? '' : 'text-slate-400 line-through'}>{p.nome}</span>
                      {p.produto_tamanhos.length === 0
                        ? <Tag tone="slate">Sem preço</Tag>
                        : semFicha.has(p.id) && <Tag tone="amber">Sem ficha</Tag>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
