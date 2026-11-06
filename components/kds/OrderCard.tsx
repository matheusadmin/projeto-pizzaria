'use client'

import { useState } from 'react'
import type { PedidoKds } from '@/lib/types'
import { DISPLAY } from '@/lib/ui'

// A faixa do topo do ticket muda de cor conforme o tempo de espera.
function faixa(min: number, pronto: boolean) {
  if (pronto) return { cor: 'bg-sucesso text-white', urgente: false }
  if (min >= 20) return { cor: 'bg-perigo text-white', urgente: true }
  if (min >= 10) return { cor: 'bg-marca text-fundo', urgente: false }
  return { cor: 'bg-sucesso text-white', urgente: false }
}

interface Props {
  pedido: PedidoKds
  agora: number
  /** admin/caixa também podem despachar delivery direto pelo KDS; a cozinha só marca "pronto". */
  podeDespachar: boolean
  onAvancar: (id: string, status: 'pronto' | 'saiu_para_entrega') => Promise<void>
}

export default function OrderCard({ pedido, agora, podeDespachar, onAvancar }: Props) {
  const [enviando, setEnviando] = useState(false)

  const minutos = Math.max(0, Math.floor((agora - new Date(pedido.created_at).getTime()) / 60000))
  const pronto = pedido.status === 'pronto'
  const f = faixa(minutos, pronto)
  const origem =
    pedido.tipo === 'mesa' ? `Mesa ${pedido.mesa ?? '?'}`
      : pedido.tipo === 'delivery' ? 'Delivery'
      : pedido.tipo === 'retirada' ? 'Retirada'
      : 'Balcão'

  async function avancar(status: 'pronto' | 'saiu_para_entrega') {
    setEnviando(true)
    await onAvancar(pedido.id, status)
    setEnviando(false)
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-white/10 bg-superficie-alta text-slate-100 shadow-lg">
      <header className={`flex items-center justify-between px-4 py-3 ${f.cor}`}>
        <div className="flex items-baseline gap-3">
          <span className={`${DISPLAY} text-4xl font-bold leading-none`}>#{pedido.numero}</span>
          <span className="text-lg font-semibold">{origem}</span>
        </div>
        <span
          className={`${DISPLAY} text-3xl font-semibold tabular-nums ${f.urgente ? 'motion-safe:animate-pulse' : ''}`}
          aria-label={`${minutos} minutos de espera`}
        >
          {minutos} min
        </span>
      </header>

      {pedido.cliente_nome && (
        <p className="border-b border-dashed border-white/15 px-4 py-2 text-sm text-slate-400">
          {pedido.cliente_nome}
        </p>
      )}

      <ul className="divide-y divide-dashed divide-white/15 px-4">
        {pedido.itens_pedido.map((item) => (
          <li key={item.id} className="py-3">
            <div className="flex items-baseline gap-3">
              <span className={`${DISPLAY} text-3xl font-bold leading-none`}>{item.quantidade}×</span>
              <div>
                <p className="text-lg font-semibold leading-snug">{item.nome_produto}</p>
                {item.nome_tamanho !== 'Único' && (
                  <p className="text-base text-slate-400">{item.nome_tamanho}</p>
                )}
              </div>
            </div>
            {item.observacoes && (
              <p className="mt-2 bg-marca px-2 py-1 text-base font-bold text-fundo">Obs: {item.observacoes}</p>
            )}
          </li>
        ))}
      </ul>

      {pedido.observacoes && (
        <p className="mx-4 mb-3 border-l-4 border-marca bg-marca/20 px-3 py-2 font-semibold text-marca">
          Pedido: {pedido.observacoes}
        </p>
      )}

      <footer className="mt-auto space-y-2 p-4 pt-2">
        {pronto ? (
          <p className="rounded-md bg-sucesso/15 py-3 text-center text-lg font-semibold text-sucesso-claro">
            ✓ Pronto, aguardando {pedido.tipo === 'delivery' ? 'entregador' : pedido.tipo === 'mesa' ? 'garçom' : 'retirada'}
          </p>
        ) : (
          <button type="button" disabled={enviando} onClick={() => avancar('pronto')}
            className="w-full rounded-md bg-sucesso py-4 text-xl font-semibold text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sucesso-claro disabled:opacity-60">
            {enviando ? 'Enviando…' : 'Pedido pronto'}
          </button>
        )}

        {podeDespachar && pedido.tipo === 'delivery' && (
          <button type="button" disabled={enviando} onClick={() => avancar('saiu_para_entrega')}
            className="w-full rounded-md border-2 border-marca py-3 text-base font-semibold text-marca hover:bg-marca hover:text-fundo disabled:opacity-60">
            Saiu para entrega
          </button>
        )}
      </footer>
    </article>
  )
}
