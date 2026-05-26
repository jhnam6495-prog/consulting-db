import api from './client'
import type { Client } from '../types/database'

export const clientsApi = {
  list: () => api.get<Client[]>('/clients').then(r => r.data),
  get: (id: string) => api.get<Client>(`/clients/${id}`).then(r => r.data),
  create: (name: string) => api.post<Client>('/clients', { name }).then(r => r.data),
}
