'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { msgErro } from '@/lib/pedidos'
import type { Dre } from '@/lib/admin'
import { listarContas, resumirContas, type Conta } from '@/lib/contas'
import { intervaloPreset, paraTimestamps, type Preset } from '@/lib/periodo'
import { PageHeader } from '../ui'
import PeriodoFiltro from './PeriodoFiltro'
import DrePanel from './DrePanel'
import MargemProdutos from './MargemProdutos'
import ContasPanel from './ContasPanel'

type Aba = 'dre' | 'contas'

export default function FinanceiroScreen() {
  const [aba, setAba] = useState<Aba>('dre')
  const [periodo, setPeriodo] = useState<{ preset: Preset; de: string; ate: string }>(() => ({
    preset: 'mes',
    ...intervaloPreset('mes'),
  }))
  const [dre, setDre] = useState<Dre | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [contas, setContas] = useState<Conta[]>([])
  const [erroContas, setErroContas] = useState<string | null>(null)
  const requisicao = useRef(0) // ignora respostas antigas se o período mudar rápido

  useEffect(() => {
    const id = ++requisicao.current
    setLoading(true)
    const { inicio, fim } = paraTimestamps(periodo.de, periodo.ate)

    supabase.rpc('dre_periodo', { p_inicio: inicio, p_fim: fim }).then(({ data, error }) => {
      if (id !== requisicao.current) return
      if (error) setErro(msgErro(error))
      else {
        setErro(null)
        setDre((Array.isArray(data) ? data[0] : data) as Dre)
      }
      setLoading(false)
    })
  }, [periodo])

  const recarregarContas = useCallback(async () => {
    try {
      setContas(await listarContas(periodo.de, periodo.ate))
      setErroContas(null)
    } catch (e) {
      setErroContas(msgErro(e))
    }
  }, [periodo])

  useEffect(() => { recarregarContas() }, [recarregarContas])

  // Se a tabela de contas ainda não existe (migração não rodada), o DRE segue só com as vendas.
  const resumo = useMemo(() => (erroContas ? null : resumirContas(contas)), [contas, erroContas])

  return (
    <>
      <PageHeader titulo="Financeiro" descricao="Resultado das vendas, despesas e margem dos produtos." />
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PeriodoFiltro {...periodo} onChange={setPeriodo} />
          <div className="flex gap-1 rounded-md bg-superficie-alta p-1" role="tablist" aria-label="Seção financeira">
            {([['dre', 'DRE e margens'], ['contas', 'Contas a pagar/receber']] as const).map(([v, rotulo]) => (
              <button key={v} type="button" role="tab" aria-selected={aba === v} onClick={() => setAba(v)}
                className={'rounded px-3 py-2 text-sm font-semibold ' +
                  (aba === v ? 'bg-marca text-fundo' : 'text-slate-300 hover:bg-white/5')}>
                {rotulo}
              </button>
            ))}
          </div>
        </div>

        {aba === 'dre' ? (
          <>
            <DrePanel dre={dre} loading={loading} erro={erro} contas={resumo} />
            <MargemProdutos />
          </>
        ) : (
          <ContasPanel contas={contas} erro={erroContas} onMudou={recarregarContas} />
        )}
      </div>
    </>
  )
}
