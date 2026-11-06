import { Suspense } from 'react'
import FichasScreen from '@/components/admin/fichas/FichasScreen'

// useSearchParams (usado para abrir direto um produto) exige Suspense no App Router.
export default function Page() {
  return (
    <Suspense fallback={<p className="text-slate-400">Carregando…</p>}>
      <FichasScreen />
    </Suspense>
  )
}
