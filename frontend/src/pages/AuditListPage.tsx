import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auditsApi } from '../api/audits'
import LoadingSpinner from '../components/LoadingSpinner'
import type { Audit, AuditStatus } from '../types/database'
import {
  AUDIT_TYPES, AUDIT_STATUS_LABEL, AUDIT_STATUS_COLOR,
  AUDIT_RESULT_LABEL, AUDIT_RESULT_COLOR,
} from '../types/database'

function formatWon(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만원`
  return `${n.toLocaleString()}원`
}

const ALL_STATUSES: AuditStatus[] = ['planned', 'in_progress', 'completed', 'cancelled']

function AuditStatusBadge({ status }: { status: AuditStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${AUDIT_STATUS_COLOR[status]}`}>
      {AUDIT_STATUS_LABEL[status]}
    </span>
  )
}

export default function AuditListPage() {
  const navigate = useNavigate()
  const [list, setList] = useState<Audit[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('')
  const [search, setSearch] = useState('')
  const [showFilter, setShowFilter] = useState(false)

  const load = () => {
    setLoading(true)
    auditsApi.list({
      status: filterStatus || undefined,
      audit_type: filterType || undefined,
    }).then(setList).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterStatus, filterType])

  const filtered = list.filter(a =>
    !search ||
    a.audit_name?.includes(search) ||
    a.client?.name?.includes(search) ||
    a.user?.name?.includes(search) ||
    a.audit_type?.includes(search) ||
    a.audit_body?.includes(search)
  )

  const hasFilter = !!(filterStatus || filterType)

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <p className="text-sm text-gray-400 mt-0.5">총 {filtered.length}건</p>
        </div>
        <Link
          to="/audits/new"
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition-colors min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          심사 등록
        </Link>
      </div>

      {/* 검색 + 필터 */}
      <div className="space-y-2 mb-4">
        <div className="relative">
          <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="심사명, 고객사, 담당자, 인증기관 검색"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFilter(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors min-h-[40px] ${
              hasFilter ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            필터
            {hasFilter && <span className="bg-white text-indigo-600 text-xs rounded-full px-1.5 font-bold">ON</span>}
          </button>

          {ALL_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(prev => prev === s ? '' : s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors min-h-[40px] ${
                filterStatus === s
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {AUDIT_STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {showFilter && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">심사 유형</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterType('')}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors min-h-[36px] ${
                  !filterType ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >전체</button>
              {AUDIT_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(prev => prev === t ? '' : t)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors min-h-[36px] ${
                    filterType === t ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          {/* PC 테이블 */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3.5 text-left">심사명</th>
                  <th className="px-5 py-3.5 text-left">유형</th>
                  <th className="px-5 py-3.5 text-left">고객사</th>
                  <th className="px-5 py-3.5 text-left">담당자</th>
                  <th className="px-5 py-3.5 text-left">예정일</th>
                  <th className="px-5 py-3.5 text-right">매출</th>
                  <th className="px-5 py-3.5 text-center">결과</th>
                  <th className="px-5 py-3.5 text-center">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-gray-300">
                      <p className="text-4xl mb-2">📋</p>
                      <p>심사 실적이 없습니다.</p>
                    </td>
                  </tr>
                ) : filtered.map(a => (
                  <tr
                    key={a.id}
                    className="hover:bg-indigo-50/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/audits/${a.id}`)}
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900 truncate max-w-[180px]">{a.audit_name}</div>
                      {a.audit_body && <div className="text-xs text-gray-400 mt-0.5">{a.audit_body}</div>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg font-medium whitespace-nowrap">
                        {a.audit_type}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{a.client?.name ?? '-'}</td>
                    <td className="px-5 py-4 text-gray-500">{a.user?.name ?? '-'}</td>
                    <td className="px-5 py-4 text-gray-400 text-xs">{a.scheduled_date}</td>
                    <td className="px-5 py-4 text-right font-bold text-gray-800">{formatWon(a.revenue)}</td>
                    <td className="px-5 py-4 text-center">
                      {a.result ? (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${AUDIT_RESULT_COLOR[a.result]}`}>
                          {AUDIT_RESULT_LABEL[a.result]}
                        </span>
                      ) : <span className="text-gray-300 text-xs">-</span>}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <AuditStatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-300 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-2">📋</p>
                <p className="text-sm">심사 실적이 없습니다.</p>
              </div>
            ) : filtered.map(a => (
              <div
                key={a.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:scale-[0.98] transition-transform"
                onClick={() => navigate(`/audits/${a.id}`)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">{a.audit_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.audit_type} · {a.user?.name ?? '-'}</p>
                    </div>
                    <AuditStatusBadge status={a.status} />
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">{a.audit_type}</span>
                    {a.client?.name && <span className="text-xs text-gray-500">{a.client.name}</span>}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{a.scheduled_date}</span>
                      {a.result && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${AUDIT_RESULT_COLOR[a.result]}`}>
                          {AUDIT_RESULT_LABEL[a.result]}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-gray-900">{formatWon(a.revenue)}</span>
                  </div>
                </div>
                <div className="flex border-t border-gray-50">
                  <Link
                    to={`/audits/${a.id}`}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 py-2.5 text-center text-sm text-indigo-600 font-medium hover:bg-indigo-50 active:bg-indigo-100 transition-colors"
                  >
                    상세
                  </Link>
                  <Link
                    to={`/audits/${a.id}/edit`}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 py-2.5 text-center text-sm text-gray-500 font-medium border-l border-gray-50 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    수정
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
