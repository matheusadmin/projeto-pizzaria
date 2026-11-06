import { RequireRole } from '@/components/RequireRole'
import PdvScreen from '@/components/pdv/PdvScreen'
import { ROTAS } from '@/lib/rotas'

export default function PdvPage() {
  return (
    <RequireRole roles={ROTAS.pdv.roles}>
      <PdvScreen />
    </RequireRole>
  )
}
