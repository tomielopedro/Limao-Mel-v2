'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface SalesChartProps {
  data: {
    date: string
    total: number
    count: number
  }[]
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number; name: string }[]
  label?: string
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-700 mb-1">
          {label
            ? format(parseISO(label), "dd 'de' MMM", { locale: ptBR })
            : ''}
        </p>
        <p className="text-forest-700">
          <span className="font-medium">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(payload[0]?.value || 0)}
          </span>
        </p>
        {payload[1] && (
          <p className="text-gray-500">
            {payload[1].value} {payload[1].value === 1 ? 'venda' : 'vendas'}
          </p>
        )}
      </div>
    )
  }
  return null
}

export function SalesChart({ data }: SalesChartProps) {
  const formatXAxis = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'dd/MM', { locale: ptBR })
    } catch {
      return dateStr
    }
  }

  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`
    }
    return `R$ ${value.toFixed(0)}`
  }

  // Show only every 5th label to avoid crowding
  const tickFormatter = (value: string, index: number) => {
    if (index % 5 === 0) return formatXAxis(value)
    return ''
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={tickFormatter}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={65}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#15803d"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, fill: '#15803d', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
