'use client'

import { useEffect, type ReactNode } from 'react'
import { DISPLAY } from '@/lib/ui'

export const BTN_DARK =
  'rounded-md bg-marca px-4 py-2 text-sm font-semibold text-fundo hover:bg-marca-claro ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:opacity-50'

export const BTN_RED =
  'rounded-md bg-perigo px-4 py-2 text-sm font-semibold text-white hover:bg-perigo-escuro ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-perigo disabled:opacity-50'

export const BTN_GHOST =
  'rounded-md border border-white/20 bg-transparent px-3 py-1.5 text-sm font-medium text-slate-200 ' +
  'hover:border-marca/60 hover:bg-white/5 disabled:opacity-50'

const TONES = {
  red: 'bg-perigo text-white',
  amber: 'bg-marca text-white',
  green: 'bg-sucesso text-white',
  slate: 'bg-white/10 text-slate-300',
} as const

export function Tag({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>
}

export function Campo({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-sm font-medium text-slate-300">
      {label}
      {children}
      {hint && <span className="block text-xs font-normal text-slate-400">{hint}</span>}
    </label>
  )
}

export function PageHeader({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className={`${DISPLAY} text-4xl font-bold leading-none text-white`}>{titulo}</h1>
        {descricao && <p className="mt-1 max-w-2xl text-sm text-slate-400">{descricao}</p>}
      </div>
      {acao}
    </header>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-xl border border-white/10 bg-superficie-alta p-5 text-slate-100 shadow-2xl">
        <h2 className={`${DISPLAY} text-3xl font-bold text-white`}>{title}</h2>
        {children}
      </div>
    </div>
  )
}
