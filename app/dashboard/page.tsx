import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { SalesChart } from '@/components/dashboard/SalesChart'
import { StockPieChart } from '@/components/dashboard/StockPieChart'
import {
  TrendingUp,
  ShoppingBag,
  Package,
  Layers,
  DollarSign,
} from 'lucide-react'
import { format, subDays, startOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'

interface KPICardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  color: string
}

function KPICard({ title, value, subtitle, icon, color }: KPICardProps) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get today date
  const today = format(new Date(), 'yyyy-MM-dd')
  const todayStart = `${today}T00:00:00`
  const todayEnd = `${today}T23:59:59`

  // Fetch KPI data in parallel
  const [vendasResult, estoqueResult, vendasHojeResult] = await Promise.all([
    supabase.from('vendas').select('total_liquido, data'),
    supabase.from('estoque').select('quantidade, qtd_consignado, preco_custo, preco_venda'),
    supabase
      .from('vendas')
      .select('total_liquido')
      .gte('data', todayStart)
      .lte('data', todayEnd),
  ])

  const vendas = vendasResult.data || []
  const estoque = estoqueResult.data || []
  const vendasHoje = vendasHojeResult.data || []

  // Calculate KPIs
  const totalRevenue = vendas.reduce((sum, v) => sum + (v.total_liquido || 0), 0)
  const todaySales = vendasHoje.reduce((sum, v) => sum + (v.total_liquido || 0), 0)
  const totalStock = estoque.reduce((sum, e) => sum + (e.quantidade || 0), 0)
  const consignedValue = estoque.reduce(
    (sum, e) => sum + (e.qtd_consignado || 0) * (e.preco_venda || 0),
    0
  )
  const totalItems = estoque.length

  // Sales chart data - last 30 days
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i)
    return format(date, 'yyyy-MM-dd')
  })

  const salesByDay: Record<string, { total: number; count: number }> = {}
  last30Days.forEach((d) => {
    salesByDay[d] = { total: 0, count: 0 }
  })

  vendas.forEach((v) => {
    const day = v.data?.substring(0, 10)
    if (day && salesByDay[day] !== undefined) {
      salesByDay[day].total += v.total_liquido || 0
      salesByDay[day].count += 1
    }
  })

  const salesChartData = last30Days.map((date) => ({
    date,
    total: salesByDay[date]?.total || 0,
    count: salesByDay[date]?.count || 0,
  }))

  // Stock pie data
  const ownStock = estoque.reduce((sum, e) => sum + (e.quantidade || 0), 0)
  const consignedStock = estoque.reduce((sum, e) => sum + (e.qtd_consignado || 0), 0)

  const stockPieData = [
    { name: 'Estoque Próprio', value: ownStock, color: '#15803d' },
    { name: 'Consignado', value: consignedStock, color: '#f59e0b' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Visão geral do negócio</p>
        </div>
        <div className="text-sm text-gray-500 bg-white border border-gray-100 px-3 py-2 rounded-lg">
          {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: undefined })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Receita Total"
          value={formatCurrency(totalRevenue)}
          subtitle="Todas as vendas"
          icon={<TrendingUp className="w-5 h-5 text-white" />}
          color="bg-forest-700"
        />
        <KPICard
          title="Vendas de Hoje"
          value={formatCurrency(todaySales)}
          subtitle={format(new Date(), 'dd/MM/yyyy')}
          icon={<ShoppingBag className="w-5 h-5 text-white" />}
          color="bg-lemon-500"
        />
        <KPICard
          title="Itens em Estoque"
          value={formatNumber(totalStock)}
          subtitle={`${totalItems} títulos cadastrados`}
          icon={<Package className="w-5 h-5 text-white" />}
          color="bg-forest-600"
        />
        <KPICard
          title="Valor Consignado"
          value={formatCurrency(consignedValue)}
          subtitle={`${formatNumber(consignedStock)} unidades`}
          icon={<Layers className="w-5 h-5 text-white" />}
          color="bg-amber-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-forest-700" />
            <h2 className="text-base font-semibold text-gray-900">Evolução de Vendas</h2>
            <span className="ml-auto text-xs text-gray-400">últimos 30 dias</span>
          </div>
          <SalesChart data={salesChartData} />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-forest-700" />
            <h2 className="text-base font-semibold text-gray-900">Composição do Estoque</h2>
          </div>
          <StockPieChart data={stockPieData} />
          <div className="mt-4 space-y-2">
            {stockPieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-medium text-gray-900">{formatNumber(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-forest-700" />
            <h3 className="text-sm font-semibold text-gray-700">Ticket Médio</h3>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {vendas.length > 0
              ? formatCurrency(totalRevenue / vendas.length)
              : formatCurrency(0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">por venda</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag className="w-4 h-4 text-lemon-500" />
            <h3 className="text-sm font-semibold text-gray-700">Total de Vendas</h3>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatNumber(vendas.length)}</p>
          <p className="text-xs text-gray-400 mt-1">transações registradas</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-700">Valor do Estoque Próprio</h3>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(
              estoque.reduce((sum, e) => sum + (e.quantidade || 0) * (e.preco_venda || 0), 0)
            )}
          </p>
          <p className="text-xs text-gray-400 mt-1">a preço de venda</p>
        </div>
      </div>
    </div>
  )
}
