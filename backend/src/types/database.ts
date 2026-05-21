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

// API 요청/응답 타입
export interface CreatePerformanceInput {
  project_id?: string
  client_id: string
  service_type: ServiceType
  revenue: number
  start_date: string
  end_date: string
  description?: string
}

export interface UpdatePerformanceInput extends Partial<CreatePerformanceInput> {
  status?: PerformanceStatus
}

export interface ApprovalInput {
  action: ApprovalAction
  comment?: string
}

export interface DashboardSummary {
  totalRevenue: number
  totalCount: number
  approvedCount: number
  pendingCount: number
  approvalRate: number
}
