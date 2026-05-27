import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// 월별 일정 목록 (schedules + audits + performance 통합)
router.get('/monthly', async (req: Request, res: Response) => {
  const { year, month } = req.query
  if (!year || !month) return res.status(400).json({ error: 'year, month 필수입니다.' })

  const y = Number(year)
  const m = Number(month)
  const from = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const to   = `${y}-${String(m).padStart(2, '0')}-${lastDay}`

  const [schedulesRes, auditsRes, perfRes] = await Promise.all([
    supabase.from('schedules')
      .select('*, user:users(id,name)')
      .gte('start_date', from).lte('start_date', to)
      .order('start_date').order('start_time', { ascending: true, nullsFirst: false }),

    supabase.from('audits')
      .select('id, audit_name, audit_type, scheduled_date, status, user_id, user:users(id,name), client:clients(id,name)')
      .gte('scheduled_date', from).lte('scheduled_date', to),

    supabase.from('performances')
      .select('id, client_id, service_type, start_date, end_date, status, user_id, user:users(id,name), client:clients(id,name)')
      .lte('start_date', to)
      .gte('end_date', from),
  ])

  if (schedulesRes.error) return res.status(500).json({ error: schedulesRes.error.message })

  return res.json({
    schedules:   schedulesRes.data ?? [],
    audits:      auditsRes.data    ?? [],
    performances: perfRes.data     ?? [],
  })
})

// 날짜별 일정 (특정 날짜)
router.get('/daily', async (req: Request, res: Response) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ error: 'date 필수입니다.' })

  const [schedulesRes, auditsRes, perfRes] = await Promise.all([
    supabase.from('schedules')
      .select('*, user:users(id,name)')
      .eq('start_date', date as string)
      .order('start_time', { ascending: true, nullsFirst: false }),

    supabase.from('audits')
      .select('id, audit_name, audit_type, scheduled_date, status, user_id, user:users(id,name), client:clients(id,name)')
      .eq('scheduled_date', date as string),

    supabase.from('performances')
      .select('id, client_id, service_type, start_date, end_date, status, user_id, user:users(id,name), client:clients(id,name)')
      .lte('start_date', date as string)
      .gte('end_date', date as string),
  ])

  return res.json({
    schedules:    schedulesRes.data  ?? [],
    audits:       auditsRes.data     ?? [],
    performances: perfRes.data       ?? [],
  })
})

// 다가오는 일정 (오늘 이후 N일)
router.get('/upcoming', async (req: Request, res: Response) => {
  const days  = Number(req.query.days ?? 14)
  const today = new Date().toISOString().slice(0, 10)
  const until = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)

  const [schedulesRes, auditsRes] = await Promise.all([
    supabase.from('schedules')
      .select('*, user:users(id,name)')
      .gte('start_date', today).lte('start_date', until)
      .neq('status', 'cancelled')
      .order('start_date').order('start_time', { ascending: true, nullsFirst: false })
      .limit(20),

    supabase.from('audits')
      .select('id, audit_name, audit_type, scheduled_date, status, user:users(id,name), client:clients(id,name)')
      .gte('scheduled_date', today).lte('scheduled_date', until)
      .neq('status', 'cancelled')
      .order('scheduled_date')
      .limit(20),
  ])

  return res.json({
    schedules: schedulesRes.data ?? [],
    audits:    auditsRes.data    ?? [],
  })
})

// 단건 조회
router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('schedules')
    .select('*, user:users(id,name)')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: '일정을 찾을 수 없습니다.' })
  return res.json(data)
})

// 목록 조회
router.get('/', async (req: Request, res: Response) => {
  const { from, to, type, user_id } = req.query

  let query = supabase
    .from('schedules')
    .select('*, user:users(id,name)')
    .order('start_date').order('start_time', { ascending: true, nullsFirst: false })

  if (from)    query = query.gte('start_date', from as string)
  if (to)      query = query.lte('start_date', to as string)
  if (type)    query = query.eq('type', type as string)
  if (user_id) query = query.eq('user_id', user_id as string)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// 등록
router.post('/', async (req: Request, res: Response) => {
  const {
    user_id, title, description, start_date, end_date,
    start_time, end_time, all_day, type, location, status,
    related_audit_id, related_performance_id,
  } = req.body

  if (!title?.trim() || !start_date) {
    return res.status(400).json({ error: '제목과 시작일은 필수입니다.' })
  }

  const { data, error } = await supabase
    .from('schedules')
    .insert({
      user_id, title: title.trim(), description,
      start_date, end_date: end_date || start_date,
      start_time: all_day ? null : start_time,
      end_time:   all_day ? null : end_time,
      all_day: all_day ?? true,
      type: type ?? 'meeting',
      location, status: status ?? 'scheduled',
      related_audit_id: related_audit_id || null,
      related_performance_id: related_performance_id || null,
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json(data)
})

// 수정
router.put('/:id', async (req: Request, res: Response) => {
  const {
    title, description, start_date, end_date,
    start_time, end_time, all_day, type, location, status,
  } = req.body

  const { data, error } = await supabase
    .from('schedules')
    .update({
      title, description, start_date, end_date,
      start_time: all_day ? null : start_time,
      end_time:   all_day ? null : end_time,
      all_day, type, location, status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// 삭제
router.delete('/:id', async (req: Request, res: Response) => {
  const { error } = await supabase.from('schedules').delete().eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  return res.status(204).send()
})

export default router
