import type { Puzzle, Shelf } from '../../types'
import { getMemberColor } from '../../utils/colors'

interface Props {
  puzzle: Puzzle
  shelf: Shelf
  selectedCell: string | null
  activeWordCells: string[]
  memberPresence?: Record<string, { wordCells: string[], color: string }>
  myColor: string
  onCellSelect: (cellKey: string) => void
}

export function CrosswordGrid({ puzzle, shelf, selectedCell, activeWordCells, memberPresence, onCellSelect }: Props) {
  const { gridWidth: cols, gridHeight: rows } = puzzle
  // Cell size: fill viewport width on mobile
  // Account for (cols-1) gaps of 1px and 2px outer border so grid never overflows viewport
  const cellSize = Math.min(Math.floor((window.innerWidth - cols - 1) / cols), 44)
  // Dense grid (Sunday puzzles): shrink decorations so letters stay readable
  const isDense = cellSize <= 24
  const numberSize = isDense ? Math.max(cellSize * 0.35, 6) : 9

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        gap: 1,
        background: 'var(--color-border)',
        borderRadius: isDense ? 4 : 8,
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
      }}
      className={isDense ? 'grid-dense' : ''}
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
          const memberColor = filledBy && filledBy !== 'system'
            ? getMemberColor(shelf, filledBy)
            : 'var(--color-text-muted)'
          // When cell is marked correct, override to high-contrast text
          // so green user colors don't disappear into the green background
          const letterColor = status === 'correct' ? 'var(--color-text)' : memberColor

          // Find any member whose active word includes this cell
          const presenceEntries = memberPresence
            ? Object.values(memberPresence).filter(p => p.wordCells.includes(key))
            : []

          let cellClass = 'puzzle-cell'
          if (isSelected) cellClass += ' selected'
          else if (isInWord) cellClass += ' in-word'
          if (status === 'correct') cellClass += ' correct'
          if (status === 'incorrect') cellClass += ' incorrect'
          if (status === 'revealed') cellClass += ' revealed'

          // Presence ring: subtle inset shadow in the member's color
          const presenceStyle: React.CSSProperties = presenceEntries.length > 0
            ? { boxShadow: `inset 0 0 0 2px ${presenceEntries[0].color}88` }
            : {}

          return (
            <div
              key={key}
              className={cellClass}
              style={{ width: cellSize, height: cellSize, touchAction: 'manipulation', ...presenceStyle }}
              onClick={() => onCellSelect(key)}
            >
              {meta?.number && (
                <span className="cell-number" style={isDense ? { fontSize: numberSize, top: 1, left: 1 } : undefined}>{meta.number}</span>
              )}
              {cell?.value && (
                <span
                  className="cell-letter"
                  style={{
                    color: status === 'revealed' ? 'var(--color-revealed)' : letterColor,
                    fontSize: Math.max(cellSize * 0.5, 12),
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
