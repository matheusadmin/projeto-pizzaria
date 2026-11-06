import { RequireRole } from '@/components/RequireRole'
import GarcomScreen from '@/components/garcom/GarcomScreen'
import { ROTAS } from '@/lib/rotas'

export default function GarcomPage() {
  return (
    <RequireRole roles={ROTAS.garcom.roles}>
      <GarcomScreen />
    </RequireRole>
  )
}
