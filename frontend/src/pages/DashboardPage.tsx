import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { dashboardApi, type RevenueTrend, type ByService } from '../api/dashboard'
import { performanceApi } from '../api/performance'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import type { DashboardSummary, Performance } from '../types/database'

function formatWon(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`
  return `${n.toLocaleString()}`
}
function formatWonFull(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만원`
  return `${n.toLocaleString()}원`
}

const PIE_COLORS = ['#2563eb', '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b']

const KPI_CONFIG = [
  {
    key: 'totalRevenue' as const,
    label: '승인 완료 매출',
    format: (v: number) => formatWonFull(v),
    color: 'blue',
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
      </svg>
    ),
  },
  {
    key: 'totalCount' as const,
    label: '전체 실적 건수',
    format: (v: number) => `${v}건`,
    color: 'indigo',
    icon: (
      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
  {
    key: 'pendingCount' as const,
    label: '승인 대기',
    format: (v: number) => `${v}건`,
    color: 'amber',
    icon: (
      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'approvalRate' as const,
    label: '승인률',
    format: (v: number) => `${v}%`,
    color: 'emerald',
    icon: (
      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
]

const colorClass: Record<string, { bg: string; iconBg: string; border: string }> = {
  blue:    { bg: 'bg-white', iconBg: 'bg-blue-50',    border: 'border-blue-100' },
  indigo:  { bg: 'bg-white', iconBg: 'bg-indigo-50',  border: 'border-indigo-100' },
  amber:   { bg: 'bg-white', iconBg: 'bg-amber-50',   border: 'border-amber-100' },
  emerald: { bg: 'bg-white', iconBg: 'bg-emerald-50', border: 'border-emerald-100' },
}

function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-bold text-gray-900">{formatWonFull(payload[0].value)}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [recent, setRecent] = useState<Performance[]>([])
  const [trend, setTrend] = useState<RevenueTrend[]>([])
  const [byService, setByService] = useState<ByService[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      dashboardApi.summary(),
      performanceApi.list(),
      dashboardApi.revenueTrend(),
      dashboardApi.byService(),
    ]).then(([s, list, t, bs]) => {
      setSummary(s)
      setRecent(list.slice(0, 6))
      setTrend(t)
      setByService(bs)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const approvedCount = summary?.approvedCount ?? 0
  const totalCount = summary?.totalCount ?? 0

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">

      {/* KPI 카드 4개 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CONFIG.map(cfg => {
          const val = summary ? summary[cfg.key] : 0
          const c = colorClass[cfg.color]
          return (
            <div key={cfg.key} className={`${c.bg} rounded-2xl border ${c.border} p-5 shadow-sm`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">{cfg.label}</span>
                <div className={`${c.iconBg} rounded-xl p-2`}>{cfg.icon}</div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{cfg.format(val)}</p>
            </div>
          )
        })}
      </div>

      {/* 차트 2개 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 월별 매출 추이 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900">월별 승인 매출 추이</h3>
              <p className="text-xs text-gray-400 mt-0.5">승인 완료된 실적 기준</p>
            </div>
          </div>
          {trend.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">데이터가 없습니다</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trend} barSize={28} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${formatWon(v)}`} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 서비스 유형별 비율 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="mb-5">
            <h3 className="font-semibold text-gray-900">서비스 유형별</h3>
            <p className="text-xs text-gray-400 mt-0.5">승인 완료 기준</p>
          </div>
          {byService.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-300 text-sm">데이터가 없습니다</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={byService} dataKey="revenue" nameKey="service_type"
                    cx="50%" cy="50%" innerRadius={45} outerRadius={72} strokeWidth={2}>
                    {byService.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => formatWonFull(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-3 space-y-1.5">
                {byService.map((item, i) => (
                  <li key={item.service_type} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-gray-600">{item.service_type}</span>
                    </span>
                    <span className="font-medium text-gray-800">{item.count}건</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* 진행 현황 + 최근 실적 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 실적 진행 현황 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-5">실적 진행 현황</h3>
          <div className="space-y-4">
            {[
              { label: '승인 완료', count: approvedCount, total: totalCount, color: 'bg-emerald-500' },
              { label: '승인 대기', count: summary?.pendingCount ?? 0, total: totalCount, color: 'bg-amber-400' },
              { label: '임시저장', count: totalCount - approvedCount - (summary?.pendingCount ?? 0), total: totalCount, color: 'bg-gray-300' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-600 font-medium">{item.label}</span>
                  <span className="text-gray-400">{item.count}건 / {item.total}건</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all`}
                    style={{ width: item.total > 0 ? `${(item.count / item.total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">전체 승인률</p>
            <p className="text-3xl font-bold text-gray-900">{summary?.approvalRate ?? 0}%</p>
          </div>
        </div>

        {/* 최근 실적 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">최근 실적</h3>
            <Link to="/performance" className="text-xs text-blue-600 font-medium hover:underline">전체 보기 →</Link>
          </div>
          {recent.length === 0 ? (
            <div className="py-16 text-center text-gray-300 text-sm">등록된 실적이 없습니다.</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {recent.map(p => (
                <li key={p.id} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-blue-600">
                        {(p.client?.name ?? '?').slice(0, 2)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.client?.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.service_type} · {p.user?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-gray-800">{formatWonFull(p.revenue)}</span>
                    <StatusBadge status={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 빠른 실행 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/performance/new', label: '실적 등록', sub: '새 실적 추가', icon: '📝', bg: 'bg-blue-600 text-white', sub_color: 'text-blue-200' },
          { to: '/approval', label: '승인 처리', sub: `대기 ${summary?.pendingCount ?? 0}건`, icon: '✅', bg: 'bg-white border border-gray-200 text-gray-800', sub_color: 'text-gray-400' },
          { to: '/performance', label: '실적 목록', sub: `전체 ${summary?.totalCount ?? 0}건`, icon: '📋', bg: 'bg-white border border-gray-200 text-gray-800', sub_color: 'text-gray-400' },
          { to: '/performance', label: '매출 현황', sub: formatWonFull(summary?.totalRevenue ?? 0), icon: '💰', bg: 'bg-white border border-gray-200 text-gray-800', sub_color: 'text-gray-400' },
        ].map(item => (
          <Link key={item.to + item.label} to={item.to}
            className={`${item.bg} rounded-2xl p-4 shadow-sm hover:shadow-md transition-all`}>
            <div className="text-2xl mb-2">{item.icon}</div>
            <p className="font-semibold text-sm">{item.label}</p>
            <p className={`text-xs mt-0.5 ${item.sub_color}`}>{item.sub}</p>
          </Link>
        ))}
      </div>

    </div>
  )
}
