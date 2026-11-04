import RequireRole from '@/components/RequireRole'
import EntregadorScreen from '@/components/entregador/EntregadorScreen'

export default function EntregadorPage() {
  return (
    <RequireRole roles={['admin', 'caixa', 'cozinha', 'entregador']}>
      <EntregadorScreen />
    </RequireRole>
  )
}
