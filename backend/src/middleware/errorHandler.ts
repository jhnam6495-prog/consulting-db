import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err.stack)
  res.status(500).json({ error: '서버 오류가 발생했습니다.', detail: err.message })
}
