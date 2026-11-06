import { RequireRole } from '@/components/RequireRole'
import KdsScreen from '@/components/kds/KdsScreen'
import { ROTAS } from '@/lib/rotas'

export default function KdsPage() {
  return (
    <RequireRole roles={ROTAS.kds.roles}>
      <KdsScreen />
    </RequireRole>
  )
}
