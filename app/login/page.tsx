'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { DISPLAY } from '@/lib/ui'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setCarregando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      setErro(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
      setCarregando(false)
    } else {
      router.push('/pdv')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#14181F] text-white">
      {/* Navbar superior ajustada para embrulhar em telas de tablet/celular */}
      <header className="border-b border-slate-800 bg-[#14181F]/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-orange-500">🍕 Casa Gestão</span>
          </div>

          <nav className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium text-slate-300">
            <a href="/admin" className="hover:text-orange-400 transition-colors">Painel Admin</a>
            <span className="text-slate-700">|</span>
            <a href="/pedidos" className="hover:text-orange-400 transition-colors">Acompanhamento Pedidos</a>
            <span className="text-slate-700">|</span>
            <a href="/pdv" className="hover:text-orange-400 transition-colors">Caixa (PDV)</a>
            <span className="text-slate-700">|</span>
            <a href="/garcom" className="hover:text-orange-400 transition-colors">Garçom</a>
            <span className="text-slate-700">|</span>
            <a href="/kds" className="hover:text-orange-400 transition-colors">Cozinha (KDS)</a>
            <span className="text-slate-700">|</span>
            <a href="/entregador" className="hover:text-orange-400 transition-colors">Entregador</a>
          </nav>
        </div>
      </header>

      {/* Container de login centralizado e responsivo */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur">
          <div className="mb-6 text-center">
            <h1 className={`${DISPLAY} text-2xl sm:text-3xl font-bold text-white mb-2`}>Entrar</h1>
            <p className="text-xs sm:text-sm text-slate-400">Acesse com a sua conta para gerenciar a pizzaria</p>
          </div>

          {erro && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center text-xs sm:text-sm text-red-400">
              {erro}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Senha
              </label>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="mt-2 w-full rounded-lg bg-orange-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50"
            >
              {carregando ? 'Entrando…' : 'Entrar no Sistema'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
