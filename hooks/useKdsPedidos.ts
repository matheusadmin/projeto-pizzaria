'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { PedidoKds } from '@/lib/types'

const SELECT = `
  id, numero, tipo, status, mesa, cliente_nome, observacoes, created_at,
  itens_pedido ( id, nome_produto, nome_tamanho, quantidade, observacoes, created_at )
`

// Pedidos 'pronto' ficam visíveis por esta janela (ms) para o salão/balcão buscar; depois saem da tela.
const JANELA_PRONTO_MS = 3 * 60 * 60 * 1000

/**
 * Pedidos 'em_preparo' e 'pronto' em tempo real.
 * ('pendente' é de propósito ocultado: é só o instante entre criar o pedido e inserir os itens.)
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
      .in('status', ['em_preparo', 'pronto'])
      .gte('created_at', new Date(Date.now() - JANELA_PRONTO_MS).toISOString())
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

    // Só apita para pedido NOVO na cozinha (em_preparo), não quando um pedido vira 'pronto'.
    const emPreparo = lista.filter((p) => p.status === 'em_preparo')
    if (conhecidos.current && emPreparo.some((p) => !conhecidos.current!.has(p.id))) {
      callbackRef.current?.()
    }
    conhecidos.current = new Set(emPreparo.map((p) => p.id))

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
      // 'pronto' muda de coluna; 'saiu_para_entrega' sai do KDS.
      setPedidos((prev) =>
        novoStatus === 'pronto'
          ? prev.map((p) => (p.id === id ? { ...p, status: 'pronto' as const } : p))
          : prev.filter((p) => p.id !== id)
      )
    },
    [carregar]
  )

  return { pedidos, loading, conectado, erro, avancar }
}
