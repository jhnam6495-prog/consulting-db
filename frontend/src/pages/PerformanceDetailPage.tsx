import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { performanceApi } from '../api/performance'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import type { Performance } from '../types/database'

function formatWon(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만원`
  return `${n.toLocaleString()}원`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  )
}

export default function PerformanceDetailPage() {
  const { id } = useParams<{ id: string }>()
const [perf, setPerf] = useState<Performance | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    if (!id) return
    setLoading(true)
    performanceApi.get(id).then(setPerf).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleSubmit = async () => {
    if (!id) return
    setSubmitting(true)
    try {
      await performanceApi.submit(id)
      load()
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!perf) return (
    <div className="p-8 text-center text-gray-400">
      <p className="text-4xl mb-2">🔍</p>
      <p>실적을 찾을 수 없습니다.</p>
    </div>
  )

  const approvals = perf.approvals ?? []

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-4">

      {/* 상단 네비 */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/performance" className="hover:text-blue-600 transition-colors">실적 목록</Link>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-gray-600">실적 상세</span>
      </div>

      {/* 상태 헤더 카드 */}
      <div className={`rounded-2xl p-5 border ${
        perf.status === 'approved' ? 'bg-emerald-50 border-emerald-100' :
        perf.status === 'rejected' ? 'bg-red-50 border-red-100' :
        perf.status === 'pending'  ? 'bg-amber-50 border-amber-100' :
        'bg-gray-50 border-gray-100'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                <span className="text-sm font-bold text-blue-600">{(perf.client?.name ?? '?').slice(0, 2)}</span>
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">{perf.client?.name}</p>
                <p className="text-sm text-gray-500">{perf.service_type} · {perf.user?.name}</p>
              </div>
            </div>
          </div>
          <StatusBadge status={perf.status} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-white/70 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">매출</p>
            <p className="text-xl font-bold text-gray-900">{formatWon(perf.revenue)}</p>
          </div>
          <div className="bg-white/70 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">수행 기간</p>
            <p className="text-sm font-semibold text-gray-900">{perf.start_date}</p>
            <p className="text-xs text-gray-400">~ {perf.end_date}</p>
          </div>
        </div>
      </div>

      {/* 상세 정보 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-1">
        <InfoRow label="고객사" value={perf.client?.name ?? '-'} />
        <InfoRow label="담당 컨설턴트" value={
          <span className="flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-50 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
              {(perf.user?.name ?? '?').slice(0, 1)}
            </span>
            {perf.user?.name}
          </span>
        } />
        <InfoRow label="프로젝트" value={perf.project?.name ?? '—'} />
        <InfoRow label="서비스 유형" value={
          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg">{perf.service_type}</span>
        } />
        <InfoRow label="등록일" value={formatDate(perf.created_at)} />
        {perf.description && (
          <div className="py-3.5">
            <p className="text-sm text-gray-400 mb-2">설명</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3.5 leading-relaxed">{perf.description}</p>
          </div>
        )}
      </div>

      {/* 승인 워크플로우 상태 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-semibold text-gray-900 mb-4">승인 워크플로우</h3>

        {/* 단계 표시 */}
        <div className="flex items-center mb-6">
          {(['draft', 'pending', 'approved'] as const).map((step, idx) => {
            const stepLabel = { draft: '작성', pending: '검토', approved: '승인' }
            const isActive = perf.status === step
            const isPast = (
              (step === 'draft') ||
              (step === 'pending' && ['pending', 'approved', 'rejected'].includes(perf.status)) ||
              (step === 'approved' && perf.status === 'approved')
            )
            const isRejected = perf.status === 'rejected' && step === 'pending'
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                    isRejected ? 'border-red-400 bg-red-50 text-red-500' :
                    isActive ? 'border-blue-600 bg-blue-600 text-white' :
                    isPast ? 'border-emerald-500 bg-emerald-500 text-white' :
                    'border-gray-200 bg-white text-gray-400'
                  }`}>
                    {isRejected ? '✕' : isPast && !isActive ? '✓' : idx + 1}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${
                    isRejected ? 'text-red-500' :
                    isActive ? 'text-blue-600' :
                    isPast ? 'text-emerald-600' : 'text-gray-400'
                  }`}>
                    {isRejected ? '반려' : stepLabel[step]}
                  </span>
                </div>
                {idx < 2 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full ${
                    isPast && step !== 'approved' ? 'bg-emerald-400' : 'bg-gray-100'
                  }`} />
                )}
              </div>
            )
          })}
        </div>

        {/* 승인 이력 타임라인 */}
        {approvals.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">처리 이력</p>
            <ol className="relative border-l-2 border-gray-100 ml-3 space-y-5">
              {approvals.map(a => (
                <li key={a.id} className="ml-5">
                  <div className={`absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white ${
                    a.action === 'approved' ? 'bg-emerald-500' : 'bg-red-400'
                  }`} />
                  <div className={`rounded-xl p-3.5 border ${
                    a.action === 'approved'
                      ? 'bg-emerald-50 border-emerald-100'
                      : 'bg-red-50 border-red-100'
                  }`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-bold ${a.action === 'approved' ? 'text-emerald-700' : 'text-red-600'}`}>
                        {a.action === 'approved' ? '✅ 승인' : '❌ 반려'}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(a.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      <strong>{a.approver?.name}</strong>
                      {a.action === 'approved' ? ' 님이 승인했습니다.' : ' 님이 반려했습니다.'}
                    </p>
                    {a.comment && (
                      <p className="mt-2 text-sm text-gray-600 bg-white/60 rounded-lg p-2.5 italic">
                        "{a.comment}"
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">아직 처리된 이력이 없습니다.</p>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3 pb-4">
        {perf.status === 'draft' && (
          <>
            <Link
              to={`/performance/${id}/edit`}
              className="flex-1 py-3.5 text-center border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 active:bg-gray-100 min-h-[52px] transition-colors"
            >
              수정
            </Link>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-[2] py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 min-h-[52px] transition-colors shadow-sm"
            >
              {submitting ? '요청 중...' : '승인 요청하기'}
            </button>
          </>
        )}

        {perf.status === 'pending' && (
          <div className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-amber-50 border border-amber-200 rounded-xl">
            <svg className="w-4 h-4 text-amber-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <span className="text-sm font-semibold text-amber-700">팀장 승인 대기 중</span>
          </div>
        )}

        {perf.status === 'approved' && (
          <div className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-emerald-700">승인 완료</span>
          </div>
        )}

        {perf.status === 'rejected' && (
          <>
            <Link
              to={`/performance/${id}/edit`}
              className="flex-1 py-3.5 text-center border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 min-h-[52px] transition-colors"
            >
              내용 수정
            </Link>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-[2] py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 min-h-[52px] transition-colors shadow-sm"
            >
              {submitting ? '요청 중...' : '재승인 요청'}
            </button>
          </>
        )}
      </div>

    </div>
  )
}
