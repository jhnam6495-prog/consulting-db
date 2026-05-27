import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { schedulesApi } from '../api/schedules'
import type { MonthlyData, DailyData, UpcomingData } from '../api/schedules'
import type { Schedule, ScheduleType } from '../types/database'
import {
  SCHEDULE_TYPE_LABEL, SCHEDULE_TYPE_COLOR, SCHEDULE_TYPE_DOT,
} from '../types/database'
import LoadingSpinner from '../components/LoadingSpinner'

// ── 상수 ──────────────────────────────────────────────────────────
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTHS   = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

// ── 유틸 ──────────────────────────────────────────────────────────
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function greeting() {
  const h = new Date().getHours()
  if (h < 6)  return '🌙 새벽에도 일하시는군요!'
  if (h < 12) return '☀️ 좋은 아침입니다!'
  if (h < 18) return '🌤 좋은 오후입니다!'
  return '🌆 수고하셨습니다!'
}

function formatTime(t: string | null | undefined) {
  if (!t) return ''
  return t.slice(0, 5)
}

// 날짜에 해당하는 이벤트 수집 (캘린더 점 표시용)
function eventsForDate(date: string, monthly: MonthlyData | null) {
  if (!monthly) return []
  const events: { dot: string; kind: string }[] = []
  monthly.schedules.filter(s => s.start_date === date).forEach(s =>
    events.push({ dot: SCHEDULE_TYPE_DOT[s.type] ?? 'bg-gray-400', kind: 'schedule' })
  )
  monthly.audits.filter(a => a.scheduled_date === date).forEach(() =>
    events.push({ dot: 'bg-indigo-500', kind: 'audit' })
  )
  monthly.performances.filter(p => p.start_date <= date && p.end_date >= date).forEach(() =>
    events.push({ dot: 'bg-blue-400', kind: 'performance' })
  )
  return events.slice(0, 3)
}

// 일정 유형 아이콘
function TypeIcon({ type }: { type: ScheduleType }) {
  const icons: Record<ScheduleType, string> = {
    meeting: '👥', call: '📞', visit: '🏢', deadline: '🔴', other: '📌',
  }
  return <span>{icons[type] ?? '📌'}</span>
}

// ── 어시스턴트 카드 ───────────────────────────────────────────────
function AssistantPanel({ today, upcoming }: {
  today: DailyData | null
  upcoming: UpcomingData | null
}) {
  const now       = new Date()
  const todayStr  = toDateStr(now)
  const dateLabel = now.toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'long' })

  const todaySchedules = today?.schedules ?? []
  const todayAudits    = today?.audits    ?? []
  const todayPerf      = today?.performances ?? []
  const totalToday     = todaySchedules.length + todayAudits.length + todayPerf.length

  // 이번 주 일요일~토요일 범위
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const upcomingAudits   = upcoming?.audits.filter(a => a.scheduled_date > todayStr).slice(0, 3) ?? []
  const upcomingSchedules = upcoming?.schedules.filter(s => s.start_date > todayStr).slice(0, 3) ?? []

  return (
    <div className="space-y-4">
      {/* 인사 카드 */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-500 rounded-2xl p-5 text-white shadow-lg">
        <p className="text-sm font-medium opacity-80 mb-1">{greeting()}</p>
        <p className="text-lg font-bold leading-snug">{dateLabel}</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="bg-white/20 rounded-xl px-4 py-2.5 text-center">
            <p className="text-2xl font-bold">{totalToday}</p>
            <p className="text-xs opacity-80 mt-0.5">오늘 일정</p>
          </div>
          <div className="bg-white/20 rounded-xl px-4 py-2.5 text-center">
            <p className="text-2xl font-bold">{upcomingAudits.length + upcomingSchedules.length}</p>
            <p className="text-xs opacity-80 mt-0.5">예정 일정</p>
          </div>
          <Link to="/schedule/new"
            className="ml-auto bg-white text-indigo-600 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-indigo-50 active:bg-indigo-100 transition-colors shadow-sm flex items-center gap-1.5 min-h-[44px]">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            일정 추가
          </Link>
        </div>
      </div>

      {/* 오늘의 일정 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">오늘의 일정</h3>
          <span className="text-xs text-gray-400">{totalToday}건</span>
        </div>

        {totalToday === 0 ? (
          <div className="text-center py-6 text-gray-300">
            <p className="text-3xl mb-2">🎉</p>
            <p className="text-sm">오늘은 일정이 없습니다</p>
          </div>
        ) : (
          <ol className="space-y-2">
            {/* 일반 일정 */}
            {todaySchedules.map(s => (
              <li key={s.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${SCHEDULE_TYPE_COLOR[s.type]}`}>
                  <TypeIcon type={s.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.all_day ? '종일' : `${formatTime(s.start_time)}${s.end_time ? ` ~ ${formatTime(s.end_time)}` : ''}`}
                    {s.location && ` · ${s.location}`}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${SCHEDULE_TYPE_COLOR[s.type]}`}>
                  {SCHEDULE_TYPE_LABEL[s.type]}
                </span>
              </li>
            ))}
            {/* 심사 일정 */}
            {todayAudits.map(a => (
              <li key={a.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-indigo-50/40 transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 bg-indigo-100 text-indigo-700">
                  📋
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.audit_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {a.audit_type}{a.client?.name ? ` · ${a.client.name}` : ''}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 bg-indigo-100 text-indigo-700">심사</span>
              </li>
            ))}
            {/* 컨설팅 일정 */}
            {todayPerf.map(p => (
              <li key={p.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-blue-50/40 transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 bg-blue-100 text-blue-700">
                  💼
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.service_type}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.client?.name}{p.end_date ? ` · ~${p.end_date}` : ''}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 bg-blue-100 text-blue-700">컨설팅</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* 다가오는 일정 */}
      {(upcomingAudits.length > 0 || upcomingSchedules.length > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">다가오는 일정</h3>
          <div className="space-y-2">
            {[
              ...upcomingSchedules.map(s => ({
                date: s.start_date, label: s.title,
                sub: SCHEDULE_TYPE_LABEL[s.type],
                dot: SCHEDULE_TYPE_DOT[s.type],
                badge: SCHEDULE_TYPE_COLOR[s.type],
              })),
              ...upcomingAudits.map(a => ({
                date: a.scheduled_date, label: a.audit_name,
                sub: a.audit_type,
                dot: 'bg-indigo-500',
                badge: 'bg-indigo-100 text-indigo-700',
              })),
            ]
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 5)
              .map((item, i) => {
                const d   = new Date(item.date + 'T00:00:00')
                const diff = Math.round((d.getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 86400000)
                return (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${item.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.sub}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-gray-700">D-{diff}</p>
                      <p className="text-xs text-gray-400">{item.date}</p>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* 범례 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">캘린더 범례</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(SCHEDULE_TYPE_LABEL) as [ScheduleType, string][]).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 text-xs text-gray-600">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${SCHEDULE_TYPE_DOT[k]}`} />
              {v}
            </div>
          ))}
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-indigo-500" />심사
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-blue-400" />컨설팅
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 월별 캘린더 ───────────────────────────────────────────────────
function MonthCalendar({
  year, month, monthly, selectedDate, onSelectDate, onPrev, onNext,
}: {
  year: number; month: number
  monthly: MonthlyData | null
  selectedDate: string
  onSelectDate: (d: string) => void
  onPrev: () => void
  onNext: () => void
}) {
  const today = toDateStr(new Date())

  // 달력 날짜 배열 생성
  const firstDay   = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={onPrev}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h3 className="text-base font-bold text-gray-900">
          {year}년 {MONTHS[month - 1]}
        </h3>
        <button onClick={onNext}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`text-center text-xs font-semibold py-1 ${
            i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
          }`}>{d}</div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />
          const dateStr  = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const isToday  = dateStr === today
          const isSel    = dateStr === selectedDate
          const dotList  = eventsForDate(dateStr, monthly)
          const weekday  = (idx % 7)
          const isSun    = weekday === 0
          const isSat    = weekday === 6
          const hasEvent = dotList.length > 0

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(dateStr)}
              className={`relative flex flex-col items-center py-1.5 rounded-xl transition-all min-h-[52px] ${
                isSel
                  ? 'bg-indigo-600 text-white shadow-md'
                  : isToday
                  ? 'bg-indigo-50 text-indigo-700 font-bold ring-2 ring-indigo-300'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className={`text-sm font-medium leading-none mb-1.5 ${
                isSel ? 'text-white' :
                isSun ? 'text-red-500' :
                isSat ? 'text-blue-500' :
                'text-gray-700'
              }`}>{day}</span>

              {/* 이벤트 점 */}
              {hasEvent && (
                <div className="flex gap-0.5">
                  {dotList.map((e, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${
                      isSel ? 'bg-white/70' : e.dot
                    }`} />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── 선택된 날 상세 패널 ───────────────────────────────────────────
function DayDetail({
  selectedDate, daily, loading, onDeleteSchedule,
}: {
  selectedDate: string
  daily: DailyData | null
  loading: boolean
  onDeleteSchedule: (id: string) => void
}) {
  const d = new Date(selectedDate + 'T00:00:00')
  const label = d.toLocaleDateString('ko-KR', { month:'long', day:'numeric', weekday:'short' })
  const total = (daily?.schedules.length ?? 0) + (daily?.audits.length ?? 0) + (daily?.performances.length ?? 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{label}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{total}건의 일정</p>
        </div>
        <Link to={`/schedule/new?date=${selectedDate}`}
          className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors min-h-[36px]">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          추가
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : total === 0 ? (
        <div className="text-center py-8 text-gray-300">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-sm">이 날은 일정이 없습니다</p>
          <Link to={`/schedule/new?date=${selectedDate}`}
            className="mt-3 inline-block text-sm text-indigo-600 hover:underline">
            일정 추가하기
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {/* 일반 일정 */}
          {daily?.schedules.map(s => (
            <div key={s.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
              s.status === 'completed' ? 'opacity-50' : 'hover:bg-gray-50'
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${SCHEDULE_TYPE_COLOR[s.type]}`}>
                <TypeIcon type={s.type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium text-gray-900 ${s.status === 'completed' ? 'line-through' : ''}`}>
                  {s.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {s.all_day ? '종일' : `${formatTime(s.start_time)}${s.end_time ? ` ~ ${formatTime(s.end_time)}` : ''}`}
                  {s.location && ` · 📍${s.location}`}
                </p>
                {s.description && <p className="text-xs text-gray-500 mt-1 truncate">{s.description}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Link to={`/schedule/${s.id}/edit`}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                </Link>
                <button onClick={() => onDeleteSchedule(s.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {/* 심사 일정 */}
          {daily?.audits.map(a => (
            <Link key={a.id} to={`/audits/${a.id}`}
              className="flex items-start gap-3 p-3 rounded-xl border border-indigo-50 hover:bg-indigo-50/40 transition-colors block">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 bg-indigo-100 text-indigo-700">📋</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{a.audit_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {a.audit_type}{a.client?.name ? ` · ${a.client.name}` : ''}
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 bg-indigo-100 text-indigo-700">심사</span>
            </Link>
          ))}

          {/* 컨설팅 일정 */}
          {daily?.performances.map(p => (
            <Link key={p.id} to={`/performance/${p.id}`}
              className="flex items-start gap-3 p-3 rounded-xl border border-blue-50 hover:bg-blue-50/40 transition-colors block">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 bg-blue-100 text-blue-700">💼</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{p.service_type}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {p.client?.name}{p.end_date ? ` · ~${p.end_date}` : ''}
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 bg-blue-100 text-blue-700">컨설팅</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// 메인 페이지
// ════════════════════════════════════════════════════════════════════
export default function SchedulePage() {
  const now   = new Date()
  const today = toDateStr(now)

  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState(today)

  const [monthly,  setMonthly]  = useState<MonthlyData | null>(null)
  const [daily,    setDaily]    = useState<DailyData | null>(null)
  const [upcoming, setUpcoming] = useState<UpcomingData | null>(null)
  const [monthlyLoading, setMonthlyLoading] = useState(true)
  const [dailyLoading,   setDailyLoading]   = useState(true)

  // 월 데이터 + 오늘 데이터 + upcoming 병렬 로드
  useEffect(() => {
    setMonthlyLoading(true)
    Promise.all([
      schedulesApi.monthly(year, month),
      schedulesApi.upcoming(30),
    ]).then(([m, u]) => {
      setMonthly(m)
      setUpcoming(u)
    }).finally(() => setMonthlyLoading(false))
  }, [year, month])

  // 선택된 날 데이터 로드
  const loadDaily = useCallback((date: string) => {
    setDailyLoading(true)
    schedulesApi.daily(date)
      .then(setDaily)
      .finally(() => setDailyLoading(false))
  }, [])

  useEffect(() => { loadDaily(selectedDate) }, [selectedDate, loadDaily])

  // 오늘 데이터 (어시스턴트 패널용)
  const [todayData, setTodayData] = useState<DailyData | null>(null)
  useEffect(() => {
    schedulesApi.daily(today).then(setTodayData)
  }, [today])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const handleSelectDate = (date: string) => {
    setSelectedDate(date)
    // 다른 달 날짜 클릭 시 월 이동
    const d = new Date(date + 'T00:00:00')
    if (d.getFullYear() !== year || d.getMonth() + 1 !== month) {
      setYear(d.getFullYear())
      setMonth(d.getMonth() + 1)
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm('이 일정을 삭제하시겠습니까?')) return
    await schedulesApi.delete(id)
    loadDaily(selectedDate)
    // 월간 데이터도 갱신
    schedulesApi.monthly(year, month).then(setMonthly)
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr_320px] gap-5">

        {/* 왼쪽: 어시스턴트 패널 */}
        <div className="order-1 lg:order-1">
          <AssistantPanel today={todayData} upcoming={upcoming} />
        </div>

        {/* 가운데: 캘린더 */}
        <div className="order-3 lg:order-2">
          {monthlyLoading ? <LoadingSpinner /> : (
            <MonthCalendar
              year={year} month={month}
              monthly={monthly}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              onPrev={prevMonth}
              onNext={nextMonth}
            />
          )}
        </div>

        {/* 오른쪽: 선택된 날 상세 */}
        <div className="order-2 lg:order-3">
          <DayDetail
            selectedDate={selectedDate}
            daily={selectedDate === today ? todayData : daily}
            loading={selectedDate === today ? false : dailyLoading}
            onDeleteSchedule={handleDeleteSchedule}
          />
        </div>
      </div>
    </div>
  )
}
