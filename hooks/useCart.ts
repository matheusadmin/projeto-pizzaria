'use client'

import { useCallback, useMemo, useState } from 'react'
import { round2, type CartItem } from '@/lib/types'

const novaChave = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export function useCart() {
  const [itens, setItens] = useState<CartItem[]>([])

  // Mesmo produto + tamanho + observação = soma na mesma linha.
  const adicionar = useCallback((item: Omit<CartItem, 'key'>) => {
    setItens((prev) => {
      const i = prev.findIndex(
        (p) => p.tamanho_id === item.tamanho_id && p.observacoes === item.observacoes
      )
      if (i >= 0) {
        return prev.map((p, idx) =>
          idx === i ? { ...p, quantidade: p.quantidade + item.quantidade } : p
        )
      }
      return [...prev, { ...item, key: novaChave() }]
    })
  }, [])

  const alterarQuantidade = useCallback((key: string, delta: number) => {
    setItens((prev) =>
      prev.flatMap((p) => {
        if (p.key !== key) return [p]
        const q = p.quantidade + delta
        return q <= 0 ? [] : [{ ...p, quantidade: q }]
      })
    )
  }, [])

  const remover = useCallback((key: string) => {
    setItens((prev) => prev.filter((p) => p.key !== key))
  }, [])

  const limpar = useCallback(() => setItens([]), [])

  const subtotal = useMemo(
    () => round2(itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)),
    [itens]
  )

  return { itens, subtotal, adicionar, alterarQuantidade, remover, limpar }
}
