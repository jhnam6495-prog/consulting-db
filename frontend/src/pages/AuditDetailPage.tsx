import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { auditsApi } from '../api/audits'
import LoadingSpinner from '../components/LoadingSpinner'
import type { Audit } from '../types/database'
import {
  AUDIT_STATUS_LABEL, AUDIT_STATUS_COLOR,
  AUDIT_RESULT_LABEL, AUDIT_RESULT_COLOR,
} from '../types/database'

function formatWon(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만원`
  return `${n.toLocaleString()}원`
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 py-3.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value ?? '-'}</span>
    </div>
  )
}

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [audit, setAudit] = useState<Audit | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    auditsApi.get(id).then(setAudit).finally(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!id || !window.confirm('이 심사 실적을 삭제하시겠습니까?')) return
    setDeleting(true)
    try {
      await auditsApi.delete(id)
      navigate('/audits')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <LoadingSpinner />
  if (!audit) return (
    <div className="p-8 text-center text-gray-400">
      <p className="text-4xl mb-2">🔍</p>
      <p>심사 실적을 찾을 수 없습니다.</p>
    </div>
  )

  const statusBg =
    audit.status === 'completed' ? 'bg-emerald-50 border-emerald-100' :
    audit.status === 'in_progress' ? 'bg-amber-50 border-amber-100' :
    audit.status === 'cancelled' ? 'bg-gray-50 border-gray-100' :
    'bg-indigo-50 border-indigo-100'

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-4">

      {/* 상단 네비 */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link to="/audits" className="hover:text-indigo-600 transition-colors">심사 목록</Link>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-gray-600">심사 상세</span>
      </div>

      {/* 상태 헤더 카드 */}
      <div className={`rounded-2xl p-5 border ${statusBg}`}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-lg leading-snug mb-1">{audit.audit_name}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg font-medium">{audit.audit_type}</span>
              {audit.audit_stage && (
                <span className="text-xs bg-white/70 text-gray-600 px-2.5 py-1 rounded-lg font-medium">{audit.audit_stage}</span>
              )}
              {audit.audit_body && (
                <span className="text-xs text-gray-500">{audit.audit_body}</span>
              )}
            </div>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${AUDIT_STATUS_COLOR[audit.status]}`}>
            {AUDIT_STATUS_LABEL[audit.status]}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/70 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">매출</p>
            <p className="text-lg font-bold text-gray-900">{formatWon(audit.revenue)}</p>
          </div>
          <div className="bg-white/70 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">예정일</p>
            <p className="text-sm font-semibold text-gray-900">{audit.scheduled_date}</p>
          </div>
          <div className="bg-white/70 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">부적합</p>
            <p className="text-lg font-bold text-gray-900">{audit.findings_count}건</p>
          </div>
          <div className="bg-white/70 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">관찰사항</p>
            <p className="text-lg font-bold text-gray-900">{audit.observations_count}건</p>
          </div>
        </div>

        {/* 심사 결과 강조 표시 */}
        {audit.result && (
          <div className="mt-3">
            <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${AUDIT_RESULT_COLOR[audit.result]}`}>
              {audit.result === 'pass' && '✅'}
              {audit.result === 'conditional_pass' && '⚠️'}
              {audit.result === 'fail' && '❌'}
              {audit.result === 'pending' && '⏳'}
              심사 결과: {AUDIT_RESULT_LABEL[audit.result]}
            </span>
          </div>
        )}
      </div>

      {/* 상세 정보 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-1">
        <InfoRow label="담당자" value={
          <span className="flex items-center gap-2">
            <span className="w-6 h-6 bg-indigo-50 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600">
              {(audit.user?.name ?? '?').slice(0, 1)}
            </span>
            {audit.user?.name}
          </span>
        } />
        <InfoRow label="고객사" value={audit.client?.name ?? '—'} />
        <InfoRow label="심사 기관" value={audit.audit_body} />
        <InfoRow label="심사 단계" value={audit.audit_stage} />
        <InfoRow label="완료일" value={audit.completed_date} />
        <InfoRow label="매출" value={formatWon(audit.revenue)} />
        {audit.description && (
          <div className="py-3.5">
            <p className="text-sm text-gray-400 mb-2">메모</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3.5 leading-relaxed">{audit.description}</p>
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3 pb-4">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="py-3.5 px-5 border border-red-200 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 active:bg-red-100 disabled:opacity-50 min-h-[52px] transition-colors"
        >
          {deleting ? '삭제 중...' : '삭제'}
        </button>
        <Link
          to={`/audits/${id}/edit`}
          className="flex-1 py-3.5 text-center bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:bg-indigo-800 min-h-[52px] transition-colors shadow-sm flex items-center justify-center"
        >
          수정하기
        </Link>
      </div>
    </div>
  )
}
