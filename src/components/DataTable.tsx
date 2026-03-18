import { useRef, type KeyboardEvent, type ClipboardEvent } from 'react'

export interface Column {
  key: string
  label: string
  unit?: string
  readOnly?: boolean
}

interface Props<T extends Record<string, number | null>> {
  columns: Column[]
  rows: T[]
  onChange: (rows: T[]) => void
}

/**
 * A lightweight editable table with Excel/spreadsheet paste support.
 * Clicking a cell makes it editable; pasting tab-separated data (e.g. from
 * Excel) fills cells starting at the focused cell.
 */
export function DataTable<T extends Record<string, number | null>>({
  columns,
  rows,
  onChange,
}: Props<T>) {
  const tableRef = useRef<HTMLTableElement>(null)

  function updateCell(rowIndex: number, key: string, raw: string) {
    const value = raw.trim() === '' ? null : parseFloat(raw.replace(',', '.'))
    const newRows = rows.map((row, i) =>
      i === rowIndex ? ({ ...row, [key]: isNaN(value as number) ? null : value } as T) : row,
    )
    onChange(newRows)
  }

  function handlePaste(
    e: ClipboardEvent<HTMLTableCellElement>,
    startRow: number,
    startCol: number,
  ) {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    // Support both tab-separated (Excel) and comma-separated (CSV) columns
    const pastedRows = text
      .trim()
      .split(/\r?\n/)
      .map(line => line.split(/\t|,/))

    const newRows = rows.map(r => ({ ...r })) as T[]
    pastedRows.forEach((pastedCols, ri) => {
      const targetRow = startRow + ri
      if (targetRow >= newRows.length) return
      pastedCols.forEach((cell, ci) => {
        const targetCol = startCol + ci
        if (targetCol >= columns.length) return
        const key = columns[targetCol].key
        const value = cell.trim() === '' ? null : parseFloat(cell.replace(',', '.'))
        ;(newRows[targetRow] as Record<string, number | null>)[key] =
          isNaN(value as number) ? null : value
      })
    })
    onChange(newRows)
  }

  function handleKeyDown(
    e: KeyboardEvent<HTMLTableCellElement>,
    rowIndex: number,
    colIndex: number,
  ) {
    // Tab/Enter navigation between cells
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault()
      const cells = tableRef.current?.querySelectorAll<HTMLTableCellElement>('td[contenteditable]')
      if (!cells) return
      const current = rowIndex * columns.length + colIndex
      const next = e.shiftKey ? current - 1 : current + 1
      if (next >= 0 && next < cells.length) {
        cells[next].focus()
        // Select all text in cell
        const range = document.createRange()
        range.selectNodeContents(cells[next])
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    }
  }

  return (
    <table ref={tableRef} className="data-table">
      <thead>
        <tr>
          <th className="row-num">#</th>
          {columns.map(col => (
            <th key={col.key}>
              {col.label}
              {col.unit ? <span className="unit"> ({col.unit})</span> : null}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri}>
            <td className="row-num">{ri + 1}</td>
            {columns.map((col, ci) => col.readOnly ? (
              <td key={col.key} style={{ color: '#475569', background: '#f8fafc' }}>
                {row[col.key] ?? ''}
              </td>
            ) : (
              <td
                key={col.key}
                contentEditable
                suppressContentEditableWarning
                onBlur={e => updateCell(ri, col.key, e.currentTarget.textContent ?? '')}
                onPaste={e => handlePaste(e, ri, ci)}
                onKeyDown={e => handleKeyDown(e, ri, ci)}
              >
                {row[col.key] ?? ''}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
