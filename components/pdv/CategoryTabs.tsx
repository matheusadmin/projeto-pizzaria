'use client'

import type { Categoria } from '@/lib/types'

interface Props {
  categorias: Categoria[]
  ativaId: string | null
  onSelect: (id: string) => void
}

export default function CategoryTabs({ categorias, ativaId, onSelect }: Props) {
  return (
    <nav aria-label="Categorias" className="flex gap-2 overflow-x-auto pb-1">
      {categorias.map((c) => {
        const ativa = c.id === ativaId
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={ativa}
            onClick={() => onSelect(c.id)}
            className={
              'shrink-0 rounded-md border px-5 py-3 text-base font-semibold transition-colors ' +
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca ' +
              (ativa
                ? 'border-marca bg-marca text-fundo'
                : 'border-white/15 bg-superficie text-slate-200 hover:border-marca/60 hover:bg-superficie-alta')
            }
          >
            {c.nome}
          </button>
        )
      })}
    </nav>
  )
}
