import { useEffect, useState } from 'react'
import { performanceApi } from '../api/performance'
import { usersApi } from '../api/users'
import LoadingSpinner from '../components/LoadingSpinner'
import type { Performance, User } from '../types/database'

function formatWon(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만원`
  return `${n.toLocaleString()}원`
}

type ModalState = { id: string; action: 'approved' | 'rejected' } | null

export default function ApprovalPage() {
  const [list, setList] = useState<Performance[]>([])
  const [managers, setManagers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedManager, setSelectedManager] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [comment, setComment] = useState('')
  const [processing, setProcessing] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      performanceApi.list({ status: 'pending' }),
      usersApi.managers(),
    ]).then(([perfs, mgrs]) => {
      setList(perfs)
      setManagers(mgrs)
      if (mgrs.length > 0) setSelectedManager(mgrs[0].id)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openModal = (id: string, action: 'approved' | 'rejected') => {
    setComment('')
    setModal({ id, action })
  }

  const handleConfirm = async () => {
    if (!modal || !selectedManager) return
    if (modal.action === 'rejected' && !comment.trim()) return
    setProcessing(true)
    try {
      await performanceApi.approve(modal.id, selectedManager, modal.action, comment || undefined)
      setModal(null)
      load()
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* 승인자 선택 */}
      <div className="mb-4 bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          승인자
        </div>
        <select
          value={selectedManager}
          onChange={e => setSelectedManager(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] bg-white"
        >
          {managers.map(m => <option key={m.id} value={m.id}>{m.name} ({m.team?.name ?? ''})</option>)}
        </select>
        <span className="ml-auto text-sm text-gray-400">승인 대기 <strong className="text-gray-700">{list.length}건</strong></span>
      </div>

      {loading ? <LoadingSpinner /> : list.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-semibold text-gray-700">모든 실적이 처리되었습니다</p>
          <p className="text-sm text-gray-400 mt-1">승인 대기 중인 실적이 없습니다.</p>
        </div>
      ) : (
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
                  <th className="px-5 py-3.5 text-center w-36">처리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {list.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-amber-600">{(p.client?.name ?? '?').slice(0, 2)}</span>
                        </div>
                        <span className="font-medium text-gray-900">{p.client?.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-500">{p.service_type}</td>
                    <td className="px-5 py-4 text-gray-500">{p.user?.name}</td>
                    <td className="px-5 py-4 text-gray-400 text-xs">{p.start_date} ~ {p.end_date}</td>
                    <td className="px-5 py-4 text-right font-bold text-gray-800">{formatWon(p.revenue)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openModal(p.id, 'approved')}
                          className="px-3.5 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 active:bg-emerald-800 min-h-[36px] transition-colors"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => openModal(p.id, 'rejected')}
                          className="px-3.5 py-2 bg-white text-red-500 text-xs font-semibold rounded-xl border border-red-200 hover:bg-red-50 active:bg-red-100 min-h-[36px] transition-colors"
                        >
                          반려
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          <div className="md:hidden space-y-3">
            {list.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-amber-600">{(p.client?.name ?? '?').slice(0, 2)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900">{p.client?.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.service_type} · {p.user?.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.start_date} ~ {p.end_date}</p>
                    </div>
                    <p className="font-bold text-gray-900 shrink-0">{formatWon(p.revenue)}</p>
                  </div>
                  {p.description && (
                    <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5 mt-2">{p.description}</p>
                  )}
                </div>
                {/* 액션 버튼 */}
                <div className="flex border-t border-gray-50">
                  <button
                    onClick={() => openModal(p.id, 'rejected')}
                    className="flex-1 py-3.5 text-sm font-semibold text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
                  >
                    반려
                  </button>
                  <div className="w-px bg-gray-50" />
                  <button
                    onClick={() => openModal(p.id, 'approved')}
                    className="flex-[2] py-3.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
                  >
                    승인
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 승인/반려 모달 */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl md:mx-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className={`px-6 pt-6 pb-4 border-b border-gray-100 ${modal.action === 'approved' ? 'bg-emerald-50/50' : 'bg-red-50/50'} rounded-t-2xl`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${modal.action === 'approved' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {modal.action === 'approved'
                    ? <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    : <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  }
                </div>
                <div>
                  <p className="font-bold text-gray-900">{modal.action === 'approved' ? '승인하시겠습니까?' : '반려하시겠습니까?'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">승인자: {managers.find(m => m.id === selectedManager)?.name}</p>
                </div>
              </div>
            </div>

            {/* 코멘트 입력 */}
            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {modal.action === 'rejected' ? <>반려 사유 <span className="text-red-500">*</span></> : '코멘트 (선택)'}
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                autoFocus
                rows={3}
                placeholder={modal.action === 'rejected' ? '반려 사유를 입력해 주세요.' : '승인 코멘트를 입력해 주세요. (선택)'}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-3 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 min-h-[48px]"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                disabled={processing || (modal.action === 'rejected' && !comment.trim())}
                className={`flex-[2] py-3 text-white text-sm font-semibold rounded-xl disabled:opacity-40 min-h-[48px] transition-colors ${
                  modal.action === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                    : 'bg-red-500 hover:bg-red-600 active:bg-red-700'
                }`}
              >
                {processing ? '처리 중...' : modal.action === 'approved' ? '승인 확정' : '반려 확정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
