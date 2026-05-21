import { render, screen } from '@testing-library/react'
import KpiCard from '../components/KpiCard'

describe('KpiCard', () => {
  it('label과 value를 렌더링', () => {
    render(<KpiCard label="총 매출" value="1억 5천만원" />)
    expect(screen.getByText('총 매출')).toBeInTheDocument()
    expect(screen.getByText('1억 5천만원')).toBeInTheDocument()
  })

  it('sub 텍스트가 있으면 렌더링', () => {
    render(<KpiCard label="승인율" value="75%" sub="전월 대비 +5%" />)
    expect(screen.getByText('전월 대비 +5%')).toBeInTheDocument()
  })

  it('sub 텍스트가 없으면 렌더링하지 않음', () => {
    render(<KpiCard label="건수" value={10} />)
    expect(screen.queryByText(/전월/)).not.toBeInTheDocument()
  })

  it('color prop에 따라 스타일 클래스 적용', () => {
    const { container } = render(<KpiCard label="테스트" value="값" color="green" />)
    expect(container.firstChild).toHaveClass('bg-green-50')
  })

  it('기본 color는 blue', () => {
    const { container } = render(<KpiCard label="테스트" value="값" />)
    expect(container.firstChild).toHaveClass('bg-blue-50')
  })
})
