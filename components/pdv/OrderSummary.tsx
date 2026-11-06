'use client'

import type { ReactNode } from 'react'
import {
  brl, FORMAS_PAGAMENTO,
  type CartItem, type FormaPagamento, type PedidoMeta, type TipoPedido,
} from '@/lib/types'
import { DISPLAY, INPUT_DARK } from '@/lib/ui'
import { OUTRO, bairrosDaCidade, cidades, taxaDoBairro } from '@/lib/taxasEntrega'
import ClienteSugerido from './ClienteSugerido'

// As quatro frentes de atendimento do PDV.
const TIPOS: { value: TipoPedido; label: string }[] = [
  { value: 'mesa', label: 'Salão' },
  { value: 'balcao', label: 'Balcão' },
  { value: 'retirada', label: 'Retirada' },
  { value: 'delivery', label: 'Entrega' },
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
    <label className="block space-y-1 text-sm font-medium text-slate-300">
      {label}
      {children}
    </label>
  )
}

const BTN_QTD =
  'h-9 w-9 rounded-md border border-white/15 text-slate-100 hover:border-marca/60 hover:bg-white/5 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-marca'

export default function OrderSummary(p: Props) {
  const { meta, itens } = p
  const delivery = meta.tipo === 'delivery'
  const retirada = meta.tipo === 'retirada'
  const taxa = delivery ? meta.taxaEntrega : 0
  const listaCidades = cidades()
  const bairros = bairrosDaCidade(meta.cidade)

  // Escolher a cidade zera o bairro; escolher o bairro preenche a taxa sozinha.
  function escolherCidade(cidade: string) {
    p.onMetaChange({ cidade, bairro: '', taxaEntrega: 0 })
  }
  function escolherBairro(bairro: string) {
    const valor = bairro === OUTRO || bairro === '' ? null : taxaDoBairro(meta.cidade, bairro)
    p.onMetaChange({ bairro, ...(valor != null ? { taxaEntrega: valor } : {}) })
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-white/10 bg-superficie lg:w-[26rem]">
      <div className="space-y-3 border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <h2 className={`${DISPLAY} text-3xl font-bold text-white`}>Pedido</h2>
          {itens.length > 0 && (
            <button type="button" onClick={p.onLimpar} className="text-sm font-medium text-slate-400 underline hover:text-white">
              Limpar
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1 rounded-md bg-fundo p-1" role="group" aria-label="Tipo do pedido">
          {TIPOS.map((t) => (
            <button key={t.value} type="button" aria-pressed={meta.tipo === t.value}
              onClick={() => p.onMetaChange({ tipo: t.value })}
              className={
                'rounded py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-marca ' +
                (meta.tipo === t.value ? 'bg-marca text-fundo' : 'text-slate-300 hover:bg-white/10')
              }>
              {t.label}
            </button>
          ))}
        </div>

        {meta.tipo === 'mesa' && (
          <Campo label="Número da mesa">
            <input className={INPUT_DARK} inputMode="numeric" value={meta.mesa}
              onChange={(e) => p.onMetaChange({ mesa: e.target.value })} />
          </Campo>
        )}

        {retirada && (
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Nome de quem retira">
              <input className={INPUT_DARK} value={meta.clienteNome}
                onChange={(e) => p.onMetaChange({ clienteNome: e.target.value })} />
            </Campo>
            <Campo label="Telefone">
              <input className={INPUT_DARK} inputMode="tel" value={meta.clienteTelefone}
                onChange={(e) => p.onMetaChange({ clienteTelefone: e.target.value })} />
            </Campo>
          </div>
        )}

        {delivery && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Cliente">
                <input className={INPUT_DARK} value={meta.clienteNome}
                  onChange={(e) => p.onMetaChange({ clienteNome: e.target.value })} />
              </Campo>
              <Campo label="Telefone">
                <input className={INPUT_DARK} inputMode="tel" value={meta.clienteTelefone}
                  onChange={(e) => p.onMetaChange({ clienteTelefone: e.target.value })} />
              </Campo>
            </div>
            <Campo label="Endereço de entrega (rua e número)">
              <input className={INPUT_DARK} value={meta.endereco}
                onChange={(e) => p.onMetaChange({ endereco: e.target.value })} />
            </Campo>
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Cidade">
                <select className={INPUT_DARK} value={meta.cidade} onChange={(e) => escolherCidade(e.target.value)}>
                  <option value="">Selecione…</option>
                  {listaCidades.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Campo>
              <Campo label="Bairro">
                <select className={INPUT_DARK} value={meta.bairro} disabled={!meta.cidade}
                  onChange={(e) => escolherBairro(e.target.value)}>
                  <option value="">Selecione…</option>
                  {bairros.map((b) => (
                    <option key={b.bairro} value={b.bairro}>{b.bairro} — {brl(b.taxa)}</option>
                  ))}
                  <option value={OUTRO}>Outro (digitar taxa)</option>
                </select>
              </Campo>
            </div>
            <Campo label="Taxa de entrega (R$)">
              <input className={INPUT_DARK} type="number" min={0} step="0.5" inputMode="decimal"
                value={meta.taxaEntrega || ''}
                onChange={(e) => p.onMetaChange({ taxaEntrega: Math.max(0, Number(e.target.value) || 0) })} />
            </Campo>
          </div>
        )}

        {(delivery || retirada) && (
          <ClienteSugerido telefone={meta.clienteTelefone} entrega={delivery} onUsar={p.onMetaChange} />
        )}
      </div>

      {/* Itens */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {itens.length === 0 ? (
          <p className="py-10 text-center text-slate-400">Toque em um produto para adicionar ao pedido.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {itens.map((i) => (
              <li key={i.key} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight text-white">{i.nome_produto}</p>
                    <p className="text-sm text-slate-400">{i.nome_tamanho}</p>
                    {i.observacoes && (
                      <p className="mt-1 inline-block rounded-sm border border-marca/40 bg-marca/15 px-1.5 text-sm font-medium text-marca">
                        {i.observacoes}
                      </p>
                    )}
                  </div>
                  <p className={`${DISPLAY} text-xl font-semibold tabular-nums text-white`}>{brl(i.preco_unitario * i.quantidade)}</p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label={`Diminuir ${i.nome_produto}`} onClick={() => p.onQuantidade(i.key, -1)} className={BTN_QTD}>−</button>
                    <span className="w-8 text-center font-semibold tabular-nums">{i.quantidade}</span>
                    <button type="button" aria-label={`Aumentar ${i.nome_produto}`} onClick={() => p.onQuantidade(i.key, 1)} className={BTN_QTD}>+</button>
                  </div>
                  <button type="button" onClick={() => p.onRemover(i.key)} className="text-sm text-slate-400 underline hover:text-red-400">
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Totais e envio */}
      <div className="space-y-3 border-t border-white/10 bg-superficie-alta p-4">
        <div className="grid grid-cols-2 gap-2">
          <Campo label="Pagamento">
            <select className={INPUT_DARK} value={meta.formaPagamento}
              onChange={(e) => p.onMetaChange({ formaPagamento: e.target.value as FormaPagamento | '' })}>
              <option value="">Definir depois</option>
              {FORMAS_PAGAMENTO.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Campo>
          <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-300">
            <input type="checkbox" className="h-5 w-5 accent-sucesso" checked={meta.pago}
              onChange={(e) => p.onMetaChange({ pago: e.target.checked })} />
            Já está pago
          </label>
        </div>

        <Campo label="Observações do pedido">
          <input className={INPUT_DARK} value={meta.observacoes}
            onChange={(e) => p.onMetaChange({ observacoes: e.target.value })} />
        </Campo>

        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt className="text-slate-400">Subtotal</dt><dd className="tabular-nums">{brl(p.subtotal)}</dd></div>
          {delivery && (
            <div className="flex justify-between"><dt className="text-slate-400">Taxa de entrega</dt><dd className="tabular-nums">{brl(taxa)}</dd></div>
          )}
          <div className="flex items-baseline justify-between border-t border-white/10 pt-2">
            <dt className="font-semibold">Total</dt>
            <dd className={`${DISPLAY} text-4xl font-bold tabular-nums text-marca`}>{brl(p.total)}</dd>
          </div>
        </dl>

        {p.erro && <p role="alert" className="text-sm font-medium text-red-400">{p.erro}</p>}

        <button type="button" onClick={p.onFinalizar} disabled={p.enviando || itens.length === 0}
          className="w-full rounded-md bg-sucesso py-4 text-lg font-semibold text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sucesso-claro disabled:cursor-not-allowed disabled:opacity-50">
          {p.enviando ? 'Enviando…' : 'Finalizar pedido'}
        </button>
      </div>
    </aside>
  )
}
