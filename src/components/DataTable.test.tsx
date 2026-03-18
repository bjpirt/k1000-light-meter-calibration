import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DataTable } from './DataTable'

const columns = [
  { key: 'fStop', label: 'F-Stop' },
  { key: 'resistance', label: 'Resistance', unit: 'Ω' },
]

const rows = [
  { fStop: 1.4, resistance: 100 },
  { fStop: 2.0, resistance: null },
]

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={columns} rows={rows} onChange={() => {}} />)
    expect(screen.getByText('F-Stop')).toBeInTheDocument()
    expect(screen.getByText('Resistance')).toBeInTheDocument()
    expect(screen.getByText('(Ω)')).toBeInTheDocument()
  })

  it('renders row data', () => {
    render(<DataTable columns={columns} rows={rows} onChange={() => {}} />)
    expect(screen.getByText('1.4')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('renders row numbers', () => {
    render(<DataTable columns={columns} rows={rows} onChange={() => {}} />)
    const rowNumCells = document.querySelectorAll('td.row-num')
    expect(rowNumCells[0].textContent).toBe('1')
    expect(rowNumCells[1].textContent).toBe('2')
  })

  it('calls onChange when a cell is blurred with a new value', () => {
    const handleChange = vi.fn()
    render(<DataTable columns={columns} rows={rows} onChange={handleChange} />)
    const cells = document.querySelectorAll('td[contenteditable]')
    const firstCell = cells[0] as HTMLElement
    firstCell.textContent = '2.8'
    fireEvent.blur(firstCell)
    expect(handleChange).toHaveBeenCalledOnce()
    const updatedRows = handleChange.mock.calls[0][0]
    expect(updatedRows[0].fStop).toBe(2.8)
  })

  it('sets value to null when cell is cleared', () => {
    const handleChange = vi.fn()
    render(<DataTable columns={columns} rows={rows} onChange={handleChange} />)
    const cells = document.querySelectorAll('td[contenteditable]')
    const firstCell = cells[0] as HTMLElement
    firstCell.textContent = ''
    fireEvent.blur(firstCell)
    const updatedRows = handleChange.mock.calls[0][0]
    expect(updatedRows[0].fStop).toBeNull()
  })

  it('handles paste of tab-separated data', () => {
    const handleChange = vi.fn()
    render(<DataTable columns={columns} rows={rows} onChange={handleChange} />)
    const cells = document.querySelectorAll('td[contenteditable]')
    fireEvent.paste(cells[0], {
      clipboardData: { getData: () => '2.8\t400\n4.0\t800' },
    })
    const updatedRows = handleChange.mock.calls[0][0]
    expect(updatedRows[0].fStop).toBe(2.8)
    expect(updatedRows[0].resistance).toBe(400)
    expect(updatedRows[1].fStop).toBe(4.0)
    expect(updatedRows[1].resistance).toBe(800)
  })
})
