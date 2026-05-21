import request from 'supertest'
import express from 'express'
import cors from 'cors'

// Supabase 클라이언트 모킹
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      gte:    jest.fn().mockReturnThis(),
      lte:    jest.fn().mockReturnThis(),
      order:  jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}))

import performanceRouter from '../routes/performance'

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/performance', performanceRouter)

describe('Performance API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { supabase } = require('../lib/supabase')
    // 기본 select 체인 → 빈 배열 반환
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
      gte:    jest.fn().mockReturnThis(),
      lte:    jest.fn().mockReturnThis(),
      order:  jest.fn().mockResolvedValue({ data: [], error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })
  })

  describe('GET /api/performance', () => {
    it('빈 목록 조회 시 배열 반환', async () => {
      const res = await request(app).get('/api/performance')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe('POST /api/performance', () => {
    it('필수 항목 누락 시 400 반환', async () => {
      const res = await request(app)
        .post('/api/performance')
        .send({ service_type: '전략컨설팅' }) // user_id, client_id 누락
      expect(res.status).toBe(400)
      expect(res.body.error).toBeDefined()
    })

    it('정상 데이터로 등록 시 201 반환', async () => {
      const { supabase } = require('../lib/supabase')
      const mockPerf = {
        id: 'test-uuid',
        user_id: 'user-1',
        client_id: 'client-1',
        service_type: '전략컨설팅',
        revenue: 50000000,
        start_date: '2025-01-01',
        end_date: '2025-03-31',
        status: 'draft',
      }
      supabase.from.mockReturnValue({
        select:  jest.fn().mockReturnThis(),
        insert:  jest.fn().mockReturnThis(),
        eq:      jest.fn().mockReturnThis(),
        single:  jest.fn().mockResolvedValue({ data: mockPerf, error: null }),
      })

      const res = await request(app)
        .post('/api/performance')
        .send({
          user_id: 'user-1',
          client_id: 'client-1',
          service_type: '전략컨설팅',
          revenue: 50000000,
          start_date: '2025-01-01',
          end_date: '2025-03-31',
        })
      expect(res.status).toBe(201)
      expect(res.body.status).toBe('draft')
    })
  })

  describe('POST /api/performance/:id/approve', () => {
    it('action 누락 시 400 반환', async () => {
      const res = await request(app)
        .post('/api/performance/test-id/approve')
        .send({ approver_id: 'manager-1' }) // action 누락
      expect(res.status).toBe(400)
    })

    it('반려 시 comment 없으면 400 반환', async () => {
      const res = await request(app)
        .post('/api/performance/test-id/approve')
        .send({ approver_id: 'manager-1', action: 'rejected' }) // comment 누락
      expect(res.status).toBe(400)
    })
  })
})
