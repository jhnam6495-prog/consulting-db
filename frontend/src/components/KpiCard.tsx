interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  color?: 'blue' | 'green' | 'yellow' | 'gray'
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  green: 'bg-green-50 text-green-700 border-green-100',
  yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  gray: 'bg-gray-50 text-gray-700 border-gray-100',
}

export default function KpiCard({ label, value, sub, color = 'blue' }: KpiCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs opacity-60">{sub}</p>}
    </div>
  )
}
