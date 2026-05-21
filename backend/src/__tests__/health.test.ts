import request from 'supertest'
import express from 'express'

const app = express()
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: '컨설팅 실적 API 서버 정상 동작 중' })
})

describe('GET /health', () => {
  it('200 응답과 status: ok 반환', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.message).toBeDefined()
  })
})
