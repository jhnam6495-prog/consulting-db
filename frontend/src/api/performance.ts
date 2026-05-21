import api from './client'
import type { Performance, CreatePerformanceInput, UpdatePerformanceInput, ApprovalAction } from '../types/database'

export interface PerformanceFilters {
  status?: string
  user_id?: string
  client_id?: string
  service_type?: string
  from?: string
  to?: string
}

export const performanceApi = {
  list: (filters?: PerformanceFilters) =>
    api.get<Performance[]>('/performance', { params: filters }).then(r => r.data),

  get: (id: string) =>
    api.get<Performance>(`/performance/${id}`).then(r => r.data),

  create: (body: CreatePerformanceInput & { user_id: string }) =>
    api.post<Performance>('/performance', body).then(r => r.data),

  update: (id: string, body: UpdatePerformanceInput) =>
    api.put<Performance>(`/performance/${id}`, body).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/performance/${id}`),

  submit: (id: string) =>
    api.post<Performance>(`/performance/${id}/submit`).then(r => r.data),

  approve: (id: string, approver_id: string, action: ApprovalAction, comment?: string) =>
    api.post<Performance>(`/performance/${id}/approve`, { approver_id, action, comment }).then(r => r.data),
}
