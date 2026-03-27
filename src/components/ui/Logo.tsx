/**
 * Puzzle Shelf logo — crossword-style grid.
 *
 * "PUZZLE" runs across (row 2), "SHELF" runs down (col 5), crossing at the
 * shared E. This puts S + H above and L + F below PUZZLE — balanced cross.
 *
 *   · · · · · S
 *   · · · · · H
 *   P U Z Z L [E]   ← intersection highlighted in accent color
 *   · · · · · L
 *   · · · · · F
 *
 * Solid currentColor tiles, letters punched out in the page background.
 * The intersection tile uses the accent color to mark the clever overlap.
 *
 * `size` = height of the grid in px. Width is always 6/5 × size.
 */

interface LogoProps {
  size?: number
}

const CELL = 20
const GAP  = 1.5
const R    = 3
const VW   = 6 * CELL  // 120
const VH   = 5 * CELL  // 100

const CELLS: { letter: string; row: number; col: number; intersection?: boolean }[] = [
  // PUZZLE — row 2, cols 0–5
  { letter: 'P', row: 2, col: 0 },
  { letter: 'U', row: 2, col: 1 },
  { letter: 'Z', row: 2, col: 2 },
  { letter: 'Z', row: 2, col: 3 },
  { letter: 'L', row: 2, col: 4 },
  { letter: 'E', row: 2, col: 5, intersection: true }, // ← shared with SHELF
  // SHELF — col 5, rows 0–4 (E at row 2 already listed above)
  { letter: 'S', row: 0, col: 5 },
  { letter: 'H', row: 1, col: 5 },
  { letter: 'L', row: 3, col: 5 },
  { letter: 'F', row: 4, col: 5 },
]

export function Logo({ size = 160 }: LogoProps) {
  const height = size
  const width  = (VW / VH) * height

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VW} ${VH}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="puzzle shelf"
    >
      {CELLS.map(({ letter, row, col, intersection }) => {
        const x = col * CELL
        const y = row * CELL
        return (
          <g key={`${row}-${col}`}>
            <rect
              x={x + GAP / 2}
              y={y + GAP / 2}
              width={CELL - GAP}
              height={CELL - GAP}
              rx={R}
              fill={intersection ? 'var(--color-accent)' : 'currentColor'}
            />
            <text
              x={x + CELL / 2}
              y={y + CELL / 2 + 4}
              fontSize={10.5}
              textAnchor="middle"
              fill="var(--color-bg)"
              fontFamily="'Outfit', system-ui, sans-serif"
              fontWeight={700}
            >
              {letter}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
