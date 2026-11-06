'use client'

import { useCallback, useEffect, useState } from 'react'
import { msgErro } from '@/lib/pedidos'
import { listarContas, type Conta } from '@/lib/contas'
import { intervaloPreset, type Preset } from '@/lib/periodo'
import { PageHeader } from '../ui'
import PeriodoFiltro from '../financeiro/PeriodoFiltro'
import ContasPanel from '../financeiro/ContasPanel'

export default function ContasScreen() {
  const [periodo, setPeriodo] = useState<{ preset: Preset; de: string; ate: string }>(() => ({
    preset: 'mes',
    ...intervaloPreset('mes'),
  }))
  const [contas, setContas] = useState<Conta[]>([])
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    try {
      setContas(await listarContas(periodo.de, periodo.ate))
      setErro(null)
    } catch (e) {
      setErro(msgErro(e))
    }
  }, [periodo])

  useEffect(() => { recarregar() }, [recarregar])

  return (
    <>
      <PageHeader titulo="Contas a pagar/receber" descricao="Despesas fixas e variáveis e outras receitas, por mês de vencimento." />
      <div className="space-y-5">
        <PeriodoFiltro {...periodo} onChange={setPeriodo} />
        <ContasPanel contas={contas} erro={erro} onMudou={recarregar} />
      </div>
    </>
  )
}
