import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../api/dashboard'
import { auditsApi } from '../api/audits'
import { performanceApi } from '../api/performance'
import LoadingSpinner from '../components/LoadingSpinner'
import type { Performance, Audit, AuditStatsSummary } from '../types/database'
import type { ExtendedSummary } from '../api/dashboard'

function formatWon(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만원`
  return `${n.toLocaleString()}원`
}

function PerfStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: '승인완료', cls: 'bg-[#E1F5EE] text-[#0F6E56]' },
    pending:  { label: '승인대기', cls: 'bg-[#FAEEDA] text-[#854F0B]' },
    draft:    { label: '임시저장', cls: 'bg-[#F1EFE8] text-[#5F5E5A]' },
    rejected: { label: '반려',     cls: 'bg-red-100 text-red-700' },
  }
  const b = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.cls}`}>{b.label}</span>
}

function AuditStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    completed:   { label: '완료',   cls: 'bg-[#E1F5EE] text-[#0F6E56]' },
    in_progress: { label: '진행중', cls: 'bg-[#FAEEDA] text-[#854F0B]' },
    planned:     { label: '예정',   cls: 'bg-[#F1EFE8] text-[#5F5E5A]' },
    cancelled:   { label: '취소',   cls: 'bg-red-100 text-red-700' },
  }
  const b = map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-600' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.cls}`}>{b.label}</span>
}

interface ProgressItem { label: string; count: number; color: string }

function SegmentBar({ items }: { items: ProgressItem[] }) {
  const total = items.reduce((s, i) => s + i.count, 0)
  return (
    <div className="space-y-2.5">
      <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-gray-100">
        {total > 0 && items.map(item => (
          <div
            key={item.label}
            className={`${item.color} transition-all`}
            style={{ width: `${(item.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map(item => (
          <span key={item.label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
            {item.label}
            <span className="font-semibold text-gray-700">{item.count}건</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [ps,   setPs]   = useState<ExtendedSummary | null>(null)
  const [as_,  setAs]   = useState<AuditStatsSummary | null>(null)
  const [perf, setPerf] = useState<Performance[]>([])
  const [auds, setAuds] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      dashboardApi.summary(),
      auditsApi.stats(),
      performanceApi.list(),
      auditsApi.list(),
    ]).then(([perfSum, auditSum, perfList, auditList]) => {
      setPs(perfSum)
      setAs(auditSum)
      setPerf(perfList.slice(0, 3))
      setAuds(auditList.slice(0, 3))
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  // 통합 KPI 계산
  const combinedRevenue  = (ps?.totalRevenue ?? 0) + (as_?.completedRevenue ?? 0)
  const combinedTotal    = (ps?.totalCount ?? 0) + (as_?.total ?? 0)
  const combinedPending  = (ps?.pendingCount ?? 0) + (as_?.inProgress ?? 0)
  const combinedThisMonth = (ps?.thisMonthCount ?? 0) + (as_?.thisMonthCount ?? 0)

  // 컨설팅 진행현황
  const perfApproved = ps?.approvedCount ?? 0
  const perfPending  = ps?.pendingCount  ?? 0
  const perfTotal    = ps?.totalCount    ?? 0
  const perfDraft    = Math.max(0, perfTotal - perfApproved - perfPending - (ps?.rejectedCount ?? 0))

  // 심사 진행현황
  const auditCompleted   = as_?.completed   ?? 0
  const auditInProgress  = as_?.inProgress  ?? 0
  const auditPlanned     = as_?.planned     ?? 0
  const auditTotal       = as_?.total       ?? 0
  const completionRate   = auditTotal > 0 ? Math.round((auditCompleted / auditTotal) * 100) : 0

  const topKpi = [
    {
      label: '총 매출',
      value: formatWon(combinedRevenue),
      sub: `컨설팅 ${formatWon(ps?.totalRevenue ?? 0)} + 심사 ${formatWon(as_?.completedRevenue ?? 0)}`,
      bg: 'bg-[#EEEDFE]', text: 'text-[#3C3489]', icon: (
        <svg className="w-5 h-5 text-[#7F77DD]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
        </svg>
      ),
    },
    {
      label: '전체 실적 건수',
      value: `${combinedTotal}건`,
      sub: `컨설팅 ${ps?.totalCount ?? 0}건 · 심사 ${as_?.total ?? 0}건`,
      bg: 'bg-teal-50', text: 'text-teal-900', icon: (
        <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
        </svg>
      ),
    },
    {
      label: '처리 대기',
      value: `${combinedPending}건`,
      sub: `승인대기 ${ps?.pendingCount ?? 0}건 · 진행중 ${as_?.inProgress ?? 0}건`,
      bg: 'bg-amber-50', text: 'text-amber-900', icon: (
        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: '이번달 신규',
      value: `${combinedThisMonth}건`,
      sub: `컨설팅 ${ps?.thisMonthCount ?? 0}건 · 심사 ${as_?.thisMonthCount ?? 0}건`,
      bg: 'bg-[#E6F1FB]', text: 'text-[#0C447C]', icon: (
        <svg className="w-5 h-5 text-[#378ADD]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
  ]

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">

      {/* 통합 KPI 카드 4개 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {topKpi.map(k => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-5 shadow-sm`}>
            <div className="flex items-start justify-between mb-3">
              <span className={`text-sm font-medium ${k.text} opacity-70`}>{k.label}</span>
              <div className="bg-white/60 rounded-xl p-2">{k.icon}</div>
            </div>
            <p className={`text-2xl font-bold ${k.text} mb-1`}>{k.value}</p>
            <p className="text-xs text-gray-500">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* 구분선 */}
      <div className="border-t border-gray-100" />

      {/* 2컬럼 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 컨설팅 실적 섹션 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* 섹션 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#EEEDFE]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[#7F77DD] rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <h3 className="font-semibold text-[#3C3489]">컨설팅 실적</h3>
            </div>
            <span className="px-2.5 py-1 bg-[#7F77DD] text-white text-xs font-bold rounded-full">{perfTotal}건</span>
          </div>

          <div className="p-6 space-y-5">
            {/* 미니 KPI 3개 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#EEEDFE] rounded-xl p-3 text-center">
                <p className="text-xs text-[#7F77DD] font-medium mb-1">승인완료 매출</p>
                <p className="text-sm font-bold text-[#3C3489]">{formatWon(ps?.totalRevenue ?? 0)}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xs text-amber-600 font-medium mb-1">승인대기</p>
                <p className="text-sm font-bold text-amber-900">{perfPending}건</p>
              </div>
              <div className="bg-teal-50 rounded-xl p-3 text-center">
                <p className="text-xs text-teal-600 font-medium mb-1">승인률</p>
                <p className="text-sm font-bold text-teal-900">{ps?.approvalRate ?? 0}%</p>
              </div>
            </div>

            {/* 프로그레스바 */}
            <SegmentBar items={[
              { label: '승인완료', count: perfApproved, color: 'bg-[#7F77DD]' },
              { label: '승인대기', count: perfPending,  color: 'bg-amber-400' },
              { label: '임시저장', count: perfDraft,    color: 'bg-gray-300' },
            ]} />

            {/* 최근 3건 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">최근 실적</span>
                <Link to="/performance" className="text-xs text-[#7F77DD] font-medium hover:underline">전체 보기 →</Link>
              </div>
              {perf.length === 0 ? (
                <p className="text-center text-sm text-gray-300 py-6">등록된 실적이 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {perf.map(p => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-[#EEEDFE]/40 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 bg-[#EEEDFE] rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-[#7F77DD]">{(p.client?.name ?? '?').slice(0, 2)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{p.client?.name ?? '-'}</p>
                          <p className="text-xs text-gray-400 truncate">{p.service_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-gray-700">{formatWon(p.revenue)}</span>
                        <PerfStatusBadge status={p.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* 심사 실적 섹션 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* 섹션 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#E6F1FB]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-[#378ADD] rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="font-semibold text-[#0C447C]">심사 실적</h3>
            </div>
            <span className="px-2.5 py-1 bg-[#378ADD] text-white text-xs font-bold rounded-full">{auditTotal}건</span>
          </div>

          <div className="p-6 space-y-5">
            {/* 미니 KPI 3개 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#E6F1FB] rounded-xl p-3 text-center">
                <p className="text-xs text-[#378ADD] font-medium mb-1">완료 수수료</p>
                <p className="text-sm font-bold text-[#0C447C]">{formatWon(as_?.completedRevenue ?? 0)}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xs text-amber-600 font-medium mb-1">진행중</p>
                <p className="text-sm font-bold text-amber-900">{auditInProgress}건</p>
              </div>
              <div className="bg-teal-50 rounded-xl p-3 text-center">
                <p className="text-xs text-teal-600 font-medium mb-1">완료율</p>
                <p className="text-sm font-bold text-teal-900">{completionRate}%</p>
              </div>
            </div>

            {/* 프로그레스바 */}
            <SegmentBar items={[
              { label: '완료',   count: auditCompleted,  color: 'bg-[#378ADD]' },
              { label: '진행중', count: auditInProgress, color: 'bg-amber-400' },
              { label: '예정',   count: auditPlanned,    color: 'bg-gray-300' },
            ]} />

            {/* 최근 3건 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">최근 심사</span>
                <Link to="/audits" className="text-xs text-[#378ADD] font-medium hover:underline">전체 보기 →</Link>
              </div>
              {auds.length === 0 ? (
                <p className="text-center text-sm text-gray-300 py-6">등록된 심사가 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {auds.map(a => (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-[#E6F1FB]/50 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 bg-[#E6F1FB] rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-[#378ADD]">{(a.client?.name ?? a.audit_type).slice(0, 2)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{a.client?.name ?? '-'}</p>
                          <p className="text-xs text-gray-400 truncate">{a.audit_type}{a.audit_stage && a.audit_stage !== '해당없음' ? ` · ${a.audit_stage}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-gray-700">{formatWon(a.revenue)}</span>
                        <AuditStatusBadge status={a.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
