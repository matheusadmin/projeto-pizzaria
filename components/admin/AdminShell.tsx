'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePerfil } from '@/components/RequireRole'
import SignOutButton from '@/components/SignOutButton'
import { supabase } from '@/lib/supabase/client'
import { nivelEstoque } from '@/lib/admin'
import { DISPLAY } from '@/lib/ui'

const LINKS = [
  { href: '/admin/financeiro', label: 'Financeiro' },
  { href: '/admin/insumos', label: 'Insumos' },
  { href: '/admin/fichas', label: 'Fichas técnicas' },
]

export default function AdminShell({ children }: { children: ReactNode }) {
  const perfil = usePerfil()
  const pathname = usePathname()
  const [alertas, setAlertas] = useState(0)

  // Contador de insumos abaixo do mínimo no menu; recarrega a cada troca de tela.
  useEffect(() => {
    let vivo = true
    supabase
      .from('insumos')
      .select('quantidade_atual, estoque_minimo')
      .then(({ data }) => {
        if (vivo && data) setAlertas(data.filter((i) => nivelEstoque(i) === 'abaixo').length)
      })
    return () => { vivo = false }
  }, [pathname])

  return (
    <div className="min-h-screen bg-[#E9ECEF] text-[#14181F] lg:flex">
      <aside className="bg-[#14181F] text-white lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 lg:block lg:py-5">
          <p className={`${DISPLAY} text-2xl font-bold`}>Administração</p>
          <p className="hidden text-sm text-slate-400 lg:block">{perfil.nome}</p>
        </div>

        <nav aria-label="Administração" className="flex gap-1 overflow-x-auto px-2 pb-2 lg:block lg:space-y-1 lg:pb-0">
          {LINKS.map((l) => {
            const ativo = pathname.startsWith(l.href)
            return (
              <Link key={l.href} href={l.href} aria-current={ativo ? 'page' : undefined}
                className={
                  'flex shrink-0 items-center justify-between gap-3 border-l-4 px-3 py-2.5 text-base font-medium ' +
                  (ativo ? 'border-[#F2B705] bg-white/10' : 'border-transparent hover:bg-white/5')
                }>
                {l.label}
                {l.href === '/admin/insumos' && alertas > 0 && (
                  <span className="rounded-full bg-[#D7372B] px-2 text-xs font-bold" aria-label={`${alertas} alertas de estoque`}>
                    {alertas}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="hidden space-y-1 border-t border-white/10 px-2 py-4 lg:mt-6 lg:block">
          <p className="px-3 pb-1 text-sm text-slate-400">Operação</p>
          <Link href="/pdv" className="block px-3 py-2 text-base hover:bg-white/5">Caixa (PDV)</Link>
          <Link href="/kds" className="block px-3 py-2 text-base hover:bg-white/5">Cozinha (KDS)</Link>
          <SignOutButton className="mt-3 w-full rounded-md border border-white/30 px-3 py-2 text-sm font-medium hover:bg-white/10" />
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 lg:p-8">{children}</main>
    </div>
  )
}
