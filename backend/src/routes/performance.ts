import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'
import { CreatePerformanceInput, UpdatePerformanceInput, ApprovalInput } from '../types/database'

const router = Router()

// 실적 목록 조회 (필터: status, user_id, client_id, service_type, 기간)
router.get('/', async (req: Request, res: Response) => {
  const { status, user_id, client_id, service_type, from, to } = req.query

  let query = supabase
    .from('performances')
    .select(`
      *,
      user:users(id, name, email, role),
      client:clients(id, name, industry),
      project:projects(id, name)
    `)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status as string)
  if (user_id) query = query.eq('user_id', user_id as string)
  if (client_id) query = query.eq('client_id', client_id as string)
  if (service_type) query = query.eq('service_type', service_type as string)
  if (from) query = query.gte('start_date', from as string)
  if (to) query = query.lte('end_date', to as string)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// 실적 단건 조회
router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('performances')
    .select(`
      *,
      user:users(id, name, email, role),
      client:clients(id, name, industry),
      project:projects(id, name),
      approvals(*, approver:users(id, name, role))
    `)
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: '실적을 찾을 수 없습니다.' })
  return res.json(data)
})

// 실적 등록
router.post('/', async (req: Request, res: Response) => {
  const body: CreatePerformanceInput & { user_id: string } = req.body

  if (!body.user_id || !body.client_id || !body.service_type || !body.start_date || !body.end_date) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다. (user_id, client_id, service_type, start_date, end_date)' })
  }

  const { data, error } = await supabase
    .from('performances')
    .insert({ ...body, status: 'draft' })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json(data)
})

// 실적 수정
router.put('/:id', async (req: Request, res: Response) => {
  const body: UpdatePerformanceInput = req.body

  // 승인 완료된 실적은 수정 불가
  const { data: existing } = await supabase
    .from('performances')
    .select('status')
    .eq('id', req.params.id)
    .single()

  if (existing?.status === 'approved') {
    return res.status(400).json({ error: '승인 완료된 실적은 수정할 수 없습니다.' })
  }

  const { data, error } = await supabase
    .from('performances')
    .update(body)
    .eq('id', req.params.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

// 실적 삭제
router.delete('/:id', async (req: Request, res: Response) => {
  const { error } = await supabase
    .from('performances')
    .delete()
    .eq('id', req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(204).send()
})

// 승인 요청 (draft → pending)
router.post('/:id/submit', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('performances')
    .update({ status: 'pending' })
    .eq('id', req.params.id)
    .eq('status', 'draft')
    .select()
    .single()

  if (error || !data) return res.status(400).json({ error: '승인 요청 실패. 임시저장 상태인지 확인하세요.' })
  return res.json(data)
})

// 승인 처리 (pending → approved / rejected)
router.post('/:id/approve', async (req: Request, res: Response) => {
  const body: ApprovalInput & { approver_id: string } = req.body

  if (!body.approver_id || !body.action) {
    return res.status(400).json({ error: 'approver_id와 action은 필수입니다.' })
  }

  if (!['approved', 'rejected'].includes(body.action)) {
    return res.status(400).json({ error: 'action은 approved 또는 rejected여야 합니다.' })
  }

  if (body.action === 'rejected' && !body.comment) {
    return res.status(400).json({ error: '반려 시 사유(comment)를 입력해야 합니다.' })
  }

  // 실적 상태 변경
  const { data: performance, error: perfError } = await supabase
    .from('performances')
    .update({ status: body.action === 'approved' ? 'approved' : 'rejected' })
    .eq('id', req.params.id)
    .eq('status', 'pending')
    .select()
    .single()

  if (perfError || !performance) {
    return res.status(400).json({ error: '처리 실패. 승인대기 상태인지 확인하세요.' })
  }

  // 승인 이력 저장
  const { error: approvalError } = await supabase
    .from('approvals')
    .insert({
      performance_id: req.params.id,
      approver_id: body.approver_id,
      action: body.action,
      comment: body.comment ?? null,
    })

  if (approvalError) return res.status(500).json({ error: approvalError.message })
  return res.json(performance)
})

export default router
