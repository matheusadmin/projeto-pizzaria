import { RequireRole } from '@/components/RequireRole'
import EntregadorScreen from '@/components/entregador/EntregadorScreen'
import { ROTAS } from '@/lib/rotas'

export default function EntregadorPage() {
  return (
    <RequireRole roles={ROTAS.entregador.roles}>
      <EntregadorScreen />
    </RequireRole>
  )
}
