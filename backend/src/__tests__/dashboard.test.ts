import request from 'supertest'
import express from 'express'

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

import dashboardRouter from '../routes/dashboard'

const app = express()
app.use(express.json())
app.use('/api/dashboard', dashboardRouter)

const mockChain = (resolvedData: unknown) => {
  const result = { data: resolvedData, error: null }
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    eq:     jest.fn().mockReturnThis(),
    gte:    jest.fn().mockReturnThis(),
    lte:    jest.fn().mockReturnThis(),
    // Supabase 쿼리 빌더는 thenable — await query 시 실행됨
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  }
  return chain
}

describe('Dashboard API', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('GET /api/dashboard/summary', () => {
    it('KPI 구조 반환', async () => {
      const { supabase } = require('../lib/supabase')
      supabase.from.mockReturnValue(
        mockChain([
          { status: 'approved', revenue: 100000000 },
          { status: 'approved', revenue: 50000000 },
          { status: 'pending',  revenue: 30000000 },
          { status: 'draft',    revenue: 20000000 },
        ])
      )

      const res = await request(app).get('/api/dashboard/summary')
      expect(res.status).toBe(200)
      expect(res.body).toMatchObject({
        totalRevenue:   150000000,
        totalCount:     4,
        approvedCount:  2,
        pendingCount:   1,
        approvalRate:   50,
      })
    })

    it('데이터 없을 때 승인률 0 반환', async () => {
      const { supabase } = require('../lib/supabase')
      supabase.from.mockReturnValue(mockChain([]))

      const res = await request(app).get('/api/dashboard/summary')
      expect(res.status).toBe(200)
      expect(res.body.approvalRate).toBe(0)
      expect(res.body.totalRevenue).toBe(0)
    })
  })

  describe('GET /api/dashboard/revenue-trend', () => {
    it('월별 매출 집계 반환', async () => {
      const { supabase } = require('../lib/supabase')
      supabase.from.mockReturnValue(
        mockChain([
          { revenue: 100000000, start_date: '2025-01-15' },
          { revenue: 50000000,  start_date: '2025-01-20' },
          { revenue: 80000000,  start_date: '2025-02-10' },
        ])
      )

      const res = await request(app).get('/api/dashboard/revenue-trend')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body[0]).toHaveProperty('month')
      expect(res.body[0]).toHaveProperty('revenue')
      // 1월 합산 = 150,000,000
      const jan = res.body.find((r: any) => r.month === '2025-01')
      expect(jan?.revenue).toBe(150000000)
    })
  })
})
