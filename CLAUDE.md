---
Developer Workflow (Kelly's Setup)

Git & Pushing
- Working branch: kelly/ui
- Always cd into /Users/kelly/puzzleshelf before running any git commands
- After completing any update, push to the branch automatically — do not ask Kelly to do it
- After pushing, fetch the Vercel preview URL using the GitHub commit statuses API:
  curl -s "https://api.github.com/repos/FinalShellShock/puzzleshelf/commits/kelly/ui/statuses" | grep target_url | head -1
  The preview app URL follows the pattern: https://puzzleshelf-git-kelly-ui-johnnychadwick-4329s-projects.vercel.app
- Always give Kelly the preview URL when done

Testing
- Do NOT use local dev server previews — the app uses Vercel and Firestore and does not work correctly in local previews
- Use the Chrome MCP tool (Claude in Chrome) for all visual testing and verification

Instructions for Kelly
- If something requires terminal commands, run them directly — do not tell Kelly to run them
- If something requires manual steps in a browser or UI (e.g. GitHub, Vercel dashboard), give click-by-click instructions

---
Puzzle Shelf — Product Spec
Overview
Puzzle Shelf is a collaborative puzzle app where users share a persistent "Shelf" — a shared puzzle library where members can browse, solve, and track progress on puzzles together in real time. Think of it like a Google Doc for puzzles: you're always connected, you can see what others are working on, and you can jump in or out of any puzzle at any time.
The core insight: no existing app offers a persistent shared space for puzzles. Every collaborative puzzle tool requires sharing a new link for every new puzzle. Puzzle Shelf eliminates that friction entirely.
Core Concepts
Shelves (not "lobbies")
A Shelf is a persistent shared room. It holds a collection of puzzles that all members can access at any time. Key properties:
* Up to 4 members per Shelf
* Custom name per Shelf (e.g., "Johnny & Kelly's Shelf," "Game Night Crew")
* Invite code system for joining (similar to Blindside Island's approach)
* Each member chooses their own display color within the Shelf
* A user account can belong to multiple Shelves
The Puzzle Library
Each Shelf has a puzzle library — the "bookshelf" metaphor. Puzzles live here permanently until explicitly removed. Key behaviors:
* Multiple puzzles can be active at once — no concept of "the current puzzle"
* Each member can be in a different puzzle simultaneously (Johnny doing sudoku while Kelly does a crossword)
* Members can freely switch between puzzles at any time
* Progress on every puzzle is saved independently and permanently
* Presence indicators show who is currently in which puzzle
Puzzle Types (Launch)
Two puzzle types ship at launch. The architecture is designed to be type-agnostic — adding new puzzle types in the future should only require a new renderer component and puzzle source.
Crossword:
* Sourced from LA Times daily crosswords via xword-dl (Python CLI tool)
* On-demand fetch: user selects a date → Cloud Function fetches and parses the .puz file → caches in Firestore
* Parsed using @xwordly/xword-parser (TypeScript, supports .puz, .ipuz, .jpz, .xd formats)
* Standard American-style crossword grid with across/down clues
Sudoku:
* Algorithmically generated (no external sourcing needed)
* Standard 9x9 grid with difficulty levels
* Client-side conflict detection (duplicate numbers in row/column/box) in addition to server-side validation
Important Note on Puzzle Sourcing & Copyright
The xword-dl approach is for personal use only. LA Times crossword puzzles are copyrighted content. If Puzzle Shelf ever goes to the App Store, puzzle sourcing must pivot to one of:
* AI-generated original puzzles
* Licensed content via agreements with publishers
* Public domain puzzle archives (e.g., pre-1965 NYT puzzles in .xd format from xd.saul.pw)
* Original content from commissioned constructors
The architecture should be source-agnostic so the puzzle pipeline can be swapped without touching the UI or collaboration layer.
Tech Stack
Layer Technology Frontend React + Vite + TypeScript Hosting Vercel Auth Firebase Authentication Database Cloud Firestore (real-time sync) Server functions Firebase Cloud Functions Crossword fetching xword-dl (Python, runs in Cloud Functions) Crossword parsing @xwordly/xword-parser (TypeScript) Styling Tailwind CSS (customized with Bookshelf palette)
Architecture
Layer Separation
The app has three distinct layers that should remain cleanly separated:
1. Shelf Layer (lobby management)
* User accounts, authentication, profile
* Shelf creation, naming, invite codes, member management
* Presence tracking (who is online, who is in which puzzle)
* Stats aggregation and display
* Color selection per member per Shelf
2. Puzzle Shelf Layer (the library)
* Browse all puzzles in a Shelf
* Add new puzzles (select by date for crosswords, generate for sudoku)
* Display progress, completion status, and contribution breakdown per puzzle
* Type-agnostic — only knows puzzle metadata, not puzzle internals
3. Renderer Layer (puzzle interaction)
* Swappable per puzzle type (type: "crossword" or type: "sudoku")
* Renders the grid, handles user input, displays clues/constraints
* Writes cell updates to Firestore
* Displays other users' contributions via real-time sync
* Handles check/reveal UI by calling Cloud Functions
* Manages local-only logic (e.g., sudoku conflict detection)
Data Model (Firestore)
/users/{userId}   displayName: string   email: string   createdAt: timestamp  /shelves/{shelfId}   name: string                    // e.g., "Johnny & Kelly's Shelf"   inviteCode: string              // unique join code   createdBy: string               // userId   createdAt: timestamp   members: {     [userId]: {       displayName: string       color: string               // hex code, chosen per-shelf       colorName: string           // friendly name (e.g., "Ocean")       joinedAt: timestamp       currentPuzzle: string|null  // puzzleId they're currently viewing     }   }  /shelves/{shelfId}/puzzles/{puzzleId}   type: "crossword" | "sudoku"   title: string                   // e.g., "Wed, March 25 — LA Times"   source: string                  // e.g., "latimes", "generated"   sourceDate: string|null         // for daily puzzles, the date   status: "active" | "completed" | "abandoned"   addedBy: string                 // userId who added it   addedAt: timestamp   completedAt: timestamp|null   difficulty: string|null         // for sudoku: "easy", "medium", "hard", "expert"   gridWidth: number   gridHeight: number   clues: {                        // crossword only     across: { [number]: string }     down: { [number]: string }   }   constraints: { ... }            // sudoku only (given numbers)   cells: {     "r{row}c{col}": {       value: string               // the letter or digit entered       filledBy: string            // userId       timestamp: timestamp       status: "unchecked" | "correct" | "incorrect" | "revealed"       given: boolean              // true for pre-filled sudoku cells     }   }  /shelves/{shelfId}/puzzles/{puzzleId}/solution  (CLIENT CANNOT READ)   grid: string[][]                // the correct answers  /shelves/{shelfId}/chat/{messageId}        // Shelf-level chat   text: string   sentBy: string                  // userId   sentAt: timestamp   reactions: {     [emoji]: [userId, userId]     // e.g., { "😂": ["user1", "user2"] }   }  /shelves/{shelfId}/puzzles/{puzzleId}/chat/{messageId}  // Puzzle-level chat   text: string   sentBy: string                  // userId   sentAt: timestamp   reactions: {     [emoji]: [userId, userId]   }
Security Rules
Critical: The /solution document must be unreadable by clients. Firestore security rules should:
* Allow authenticated users to read/write to Shelves they are members of
* Allow reading puzzle state documents
* Deny all client reads on solution documents
* Allow Cloud Functions (admin SDK) to read solutions for validation
Real-Time Sync
* Each puzzle's cells map is the source of truth for collaborative state
* Clients subscribe to the puzzle document via onSnapshot
* When a user types a letter, it writes to the cells map with their userId and timestamp
* All other connected clients see the update in real time via Firestore listeners
* Presence (which puzzle each member is currently viewing) updates via the Shelf member doc
Validation Flow
Solutions are never sent to the client. All validation goes through Cloud Functions:
Check Cell / Check Word / Check Puzzle:
1. Client calls Cloud Function with shelfId, puzzleId, and scope (cell coords, word identifier, or "all")
2. Function reads the solution document (admin SDK bypasses security rules)
3. Function compares submitted values against solution
4. Function updates each checked cell's status field to "correct" or "incorrect"
5. Client sees status updates via its existing onSnapshot listener
Reveal Cell / Reveal Word:
1. Client calls Cloud Function with shelfId, puzzleId, and scope
2. Function reads solution, writes the correct value to the cell(s)
3. Sets status: "revealed" and filledBy: "system" (not attributed to any user)
Puzzle Completion:
1. When all cells are filled, client calls a "check puzzle" function
2. If all cells are correct, function sets puzzle status: "completed" and completedAt
3. This triggers stats recalculation
Sudoku-Specific: Client-Side Conflict Detection
Separate from server validation, the sudoku renderer should detect logical conflicts locally:
* Duplicate number in same row → highlight both cells
* Duplicate number in same column → highlight both cells
* Duplicate number in same 3x3 box → highlight both cells
* This is purely visual and does NOT write to Firestore — it's instant local feedback
* Conflict highlighting uses a distinct style (not the "incorrect" red) — perhaps a subtle outline
Stats
Stats are derived from cell data. Every cell write is attributed to a user, so we can compute everything — but we're deliberate about WHEN stats are shown to prevent gaming.
Stats Visibility Philosophy
Live stats (visible while solving): Only contribution % is shown during active solving — "you've filled X cells, Kelly has filled Y cells." This isn't gameable in a meaningful way. No accuracy, no right/wrong feedback beyond explicit check/reveal actions.
Completion stats (revealed only when puzzle is marked complete): Accuracy %, clean solve status, reveal count, and time to complete are computed from the final puzzle state at the moment of completion. No peeking beforehand. This makes completion feel like getting your test grade back.
This eliminates the feedback loop where someone could watch their accuracy drop in real-time and erase wrong answers to inflate their score.
Per-Puzzle Stats (shown at completion)
* Contribution % — what percentage of cells each member filled
* Accuracy % — of cells a member filled, how many were correct on first entry vs. needed correction
* Reveal count — how many cells were revealed vs. solved
* Clean solve — boolean, was the puzzle completed without any checks or reveals?
* Time to complete — from first cell entry to completion (if completed)
Per-Shelf Stats (Aggregate)
* Puzzles started — total puzzles added to the Shelf
* Puzzles completed — total puzzles marked complete
* Completion rate — completed / started
* Overall contribution % — across all puzzles, what % has each member contributed
* Accuracy % — aggregate across all completed puzzles per member
* Clean solve count — how many puzzles were completed without assists
* Current streak — consecutive days with a completed puzzle (for daily puzzles)
* Per-type breakdown — stats split by crossword vs. sudoku
Implementation
Stats can be computed one of two ways:
1. On-the-fly: Query all puzzle documents and compute from cell data (simpler, fine for small scale)
2. Running tallies: Cloud Function triggers on puzzle completion that update aggregate stat counters (more performant at scale)
For MVP, on-the-fly computation is fine. Optimize later if needed.
Design System
Palette: Bookshelf
Warm, cozy, library-inspired. Rounded corners, soft surfaces, modern grid cells.
Light Mode:
Role Color Hex Background Warm cream #F7F3EE Surface / cards Lighter cream #FBF8F4 Border Warm tan #E4D9CB Text primary Deep walnut #3D2E22 Text secondary Muted brown #7B6B5A Accent Walnut #8B6F4E
Dark Mode:
Invert to deep warm browns — NOT pure black. The warmth should carry through.
Role Color Hex Background Deep walnut #1C1612 Surface / cards Warm dark brown #2A211A Border Muted brown #4A3D30 Text primary Warm off-white #E8E0D4 Text secondary Muted tan #9B8B78 Accent Worn leather #B89B7A
Grid Styling
Crossword and sudoku grids should feel modern and touchable:
* Cell border-radius: 5-6px (softly rounded, not pill-shaped)
* Cell borders: 0.5px solid, warm tan color
* Black cells (crossword): Deep walnut (#2C2C2A), no border
* Given cells (sudoku): Slightly darker background to distinguish from user-entered
* Cell size: Large enough for comfortable touch targets on mobile
* Active cell: Subtle warm highlight (not harsh blue focus ring)
* Active word (crossword): Light warm wash across all cells in the word
Validation Colors
These are RESERVED and must not overlap with user colors:
State Light Mode Dark Mode Usage Correct Soft green Muted green Cell background tint after check confirms correct Incorrect Soft red Muted red Cell background tint after check finds wrong answer Revealed Gray/dim Dim warm gray Cell filled by system, letter shown in muted style
User Colors (8 options per Shelf)
Each member picks one. No two members in the same Shelf can have the same color. These are used for:
* Letter color in puzzle cells (whose letter is whose)
* Progress bar segments on shelf cards
* Presence indicators
* Stat attribution
Name Hex Description Gold #C8923E Warm amber Ocean #2E7D7B Deep teal Coral #C2724E Terra cotta Plum #7B5EA7 Muted purple Storm #4A7BA7 Cool blue-gray Rose #B5687A Dusty pink Mulberry #893A5E Deep wine Dusk #7B8EC2 Soft lavender-blue
All 8 must have sufficient contrast on both light (#F7F3EE) and dark (#1C1612) backgrounds. All must be clearly distinguishable from the reserved green, red, and gray validation colors.
Typography
* Clean sans-serif throughout
* Generous spacing, nothing cramped
* Crossword clue numbers: small, tucked in cell corners, low opacity
* Stats numbers: large and prominent
* Shelf/puzzle titles: medium weight, warm
General UI Principles
* Rounded corners everywhere — border-radius 8-12px on cards, 5-6px on cells
* Generous whitespace — nothing should feel cramped
* Warm shadows (if any) — tinted warm, not cool gray
* Transitions — subtle, 150-200ms, ease-out
* Mobile-first — this will primarily be used on phones
User Experience Flows
First Launch
1. Create account (email/password or Google sign-in)
2. Set display name
3. Create your first Shelf OR join one via invite code
4. Pick your color
5. Land on empty Shelf — prompt to add first puzzle
Adding a Puzzle (Crossword)
1. Tap "Add puzzle" on the Shelf
2. Select type: Crossword
3. See a date picker (calendar view showing available dates)
4. Select a date (e.g., "Monday, March 23")
5. Loading state while Cloud Function fetches and parses the puzzle
6. Puzzle appears on the Shelf as a card, status "active"
Adding a Puzzle (Sudoku)
1. Tap "Add puzzle" on the Shelf
2. Select type: Sudoku
3. Choose difficulty: Easy / Medium / Hard / Expert
4. Puzzle generates and appears on the Shelf immediately
Solving Flow
1. Tap a puzzle card on the Shelf
2. Grid renders with any existing progress (other members' letters in their colors)
3. Tap a cell → keyboard appears → type letter/number
4. Your entry appears in your chosen color
5. If Kelly is in the same puzzle, her cursor/entries appear in her color in real time
6. Use menu to Check Word / Check Puzzle / Reveal Word
7. When all cells filled correctly → completion celebration
Switching Puzzles
1. While in a puzzle, tap back/shelf icon
2. See the Shelf with all puzzle cards, presence indicators ("Kelly is here" on a card)
3. Tap a different puzzle card → instantly switch
4. Previous puzzle saves state; new puzzle loads with existing progress
Shelf Management
1. Settings accessible from Shelf view
2. Rename Shelf
3. View/share invite code
4. See member list with their colors
5. Change your own color (if desired color isn't taken)
Chat
Chat exists at two levels:
Shelf Chat — accessible from the Shelf view. General conversation between members. "Want to do a puzzle tonight?" or "I added a new crossword." Always visible/accessible from the Shelf screen, probably as a collapsible panel or tab.
Puzzle Chat — accessible while inside a puzzle. Contextual conversation about the puzzle you're actively solving. "What the hell is 14 across?" or "I think the bottom-left corner is wrong." Only visible when you're in a puzzle. Separate message history per puzzle.
Chat features (both levels):
* Messages display with sender name (in their chosen color), text, and timestamp
* Timestamps shown as relative ("2m ago", "yesterday") with full timestamp on tap/hover
* Reactions: tap-and-hold (mobile) or hover (desktop) on any message to add a reaction
* 6 reaction emojis (curated, no full picker): 👍 thumbs up, 😂 laughing, 🤔 thinking, 🔥 fire, 😢 sad, 😡 mad
* Messages ordered chronologically, auto-scroll to newest
* Real-time via Firestore onSnapshot on the chat subcollection
* No editing or deleting messages (keep it simple for MVP)
Puzzle Sourcing Pipeline
Crossword Pipeline
User selects date   → Client calls Cloud Function: fetchCrossword(shelfId, date)   → Cloud Function checks if puzzle already cached in Firestore     → If cached: return existing puzzleId     → If not cached:       → Run xword-dl with date flag to fetch .puz file       → Parse .puz file into JSON (grid, clues, solution)       → Create puzzle document in Firestore (without solution in main doc)       → Create separate solution document (locked from client reads)       → Return new puzzleId   → Client navigates to puzzle
Sudoku Pipeline
User selects difficulty   → Cloud Function generates sudoku grid with unique solution   → Creates puzzle document with given numbers as constraints   → Creates solution document (locked from client reads)   → Returns puzzleId   → Client navigates to puzzle
Parser Libraries
For .puz files (crossword):
* Primary: @xwordly/xword-parser — TypeScript, supports .puz, .ipuz, .jpz, .xd
* Fallback: @confuzzle/puz-crossword — reads/writes/parses .puz format
* Legacy: puzjs — original .puz parser (npm)
For xword-dl (crossword fetching):
* Python CLI tool: pip install xword-dl
* LA Times keyword: lat (also supports latm for LA Times Mini)
* Date flag: --date "March 23, 2026" (parsed liberally, supports relative dates)
* Output: .puz file
Technical Considerations
Performance
* Firestore document size limit: 1MB. Puzzle documents with cell maps should be well under this.
* Use onSnapshot with field masks if only listening for cell changes (reduces bandwidth)
* Consider debouncing rapid cell updates (typing fast) to reduce write operations
Offline Support
* Not a priority for MVP
* Firestore has built-in offline persistence that can be enabled later
Future Puzzle Types (Architecture Prep)
* Puzzle document has a type field that determines which renderer to use
* Renderer components are loaded dynamically based on type
* Adding a new type = new renderer component + new source/generator + new solution validator
* The Shelf layer, stats system, and presence system are completely type-agnostic
Mobile-First Design
This is a mobile-first app. The primary use case is two people on their phones, probably on the couch or in bed. Desktop should work, but every design decision starts with the phone screen.
* Touch targets: minimum 44px for cells
* Keyboard management: custom keyboard vs. native keyboard for puzzle input (test both)
* Consider haptic feedback on cell selection
* Chat panels must be accessible without leaving the puzzle (slide-up or collapsible)
* Clue list for crosswords needs a compact mobile layout (not a sidebar — that's desktop)
* Orientation: portrait-primary, but landscape could be nice for crosswords on tablet
* All interactions should feel native to iOS/Android — no hover-dependent features as primary interactions
MVP Scope
Must Have (v1)
* [ ] Firebase Auth (email/password)
* [ ] Create/join Shelves with invite codes
* [ ] Name your Shelf
* [ ] Choose color per Shelf (8 curated options)
* [ ] Add crossword puzzles by date (LA Times via xword-dl)
* [ ] Add sudoku puzzles by difficulty
* [ ] Real-time collaborative solving with user-colored cells
* [ ] Presence indicators (who is in which puzzle)
* [ ] Check word / check puzzle / reveal word (crossword)
* [ ] Check cell / check puzzle (sudoku)
* [ ] Sudoku conflict detection (client-side)
* [ ] Cell validation states (unchecked, correct, incorrect, revealed)
* [ ] Puzzle completion detection
* [ ] Shelf chat with timestamps and reactions
* [ ] Puzzle chat with timestamps and reactions
* [ ] Basic stats (contribution %, puzzles completed)
* [ ] Dark mode + light mode
* [ ] Bookshelf palette
* [ ] Mobile-first responsive design
Nice to Have (v2+)
* [ ] Google sign-in
* [ ] Stats dashboard with full breakdown
* [ ] Clean solve tracking and streaks
* [ ] Push notifications ("Kelly just started a new puzzle!")
* [ ] Puzzle archive/history
* [ ] Additional puzzle types
* [ ] App Store deployment (requires puzzle source pivot)
* [ ] Custom avatars/profile pictures
