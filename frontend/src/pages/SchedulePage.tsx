import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { schedulesApi } from '../api/schedules'
import type { MonthlyData } from '../api/schedules'
import type { ScheduleType } from '../types/database'
import { SCHEDULE_TYPE_DOT } from '../types/database'
import LoadingSpinner from '../components/LoadingSpinner'

// ── 상수 ──────────────────────────────────────────────────────────
const WEEKDAYS    = ['일', '월', '화', '수', '목', '금', '토']
const MONTHS      = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const HOUR_HEIGHT = 56
const DAY_START   = 7
const DAY_END     = 21
const HOURS       = Array.from({ length: DAY_END - DAY_START }, (_, i) => i + DAY_START)

type ViewMode = 'week' | 'month'

// 타임 블록 색상
const BLOCK_BG:     Record<string, string> = {
  meeting: 'bg-emerald-50',  call: 'bg-sky-50',    visit: 'bg-orange-50',
  deadline: 'bg-red-50',     other: 'bg-gray-50',  audit: 'bg-indigo-50', performance: 'bg-blue-50',
}
const BLOCK_BORDER: Record<string, string> = {
  meeting: 'border-l-4 border-emerald-500', call: 'border-l-4 border-sky-500',
  visit: 'border-l-4 border-orange-500',    deadline: 'border-l-4 border-red-500',
  other: 'border-l-4 border-gray-400',      audit: 'border-l-4 border-indigo-500',
  performance: 'border-l-4 border-blue-500',
}
const BLOCK_TEXT:   Record<string, string> = {
  meeting: 'text-emerald-800', call: 'text-sky-800',    visit: 'text-orange-800',
  deadline: 'text-red-800',    other: 'text-gray-700',  audit: 'text-indigo-800', performance: 'text-blue-800',
}
const BADGE_BG:     Record<string, string> = {
  meeting: 'bg-emerald-500', call: 'bg-sky-500',   visit: 'bg-orange-500',
  deadline: 'bg-red-500',    other: 'bg-gray-500', audit: 'bg-indigo-500', performance: 'bg-blue-500',
}
const DOT_COLOR:    Record<string, string> = {
  meeting: 'bg-emerald-500', call: 'bg-sky-500',   visit: 'bg-orange-500',
  deadline: 'bg-red-500',    other: 'bg-gray-400', audit: 'bg-indigo-500', performance: 'bg-blue-400',
}

// ── 유틸 ──────────────────────────────────────────────────────────
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setDate(date.getDate() - date.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
}

function toMins(t: string | null | undefined): number {
  if (!t) return -1
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

function fmtHM(t: string | null | undefined): string {
  if (!t) return ''
  return t.slice(0, 5)
}

// ── 통합 이벤트 타입 ──────────────────────────────────────────────
type CalEvent = {
  id:        string
  kind:      'schedule' | 'audit' | 'performance'
  date:      string
  title:     string
  allDay:    boolean
  startTime: string | null
  endTime:   string | null
  typeKey:   string
  link:      string
  rawId?:    string
}

function buildEvents(monthly: MonthlyData | null, targetDates: string[]): CalEvent[] {
  if (!monthly) return []
  const dateSet = new Set(targetDates)
  const out: CalEvent[] = []

  monthly.schedules
    .filter(s => dateSet.has(s.start_date))
    .forEach(s => out.push({
      id: s.id, kind: 'schedule', date: s.start_date,
      title: s.title, allDay: s.all_day,
      startTime: s.all_day ? null : (s.start_time ?? null),
      endTime:   s.all_day ? null : (s.end_time   ?? null),
      typeKey: s.type, link: `/schedule/${s.id}/edit`, rawId: s.id,
    }))

  monthly.audits
    .filter(a => dateSet.has(a.scheduled_date))
    .forEach(a => out.push({
      id: a.id, kind: 'audit', date: a.scheduled_date,
      title: a.audit_name, allDay: true,
      startTime: null, endTime: null,
      typeKey: 'audit', link: `/audits/${a.id}`,
    }))

  monthly.performances
    .forEach(p => targetDates
      .filter(d => p.start_date <= d && p.end_date >= d)
      .forEach(d => out.push({
        id: `${p.id}@${d}`, kind: 'performance', date: d,
        title: p.service_type, allDay: true,
        startTime: null, endTime: null,
        typeKey: 'performance', link: `/performance/${p.id}`,
      }))
    )

  return out
}

// ── 선택된 날 이벤트 목록 ─────────────────────────────────────────
function DayEventList({ date, events, onDelete }: {
  date:     string
  events:   CalEvent[]
  onDelete: (id: string) => void
}) {
  const d     = new Date(date + 'T00:00:00')
  const label = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">{label}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{events.length}건</p>
        </div>
        <Link to={`/schedule/new?date=${date}`}
          className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          추가
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 text-gray-300">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-sm">이 날은 일정이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(e => (
            <div key={e.id}
              className={`flex items-center gap-3 p-3 rounded-xl ${BLOCK_BG[e.typeKey] ?? 'bg-gray-50'} ${BLOCK_BORDER[e.typeKey] ?? 'border-l-4 border-gray-400'}`}>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${BLOCK_TEXT[e.typeKey] ?? 'text-gray-700'}`}>{e.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {e.allDay ? '종일' : `${fmtHM(e.startTime)}${e.endTime ? ` ~ ${fmtHM(e.endTime)}` : ''}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {e.kind === 'schedule' ? (
                  <>
                    <Link to={e.link}
                      className="p-1.5 rounded-lg hover:bg-white/60 transition-colors text-gray-500 hover:text-gray-700">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                    </Link>
                    <button onClick={() => e.rawId && onDelete(e.rawId)}
                      className="p-1.5 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors text-gray-400">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <Link to={e.link}
                    className={`text-xs font-semibold px-2 py-1 rounded-lg ${BADGE_BG[e.typeKey] ?? 'bg-gray-500'} text-white hover:opacity-90 transition-opacity`}>
                    보기
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 주간 뷰 ───────────────────────────────────────────────────────
function WeekView({ weekDates, monthly }: {
  weekDates: Date[]
  monthly:   MonthlyData | null
}) {
  const navigate = useNavigate()
  const todayStr = toDateStr(new Date())
  const dateStrs = weekDates.map(toDateStr)
  const events   = buildEvents(monthly, dateStrs)

  const now      = new Date()
  const nowPx    = (now.getHours() + now.getMinutes() / 60 - DAY_START) * HOUR_HEIGHT
  const todayIdx = dateStrs.indexOf(todayStr)

  const allDayMap: Record<string, CalEvent[]> = {}
  const timedMap:  Record<string, CalEvent[]> = {}
  dateStrs.forEach(ds => {
    allDayMap[ds] = events.filter(e => e.date === ds && e.allDay)
    timedMap[ds]  = events.filter(e => e.date === ds && !e.allDay)
  })

  const COL = '52px repeat(7, minmax(0, 1fr))'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {/* 요일/날짜 헤더 */}
      <div className="grid border-b border-gray-200 shrink-0" style={{ gridTemplateColumns: COL }}>
        <div className="border-r border-gray-100" />
        {weekDates.map((d, i) => {
          const ds      = toDateStr(d)
          const isToday = ds === todayStr
          const isSun   = i === 0
          const isSat   = i === 6
          return (
            <div key={i} className={`border-l border-gray-100 text-center py-3 ${isToday ? 'bg-indigo-50' : ''}`}>
              <p className={`text-[11px] font-semibold tracking-widest mb-1 ${isSun ? 'text-red-400' : isSat ? 'text-blue-400' : 'text-gray-400'}`}>
                {WEEKDAYS[i]}
              </p>
              <button
                onClick={() => navigate(`/schedule/new?date=${ds}`)}
                title="일정 추가"
                className={`w-9 h-9 rounded-full text-sm font-bold mx-auto flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                  isToday
                    ? 'bg-indigo-600 text-white shadow-md'
                    : isSun ? 'text-red-500 hover:bg-red-50'
                    : isSat ? 'text-blue-500 hover:bg-blue-50'
                    : 'text-gray-800 hover:bg-gray-100'
                }`}>
                {d.getDate()}
              </button>
            </div>
          )
        })}
      </div>

      {/* 종일 이벤트 스트립 */}
      <div className="grid border-b border-gray-200 shrink-0" style={{ gridTemplateColumns: COL }}>
        <div className="border-r border-gray-100 flex items-center justify-end pr-2 py-1">
          <span className="text-[10px] font-medium text-gray-400">종일</span>
        </div>
        {dateStrs.map((ds, i) => (
          <div key={i} className={`border-l border-gray-100 min-h-[28px] p-0.5 ${i === todayIdx ? 'bg-indigo-50/40' : ''}`}>
            {allDayMap[ds].map(e => (
              <Link key={e.id} to={e.link}
                className={`block text-[11px] font-semibold px-1.5 py-[2px] rounded mb-0.5 truncate text-white hover:opacity-90 transition-opacity ${BADGE_BG[e.typeKey] ?? 'bg-gray-500'}`}>
                {e.title}
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* 시간 그리드 */}
      <div className="overflow-y-auto" style={{ height: 'calc(100vh - 300px)', minHeight: '360px' }}>
        <div className="grid relative" style={{
          gridTemplateColumns: COL,
          height: `${(DAY_END - DAY_START) * HOUR_HEIGHT}px`,
        }}>
          {/* 시간 라벨 컬럼 */}
          <div className="border-r border-gray-100 relative shrink-0">
            {HOURS.map((h, i) => (
              <div key={h} className="absolute inset-x-0 flex justify-end pr-2"
                style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}>
                <span className="text-[11px] text-gray-400 font-medium -translate-y-[9px] select-none">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* 7개 요일 컬럼 */}
          {dateStrs.map((ds, colIdx) => {
            const isToday = ds === todayStr
            return (
              <div key={colIdx}
                className={`relative border-l border-gray-100 ${isToday ? 'bg-indigo-50/20' : ''}`}>
                {/* 시간 행 (클릭 → 일정 추가) */}
                {HOURS.map((h, i) => (
                  <div key={h}
                    style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                    className="absolute inset-x-0 border-t border-gray-100 hover:bg-gray-50/70 cursor-pointer transition-colors"
                    onClick={() => navigate(`/schedule/new?date=${ds}`)}>
                    <div className="absolute inset-x-0 border-t border-gray-50/80"
                      style={{ top: `${HOUR_HEIGHT / 2}px` }} />
                  </div>
                ))}

                {/* 현재 시각 선 */}
                {isToday && nowPx >= 0 && nowPx <= (DAY_END - DAY_START) * HOUR_HEIGHT && (
                  <div className="absolute inset-x-0 z-20 flex items-center pointer-events-none"
                    style={{ top: `${nowPx}px` }}>
                    <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5 shrink-0 shadow-sm" />
                    <div className="flex-1 h-[2px] bg-red-500" />
                  </div>
                )}

                {/* 시간 기반 이벤트 블록 */}
                {timedMap[ds].map(e => {
                  const sMins = toMins(e.startTime)
                  const eMins = e.endTime ? toMins(e.endTime) : sMins + 60
                  if (sMins < DAY_START * 60) return null
                  const topPx = (sMins / 60 - DAY_START) * HOUR_HEIGHT
                  const htPx  = Math.max((eMins - sMins) / 60 * HOUR_HEIGHT, 24)
                  if (topPx >= (DAY_END - DAY_START) * HOUR_HEIGHT) return null

                  return (
                    <Link key={e.id} to={e.link}
                      style={{ top: `${topPx}px`, height: `${htPx}px` }}
                      className={`absolute left-[2px] right-[2px] z-10 rounded overflow-hidden px-1.5 py-0.5
                        hover:brightness-95 transition-all cursor-pointer
                        ${BLOCK_BG[e.typeKey] ?? 'bg-gray-50'}
                        ${BLOCK_BORDER[e.typeKey] ?? 'border-l-4 border-gray-400'}
                        ${BLOCK_TEXT[e.typeKey] ?? 'text-gray-700'}`}>
                      <p className="text-[11px] font-semibold leading-tight truncate">{e.title}</p>
                      {htPx >= 38 && (
                        <p className="text-[10px] opacity-70 leading-tight mt-0.5">
                          {fmtHM(e.startTime)}{e.endTime ? `–${fmtHM(e.endTime)}` : ''}
                        </p>
                      )}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── 월간 뷰 ───────────────────────────────────────────────────────
function MonthView({ year, month, monthly, onDelete }: {
  year:     number
  month:    number
  monthly:  MonthlyData | null
  onDelete: (id: string) => void
}) {
  const today = toDateStr(new Date())
  const [sel, setSel] = useState(today)

  const firstDay    = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const allDates = cells
    .filter((d): d is number => d !== null)
    .map(d => `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
  const events   = buildEvents(monthly, allDates)
  const selEvents = events.filter(e => e.date === sel)

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-5">
      {/* 월 캘린더 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
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
            const ds = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const dayEvents = events.filter(e => e.date === ds)
            const isToday   = ds === today
            const isSel     = ds === sel
            const wd        = idx % 7

            return (
              <button key={idx} onClick={() => setSel(ds)}
                className={`relative flex flex-col items-center py-1.5 rounded-xl min-h-[56px] transition-all ${
                  isSel   ? 'bg-indigo-600 text-white shadow-md' :
                  isToday ? 'bg-indigo-50 ring-2 ring-indigo-300' :
                  'hover:bg-gray-50'
                }`}>
                <span className={`text-sm font-medium leading-none mb-1.5 ${
                  isSel ? 'text-white' :
                  wd === 0 ? 'text-red-500' :
                  wd === 6 ? 'text-blue-500' :
                  'text-gray-700'
                }`}>{day}</span>
                <div className="flex gap-0.5 flex-wrap justify-center px-1">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full ${
                      isSel ? 'bg-white/70' :
                      (DOT_COLOR[e.typeKey] ?? SCHEDULE_TYPE_DOT[e.typeKey as ScheduleType] ?? 'bg-gray-400')
                    }`} />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 선택된 날 상세 */}
      <DayEventList date={sel} events={selEvents} onDelete={onDelete} />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// 메인 페이지
// ════════════════════════════════════════════════════════════════════
export default function SchedulePage() {
  const now = new Date()

  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [curDate,  setCurDate]  = useState<Date>(now)
  const [monthly,  setMonthly]  = useState<MonthlyData | null>(null)
  const [loading,  setLoading]  = useState(true)

  const weekStart = getWeekStart(curDate)
  const weekDates = getWeekDates(weekStart)
  const year      = curDate.getFullYear()
  const month     = curDate.getMonth() + 1

  // 데이터 로드
  useEffect(() => {
    setLoading(true)

    const ws = getWeekStart(curDate)
    const wd = getWeekDates(ws)
    const y  = curDate.getFullYear()
    const m  = curDate.getMonth() + 1

    if (viewMode === 'month') {
      schedulesApi.monthly(y, m).then(setMonthly).finally(() => setLoading(false))
      return
    }

    // 주간: 주가 두 달에 걸치는 경우 처리
    const monthKeys = [...new Set(wd.map(d => `${d.getFullYear()}-${d.getMonth()+1}`))]
    const reqs = monthKeys.map(k => {
      const [ky, km] = k.split('-').map(Number)
      return schedulesApi.monthly(ky, km)
    })

    Promise.all(reqs).then(results => {
      if (results.length === 1) {
        setMonthly(results[0])
      } else {
        setMonthly({
          schedules:    results.flatMap(r => r.schedules),
          audits:       results.flatMap(r => r.audits),
          performances: results.flatMap(r => r.performances),
        })
      }
    }).finally(() => setLoading(false))
  }, [viewMode, curDate])

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 일정을 삭제하시겠습니까?')) return
    await schedulesApi.delete(id)
    // 재로드 트리거
    setCurDate(d => new Date(d))
  }

  const goPrev = () => {
    const d = new Date(curDate)
    if (viewMode === 'week') d.setDate(d.getDate() - 7)
    else d.setMonth(d.getMonth() - 1)
    setCurDate(d)
  }

  const goNext = () => {
    const d = new Date(curDate)
    if (viewMode === 'week') d.setDate(d.getDate() + 7)
    else d.setMonth(d.getMonth() + 1)
    setCurDate(d)
  }

  const goToday = () => setCurDate(new Date())

  // 헤더 날짜 레이블
  const dateLabel = viewMode === 'week'
    ? (() => {
        const s = weekDates[0]
        const e = weekDates[6]
        if (s.getMonth() === e.getMonth())
          return `${s.getFullYear()}년 ${s.getMonth()+1}월 ${s.getDate()}일 – ${e.getDate()}일`
        return `${s.getFullYear()}년 ${s.getMonth()+1}월 ${s.getDate()}일 – ${e.getMonth()+1}월 ${e.getDate()}일`
      })()
    : `${year}년 ${MONTHS[month-1]}`

  return (
    <div className="flex flex-col h-full">
      {/* 상단 컨트롤 바 */}
      <div className="shrink-0 flex items-center gap-2 px-4 md:px-6 py-3 bg-white border-b border-gray-100">
        {/* 이전/오늘/다음 */}
        <div className="flex items-center gap-1">
          <button onClick={goPrev}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button onClick={goToday}
            className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors">
            오늘
          </button>
          <button onClick={goNext}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* 날짜 레이블 */}
        <h2 className="flex-1 text-sm md:text-base font-bold text-gray-800 text-center md:text-left truncate">
          {dateLabel}
        </h2>

        {/* 뷰 전환 */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(['week', 'month'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {v === 'week' ? '주' : '월'}
            </button>
          ))}
        </div>

        {/* 일정 추가 버튼 */}
        <Link to="/schedule/new"
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm min-h-[36px]">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="hidden sm:inline">일정 추가</span>
          <span className="sm:hidden">추가</span>
        </Link>
      </div>

      {/* 캘린더 영역 */}
      <div className="flex-1 overflow-hidden p-3 md:p-5">
        {loading ? (
          <div className="flex items-center justify-center h-64"><LoadingSpinner /></div>
        ) : viewMode === 'week' ? (
          <div className="overflow-x-auto h-full">
            <div style={{ minWidth: '640px' }} className="h-full">
              <WeekView weekDates={weekDates} monthly={monthly} />
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <MonthView year={year} month={month} monthly={monthly} onDelete={handleDelete} />
          </div>
        )}
      </div>
    </div>
  )
}
