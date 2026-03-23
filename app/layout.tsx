import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Livraria Limão e Mel',
  description: 'Sistema de gestão para a Livraria Limão e Mel',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <div className="p-6 max-w-screen-2xl mx-auto">
              {children}
            </div>
          </main>
        </div>
        <Toaster
          position="top-right"
          richColors
          expand={false}
          duration={3000}
        />
      </body>
    </html>
  )
}
