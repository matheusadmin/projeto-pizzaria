'use client'

import dynamic from 'next/dynamic'

const ComprasScreen = dynamic(() => import('@/components/admin/compras/ComprasScreen'), { ssr: false })

export default function Page() {
  return <ComprasScreen />
}
