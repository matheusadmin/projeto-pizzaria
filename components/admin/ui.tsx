'use client'

import { useEffect, type ReactNode } from 'react'
import { DISPLAY } from '@/lib/ui'

export const BTN_DARK =
  'rounded-md bg-[#14181F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2A303A] ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14181F] disabled:opacity-50'

export const BTN_RED =
  'rounded-md bg-[#D7372B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#BF2F24] ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D7372B] disabled:opacity-50'

export const BTN_GHOST =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-[#14181F] ' +
  'hover:border-[#14181F] disabled:opacity-50'

const TONES = {
  red: 'bg-[#D7372B] text-white',
  amber: 'bg-[#F2B705] text-[#14181F]',
  green: 'bg-[#2F7D4F] text-white',
  slate: 'bg-slate-200 text-slate-700',
} as const

export function Tag({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>
}

export function Campo({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-sm font-medium text-slate-700">
      {label}
      {children}
      {hint && <span className="block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  )
}

export function PageHeader({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className={`${DISPLAY} text-4xl font-bold leading-none text-[#14181F]`}>{titulo}</h1>
        {descricao && <p className="mt-1 max-w-2xl text-sm text-slate-600">{descricao}</p>}
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#14181F]/70 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-md bg-white p-5">
        <h2 className={`${DISPLAY} text-3xl font-bold text-[#14181F]`}>{title}</h2>
        {children}
      </div>
    </div>
  )
}
