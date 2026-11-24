# Love Story Runner foundation

## Build scope
- Replace the template home page with a wedding-day starting screen and three large actions: Host Game (Display), Join as Bride, and Join as Groom.
- Add `/setup`, `/display`, and `/play` as mobile-friendly setup and controller screens, plus a 16:9-first display screen. Keep them as purposeful scaffolds; do not add game mechanics.
- Define the marigold, deep maroon, gold, warm cream, elegant serif, and clean sans design tokens centrally.
- Add shared TypeScript types for a game session, partner roles, player inputs, and realtime events.
- Enable Lovable Cloud as the requested persistence and Realtime foundation, without inventing game data or building gameplay.
- Protect `/setup` with a shared, environment-backed passcode and encrypted session; no player accounts. Request the passcode securely rather than placing it in source.
- Give each page its own app-specific metadata and add focused route coverage.

## Technical approach
- Use TanStack Start file-based routes and existing shadcn/Tailwind tokens.
- Keep server-only passcode and session handling inside `createServerFn` handlers, compatible with the hosting runtime.
- Preserve the project’s generated route tree and use Lovable Cloud generated client modules only after Cloud is enabled.
