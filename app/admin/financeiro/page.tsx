'use client'

import dynamic from 'next/dynamic'

// Sem SSR: a tela usa datas (new Date) e dados do cliente, que causam erro de hidratação no prerender.
const FinanceiroScreen = dynamic(
  () => import('@/components/admin/financeiro/FinanceiroScreen'),
  { ssr: false }
)

export default function Page() {
  return <FinanceiroScreen />
}
