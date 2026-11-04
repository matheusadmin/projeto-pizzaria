import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import './globals.css'
import NavBarAdmin from '@/components/NavBarAdmin';
// Barlow (texto) + Barlow Condensed (números de pedido, tamanhos, totais).
const body = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' })
const display = Barlow_Condensed({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' })

export const metadata: Metadata = { title: 'Gestão da Casa' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${body.variable} ${display.variable}`}>
      <body className="font-[family-name:var(--font-body)] antialiased">
        <NavBarAdmin />
        <main>{children}</main>
      </body>
    </html>
  )
}
