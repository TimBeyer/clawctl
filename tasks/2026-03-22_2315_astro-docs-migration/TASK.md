# Migrate docs-site from React+Vite SPA to Astro

## Status: Resolved

## Scope

Replace the Vite+React SPA docs-site with an Astro static site. Same visual design, same Tailwind CSS 4, same GitHub Pages deployment. Interactive parts (asciinema player, copy buttons) become React islands; everything else renders as static HTML.

Does NOT cover: adding new pages, changing content, redesigning the site.

## Context

The current docs-site is a React SPA — the HTML source is an empty `<div id="root"></div>` and all content is rendered by JavaScript. Search engines that don't execute JS see nothing. Migrating to Astro gives us static HTML output (every heading, paragraph, terminal block in the source) while keeping interactive parts via React islands.

## Plan

**In-place replacement** of the Vite+React tooling with Astro inside `docs-site/`.

### Component Classification

| Component                                                                                         | Strategy                                                                  |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Nav, Hero, FleetDemo, Features, ConfigSection, FinalCTA, Footer, Divider, Terminal, JsonHighlight | **Astro component** (static HTML, zero JS)                                |
| FadeIn                                                                                            | **Web component** (~15 lines vanilla JS, no React)                        |
| CopyButton                                                                                        | **React island** (`client:visible`)                                       |
| AsciinemaTerminal                                                                                 | **React island** (`client:visible`)                                       |
| DemoSequence                                                                                      | **React island** (`client:visible`)                                       |
| CreateDemo / ManagementDemo                                                                       | **Astro component** with build-time `.cast` detection via `fs.existsSync` |

### Key Decisions

- **Tailwind CSS 4**: Use `@tailwindcss/vite` in Astro's `vite.plugins` (not `@astrojs/tailwind` which is v3 only)
- **FadeIn → web component**: `<fade-in>` custom element with IntersectionObserver, ~300 bytes vanilla JS
- **asciinema CSS**: Move from React component import to `global.css` to avoid FOUC
- **Cast detection**: Build-time `fs.existsSync` in Astro frontmatter replaces runtime HEAD fetch
- **SEO**: OG tags, Twitter cards, canonical URL, sitemap, robots.txt

## Steps

- [x] Create task directory and TASK.md
- [x] Scaffold Astro project (replace package.json, create astro.config.mjs, delete Vite files)
- [x] Create Base.astro layout with `<head>` (fonts, meta, OG tags, canonical)
- [x] Create index.astro page shell with background layers
- [x] Convert static sections to Astro components
- [x] Implement FadeIn as web component, wrap sections
- [x] Set up React islands (CopyButton, AsciinemaTerminal, DemoSequence) with `client:visible`
- [x] Build CreateDemo.astro and ManagementDemo.astro with build-time cast detection
- [x] Move asciinema-player CSS to global.css
- [x] Add robots.txt, verify sitemap generation
- [x] Delete old Vite artifacts
- [x] Build and verify

## Notes

- JsonHighlight needed to pre-render HTML in frontmatter via `set:html` — nested `.map()` with inline functions hit Astro's template parser limits.
- `import.meta.env.BASE_URL` in Astro is `/clawctl` (no trailing slash), needed explicit `/` before `casts/` paths.
- `.astro/` directory (generated types) added to `.gitignore`.

## Outcome

All content now renders as static HTML at build time. `dist/index.html` contains every heading, paragraph, and terminal block in the source. React islands hydrate only for interactive elements (copy buttons, asciinema player). Sitemap and robots.txt generated. GitHub Actions workflow unchanged.
