'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDateTime, getTodayString } from '@/lib/utils'
import type { Venda } from '@/lib/types'
import {
  History,
  Download,
  Search,
  Filter,
  TrendingUp,
  ShoppingBag,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'

export const dynamic = 'force-dynamic'

type OrigemFilter = 'Todos' | 'Próprio' | 'Consignado'

export default function HistoricoPage() {
  const supabase = createClient()

  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState(getTodayString())
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroComanda, setFiltroComanda] = useState('')
  const [filtroOrigem, setFiltroOrigem] = useState<OrigemFilter>('Todos')

  const fetchVendas = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('vendas').select('*').order('data', { ascending: false })

    if (filtroDataInicio) {
      query = query.gte('data', `${filtroDataInicio}T00:00:00`)
    }
    if (filtroDataFim) {
      query = query.lte('data', `${filtroDataFim}T23:59:59`)
    }
    if (filtroCliente) {
      query = query.ilike('cliente_nome', `%${filtroCliente}%`)
    }
    if (filtroComanda) {
      query = query.ilike('id_comanda', `%${filtroComanda}%`)
    }
    if (filtroOrigem !== 'Todos') {
      query = query.eq('tipo_estoque', filtroOrigem)
    }

    const { data, error } = await query.limit(500)
    if (error) {
      toast.error('Erro ao carregar histórico')
    } else {
      setVendas(data || [])
    }
    setLoading(false)
  }, [filtroDataInicio, filtroDataFim, filtroCliente, filtroComanda, filtroOrigem])

  useEffect(() => {
    fetchVendas()
  }, [fetchVendas])

  const totalReceita = vendas.reduce((sum, v) => sum + (v.total_liquido || 0), 0)
  const totalItens = vendas.reduce((sum, v) => sum + (v.qtd || 0), 0)
  const totalLucro = vendas.reduce((sum, v) => sum + (v.lucro_item || 0), 0)
  const comandasUnicas = new Set(vendas.map((v) => v.id_comanda)).size

  const exportPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'landscape' })

      doc.setFontSize(16)
      doc.setTextColor(21, 128, 61)
      doc.text('Livraria Limão e Mel - Histórico de Vendas', 14, 15)

      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22)
      doc.text(
        `Total: ${formatCurrency(totalReceita)} | ${vendas.length} registros | ${comandasUnicas} comandas`,
        14,
        28
      )

      autoTable(doc, {
        startY: 33,
        head: [['Data', 'Comanda', 'Cliente', 'Produto', 'Tipo', 'Qtd', 'Preço', 'Desc %', 'Total', 'Pagamento']],
        body: vendas.map((v) => [
          formatDateTime(v.data),
          v.id_comanda,
          v.cliente_nome || '—',
          v.item_nome,
          v.tipo_estoque,
          v.qtd,
          formatCurrency(v.preco_venda),
          `${v.desconto}%`,
          formatCurrency(v.total_liquido),
          v.pagamento,
        ]),
        headStyles: { fillColor: [21, 128, 61], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 7.5 },
        alternateRowStyles: { fillColor: [248, 250, 248] },
      })

      doc.save(`historico-vendas-${getTodayString()}.pdf`)
      toast.success('PDF exportado com sucesso!')
    } catch {
      toast.error('Erro ao exportar PDF')
    }
  }

  const clearFilters = () => {
    setFiltroDataInicio('')
    setFiltroDataFim(getTodayString())
    setFiltroCliente('')
    setFiltroComanda('')
    setFiltroOrigem('Todos')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Histórico de Vendas</h1>
          <p className="text-gray-500 text-sm mt-1">{vendas.length} registros encontrados</p>
        </div>
        <button
          onClick={exportPDF}
          disabled={vendas.length === 0}
          className="flex items-center gap-2 bg-forest-700 hover:bg-forest-800 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar PDF
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="kpi-card">
          <p className="text-xs text-gray-500 font-medium">Receita Total</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(totalReceita)}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-gray-500 font-medium">Comandas</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{comandasUnicas}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-gray-500 font-medium">Itens Vendidos</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{totalItens}</p>
        </div>
        <div className="kpi-card">
          <p className="text-xs text-gray-500 font-medium">Lucro Bruto</p>
          <p className="text-lg font-bold text-forest-700 mt-1">{formatCurrency(totalLucro)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Filtros</h3>
          <button
            onClick={clearFilters}
            className="ml-auto text-xs text-gray-400 hover:text-gray-600"
          >
            Limpar filtros
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data Início</label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data Fim</label>
            <input
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cliente</label>
            <input
              type="text"
              placeholder="Nome do cliente"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Comanda</label>
            <input
              type="text"
              placeholder="ID comanda"
              value={filtroComanda}
              onChange={(e) => setFiltroComanda(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Origem</label>
            <select
              value={filtroOrigem}
              onChange={(e) => setFiltroOrigem(e.target.value as OrigemFilter)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-lemon-400"
            >
              <option value="Todos">Todos</option>
              <option value="Próprio">Próprio</option>
              <option value="Consignado">Consignado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-forest-700 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">Carregando...</p>
          </div>
        ) : vendas.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma venda encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Comanda</th>
                  <th>Cliente</th>
                  <th>Produto</th>
                  <th>Tipo</th>
                  <th className="text-center">Qtd</th>
                  <th className="text-right">Preço</th>
                  <th className="text-center">Desc%</th>
                  <th className="text-right">Total</th>
                  <th>Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {vendas.map((venda) => (
                  <tr key={venda.id}>
                    <td className="text-xs text-gray-500">{formatDateTime(venda.data)}</td>
                    <td>
                      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                        {venda.id_comanda}
                      </span>
                    </td>
                    <td className="text-sm">{venda.cliente_nome || <span className="text-gray-300">—</span>}</td>
                    <td className="max-w-[200px]">
                      <p className="text-sm truncate" title={venda.item_nome}>{venda.item_nome}</p>
                    </td>
                    <td>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          venda.tipo_estoque === 'Próprio'
                            ? 'bg-forest-100 text-forest-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {venda.tipo_estoque}
                      </span>
                    </td>
                    <td className="text-center text-sm">{venda.qtd}</td>
                    <td className="text-right text-sm">{formatCurrency(venda.preco_venda)}</td>
                    <td className="text-center text-sm text-gray-500">
                      {venda.desconto > 0 ? `${venda.desconto}%` : '—'}
                    </td>
                    <td className="text-right font-semibold text-forest-700">
                      {formatCurrency(venda.total_liquido)}
                    </td>
                    <td>
                      <span className="text-xs text-gray-600">{venda.pagamento}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
