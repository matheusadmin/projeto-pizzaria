'use client'

import { useEffect, useState } from 'react'
import { buscarClientePorTelefone, type ClienteConhecido } from '@/lib/clientes'
import type { PedidoMeta } from '@/lib/types'
import { soDigitos } from '@/lib/whatsapp'

interface Props {
  telefone: string
  entrega: boolean
  onUsar: (patch: Partial<PedidoMeta>) => void
}

/** Ao digitar o telefone, mostra o cliente conhecido (nome, último endereço, pedido favorito) com um toque para preencher. */
export default function ClienteSugerido({ telefone, entrega, onUsar }: Props) {
  const [cliente, setCliente] = useState<ClienteConhecido | null>(null)
  const [usado, setUsado] = useState(false)
  const digitos = soDigitos(telefone)

  useEffect(() => {
    setUsado(false)
    if (digitos.length < 10) { setCliente(null); return }
    let vivo = true
    const t = setTimeout(() => {
      buscarClientePorTelefone(digitos).then((c) => { if (vivo) setCliente(c) })
    }, 400)
    return () => { vivo = false; clearTimeout(t) }
  }, [digitos])

  if (!cliente || usado) return null

  function usar() {
    if (!cliente) return
    onUsar({
      ...(cliente.nome ? { clienteNome: cliente.nome } : {}),
      ...(entrega && cliente.endereco ? {
        endereco: cliente.endereco,
        cidade: cliente.cidade,
        bairro: cliente.bairro,
        ...(cliente.taxa != null ? { taxaEntrega: cliente.taxa } : {}),
      } : {}),
    })
    setUsado(true)
  }

  return (
    <div className="space-y-1 rounded-md border border-marca/40 bg-marca/10 p-3 text-sm">
      <p className="font-semibold text-marca">
        Cliente conhecido{cliente.nome ? `: ${cliente.nome}` : ''}
      </p>
      <p className="text-slate-300">
        {cliente.totalPedidos} {cliente.totalPedidos === 1 ? 'pedido' : 'pedidos'} · último em{' '}
        {new Date(cliente.ultimoPedidoEm).toLocaleDateString('pt-BR')}
      </p>
      {cliente.favorito && (
        <p className="text-slate-300">⭐ Favorito: <strong className="text-white">{cliente.favorito.produto}</strong> ({cliente.favorito.vezes}x)</p>
      )}
      {entrega && cliente.endereco && <p className="text-slate-300">📍 {cliente.endereco}{cliente.bairro ? `, ${cliente.bairro}` : ''}</p>}
      <button type="button" onClick={usar}
        className="mt-1 rounded-md bg-marca px-3 py-1.5 text-xs font-semibold text-fundo hover:bg-marca-claro">
        Preencher dados do cliente
      </button>
    </div>
  )
}
