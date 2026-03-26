import type { Puzzle, Shelf } from '../../types'
import { getMemberColor } from '../../utils/colors'

interface Props {
  puzzle: Puzzle
  shelf: Shelf
  selectedCell: string | null
  conflicts: Set<string>
  myColor: string
  onCellSelect: (key: string) => void
}

export function SudokuGrid({ puzzle, shelf, selectedCell, conflicts, onCellSelect }: Props) {
  const size = Math.min(Math.floor((Math.min(window.innerWidth, 480) - 32) / 9), 52)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(9, ${size}px)`,
      gridTemplateRows: `repeat(9, ${size}px)`,
      border: '2px solid var(--color-text)',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      {Array.from({ length: 9 }, (_, row) =>
        Array.from({ length: 9 }, (_, col) => {
          const key = `r${row}c${col}`
          const isGiven = puzzle.constraints?.[key] !== undefined
          const cell = puzzle.cells[key]
          const value = isGiven
            ? String(puzzle.constraints![key])
            : (cell?.value ?? '')
          const filledBy = cell?.filledBy
          const status = cell?.status ?? 'unchecked'
          const isSelected = selectedCell === key
          const isConflict = conflicts.has(key) && !isGiven
          const memberColor = filledBy && filledBy !== 'system'
            ? getMemberColor(shelf, filledBy)
            : 'var(--color-text)'

          // Box border (thick lines at 3-cell boundaries)
          const borderRight = (col + 1) % 3 === 0 && col !== 8 ? '2px solid var(--color-text)' : `1px solid var(--color-border)`
          const borderBottom = (row + 1) % 3 === 0 && row !== 8 ? '2px solid var(--color-text)' : `1px solid var(--color-border)`

          let bg = isGiven
            ? 'color-mix(in srgb, var(--color-border) 40%, var(--color-surface))'
            : 'var(--color-surface)'
          if (isSelected) bg = 'color-mix(in srgb, var(--color-accent) 20%, var(--color-surface))'
          if (status === 'correct') bg = 'color-mix(in srgb, var(--color-correct) 15%, var(--color-surface))'
          if (status === 'incorrect') bg = 'color-mix(in srgb, var(--color-incorrect) 15%, var(--color-surface))'

          return (
            <div
              key={key}
              onClick={() => onCellSelect(key)}
              style={{
                width: size, height: size,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRight, borderBottom,
                background: bg,
                cursor: isGiven ? 'default' : 'pointer',
                outline: isConflict ? '2px inset var(--color-incorrect)' : 'none',
                transition: 'background 100ms',
              }}
            >
              <span style={{
                fontSize: Math.max(size * 0.5, 14),
                fontWeight: isGiven ? 800 : 600,
                color: isGiven
                  ? 'var(--color-text)'
                  : status === 'revealed'
                    ? 'var(--color-revealed)'
                    : memberColor,
              }}>
                {value}
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}
