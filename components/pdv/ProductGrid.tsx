'use client'

import { brl, type Produto } from '@/lib/types'
import { DISPLAY } from '@/lib/ui'

interface Props {
  produtos: Produto[]
  onSelect: (produto: Produto) => void
}

export default function ProductGrid({ produtos, onSelect }: Props) {
  if (produtos.length === 0) {
    return <p className="py-12 text-center text-slate-400">Nenhum produto disponível nesta categoria.</p>
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {produtos.map((p) => {
        const tamanhos = p.produto_tamanhos
        const semPreco = tamanhos.length === 0
        return (
          <li key={p.id}>
            <button
              type="button"
              disabled={semPreco}
              onClick={() => onSelect(p)}
              className="flex h-full w-full flex-col justify-between gap-3 rounded-md border border-white/10 bg-superficie p-4 text-left transition-colors hover:border-marca/60 hover:bg-superficie-alta active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>
                <span className="block text-lg font-semibold leading-tight text-white">{p.nome}</span>
                {p.descricao && (
                  <span className="mt-1 line-clamp-2 block text-sm text-slate-400">{p.descricao}</span>
                )}
              </span>
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-slate-400">
                  {semPreco ? 'Sem preço cadastrado' : tamanhos.length > 1 ? `${tamanhos.length} tamanhos, a partir de` : 'Preço'}
                </span>
                {!semPreco && (
                  <span className={`${DISPLAY} text-2xl font-semibold tabular-nums text-marca`}>
                    {brl(tamanhos[0].preco_venda)}
                  </span>
                )}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
