'use client'

import type { ReactNode } from 'react'
import {
  brl, FORMAS_PAGAMENTO,
  type CartItem, type FormaPagamento, type PedidoMeta, type TipoPedido,
} from '@/lib/types'
import { DISPLAY, INPUT } from '@/lib/ui'

const TIPOS: { value: TipoPedido; label: string }[] = [
  { value: 'balcao', label: 'Balcão' },
  { value: 'mesa', label: 'Mesa' },
  { value: 'delivery', label: 'Delivery' },
]

interface Props {
  itens: CartItem[]
  meta: PedidoMeta
  subtotal: number
  total: number
  enviando: boolean
  erro: string | null
  onMetaChange: (patch: Partial<PedidoMeta>) => void
  onQuantidade: (key: string, delta: number) => void
  onRemover: (key: string) => void
  onLimpar: () => void
  onFinalizar: () => void
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  )
}

export default function OrderSummary(p: Props) {
  const { meta, itens } = p
  const delivery = meta.tipo === 'delivery'
  const taxa = delivery ? meta.taxaEntrega : 0

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-slate-300 bg-white lg:w-[26rem]">
      <div className="space-y-3 border-b border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className={`${DISPLAY} text-3xl font-bold text-[#14181F]`}>Pedido</h2>
          {itens.length > 0 && (
            <button type="button" onClick={p.onLimpar} className="text-sm font-medium text-slate-600 underline">
              Limpar
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-md bg-slate-100 p-1" role="group" aria-label="Tipo do pedido">
          {TIPOS.map((t) => (
            <button key={t.value} type="button" aria-pressed={meta.tipo === t.value}
              onClick={() => p.onMetaChange({ tipo: t.value })}
              className={
                'rounded py-2 text-sm font-semibold transition-colors ' +
                (meta.tipo === t.value ? 'bg-[#14181F] text-white' : 'text-slate-700 hover:bg-white')
              }>
              {t.label}
            </button>
          ))}
        </div>

        {meta.tipo === 'mesa' && (
          <Campo label="Número da mesa">
            <input className={INPUT} value={meta.mesa} onChange={(e) => p.onMetaChange({ mesa: e.target.value })} />
          </Campo>
        )}

        {delivery && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Cliente">
                <input className={INPUT} value={meta.clienteNome}
                  onChange={(e) => p.onMetaChange({ clienteNome: e.target.value })} />
              </Campo>
              <Campo label="Telefone">
                <input className={INPUT} inputMode="tel" value={meta.clienteTelefone}
                  onChange={(e) => p.onMetaChange({ clienteTelefone: e.target.value })} />
              </Campo>
            </div>
            <Campo label="Endereço de entrega">
              <input className={INPUT} value={meta.endereco}
                onChange={(e) => p.onMetaChange({ endereco: e.target.value })} />
            </Campo>
            <Campo label="Taxa de entrega (R$)">
              <input className={INPUT} type="number" min={0} step="0.5" inputMode="decimal"
                value={meta.taxaEntrega || ''}
                onChange={(e) => p.onMetaChange({ taxaEntrega: Math.max(0, Number(e.target.value) || 0) })} />
            </Campo>
          </div>
        )}
      </div>

      {/* Itens */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {itens.length === 0 ? (
          <p className="py-10 text-center text-slate-600">Toque em um produto para adicionar ao pedido.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {itens.map((i) => (
              <li key={i.key} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight text-[#14181F]">{i.nome_produto}</p>
                    <p className="text-sm text-slate-600">{i.nome_tamanho}</p>
                    {i.observacoes && (
                      <p className="mt-1 inline-block bg-[#F2B705]/35 px-1 text-sm font-medium text-[#14181F]">
                        {i.observacoes}
                      </p>
                    )}
                  </div>
                  <p className={`${DISPLAY} text-xl font-semibold tabular-nums`}>{brl(i.preco_unitario * i.quantidade)}</p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label={`Diminuir ${i.nome_produto}`} onClick={() => p.onQuantidade(i.key, -1)}
                      className="h-9 w-9 rounded-md border border-slate-300 hover:border-[#14181F]">−</button>
                    <span className="w-8 text-center font-semibold tabular-nums">{i.quantidade}</span>
                    <button type="button" aria-label={`Aumentar ${i.nome_produto}`} onClick={() => p.onQuantidade(i.key, 1)}
                      className="h-9 w-9 rounded-md border border-slate-300 hover:border-[#14181F]">+</button>
                  </div>
                  <button type="button" onClick={() => p.onRemover(i.key)} className="text-sm text-slate-600 underline">
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Totais e envio */}
      <div className="space-y-3 border-t border-slate-300 bg-slate-50 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Campo label="Pagamento">
            <select className={INPUT} value={meta.formaPagamento}
              onChange={(e) => p.onMetaChange({ formaPagamento: e.target.value as FormaPagamento | '' })}>
              <option value="">Definir depois</option>
              {FORMAS_PAGAMENTO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Campo>
          <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-700">
            <input type="checkbox" className="h-5 w-5 accent-[#2F7D4F]" checked={meta.pago}
              onChange={(e) => p.onMetaChange({ pago: e.target.checked })} />
            Já está pago
          </label>
        </div>

        <Campo label="Observações do pedido">
          <input className={INPUT} value={meta.observacoes}
            onChange={(e) => p.onMetaChange({ observacoes: e.target.value })} />
        </Campo>

        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-slate-600">Subtotal</dt><dd className="tabular-nums">{brl(p.subtotal)}</dd></div>
          {delivery && (
            <div className="flex justify-between"><dt className="text-slate-600">Taxa de entrega</dt><dd className="tabular-nums">{brl(taxa)}</dd></div>
          )}
          <div className="flex items-baseline justify-between border-t border-slate-300 pt-2">
            <dt className="font-semibold">Total</dt>
            <dd className={`${DISPLAY} text-4xl font-bold tabular-nums text-[#14181F]`}>{brl(p.total)}</dd>
          </div>
        </dl>

        {p.erro && <p role="alert" className="text-sm font-medium text-[#B42318]">{p.erro}</p>}

        <button type="button" onClick={p.onFinalizar} disabled={p.enviando || itens.length === 0}
          className="w-full rounded-md bg-[#D7372B] py-4 text-lg font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D7372B] disabled:cursor-not-allowed disabled:opacity-50">
          {p.enviando ? 'Enviando…' : 'Finalizar pedido'}
        </button>
      </div>
    </aside>
  )
}
