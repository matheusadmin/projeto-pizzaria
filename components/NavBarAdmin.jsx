'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useProfile } from '@/hooks/useProfile'
import SignOutButton from '@/components/SignOutButton'
import { MENU, PRIMEIRA_ROTA_ADMIN } from '@/lib/rotas'

function Barra({ pathname }) {
  const { perfil } = useProfile()

  // Sem sessão ativa (ou carregando), não mostra a barra.
  if (!perfil) return null

  const links = MENU.filter((r) => r.roles.includes(perfil.role))

  return (
    <header className="shrink-0 border-b border-slate-800 bg-superficie px-4 py-2.5 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <span className="text-lg font-bold text-marca">🍕 Kikas</span>

        <nav className="flex flex-wrap items-center gap-1 text-xs font-medium sm:text-sm">
          {links.map((r) => {
            const ativo = pathname === r.href || pathname.startsWith(r.href + '/')
            return (
              <Fragment key={r.href}>
                {r.href === PRIMEIRA_ROTA_ADMIN && (
                  <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-white/20 sm:inline-block" />
                )}
                <Link
                  href={r.href}
                  aria-current={ativo ? 'page' : undefined}
                  className={
                    'rounded-md px-2.5 py-1.5 transition-colors ' +
                    (ativo ? 'bg-marca text-fundo' : 'text-slate-300 hover:bg-white/10 hover:text-white')
                  }
                >
                  {r.rotulo}
                </Link>
              </Fragment>
            )
          })}
        </nav>

        <SignOutButton className="rounded border border-white/20 px-2.5 py-1 text-xs hover:bg-white/10" />
      </div>
    </header>
  )
}

export default function NavBarAdmin() {
  const pathname = usePathname()

  // O login e o hub (que já tem a própria navegação) ficam sem a barra.
  if (pathname === '/login' || pathname === '/') return null

  // key={pathname}: recarrega o perfil a cada troca de tela, então a barra
  // aparece logo após o login e some após o logout.
  return <Barra key={pathname} pathname={pathname} />
}
