# Puzzle Shelf — Claude Instructions

## Testing

Use the local Vite dev server (`mcp__Claude_Preview__*`) for testing — it connects to the real Firebase project so auth and Firestore work normally. Use Chrome MCP to verify the deployed Vercel build when needed.

### Test Account

- **Email:** johnnychadwick@comcast.net
- **Password:** TestShelf#2026

Firebase Auth persists the session in localStorage, so login is only needed once per preview server session. Use this account whenever the session has expired.

## Tech Stack

- **Frontend:** React + Vite + TypeScript
- **Styling:** Tailwind CSS v4 + inline styles with CSS custom properties
- **Backend:** Firebase (Auth + Firestore + Cloud Functions)
- **Hosting:** Vercel (auto-deploys from `main`)

## Key Files

- `src/App.tsx` — router, all routes defined here
- `src/hooks/useAuth.ts` — Firebase auth state hook (keep this simple/fast, no extra Firestore reads)
- `src/components/auth/AuthGuard.tsx` — protects routes; handles TOS check via its own Firestore fetch
- `src/lib/firebase.ts` — Firebase config and exported `auth`, `db`, `functions`
- `src/index.css` — CSS variables, dark mode, global utility classes (`.surface`, `.btn-primary`, etc.)
- `src/types/index.ts` — all TypeScript interfaces

## Firestore Schema

- `users/{uid}` — `displayName`, `email`, `createdAt`, `tosAcceptedAt` (Timestamp or missing)
- `shelves/{shelfId}` — shelf with `members`, `inviteCode`, etc.
- `shelves/{shelfId}/puzzles/{puzzleId}` — individual puzzles

## Architecture Notes

- `useAuth` is called by many components — keep it fast. Do NOT add async Firestore reads to it.
- TOS acceptance check lives in `AuthGuard` only, with its own `getDoc` keyed on `user.uid`.
- No global auth context/provider — each component subscribes independently via `useAuth`.
- Styling uses inline `style` props + CSS custom property variables. No CSS modules.
- Dark mode via `.dark` class on `document.documentElement`.
