'use client'

import dynamic from 'next/dynamic'

const CardapioScreen = dynamic(() => import('@/components/admin/cardapio/CardapioScreen'), { ssr: false })

export default function Page() {
  return <CardapioScreen />
}
