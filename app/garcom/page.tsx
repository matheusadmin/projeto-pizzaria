import RequireRole from '@/components/RequireRole'
import GarcomScreen from '@/components/garcom/GarcomScreen'

export default function GarcomPage() {
  return (
    <RequireRole roles={['admin', 'caixa']}>
      <GarcomScreen />
    </RequireRole>
  )
}
