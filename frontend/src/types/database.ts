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

// 심사 실적 관련 타입
export type AuditType =
  | 'ISO9001/14001/45001'
  | 'ISO9001'
  | 'ISO14001'
  | 'ISO45001'
  | 'ISO37001/37301'
  | 'ISO37001'
  | 'ISO37301'
  | 'ISO27001'
  | '가족친화형기업'
  | '기타'

export type AuditStage = '1단계' | '2단계' | '사후' | '갱신' | '특별' | '해당없음'
export type AuditResult = 'pass' | 'conditional_pass' | 'fail' | 'pending'
export type AuditStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

export interface Audit {
  id: string
  user_id: string
  client_id: string | null
  audit_type: AuditType
  audit_name: string
  audit_body: string | null
  audit_stage: AuditStage | null
  scheduled_date: string
  completed_date: string | null
  result: AuditResult | null
  findings_count: number
  observations_count: number
  revenue: number
  status: AuditStatus
  description: string | null
  created_at: string
  updated_at: string
  user?: Pick<User, 'id' | 'name'>
  client?: Pick<Client, 'id' | 'name'>
}

export type CreateAuditInput = {
  user_id: string
  client_id?: string | null
  audit_type: AuditType
  audit_name: string
  audit_body?: string | null
  audit_stage?: AuditStage | null
  scheduled_date: string
  revenue?: number
  description?: string | null
}

export type UpdateAuditInput = Partial<Omit<Audit, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'user' | 'client'>>

export const AUDIT_TYPES: AuditType[] = [
  'ISO9001/14001/45001',
  'ISO9001',
  'ISO14001',
  'ISO45001',
  'ISO37001/37301',
  'ISO37001',
  'ISO37301',
  'ISO27001',
  '가족친화형기업',
  '기타',
]

export const AUDIT_STAGES: AuditStage[] = ['1단계', '2단계', '사후', '갱신', '특별', '해당없음']

export const AUDIT_STATUS_LABEL: Record<AuditStatus, string> = {
  planned: '예정',
  in_progress: '진행중',
  completed: '완료',
  cancelled: '취소',
}

export const AUDIT_STATUS_COLOR: Record<AuditStatus, string> = {
  planned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export const AUDIT_RESULT_LABEL: Record<AuditResult, string> = {
  pass: '합격',
  conditional_pass: '조건부합격',
  fail: '불합격',
  pending: '미결',
}

export const AUDIT_RESULT_COLOR: Record<AuditResult, string> = {
  pass: 'bg-green-100 text-green-700',
  conditional_pass: 'bg-yellow-100 text-yellow-700',
  fail: 'bg-red-100 text-red-700',
  pending: 'bg-gray-100 text-gray-500',
}

export interface AuditStatsSummary {
  total: number
  completed: number
  planned: number
  inProgress: number
  passed: number
  passRate: number
  totalRevenue: number
}
