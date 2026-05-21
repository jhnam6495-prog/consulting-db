import { Router, Request, Response } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name')

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data)
})

router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*, projects(*)')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: '고객사를 찾을 수 없습니다.' })
  return res.json(data)
})

export default router
