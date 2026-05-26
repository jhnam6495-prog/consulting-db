import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { auditsApi } from '../api/audits'
import { clientsApi } from '../api/clients'
import { usersApi } from '../api/users'
import LoadingSpinner from '../components/LoadingSpinner'
import type { Client, User, AuditType, AuditStage, AuditStatus, AuditResult } from '../types/database'
import { AUDIT_TYPES, AUDIT_STAGES } from '../types/database'

function formatRevenue(val: string) {
  const n = Number(val.replace(/,/g, ''))
  if (!n) return ''
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만원`
  return `${n.toLocaleString()}원`
}

const RESULT_OPTIONS: { value: AuditResult; label: string }[] = [
  { value: 'pass', label: '합격' },
  { value: 'conditional_pass', label: '조건부합격' },
  { value: 'fail', label: '불합격' },
  { value: 'pending', label: '미결' },
]

const STATUS_OPTIONS: { value: AuditStatus; label: string }[] = [
  { value: 'planned', label: '예정' },
  { value: 'in_progress', label: '진행중' },
  { value: 'completed', label: '완료' },
  { value: 'cancelled', label: '취소' },
]

export default function AuditFormPage() {
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
    audit_type: 'ISO9001' as AuditType,
    audit_name: '',
    audit_body: '',
    audit_stage: '' as AuditStage | '',
    scheduled_date: '',
    completed_date: '',
    result: '' as AuditResult | '',
    findings_count: '',
    observations_count: '',
    revenue: '',
    status: 'planned' as AuditStatus,
    description: '',
  })

  useEffect(() => {
    Promise.all([clientsApi.list(), usersApi.list()]).then(([c, u]) => {
      setClients(c)
      setUsers(u)
      if (u.length > 0) setForm(f => ({ ...f, user_id: u[0].id }))
    }).then(async () => {
      if (isEdit && id) {
        const a = await auditsApi.get(id)
        setForm({
          user_id: a.user_id,
          client_id: a.client_id ?? '',
          audit_type: a.audit_type,
          audit_name: a.audit_name,
          audit_body: a.audit_body ?? '',
          audit_stage: a.audit_stage ?? '',
          scheduled_date: a.scheduled_date,
          completed_date: a.completed_date ?? '',
          result: a.result ?? '',
          findings_count: String(a.findings_count),
          observations_count: String(a.observations_count),
          revenue: String(a.revenue),
          status: a.status,
          description: a.description ?? '',
        })
      }
    }).finally(() => setLoading(false))
  }, [id])

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!form.audit_name.trim()) {
      setError('심사명을 입력해 주세요.')
      return
    }
    if (!form.scheduled_date) {
      setError('심사 예정일을 입력해 주세요.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        user_id: form.user_id,
        client_id: form.client_id || null,
        audit_type: form.audit_type,
        audit_name: form.audit_name.trim(),
        audit_body: form.audit_body || null,
        audit_stage: (form.audit_stage || null) as AuditStage | null,
        scheduled_date: form.scheduled_date,
        completed_date: form.completed_date || null,
        result: (form.result || null) as AuditResult | null,
        findings_count: form.findings_count ? Number(form.findings_count) : 0,
        observations_count: form.observations_count ? Number(form.observations_count) : 0,
        revenue: form.revenue ? Number(form.revenue) : 0,
        status: form.status,
        description: form.description || null,
      }
      if (isEdit && id) {
        await auditsApi.update(id, payload)
      } else {
        await auditsApi.create(payload)
      }
      navigate('/audits')
    } catch {
      setError('저장에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner />

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[48px] transition-shadow"
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

        {/* 기본 정보 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">기본 정보</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>담당자 <span className="text-red-500">*</span></label>
              <select value={form.user_id} onChange={set('user_id')} required className={inputClass}>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role === 'consultant' ? '컨설턴트' : u.role === 'manager' ? '팀장' : '관리자'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>고객사</label>
              <select value={form.client_id} onChange={set('client_id')} className={inputClass}>
                <option value="">선택 안함</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>심사 유형 <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2">
              {AUDIT_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, audit_type: t }))}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all min-h-[40px] ${
                    form.audit_type === t
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>심사명 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.audit_name}
              onChange={set('audit_name')}
              required
              placeholder="예: 2025년 ISO 9001 갱신심사"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>심사 기관</label>
              <input
                type="text"
                value={form.audit_body}
                onChange={set('audit_body')}
                placeholder="예: KR인증원, BSI 등"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>심사 단계</label>
              <select value={form.audit_stage} onChange={set('audit_stage')} className={inputClass}>
                <option value="">선택 안함</option>
                {AUDIT_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 일정 및 결과 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">일정 및 결과</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>예정일 <span className="text-red-500">*</span></label>
              <input type="date" value={form.scheduled_date} onChange={set('scheduled_date')} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>완료일</label>
              <input type="date" value={form.completed_date} onChange={set('completed_date')} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>진행 상태</label>
              <select value={form.status} onChange={set('status')} className={inputClass}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>심사 결과</label>
              <select value={form.result} onChange={set('result')} className={inputClass}>
                <option value="">미정</option>
                {RESULT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>부적합 건수</label>
              <input
                type="number"
                value={form.findings_count}
                onChange={set('findings_count')}
                min={0}
                placeholder="0"
                inputMode="numeric"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>관찰사항 건수</label>
              <input
                type="number"
                value={form.observations_count}
                onChange={set('observations_count')}
                min={0}
                placeholder="0"
                inputMode="numeric"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* 매출 및 메모 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">매출 및 메모</h3>

          <div>
            <label className={labelClass}>
              매출 금액 (원)
              {form.revenue && Number(form.revenue) > 0 && (
                <span className="ml-2 text-indigo-600 font-semibold">{formatRevenue(form.revenue)}</span>
              )}
            </label>
            <input
              type="number"
              value={form.revenue}
              onChange={set('revenue')}
              placeholder="예: 5000000"
              min={0}
              inputMode="numeric"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>메모 <span className="text-gray-400 font-normal text-xs">(선택)</span></label>
            <textarea
              value={form.description}
              onChange={set('description')}
              rows={3}
              placeholder="심사 관련 특이사항이나 메모를 입력하세요."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-shadow"
            />
          </div>
        </div>

        {/* 하단 버튼 */}
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
            className="flex-[2] py-3.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 min-h-[52px] transition-colors shadow-sm"
          >
            {saving ? '저장 중...' : isEdit ? '수정 완료' : '등록하기'}
          </button>
        </div>
      </form>
    </div>
  )
}
