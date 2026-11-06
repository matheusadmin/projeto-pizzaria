'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { brl4, fmtQtd, nivelEstoque, norm, type Insumo } from '@/lib/admin'
import { INPUT } from '@/lib/ui'
import { BTN_DARK, BTN_GHOST, BTN_RED, PageHeader, Tag } from '../ui'
import InsumoFormModal from './InsumoFormModal'
import MovimentarEstoqueModal from './MovimentarEstoqueModal'

const RANK = { abaixo: 0, no_minimo: 1, ok: 2 } as const

export default function InsumosScreen() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [soAlertas, setSoAlertas] = useState(false)
  const [form, setForm] = useState<{ insumo: Insumo | null } | null>(null)
  const [movendo, setMovendo] = useState<Insumo | null>(null)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('insumos')
      .select('id, nome, unidade_medida, quantidade_atual, estoque_minimo, custo_unitario')
      .order('nome')
    if (error) setErro(error.message)
    else { setErro(null); setInsumos(data as Insumo[]) }
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const alertas = useMemo(() => insumos.filter((i) => nivelEstoque(i) === 'abaixo'), [insumos])

  // Alertas primeiro, depois em ordem alfabética.
  const lista = useMemo(() => {
    const q = norm(busca)
    return insumos
      .filter((i) => (!q || norm(i.nome).includes(q)) && (!soAlertas || nivelEstoque(i) === 'abaixo'))
      .sort((a, b) => RANK[nivelEstoque(a)] - RANK[nivelEstoque(b)] || a.nome.localeCompare(b.nome))
  }, [insumos, busca, soAlertas])

  return (
    <>
      <PageHeader
        titulo="Insumos"
        descricao="Estoque e custo de cada matéria-prima. O custo unitário alimenta o CMV das fichas técnicas."
        acao={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/fichas" className={BTN_GHOST}>Fichas técnicas</Link>
            <button type="button" className={BTN_RED} onClick={() => setForm({ insumo: null })}>Novo insumo</button>
          </div>
        }
      />

      {alertas.length > 0 && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 border-l-4 border-perigo bg-superficie-alta p-4">
          <div>
            <p className="font-semibold text-red-400">
              {alertas.length === 1 ? '1 insumo abaixo do estoque mínimo' : `${alertas.length} insumos abaixo do estoque mínimo`}
            </p>
            <p className="text-sm text-slate-400">
              {alertas.slice(0, 6).map((a) => a.nome).join(', ')}
              {alertas.length > 6 ? ` e mais ${alertas.length - 6}` : ''}
            </p>
          </div>
          <button type="button" className={BTN_GHOST} onClick={() => setSoAlertas((v) => !v)}>
            {soAlertas ? 'Mostrar todos' : 'Ver só alertas'}
          </button>
        </div>
      )}

      <div className="mb-3">
        <input className={`${INPUT} max-w-sm`} placeholder="Buscar insumo" aria-label="Buscar insumo"
          value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {erro && <p role="alert" className="mb-3 font-medium text-red-400">Não foi possível carregar: {erro}</p>}

      <div className="overflow-x-auto bg-superficie-alta">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="border-b border-white/15 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Insumo</th>
              <th className="px-4 py-3 text-right font-medium">Em estoque</th>
              <th className="px-4 py-3 text-right font-medium">Mínimo</th>
              <th className="px-4 py-3 text-right font-medium">Custo unitário</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Carregando…</td></tr>}
            {!loading && lista.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {insumos.length === 0 ? 'Nenhum insumo cadastrado. Comece pelo botão “Novo insumo”.' : 'Nenhum insumo encontrado.'}
                </td>
              </tr>
            )}
            {lista.map((i) => {
              const nivel = nivelEstoque(i)
              return (
                <tr key={i.id} className={nivel === 'abaixo' ? 'bg-perigo/10' : ''}>
                  <td className={`border-l-4 px-4 py-3 font-semibold ${nivel === 'abaixo' ? 'border-perigo' : 'border-transparent'}`}>
                    {i.nome}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums ${nivel === 'abaixo' ? 'font-bold text-red-400' : ''}`}>
                    {fmtQtd(i.quantidade_atual)} {i.unidade_medida}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtQtd(i.estoque_minimo)} {i.unidade_medida}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{brl4(i.custo_unitario)} / {i.unidade_medida}</td>
                  <td className="px-4 py-3">
                    {nivel === 'abaixo' && (
                      <>
                        <Tag tone="red">Abaixo do mínimo</Tag>
                        <span className="mt-0.5 block text-xs text-red-400">
                          {i.quantidade_atual < 0 ? 'estoque negativo, confira a contagem' : `faltam ${fmtQtd(i.estoque_minimo - i.quantidade_atual)} ${i.unidade_medida}`}
                        </span>
                      </>
                    )}
                    {nivel === 'no_minimo' && <Tag tone="amber">No mínimo</Tag>}
                    {nivel === 'ok' && <Tag tone="green">Ok</Tag>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button type="button" className={`${BTN_GHOST} mr-2`} onClick={() => setMovendo(i)}>Movimentar</button>
                    <button type="button" className={BTN_DARK} onClick={() => setForm({ insumo: i })}>Editar</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {form && <InsumoFormModal insumo={form.insumo} onClose={() => setForm(null)} onSaved={carregar} />}
      {movendo && <MovimentarEstoqueModal insumo={movendo} onClose={() => setMovendo(null)} onSaved={carregar} />}
    </>
  )
}
