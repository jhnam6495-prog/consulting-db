import { render } from '@testing-library/react'
import LoadingSpinner from '../components/LoadingSpinner'

describe('LoadingSpinner', () => {
  it('스피너 요소 렌더링', () => {
    const { container } = render(<LoadingSpinner />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('래퍼 div가 flex 레이아웃', () => {
    const { container } = render(<LoadingSpinner />)
    expect(container.firstChild).toHaveClass('flex')
  })
})
