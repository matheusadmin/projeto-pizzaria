import RequireRole from '@/components/RequireRole'

export default function EntregadorPage() {
  return (
    <RequireRole roles={['admin', 'caixa', 'cozinha']}>
      <div className="p-6 bg-[#10151C] min-h-screen text-white">
        <h1 className="text-3xl font-bold mb-4">🛵 Painel do Entregador</h1>
        <p className="text-slate-400">Alertas sonoros e visuais ativados para pedidos prontos na expedição.</p>
      </div>
    </RequireRole>
  )
}
