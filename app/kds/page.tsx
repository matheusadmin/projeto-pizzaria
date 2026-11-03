import RequireRole from '@/components/RequireRole'
import KdsScreen from '@/components/kds/KdsScreen'

export default function KdsPage() {
  return (
    <RequireRole roles={['admin', 'caixa', 'cozinha']}>
      <KdsScreen />
    </RequireRole>
  )
}
