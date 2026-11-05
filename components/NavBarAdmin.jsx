import Link from 'next/link'
import SignOutButton from '@/components/SignOutButton'

export default function NavBarAdmin() {
  return (
    <header className="border-b border-slate-800 bg-[#14181F] text-white px-4 py-3">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-orange-500">🍕 Casa Gestão</span>
        </div>

        <nav className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-slate-300">
          <Link href="/admin" className="hover:text-orange-400">Admin</Link>
          <span className="text-slate-700">|</span>
          <Link href="/pedidos" className="hover:text-orange-400">Pedidos</Link>
          <span className="text-slate-700">|</span>
          <Link href="/pdv" className="hover:text-orange-400">PDV</Link>
          <span className="text-slate-700">|</span>
          <Link href="/garcom" className="hover:text-orange-400">Garçom</Link>
          <span className="text-slate-700">|</span>
          <Link href="/kds" className="hover:text-orange-400">KDS</Link>
          <span className="text-slate-700">|</span>
          <Link href="/entregador" className="hover:text-orange-400">Entregador</Link>
        </nav>

        <SignOutButton className="rounded border border-white/20 px-2.5 py-1 text-xs hover:bg-white/10" />
      </div>
    </header>
  )
}
