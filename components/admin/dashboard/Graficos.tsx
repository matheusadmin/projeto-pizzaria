'use client'

// Gráficos em SVG puro (sem biblioteca externa): leves e funcionam na rede local, sem internet.
import type { ReactNode } from 'react'
import type { Ponto } from '@/lib/dashboard'

/** Arredonda o máximo do eixo para um valor "redondo" (1, 2, 5 x 10^n). */
function maxBonito(v: number) {
  if (v <= 0) return 1
  const e = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / e
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e
}

export function SemDados({ children = 'Sem vendas no período.' }: { children?: ReactNode }) {
  return <p className="py-10 text-center text-sm text-slate-400">{children}</p>
}

interface BarProps {
  dados: Ponto[]
  formatar: (v: number) => string      // tooltip e valores
  formatarEixo?: (v: number) => string // rótulos do eixo Y (versão curta)
  classe?: string                      // cor da barra (classe fill-*)
  altura?: number
  rotuloAria: string
}

export function BarChart({ dados, formatar, formatarEixo = formatar, classe = 'fill-marca', altura = 230, rotuloAria }: BarProps) {
  const max = Math.max(...dados.map((d) => d.valor), 0)
  if (max <= 0) return <SemDados />

  const W = 640, H = altura
  const pl = 62, pr = 8, pt = 12, pb = 30
  const topo = maxBonito(max)
  const largura = W - pl - pr
  const alt = H - pt - pb
  const passo = largura / dados.length
  const bw = Math.min(48, passo * 0.7)
  const cadaX = Math.ceil(dados.length / 12) // evita rótulos amontoados no eixo X

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={rotuloAria} className="h-auto w-full">
      {[0, 1, 2, 3, 4].map((i) => {
        const y = pt + alt - (alt * i) / 4
        return (
          <g key={i}>
            <line x1={pl} x2={W - pr} y1={y} y2={y} className="stroke-white/10" />
            <text x={pl - 8} y={y + 4} textAnchor="end" fontSize={12} className="fill-slate-400">
              {formatarEixo((topo * i) / 4)}
            </text>
          </g>
        )
      })}
      {dados.map((d, i) => {
        const h = (d.valor / topo) * alt
        const x = pl + i * passo + (passo - bw) / 2
        return (
          <g key={i}>
            <rect x={x} y={pt + alt - h} width={bw} height={Math.max(h, d.valor > 0 ? 1 : 0)} rx={2} className={classe}>
              <title>{`${d.rotulo}: ${formatar(d.valor)}`}</title>
            </rect>
            {i % cadaX === 0 && (
              <text x={x + bw / 2} y={H - 10} textAnchor="middle" fontSize={12} className="fill-slate-400">
                {d.rotulo}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

const CORES = [
  { traco: 'stroke-marca', fundo: 'bg-marca' },
  { traco: 'stroke-sucesso-claro', fundo: 'bg-sucesso-claro' },
  { traco: 'stroke-blue-400', fundo: 'bg-blue-400' },
  { traco: 'stroke-purple-400', fundo: 'bg-purple-400' },
  { traco: 'stroke-red-400', fundo: 'bg-red-400' },
  { traco: 'stroke-slate-400', fundo: 'bg-slate-400' },
]

export function Rosca({ dados, formatar, rotuloAria }: { dados: Ponto[]; formatar: (v: number) => string; rotuloAria: string }) {
  const total = dados.reduce((s, d) => s + d.valor, 0)
  if (total <= 0) return <SemDados />

  const r = 56, sw = 26, c = 2 * Math.PI * r
  let acumulado = 0

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg viewBox="0 0 160 160" role="img" aria-label={rotuloAria} className="h-40 w-40 shrink-0 -rotate-90">
        <circle cx={80} cy={80} r={r} fill="none" strokeWidth={sw} className="stroke-white/5" />
        {dados.map((d, i) => {
          const len = (d.valor / total) * c
          const seg = (
            <circle key={d.rotulo} cx={80} cy={80} r={r} fill="none" strokeWidth={sw}
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acumulado}
              className={CORES[i % CORES.length].traco}>
              <title>{`${d.rotulo}: ${formatar(d.valor)}`}</title>
            </circle>
          )
          acumulado += len
          return seg
        })}
      </svg>
      <ul className="min-w-[10rem] flex-1 space-y-2 text-sm">
        {dados.map((d, i) => (
          <li key={d.rotulo} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-300">
              <span className={`h-3 w-3 rounded-sm ${CORES[i % CORES.length].fundo}`} />
              {d.rotulo}
            </span>
            <span className="tabular-nums text-white">
              {formatar(d.valor)} <span className="text-slate-400">({((d.valor / total) * 100).toFixed(0)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export interface LinhaRanking { rotulo: string; valor: number; texto: string; sub?: string }

/** Ranking em barras horizontais (ex.: mais vendidos). */
export function Ranking({ linhas }: { linhas: LinhaRanking[] }) {
  const max = Math.max(...linhas.map((l) => l.valor), 0)
  if (max <= 0) return <SemDados />
  return (
    <ol className="space-y-3">
      {linhas.map((l, i) => (
        <li key={l.rotulo}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-white">
              <span className="mr-2 tabular-nums text-slate-400">{i + 1}.</span>{l.rotulo}
            </span>
            <span className="shrink-0 tabular-nums text-slate-300">{l.texto}</span>
          </div>
          <div className="mt-1 h-2 rounded-sm bg-white/10">
            <div className="h-2 rounded-sm bg-marca" style={{ width: `${(l.valor / max) * 100}%` }} />
          </div>
          {l.sub && <p className="mt-0.5 text-xs text-slate-400">{l.sub}</p>}
        </li>
      ))}
    </ol>
  )
}
