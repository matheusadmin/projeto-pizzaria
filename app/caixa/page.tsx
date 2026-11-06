import { RequireRole } from '@/components/RequireRole'
import CaixaScreen from '@/components/caixa/CaixaScreen'
import { ROTAS } from '@/lib/rotas'

export default function CaixaPage() {
  return (
    <RequireRole roles={ROTAS.caixa.roles}>
      <CaixaScreen />
    </RequireRole>
  )
}
