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

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      })

      if (error) {
        setErro('Credenciais inválidas. Verifique o e-mail e a senha.')
      } else {
        router.push('/')
      }
    } catch {
      setErro('Erro de conexão com o servidor. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col justify-between bg-fundo text-slate-100 antialiased select-none">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-superficie p-8 shadow-2xl backdrop-blur-xl">
          {/* Identidade de Marca */}
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-marca/20 border border-marca/40 text-3xl shadow-inner">
              🍕
            </div>
            <h1 className={`${DISPLAY} text-2xl font-black text-white tracking-wide uppercase pt-2`}>
              Kikas Pizzaria <span className="text-marca">&</span> Petiscaria
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Sistema de Gestão & Controle Operacional
            </p>
          </div>

          {/* Form de Acesso */}
          <form onSubmit={handleLogin} className="space-y-4">
            {erro && (
              <div role="alert" className="rounded-xl bg-red-950/80 border border-red-500/40 p-3.5 text-center text-xs font-semibold text-red-300 shadow">
                {erro}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                E-mail
              </label>
              <input
                type="email"
                required
                placeholder="operador@kikaspizzaria.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 rounded-xl border border-white/15 bg-fundo px-4 text-sm font-medium text-white placeholder-slate-500 focus:border-marca focus:outline-none focus:ring-1 focus:ring-marca transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Senha
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full h-12 rounded-xl border border-white/15 bg-fundo px-4 text-sm font-medium text-white placeholder-slate-500 focus:border-marca focus:outline-none focus:ring-1 focus:ring-marca transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full h-12 rounded-xl bg-marca font-bold text-sm text-fundo shadow-lg active:bg-marca-claro disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {carregando ? 'Autenticando…' : 'Entrar no Sistema ➔'}
            </button>
          </form>
        </div>
      </div>

      {/* Assinatura do Desenvolvedor */}
      <footer className="py-4 text-center border-t border-white/5 bg-rodape">
        <p className="text-[11px] text-slate-500 font-medium tracking-wide">
          Desenvolvido por <span className="text-slate-300 font-semibold">Matheus Thomaz</span>
        </p>
      </footer>
    </div>
  )
}