import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { schedulesApi } from '../api/schedules'
import type { MonthlyData } from '../api/schedules'
import { usersApi } from '../api/users'
import type { User } from '../types/database'
import LoadingSpinner from '../components/LoadingSpinner'

// ── 상수 ──────────────────────────────────────────────────────────
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MONTHS   = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const HOUR_H   = 56
const DAY_S    = 7
const DAY_E    = 21
const HOURS    = Array.from({ length: DAY_E - DAY_S }, (_, i) => i + DAY_S)

type ViewMode = 'month' | 'week' | 'day'

// 이벤트 블록 색상
const EVT_BG: Record<string, string> = {
  meeting: 'bg-emerald-100', call: 'bg-sky-100',   visit: 'bg-amber-100',
  deadline: 'bg-red-100',    other: 'bg-gray-100', audit: 'bg-violet-100', performance: 'bg-blue-100',
}
const EVT_TX: Record<string, string> = {
  meeting: 'text-emerald-800', call: 'text-sky-800',   visit: 'text-amber-800',
  deadline: 'text-red-800',    other: 'text-gray-600', audit: 'text-violet-800', performance: 'text-blue-800',
}
// 시간 그리드 블록 색상
const BLK_BG: Record<string, string> = {
  meeting: 'bg-emerald-50',  call: 'bg-sky-50',   visit: 'bg-amber-50',
  deadline: 'bg-red-50',     other: 'bg-gray-50', audit: 'bg-violet-50', performance: 'bg-blue-50',
}
const BLK_BD: Record<string, string> = {
  meeting: 'border-l-4 border-emerald-500', call: 'border-l-4 border-sky-500',
  visit: 'border-l-4 border-amber-500',     deadline: 'border-l-4 border-red-500',
  other: 'border-l-4 border-gray-400',      audit: 'border-l-4 border-violet-500',
  performance: 'border-l-4 border-blue-500',
}
const BLK_TX: Record<string, string> = {
  meeting: 'text-emerald-800', call: 'text-sky-800',   visit: 'text-amber-800',
  deadline: 'text-red-800',    other: 'text-gray-600', audit: 'text-violet-800', performance: 'text-blue-800',
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

function getWeekDates(ws: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ws)
    d.setDate(ws.getDate() + i)
    return d
  })
}

function buildMonthCells(year: number, month: number) {
  const firstDay    = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const prevEnd     = new Date(year, month - 1, 0).getDate()
  const cells: { day: number; cur: boolean; date: string }[] = []

  for (let i = firstDay - 1; i >= 0; i--) {
    const d  = prevEnd - i
    const py = month === 1 ? year - 1 : year
    const pm = month === 1 ? 12 : month - 1
    cells.push({ day: d, cur: false, date: `${py}-${String(pm).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, cur: true, date: `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}` })
  }
  const ny = month === 12 ? year + 1 : year
  const nm = month === 12 ? 1 : month + 1
  let nd   = 1
  while (cells.length < 42) {
    cells.push({ day: nd, cur: false, date: `${ny}-${String(nm).padStart(2,'0')}-${String(nd).padStart(2,'0')}` })
    nd++
  }
  return cells
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
  id: string; kind: 'schedule' | 'audit' | 'performance'
  date: string; title: string; allDay: boolean
  startTime: string | null; endTime: string | null
  typeKey: string; link: string; rawId?: string; userId?: string | null
}

function buildEvents(monthly: MonthlyData | null, dates: string[], userId: string | null): CalEvent[] {
  if (!monthly) return []
  const ds = new Set(dates)
  const out: CalEvent[] = []

  monthly.schedules
    .filter(s => ds.has(s.start_date) && (!userId || s.user_id === userId))
    .forEach(s => out.push({
      id: s.id, kind: 'schedule', date: s.start_date, title: s.title, allDay: s.all_day,
      startTime: s.all_day ? null : (s.start_time ?? null), endTime: s.all_day ? null : (s.end_time ?? null),
      typeKey: s.type, link: `/schedule/${s.id}/edit`, rawId: s.id, userId: s.user_id,
    }))

  monthly.audits
    .filter(a => ds.has(a.scheduled_date) && (!userId || a.user?.id === userId))
    .forEach(a => out.push({
      id: a.id, kind: 'audit', date: a.scheduled_date,
      title: a.client?.name ? `${a.audit_name} · ${a.client.name}` : a.audit_name,
      allDay: true, startTime: null, endTime: null,
      typeKey: 'audit', link: `/audits/${a.id}`, userId: a.user?.id,
    }))

  monthly.performances
    .filter(p => !userId || p.user?.id === userId)
    .filter(p => ds.has(p.start_date))
    .forEach(p => out.push({
      id: p.id, kind: 'performance', date: p.start_date,
      title: p.client?.name ? `${p.service_type} · ${p.client.name}` : p.service_type,
      allDay: true, startTime: null, endTime: null,
      typeKey: 'performance', link: `/performance/${p.id}`, userId: p.user?.id,
    }))

  return out
}

function countByUser(monthly: MonthlyData | null): Record<string, number> {
  if (!monthly) return {}
  const cnt: Record<string, number> = {}
  const inc = (uid?: string | null) => { if (uid) cnt[uid] = (cnt[uid] || 0) + 1 }
  monthly.schedules.forEach(s => inc(s.user_id))
  monthly.audits.forEach(a => inc(a.user?.id))
  monthly.performances.forEach(p => inc(p.user?.id))
  return cnt
}

// ── 담당자 필터 칩 ────────────────────────────────────────────────
function FilterBar({ monthly, users, selectedUser, onSelect }: {
  monthly:      MonthlyData | null
  users:        User[]
  selectedUser: string | null
  onSelect:     (id: string | null) => void
}) {
  const counts = countByUser(monthly)
  const total  = (monthly?.schedules.length ?? 0) + (monthly?.audits.length ?? 0) + (monthly?.performances.length ?? 0)

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
          !selectedUser ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}>
        전체 <span className="font-bold">{total}</span>
      </button>
      {users.map(u => {
        const c = counts[u.id] ?? 0
        if (!c) return null
        return (
          <button key={u.id}
            onClick={() => onSelect(selectedUser === u.id ? null : u.id)}
            className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedUser === u.id ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {u.name} <span className="font-bold">{c}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── 월간 뷰 ───────────────────────────────────────────────────────
function MonthView({ year, month, monthly, users, selectedUser, onSelectUser }: {
  year: number; month: number
  monthly: MonthlyData | null
  users: User[]; selectedUser: string | null
  onSelectUser: (id: string | null) => void
}) {
  const today = toDateStr(new Date())
  const cells = buildMonthCells(year, month)
  const allDates = cells.map(c => c.date)
  const events   = buildEvents(monthly, allDates, selectedUser)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* 담당자 필터 */}
      <FilterBar monthly={monthly} users={users} selectedUser={selectedUser} onSelect={onSelectUser} />

      {/* 캘린더 */}
      <div className="flex-1 overflow-auto mt-3">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 bg-gray-50 border border-gray-200 rounded-t-xl overflow-hidden">
          {WEEKDAYS.map((d, i) => (
            <div key={d} className={`text-center py-2 text-xs font-semibold tracking-wider ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'
            }`}>{d}</div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div
          className="grid grid-cols-7 border-l border-b border-gray-200"
          style={{ gridAutoRows: 'minmax(96px, auto)' }}>
          {cells.map((cell, idx) => {
            const dayEvents = events.filter(e => e.date === cell.date)
            const isToday   = cell.date === today
            const wd        = idx % 7

            return (
              <div key={idx}
                className={`border-t border-r border-gray-200 p-1 flex flex-col min-w-0 ${
                  !cell.cur ? 'bg-gray-50/60' : 'bg-white'
                }`}>
                {/* 날짜 번호 */}
                <div className="flex justify-end mb-0.5">
                  <Link
                    to={`/schedule/new?date=${cell.date}`}
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-semibold transition-all hover:scale-110 ${
                      isToday
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : !cell.cur ? 'text-gray-300'
                        : wd === 0 ? 'text-red-400 hover:bg-red-50'
                        : wd === 6 ? 'text-blue-400 hover:bg-blue-50'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {cell.day}
                  </Link>
                </div>

                {/* 이벤트 블록 */}
                <div className="flex-1 space-y-0.5 min-w-0 overflow-hidden">
                  {dayEvents.slice(0, 3).map(e => (
                    <Link key={e.id} to={e.link}
                      className={`flex items-center gap-0.5 text-[11px] font-medium rounded-[4px] px-1 py-[1px] truncate hover:opacity-80 transition-opacity
                        ${EVT_BG[e.typeKey] ?? 'bg-gray-100'} ${EVT_TX[e.typeKey] ?? 'text-gray-600'}`}>
                      {!e.allDay && e.startTime && (
                        <span className="opacity-60 shrink-0 text-[10px]">{fmtHM(e.startTime)}</span>
                      )}
                      <span className="truncate">{e.title}</span>
                    </Link>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[11px] text-gray-400 px-1 cursor-default">
                      +{dayEvents.length - 3}개 더보기
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── 주간 뷰 ───────────────────────────────────────────────────────
function WeekView({ weekDates, monthly, selectedUser }: {
  weekDates: Date[]; monthly: MonthlyData | null; selectedUser: string | null
}) {
  const navigate = useNavigate()
  const todayStr = toDateStr(new Date())
  const dateStrs = weekDates.map(toDateStr)
  const events   = buildEvents(monthly, dateStrs, selectedUser)

  const now      = new Date()
  const nowPx    = (now.getHours() + now.getMinutes() / 60 - DAY_S) * HOUR_H
  const todayIdx = dateStrs.indexOf(todayStr)

  const allDayMap: Record<string, CalEvent[]> = {}
  const timedMap:  Record<string, CalEvent[]> = {}
  dateStrs.forEach(ds => {
    allDayMap[ds] = events.filter(e => e.date === ds && e.allDay)
    timedMap[ds]  = events.filter(e => e.date === ds && !e.allDay)
  })

  const COL = '52px repeat(7, minmax(0, 1fr))'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
      {/* 요일 헤더 */}
      <div className="grid border-b border-gray-200 shrink-0" style={{ gridTemplateColumns: COL }}>
        <div className="border-r border-gray-200 bg-gray-50" />
        {weekDates.map((d, i) => {
          const ds = toDateStr(d); const isToday = ds === todayStr
          const isSun = i === 0; const isSat = i === 6
          return (
            <div key={i} className={`border-l border-gray-200 text-center py-2.5 ${isToday ? 'bg-indigo-50' : 'bg-gray-50'}`}>
              <p className={`text-[11px] font-semibold tracking-wider mb-1 ${isSun ? 'text-red-400' : isSat ? 'text-blue-400' : 'text-gray-400'}`}>
                {WEEKDAYS[i]}
              </p>
              <button onClick={() => navigate(`/schedule/new?date=${ds}`)}
                className={`w-8 h-8 rounded-full text-sm font-bold mx-auto flex items-center justify-center transition-all hover:scale-105 ${
                  isToday ? 'bg-indigo-600 text-white shadow-sm'
                  : isSun ? 'text-red-500 hover:bg-red-50'
                  : isSat ? 'text-blue-500 hover:bg-blue-50'
                  : 'text-gray-800 hover:bg-gray-100'
                }`}>{d.getDate()}</button>
            </div>
          )
        })}
      </div>

      {/* 종일 스트립 */}
      <div className="grid border-b border-gray-200 shrink-0" style={{ gridTemplateColumns: COL }}>
        <div className="border-r border-gray-200 flex items-center justify-end pr-2 py-1 bg-gray-50">
          <span className="text-[10px] font-medium text-gray-400">종일</span>
        </div>
        {dateStrs.map((ds, i) => (
          <div key={i} className={`border-l border-gray-200 min-h-[26px] p-0.5 ${i === todayIdx ? 'bg-indigo-50/40' : ''}`}>
            {allDayMap[ds].map(e => (
              <Link key={e.id} to={e.link}
                className={`block text-[11px] font-semibold px-1.5 py-[2px] rounded mb-0.5 truncate text-white hover:opacity-85 transition-opacity ${
                  e.typeKey === 'audit' ? 'bg-violet-500' : e.typeKey === 'performance' ? 'bg-blue-500' :
                  e.typeKey === 'meeting' ? 'bg-emerald-500' : e.typeKey === 'call' ? 'bg-sky-500' :
                  e.typeKey === 'visit' ? 'bg-amber-500' : e.typeKey === 'deadline' ? 'bg-red-500' : 'bg-gray-500'
                }`}>{e.title}</Link>
            ))}
          </div>
        ))}
      </div>

      {/* 시간 그리드 */}
      <div className="overflow-y-auto" style={{ height: 'calc(100vh - 300px)', minHeight: '360px' }}>
        <div className="grid" style={{ gridTemplateColumns: COL, height: `${(DAY_E - DAY_S) * HOUR_H}px` }}>
          <div className="border-r border-gray-200 relative bg-gray-50/50">
            {HOURS.map((h, i) => (
              <div key={h} className="absolute inset-x-0 flex justify-end pr-2"
                style={{ top: `${i * HOUR_H}px`, height: `${HOUR_H}px` }}>
                <span className="text-[11px] text-gray-400 -translate-y-[9px] select-none">{String(h).padStart(2,'0')}:00</span>
              </div>
            ))}
          </div>
          {dateStrs.map((ds, ci) => {
            const isToday = ds === todayStr
            return (
              <div key={ci} className={`relative border-l border-gray-200 ${isToday ? 'bg-indigo-50/15' : ''}`}>
                {HOURS.map((h, i) => (
                  <div key={h}
                    style={{ top: `${i * HOUR_H}px`, height: `${HOUR_H}px` }}
                    className="absolute inset-x-0 border-t border-gray-100 hover:bg-gray-50/70 cursor-pointer transition-colors"
                    onClick={() => navigate(`/schedule/new?date=${ds}`)}>
                    <div className="absolute inset-x-0 border-t border-gray-50/80" style={{ top: `${HOUR_H/2}px` }} />
                  </div>
                ))}
                {isToday && nowPx >= 0 && nowPx <= (DAY_E - DAY_S) * HOUR_H && (
                  <div className="absolute inset-x-0 z-20 flex items-center pointer-events-none" style={{ top: `${nowPx}px` }}>
                    <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5 shrink-0 shadow-sm" />
                    <div className="flex-1 h-[2px] bg-red-500" />
                  </div>
                )}
                {timedMap[ds].map(e => {
                  const sm = toMins(e.startTime); const em = e.endTime ? toMins(e.endTime) : sm + 60
                  if (sm < DAY_S * 60) return null
                  const tp = (sm / 60 - DAY_S) * HOUR_H
                  const ht = Math.max((em - sm) / 60 * HOUR_H, 24)
                  if (tp >= (DAY_E - DAY_S) * HOUR_H) return null
                  return (
                    <Link key={e.id} to={e.link}
                      style={{ top: `${tp}px`, height: `${ht}px` }}
                      className={`absolute left-[2px] right-[2px] z-10 rounded overflow-hidden px-1.5 py-0.5
                        hover:brightness-95 transition-all
                        ${BLK_BG[e.typeKey] ?? 'bg-gray-50'}
                        ${BLK_BD[e.typeKey] ?? 'border-l-4 border-gray-400'}
                        ${BLK_TX[e.typeKey] ?? 'text-gray-700'}`}>
                      <p className="text-[11px] font-semibold leading-tight truncate">{e.title}</p>
                      {ht >= 38 && <p className="text-[10px] opacity-70 leading-tight">{fmtHM(e.startTime)}{e.endTime ? `–${fmtHM(e.endTime)}` : ''}</p>}
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

// ── 일간 뷰 ───────────────────────────────────────────────────────
function DayView({ date, monthly, selectedUser }: {
  date: string; monthly: MonthlyData | null; selectedUser: string | null
}) {
  const navigate = useNavigate()
  const todayStr = toDateStr(new Date())
  const events   = buildEvents(monthly, [date], selectedUser)
  const allDay   = events.filter(e => e.allDay)
  const timed    = events.filter(e => !e.allDay)

  const now   = new Date()
  const nowPx = date === todayStr
    ? (now.getHours() + now.getMinutes() / 60 - DAY_S) * HOUR_H : -1

  const d     = new Date(date + 'T00:00:00')
  const label = d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
      <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <h3 className="font-semibold text-gray-900 text-sm">{label}</h3>
        <Link to={`/schedule/new?date=${date}`}
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
          + 일정 추가
        </Link>
      </div>
      {allDay.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap gap-1.5">
          {allDay.map(e => (
            <Link key={e.id} to={e.link}
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${EVT_BG[e.typeKey] ?? 'bg-gray-100'} ${EVT_TX[e.typeKey] ?? 'text-gray-600'}`}>
              {e.title}
            </Link>
          ))}
        </div>
      )}
      <div className="overflow-y-auto" style={{ height: 'calc(100vh - 300px)', minHeight: '400px' }}>
        <div className="relative" style={{ height: `${(DAY_E - DAY_S) * HOUR_H}px` }}>
          {HOURS.map((h, i) => (
            <div key={h}
              style={{ top: `${i * HOUR_H}px`, height: `${HOUR_H}px` }}
              className="absolute inset-x-0 flex items-start border-t border-gray-100 cursor-pointer hover:bg-gray-50/60 transition-colors"
              onClick={() => navigate(`/schedule/new?date=${date}`)}>
              <span className="text-[11px] text-gray-400 pl-4 -translate-y-[9px] shrink-0 w-[56px]">
                {String(h).padStart(2,'0')}:00
              </span>
              <div className="absolute left-[56px] right-0 border-t border-gray-50" style={{ top: `${HOUR_H/2}px` }} />
            </div>
          ))}
          {nowPx >= 0 && nowPx <= (DAY_E - DAY_S) * HOUR_H && (
            <div className="absolute z-20 flex items-center pointer-events-none" style={{ top: `${nowPx}px`, left: '56px', right: 0 }}>
              <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5 shrink-0" />
              <div className="flex-1 h-[2px] bg-red-500" />
            </div>
          )}
          {timed.map(e => {
            const sm = toMins(e.startTime); const em = e.endTime ? toMins(e.endTime) : sm + 60
            if (sm < DAY_S * 60) return null
            const tp = (sm / 60 - DAY_S) * HOUR_H
            const ht = Math.max((em - sm) / 60 * HOUR_H, 24)
            if (tp >= (DAY_E - DAY_S) * HOUR_H) return null
            return (
              <Link key={e.id} to={e.link}
                style={{ top: `${tp}px`, height: `${ht}px`, left: '60px' }}
                className={`absolute right-2 z-10 rounded overflow-hidden px-2 py-1
                  ${BLK_BG[e.typeKey] ?? 'bg-gray-50'}
                  ${BLK_BD[e.typeKey] ?? 'border-l-4 border-gray-400'}
                  ${BLK_TX[e.typeKey] ?? 'text-gray-700'}`}>
                <p className="text-xs font-semibold leading-tight truncate">{e.title}</p>
                {ht >= 36 && <p className="text-[11px] opacity-70">{fmtHM(e.startTime)}{e.endTime ? `–${fmtHM(e.endTime)}` : ''}</p>}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// 메인 페이지
// ════════════════════════════════════════════════════════════════════
export default function SchedulePage() {
  const now = new Date()

  const [viewMode,     setViewMode]     = useState<ViewMode>('month')
  const [curDate,      setCurDate]      = useState<Date>(now)
  const [monthly,      setMonthly]      = useState<MonthlyData | null>(null)
  const [users,        setUsers]        = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [loading,      setLoading]      = useState(true)

  const year  = curDate.getFullYear()
  const month = curDate.getMonth() + 1

  useEffect(() => { usersApi.list().then(setUsers) }, [])

  useEffect(() => {
    setLoading(true)

    if (viewMode !== 'week') {
      schedulesApi.monthly(year, month).then(setMonthly).finally(() => setLoading(false))
      return
    }
    const ws = getWeekStart(curDate)
    const wd = getWeekDates(ws)
    const monthKeys = [...new Set(wd.map(d => `${d.getFullYear()}-${d.getMonth()+1}`))]
    Promise.all(
      monthKeys.map(k => { const [ky, km] = k.split('-').map(Number); return schedulesApi.monthly(ky, km) })
    ).then(results => {
      setMonthly(results.length === 1 ? results[0] : {
        schedules:    results.flatMap(r => r.schedules),
        audits:       results.flatMap(r => r.audits),
        performances: results.flatMap(r => r.performances),
      })
    }).finally(() => setLoading(false))
  }, [viewMode, curDate])

  const goPrev = () => {
    const d = new Date(curDate)
    if (viewMode === 'week') d.setDate(d.getDate() - 7)
    else if (viewMode === 'day') d.setDate(d.getDate() - 1)
    else d.setMonth(d.getMonth() - 1)
    setCurDate(d)
  }
  const goNext = () => {
    const d = new Date(curDate)
    if (viewMode === 'week') d.setDate(d.getDate() + 7)
    else if (viewMode === 'day') d.setDate(d.getDate() + 1)
    else d.setMonth(d.getMonth() + 1)
    setCurDate(d)
  }

  const weekStart = getWeekStart(curDate)
  const weekDates = getWeekDates(weekStart)

  const dateLabel =
    viewMode === 'month' ? `${year}년 ${MONTHS[month-1]}` :
    viewMode === 'week'  ? (() => {
      const s = weekDates[0], e = weekDates[6]
      return s.getMonth() === e.getMonth()
        ? `${year}년 ${s.getMonth()+1}월 ${s.getDate()}일 – ${e.getDate()}일`
        : `${year}년 ${s.getMonth()+1}월 ${s.getDate()}일 – ${e.getMonth()+1}월 ${e.getDate()}일`
    })() :
    curDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

  return (
    <div className="flex flex-col h-full">
      {/* 컨트롤 바 */}
      <div className="shrink-0 flex items-center gap-2 px-4 md:px-6 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-1">
          <button onClick={goPrev}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button onClick={() => setCurDate(new Date())}
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

        <h2 className="flex-1 text-sm md:text-base font-bold text-gray-800 text-center md:text-left truncate">
          {dateLabel}
        </h2>

        {/* 뷰 전환 */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {(['month', 'week', 'day'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {v === 'month' ? '월' : v === 'week' ? '주' : '일'}
            </button>
          ))}
        </div>

        <Link to="/schedule/new"
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm min-h-[36px]">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="hidden sm:inline">일정 추가</span>
          <span className="sm:hidden">추가</span>
        </Link>
      </div>

      {/* 뷰 영역 */}
      <div className="flex-1 overflow-hidden p-3 md:p-5 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center flex-1"><LoadingSpinner /></div>
        ) : viewMode === 'month' ? (
          <MonthView
            year={year} month={month} monthly={monthly}
            users={users} selectedUser={selectedUser} onSelectUser={setSelectedUser}
          />
        ) : viewMode === 'week' ? (
          <div className="overflow-x-auto flex-1">
            <div style={{ minWidth: '640px' }} className="h-full">
              <WeekView weekDates={weekDates} monthly={monthly} selectedUser={selectedUser} />
            </div>
          </div>
        ) : (
          <DayView date={toDateStr(curDate)} monthly={monthly} selectedUser={selectedUser} />
        )}
      </div>
    </div>
  )
}
