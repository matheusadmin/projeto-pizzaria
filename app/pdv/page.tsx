import RequireRole from '@/components/RequireRole'
import PdvScreen from '@/components/pdv/PdvScreen'

export default function PdvPage() {
  return (
    <RequireRole roles={['admin', 'caixa']}>
      <PdvScreen />
    </RequireRole>
  )
}
