# YuvKriti

Build a web app called "Love Story Runner": a co-op, two-player wedding game for a couple to play on their wedding day. The display is shown on a projector, and each partner plays from their own phone as a controller.

Routes:

- "/" : simple landing with three big buttons: "Host Game (Display)", "Join as Bride", "Join as Groom".

- "/setup" : admin page to personalise the game (protected by a simple passcode I set in an env/config value, no full auth).

- "/display" : the big-screen game page (landscape, 16:9, runs on a laptop or a phone).

- "/play" : the controller page for each partner.

Tech: React + TypeScript + Tailwind, Lovable Cloud (Supabase) for storage and Realtime. No user accounts for players.

Visual theme: Indian wedding, with marigold orange, deep maroon, gold accents, warm cream background, and a elegant serif display font with a clean sans for UI. Mobile-first for /play and /setup, 16:9 landscape-first for /display.

Set up the project structure, routing, theme, and shared types now. Don't build the game yet.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://yuvkriti.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/05a72a05-a058-4a22-a779-4ed7905dce55).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
