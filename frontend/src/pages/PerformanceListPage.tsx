import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { performanceApi } from '../api/performance'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import type { Performance, PerformanceStatus } from '../types/database'
import { SERVICE_TYPES, STATUS_LABEL } from '../types/database'

function formatWon(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만원`
  return `${n.toLocaleString()}원`
}

const ALL_STATUSES: PerformanceStatus[] = ['draft', 'pending', 'approved', 'rejected']

export default function PerformanceListPage() {
  const navigate = useNavigate()
  const [list, setList] = useState<Performance[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterService, setFilterService] = useState('')
  const [search, setSearch] = useState('')
  const [showFilter, setShowFilter] = useState(false)

  const load = () => {
    setLoading(true)
    performanceApi.list({
      status: filterStatus || undefined,
      service_type: filterService || undefined,
    }).then(setList).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filterStatus, filterService])

  const filtered = list.filter(p =>
    !search ||
    p.client?.name?.includes(search) ||
    p.user?.name?.includes(search) ||
    p.service_type?.includes(search)
  )

  const hasFilter = !!(filterStatus || filterService)

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <p className="text-sm text-gray-400 mt-0.5">총 {filtered.length}건</p>
        </div>
        <Link to="/performance/new"
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors min-h-[44px]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          실적 등록
        </Link>
      </div>

      {/* 검색 + 필터 */}
      <div className="space-y-2 mb-4">
        {/* 검색 */}
        <div className="relative">
          <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="고객사, 담당자, 서비스 유형 검색"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
          />
        </div>

        {/* 필터 토글 + 칩 */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowFilter(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors min-h-[40px] ${
              hasFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            필터
            {hasFilter && <span className="bg-white text-blue-600 text-xs rounded-full px-1.5 font-bold">ON</span>}
          </button>

          {/* 상태 빠른 필터 칩 */}
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
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {/* 서비스 유형 필터 패널 */}
        {showFilter && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">서비스 유형</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterService('')}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors min-h-[36px] ${
                  !filterService ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >전체</button>
              {SERVICE_TYPES.map(s => (
                <button
                  key={s}
                  onClick={() => setFilterService(prev => prev === s ? '' : s)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors min-h-[36px] ${
                    filterService === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >{s}</button>
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
                  <th className="px-5 py-3.5 text-left">고객사</th>
                  <th className="px-5 py-3.5 text-left">서비스</th>
                  <th className="px-5 py-3.5 text-left">담당자</th>
                  <th className="px-5 py-3.5 text-left">기간</th>
                  <th className="px-5 py-3.5 text-right">매출</th>
                  <th className="px-5 py-3.5 text-center">상태</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-gray-300">
                      <p className="text-4xl mb-2">📋</p>
                      <p>실적이 없습니다.</p>
                    </td>
                  </tr>
                ) : filtered.map(p => (
                  <tr key={p.id}
                    className="hover:bg-blue-50/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/performance/${p.id}`)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-blue-600">{(p.client?.name ?? '?').slice(0, 2)}</span>
                        </div>
                        <span className="font-medium text-gray-900">{p.client?.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500">{p.service_type}</td>
                    <td className="px-5 py-4 text-gray-500">{p.user?.name}</td>
                    <td className="px-5 py-4 text-gray-400 text-xs">{p.start_date} ~ {p.end_date}</td>
                    <td className="px-5 py-4 text-right font-bold text-gray-800">{formatWon(p.revenue)}</td>
                    <td className="px-5 py-4 text-center"><StatusBadge status={p.status} /></td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/performance/${p.id}`}
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-blue-600 hover:underline px-2 py-1 rounded-lg hover:bg-blue-50"
                      >
                        상세
                      </Link>
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
                <p className="text-sm">실적이 없습니다.</p>
              </div>
            ) : filtered.map(p => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden active:scale-[0.98] transition-transform"
                onClick={() => navigate(`/performance/${p.id}`)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-blue-600">{(p.client?.name ?? '?').slice(0, 2)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{p.client?.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{p.service_type} · {p.user?.name}</p>
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <span className="text-xs text-gray-400">{p.start_date} ~ {p.end_date}</span>
                    <span className="font-bold text-gray-900">{formatWon(p.revenue)}</span>
                  </div>
                </div>
                {/* 슬라이드 액션 힌트 */}
                <div className="flex border-t border-gray-50">
                  <Link
                    to={`/performance/${p.id}`}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 py-2.5 text-center text-sm text-blue-600 font-medium hover:bg-blue-50 active:bg-blue-100 transition-colors"
                  >
                    상세
                  </Link>
                  {p.status === 'draft' && (
                    <button
                      onClick={async e => {
                        e.stopPropagation()
                        await performanceApi.submit(p.id)
                        load()
                      }}
                      className="flex-1 py-2.5 text-sm text-emerald-600 font-medium border-l border-gray-50 hover:bg-emerald-50 active:bg-emerald-100 transition-colors"
                    >
                      승인 요청
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
