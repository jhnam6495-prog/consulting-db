import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import performanceRouter from './routes/performance'
import dashboardRouter from './routes/dashboard'
import clientsRouter from './routes/clients'
import usersRouter from './routes/users'
import auditsRouter from './routes/audits'
import schedulesRouter from './routes/schedules'
import { errorHandler } from './middleware/errorHandler'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
  : ['http://localhost:5173']

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: ${origin} not allowed`))
    }
  },
  credentials: true,
}))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: '컨설팅 실적 API 서버 정상 동작 중' })
})

app.use('/api/performance', performanceRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/clients', clientsRouter)
app.use('/api/users', usersRouter)
app.use('/api/audits', auditsRouter)
app.use('/api/schedules', schedulesRouter)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`)
})

export default app
