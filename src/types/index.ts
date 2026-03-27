import type { Timestamp } from 'firebase/firestore'

// ─── User ───────────────────────────────────────────────────────────────────

export interface AppUser {
  uid: string
  displayName: string
  email: string
  createdAt: Timestamp
}

// ─── Colors ──────────────────────────────────────────────────────────────────

export interface UserColor {
  name: string
  hex: string
}

// ─── Shelf ───────────────────────────────────────────────────────────────────

export interface ShelfMember {
  displayName: string
  color: string        // hex
  colorName: string
  joinedAt: Timestamp
  currentPuzzle: string | null
  currentCell?: string              // crossword presence: which cell they have selected
  currentDirection?: 'across' | 'down'  // crossword presence: which direction
  lastSeen: Timestamp | null
}

export interface FormerShelfMember extends ShelfMember {
  leftAt: Timestamp
}

export interface Shelf {
  id: string
  name: string
  inviteCode: string
  createdBy: string
  createdAt: Timestamp
  members: Record<string, ShelfMember>
  formerMembers?: Record<string, FormerShelfMember>
}

// ─── Puzzle ───────────────────────────────────────────────────────────────────

export type PuzzleType = 'crossword' | 'sudoku'
export type PuzzleStatus = 'active' | 'completed' | 'abandoned' | 'deleted'
export type CellStatus = 'unchecked' | 'correct' | 'incorrect' | 'revealed'

export interface PuzzleCell {
  value: string
  filledBy: string      // userId or 'system'
  timestamp: Timestamp
  status: CellStatus
  given: boolean        // true for pre-filled sudoku cells
  notes?: number[]      // sudoku candidate notes (1-9)
}

export interface CrosswordClues {
  across: Record<string, string>
  down: Record<string, string>
}

export interface CrosswordGrid {
  // r{row}c{col} → { isBlack, number, acrossWord, downWord }
  [key: string]: {
    isBlack: boolean
    number?: number
    acrossWord?: string   // word identifier e.g. "1A"
    downWord?: string     // word identifier e.g. "1D"
  }
}

export interface SudokuConstraints {
  // r{row}c{col} → given digit (1-9)
  [key: string]: number
}

export interface Puzzle {
  id: string
  type: PuzzleType
  title: string
  source: string
  sourceDate: string | null
  status: PuzzleStatus
  addedBy: string
  addedAt: Timestamp
  completedAt: Timestamp | null
  difficulty: string | null
  gridWidth: number
  gridHeight: number
  // crossword only
  clues?: CrosswordClues
  gridMeta?: CrosswordGrid
  // sudoku only
  constraints?: SudokuConstraints
  // cell state (collaborative)
  cells: Record<string, PuzzleCell>
}

export interface PuzzleSolution {
  grid: string[][]
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  text: string
  sentBy: string
  sentAt: Timestamp
  reactions: Record<string, string[]>  // emoji → [userId, ...]
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface PuzzleStats {
  contributionPct: Record<string, number>   // userId → %
  accuracyPct: Record<string, number>       // userId → %
  revealCount: Record<string, number>       // userId → count
  cleanSolve: boolean
  timeToComplete: number | null             // seconds
}

export interface ShelfStats {
  puzzlesStarted: number
  puzzlesCompleted: number
  completionRate: number
  overallContribution: Record<string, number>
  overallAccuracy: Record<string, number>
  cleanSolveCount: Record<string, number>
  byType: {
    crossword: { started: number; completed: number }
    sudoku: { started: number; completed: number }
  }
}
