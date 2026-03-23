'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, AlertTriangle, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'

export default function ConfiguracoesPage() {
  const supabase = createClient()
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [showDangerZone, setShowDangerZone] = useState(false)

  const handleResetVendas = async () => {
    if (confirmText !== 'CONFIRMAR') {
      toast.error('Digite CONFIRMAR para prosseguir')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('vendas').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      toast.success('Histórico de vendas resetado com sucesso')
      setConfirmText('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao resetar')
    } finally {
      setLoading(false)
    }
  }

  const handleResetEstoque = async () => {
    if (confirmText !== 'CONFIRMAR') {
      toast.error('Digite CONFIRMAR para prosseguir')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('estoque').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) throw error
      toast.success('Estoque resetado com sucesso')
      setConfirmText('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao resetar')
    } finally {
      setLoading(false)
    }
  }

  const handleResetAll = async () => {
    if (confirmText !== 'RESETAR TUDO') {
      toast.error('Digite RESETAR TUDO para prosseguir')
      return
    }

    setLoading(true)
    try {
      // Delete all data from main tables
      await Promise.all([
        supabase.from('vendas').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('estoque').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('clientes').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('financeiro_saidas').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('financeiro_notas').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ])
      toast.success('Sistema resetado completamente')
      setConfirmText('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao resetar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="text-gray-500 text-sm mt-1">Gerenciamento do sistema</p>
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-forest-100 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-forest-700" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Sistema Livraria Limão e Mel</h2>
            <p className="text-xs text-gray-400">v2.0.0 — Next.js 14 + Supabase</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Framework', value: 'Next.js 14' },
            { label: 'Banco de Dados', value: 'Supabase (PostgreSQL)' },
            { label: 'UI', value: 'Tailwind CSS + Radix' },
            { label: 'Gráficos', value: 'Recharts' },
          ].map((info) => (
            <div key={info.label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-400">{info.label}</p>
              <p className="text-sm font-medium text-gray-700 mt-0.5">{info.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
        <div
          className="flex items-center justify-between px-6 py-4 bg-red-50 cursor-pointer"
          onClick={() => setShowDangerZone(!showDangerZone)}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="text-sm font-semibold text-red-800">Zona de Perigo</h2>
              <p className="text-xs text-red-600">Ações irreversíveis — use com extremo cuidado</p>
            </div>
          </div>
          <span className="text-xs text-red-500">{showDangerZone ? 'Ocultar' : 'Mostrar'}</span>
        </div>

        {showDangerZone && (
          <div className="p-6 space-y-6">
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                As ações abaixo são <strong>irreversíveis</strong>. Os dados serão permanentemente deletados
                do banco de dados. Faça backup antes de prosseguir.
              </p>
            </div>

            {/* Individual resets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-red-100 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Resetar Vendas</h3>
                <p className="text-xs text-gray-500 mb-4">Remove todo o histórico de vendas. O estoque não é afetado.</p>
                <div className="mb-3">
                  <label className="block text-xs text-gray-500 mb-1">Digite CONFIRMAR</label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="CONFIRMAR"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                </div>
                <button
                  onClick={handleResetVendas}
                  disabled={loading || confirmText !== 'CONFIRMAR'}
                  className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-200 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Resetar Vendas
                </button>
              </div>

              <div className="border border-red-100 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Resetar Estoque</h3>
                <p className="text-xs text-gray-500 mb-4">Remove todos os itens do estoque. Vendas não são afetadas.</p>
                <div className="mb-3">
                  <label className="block text-xs text-gray-500 mb-1">Digite CONFIRMAR</label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="CONFIRMAR"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                </div>
                <button
                  onClick={handleResetEstoque}
                  disabled={loading || confirmText !== 'CONFIRMAR'}
                  className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-200 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Resetar Estoque
                </button>
              </div>

              <div className="border-2 border-red-300 rounded-xl p-4 bg-red-50">
                <h3 className="text-sm font-semibold text-red-800 mb-1">Reset Completo</h3>
                <p className="text-xs text-red-600 mb-4">Remove TODOS os dados: vendas, estoque, clientes e financeiro.</p>
                <div className="mb-3">
                  <label className="block text-xs text-red-600 mb-1">Digite RESETAR TUDO</label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="RESETAR TUDO"
                    className="w-full px-3 py-1.5 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                  />
                </div>
                <button
                  onClick={handleResetAll}
                  disabled={loading || confirmText !== 'RESETAR TUDO'}
                  className="w-full flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 disabled:bg-gray-200 text-white text-sm font-bold py-2 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset Completo
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
