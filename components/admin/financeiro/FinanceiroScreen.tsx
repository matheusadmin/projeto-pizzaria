'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { msgErro } from '@/lib/pedidos'
import type { Dre } from '@/lib/admin'
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

  return (
    <>
      <PageHeader titulo="Financeiro" descricao="Resultado das vendas e margem dos produtos." />
      <div className="space-y-5">
        <PeriodoFiltro {...periodo} onChange={setPeriodo} />
        <DrePanel dre={dre} loading={loading} erro={erro} />
        <MargemProdutos />
      </div>
    </>
  )
}
