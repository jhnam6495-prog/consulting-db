import api from './client'
import type { Schedule, CreateScheduleInput, UpdateScheduleInput } from '../types/database'

export interface MonthlyData {
  schedules: Schedule[]
  audits: {
    id: string; audit_name: string; audit_type: string
    scheduled_date: string; status: string
    user?: { id: string; name: string }
    client?: { id: string; name: string }
  }[]
  performances: {
    id: string; service_type: string; start_date: string; end_date: string; status: string
    user?: { id: string; name: string }
    client?: { id: string; name: string }
  }[]
}

export interface DailyData {
  schedules: Schedule[]
  audits: MonthlyData['audits']
  performances: MonthlyData['performances']
}

export interface UpcomingData {
  schedules: Schedule[]
  audits: MonthlyData['audits']
}

export const schedulesApi = {
  monthly: (year: number, month: number) =>
    api.get<MonthlyData>('/schedules/monthly', { params: { year, month } }).then(r => r.data),

  daily: (date: string) =>
    api.get<DailyData>('/schedules/daily', { params: { date } }).then(r => r.data),

  upcoming: (days = 14) =>
    api.get<UpcomingData>('/schedules/upcoming', { params: { days } }).then(r => r.data),

  get: (id: string) =>
    api.get<Schedule>(`/schedules/${id}`).then(r => r.data),

  create: (body: CreateScheduleInput) =>
    api.post<Schedule>('/schedules', body).then(r => r.data),

  update: (id: string, body: UpdateScheduleInput) =>
    api.put<Schedule>(`/schedules/${id}`, body).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/schedules/${id}`),
}
