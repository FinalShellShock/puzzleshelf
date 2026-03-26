import type { Puzzle, Shelf } from '../../types'

interface Props {
  puzzle: Puzzle
  shelf: Shelf
  selectedCell: string | null
  activeWordCells: string[]
  myColor: string
  onCellSelect: (cellKey: string) => void
}

export function CrosswordGrid({ puzzle, shelf, selectedCell, activeWordCells, onCellSelect }: Props) {
  const { gridWidth: cols, gridHeight: rows } = puzzle
  // Cell size: fill viewport width on mobile
  const cellSize = Math.min(Math.floor((Math.min(window.innerWidth, 480) - 16) / cols), 44)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        gap: 1,
        background: 'var(--color-border)',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
      }}
    >
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => {
          const key = `r${row}c${col}`
          const meta = puzzle.gridMeta?.[key]
          const cell = puzzle.cells[key]
          const isBlack = meta?.isBlack ?? false

          if (isBlack) {
            return (
              <div
                key={key}
                className="puzzle-cell black"
                style={{ width: cellSize, height: cellSize }}
              />
            )
          }

          const isSelected = selectedCell === key
          const isInWord = activeWordCells.includes(key)
          const status = cell?.status ?? 'unchecked'
          const filledBy = cell?.filledBy
          const letterColor = filledBy && filledBy !== 'system' && shelf.members[filledBy]
            ? shelf.members[filledBy].color
            : 'var(--color-text-muted)'

          let cellClass = 'puzzle-cell'
          if (isSelected) cellClass += ' selected'
          else if (isInWord) cellClass += ' in-word'
          if (status === 'correct') cellClass += ' correct'
          if (status === 'incorrect') cellClass += ' incorrect'
          if (status === 'revealed') cellClass += ' revealed'

          return (
            <div
              key={key}
              className={cellClass}
              style={{ width: cellSize, height: cellSize, background: 'var(--color-surface)' }}
              onClick={() => onCellSelect(key)}
            >
              {meta?.number && (
                <span className="cell-number">{meta.number}</span>
              )}
              {cell?.value && (
                <span
                  className="cell-letter"
                  style={{
                    color: status === 'revealed' ? 'var(--color-revealed)' : letterColor,
                    fontSize: Math.max(cellSize * 0.45, 12),
                  }}
                >
                  {cell.value}
                </span>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
