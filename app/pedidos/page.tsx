import { RequireRole } from '@/components/RequireRole'
import PainelPedidosScreen from '@/components/pedidos/PainelPedidosScreen'
import { ROTAS } from '@/lib/rotas'

export default function PedidosPage() {
  return (
    <RequireRole roles={ROTAS.pedidos.roles}>
      <PainelPedidosScreen />
    </RequireRole>
  )
}
