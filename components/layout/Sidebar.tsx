'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  History,
  Users,
  Package,
  DollarSign,
  Settings,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/pdv',
    label: 'PDV',
    icon: ShoppingCart,
  },
  {
    href: '/historico',
    label: 'Histórico',
    icon: History,
  },
  {
    href: '/clientes',
    label: 'Clientes',
    icon: Users,
  },
  {
    href: '/estoque',
    label: 'Estoque & XML',
    icon: Package,
  },
  {
    href: '/financeiro',
    label: 'Financeiro',
    icon: DollarSign,
  },
  {
    href: '/configuracoes',
    label: 'Configurações',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-forest-800 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-forest-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-lemon-500 rounded-lg flex items-center justify-center shadow-md">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">Limão e Mel</h1>
            <p className="text-forest-300 text-xs">Livraria</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'sidebar-link',
                isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-forest-700">
        <p className="text-forest-400 text-xs text-center">v2.0.0 &bull; 2024</p>
      </div>
    </aside>
  )
}
