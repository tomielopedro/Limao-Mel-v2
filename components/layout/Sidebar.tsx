'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  History,
  Users,
  Package,
  DollarSign,
  Settings,
  LogOut,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/app/login/actions'

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

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'w-60 bg-forest-800 flex flex-col shrink-0',
        // Mobile: fixed overlay with slide transition
        'fixed inset-y-0 left-0 z-50 transition-transform duration-300',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: sticky in normal flow
        'md:sticky md:top-0 md:h-screen md:translate-x-0 md:transition-none md:z-auto'
      )}
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b border-forest-700 flex items-center justify-between">
        <div className="flex-1 flex justify-center">
          <Image
            src="/logo_limao_e_mel.png"
            alt="Livraria Limão e Mel"
            width={80}
            height={80}
            priority
          />
        </div>
        <button
          onClick={onClose}
          className="md:hidden text-gray-300 hover:text-white p-1 -mr-1"
          aria-label="Fechar menu"
        >
          <X className="w-5 h-5" />
        </button>
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
              onClick={onClose}
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
      <div className="px-3 py-3 border-t border-forest-700 space-y-1">
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-forest-800 hover:text-white transition-all duration-200"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sair</span>
          </button>
        </form>
        <p className="text-forest-500 text-xs text-center pt-1">v2.0.0 &bull; 2025</p>
      </div>
    </aside>
  )
}
