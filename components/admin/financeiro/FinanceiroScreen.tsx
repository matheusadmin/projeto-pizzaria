'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { msgErro } from '@/lib/pedidos'
import type { Dre } from '@/lib/admin'
import { listarContas, resumirContas, type Conta } from '@/lib/contas'
import { intervaloPreset, paraTimestamps, type Preset } from '@/lib/periodo'
import { PageHeader } from '../ui'
import PeriodoFiltro from './PeriodoFiltro'
import DrePanel from './DrePanel'
import MargemProdutos from './MargemProdutos'

export default function FinanceiroScreen() {
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

  // As contas entram aqui só para compor o resultado operacional; a gestão delas fica na tela Contas.
  useEffect(() => {
    let vivo = true
    listarContas(periodo.de, periodo.ate)
      .then((c) => { if (vivo) { setContas(c); setErroContas(null) } })
      .catch((e) => { if (vivo) setErroContas(msgErro(e)) })
    return () => { vivo = false }
  }, [periodo])

  // Se a tabela de contas ainda não existe (migração não rodada), o DRE segue só com as vendas.
  const resumo = useMemo(() => (erroContas ? null : resumirContas(contas)), [contas, erroContas])

  return (
    <>
      <PageHeader titulo="DRE" descricao="Demonstrativo de resultado: vendas, CMV, despesas e margem dos produtos." />
      <div className="space-y-5">
        <PeriodoFiltro {...periodo} onChange={setPeriodo} />
        <DrePanel dre={dre} loading={loading} erro={erro} contas={resumo} />
        <MargemProdutos />
      </div>
    </>
  )
}
