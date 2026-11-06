'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/hooks/useProfile'
import SignOutButton from '@/components/SignOutButton'
import type { Perfil, Role } from '@/lib/types'

export const PerfilContext = createContext<Perfil | null>(null)

// Só vale fora do <RequireRole> em desenvolvimento, para não quebrar a renderização.
const PERFIL_DEV: Perfil = { id: 'dev-local', nome: 'Dev local', role: 'dev' }
// Em produção, se alguém esquecer o <RequireRole>, cai no perfil de menor acesso.
const PERFIL_SEGURO: Perfil = { id: '', nome: 'Sem perfil', role: 'entregador' }

/** Perfil do usuário logado (dentro de <RequireRole>). */
export function usePerfil(): Perfil {
  const perfil = useContext(PerfilContext)
  if (perfil) return perfil

  if (process.env.NODE_ENV === 'development') return PERFIL_DEV

  console.error('usePerfil foi usado fora de <RequireRole>.')
  return PERFIL_SEGURO
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="grid min-h-[100dvh] place-items-center bg-fundo p-6 text-center text-slate-100"
    >
      <div className="max-w-sm space-y-4">{children}</div>
    </div>
  )
}

/**
 * Guarda de rota no cliente: exige login e um dos perfis em `roles`.
 * A segurança real está no RLS do banco; isto só evita mostrar telas que o perfil não pode usar.
 */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const router = useRouter()
  const { loading, perfil } = useProfile()

  useEffect(() => {
    if (!loading && !perfil) router.replace('/login')
  }, [loading, perfil, router])

  if (loading || !perfil) {
    return (
      <Aviso>
        <p>Carregando…</p>
      </Aviso>
    )
  }

  if (!roles.includes(perfil.role)) {
    return (
      <Aviso>
        <p className="text-lg font-semibold">Seu perfil não tem acesso a esta tela.</p>
        <SignOutButton className="rounded-md bg-marca px-4 py-2 font-semibold text-fundo" />
      </Aviso>
    )
  }

  return <PerfilContext.Provider value={perfil}>{children}</PerfilContext.Provider>
}
