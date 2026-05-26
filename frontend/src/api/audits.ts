import api from './client'
import type { Audit, CreateAuditInput, UpdateAuditInput, AuditStatsSummary } from '../types/database'

export interface AuditFilters {
  status?: string
  audit_type?: string
  user_id?: string
  client_id?: string
  from?: string
  to?: string
}

export interface AuditTrend    { month: string; revenue: number; count: number }
export interface AuditByType   { audit_type: string; count: number; revenue: number; passed: number; completed: number; passRate: number }
export interface AuditByUser   { user_id: string; name: string; count: number; revenue: number; passed: number; completed: number; passRate: number }
export interface AuditByClient { client_id: string; name: string; count: number; revenue: number }

export const auditsApi = {
  list: (filters?: AuditFilters) =>
    api.get<Audit[]>('/audits', { params: filters }).then(r => r.data),

  get: (id: string) =>
    api.get<Audit>(`/audits/${id}`).then(r => r.data),

  create: (body: CreateAuditInput) =>
    api.post<Audit>('/audits', body).then(r => r.data),

  update: (id: string, body: UpdateAuditInput) =>
    api.put<Audit>(`/audits/${id}`, body).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/audits/${id}`),

  stats: (from?: string, to?: string) =>
    api.get<AuditStatsSummary>('/audits/stats/summary', { params: { from, to } }).then(r => r.data),

  trend: (from?: string, to?: string) =>
    api.get<AuditTrend[]>('/audits/analytics/trend', { params: { from, to } }).then(r => r.data),

  byType: (from?: string, to?: string) =>
    api.get<AuditByType[]>('/audits/analytics/by-type', { params: { from, to } }).then(r => r.data),

  byUser: (from?: string, to?: string) =>
    api.get<AuditByUser[]>('/audits/analytics/by-user', { params: { from, to } }).then(r => r.data),

  byClient: (from?: string, to?: string) =>
    api.get<AuditByClient[]>('/audits/analytics/by-client', { params: { from, to } }).then(r => r.data),
}
