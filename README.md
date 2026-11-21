# hw: Road Scroll (Hack Western 13)

Pre-prototype phase. We try ideas fast in a shared **playground** web app and keep what works.

- `playground/`: Next.js app that holds every prototype. Rules: [`playground/AGENTS.md`](playground/AGENTS.md)
- `docs/`: design brief (`docs/playground/references/idea-breakdown.md`) and references
- Hosting: **local only for now** (`npm run dev` / `npm run build && npm start`). Vercel setup is deferred: [`docs/playground/vercel-setup.md`](docs/playground/vercel-setup.md)

## Teammates: get started

### Make a prototype (laptop or phone)
You don't write the boilerplate. A coding agent does, by following `playground/AGENTS.md`.

- **From a phone:** open Claude Code on the web (claude.ai/code) or your agent of choice, and select the `Thomson-Lam/hw` repo. Ask, for example:
  > Make a playground prototype called `fork-tap`: three road signs at a fork; tapping one bends the road toward it. Add controls for sign count and bend speed.
  The agent reads `CLAUDE.md` → `playground/AGENTS.md`. It builds on a branch, runs the checks, opens a PR, and posts the preview link.
- **From a laptop:** run your agent (Claude Code, Codex, Cursor…) in the repo root with the same kind of request.

### Rules of thumb
- Each prototype is one folder: `playground/app/prototypes/<slug>/`. Don't import from another person's prototype. Copy instead.
- Work on a branch, never on `main`. Before you push, `npm run check` must pass. CI runs the same check on every PR.
- Open a prototype on your phone from the PR's Vercel preview link: `<preview>/prototypes/<slug>`.
- Prototypes are private (password) by default. A prototype goes public at `/p/<slug>` only when Thomson asks for it.
- When something breaks and you fix it, add the lesson to `playground/AGENTS.md` §4.
