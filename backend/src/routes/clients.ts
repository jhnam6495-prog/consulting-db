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

router.post('/', async (req: Request, res: Response) => {
  const { name, industry, contact_name, contact_email } = req.body
  if (!name?.trim()) return res.status(400).json({ error: '고객사명은 필수입니다.' })

  const { data, error } = await supabase
    .from('clients')
    .insert({ name: name.trim(), industry, contact_name, contact_email })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json(data)
})

export default router
