'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePerfil } from '@/components/RequireRole'
import SignOutButton from '@/components/SignOutButton'
import { useKdsPedidos } from '@/hooks/useKdsPedidos'
import { DISPLAY } from '@/lib/ui'
import OrderCard from './OrderCard'

/** Relógio que força re-render periódico (para os minutos de espera). */
function useAgora(intervaloMs: number) {
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), intervaloMs)
    return () => clearInterval(t)
  }, [intervaloMs])
  return agora
}

/** Coluna de estado do KDS: título com contador e área de cartões. */
function Coluna({ titulo, total, cor, vazio, children }: {
  titulo: string; total: number; cor: string; vazio: string; children: ReactNode
}) {
  return (
    <section aria-label={titulo} className="space-y-4">
      <h2 className={`${DISPLAY} flex items-baseline gap-3 border-b-2 pb-2 text-2xl font-bold uppercase tracking-wide ${cor}`}>
        {titulo}
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-base tabular-nums text-white">{total}</span>
      </h2>
      {total === 0 ? (
        <p className={`${DISPLAY} py-16 text-center text-2xl font-semibold text-slate-500`}>{vazio}</p>
      ) : children}
    </section>
  )
}

export default function KdsScreen() {
  const perfil = usePerfil()
  const agora = useAgora(15_000)

  // Som de novo pedido. Navegadores só liberam áudio após um clique do usuário.
  const [somAtivo, setSomAtivo] = useState(false)
  const somRef = useRef(false)
  const audioRef = useRef<AudioContext | null>(null)

  const apitar = useCallback(() => {
    const ctx = audioRef.current
    if (!ctx || !somRef.current) return
    const osc = ctx.createOscillator()
    const ganho = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    ganho.gain.setValueAtTime(0.0001, ctx.currentTime)
    ganho.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    ganho.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7)
    osc.connect(ganho).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.7)
  }, [])

  const { pedidos, loading, conectado, erro, avancar } = useKdsPedidos(apitar)

  function alternarSom() {
    if (!audioRef.current) audioRef.current = new AudioContext()
    void audioRef.current.resume()
    somRef.current = !somRef.current
    setSomAtivo(somRef.current)
    if (somRef.current) apitar() // toque de teste
  }

  const emPreparo = pedidos.filter((p) => p.status === 'em_preparo')
  const prontos = pedidos.filter((p) => p.status === 'pronto')

  const podeDespachar = perfil.role === 'admin' || perfil.role === 'dev' || perfil.role === 'caixa'

  return (
    <div className="min-h-screen bg-fundo text-slate-100">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-fundo px-5 py-3">
        <div className="flex items-baseline gap-4">
          <h1 className={`${DISPLAY} text-3xl font-bold`}>Cozinha</h1>
          <p className="text-lg text-slate-300">
            {emPreparo.length === 1 ? '1 pedido em preparo' : `${emPreparo.length} pedidos em preparo`}
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-2" role="status">
            <span className={`h-2.5 w-2.5 rounded-full ${conectado ? 'bg-sucesso' : 'bg-perigo'}`} />
            {conectado ? 'Ao vivo' : 'Reconectando…'}
          </span>
          <button type="button" onClick={alternarSom} aria-pressed={somAtivo}
            className={
              'rounded-md border px-3 py-1.5 font-medium ' +
              (somAtivo ? 'border-marca text-marca' : 'border-white/30 hover:bg-white/10')
            }>
            {somAtivo ? 'Som ligado' : 'Ligar som'}
          </button>
          <SignOutButton className="rounded-md border border-white/30 px-3 py-1.5 font-medium hover:bg-white/10" />
        </div>
      </header>

      {erro && (
        <p role="alert" className="bg-perigo-escuro px-5 py-2 text-center font-semibold text-white">{erro}</p>
      )}

      <main className="p-5">
        {loading ? (
          <p className="py-20 text-center text-slate-400">Carregando pedidos…</p>
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Coluna titulo="Em preparo" total={emPreparo.length} cor="border-marca text-marca" vazio="Nenhum pedido em preparo">
              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {emPreparo.map((p) => (
                  <OrderCard key={p.id} pedido={p} agora={agora} podeDespachar={podeDespachar} onAvancar={avancar} />
                ))}
              </div>
            </Coluna>

            <Coluna titulo="Pronto" total={prontos.length} cor="border-sucesso-claro text-sucesso-claro" vazio="Nada aguardando retirada">
              <div className="grid grid-cols-1 items-start gap-4">
                {prontos.map((p) => (
                  <OrderCard key={p.id} pedido={p} agora={agora} podeDespachar={podeDespachar} onAvancar={avancar} />
                ))}
              </div>
            </Coluna>
          </div>
        )}
      </main>
    </div>
  )
}
