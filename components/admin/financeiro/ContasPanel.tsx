'use client'

import { useMemo, useState } from 'react'
import { parseNum } from '@/lib/admin'
import {
  atualizarConta, CATEGORIAS_PAGAR, CATEGORIAS_RECEBER, criarConta, resumirContas, situacaoConta,
  type Conta, type SituacaoConta, type TipoConta,
} from '@/lib/contas'
import { iso } from '@/lib/periodo'
import { msgErro } from '@/lib/pedidos'
import { brl } from '@/lib/types'
import { DISPLAY, INPUT } from '@/lib/ui'
import { BTN_DARK, BTN_GHOST, Campo, Modal, Tag } from '../ui'

const SITUACAO: Record<SituacaoConta, { rotulo: string; tone: 'green' | 'red' | 'amber' | 'slate' }> = {
  paga: { rotulo: 'Paga', tone: 'green' },
  vencida: { rotulo: 'Vencida', tone: 'red' },
  a_vencer: { rotulo: 'A vencer', tone: 'amber' },
  cancelada: { rotulo: 'Cancelada', tone: 'slate' },
}

const dataBr = (d: string) => d.split('-').reverse().join('/')

interface Props {
  contas: Conta[]
  erro: string | null
  onMudou: () => void | Promise<void>
}

export default function ContasPanel({ contas, erro, onMudou }: Props) {
  const [filtro, setFiltro] = useState<'todas' | TipoConta>('todas')
  const [novo, setNovo] = useState<TipoConta | null>(null)
  const [erroAcao, setErroAcao] = useState<string | null>(null)
  const hoje = iso(new Date())
  const resumo = useMemo(() => resumirContas(contas), [contas])
  const lista = contas.filter((c) => filtro === 'todas' || c.tipo === filtro)

  async function agir(fn: () => Promise<void>) {
    try { setErroAcao(null); await fn(); await onMudou() } catch (e) { setErroAcao(msgErro(e)) }
  }

  if (erro) {
    return (
      <p role="alert" className="bg-superficie-alta p-6 font-medium text-red-400">
        Não foi possível carregar as contas: {erro}. Se esta é a primeira vez, rode a migração
        <code className="mx-1">20261106_caixa_contas_pagamentos.sql</code> no Supabase.
      </p>
    )
  }

  return (
    <section className="space-y-4 bg-superficie-alta p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={`${DISPLAY} text-3xl font-bold`}>Contas do período</h2>
          <p className="text-sm text-slate-400">
            Despesas {brl(resumo.despesas)} ({brl(resumo.despesasAbertas)} em aberto) · Outras receitas {brl(resumo.outrasReceitas)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={BTN_DARK} onClick={() => setNovo('pagar')}>＋ Conta a pagar</button>
          <button type="button" className={BTN_GHOST} onClick={() => setNovo('receber')}>＋ Conta a receber</button>
        </div>
      </div>

      <div className="flex gap-1" role="group" aria-label="Filtrar por tipo">
        {([['todas', 'Todas'], ['pagar', 'A pagar'], ['receber', 'A receber']] as const).map(([v, r]) => (
          <button key={v} type="button" aria-pressed={filtro === v} onClick={() => setFiltro(v)}
            className={'rounded px-3 py-1.5 text-sm font-semibold ' +
              (filtro === v ? 'bg-white/15 text-white' : 'text-slate-400 hover:bg-white/5')}>
            {r}
          </button>
        ))}
      </div>

      {erroAcao && <p role="alert" className="text-sm text-red-400">{erroAcao}</p>}

      {lista.length === 0 ? (
        <p className="py-8 text-center text-slate-400">Nenhuma conta com vencimento neste período.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="py-2 pr-3">Vencimento</th>
                <th className="py-2 pr-3">Descrição</th>
                <th className="py-2 pr-3">Categoria</th>
                <th className="py-2 pr-3 text-right">Valor</th>
                <th className="py-2 pr-3">Situação</th>
                <th className="py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {lista.map((c) => {
                const sit = SITUACAO[situacaoConta(c, hoje)]
                const receber = c.tipo === 'receber'
                return (
                  <tr key={c.id} className={c.cancelada ? 'opacity-50' : ''}>
                    <td className="py-2 pr-3 tabular-nums">{dataBr(c.vencimento)}</td>
                    <td className="py-2 pr-3">
                      <span className="font-medium text-white">{c.descricao}</span>
                      {c.fornecedor_cliente && <span className="block text-xs text-slate-400">{c.fornecedor_cliente}</span>}
                    </td>
                    <td className="py-2 pr-3 text-slate-300">{receber ? '＋ ' : '− '}{c.categoria}</td>
                    <td className={`py-2 pr-3 text-right font-semibold tabular-nums ${receber ? 'text-sucesso-claro' : ''}`}>{brl(c.valor)}</td>
                    <td className="py-2 pr-3"><Tag tone={sit.tone}>{sit.rotulo}</Tag></td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        {!c.cancelada && !c.pago_em && (
                          <button type="button" className={BTN_GHOST}
                            onClick={() => agir(() => atualizarConta(c.id, { pago_em: hoje }))}>
                            {receber ? 'Recebida' : 'Paga'}
                          </button>
                        )}
                        {!c.cancelada && c.pago_em && (
                          <button type="button" className={BTN_GHOST}
                            onClick={() => agir(() => atualizarConta(c.id, { pago_em: null }))}>
                            Reabrir
                          </button>
                        )}
                        {!c.cancelada && !c.pago_em && (
                          <button type="button" className={BTN_GHOST}
                            onClick={() => agir(() => atualizarConta(c.id, { cancelada: true }))}>
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {novo && <ContaModal tipo={novo} onClose={() => setNovo(null)} onSalvo={async () => { setNovo(null); await onMudou() }} />}
    </section>
  )
}

function ContaModal({ tipo, onClose, onSalvo }: { tipo: TipoConta; onClose: () => void; onSalvo: () => Promise<void> }) {
  const categorias = tipo === 'pagar' ? CATEGORIAS_PAGAR : CATEGORIAS_RECEBER
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState(categorias[0])
  const [parte, setParte] = useState('')
  const [valorTxt, setValorTxt] = useState('')
  const [vencimento, setVencimento] = useState(iso(new Date()))
  const [repetir, setRepetir] = useState(1)
  const [jaPaga, setJaPaga] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    const valor = parseNum(valorTxt)
    if (!descricao.trim()) return setErro('Informe a descrição.')
    if (valor == null || valor <= 0) return setErro('Informe um valor maior que zero.')
    if (!vencimento) return setErro('Informe o vencimento.')
    setSalvando(true)
    try {
      // "Repetir" cria parcelas/meses seguintes (ex.: aluguel por 12 meses).
      for (let i = 0; i < repetir; i++) {
        const d = new Date(`${vencimento}T00:00:00`)
        const dia = d.getDate()
        d.setDate(1)
        d.setMonth(d.getMonth() + i)
        d.setDate(Math.min(dia, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()))
        await criarConta({
          tipo, descricao: repetir > 1 ? `${descricao.trim()} (${i + 1}/${repetir})` : descricao.trim(),
          categoria, fornecedor_cliente: parte.trim() || null, valor, vencimento: iso(d),
          observacoes: null, pago_em: jaPaga && i === 0 ? iso(new Date()) : null,
        })
      }
      await onSalvo()
    } catch (e) {
      setErro(msgErro(e))
      setSalvando(false)
    }
  }

  return (
    <Modal title={tipo === 'pagar' ? 'Nova conta a pagar' : 'Nova conta a receber'} onClose={onClose}>
      <Campo label="Descrição">
        <input className={INPUT} autoFocus value={descricao} onChange={(e) => setDescricao(e.target.value)}
          placeholder={tipo === 'pagar' ? 'Ex.: Aluguel do salão' : 'Ex.: Encomenda de festa'} />
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Categoria">
          <select className={INPUT} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Campo>
        <Campo label={tipo === 'pagar' ? 'Fornecedor' : 'Cliente'}>
          <input className={INPUT} value={parte} onChange={(e) => setParte(e.target.value)} />
        </Campo>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Campo label="Valor (R$)">
          <input className={INPUT} inputMode="decimal" value={valorTxt} onChange={(e) => setValorTxt(e.target.value)} />
        </Campo>
        <Campo label="Vencimento">
          <input className={INPUT} type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
        </Campo>
        <Campo label="Repetir (meses)">
          <input className={INPUT} type="number" min={1} max={36} value={repetir}
            onChange={(e) => setRepetir(Math.min(36, Math.max(1, Number(e.target.value) || 1)))} />
        </Campo>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" className="h-5 w-5 accent-sucesso" checked={jaPaga} onChange={(e) => setJaPaga(e.target.checked)} />
        {tipo === 'pagar' ? 'Já foi paga' : 'Já foi recebida'}
      </label>
      {erro && <p role="alert" className="text-sm text-red-400">{erro}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className={BTN_GHOST} onClick={onClose}>Cancelar</button>
        <button type="button" className={BTN_DARK} disabled={salvando} onClick={salvar}>Salvar</button>
      </div>
    </Modal>
  )
}
