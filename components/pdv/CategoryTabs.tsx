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
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D7372B] ' +
              (ativa
                ? 'border-[#D7372B] bg-[#D7372B] text-white'
                : 'border-slate-300 bg-white text-[#14181F] hover:border-[#D7372B]')
            }
          >
            {c.nome}
          </button>
        )
      })}
    </nav>
  )
}
