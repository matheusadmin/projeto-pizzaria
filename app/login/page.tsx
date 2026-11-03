'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { DISPLAY, INPUT } from '@/lib/ui'
import type { Role } from '@/lib/types'

// Tela inicial de cada perfil. O entregador ganha a dele na próxima etapa.
const HOME: Partial<Record<Role, string>> = { admin: '/pdv', caixa: '/pdv', cozinha: '/kds' }

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro('E-mail ou senha incorretos.')
      return setEnviando(false)
    }

    const { data: perfil } = await supabase
      .from('perfis').select('role, ativo').eq('id', data.user.id).maybeSingle()

    const destino = perfil?.ativo ? HOME[perfil.role as Role] : undefined
    if (!destino) {
      await supabase.auth.signOut()
      setErro(
        perfil?.ativo
          ? 'A tela deste perfil ainda não está disponível.'
          : 'Este usuário não tem perfil ativo. Peça ao administrador para liberar o acesso.'
      )
      return setEnviando(false)
    }
    router.replace(destino)
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#14181F] p-6">
      <form onSubmit={entrar} className="w-full max-w-sm space-y-4 rounded-md bg-white p-6">
        <h1 className={`${DISPLAY} text-4xl font-bold text-[#14181F]`}>Entrar</h1>

        <label className="block space-y-1 text-sm font-medium text-slate-700">
          E-mail
          <input className={INPUT} type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label className="block space-y-1 text-sm font-medium text-slate-700">
          Senha
          <input className={INPUT} type="password" autoComplete="current-password" required
            value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>

        {erro && <p role="alert" className="text-sm font-medium text-[#B42318]">{erro}</p>}

        <button type="submit" disabled={enviando}
          className="w-full rounded-md bg-[#D7372B] py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D7372B] disabled:opacity-60">
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
