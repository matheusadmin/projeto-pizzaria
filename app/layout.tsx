import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import './globals.css'
import NavBarAdmin from '@/components/NavBarAdmin'

// Barlow (texto) + Barlow Condensed (números de pedido, tamanhos, totais).
const body = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' })
const display = Barlow_Condensed({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' })

export const metadata: Metadata = { title: 'Kikas Pizzaria & Petiscaria' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${body.variable} ${display.variable}`}>
      <body className="flex h-dvh flex-col font-[family-name:var(--font-body)] antialiased">
        <NavBarAdmin />
        {/* Sem <main> aqui: cada tela já tem o seu. */}
        <div className="app-conteudo min-h-0 flex-1 overflow-y-auto">{children}</div>
      </body>
    </html>
  )
}
