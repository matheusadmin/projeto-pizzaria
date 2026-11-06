'use client'

import dynamic from 'next/dynamic'

// Sem SSR: a tela usa datas (new Date) e dados do cliente, que causam erro de hidratação no prerender.
const ContasScreen = dynamic(() => import('@/components/admin/contas/ContasScreen'), { ssr: false })

export default function Page() {
  return <ContasScreen />
}
