import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { performanceApi } from '../api/performance'
import { clientsApi } from '../api/clients'
import { usersApi } from '../api/users'
import LoadingSpinner from '../components/LoadingSpinner'
import type { Client, User, ServiceType } from '../types/database'
import { SERVICE_TYPES } from '../types/database'

function formatRevenue(val: string) {
  const n = Number(val.replace(/,/g, ''))
  if (!n) return ''
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만원`
  return `${n.toLocaleString()}원`
}

export default function PerformanceFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    user_id: '',
    client_id: '',
    service_type: '전략컨설팅' as ServiceType,
    revenue: '',
    start_date: '',
    end_date: '',
    description: '',
  })

  useEffect(() => {
    Promise.all([clientsApi.list(), usersApi.list()]).then(([c, u]) => {
      setClients(c)
      setUsers(u)
      if (c.length > 0) setForm(f => ({ ...f, client_id: c[0].id }))
      if (u.length > 0) setForm(f => ({ ...f, user_id: u[0].id }))
    }).then(async () => {
      if (isEdit && id) {
        const p = await performanceApi.get(id)
        setForm({
          user_id: p.user_id,
          client_id: p.client_id,
          service_type: p.service_type,
          revenue: String(p.revenue),
          start_date: p.start_date,
          end_date: p.end_date,
          description: p.description ?? '',
        })
      }
    }).finally(() => setLoading(false))
  }, [id])

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!form.revenue || Number(form.revenue) <= 0) {
      setError('매출 금액을 입력해 주세요.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, revenue: Number(form.revenue) }
      if (isEdit && id) {
        await performanceApi.update(id, payload)
      } else {
        await performanceApi.create(payload)
      }
      navigate('/performance')
    } catch {
      setError('저장에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px] transition-shadow"
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5"

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd"/>
            </svg>
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">기본 정보</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>담당자 <span className="text-red-500">*</span></label>
              <select value={form.user_id} onChange={set('user_id')} required className={inputClass}>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role === 'consultant' ? '컨설턴트' : u.role === 'manager' ? '팀장' : '관리자'})</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>고객사 <span className="text-red-500">*</span></label>
              <select value={form.client_id} onChange={set('client_id')} required className={inputClass}>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>서비스 유형 <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, service_type: s }))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all min-h-[44px] ${
                    form.service_type === s
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">실적 내용</h3>

          <div>
            <label className={labelClass}>
              매출 금액 (원) <span className="text-red-500">*</span>
              {form.revenue && Number(form.revenue) > 0 && (
                <span className="ml-2 text-blue-600 font-semibold">{formatRevenue(form.revenue)}</span>
              )}
            </label>
            <input
              type="number"
              value={form.revenue}
              onChange={set('revenue')}
              placeholder="예: 50000000"
              required min={0}
              inputMode="numeric"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>시작일 <span className="text-red-500">*</span></label>
              <input type="date" value={form.start_date} onChange={set('start_date')} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>종료일 <span className="text-red-500">*</span></label>
              <input type="date" value={form.end_date} onChange={set('end_date')} required className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>설명 <span className="text-gray-400 font-normal text-xs">(선택)</span></label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={3}
              placeholder="프로젝트 내용이나 특이사항을 입력하세요."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-shadow"
            />
          </div>
        </div>

        {/* 버튼 — 모바일에선 화면 하단 고정 */}
        <div className="flex gap-3 pb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 py-3.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 active:bg-gray-100 min-h-[52px] transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-2 flex-[2] py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 min-h-[52px] transition-colors shadow-sm"
          >
            {saving ? '저장 중...' : isEdit ? '수정 완료' : '등록하기'}
          </button>
        </div>
      </form>
    </div>
  )
}
