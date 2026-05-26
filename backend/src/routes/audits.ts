import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

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
    revenue, description,
  } = req.body

  if (!user_id || !audit_type || !audit_name || !scheduled_date) {
    return res.status(400).json({ error: '담당자, 심사 유형, 심사명, 예정일은 필수입니다.' })
  }

  const { data, error } = await supabase
    .from('audits')
    .insert({
      user_id, client_id, audit_type, audit_name,
      audit_body, audit_stage, scheduled_date,
      revenue: revenue ?? 0,
      description,
      status: 'planned',
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

export default router
