import { render, screen } from '@testing-library/react'
import StatusBadge from '../components/StatusBadge'

describe('StatusBadge', () => {
  it('draft 상태 한국어 표시', () => {
    render(<StatusBadge status="draft" />)
    expect(screen.getByText('임시저장')).toBeInTheDocument()
  })

  it('pending 상태 한국어 표시', () => {
    render(<StatusBadge status="pending" />)
    expect(screen.getByText('승인대기')).toBeInTheDocument()
  })

  it('approved 상태 한국어 표시', () => {
    render(<StatusBadge status="approved" />)
    expect(screen.getByText('승인완료')).toBeInTheDocument()
  })

  it('rejected 상태 한국어 표시', () => {
    render(<StatusBadge status="rejected" />)
    expect(screen.getByText('반려')).toBeInTheDocument()
  })
})
