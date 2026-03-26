"""
Puzzle Shelf — Firebase Cloud Functions (Python 3.12)
"""
import base64
import json
import random
import re
import urllib.request
from collections import deque
from datetime import datetime
from typing import List

import firebase_admin
from firebase_admin import firestore
from firebase_functions import https_fn, options
from google.cloud.firestore import SERVER_TIMESTAMP

firebase_admin.initialize_app()

def get_db():
    return firestore.client()


# ── Helpers ────────────────────────────────────────────────────────────────────

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


# ── AmuseLabs / LA Times fetch ─────────────────────────────────────────────────
#
# LA Times crosswords are served via AmuseLabs (PuzzleMe platform).
# Puzzle IDs follow the pattern tca{YYMMDD}, e.g. tca260325 for March 25 2026.
#
# Deobfuscation logic adapted from:
#   xword-dl     https://github.com/thisisparker/xword-dl  (MIT)
#   kotwords     https://github.com/jpd236/kotwords        (Apache 2.0)

_LAT_PICKER_URL = "https://lat.amuselabs.com/lat/date-picker?set=latimes"
_LAT_PUZZLE_URL = "https://lat.amuselabs.com/lat/crossword?id={puzzle_id}&set=latimes"
_USER_AGENT = "Mozilla/5.0 (compatible; PuzzleShelf/1.0)"


def _http_get(url: str) -> str:
    """Simple HTTP GET using stdlib urllib — no external deps."""
    req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8")


def _parse_script_params(page_source: str) -> dict:
    """Extract JSON from <script id="params">...</script> using regex."""
    match = re.search(
        r'<script[^>]+id=["\']params["\'][^>]*>(.*?)</script>',
        page_source,
        re.DOTALL,
    )
    if match:
        try:
            return json.loads(match.group(1))
        except (json.JSONDecodeError, ValueError):
            pass
    return {}


def _get_load_token(picker_source: str):
    """Extract loadToken from the AmuseLabs date-picker page."""
    rawsps = None
    if "pickerParams.rawsps" in picker_source:
        for line in picker_source.splitlines():
            if "pickerParams.rawsps" in line:
                parts = line.strip().split("'")
                rawsps = parts[1] if len(parts) > 1 else None
                break
    else:
        rawsps = _parse_script_params(picker_source).get("rawsps")

    if rawsps:
        picker_params = json.loads(base64.b64decode(rawsps).decode("utf-8"))
        return picker_params.get("loadToken")
    return None


def _get_rawc(page_source: str) -> str:
    """Extract the obfuscated rawc blob from an AmuseLabs puzzle page."""
    if "window.rawc" in page_source or "window.puzzleEnv.rawc" in page_source:
        for line in page_source.splitlines():
            if "window.rawc" in line or "window.puzzleEnv.rawc" in line:
                parts = line.strip().split("'")
                return parts[1] if len(parts) > 1 else ""
    return _parse_script_params(page_source).get("rawc", "")


def _is_valid_key_prefix(rawc: str, key_prefix: List[int], spacing: int) -> bool:
    """BFS helper: validate that a key prefix produces valid UTF-8 Base64 chunks."""
    try:
        pos = 0
        chunk: list = []
        while pos < len(rawc):
            start_pos = pos
            key_index = 0
            while key_index < len(key_prefix) and pos < len(rawc):
                chunk_length = min(key_prefix[key_index], len(rawc) - pos)
                chunk.append(rawc[pos:pos + chunk_length][::-1])
                pos += chunk_length
                key_index += 1
            chunk_str = "".join(chunk)
            base64_start = ((start_pos + 3) // 4) * 4 - start_pos
            base64_end = (pos // 4) * 4 - start_pos
            if base64_start >= len(chunk_str) or base64_end <= base64_start:
                chunk.clear()
                pos += spacing
                continue
            b64_chunk = chunk_str[base64_start:base64_end]
            try:
                decoded = base64.b64decode(b64_chunk)
            except Exception:
                return False
            for byte in decoded:
                byte_val = byte if isinstance(byte, int) else ord(byte)
                if (
                    (byte_val < 32 and byte_val not in (0x09, 0x0A, 0x0D))
                    or byte_val == 0xC0
                    or byte_val == 0xC1
                    or byte_val >= 0xF5
                ):
                    return False
            pos += spacing
            chunk.clear()
        return True
    except Exception:
        return False


def _deobfuscate_rawc_with_key(rawc: str, key: List[int]) -> str:
    """Apply a known 7-digit key to deobfuscate rawc."""
    try:
        buffer = list(rawc)
        i = 0
        segment_count = 0
        while i < len(buffer) - 1:
            segment_length = min(key[segment_count % len(key)], len(buffer) - i)
            segment_count += 1
            left, right = i, i + segment_length - 1
            while left < right:
                buffer[left], buffer[right] = buffer[right], buffer[left]
                left += 1
                right -= 1
            i += segment_length
        return base64.b64decode("".join(buffer)).decode("utf-8")
    except Exception:
        return ""


def _deobfuscate_rawc(rawc: str) -> str:
    """
    Brute-force BFS to find the 7-digit deobfuscation key for AmuseLabs rawc.
    Each digit is in range [2, 18]. Uses a heuristic first digit from reversed
    Base64 markers for JSON start characters.
    """
    ye_pos = rawc.find("ye")
    we_pos = rawc.find("we")
    ye_pos = ye_pos if ye_pos != -1 else len(rawc)
    we_pos = we_pos if we_pos != -1 else len(rawc)
    first_key_digit = min(ye_pos, we_pos) + 2

    candidate_queue: deque = deque([[]] if first_key_digit > 18 else [[first_key_digit]])

    while candidate_queue:
        candidate_key_prefix = candidate_queue.popleft()
        if len(candidate_key_prefix) == 7:
            deobfuscated = _deobfuscate_rawc_with_key(rawc, candidate_key_prefix)
            try:
                json.loads(deobfuscated)
                return deobfuscated
            except (json.JSONDecodeError, ValueError):
                continue
        for next_digit in range(2, 19):
            new_candidate = candidate_key_prefix + [next_digit]
            remaining_digits = 7 - len(new_candidate)
            min_spacing = 2 * remaining_digits
            max_spacing = 18 * remaining_digits
            if any(
                _is_valid_key_prefix(rawc, new_candidate, spacing)
                for spacing in range(min_spacing, max_spacing + 1)
            ):
                candidate_queue.append(new_candidate)
    return "{}"


def _fetch_lat_xword_data(date_str: str) -> dict:
    """
    Fetch raw LA Times puzzle JSON from AmuseLabs for the given date (YYYY-MM-DD).
    """
    date = datetime.strptime(date_str, "%Y-%m-%d")
    puzzle_id = "tca" + date.strftime("%y%m%d")  # 2-digit year: tca260325

    # Fetch the date-picker to get the loadToken
    picker_source = _http_get(_LAT_PICKER_URL)
    token = _get_load_token(picker_source)

    # Build puzzle URL (append token if available)
    puzzle_url = _LAT_PUZZLE_URL.format(puzzle_id=puzzle_id)
    if token:
        puzzle_url += f"&loadToken={token}"

    # Fetch the puzzle page
    puzzle_source = _http_get(puzzle_url)
    not_found_msg = "The puzzle you are trying to access was not found"
    if not_found_msg in puzzle_source:
        raise Exception(f"Puzzle not found for {date_str} (id={puzzle_id})")

    # Extract rawc and deobfuscate
    rawc = _get_rawc(puzzle_source)
    if not rawc:
        raise Exception("Could not find rawc blob in puzzle page")

    xword_data = json.loads(_deobfuscate_rawc(rawc))
    if not xword_data:
        raise Exception("rawc deobfuscation produced empty result")

    return xword_data


def _parse_lat_xword_data(xword_data: dict, date: datetime) -> tuple:
    """
    Convert AmuseLabs xword_data JSON into Firestore-ready structures.

    Returns:
        solution_grid  — list of rows, each a list of single chars ('' for black)
        grid_meta      — {r{row}c{col}: {isBlack, number?, acrossWord?, downWord?}}
        across_clues   — {str(num): clue_text}
        down_clues     — {str(num): clue_text}
        title          — puzzle title string
        width, height  — grid dimensions
    """
    w: int = xword_data["w"]
    h: int = xword_data["h"]
    box: list = xword_data["box"]  # box[col][row] — column-major!

    # Build row-major solution grid and initial grid_meta
    solution_grid = []
    grid_meta: dict = {}
    for row in range(h):
        solution_row = []
        for col in range(w):
            cell = box[col][row]
            key = f"r{row}c{col}"
            if cell == "\x00":
                solution_row.append("")
                grid_meta[key] = {"isBlack": True}
            else:
                # Use first character; multi-char = rebus (take first letter)
                letter = cell[0] if cell else "X"
                solution_row.append(letter)
                grid_meta[key] = {"isBlack": False}
        solution_grid.append(solution_row)

    def is_black(r: int, c: int) -> bool:
        if r < 0 or r >= h or c < 0 or c >= w:
            return True  # out of bounds treated as black
        return grid_meta[f"r{r}c{c}"].get("isBlack", False)

    # Assign clue numbers: standard crossword row-major scan
    cell_numbers: dict = {}
    num = 1
    for row in range(h):
        for col in range(w):
            if is_black(row, col):
                continue
            starts_across = is_black(row, col - 1) and not is_black(row, col + 1)
            starts_down = is_black(row - 1, col) and not is_black(row + 1, col)
            if starts_across or starts_down:
                cell_numbers[(row, col)] = num
                grid_meta[f"r{row}c{col}"]["number"] = num
                num += 1

    # Assign word IDs to every cell in each word
    for (row, col), n in cell_numbers.items():
        starts_across = is_black(row, col - 1) and not is_black(row, col + 1)
        starts_down = is_black(row - 1, col) and not is_black(row + 1, col)

        if starts_across:
            word_id = f"{n}A"
            c = col
            while not is_black(row, c):
                grid_meta[f"r{row}c{c}"]["acrossWord"] = word_id
                c += 1

        if starts_down:
            word_id = f"{n}D"
            r = row
            while not is_black(r, col):
                grid_meta[f"r{r}c{col}"]["downWord"] = word_id
                r += 1

    # Build clue maps from placedWords (x=col, y=row in AmuseLabs coords)
    across_clues: dict = {}
    down_clues: dict = {}
    for word in xword_data.get("placedWords", []):
        row, col = word["y"], word["x"]
        n = cell_numbers.get((row, col))
        if n is None:
            continue
        clue_text = word.get("clue", {}).get("clue", "")
        if word["acrossNotDown"]:
            across_clues[str(n)] = clue_text
        else:
            down_clues[str(n)] = clue_text

    title = (xword_data.get("title") or "").strip() or \
        f"LA Times — {date.strftime('%a, %b %-d')}"

    return solution_grid, grid_meta, across_clues, down_clues, title, w, h


# ── fetchCrossword ─────────────────────────────────────────────────────────────

@https_fn.on_call(region="us-central1", memory=options.MemoryOption.GB_1, invoker="public")
def fetch_crossword(req: https_fn.CallableRequest) -> dict:
    """
    Fetch an LA Times crossword for a given date directly from AmuseLabs.
    Returns the puzzleId (creates new or returns existing cached puzzle).
    """
    uid = req.auth.uid if req.auth else None
    if not uid:
        raise https_fn.HttpsError("unauthenticated", "Must be authenticated")

    shelf_id = req.data.get("shelfId")
    date_str = req.data.get("date")  # YYYY-MM-DD
    if not shelf_id or not date_str:
        raise https_fn.HttpsError("invalid-argument", "shelfId and date required")

    _shelf_member_check(shelf_id, uid)

    try:
        date = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise https_fn.HttpsError("invalid-argument", f"Invalid date format: {date_str}")

    # Check cache: any non-deleted crossword for this date on this shelf
    puzzles_ref = get_db().collection("shelves").document(shelf_id).collection("puzzles")
    existing = puzzles_ref.where("type", "==", "crossword").where("sourceDate", "==", date_str).get()
    non_deleted = [d for d in existing if d.to_dict().get("status") != "deleted"]
    if non_deleted:
        return {"puzzleId": non_deleted[0].id}

    # Fetch and parse puzzle data directly from AmuseLabs
    try:
        xword_data = _fetch_lat_xword_data(date_str)
    except Exception as e:
        raise https_fn.HttpsError("not-found", f"No crossword available for {date_str}: {e}")

    try:
        solution_grid, grid_meta, across_clues, down_clues, puzzle_title, grid_width, grid_height = \
            _parse_lat_xword_data(xword_data, date)
    except Exception as e:
        raise https_fn.HttpsError("internal", f"Failed to parse puzzle data: {e}")

    # Write puzzle document (solution excluded)
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
        "cells": {},
    })

    # Solution document — unreadable by clients (Firestore rules deny reads)
    solution_ref = puzzle_ref.collection("solution").document("data")
    solution_ref.set({"grid": solution_grid})

    return {"puzzleId": puzzle_ref.id}


# ── generateSudoku ─────────────────────────────────────────────────────────────

@https_fn.on_call(region="us-central1", invoker="public")
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

    givens_count = {"easy": 36, "medium": 30, "hard": 25, "expert": 22}[difficulty]
    solution, givens = _generate_sudoku(givens_count)

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

    solution_ref = puzzle_ref.collection("solution").document("data")
    solution_ref.set({"grid": [[str(solution[r][c]) for c in range(9)] for r in range(9)]})

    return {"puzzleId": puzzle_ref.id}


def _generate_sudoku(n_givens: int) -> tuple:
    """Generate a valid sudoku grid and return (solution, givens_grid)."""
    grid = [[0] * 9 for _ in range(9)]
    _fill_grid(grid)
    solution = [row[:] for row in grid]

    cells = [(r, c) for r in range(9) for c in range(9)]
    random.shuffle(cells)
    removed = 0
    target_remove = 81 - n_givens

    for (r, c) in cells:
        if removed >= target_remove:
            break
        grid[r][c] = 0
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

@https_fn.on_call(region="us-central1", invoker="public")
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

    # Check for puzzle completion
    puzzle_snap2 = puzzle_ref.get()
    puzzle_data2 = puzzle_snap2.to_dict()
    all_cells = puzzle_data2.get("cells", {})
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

@https_fn.on_call(region="us-central1", invoker="public")
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


# ── deletePuzzle ───────────────────────────────────────────────────────────────

@https_fn.on_call(region="us-central1", invoker="public")
def delete_puzzle(req: https_fn.CallableRequest) -> dict:
    """
    Soft-delete a puzzle by setting status='deleted'.
    Deleted puzzles are excluded from the shelf view and all stats.
    """
    uid = req.auth.uid if req.auth else None
    if not uid:
        raise https_fn.HttpsError("unauthenticated", "Must be authenticated")

    shelf_id = req.data.get("shelfId")
    puzzle_id = req.data.get("puzzleId")
    if not shelf_id or not puzzle_id:
        raise https_fn.HttpsError("invalid-argument", "shelfId and puzzleId required")

    _shelf_member_check(shelf_id, uid)

    puzzle_ref = (
        get_db()
        .collection("shelves").document(shelf_id)
        .collection("puzzles").document(puzzle_id)
    )
    snap = puzzle_ref.get()
    if not snap.exists:
        raise https_fn.HttpsError("not-found", "Puzzle not found")

    puzzle_ref.update({
        "status": "deleted",
        "deletedAt": SERVER_TIMESTAMP,
        "deletedBy": uid,
    })

    return {"success": True}
