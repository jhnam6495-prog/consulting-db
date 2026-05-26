import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts'
import { dashboardApi, type ExtendedSummary, type RevenueTrend, type ByService, type ByUser, type ByClient } from '../api/dashboard'
import { auditsApi, type AuditTrend, type AuditByType, type AuditByUser, type AuditByClient } from '../api/audits'
import type { AuditStatsSummary } from '../types/database'
import LoadingSpinner from '../components/LoadingSpinner'

// ── 유틸 ──────────────────────────────────────────────────────────
function formatWon(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
  if (n >= 10_000)      return `${(n / 10_000).toFixed(0)}만원`
  return `${n.toLocaleString()}원`
}
function formatWonShort(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000)      return `${(n / 10_000).toFixed(0)}만`
  return `${n.toLocaleString()}`
}

// ── 기간 프리셋 ────────────────────────────────────────────────────
const PRESETS = [
  { label: '이번 달',    getValue: () => { const n = new Date(); return { from: `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`, to: new Date().toISOString().slice(0,10) } } },
  { label: '최근 3개월', getValue: () => { const n = new Date(); n.setMonth(n.getMonth()-3); return { from: n.toISOString().slice(0,10), to: new Date().toISOString().slice(0,10) } } },
  { label: '올해',       getValue: () => ({ from: `${new Date().getFullYear()}-01-01`, to: new Date().toISOString().slice(0,10) }) },
  { label: '전체',       getValue: () => ({ from: '', to: '' }) },
]

const PIE_COLORS = ['#2563eb','#0ea5e9','#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#f43f5e','#64748b','#84cc16']

// ── 공통 컴포넌트 ─────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-4 py-3 text-sm">
      <p className="text-gray-500 mb-1">{label}</p>
      <p className="font-bold text-gray-900">{formatWon(payload[0].value)}</p>
    </div>
  )
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-5">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

function Empty() {
  return <div className="flex items-center justify-center h-40 text-gray-300 text-sm">데이터가 없습니다.</div>
}

// ── 목표 달성률 ───────────────────────────────────────────────────
function GoalSection({ actual }: { actual: number }) {
  const [goal, setGoal]       = useState(500_000_000)
  const [editing, setEditing] = useState(false)
  const [input, setInput]     = useState('')

  const rate     = goal > 0 ? Math.min((actual / goal) * 100, 100) : 0
  const remaining = Math.max(goal - actual, 0)
  const exceeded  = actual > goal

  const saveGoal = () => {
    const v = Number(input.replace(/,/g, ''))
    if (v > 0) setGoal(v)
    setEditing(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-gray-900">목표 대비 달성률</h3>
          <p className="text-xs text-gray-400 mt-0.5">승인 완료 매출 기준</p>
        </div>
        <button onClick={() => { setInput(String(goal)); setEditing(true) }}
          className="text-xs text-blue-600 font-medium hover:underline">목표 설정</button>
      </div>
      {editing && (
        <div className="flex gap-2 mb-4">
          <input type="number" value={input} onChange={e => setInput(e.target.value)}
            placeholder="목표 금액 (원)" autoFocus
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={saveGoal}
            className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">저장</button>
        </div>
      )}
      <div className="flex flex-col items-center my-4">
        <div className="relative w-36 h-36">
          <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="12"/>
            <circle cx="60" cy="60" r="50" fill="none"
              stroke={rate >= 100 ? '#10b981' : rate >= 70 ? '#2563eb' : rate >= 40 ? '#f59e0b' : '#f87171'}
              strokeWidth="12"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - rate / 100)}`}
              strokeLinecap="round" className="transition-all duration-700" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">{Math.round(rate)}%</span>
            <span className="text-xs text-gray-400 mt-0.5">달성</span>
          </div>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">목표</span><span className="font-semibold text-gray-800">{formatWon(goal)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">달성</span><span className="font-semibold text-blue-700">{formatWon(actual)}</span></div>
        <div className="flex justify-between border-t border-gray-50 pt-2">
          <span className="text-gray-500">{exceeded ? '초과' : '잔여'}</span>
          <span className={`font-bold ${exceeded ? 'text-emerald-600' : 'text-red-500'}`}>
            {exceeded ? '+' : '-'}{formatWon(remaining || actual - goal)}
          </span>
        </div>
      </div>
      <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${rate >= 100 ? 'bg-emerald-500' : rate >= 70 ? 'bg-blue-500' : rate >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
          style={{ width: `${rate}%` }} />
      </div>
    </div>
  )
}

// ── 기간 필터 ─────────────────────────────────────────────────────
function PeriodFilter({ preset, from, to, onPreset, onFrom, onTo }: {
  preset: number; from: string; to: string
  onPreset: (i: number) => void
  onFrom: (v: string) => void
  onTo: (v: string) => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700 shrink-0">기간 선택</span>
        <div className="flex gap-1.5 flex-wrap">
          {PRESETS.map((p, i) => (
            <button key={p.label} onClick={() => onPreset(i)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-all min-h-[40px] ${
                preset === i ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                             : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}>{p.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <input type="date" value={from} onChange={e => onFrom(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px]" />
          <span className="text-gray-400 text-sm">~</span>
          <input type="date" value={to} onChange={e => onTo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px]" />
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// 메인 페이지
// ════════════════════════════════════════════════════════════════════
type TabKey = 'consulting' | 'audit' | 'combined'

export default function AnalyticsPage() {
  const [tab, setTab]       = useState<TabKey>('consulting')
  const [preset, setPreset] = useState(3)
  const [from, setFrom]     = useState('')
  const [to, setTo]         = useState('')
  const [loading, setLoading] = useState(true)

  // 컨설팅 데이터
  const [summary,   setSummary]   = useState<ExtendedSummary | null>(null)
  const [trend,     setTrend]     = useState<RevenueTrend[]>([])
  const [byService, setByService] = useState<ByService[]>([])
  const [byUser,    setByUser]    = useState<ByUser[]>([])
  const [byClient,  setByClient]  = useState<ByClient[]>([])

  // 심사 데이터
  const [auditStats,    setAuditStats]    = useState<AuditStatsSummary | null>(null)
  const [auditTrend,    setAuditTrend]    = useState<AuditTrend[]>([])
  const [auditByType,   setAuditByType]   = useState<AuditByType[]>([])
  const [auditByUser,   setAuditByUser]   = useState<AuditByUser[]>([])
  const [auditByClient, setAuditByClient] = useState<AuditByClient[]>([])

  const load = useCallback(() => {
    setLoading(true)
    const f = from || undefined
    const t = to   || undefined
    Promise.all([
      dashboardApi.summary(f, t),
      dashboardApi.revenueTrend(f, t),
      dashboardApi.byService(f, t),
      dashboardApi.byUser(f, t),
      dashboardApi.byClient(f, t),
      auditsApi.stats(f, t),
      auditsApi.trend(f, t),
      auditsApi.byType(f, t),
      auditsApi.byUser(f, t),
      auditsApi.byClient(f, t),
    ]).then(([s, tr, bs, bu, bc, as_, at, abt, abu, abc]) => {
      setSummary(s); setTrend(tr); setByService(bs); setByUser(bu); setByClient(bc)
      setAuditStats(as_); setAuditTrend(at); setAuditByType(abt); setAuditByUser(abu); setAuditByClient(abc)
    }).finally(() => setLoading(false))
  }, [from, to])

  useEffect(() => { load() }, [load])

  const applyPreset = (idx: number) => {
    setPreset(idx)
    const { from: f, to: t } = PRESETS[idx].getValue()
    setFrom(f); setTo(t)
  }

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'consulting', label: '컨설팅 실적' },
    { key: 'audit',      label: '심사 실적' },
    { key: 'combined',   label: '통합' },
  ]

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-5">

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1.5">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 기간 필터 */}
      <PeriodFilter
        preset={preset} from={from} to={to}
        onPreset={applyPreset}
        onFrom={v => { setFrom(v); setPreset(-1) }}
        onTo={v => { setTo(v); setPreset(-1) }}
      />

      {loading ? <LoadingSpinner /> : (
        <>
          {tab === 'consulting' && <ConsultingTab summary={summary} trend={trend} byService={byService} byUser={byUser} byClient={byClient} />}
          {tab === 'audit'      && <AuditTab stats={auditStats} trend={auditTrend} byType={auditByType} byUser={auditByUser} byClient={auditByClient} />}
          {tab === 'combined'   && <CombinedTab summary={summary} auditStats={auditStats} byUser={byUser} auditByUser={auditByUser} />}
        </>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// 컨설팅 탭
// ════════════════════════════════════════════════════════════════════
function ConsultingTab({ summary, trend, byService, byUser, byClient }: {
  summary: ExtendedSummary | null
  trend: RevenueTrend[]; byService: ByService[]; byUser: ByUser[]; byClient: ByClient[]
}) {
  const totalRevenue   = summary?.totalRevenue ?? 0
  const maxUserRevenue = byUser[0]?.revenue ?? 1

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: '승인 매출',  value: formatWon(summary?.totalRevenue ?? 0),  color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-100' },
          { label: '전체 건수',  value: `${summary?.totalCount ?? 0}건`,          color: 'text-gray-800',    bg: 'bg-gray-50 border-gray-100' },
          { label: '승인 완료',  value: `${summary?.approvedCount ?? 0}건`,       color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
          { label: '승인 대기',  value: `${summary?.pendingCount ?? 0}건`,        color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-100' },
          { label: '승인률',     value: `${summary?.approvalRate ?? 0}%`,         color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-100' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.bg}`}>
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* 추이 + 파이 + 목표 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Section title="월별 승인 매출 추이" sub="승인 완료 기준">
          {trend.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend} margin={{ top:4, right:4, left:-10, bottom:0 }}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="month" tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => formatWonShort(v)}/>
                <Tooltip content={<ChartTooltip />}/>
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5}
                  fill="url(#blueGrad)" dot={{ fill:'#2563eb', r:3 }} activeDot={{ r:5 }}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="서비스 유형별 매출" sub="승인 완료 기준">
          {byService.length === 0 ? <Empty /> : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={byService} dataKey="revenue" nameKey="service_type" cx="50%" cy="50%" innerRadius={50} outerRadius={78} strokeWidth={2}>
                    {byService.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => formatWon(Number(v))}/>
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-3 space-y-2">
                {byService.map((item, i) => (
                  <li key={item.service_type} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                      <span className="text-gray-600">{item.service_type}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-gray-400">{item.count}건</span>
                      <span className="font-semibold text-gray-800 w-20 text-right">{formatWon(item.revenue)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>

        <GoalSection actual={totalRevenue} />
      </div>

      {/* 담당자 + 고객사 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Section title="담당자별 실적" sub="승인 완료 매출 기준">
          {byUser.length === 0 ? <Empty /> : (
            <div className="space-y-3">
              {byUser.map((u, i) => (
                <div key={u.user_id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{i + 1}</span>
                      <span className="text-sm font-medium text-gray-800">{u.name}</span>
                      <span className="text-xs text-gray-400">{u.count}건</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{formatWon(u.revenue)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${(u.revenue / maxUserRevenue) * 100}%` }}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="고객사별 실적" sub="승인 완료 매출 기준">
          {byClient.length === 0 ? <Empty /> : (
            <>
              <ResponsiveContainer width="100%" height={byClient.length * 52 + 20}>
                <BarChart layout="vertical" data={byClient} margin={{ top:0, right:60, left:0, bottom:0 }} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                  <XAxis type="number" tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => formatWonShort(v)}/>
                  <YAxis type="category" dataKey="name" tick={{ fontSize:12, fill:'#374151' }} axisLine={false} tickLine={false} width={70}/>
                  <Tooltip content={<ChartTooltip />} cursor={{ fill:'#f8fafc' }}/>
                  <Bar dataKey="revenue" radius={[0,6,6,0]}>
                    {byClient.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ul className="mt-4 space-y-2 border-t border-gray-50 pt-4">
                {byClient.map((c, i) => (
                  <li key={c.client_id} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                      <span className="text-gray-700 font-medium">{c.name}</span>
                      {c.industry && <span className="text-gray-400">{c.industry}</span>}
                    </span>
                    <span className="font-semibold text-gray-800">{c.count}건 · {formatWon(c.revenue)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// 심사 탭
// ════════════════════════════════════════════════════════════════════
function AuditTab({ stats, trend, byType, byUser, byClient }: {
  stats: AuditStatsSummary | null
  trend: AuditTrend[]; byType: AuditByType[]; byUser: AuditByUser[]; byClient: AuditByClient[]
}) {
  const maxUserCount = byUser[0]?.count ?? 1

  return (
    <div className="space-y-5">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: '전체 건수',  value: `${stats?.total ?? 0}건`,       color: 'text-gray-800',    bg: 'bg-gray-50 border-gray-100' },
          { label: '완료',       value: `${stats?.completed ?? 0}건`,   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
          { label: '진행중',     value: `${stats?.inProgress ?? 0}건`,  color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-100' },
          { label: '예정',       value: `${stats?.planned ?? 0}건`,     color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-100' },
          { label: '합격률',     value: `${stats?.passRate ?? 0}%`,     color: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-100' },
          { label: '총 매출',    value: formatWon(stats?.totalRevenue ?? 0), color: 'text-violet-700', bg: 'bg-violet-50 border-violet-100' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.bg}`}>
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* 추이 + 유형별 파이 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Section title="월별 심사 건수 및 매출 추이" sub="예정일 기준">
          {trend.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend} margin={{ top:4, right:4, left:-10, bottom:0 }}>
                <defs>
                  <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="month" tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:11, fill:'#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => formatWonShort(v)}/>
                <Tooltip content={<ChartTooltip />}/>
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5}
                  fill="url(#indigoGrad)" dot={{ fill:'#6366f1', r:3 }} activeDot={{ r:5 }}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Section>

        <Section title="심사 유형별 현황" sub="전체 건수 기준">
          {byType.length === 0 ? <Empty /> : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={byType} dataKey="count" nameKey="audit_type" cx="50%" cy="50%" innerRadius={50} outerRadius={78} strokeWidth={2}>
                    {byType.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => `${v}건`}/>
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-3 space-y-2">
                {byType.map((item, i) => (
                  <li key={item.audit_type} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                      <span className="text-gray-600 truncate">{item.audit_type}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-gray-400">{item.count}건</span>
                      {item.completed > 0 && (
                        <span className={`font-medium ${item.passRate >= 80 ? 'text-emerald-600' : item.passRate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                          합격률 {item.passRate}%
                        </span>
                      )}
                      <span className="font-semibold text-gray-800 w-20 text-right">{formatWon(item.revenue)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>
      </div>

      {/* 담당자 + 고객사 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Section title="담당자별 심사 실적" sub="전체 건수 기준">
          {byUser.length === 0 ? <Empty /> : (
            <div className="space-y-3">
              {byUser.map((u, i) => (
                <div key={u.user_id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{i + 1}</span>
                      <span className="text-sm font-medium text-gray-800">{u.name}</span>
                      <span className="text-xs text-gray-400">{u.count}건</span>
                      {u.completed > 0 && (
                        <span className={`text-xs font-medium ${u.passRate >= 80 ? 'text-emerald-600' : u.passRate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                          합격률 {u.passRate}%
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-gray-900">{formatWon(u.revenue)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${(u.count / maxUserCount) * 100}%` }}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="고객사별 심사 실적" sub="전체 매출 기준">
          {byClient.length === 0 ? <Empty /> : (
            <>
              <ResponsiveContainer width="100%" height={byClient.length * 52 + 20}>
                <BarChart layout="vertical" data={byClient} margin={{ top:0, right:60, left:0, bottom:0 }} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                  <XAxis type="number" tick={{ fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => formatWonShort(v)}/>
                  <YAxis type="category" dataKey="name" tick={{ fontSize:12, fill:'#374151' }} axisLine={false} tickLine={false} width={70}/>
                  <Tooltip content={<ChartTooltip />} cursor={{ fill:'#f8fafc' }}/>
                  <Bar dataKey="revenue" radius={[0,6,6,0]}>
                    {byClient.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ul className="mt-4 space-y-2 border-t border-gray-50 pt-4">
                {byClient.map((c, i) => (
                  <li key={c.client_id} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                      <span className="text-gray-700 font-medium">{c.name}</span>
                    </span>
                    <span className="font-semibold text-gray-800">{c.count}건 · {formatWon(c.revenue)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// 통합 탭
// ════════════════════════════════════════════════════════════════════
function CombinedTab({ summary, auditStats, byUser, auditByUser }: {
  summary: ExtendedSummary | null
  auditStats: AuditStatsSummary | null
  byUser: ByUser[]
  auditByUser: AuditByUser[]
}) {
  const consultingRevenue = summary?.totalRevenue ?? 0
  const auditRevenue      = auditStats?.totalRevenue ?? 0
  const totalRevenue      = consultingRevenue + auditRevenue

  const consultingCount   = summary?.totalCount ?? 0
  const auditCount        = auditStats?.total ?? 0

  // 담당자별 통합 매출 집계
  const userMap: Record<string, { name: string; consulting: number; audit: number }> = {}
  for (const u of byUser) {
    if (!userMap[u.user_id]) userMap[u.user_id] = { name: u.name, consulting: 0, audit: 0 }
    userMap[u.user_id].consulting += u.revenue
  }
  for (const u of auditByUser) {
    if (!userMap[u.user_id]) userMap[u.user_id] = { name: u.name, consulting: 0, audit: 0 }
    userMap[u.user_id].audit += u.revenue
  }
  const combinedUsers = Object.entries(userMap)
    .map(([id, v]) => ({ id, ...v, total: v.consulting + v.audit }))
    .sort((a, b) => b.total - a.total)
  const maxTotal = combinedUsers[0]?.total ?? 1

  const pieData = [
    { name: '컨설팅 실적', value: consultingRevenue },
    { name: '심사 실적',   value: auditRevenue },
  ]
  const COMBINED_COLORS = ['#2563eb', '#6366f1']

  return (
    <div className="space-y-5">
      {/* 통합 KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">총 매출 (컨설팅 + 심사)</p>
          <p className="text-3xl font-bold text-gray-900">{formatWon(totalRevenue)}</p>
          <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"/>컨설팅 {formatWon(consultingRevenue)}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"/>심사 {formatWon(auditRevenue)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">총 건수 (컨설팅 + 심사)</p>
          <p className="text-3xl font-bold text-gray-900">{consultingCount + auditCount}건</p>
          <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"/>컨설팅 {consultingCount}건</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"/>심사 {auditCount}건</span>
          </div>
        </div>

        {/* 매출 비중 파이 */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-3">매출 비중</p>
          {totalRevenue === 0 ? <Empty /> : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={100} height={100}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={45} strokeWidth={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={COMBINED_COLORS[i]}/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-2 text-xs">
                {pieData.map((item, i) => (
                  <li key={item.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COMBINED_COLORS[i] }}/>
                    <span className="text-gray-600">{item.name}</span>
                    <span className="font-bold text-gray-900 ml-auto">
                      {totalRevenue > 0 ? Math.round((item.value / totalRevenue) * 100) : 0}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 매출 비교 바 */}
      <Section title="컨설팅 vs 심사 매출 비교" sub="전체 기간 기준">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium text-gray-700">컨설팅 실적</span>
              <span className="font-bold text-blue-700">{formatWon(consultingRevenue)}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-700"
                style={{ width: totalRevenue > 0 ? `${(consultingRevenue / totalRevenue) * 100}%` : '0%' }}/>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium text-gray-700">심사 실적</span>
              <span className="font-bold text-indigo-700">{formatWon(auditRevenue)}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                style={{ width: totalRevenue > 0 ? `${(auditRevenue / totalRevenue) * 100}%` : '0%' }}/>
            </div>
          </div>
        </div>
      </Section>

      {/* 담당자별 통합 랭킹 */}
      <Section title="담당자별 통합 실적" sub="컨설팅 + 심사 매출 합산">
        {combinedUsers.length === 0 ? <Empty /> : (
          <div className="space-y-4">
            {combinedUsers.map((u, i) => (
              <div key={u.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>{i + 1}</span>
                    <span className="text-sm font-medium text-gray-800">{u.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{formatWon(u.total)}</span>
                </div>
                {/* 스택 바 */}
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-blue-500 transition-all duration-700"
                    style={{ width: `${(u.consulting / maxTotal) * 100}%` }}/>
                  <div className="h-full bg-indigo-400 transition-all duration-700"
                    style={{ width: `${(u.audit / maxTotal) * 100}%` }}/>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"/>컨설팅 {formatWon(u.consulting)}</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400"/>심사 {formatWon(u.audit)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}
