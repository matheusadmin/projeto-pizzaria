'use client'

import type { ReactNode } from 'react'
import { brl } from '@/lib/types'
import { COR_NIVEL, fmtPct, META_CMV_PADRAO, nivelMargem, type Dre } from '@/lib/admin'
import { DISPLAY } from '@/lib/ui'
import type { ResumoContas } from '@/lib/contas'

function Linha({ rotulo, valor, forte, deducao }: { rotulo: ReactNode; valor: string; forte?: boolean; deducao?: boolean }) {
  return (
    <div className={
      'flex items-baseline justify-between gap-4 py-2.5 ' +
      (forte ? 'border-t-2 border-marca font-bold' : 'border-t border-dashed border-white/15')
    }>
      <dt className={deducao ? 'text-slate-400' : ''}>{rotulo}</dt>
      <dd className="tabular-nums">{valor}</dd>
    </div>
  )
}

interface Props {
  dre: Dre | null
  loading: boolean
  erro: string | null
  /** Contas a pagar/receber do período (vencimento no período). Quando vem, o DRE mostra o resultado operacional. */
  contas?: ResumoContas | null
}

export default function DrePanel({ dre, loading, erro, contas }: Props) {
  if (erro) return <p role="alert" className="bg-superficie-alta p-6 font-medium text-red-400">Não foi possível gerar o DRE: {erro}</p>
  if (!dre) return <p className="bg-superficie-alta p-6 text-slate-400">Carregando…</p>

  const receita = dre.receita_liquida
  const cmvPct = receita > 0 ? (dre.cmv_total / receita) * 100 : null
  const lucroPct = dre.margem_bruta_pct
  const nivel = COR_NIVEL[nivelMargem(cmvPct, META_CMV_PADRAO)]
  const resultado = dre.lucro_bruto + (contas?.outrasReceitas ?? 0) - (contas?.despesas ?? 0)
  const larguraCmv = cmvPct == null ? 0 : Math.min(100, Math.max(0, cmvPct))

  return (
    <section aria-busy={loading} className={'bg-superficie-alta p-6 ' + (loading ? 'opacity-60' : '')}>
      <h2 className={`${DISPLAY} text-3xl font-bold`}>Demonstrativo do período</h2>
      <p className="mb-4 text-sm text-slate-400">
        {dre.qtd_pedidos === 1 ? '1 pedido' : `${dre.qtd_pedidos} pedidos`} confirmados, sem cancelados.
      </p>

      <dl className="max-w-xl">
        <Linha rotulo="Faturamento bruto" valor={brl(dre.faturamento_bruto)} forte />
        <Linha rotulo="(−) Descontos" valor={brl(dre.total_descontos)} deducao />
        <Linha rotulo="Receita líquida" valor={brl(receita)} forte />
        <Linha rotulo="(−) CMV, custo das mercadorias vendidas" valor={brl(dre.cmv_total)} deducao />
        <Linha rotulo="Lucro bruto" valor={brl(dre.lucro_bruto)} forte />
        {contas && (
          <>
            <Linha rotulo="(+) Outras receitas (contas a receber)" valor={brl(contas.outrasReceitas)} deducao />
            <Linha rotulo="(−) Despesas operacionais (contas a pagar)" valor={brl(contas.despesas)} deducao />
            <Linha rotulo="Resultado operacional" valor={brl(resultado)} forte />
          </>
        )}
      </dl>

      <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-4">
        <div>
          <p className="text-sm text-slate-400">Margem de lucro bruta</p>
          <p className={`${DISPLAY} text-6xl font-bold leading-none tabular-nums ${nivel.texto}`}>{fmtPct(lucroPct)}</p>
          <p className={`mt-1 text-sm font-medium ${nivel.texto}`}>
            {cmvPct == null ? 'Sem vendas no período' : `${nivel.rotulo}: CMV em ${fmtPct(cmvPct)} (meta ${META_CMV_PADRAO}%)`}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <dt className="text-slate-400">Ticket médio</dt><dd className="text-right font-semibold tabular-nums">{brl(dre.ticket_medio)}</dd>
          <dt className="text-slate-400">Taxas de entrega cobradas</dt><dd className="text-right font-semibold tabular-nums">{brl(dre.total_taxas_entrega)}</dd>
        </dl>
      </div>

      {cmvPct != null && (
        <div className="mt-6 max-w-xl">
          <div className="flex h-4 overflow-hidden rounded-sm bg-sucesso" role="img"
            aria-label={`De cada R$ 100 de receita, R$ ${larguraCmv.toFixed(0)} vão para o custo e o restante é lucro bruto`}>
            <div className="bg-marca" style={{ width: `${larguraCmv}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>Custo das mercadorias {fmtPct(cmvPct)}</span>
            <span>Lucro bruto {fmtPct(lucroPct)}</span>
          </div>
        </div>
      )}

      <p className="mt-6 max-w-xl text-xs text-slate-400">
        O faturamento considera só o valor dos itens. Taxas de entrega ficam fora da receita. O CMV usa o custo
        gravado no momento de cada venda, então reajustes de insumos não alteram períodos passados.
        {contas && ' Despesas e outras receitas entram pelo mês de vencimento (inclui contas ainda não pagas).'}
      </p>
    </section>
  )
}
