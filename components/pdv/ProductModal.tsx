'use client'

import { useEffect, useState } from 'react'
import { brl, type CartItem, type Produto } from '@/lib/types'
import { DISPLAY, INPUT } from '@/lib/ui'

// Atalhos de observação frequentes; tocar adiciona ao campo de texto.
const ATALHOS = ['Sem cebola', 'Meio a meio', 'Sem tomate', 'Bem passado']

interface Props {
  produto: Produto
  onClose: () => void
  onConfirm: (item: Omit<CartItem, 'key'>) => void
}

export default function ProductModal({ produto, onClose, onConfirm }: Props) {
  const [tamanhoId, setTamanhoId] = useState(produto.produto_tamanhos[0]?.id ?? '')
  const [quantidade, setQuantidade] = useState(1)
  const [obs, setObs] = useState('')

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onClose])

  const tamanho = produto.produto_tamanhos.find((t) => t.id === tamanhoId)

  const adicionarAtalho = (texto: string) =>
    setObs((atual) =>
      atual.toLowerCase().includes(texto.toLowerCase()) ? atual : atual ? `${atual}, ${texto}` : texto
    )

  function confirmar() {
    if (!tamanho) return
    onConfirm({
      produto_id: produto.id,
      tamanho_id: tamanho.id,
      nome_produto: produto.nome,
      nome_tamanho: tamanho.nome_tamanho,
      preco_unitario: tamanho.preco_venda,
      quantidade,
      observacoes: obs.trim(),
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#14181F]/70 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-label={produto.nome}
        className="w-full max-w-lg space-y-5 rounded-md bg-white p-5">
        <header>
          <h2 className={`${DISPLAY} text-3xl font-bold text-[#14181F]`}>{produto.nome}</h2>
          {produto.descricao && <p className="mt-1 text-sm text-slate-600">{produto.descricao}</p>}
        </header>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">Tamanho</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {produto.produto_tamanhos.map((t) => {
              const ativo = t.id === tamanhoId
              return (
                <button key={t.id} type="button" aria-pressed={ativo} onClick={() => setTamanhoId(t.id)}
                  className={
                    'rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D7372B] ' +
                    (ativo ? 'border-[#14181F] bg-[#14181F] text-white' : 'border-slate-300 hover:border-[#14181F]')
                  }>
                  <span className={`${DISPLAY} block text-2xl font-semibold leading-none`}>{t.nome_tamanho}</span>
                  <span className="text-sm tabular-nums">{brl(t.preco_venda)}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <div>
          <label htmlFor="obs" className="mb-2 block text-sm font-medium text-slate-700">Observações</label>
          <textarea id="obs" rows={2} className={INPUT} value={obs} onChange={(e) => setObs(e.target.value)}
            placeholder="Ex.: sem cebola, meio calabresa meio mussarela" />
          <div className="mt-2 flex flex-wrap gap-2">
            {ATALHOS.map((a) => (
              <button key={a} type="button" onClick={() => adicionarAtalho(a)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-sm hover:border-[#14181F]">
                {a}
              </button>
            ))}
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <div className="flex items-center gap-1" role="group" aria-label="Quantidade">
            <button type="button" aria-label="Diminuir quantidade" onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              className="h-11 w-11 rounded-md border border-slate-300 text-xl hover:border-[#14181F]">−</button>
            <span className={`${DISPLAY} w-10 text-center text-3xl font-semibold tabular-nums`}>{quantidade}</span>
            <button type="button" aria-label="Aumentar quantidade" onClick={() => setQuantidade((q) => q + 1)}
              className="h-11 w-11 rounded-md border border-slate-300 text-xl hover:border-[#14181F]">+</button>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-3 font-semibold hover:border-[#14181F]">
              Cancelar
            </button>
            <button type="button" onClick={confirmar} disabled={!tamanho}
              className="rounded-md bg-[#D7372B] px-5 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D7372B] disabled:opacity-50">
              Adicionar {tamanho ? brl(tamanho.preco_venda * quantidade) : ''}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
