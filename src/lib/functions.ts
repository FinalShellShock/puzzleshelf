import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

export const fetchCrossword = httpsCallable<
  { shelfId: string; date: string },
  { puzzleId: string }
>(functions, 'fetch_crossword')

export const generateSudoku = httpsCallable<
  { shelfId: string; difficulty: 'easy' | 'medium' | 'hard' | 'expert' },
  { puzzleId: string }
>(functions, 'generate_sudoku')

export const checkPuzzle = httpsCallable<
  { shelfId: string; puzzleId: string; scope: 'cell' | 'word' | 'all'; cellKey?: string; wordId?: string },
  { updated: number }
>(functions, 'check_puzzle')

export const revealCells = httpsCallable<
  { shelfId: string; puzzleId: string; scope: 'cell' | 'word'; cellKey?: string; wordId?: string },
  { updated: number }
>(functions, 'reveal_cells')

export const deletePuzzle = httpsCallable<
  { shelfId: string; puzzleId: string },
  { success: boolean }
>(functions, 'delete_puzzle')
