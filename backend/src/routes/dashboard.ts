import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

// KPI 요약
router.get('/summary', async (req: Request, res: Response) => {
  const { from, to } = req.query

  let query = supabase.from('performances').select('status, revenue')
  if (from) query = query.gte('start_date', from as string)
  if (to)   query = query.lte('end_date', to as string)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const total    = data.length
  const approved = data.filter(p => p.status === 'approved')
  const pending  = data.filter(p => p.status === 'pending')
  const rejected = data.filter(p => p.status === 'rejected')
  const totalRevenue = approved.reduce((sum, p) => sum + Number(p.revenue), 0)

  return res.json({
    totalRevenue,
    totalCount: total,
    approvedCount: approved.length,
    pendingCount:  pending.length,
    rejectedCount: rejected.length,
    approvalRate: total > 0 ? Math.round((approved.length / total) * 100) : 0,
  })
})

// 월별 매출 추이
router.get('/revenue-trend', async (req: Request, res: Response) => {
  const { from, to } = req.query

  let query = supabase
    .from('performances')
    .select('revenue, start_date')
    .eq('status', 'approved')
  if (from) query = query.gte('start_date', from as string)
  if (to)   query = query.lte('start_date', to as string)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const monthMap: Record<string, number> = {}
  for (const p of data) {
    const month = p.start_date.slice(0, 7)
    monthMap[month] = (monthMap[month] ?? 0) + Number(p.revenue)
  }

  return res.json(
    Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue }))
  )
})

// 서비스 유형별 집계
router.get('/by-service', async (req: Request, res: Response) => {
  const { from, to } = req.query

  let query = supabase
    .from('performances')
    .select('service_type, revenue')
    .eq('status', 'approved')
  if (from) query = query.gte('start_date', from as string)
  if (to)   query = query.lte('end_date', to as string)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const map: Record<string, { count: number; revenue: number }> = {}
  for (const p of data) {
    if (!map[p.service_type]) map[p.service_type] = { count: 0, revenue: 0 }
    map[p.service_type].count   += 1
    map[p.service_type].revenue += Number(p.revenue)
  }

  return res.json(
    Object.entries(map)
      .map(([service_type, s]) => ({ service_type, ...s }))
      .sort((a, b) => b.revenue - a.revenue)
  )
})

// 담당자별 집계
router.get('/by-user', async (req: Request, res: Response) => {
  const { from, to } = req.query

  let query = supabase
    .from('performances')
    .select('user_id, revenue, user:users(name)')
    .eq('status', 'approved')
  if (from) query = query.gte('start_date', from as string)
  if (to)   query = query.lte('end_date', to as string)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const map: Record<string, { name: string; count: number; revenue: number }> = {}
  for (const p of data) {
    const name = (p.user as any)?.name ?? '알 수 없음'
    if (!map[p.user_id]) map[p.user_id] = { name, count: 0, revenue: 0 }
    map[p.user_id].count   += 1
    map[p.user_id].revenue += Number(p.revenue)
  }

  return res.json(
    Object.entries(map)
      .map(([user_id, s]) => ({ user_id, ...s }))
      .sort((a, b) => b.revenue - a.revenue)
  )
})

// 고객사별 집계
router.get('/by-client', async (req: Request, res: Response) => {
  const { from, to } = req.query

  let query = supabase
    .from('performances')
    .select('client_id, revenue, client:clients(name, industry)')
    .eq('status', 'approved')
  if (from) query = query.gte('start_date', from as string)
  if (to)   query = query.lte('end_date', to as string)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const map: Record<string, { name: string; industry: string | null; count: number; revenue: number }> = {}
  for (const p of data) {
    const c = p.client as any
    if (!map[p.client_id]) map[p.client_id] = { name: c?.name ?? '알 수 없음', industry: c?.industry ?? null, count: 0, revenue: 0 }
    map[p.client_id].count   += 1
    map[p.client_id].revenue += Number(p.revenue)
  }

  return res.json(
    Object.entries(map)
      .map(([client_id, s]) => ({ client_id, ...s }))
      .sort((a, b) => b.revenue - a.revenue)
  )
})

export default router
