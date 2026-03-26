/**
 * Client-side sudoku conflict detection.
 * Returns a set of cell keys ("r{row}c{col}") that have conflicts.
 * This is purely visual feedback — does NOT write to Firestore.
 */
export function detectConflicts(
  cells: Record<string, string>  // key → digit string ("1"-"9") or ""
): Set<string> {
  const conflicts = new Set<string>()

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const key = `r${row}c${col}`
      const val = cells[key]
      if (!val) continue

      // Check row
      for (let c2 = 0; c2 < 9; c2++) {
        if (c2 === col) continue
        if (cells[`r${row}c${c2}`] === val) {
          conflicts.add(key)
          conflicts.add(`r${row}c${c2}`)
        }
      }

      // Check column
      for (let r2 = 0; r2 < 9; r2++) {
        if (r2 === row) continue
        if (cells[`r${r2}c${col}`] === val) {
          conflicts.add(key)
          conflicts.add(`r${r2}c${col}`)
        }
      }

      // Check 3×3 box
      const boxRow = Math.floor(row / 3) * 3
      const boxCol = Math.floor(col / 3) * 3
      for (let r2 = boxRow; r2 < boxRow + 3; r2++) {
        for (let c2 = boxCol; c2 < boxCol + 3; c2++) {
          if (r2 === row && c2 === col) continue
          if (cells[`r${r2}c${c2}`] === val) {
            conflicts.add(key)
            conflicts.add(`r${r2}c${c2}`)
          }
        }
      }
    }
  }

  return conflicts
}
