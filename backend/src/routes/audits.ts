import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// ── 분석 라우트 (/:id 보다 먼저 등록) ──────────────────────────────

// 통계 요약
router.get('/stats/summary', async (req: Request, res: Response) => {
  const { from, to } = req.query

  let query = supabase.from('audits').select('status, result, audit_type, revenue')
  if (from) query = query.gte('scheduled_date', from as string)
  if (to)   query = query.lte('scheduled_date', to as string)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const total      = data.length
  const completed  = data.filter(a => a.status === 'completed').length
  const planned    = data.filter(a => a.status === 'planned').length
  const inProgress = data.filter(a => a.status === 'in_progress').length
  const passed     = data.filter(a => a.result === 'pass').length
  const passRate   = completed > 0 ? Math.round((passed / completed) * 100) : 0
  const totalRevenue = data.reduce((sum, a) => sum + Number(a.revenue ?? 0), 0)

  return res.json({ total, completed, planned, inProgress, passed, passRate, totalRevenue })
})

// 월별 추이
router.get('/analytics/trend', async (req: Request, res: Response) => {
  const { from, to } = req.query

  let query = supabase.from('audits').select('scheduled_date, revenue')
  if (from) query = query.gte('scheduled_date', from as string)
  if (to)   query = query.lte('scheduled_date', to as string)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const byMonth: Record<string, { revenue: number; count: number }> = {}
  for (const a of data) {
    const month = (a.scheduled_date as string).slice(0, 7)
    if (!byMonth[month]) byMonth[month] = { revenue: 0, count: 0 }
    byMonth[month].revenue += Number(a.revenue ?? 0)
    byMonth[month].count++
  }
  const result = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v }))
  return res.json(result)
})

// 심사 유형별
router.get('/analytics/by-type', async (req: Request, res: Response) => {
  const { from, to } = req.query

  let query = supabase.from('audits').select('audit_type, revenue, result, status')
  if (from) query = query.gte('scheduled_date', from as string)
  if (to)   query = query.lte('scheduled_date', to as string)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const map: Record<string, { count: number; revenue: number; passed: number; completed: number }> = {}
  for (const a of data) {
    const t = a.audit_type as string
    if (!map[t]) map[t] = { count: 0, revenue: 0, passed: 0, completed: 0 }
    map[t].count++
    map[t].revenue += Number(a.revenue ?? 0)
    if (a.status === 'completed') map[t].completed++
    if (a.result === 'pass') map[t].passed++
  }
  const result = Object.entries(map)
    .map(([audit_type, v]) => ({
      audit_type, ...v,
      passRate: v.completed > 0 ? Math.round((v.passed / v.completed) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
  return res.json(result)
})

// 담당자별
router.get('/analytics/by-user', async (req: Request, res: Response) => {
  const { from, to } = req.query

  let query = supabase.from('audits').select('user_id, revenue, result, status, user:users(id,name)')
  if (from) query = query.gte('scheduled_date', from as string)
  if (to)   query = query.lte('scheduled_date', to as string)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const map: Record<string, { name: string; count: number; revenue: number; passed: number; completed: number }> = {}
  for (const a of data) {
    const uid = a.user_id as string
    const name = (a.user as { name: string } | null)?.name ?? '알 수 없음'
    if (!map[uid]) map[uid] = { name, count: 0, revenue: 0, passed: 0, completed: 0 }
    map[uid].count++
    map[uid].revenue += Number(a.revenue ?? 0)
    if (a.status === 'completed') map[uid].completed++
    if (a.result === 'pass') map[uid].passed++
  }
  const result = Object.entries(map)
    .map(([user_id, v]) => ({
      user_id, ...v,
      passRate: v.completed > 0 ? Math.round((v.passed / v.completed) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
  return res.json(result)
})

// 고객사별
router.get('/analytics/by-client', async (req: Request, res: Response) => {
  const { from, to } = req.query

  let query = supabase.from('audits').select('client_id, revenue, client:clients(id,name)')
  if (from) query = query.gte('scheduled_date', from as string)
  if (to)   query = query.lte('scheduled_date', to as string)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const map: Record<string, { name: string; count: number; revenue: number }> = {}
  for (const a of data) {
    if (!a.client_id) continue
    const cid = a.client_id as string
    const name = (a.client as { name: string } | null)?.name ?? '알 수 없음'
    if (!map[cid]) map[cid] = { name, count: 0, revenue: 0 }
    map[cid].count++
    map[cid].revenue += Number(a.revenue ?? 0)
  }
  const result = Object.entries(map)
    .map(([client_id, v]) => ({ client_id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
  return res.json(result)
})

// ── CRUD ────────────────────────────────────────────────────────────

// 목록 조회
router.get('/', async (req: Request, res: Response) => {
  const { status, audit_type, user_id, client_id, from, to } = req.query

  let query = supabase
    .from('audits')
    .select('*, user:users(id,name), client:clients(id,name)')
    .order('scheduled_date', { ascending: false })

  if (status)     query = query.eq('status', status as string)
  if (audit_type) query = query.eq('audit_type', audit_type as string)
  if (user_id)    query = query.eq('user_id', user_id as string)
  if (client_id)  query = query.eq('client_id', client_id as string)
  if (from)       query = query.gte('scheduled_date', from as string)
  if (to)         query = query.lte('scheduled_date', to as string)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// 단건 조회
router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('audits')
    .select('*, user:users(id,name), client:clients(id,name,industry)')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: '심사 실적을 찾을 수 없습니다.' })
  return res.json(data)
})

// 등록
router.post('/', async (req: Request, res: Response) => {
  const {
    user_id, client_id, audit_type, audit_name,
    audit_body, audit_stage, scheduled_date,
    revenue, status, description,
    completed_date, result, findings_count, observations_count,
  } = req.body

  if (!user_id || !audit_type || !audit_name || !scheduled_date) {
    return res.status(400).json({ error: '담당자, 심사 유형, 심사명, 예정일은 필수입니다.' })
  }

  const { data, error } = await supabase
    .from('audits')
    .insert({
      user_id, client_id, audit_type, audit_name,
      audit_body, audit_stage, scheduled_date,
      completed_date, result,
      findings_count: findings_count ?? 0,
      observations_count: observations_count ?? 0,
      revenue: revenue ?? 0,
      description,
      status: status ?? 'planned',
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json(data)
})

// 수정
router.put('/:id', async (req: Request, res: Response) => {
  const {
    audit_type, audit_name, audit_body, audit_stage,
    scheduled_date, completed_date, result,
    findings_count, observations_count,
    revenue, status, description, client_id,
  } = req.body

  const { data, error } = await supabase
    .from('audits')
    .update({
      audit_type, audit_name, audit_body, audit_stage,
      scheduled_date, completed_date, result,
      findings_count, observations_count,
      revenue, status, description, client_id,
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
  const { error } = await supabase
    .from('audits')
    .delete()
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(204).send()
})

export default router
