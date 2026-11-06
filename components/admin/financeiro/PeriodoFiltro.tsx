'use client'

import { intervaloPreset, type Preset } from '@/lib/periodo'
import { INPUT } from '@/lib/ui'

const PRESETS: { value: Exclude<Preset, 'custom'>; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: 'mes', label: 'Este mês' },
  { value: 'mes_anterior', label: 'Mês passado' },
]

interface Props {
  preset: Preset
  de: string
  ate: string
  onChange: (v: { preset: Preset; de: string; ate: string }) => void
}

export default function PeriodoFiltro({ preset, de, ate, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-1 rounded-md bg-superficie-alta p-1" role="group" aria-label="Período">
        {PRESETS.map((p) => (
          <button key={p.value} type="button" aria-pressed={preset === p.value}
            onClick={() => onChange({ preset: p.value, ...intervaloPreset(p.value) })}
            className={'rounded px-3 py-2 text-sm font-semibold ' +
              (preset === p.value ? 'bg-marca text-fundo' : 'text-slate-300 hover:bg-white/5')}>
            {p.label}
          </button>
        ))}
      </div>

      <label className="space-y-1 text-sm font-medium text-slate-300">
        De
        <input type="date" className={`${INPUT} w-40`} value={de} max={ate}
          onChange={(e) => e.target.value && onChange({ preset: 'custom', de: e.target.value, ate })} />
      </label>
      <label className="space-y-1 text-sm font-medium text-slate-300">
        Até
        <input type="date" className={`${INPUT} w-40`} value={ate} min={de}
          onChange={(e) => e.target.value && onChange({ preset: 'custom', de, ate: e.target.value })} />
      </label>
    </div>
  )
}
