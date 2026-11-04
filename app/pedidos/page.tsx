import RequireRole from '@/components/RequireRole'
import PainelPedidosScreen from '@/components/pedidos/PainelPedidosScreen'

export default function PedidosPage() {
  return (
    <RequireRole roles={['admin', 'caixa', 'cozinha', 'entregador']}>
      <PainelPedidosScreen />
    </RequireRole>
  )
}
