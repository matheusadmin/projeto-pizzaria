import RequireRole from '@/components/RequireRole'

export default function GarcomPage() {
  return (
    <RequireRole roles={['admin', 'caixa']}>
      <div className="p-6 bg-[#14181F] min-h-screen text-white">
        <h1 className="text-3xl font-bold mb-4">🪑 Painel do Garçom / Comanda Digital</h1>
        <p className="text-slate-400">Módulo em execução para lançamento direto nas mesas e envio imediato ao KDS.</p>
      </div>
    </RequireRole>
  )
}
