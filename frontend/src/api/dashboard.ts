import api from './client'
import type { DashboardSummary } from '../types/database'

export interface RevenueTrend { month: string; revenue: number }
export interface ByService    { service_type: string; count: number; revenue: number }
export interface ByUser       { user_id: string; name: string; count: number; revenue: number }
export interface ByClient     { client_id: string; name: string; industry: string | null; count: number; revenue: number }

export interface ExtendedSummary extends DashboardSummary {
  rejectedCount: number
}

export const dashboardApi = {
  summary:      (from?: string, to?: string) =>
    api.get<ExtendedSummary>('/dashboard/summary', { params: { from, to } }).then(r => r.data),

  revenueTrend: (from?: string, to?: string) =>
    api.get<RevenueTrend[]>('/dashboard/revenue-trend', { params: { from, to } }).then(r => r.data),

  byService:    (from?: string, to?: string) =>
    api.get<ByService[]>('/dashboard/by-service', { params: { from, to } }).then(r => r.data),

  byUser:       (from?: string, to?: string) =>
    api.get<ByUser[]>('/dashboard/by-user', { params: { from, to } }).then(r => r.data),

  byClient:     (from?: string, to?: string) =>
    api.get<ByClient[]>('/dashboard/by-client', { params: { from, to } }).then(r => r.data),
}
