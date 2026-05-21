import type { PerformanceStatus } from '../types/database'
import { STATUS_LABEL, STATUS_COLOR } from '../types/database'

export default function StatusBadge({ status }: { status: PerformanceStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}
