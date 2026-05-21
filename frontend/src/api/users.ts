import api from './client'
import type { User } from '../types/database'

export const usersApi = {
  list: () => api.get<User[]>('/users').then(r => r.data),
  managers: () => api.get<User[]>('/users/managers').then(r => r.data),
}
