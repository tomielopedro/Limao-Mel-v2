'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface StockPieChartProps {
  data: {
    name: string
    value: number
    color: string
  }[]
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean
  payload?: { name: string; value: number; payload: { color: string } }[]
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-700">{payload[0]?.name}</p>
        <p style={{ color: payload[0]?.payload?.color }} className="font-medium">
          {new Intl.NumberFormat('pt-BR').format(payload[0]?.value || 0)} unidades
        </p>
      </div>
    )
  }
  return null
}

const RADIAN = Math.PI / 180
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
}) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  if (percent < 0.05) return null

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function StockPieChart({ data }: StockPieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Sem dados de estoque
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={80}
          dataKey="value"
          labelLine={false}
          label={renderCustomizedLabel}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
}
