import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { schedulesApi } from '../api/schedules'
import { usersApi } from '../api/users'
import LoadingSpinner from '../components/LoadingSpinner'
import type { User, ScheduleType, ScheduleStatus } from '../types/database'
import { SCHEDULE_TYPE_LABEL } from '../types/database'

const TYPE_OPTIONS: { value: ScheduleType; emoji: string }[] = [
  { value: 'meeting',  emoji: '👥' },
  { value: 'call',     emoji: '📞' },
  { value: 'visit',    emoji: '🏢' },
  { value: 'deadline', emoji: '🔴' },
  { value: 'other',    emoji: '📌' },
]

const STATUS_OPTIONS: { value: ScheduleStatus; label: string }[] = [
  { value: 'scheduled',  label: '예정' },
  { value: 'completed',  label: '완료' },
  { value: 'cancelled',  label: '취소' },
]

export default function ScheduleFormPage() {
  const { id }            = useParams()
  const [searchParams]    = useSearchParams()
  const navigate          = useNavigate()
  const isEdit            = Boolean(id)

  const [users,   setUsers]   = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  const defaultDate = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    user_id:     '',
    title:       '',
    description: '',
    start_date:  defaultDate,
    end_date:    defaultDate,
    all_day:     true,
    start_time:  '',
    end_time:    '',
    type:        'meeting' as ScheduleType,
    location:    '',
    status:      'scheduled' as ScheduleStatus,
  })

  useEffect(() => {
    usersApi.list().then(u => {
      setUsers(u)
      if (u.length > 0) setForm(f => ({ ...f, user_id: u[0].id }))
    }).then(async () => {
      if (isEdit && id) {
        const s = await schedulesApi.get(id)
        setForm({
          user_id:     s.user_id ?? '',
          title:       s.title,
          description: s.description ?? '',
          start_date:  s.start_date,
          end_date:    s.end_date ?? s.start_date,
          all_day:     s.all_day,
          start_time:  s.start_time ?? '',
          end_time:    s.end_time   ?? '',
          type:        s.type,
          location:    s.location   ?? '',
          status:      s.status,
        })
      }
    }).finally(() => setLoading(false))
  }, [id])

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('제목을 입력해 주세요.'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        title:      form.title.trim(),
        user_id:    form.user_id || null,
        end_date:   form.end_date || form.start_date,
        start_time: form.all_day ? null : (form.start_time || null),
        end_time:   form.all_day ? null : (form.end_time   || null),
        description: form.description || null,
        location:    form.location    || null,
      }
      if (isEdit && id) {
        await schedulesApi.update(id, payload)
      } else {
        await schedulesApi.create(payload)
      }
      navigate('/schedule')
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
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">일정 정보</h3>

          {/* 일정 유형 */}
          <div>
            <label className={labelClass}>유형 <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map(t => (
                <button
                  key={t.value} type="button"
                  onClick={() => setForm(f => ({ ...f, type: t.value }))}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all min-h-[44px] ${
                    form.type === t.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  <span>{t.emoji}</span>
                  {SCHEDULE_TYPE_LABEL[t.value]}
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className={labelClass}>제목 <span className="text-red-500">*</span></label>
            <input
              type="text" value={form.title} onChange={set('title')} required
              placeholder="일정 제목을 입력하세요"
              className={inputClass}
            />
          </div>

          {/* 담당자 */}
          <div>
            <label className={labelClass}>담당자</label>
            <select value={form.user_id} onChange={set('user_id')} className={inputClass}>
              <option value="">선택 안함</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role === 'consultant' ? '컨설턴트' : u.role === 'manager' ? '팀장' : '관리자'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 날짜/시간 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">날짜 및 시간</h3>

          {/* 종일 여부 */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm(f => ({ ...f, all_day: !f.all_day }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.all_day ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.all_day ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm font-medium text-gray-700">종일</span>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>시작일 <span className="text-red-500">*</span></label>
              <input type="date" value={form.start_date} onChange={set('start_date')} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>종료일</label>
              <input type="date" value={form.end_date} onChange={set('end_date')}
                min={form.start_date} className={inputClass} />
            </div>
          </div>

          {!form.all_day && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>시작 시간</label>
                <input type="time" value={form.start_time} onChange={set('start_time')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>종료 시간</label>
                <input type="time" value={form.end_time} onChange={set('end_time')} className={inputClass} />
              </div>
            </div>
          )}
        </div>

        {/* 추가 정보 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">추가 정보</h3>

          <div>
            <label className={labelClass}>장소</label>
            <input type="text" value={form.location} onChange={set('location')}
              placeholder="예: 본사 회의실 A, 고객사 사무소"
              className={inputClass} />
          </div>

          {isEdit && (
            <div>
              <label className={labelClass}>진행 상태</label>
              <select value={form.status} onChange={set('status')} className={inputClass}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className={labelClass}>메모</label>
            <textarea value={form.description} onChange={set('description')} rows={3}
              placeholder="참고사항이나 준비물 등을 입력하세요."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-shadow" />
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pb-4">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 py-3.5 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 min-h-[52px] transition-colors">
            취소
          </button>
          <button type="submit" disabled={saving}
            className="flex-[2] py-3.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 min-h-[52px] transition-colors shadow-sm">
            {saving ? '저장 중...' : isEdit ? '수정 완료' : '일정 등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
