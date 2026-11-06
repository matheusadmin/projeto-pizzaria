'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePerfil } from '@/components/RequireRole'
import SignOutButton from '@/components/SignOutButton'
import { supabase } from '@/lib/supabase/client'
import { DISPLAY } from '@/lib/ui'
import { brl } from '@/lib/types'

interface PedidoEntrega {
  id: string
  numero: number
  status: string
  pago: boolean
  cliente_nome: string | null
  cliente_telefone: string | null
  endereco_entrega: string | null
  taxa_entrega: number
  observacoes: string | null
  created_at: string
}

export default function EntregadorScreen() {
  const perfil = usePerfil()
  const [pedidos, setPedidos] = useState<PedidoEntrega[]>([])
  const [loading, setLoading] = useState(true)
  const [conectado, setConectado] = useState(false)
  const [somAtivo, setSomAtivo] = useState(false)
  const somRef = useRef(false)
  const audioRef = useRef<AudioContext | null>(null)

  const apitar = useCallback(() => {
    const ctx = audioRef.current
    if (!ctx || !somRef.current) return
    const osc = ctx.createOscillator()
    const ganho = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 650
    ganho.gain.setValueAtTime(0.0001, ctx.currentTime)
    ganho.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    ganho.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
    osc.connect(ganho).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.6)
  }, [])

  // Carrega apenas pedidos prontos para sair ou em rota
  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select('id, numero, status, pago, cliente_nome, cliente_telefone, endereco_entrega, taxa_entrega, observacoes, created_at')
      .eq('tipo', 'delivery')
      .in('status', ['pronto', 'saiu_para_entrega'])
      .order('created_at', { ascending: true })

    if (!error && data) {
      setPedidos(data as PedidoEntrega[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar()
    const canal = supabase
      .channel('entregador-delivery')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => {
        carregar()
        if (somRef.current) apitar()
      })
      .subscribe((status) => {
        setConectado(status === 'SUBSCRIBED')
      })

    const poll = setInterval(carregar, 15_000)
    return () => {
      clearInterval(poll)
      supabase.removeChannel(canal)
    }
  }, [carregar, apitar])

  function alternarSom() {
    if (!audioRef.current) audioRef.current = new AudioContext()
    void audioRef.current.resume()
    somRef.current = !somRef.current
    setSomAtivo(somRef.current)
    if (somRef.current) apitar()
  }

  // REGRA DE SEGURANÇA OPERACIONAL:
  // Marcar como 'entregue' NÃO marca pago = true. Apenas sinaliza ao caixa que o entregador retornou!
  async function alterarStatus(id: string, novoStatus: 'saiu_para_entrega' | 'entregue') {
    await supabase.from('pedidos').update({ status: novoStatus }).eq('id', id)
    carregar()
  }

  return (
    <div className="min-h-screen bg-fundo text-slate-100">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-superficie px-5 py-3">
        <div className="flex items-baseline gap-4">
          <h1 className={`${DISPLAY} text-3xl font-bold text-marca`}>🛵 Expedição & Entregadores</h1>
          <p className="text-sm text-slate-300">Rotas de entrega em andamento</p>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-2" role="status">
            <span className={`h-2.5 w-2.5 rounded-full ${conectado ? 'bg-emerald-500' : 'bg-red-500'}`} />
            {conectado ? 'Ao vivo' : 'Conectando…'}
          </span>
          <button type="button" onClick={alternarSom} aria-pressed={somAtivo}
            className={
              'rounded-md border px-3 py-1.5 font-medium transition-colors ' +
              (somAtivo ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10' : 'border-white/30 hover:bg-white/10')
            }>
            {somAtivo ? '🔔 Alerta Sonoro Ligado' : '🔕 Ligar Alerta Sonoro'}
          </button>
          <SignOutButton className="rounded-md border border-white/30 px-3 py-1.5 font-medium hover:bg-white/10" />
        </div>
      </header>

      <main className="p-5">
        {loading ? (
          <p className="py-20 text-center text-slate-400">Carregando entregas…</p>
        ) : pedidos.length === 0 ? (
          <p className={`${DISPLAY} py-24 text-center text-4xl font-semibold text-slate-500`}>
            Nenhum pedido aguardando expedição ou em rota no momento
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pedidos.map((p) => {
              const pronto = p.status === 'pronto'
              return (
                <article key={p.id} className={`flex flex-col justify-between rounded-lg bg-superficie-alta border-2 p-5 shadow-lg ${pronto ? 'border-yellow-500 animate-pulse' : 'border-blue-500/50'}`}>
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className={`${DISPLAY} text-4xl font-bold text-white`}>#{p.numero}</span>
                        <span className={`ml-3 text-xs px-2.5 py-1 rounded-full font-semibold uppercase ${pronto ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white'}`}>
                          {pronto ? '🔔 Pronto na Cozinha' : '🚀 Em Rota de Entrega'}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-marca">{brl(p.taxa_entrega)} taxa</span>
                    </div>

                    <div className="space-y-1 mb-4 text-sm">
                      <p className="text-white font-semibold text-base">👤 {p.cliente_nome || 'Cliente não informado'}</p>
                      <p className="text-slate-300">📞 {p.cliente_telefone || 'Sem telefone'}</p>
                      <p className="text-slate-200 bg-black/30 p-2 rounded mt-2 border border-white/10">📍 {p.endereco_entrega || 'Sem endereço informado'}</p>
                      {p.observacoes && <p className="text-yellow-300 text-xs mt-1">Obs: {p.observacoes}</p>}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex gap-2">
                    {pronto && (
                      <button
                        type="button"
                        onClick={() => alterarStatus(p.id, 'saiu_para_entrega')}
                        className="flex-1 rounded-md bg-blue-600 py-3 text-base font-semibold text-white hover:bg-blue-500 transition-colors"
                      >
                        🛵 Assumir e Sair para Entrega
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => alterarStatus(p.id, 'entregue')}
                      className="flex-1 rounded-md bg-emerald-600 py-3 text-base font-semibold text-white hover:bg-emerald-500 transition-colors"
                    >
                      ✅ Concluir Retorno ao Caixa
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
