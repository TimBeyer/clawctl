# Add GitHub Pages site skeleton (Vite + React + TypeScript + Tailwind)

## Status: Resolved

## Scope

Set up an empty skeleton for a React-based GitHub Pages site using Vite, in a
new `docs-site/` top-level directory. Standalone Vite project — not a Bun
workspace member — since it has different tooling and deploys independently.

Includes a GitHub Actions workflow for deploying to Pages on push to main.

Does **not** include actual documentation content — just the working skeleton.

## Plan

1. Scaffold `docs-site/` with Vite 6 + React 18 + TypeScript + Tailwind v4
2. Create GitHub Actions workflow for Pages deployment
3. Verify build works

## Steps

- [x] Create `docs-site/` directory structure and all config files
- [x] Create GitHub Actions workflow `.github/workflows/pages.yml`
- [x] Verify `bun install && bun run build` works

## Notes

- Using Tailwind v4 with `@tailwindcss/vite` plugin (CSS-first config)
- `base` in vite.config.ts set to `/create-openclaw-vm/` for GitHub Pages
- Not added to root Bun workspaces — independent project

## Outcome

Delivered the full skeleton:

- `docs-site/` with Vite 6 + React 18 + TypeScript + Tailwind v4
- GitHub Actions workflow (`.github/workflows/pages.yml`) using `actions/deploy-pages`
- `tsc -b && vite build` passes cleanly, producing `dist/` with correct `/create-openclaw-vm/` base path
- Not added to root Bun workspaces — fully independent project
