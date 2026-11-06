'use client'

import dynamic from 'next/dynamic'

// Sem SSR: a tela usa datas (new Date) e dados do cliente, que causam erro de hidratação no prerender.
const DashboardScreen = dynamic(
  () => import('@/components/admin/dashboard/DashboardScreen'),
  { ssr: false }
)

export default function Page() {
  return <DashboardScreen />
}
