'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { msgErro } from '@/lib/pedidos'
import { brl } from '@/lib/types'
import {
  brl4, COR_NIVEL, fmtPct, META_CMV_PADRAO, nivelEstoque, nivelMargem, numParaInput, parseNum,
  type Insumo, type ProdutoAdmin,
} from '@/lib/admin'
import { DISPLAY, INPUT } from '@/lib/ui'
import { BTN_DARK, BTN_GHOST, Tag } from '../ui'

interface FichaRow {
  id: string
  tamanho_id: string
  insumo_id: string
  quantidade_necessaria: number
}

interface Props {
  produto: ProdutoAdmin
  insumos: Insumo[]
  onChanged: () => void // avisa a tela-pai para atualizar os indicadores "sem ficha"
}

export default function FichaEditor({ produto, insumos, onChanged }: Props) {
  const [tamanhoId, setTamanhoId] = useState(produto.produto_tamanhos[0]?.id ?? '')
  const [fichas, setFichas] = useState<FichaRow[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [novoInsumo, setNovoInsumo] = useState('')
  const [novaQtd, setNovaQtd] = useState('')
  const [origem, setOrigem] = useState('')
  const [fator, setFator] = useState('1')

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('ficha_tecnica')
      .select('id, tamanho_id, insumo_id, quantidade_necessaria')
      .eq('produto_id', produto.id)
    if (error) setErro(msgErro(error))
    else setFichas(data as FichaRow[])
  }, [produto.id])

  useEffect(() => { carregar() }, [carregar])

  /** Executa uma escrita, recarrega a ficha e avisa o pai. */
  async function executar(fn: () => PromiseLike<{ error: unknown }>) {
    setOcupado(true)
    setErro(null)
    const { error } = await fn()
    if (error) setErro(msgErro(error))
    await carregar()
    onChanged()
    setOcupado(false)
  }

  const mapaInsumo = useMemo(() => new Map(insumos.map((i) => [i.id, i])), [insumos])
  const tamanho = produto.produto_tamanhos.find((t) => t.id === tamanhoId)

  const linhas = useMemo(
    () =>
      fichas
        .filter((f) => f.tamanho_id === tamanhoId)
        .map((f) => {
          const ins = mapaInsumo.get(f.insumo_id)
          return { ...f, ins, custo: ins ? f.quantidade_necessaria * ins.custo_unitario : 0 }
        })
        .sort((a, b) => (a.ins?.nome ?? '').localeCompare(b.ins?.nome ?? '')),
    [fichas, tamanhoId, mapaInsumo]
  )

  const cmv = linhas.reduce((s, l) => s + l.custo, 0)
  const preco = tamanho?.preco_venda ?? 0
  const cmvPct = linhas.length > 0 && preco > 0 ? (cmv / preco) * 100 : null
  const margemPct = cmvPct == null ? null : 100 - cmvPct
  const cor = COR_NIVEL[nivelMargem(cmvPct, META_CMV_PADRAO)]

  const usados = new Set(linhas.map((l) => l.insumo_id))
  const disponiveis = insumos.filter((i) => !usados.has(i.id))
  const insumoNovo = mapaInsumo.get(novoInsumo)
  const tamanhosComFicha = produto.produto_tamanhos.filter(
    (t) => t.id !== tamanhoId && fichas.some((f) => f.tamanho_id === t.id)
  )
  const origemAtual = tamanhosComFicha.some((t) => t.id === origem) ? origem : tamanhosComFicha[0]?.id ?? ''

  async function adicionar() {
    const qtd = parseNum(novaQtd)
    if (!novoInsumo) return setErro('Escolha um insumo.')
    if (qtd == null || qtd <= 0) return setErro('Informe uma quantidade maior que zero.')
    await executar(() =>
      supabase.from('ficha_tecnica').insert({
        produto_id: produto.id, tamanho_id: tamanhoId, insumo_id: novoInsumo, quantidade_necessaria: qtd,
      })
    )
    setNovoInsumo('')
    setNovaQtd('')
  }

  async function salvarQuantidade(l: FichaRow, texto: string) {
    const qtd = parseNum(texto)
    if (qtd == null || qtd <= 0) {
      setErro('Quantidade inválida: use um número maior que zero.')
      return carregar() // restaura o valor anterior no campo
    }
    if (qtd === l.quantidade_necessaria) return
    await executar(() => supabase.from('ficha_tecnica').update({ quantidade_necessaria: qtd }).eq('id', l.id))
  }

  async function copiar() {
    const f = parseNum(fator)
    if (f == null || f <= 0) return setErro('O fator de escala deve ser maior que zero.')
    const linhasOrigem = fichas.filter((x) => x.tamanho_id === origemAtual)
    // ignoreDuplicates: insumos já presentes neste tamanho são preservados.
    await executar(() =>
      supabase.from('ficha_tecnica').upsert(
        linhasOrigem.map((x) => ({
          produto_id: produto.id,
          tamanho_id: tamanhoId,
          insumo_id: x.insumo_id,
          quantidade_necessaria: Number((x.quantidade_necessaria * f).toFixed(4)),
        })),
        { onConflict: 'produto_id,tamanho_id,insumo_id', ignoreDuplicates: true }
      )
    )
  }

  if (produto.produto_tamanhos.length === 0) {
    return <p className="bg-white p-6 text-slate-600">Este produto não tem tamanhos/preços cadastrados. Cadastre um tamanho (ex.: “Único”) para montar a ficha.</p>
  }

  return (
    <div className="space-y-4">
      <header>
        <h2 className={`${DISPLAY} text-3xl font-bold`}>{produto.nome}</h2>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Tamanho">
          {produto.produto_tamanhos.map((t) => (
            <button key={t.id} type="button" aria-pressed={t.id === tamanhoId} onClick={() => setTamanhoId(t.id)}
              className={'rounded-md border px-3 py-1.5 text-sm font-semibold ' +
                (t.id === tamanhoId ? 'border-[#14181F] bg-[#14181F] text-white' : 'border-slate-300 bg-white hover:border-[#14181F]')}>
              {t.nome_tamanho}
            </button>
          ))}
        </div>
      </header>

      {/* Resultado da ficha: preço, custo e margem do tamanho selecionado */}
      <dl className="grid grid-cols-2 gap-px bg-slate-300 sm:grid-cols-4">
        {[
          ['Preço de venda', brl(preco), ''],
          ['Custo (CMV)', linhas.length ? brl(cmv) : '—', ''],
          ['CMV sobre o preço', fmtPct(cmvPct), ''],
          ['Margem bruta', fmtPct(margemPct), cor.texto],
        ].map(([rotulo, valor, classe]) => (
          <div key={rotulo} className="bg-white px-4 py-3">
            <dt className="text-sm text-slate-600">{rotulo}</dt>
            <dd className={`${DISPLAY} text-3xl font-bold tabular-nums ${classe}`}>{valor}</dd>
          </div>
        ))}
      </dl>
      {cmvPct != null && <p className={`text-sm font-medium ${cor.texto}`}>{cor.rotulo} (meta de CMV: até {META_CMV_PADRAO}%)</p>}

      {erro && <p role="alert" className="font-medium text-[#B42318]">{erro}</p>}

      <div className="overflow-x-auto bg-white">
        <table className="w-full min-w-[38rem] text-left text-sm">
          <thead className="border-b border-slate-300 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Insumo</th>
              <th className="px-4 py-3 font-medium">Quantidade por unidade vendida</th>
              <th className="px-4 py-3 text-right font-medium">Custo do insumo</th>
              <th className="px-4 py-3 text-right font-medium">Custo na receita</th>
              <th className="px-4 py-3 text-right font-medium">% do CMV</th>
              <th className="px-4 py-3"><span className="sr-only">Remover</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {linhas.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                Nenhum insumo vinculado a este tamanho. Sem ficha técnica o CMV fica zerado e o estoque não é baixado.
              </td></tr>
            )}
            {linhas.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2 font-semibold">
                  {l.ins?.nome ?? 'Insumo removido'}
                  {l.ins && nivelEstoque(l.ins) === 'abaixo' && <span className="ml-2"><Tag tone="red">Estoque baixo</Tag></span>}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <input key={`${l.id}-${l.quantidade_necessaria}`} className={`${INPUT} w-28 tabular-nums`} inputMode="decimal"
                      aria-label={`Quantidade de ${l.ins?.nome ?? 'insumo'}`}
                      defaultValue={numParaInput(l.quantidade_necessaria)} disabled={ocupado}
                      onBlur={(e) => salvarQuantidade(l, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                    <span className="text-slate-600">{l.ins?.unidade_medida}</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{l.ins ? `${brl4(l.ins.custo_unitario)} / ${l.ins.unidade_medida}` : '—'}</td>
                <td className="px-4 py-2 text-right font-semibold tabular-nums">{brl4(l.custo)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtPct(cmv > 0 ? (l.custo / cmv) * 100 : null)}</td>
                <td className="px-4 py-2 text-right">
                  <button type="button" className={BTN_GHOST} disabled={ocupado}
                    onClick={() => executar(() => supabase.from('ficha_tecnica').delete().eq('id', l.id))}>
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vincular insumo */}
      <form className="flex flex-wrap items-end gap-3 bg-white p-4"
        onSubmit={(e) => { e.preventDefault(); adicionar() }}>
        <label className="min-w-[12rem] flex-1 space-y-1 text-sm font-medium text-slate-700">
          Vincular insumo
          <select className={INPUT} value={novoInsumo} onChange={(e) => setNovoInsumo(e.target.value)}>
            <option value="">Escolha…</option>
            {disponiveis.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
          </select>
        </label>
        <label className="w-40 space-y-1 text-sm font-medium text-slate-700">
          Quantidade {insumoNovo ? `(${insumoNovo.unidade_medida})` : ''}
          <input className={INPUT} inputMode="decimal" value={novaQtd} onChange={(e) => setNovaQtd(e.target.value)} />
        </label>
        <button type="submit" className={BTN_DARK} disabled={ocupado}>Adicionar à ficha</button>
        {insumos.length === 0 && (
          <p className="w-full text-sm text-slate-600">Cadastre insumos primeiro, na tela de Insumos.</p>
        )}
      </form>

      {/* Copiar de outro tamanho */}
      {tamanhosComFicha.length > 0 && (
        <div className="flex flex-wrap items-end gap-3 bg-white p-4">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Copiar ficha do tamanho
            <select className={INPUT} value={origemAtual} onChange={(e) => setOrigem(e.target.value)}>
              {tamanhosComFicha.map((t) => <option key={t.id} value={t.id}>{t.nome_tamanho}</option>)}
            </select>
          </label>
          <label className="w-32 space-y-1 text-sm font-medium text-slate-700">
            Multiplicar por
            <input className={INPUT} inputMode="decimal" value={fator} onChange={(e) => setFator(e.target.value)} />
          </label>
          <button type="button" className={BTN_GHOST} disabled={ocupado} onClick={copiar}>Copiar para {tamanho?.nome_tamanho}</button>
          <p className="w-full text-xs text-slate-500">
            Ex.: de 30cm para 40cm, use 1,6 para escalar as quantidades. Insumos que já estão nesta ficha não são alterados.
          </p>
        </div>
      )}
    </div>
  )
}
