import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('users')
    .select('*, team:teams(id, name)')
    .order('name')

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

router.get('/managers', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, team:teams(id, name)')
    .eq('role', 'manager')
    .order('name')

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

export default router
