'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { msgErro } from '@/lib/pedidos'
import { brl } from '@/lib/types'
import { fmtPct, nivelEstoque, type Dre } from '@/lib/admin'
import { intervaloPreset, paraTimestamps, periodoAnterior, type Preset } from '@/lib/periodo'
import {
  buscarPedidosPeriodo, faturamentoPorCanal, faturamentoPorDia, faturamentoPorPagamento,
  maisVendidos, pedidosPorHora, variacao, type PedidoVenda,
} from '@/lib/dashboard'
import { DISPLAY } from '@/lib/ui'
import { PageHeader } from '../ui'
import PeriodoFiltro from '../financeiro/PeriodoFiltro'
import { BarChart, Ranking, Rosca } from './Graficos'

const brlCurto = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : `R$ ${Math.round(v)}`

const dreDe = (data: unknown) => (Array.isArray(data) ? data[0] : data) as Dre | null

function Painel({ titulo, descricao, children, className = '' }: {
  titulo: string; descricao?: string; children: ReactNode; className?: string
}) {
  return (
    <section className={`bg-superficie-alta p-5 ${className}`}>
      <h2 className={`${DISPLAY} text-2xl font-bold text-white`}>{titulo}</h2>
      {descricao && <p className="mb-3 text-sm text-slate-400">{descricao}</p>}
      <div className={descricao ? '' : 'mt-3'}>{children}</div>
    </section>
  )
}

function Kpi({ titulo, valor, variacaoPct, sub, destaque }: {
  titulo: string; valor: string; variacaoPct?: number | null; sub?: string; destaque?: boolean
}) {
  return (
    <div className={`bg-superficie-alta p-4 ${destaque ? 'border-t-4 border-marca' : 'border-t-4 border-transparent'}`}>
      <p className="text-sm text-slate-400">{titulo}</p>
      <p className={`${DISPLAY} text-4xl font-bold leading-tight tabular-nums text-white`}>{valor}</p>
      {variacaoPct != null && (
        <p className={`text-sm font-semibold tabular-nums ${variacaoPct >= 0 ? 'text-sucesso-claro' : 'text-red-400'}`}>
          {variacaoPct >= 0 ? '▲' : '▼'} {Math.abs(variacaoPct).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
          <span className="font-normal text-slate-400"> vs período anterior</span>
        </p>
      )}
      {sub && <p className="text-sm text-slate-400">{sub}</p>}
    </div>
  )
}

function Alerta({ href, total, rotulo, ok }: { href: string; total: number; rotulo: string; ok: string }) {
  return (
    <Link href={href} className={
      'flex items-center justify-between gap-3 border-l-4 bg-superficie-alta p-4 hover:bg-white/5 ' +
      (total > 0 ? 'border-perigo' : 'border-sucesso-claro')
    }>
      <span className="text-sm text-slate-300">{total > 0 ? rotulo : ok}</span>
      <span className={`${DISPLAY} text-3xl font-bold tabular-nums ${total > 0 ? 'text-red-400' : 'text-sucesso-claro'}`}>{total}</span>
    </Link>
  )
}

export default function DashboardScreen() {
  const [periodo, setPeriodo] = useState<{ preset: Preset; de: string; ate: string }>(() => ({
    preset: '7d',
    ...intervaloPreset('7d'),
  }))
  const [dre, setDre] = useState<Dre | null>(null)
  const [dreAnterior, setDreAnterior] = useState<Dre | null>(null)
  const [pedidos, setPedidos] = useState<PedidoVenda[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [alertas, setAlertas] = useState<{ estoque: number; semFicha: number } | null>(null)
  const requisicao = useRef(0) // ignora respostas antigas se o período mudar rápido

  useEffect(() => {
    const id = ++requisicao.current
    setLoading(true)
    const atual = paraTimestamps(periodo.de, periodo.ate)
    const ant = periodoAnterior(periodo.de, periodo.ate)
    const anterior = paraTimestamps(ant.de, ant.ate)

    Promise.all([
      supabase.rpc('dre_periodo', { p_inicio: atual.inicio, p_fim: atual.fim }),
      supabase.rpc('dre_periodo', { p_inicio: anterior.inicio, p_fim: anterior.fim }),
      buscarPedidosPeriodo(atual.inicio, atual.fim),
    ])
      .then(([a, p, lista]) => {
        if (id !== requisicao.current) return
        if (a.error) throw a.error
        setDre(dreDe(a.data))
        setDreAnterior(p.error ? null : dreDe(p.data)) // sem comparação se a 2ª consulta falhar
        setPedidos(lista)
        setErro(null)
      })
      .catch((e) => { if (id === requisicao.current) setErro(msgErro(e)) })
      .finally(() => { if (id === requisicao.current) setLoading(false) })
  }, [periodo])

  // Alertas de operação (não dependem do período).
  useEffect(() => {
    let vivo = true
    Promise.all([
      supabase.from('insumos').select('quantidade_atual, estoque_minimo'),
      supabase.from('vw_cmv_produto_tamanho').select('produto_id, cmv'),
    ]).then(([ins, cmv]) => {
      if (!vivo || ins.error || cmv.error) return
      const semFicha = new Set((cmv.data as { produto_id: string; cmv: number }[]).filter((r) => r.cmv <= 0).map((r) => r.produto_id))
      setAlertas({
        estoque: (ins.data as { quantidade_atual: number; estoque_minimo: number }[]).filter((i) => nivelEstoque(i) === 'abaixo').length,
        semFicha: semFicha.size,
      })
    })
    return () => { vivo = false }
  }, [])

  const porDia = useMemo(() => faturamentoPorDia(pedidos, periodo.de, periodo.ate), [pedidos, periodo])
  const porHora = useMemo(() => pedidosPorHora(pedidos), [pedidos])
  const porCanal = useMemo(() => faturamentoPorCanal(pedidos), [pedidos])
  const porPagamento = useMemo(() => faturamentoPorPagamento(pedidos), [pedidos])
  const top = useMemo(() => maisVendidos(pedidos, 8), [pedidos])

  const horaPico = useMemo(() => {
    const melhor = porHora.reduce((m, h) => (h.valor > m.valor ? h : m), porHora[0])
    return melhor.valor > 0 ? melhor : null
  }, [porHora])

  const margemPct = dre?.margem_bruta_pct ?? null

  return (
    <>
      <PageHeader titulo="Dashboard" descricao="Visão geral das vendas, do ritmo da casa e dos alertas que pedem atenção." />

      <div className="space-y-5">
        <PeriodoFiltro {...periodo} onChange={setPeriodo} />

        {erro && <p role="alert" className="bg-superficie-alta p-4 font-medium text-red-400">Não foi possível carregar o dashboard: {erro}</p>}

        <div aria-busy={loading} className={'space-y-5 ' + (loading ? 'opacity-60' : '')}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi destaque titulo="Faturamento bruto" valor={brl(dre?.faturamento_bruto ?? 0)}
              variacaoPct={dre ? variacao(dre.faturamento_bruto, dreAnterior?.faturamento_bruto) : null} />
            <Kpi titulo="Pedidos" valor={String(dre?.qtd_pedidos ?? 0)}
              variacaoPct={dre ? variacao(dre.qtd_pedidos, dreAnterior?.qtd_pedidos) : null} />
            <Kpi titulo="Ticket médio" valor={brl(dre?.ticket_medio ?? 0)}
              variacaoPct={dre ? variacao(dre.ticket_medio, dreAnterior?.ticket_medio) : null} />
            <Kpi titulo="Lucro bruto" valor={brl(dre?.lucro_bruto ?? 0)}
              sub={margemPct == null ? 'Sem vendas no período' : `Margem de ${fmtPct(margemPct)}`}
              variacaoPct={dre ? variacao(dre.lucro_bruto, dreAnterior?.lucro_bruto) : null} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Alerta href="/admin/insumos" total={alertas?.estoque ?? 0}
              rotulo="insumos abaixo do estoque mínimo" ok="Estoque dentro do mínimo" />
            <Alerta href="/admin/fichas" total={alertas?.semFicha ?? 0}
              rotulo="produtos sem ficha técnica (CMV zerado)" ok="Todos os produtos têm ficha técnica" />
          </div>

          <Painel titulo="Faturamento por dia" descricao="Valor dos itens vendidos em cada dia do período.">
            <BarChart dados={porDia} formatar={brl} formatarEixo={brlCurto} rotuloAria="Faturamento por dia" />
          </Painel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Painel titulo="Mais vendidos" descricao="Produtos por quantidade (todos os tamanhos somados).">
              <Ranking linhas={top.map((p) => ({
                rotulo: p.produto, valor: p.quantidade,
                texto: `${p.quantidade}×`, sub: brl(p.receita),
              }))} />
            </Painel>

            <Painel titulo="Horário de pico"
              descricao={horaPico ? `Mais movimento às ${horaPico.rotulo} (${horaPico.valor} pedidos no período).` : 'Pedidos por hora do dia.'}>
              <BarChart dados={porHora} formatar={(v) => `${v} pedidos`} formatarEixo={(v) => String(Math.round(v))}
                classe="fill-sucesso-claro" rotuloAria="Pedidos por hora do dia" />
            </Painel>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Painel titulo="Vendas por canal" descricao="Salão, Balcão, Retirada e Entrega.">
              <Rosca dados={porCanal} formatar={brl} rotuloAria="Faturamento por canal de atendimento" />
            </Painel>
            <Painel titulo="Formas de pagamento" descricao="Como os clientes pagaram.">
              <Rosca dados={porPagamento} formatar={brl} rotuloAria="Faturamento por forma de pagamento" />
            </Painel>
          </div>

          <p className="text-xs text-slate-400">
            Considera pedidos confirmados, sem cancelados. Valores são o total dos itens (taxas de entrega ficam de fora).
            Para o demonstrativo completo, veja o <Link href="/admin/financeiro" className="underline">DRE</Link>.
          </p>
        </div>
      </div>
    </>
  )
}
