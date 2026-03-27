# Puzzle Shelf — Claude Instructions

## Testing

**Always test through the Chrome MCP, not local preview.**

The app requires Firebase Authentication and Firestore to function — login, shelf loading, puzzle state, and the TOS acceptance flow all depend on live Firebase data. The local Vite dev server works for build verification, but any feature that touches auth or Firestore must be tested through Chrome MCP against the running app (local or deployed).

Use `mcp__Claude_in_Chrome__*` tools for:
- Navigating pages and verifying UI
- Testing auth flows (login, signup, TOS modal)
- Verifying Firestore reads/writes (shelf loading, puzzle state, tosAcceptedAt)
- Any feature that requires being logged in

Only use `mcp__Claude_Preview__*` for checking build errors or verifying purely static rendering with no auth dependency.

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
