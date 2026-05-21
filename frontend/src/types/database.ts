export type UserRole = 'consultant' | 'manager' | 'admin'
export type ProjectStatus = 'ongoing' | 'completed' | 'cancelled'
export type PerformanceStatus = 'draft' | 'pending' | 'approved' | 'rejected'
export type ServiceType = '전략컨설팅' | 'IT컨설팅' | '회계/세무' | '법률' | '인사/조직' | '기타'
export type ApprovalAction = 'approved' | 'rejected'

export interface Team {
  id: string
  name: string
  created_at: string
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  team_id: string | null
  created_at: string
  team?: Team
}

export interface Client {
  id: string
  name: string
  industry: string | null
  contact_name: string | null
  contact_email: string | null
  created_at: string
}

export interface Project {
  id: string
  name: string
  client_id: string
  start_date: string | null
  end_date: string | null
  status: ProjectStatus
  created_at: string
  client?: Client
}

export interface Performance {
  id: string
  project_id: string | null
  user_id: string
  client_id: string
  service_type: ServiceType
  revenue: number
  start_date: string
  end_date: string
  status: PerformanceStatus
  description: string | null
  created_at: string
  updated_at: string
  user?: User
  client?: Client
  project?: Project
  approvals?: Approval[]
}

export interface Approval {
  id: string
  performance_id: string
  approver_id: string
  action: ApprovalAction
  comment: string | null
  created_at: string
  approver?: User
}

export type CreatePerformanceInput = Pick<Performance, 'client_id' | 'service_type' | 'revenue' | 'start_date' | 'end_date'> & {
  project_id?: string | null
  description?: string | null
}

export type UpdatePerformanceInput = Partial<CreatePerformanceInput>

export interface DashboardSummary {
  totalRevenue: number
  totalCount: number
  approvedCount: number
  pendingCount: number
  approvalRate: number
}

export const SERVICE_TYPES: ServiceType[] = [
  '전략컨설팅', 'IT컨설팅', '회계/세무', '법률', '인사/조직', '기타'
]

export const STATUS_LABEL: Record<PerformanceStatus, string> = {
  draft: '임시저장',
  pending: '승인대기',
  approved: '승인완료',
  rejected: '반려',
}

export const STATUS_COLOR: Record<PerformanceStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}
