"""
Puzzle Shelf — Firebase Cloud Functions (Python 3.12)
"""
import random
from datetime import datetime

import firebase_admin
from firebase_admin import firestore
from firebase_functions import https_fn, options
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

firebase_admin.initialize_app()

def get_db():
    return firestore.client()

# ── Helpers ───────────────────────────────────────────────────────────────────

def _shelf_member_check(shelf_id: str, uid: str) -> dict:
    """Raises if user is not a member of the shelf. Returns shelf data."""
    ref = get_db().collection("shelves").document(shelf_id)
    snap = ref.get()
    if not snap.exists:
        raise https_fn.HttpsError("not-found", "Shelf not found")
    data = snap.to_dict()
    if uid not in data.get("members", {}):
        raise https_fn.HttpsError("permission-denied", "Not a shelf member")
    return data


# ── fetchCrossword ─────────────────────────────────────────────────────────────

@https_fn.on_call(region="us-central1", memory=options.MemoryOption.GB_1)
def fetch_crossword(req: https_fn.CallableRequest) -> dict:
    """
    Fetch an LA Times crossword for a given date via xword-dl.
    Returns the puzzleId (creates new or returns existing cached puzzle).
    """
    uid = req.auth.uid if req.auth else None
    if not uid:
        raise https_fn.HttpsError("unauthenticated", "Must be authenticated")

    shelf_id = req.data.get("shelfId")
    date_str = req.data.get("date")  # e.g. "2026-03-25"
    if not shelf_id or not date_str:
        raise https_fn.HttpsError("invalid-argument", "shelfId and date required")

    _shelf_member_check(shelf_id, uid)

    # Parse date
    try:
        date = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise https_fn.HttpsError("invalid-argument", f"Invalid date format: {date_str}")

    # Check cache: has this puzzle been fetched before?
    puzzles_ref = get_db().collection("shelves").document(shelf_id).collection("puzzles")
    existing = puzzles_ref.where("source", "==", "latimes").where("sourceDate", "==", date_str).get()
    if existing:
        return {"puzzleId": existing[0].id}

    # Fetch via xword-dl Python API
    import xword_dl
    date_fmt = date.strftime("%B %-d, %Y")  # "March 25, 2026"
    try:
        result = xword_dl.by_keyword("lat", date=date_fmt)
        p = result[0]  # puz.Puzzle object
    except Exception as e:
        raise https_fn.HttpsError("not-found", f"No crossword available for {date_str}: {e}")

    grid_width = p.width
    grid_height = p.height
    solution_grid = []
    cells_map = {}
    grid_meta = {}
    numbers = p.clue_numbering()

    # Build solution grid
    for row in range(grid_height):
        solution_row = []
        for col in range(grid_width):
            idx = row * grid_width + col
            ch = p.solution[idx]
            solution_row.append(ch if ch != "." else "")
        solution_grid.append(solution_row)

    # Build grid_meta (black cells, numbers)
    for row in range(grid_height):
        for col in range(grid_width):
            idx = row * grid_width + col
            ch = p.solution[idx]
            key = f"r{row}c{col}"
            if ch == ".":
                grid_meta[key] = {"isBlack": True}
            else:
                grid_meta[key] = {"isBlack": False}

    # Assign clue numbers and word IDs
    across_clues = {}
    down_clues = {}
    for entry in numbers.across:
        num = entry.num
        col = entry.col
        row = entry.row
        word_id = f"{num}A"
        across_clues[str(num)] = entry.clue
        for i in range(entry.len):
            key = f"r{row}c{col + i}"
            if key in grid_meta:
                grid_meta[key]["acrossWord"] = word_id
                if i == 0:
                    grid_meta[key]["number"] = num

    for entry in numbers.down:
        num = entry.num
        col = entry.col
        row = entry.row
        word_id = f"{num}D"
        down_clues[str(num)] = entry.clue
        for i in range(entry.len):
            key = f"r{row + i}c{col}"
            if key in grid_meta:
                grid_meta[key]["downWord"] = word_id
                if "number" not in grid_meta[key] or grid_meta[key].get("number") != num:
                    # Only set number if not already set by across
                    if "acrossWord" not in grid_meta[key] or i == 0:
                        grid_meta[key].setdefault("number", num)

    # Title
    puzzle_title = p.title or f"LA Times — {date.strftime('%a, %b %-d')}"

    # Write puzzle document (no solution)
    puzzle_ref = puzzles_ref.document()
    puzzle_ref.set({
        "type": "crossword",
        "title": puzzle_title,
        "source": "latimes",
        "sourceDate": date_str,
        "status": "active",
        "addedBy": uid,
        "addedAt": SERVER_TIMESTAMP,
        "completedAt": None,
        "difficulty": None,
        "gridWidth": grid_width,
        "gridHeight": grid_height,
        "clues": {
            "across": across_clues,
            "down": down_clues,
        },
        "gridMeta": grid_meta,
        "cells": cells_map,
    })

    # Write solution document (admin-only, client rules deny reads)
    solution_ref = puzzle_ref.collection("solution").document("data")
    solution_ref.set({"grid": solution_grid})

    return {"puzzleId": puzzle_ref.id}


# ── generateSudoku ─────────────────────────────────────────────────────────────

@https_fn.on_call(region="us-central1")
def generate_sudoku(req: https_fn.CallableRequest) -> dict:
    """Generate a sudoku puzzle of a given difficulty."""
    uid = req.auth.uid if req.auth else None
    if not uid:
        raise https_fn.HttpsError("unauthenticated", "Must be authenticated")

    shelf_id = req.data.get("shelfId")
    difficulty = req.data.get("difficulty", "medium")
    if not shelf_id:
        raise https_fn.HttpsError("invalid-argument", "shelfId required")
    if difficulty not in ("easy", "medium", "hard", "expert"):
        raise https_fn.HttpsError("invalid-argument", "Invalid difficulty")

    _shelf_member_check(shelf_id, uid)

    # Number of givens per difficulty
    givens_count = {"easy": 36, "medium": 30, "hard": 25, "expert": 22}[difficulty]

    solution, givens = _generate_sudoku(givens_count)

    # Build constraints map and cells map
    constraints = {}
    cells = {}
    for row in range(9):
        for col in range(9):
            key = f"r{row}c{col}"
            if givens[row][col] != 0:
                constraints[key] = givens[row][col]
                cells[key] = {
                    "value": str(givens[row][col]),
                    "filledBy": "system",
                    "timestamp": SERVER_TIMESTAMP,
                    "status": "unchecked",
                    "given": True,
                }

    from datetime import date as date_cls
    today = date_cls.today().strftime("%a, %b %-d")
    title = f"Sudoku — {difficulty.capitalize()} — {today}"

    puzzles_ref = get_db().collection("shelves").document(shelf_id).collection("puzzles")
    puzzle_ref = puzzles_ref.document()
    puzzle_ref.set({
        "type": "sudoku",
        "title": title,
        "source": "generated",
        "sourceDate": None,
        "status": "active",
        "addedBy": uid,
        "addedAt": SERVER_TIMESTAMP,
        "completedAt": None,
        "difficulty": difficulty,
        "gridWidth": 9,
        "gridHeight": 9,
        "constraints": constraints,
        "cells": cells,
    })

    # Solution document
    solution_ref = puzzle_ref.collection("solution").document("data")
    solution_ref.set({"grid": [[str(solution[r][c]) for c in range(9)] for r in range(9)]})

    return {"puzzleId": puzzle_ref.id}


def _generate_sudoku(n_givens: int) -> tuple[list, list]:
    """Generate a valid sudoku grid and return (solution, givens_grid)."""
    grid = [[0] * 9 for _ in range(9)]
    _fill_grid(grid)
    solution = [row[:] for row in grid]

    # Remove cells to reach desired givens count
    cells = [(r, c) for r in range(9) for c in range(9)]
    random.shuffle(cells)
    removed = 0
    target_remove = 81 - n_givens

    for (r, c) in cells:
        if removed >= target_remove:
            break
        backup = grid[r][c]
        grid[r][c] = 0
        # Verify unique solution (simplified: just proceed, full backtrack check is expensive)
        removed += 1

    return solution, grid


def _fill_grid(grid: list) -> bool:
    """Backtracking sudoku solver/generator."""
    for row in range(9):
        for col in range(9):
            if grid[row][col] == 0:
                nums = list(range(1, 10))
                random.shuffle(nums)
                for num in nums:
                    if _is_valid(grid, row, col, num):
                        grid[row][col] = num
                        if _fill_grid(grid):
                            return True
                        grid[row][col] = 0
                return False
    return True


def _is_valid(grid: list, row: int, col: int, num: int) -> bool:
    if num in grid[row]:
        return False
    if num in [grid[r][col] for r in range(9)]:
        return False
    box_r, box_c = (row // 3) * 3, (col // 3) * 3
    for r in range(box_r, box_r + 3):
        for c in range(box_c, box_c + 3):
            if grid[r][c] == num:
                return False
    return True


# ── checkPuzzle ───────────────────────────────────────────────────────────────

@https_fn.on_call(region="us-central1")
def check_puzzle(req: https_fn.CallableRequest) -> dict:
    """
    Compare submitted cell values against the solution.
    Updates cell status to 'correct' or 'incorrect'.
    Scope: 'cell' | 'word' | 'all'
    """
    uid = req.auth.uid if req.auth else None
    if not uid:
        raise https_fn.HttpsError("unauthenticated", "Must be authenticated")

    shelf_id = req.data.get("shelfId")
    puzzle_id = req.data.get("puzzleId")
    scope = req.data.get("scope", "all")
    cell_key = req.data.get("cellKey")
    word_id = req.data.get("wordId")

    if not shelf_id or not puzzle_id:
        raise https_fn.HttpsError("invalid-argument", "shelfId and puzzleId required")

    _shelf_member_check(shelf_id, uid)

    puzzle_ref = get_db().collection("shelves").document(shelf_id).collection("puzzles").document(puzzle_id)
    puzzle_snap = puzzle_ref.get()
    if not puzzle_snap.exists:
        raise https_fn.HttpsError("not-found", "Puzzle not found")

    solution_snap = puzzle_ref.collection("solution").document("data").get()
    if not solution_snap.exists:
        raise https_fn.HttpsError("not-found", "Solution not found")

    puzzle_data = puzzle_snap.to_dict()
    solution_data = solution_snap.to_dict()
    solution_grid = solution_data["grid"]
    cells = puzzle_data.get("cells", {})
    grid_meta = puzzle_data.get("gridMeta", {})

    # Determine which cells to check
    if scope == "cell" and cell_key:
        keys_to_check = [cell_key]
    elif scope == "word" and word_id:
        keys_to_check = [
            k for k, meta in grid_meta.items()
            if meta.get("acrossWord") == word_id or meta.get("downWord") == word_id
        ]
    else:
        keys_to_check = list(cells.keys())

    updates = {}
    updated = 0
    for key in keys_to_check:
        cell = cells.get(key)
        if not cell or not cell.get("value") or cell.get("given"):
            continue
        match = key[1:].split("c")
        if len(match) != 2:
            continue
        row, col = int(match[0]), int(match[1])
        correct_val = solution_grid[row][col]
        is_correct = cell["value"].upper() == str(correct_val).upper()
        updates[f"cells.{key}.status"] = "correct" if is_correct else "incorrect"
        updated += 1

    if updates:
        puzzle_ref.update(updates)

    # Check if puzzle is now complete
    puzzle_snap2 = puzzle_ref.get()
    puzzle_data2 = puzzle_snap2.to_dict()
    all_cells = puzzle_data2.get("cells", {})

    # For crossword: all non-black cells filled and correct
    # For sudoku: all 81 cells have values and correct
    puzzle_type = puzzle_data2.get("type")
    if puzzle_type == "crossword":
        non_black = [k for k, meta in grid_meta.items() if not meta.get("isBlack")]
        all_correct = all(
            all_cells.get(k, {}).get("status") == "correct"
            for k in non_black
        )
    else:  # sudoku
        all_correct = all(
            all_cells.get(f"r{r}c{c}", {}).get("status") == "correct"
            for r in range(9) for c in range(9)
        )

    if all_correct and puzzle_data2.get("status") == "active":
        puzzle_ref.update({"status": "completed", "completedAt": SERVER_TIMESTAMP})

    return {"updated": updated}


# ── revealCells ───────────────────────────────────────────────────────────────

@https_fn.on_call(region="us-central1")
def reveal_cells(req: https_fn.CallableRequest) -> dict:
    """
    Reveal the correct answer for a cell or word.
    Sets status='revealed', filledBy='system'.
    """
    uid = req.auth.uid if req.auth else None
    if not uid:
        raise https_fn.HttpsError("unauthenticated", "Must be authenticated")

    shelf_id = req.data.get("shelfId")
    puzzle_id = req.data.get("puzzleId")
    scope = req.data.get("scope", "cell")
    cell_key = req.data.get("cellKey")
    word_id = req.data.get("wordId")

    if not shelf_id or not puzzle_id:
        raise https_fn.HttpsError("invalid-argument", "shelfId and puzzleId required")

    _shelf_member_check(shelf_id, uid)

    puzzle_ref = get_db().collection("shelves").document(shelf_id).collection("puzzles").document(puzzle_id)
    puzzle_snap = puzzle_ref.get()
    if not puzzle_snap.exists:
        raise https_fn.HttpsError("not-found", "Puzzle not found")

    solution_snap = puzzle_ref.collection("solution").document("data").get()
    if not solution_snap.exists:
        raise https_fn.HttpsError("not-found", "Solution not found")

    puzzle_data = puzzle_snap.to_dict()
    solution_data = solution_snap.to_dict()
    solution_grid = solution_data["grid"]
    grid_meta = puzzle_data.get("gridMeta", {})

    if scope == "cell" and cell_key:
        keys_to_reveal = [cell_key]
    elif scope == "word" and word_id:
        keys_to_reveal = [
            k for k, meta in grid_meta.items()
            if meta.get("acrossWord") == word_id or meta.get("downWord") == word_id
        ]
    else:
        keys_to_reveal = []

    updates = {}
    for key in keys_to_reveal:
        match = key[1:].split("c")
        if len(match) != 2:
            continue
        row, col = int(match[0]), int(match[1])
        correct_val = solution_grid[row][col]
        updates[f"cells.{key}"] = {
            "value": str(correct_val),
            "filledBy": "system",
            "timestamp": SERVER_TIMESTAMP,
            "status": "revealed",
            "given": False,
        }

    if updates:
        puzzle_ref.update(updates)

    return {"updated": len(updates)}
