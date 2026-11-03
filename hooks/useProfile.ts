'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { Perfil } from '@/lib/types'

/** Carrega o perfil (role) do usuário logado. perfil = null se deslogado ou inativo. */
export function useProfile() {
  const [state, setState] = useState<{ loading: boolean; perfil: Perfil | null }>({
    loading: true,
    perfil: null,
  })

  useEffect(() => {
    let vivo = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return vivo && setState({ loading: false, perfil: null })

      const { data } = await supabase
        .from('perfis')
        .select('id, nome, role, ativo')
        .eq('id', user.id)
        .maybeSingle()

      if (!vivo) return
      setState({
        loading: false,
        perfil: data && data.ativo ? { id: data.id, nome: data.nome, role: data.role } : null,
      })
    })()
    return () => { vivo = false }
  }, [])

  return state
}
