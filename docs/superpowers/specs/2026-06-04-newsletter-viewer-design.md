# Newsletter Viewer — Design Spec

**Date:** 2026-06-04  
**Status:** Approved

## Overview

A static newsletter viewer built with Astro, deployed to Cloudflare Pages. Newsletter markdown files live in `newsletters/YYYY/Month/YYYY-MM-DD.md` and are committed by a daily routine. Each git push triggers a Cloudflare Pages rebuild, which rediscovers all newsletters automatically — no manual configuration needed when new editions are added.

The index always shows the most recent newsletter. Every page has prev/next navigation. A separate archive page lists all editions grouped by year.

---

## Architecture

The Astro project lives at the repo root. The `newsletters/` folder is the source of truth and is never modified by the viewer code.

```
repo root
├── newsletters/
│   └── 2026/June/2026-06-04.md    ← source files, untouched by the viewer
├── src/
│   ├── lib/
│   │   └── newsletters.ts          ← glob, parse, sort — single source of truth
│   ├── layouts/
│   │   └── Layout.astro            ← dark navy HTML shell, global CSS, <head>
│   └── pages/
│       ├── index.astro             ← renders most recent newsletter
│       ├── [year]/
│       │   └── [month]/
│       │       └── [date].astro    ← individual newsletter page
│       └── archive.astro           ← full reverse-chronological list
├── astro.config.mjs
├── package.json
└── .gitignore                      ← must include dist/, .superpowers/
```

---

## File Discovery

At build time, `src/lib/newsletters.ts` does the following:

1. Globs all files matching `newsletters/**/*.md` using `import.meta.glob`.
2. Extracts the URL path segments (year, month, date slug) from each file's path, lowercasing all segments to ensure consistent URLs regardless of how the routine capitalizes the month folder (e.g. `June` → `june`).
3. Extracts the title from the first `# heading` in each file's markdown content.
4. Sorts the list descending by date string. ISO `YYYY-MM-DD` format sorts correctly lexicographically, so no date parsing is needed.
5. Returns the full sorted array. Every page calls this one function.

```typescript
interface Newsletter {
  slug: string       // "2026-06-04"
  year: string       // "2026"
  month: string      // "june"  (lowercased folder name)
  url: string        // "/2026/june/2026-06-04"
  title: string      // "Morning Digest, June 4, 2026"
  Content: AstroComponent
}

export function getNewsletters(): Newsletter[]  // sorted newest-first
```

**Assumption:** The routine always names month folders with the full month name (`June`, `July`, etc.), never numeric (`06`) or abbreviated (`Jun`). The viewer lowercases but does not otherwise normalize folder names.

---

## URL Structure

| URL | Description |
|-----|-------------|
| `/` | Index — always renders the most recent newsletter |
| `/2026/june/2026-06-04` | Individual newsletter page |
| `/archive` | Full list of all newsletters, grouped by year |

URLs are derived from the file path, not parsed from metadata. Adding a new `.md` file in the correct folder structure automatically produces its URL on next build.

---

## Pages

### `index.astro`

- Calls `getNewsletters()`, takes index `[0]` (most recent).
- Renders the full newsletter content using `Layout.astro`.
- Nav bar shows: `← [prev date]` | site name | ~~next~~ (grayed — already latest).
- The index is a rendered page, not a redirect. Visiting `/` shows the newsletter immediately.

### `[year]/[month]/[date].astro`

- `getStaticPaths()` maps every newsletter to its route, passing `prev` and `next` references from the sorted list.
- Renders full content.
- Nav bar shows prev and next links; whichever end is missing is grayed out.

### `archive.astro`

- Gets the full sorted list.
- Groups entries by year.
- Each row: date (short format, e.g. "Jun 4") and the newsletter title as a link.
- Most recent year at the top; within each year, most recent first.
- Nav bar shows: `← Latest` | site name.

---

## Visual Design — Dark Digest

| Token | Value |
|-------|-------|
| Page background | `#0f172a` |
| Nav / surface | `#0a1120` |
| Border | `#1e293b` |
| Text primary | `#f1f5f9` |
| Text secondary | `#94a3b8` |
| Text muted | `#475569` |
| Links | `#38bdf8` (cyan) |
| Font | `system-ui`, sans-serif |
| Content max-width | `740px`, centered |

**Layout:**
- Sticky top nav bar: `← prev date | MORNING DIGEST | next date →`
- Newsletter header: label ("Morning Digest"), date as `h1`, meta line (newsletter count · story count)
- Content sections separated by subtle horizontal rules
- Matching bottom nav for prev/next + archive link

**Markdown rendering approach:**

Astro's `<Content />` component renders each newsletter's markdown to standard HTML. CSS targets those standard elements — no custom parsing or section-specific templates:

| Markdown element | CSS target | Style |
|-----------------|------------|-------|
| `## Section` | `h2` | Uppercase, letter-spacing, muted color, bottom border |
| `### [Story title](url)` | `h3 a` | Cyan, semibold |
| `*(N newsletters)*` | `h3 + em` | Italic, muted |
| Story paragraph | `h3 ~ p` | Secondary text color |
| Bullet lists | `ul li` | Clean spacing, bottom border between items |
| Bold terms in lists | `li strong` | Primary text color |
| Final paragraph (Shower Thoughts) | `h2:last-of-type ~ p` | Left cyan border, italic, indented |

All external links open in a new tab (`target="_blank" rel="noopener"`).

---

## Deployment — Cloudflare Pages

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js version | 18 or higher |
| Root directory | `/` (repo root) |

Automatic deployments trigger on every push to `main`. No environment variables required.

---

## Local Development

```bash
npm install
npm run dev    # starts Astro dev server at http://localhost:4321
```

The dev server hot-reloads on any change to `src/` or `newsletters/`. Adding a new `.md` file while the dev server is running will make the new newsletter appear immediately.

`.gitignore` must include:
```
dist/
node_modules/
.superpowers/
```
