'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { PedidoKds } from '@/lib/types'

const SELECT = `
  id, numero, tipo, status, mesa, cliente_nome, observacoes, created_at,
  itens_pedido ( id, nome_produto, nome_tamanho, quantidade, observacoes, created_at )
`

/**
 * Pedidos 'em_preparo' em tempo real.
 * Estratégia: qualquer evento postgres_changes em `pedidos` dispara um refetch
 * (com debounce). Assim o card sempre vem completo, com itens, e o RLS é respeitado.
 * Há também um refetch a cada 30s como rede de segurança contra quedas de conexão.
 */
export function useKdsPedidos(onNovoPedido?: () => void) {
  const [pedidos, setPedidos] = useState<PedidoKds[]>([])
  const [loading, setLoading] = useState(true)
  const [conectado, setConectado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const conhecidos = useRef<Set<string> | null>(null) // null até a 1ª carga (não apita na abertura)
  const callbackRef = useRef(onNovoPedido)
  useEffect(() => { callbackRef.current = onNovoPedido })

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select(SELECT)
      .eq('status', 'em_preparo')
      .order('created_at', { ascending: true }) // mais antigo primeiro

    if (error) {
      setErro(error.message)
      setLoading(false)
      return
    }

    const lista = (data as unknown as PedidoKds[]).map((p) => ({
      ...p,
      itens_pedido: [...p.itens_pedido].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    }))

    if (conhecidos.current && lista.some((p) => !conhecidos.current!.has(p.id))) {
      callbackRef.current?.()
    }
    conhecidos.current = new Set(lista.map((p) => p.id))

    setErro(null)
    setPedidos(lista)
    setLoading(false)
  }, [])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const agendar = () => {
      clearTimeout(timer)
      timer = setTimeout(carregar, 250)
    }

    carregar()

    const canal = supabase
      .channel('kds-pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, agendar)
      .subscribe((status) => {
        setConectado(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') carregar() // recarrega ao (re)conectar
      })

    const poll = setInterval(carregar, 30_000)

    return () => {
      clearTimeout(timer)
      clearInterval(poll)
      supabase.removeChannel(canal)
    }
  }, [carregar])

  /** Avança o status. O banco valida (RLS + trigger): cozinha só pode 'pronto'. */
  const avancar = useCallback(
    async (id: string, novoStatus: 'pronto' | 'saiu_para_entrega') => {
      const { data, error } = await supabase
        .from('pedidos')
        .update({ status: novoStatus })
        .eq('id', id)
        .select('id')

      // RLS que bloqueia o UPDATE não gera erro: devolve 0 linhas.
      if (error || !data?.length) {
        setErro(error?.message ?? 'Sem permissão para alterar este pedido.')
        await carregar()
        return
      }
      setErro(null)
      setPedidos((prev) => prev.filter((p) => p.id !== id))
    },
    [carregar]
  )

  return { pedidos, loading, conectado, erro, avancar }
}
