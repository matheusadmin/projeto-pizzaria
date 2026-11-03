'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/hooks/useProfile'
import SignOutButton from '@/components/SignOutButton'
import type { Perfil, Role } from '@/lib/types'

const PerfilContext = createContext<Perfil | null>(null)

/** Perfil do usuário logado (só dentro de <RequireRole>). */
export function usePerfil(): Perfil {
  const perfil = useContext(PerfilContext)
  if (!perfil) throw new Error('usePerfil deve ser usado dentro de <RequireRole>')
  return perfil
}

function Aviso({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#E9ECEF] p-6 text-center text-[#14181F]">
      <div className="max-w-sm space-y-4">{children}</div>
    </main>
  )
}

/**
 * Guarda de rota no cliente. A segurança real está no RLS do banco;
 * isto só evita mostrar telas que o perfil não pode usar.
 */
export default function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const router = useRouter()
  const { loading, perfil } = useProfile()

  useEffect(() => {
    if (!loading && !perfil) router.replace('/login')
  }, [loading, perfil, router])

  if (loading || !perfil) return <Aviso><p>Carregando…</p></Aviso>

  if (!roles.includes(perfil.role)) {
    return (
      <Aviso>
        <p className="text-lg font-semibold">Seu perfil não tem acesso a esta tela.</p>
        <SignOutButton className="rounded-md bg-[#14181F] px-4 py-2 font-semibold text-white" />
      </Aviso>
    )
  }

  return <PerfilContext.Provider value={perfil}>{children}</PerfilContext.Provider>
}
