# Newsletter Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Astro static site that reads `newsletters/YYYY/Month/YYYY-MM-DD.md` files, renders them in a Dark Digest style, and deploys to Cloudflare Pages with automatic rebuilds on git push.

**Architecture:** A single utility (`src/lib/newsletters.ts`) globs all `.md` files at build time, parses metadata from filenames, and returns a sorted list all three pages share. Astro's `getStaticPaths()` generates one route per newsletter file. No manual registry — pushing a new `.md` file is all it takes to publish a new edition.

**Tech Stack:** Astro 5, TypeScript, Vitest (unit tests for pure helpers), `rehype-external-links` (open all links in new tab), plain CSS via `<style is:global>` in Layout.astro, Cloudflare Pages.

---

## File Structure

| File | Responsibility |
|------|---------------|
| `package.json` | Astro + Vitest + rehype-external-links deps; npm scripts |
| `astro.config.mjs` | Astro config with rehype-external-links plugin |
| `tsconfig.json` | Strict TypeScript with `@/*` → `src/*` path alias |
| `vitest.config.ts` | Vitest config scoped to `src/**/*.test.ts` |
| `src/env.d.ts` | Astro client type reference |
| `.gitignore` | Excludes `dist/`, `node_modules/`, `.astro/`, `.superpowers/` |
| `src/lib/newsletters.ts` | All newsletter logic: glob, parse, sort, format — pure helpers exported for testing |
| `src/lib/newsletters.test.ts` | Unit tests for pure helper functions |
| `src/layouts/Layout.astro` | Dark navy HTML shell + all global CSS |
| `src/pages/index.astro` | Renders most recent newsletter |
| `src/pages/[year]/[month]/[date].astro` | Individual newsletter page with prev/next |
| `src/pages/archive.astro` | All newsletters grouped by year |

---

### Task 1: Scaffold Astro project

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/env.d.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "newsletter-viewer",
  "type": "module",
  "version": "0.0.1",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "rehype-external-links": "^3.0.0"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create `astro.config.mjs`**

```javascript
import { defineConfig } from 'astro/config';
import rehypeExternalLinks from 'rehype-external-links';

export default defineConfig({
  markdown: {
    rehypePlugins: [
      [rehypeExternalLinks, { target: '_blank', rel: ['noopener'] }],
    ],
  },
});
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Create `src/env.d.ts`**

```typescript
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
```

- [ ] **Step 6: Create `.gitignore`**

```
dist/
node_modules/
.astro/
.superpowers/
```

- [ ] **Step 7: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, `package-lock.json` written. No errors.

- [ ] **Step 8: Verify Astro CLI is available**

```bash
npx astro --version
```

Expected: prints a version number like `5.x.x`. If it fails, check that `npm install` completed without errors.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json vitest.config.ts src/env.d.ts .gitignore
git commit -m "feat: scaffold Astro project"
```

---

### Task 2: Newsletter utility

**Files:**
- Create: `src/lib/newsletters.ts`
- Create: `src/lib/newsletters.test.ts`

The utility has two layers: **pure helper functions** (exported, testable with Vitest) and **`getNewsletters()`** (uses `import.meta.glob`, not unit-tested — Vitest can't resolve the project-root glob). Write tests for the helpers first, then implement everything together.

- [ ] **Step 1: Write failing tests in `src/lib/newsletters.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { parseNewsletterPath, extractTitle, formatDate, formatShortDate } from './newsletters';

describe('parseNewsletterPath', () => {
  it('extracts year, month (lowercased), slug, and url', () => {
    expect(parseNewsletterPath('/newsletters/2026/June/2026-06-04.md')).toEqual({
      year: '2026',
      month: 'june',
      slug: '2026-06-04',
      url: '/2026/june/2026-06-04',
    });
  });

  it('lowercases month regardless of casing', () => {
    expect(parseNewsletterPath('/newsletters/2025/DECEMBER/2025-12-31.md').month).toBe('december');
    expect(parseNewsletterPath('/newsletters/2025/december/2025-12-31.md').month).toBe('december');
  });

  it('builds url from year, lowercased month, and slug', () => {
    expect(parseNewsletterPath('/newsletters/2025/May/2025-05-15.md').url).toBe('/2025/may/2025-05-15');
  });
});

describe('extractTitle', () => {
  it('returns text of the first h1 heading', () => {
    const md = '# Morning Digest, June 4, 2026\n\n*14 newsletters*';
    expect(extractTitle(md, 'fallback')).toBe('Morning Digest, June 4, 2026');
  });

  it('returns fallback when no h1 exists', () => {
    expect(extractTitle('## Only an H2\n\nsome content', '2026-06-04')).toBe('2026-06-04');
  });

  it('trims whitespace from the heading', () => {
    expect(extractTitle('#  Spaced Title  ', 'fallback')).toBe('Spaced Title');
  });
});

describe('formatDate', () => {
  it('formats YYYY-MM-DD as "Mon D, YYYY"', () => {
    expect(formatDate('2026-06-04')).toBe('Jun 4, 2026');
  });

  it('removes leading zero from day', () => {
    expect(formatDate('2026-01-08')).toBe('Jan 8, 2026');
  });

  it('handles end of year', () => {
    expect(formatDate('2025-12-31')).toBe('Dec 31, 2025');
  });
});

describe('formatShortDate', () => {
  it('formats YYYY-MM-DD as "Mon D" without year', () => {
    expect(formatShortDate('2026-06-04')).toBe('Jun 4');
  });

  it('removes leading zero from day', () => {
    expect(formatShortDate('2026-06-01')).toBe('Jun 1');
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npm test
```

Expected: FAIL with `Cannot find module './newsletters'`.

- [ ] **Step 3: Implement `src/lib/newsletters.ts`**

```typescript
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

interface MDModule {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Content: any;
  rawContent(): string;
}

export interface Newsletter {
  slug: string;
  year: string;
  month: string;
  url: string;
  title: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Content: any;
}

export function parseNewsletterPath(path: string): Pick<Newsletter, 'year' | 'month' | 'slug' | 'url'> {
  const parts = path.split('/');
  const filename = parts[parts.length - 1];
  const month = parts[parts.length - 2].toLowerCase();
  const year = parts[parts.length - 3];
  const slug = filename.replace('.md', '');
  return { year, month, slug, url: `/${year}/${month}/${slug}` };
}

export function extractTitle(rawContent: string, fallback: string): string {
  const match = rawContent.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

export function formatDate(slug: string): string {
  const [year, month, day] = slug.split('-');
  return `${MONTHS[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
}

export function formatShortDate(slug: string): string {
  const [, month, day] = slug.split('-');
  return `${MONTHS[parseInt(month, 10) - 1]} ${parseInt(day, 10)}`;
}

export function getNewsletters(): Newsletter[] {
  const files = import.meta.glob<MDModule>('/newsletters/**/*.md', { eager: true });
  // root-relative glob resolves to <project-root>/newsletters/**/*.md at build time
  return Object.entries(files)
    .map(([path, file]) => {
      const parsed = parseNewsletterPath(path);
      return {
        ...parsed,
        title: extractTitle(file.rawContent(), parsed.slug),
        Content: file.Content,
      };
    })
    .sort((a, b) => b.slug.localeCompare(a.slug));
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npm test
```

Expected: all 9 tests PASS. If any fail, read the failure message and fix the implementation — do not modify the tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/newsletters.ts src/lib/newsletters.test.ts
git commit -m "feat: add newsletter utility with file discovery and date helpers"
```

---

### Task 3: Layout component

**Files:**
- Create: `src/layouts/Layout.astro`

This is the only file that contains CSS. All styles are `is:global` because they need to reach inside the `<Content />` component's rendered markdown output.

- [ ] **Step 1: Create `src/layouts/Layout.astro`**

```astro
---
interface Props {
  title: string;
  prev?: { url: string; label: string };
  next?: { url: string; label: string };
}
const { title, prev, next } = Astro.props;
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title} — Morning Digest</title>
</head>
<body>
  <nav class="site-nav">
    <div class="nav-inner">
      {prev
        ? <a href={prev.url} class="nav-link">← {prev.label}</a>
        : <span class="nav-link disabled">←</span>
      }
      <a href="/" class="nav-brand">Morning Digest</a>
      {next
        ? <a href={next.url} class="nav-link">{next.label} →</a>
        : <span class="nav-link disabled">→</span>
      }
    </div>
  </nav>
  <slot />
</body>
</html>

<style is:global>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #0f172a;
    color: #94a3b8;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    font-size: 15px;
    line-height: 1.65;
  }

  a { color: #38bdf8; text-decoration: none; }
  a:hover { text-decoration: underline; }

  /* ── Nav ──────────────────────────────── */
  .site-nav {
    background: #0a1120;
    border-bottom: 1px solid #1e293b;
    padding: 10px 0;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .nav-inner {
    max-width: 740px;
    margin: 0 auto;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .nav-link { font-size: 13px; color: #64748b; }
  .nav-link:hover { color: #94a3b8; text-decoration: none; }
  .nav-link.disabled { color: #1e293b; cursor: default; pointer-events: none; }
  .nav-brand {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #475569;
  }
  .nav-brand:hover { text-decoration: none; color: #64748b; }

  /* ── Newsletter content ───────────────── */
  .content {
    max-width: 740px;
    margin: 0 auto;
    padding: 32px 20px 0;
  }

  .content h1 {
    font-size: 26px;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 4px;
  }

  /* The italic meta line (*14 newsletters, 8 stories*) sits right below h1 */
  .content h1 + p {
    font-size: 13px;
    color: #475569;
    margin-bottom: 0;
  }

  .content hr {
    border: none;
    border-top: 1px solid #1e293b;
    margin: 20px 0 28px;
  }

  .content h2 {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #475569;
    margin: 36px 0 0;
    padding-bottom: 8px;
    border-bottom: 1px solid #1e293b;
  }

  /* Story heading */
  .content h3 {
    font-size: 16px;
    font-weight: 600;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #1e293b;
  }
  /* First story under a section: no extra top border */
  .content h2 + h3 {
    margin-top: 12px;
    padding-top: 0;
    border-top: none;
  }
  .content h3 a { color: #38bdf8; }

  /* Newsletter count line: *(4 newsletters)* immediately after h3 */
  .content h3 + p {
    font-size: 12px;
    color: #475569;
    font-style: italic;
    margin: 4px 0 8px;
  }

  /* All other paragraphs */
  .content p { color: #94a3b8; }

  /* Bullet lists (Also Worth Knowing, Quick Hits) */
  .content ul { list-style: none; }
  .content ul li {
    padding: 10px 0;
    border-bottom: 1px solid #1e293b;
    font-size: 14px;
    color: #94a3b8;
    line-height: 1.55;
  }
  .content ul li:last-child { border-bottom: none; }
  .content li strong { color: #cbd5e1; }

  /* Shower Thoughts — the paragraph immediately after the last h2 */
  .content h2:last-of-type + p {
    border-left: 3px solid #38bdf8;
    padding-left: 16px;
    font-style: italic;
    color: #94a3b8;
    margin-top: 12px;
  }

  /* ── Bottom nav ───────────────────────── */
  .bottom-nav {
    max-width: 740px;
    margin: 32px auto 0;
    padding: 20px 20px 48px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #1e293b;
    font-size: 13px;
  }
  .bottom-nav a { color: #64748b; }
  .bottom-nav a:hover { color: #94a3b8; text-decoration: none; }
  .bottom-nav .disabled { color: #1e293b; }

  /* ── Archive page ─────────────────────── */
  .archive-content {
    max-width: 740px;
    margin: 0 auto;
    padding: 32px 20px 60px;
  }
  .archive-title {
    font-size: 26px;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 32px;
  }
  .year-group { margin-bottom: 40px; }
  .year-heading {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #334155;
    padding-bottom: 8px;
    border-bottom: 1px solid #1e293b;
    margin-bottom: 0;
  }
  .archive-entry {
    display: flex;
    align-items: baseline;
    gap: 16px;
    padding: 10px 0;
    border-bottom: 1px solid #1e293b;
  }
  .archive-entry:last-child { border-bottom: none; }
  .archive-date {
    font-size: 13px;
    color: #475569;
    white-space: nowrap;
    min-width: 52px;
    font-variant-numeric: tabular-nums;
  }
  .archive-link { font-size: 15px; color: #38bdf8; }

  /* ── Responsive ───────────────────────── */
  @media (max-width: 600px) {
    .content, .archive-content, .bottom-nav { padding-left: 16px; padding-right: 16px; }
    .content h1 { font-size: 22px; }
    .content h3 { font-size: 15px; }
  }
</style>
```

- [ ] **Step 2: Verify Astro can process the file**

```bash
npx astro check
```

Expected: no errors. If you see type errors about the `Props` interface, check the frontmatter syntax.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "feat: add Layout component with Dark Digest styles"
```

---

### Task 4: Index page

**Files:**
- Create: `src/pages/index.astro`

The index renders the most recent newsletter directly — no redirect. It shows a "← prev" link if a second newsletter exists; the "→ next" slot is always disabled since this is always the latest.

- [ ] **Step 1: Create `src/pages/index.astro`**

```astro
---
import Layout from '@/layouts/Layout.astro';
import { getNewsletters, formatDate } from '@/lib/newsletters';

const newsletters = getNewsletters();
const latest = newsletters[0];
const older = newsletters[1];

const { Content, title, slug } = latest;
---

<Layout
  title={title}
  prev={older ? { url: older.url, label: formatDate(older.slug) } : undefined}
>
  <div class="content">
    <Content />
  </div>
  <nav class="bottom-nav">
    {older
      ? <a href={older.url}>← {formatDate(older.slug)}</a>
      : <span class="disabled">←</span>
    }
    <a href="/archive">Archive</a>
    <span class="disabled">→</span>
  </nav>
</Layout>
```

- [ ] **Step 2: Start the dev server and verify**

```bash
npm run dev
```

Open http://localhost:4321 in a browser.

Expected:
- Dark navy background, sticky nav bar at top showing "Morning Digest" in center
- Nav left shows "←" disabled (only one newsletter exists)
- Newsletter content renders with correct heading, meta line, sections
- All story links are cyan and open in a new tab
- Bottom nav shows "Archive" link in center, disabled arrows on both sides

- [ ] **Step 3: Stop the dev server and commit**

```bash
git add src/pages/index.astro
git commit -m "feat: add index page rendering most recent newsletter"
```

---

### Task 5: Individual newsletter page

**Files:**
- Create: `src/pages/[year]/[month]/[date].astro`

`getStaticPaths()` maps every newsletter to a route. The sorted list is newest-first, so for a newsletter at index `i`: the older one is at `i + 1` and the newer one is at `i - 1`.

- [ ] **Step 1: Create `src/pages/[year]/[month]/[date].astro`**

```astro
---
import type { GetStaticPaths } from 'astro';
import Layout from '@/layouts/Layout.astro';
import { getNewsletters, formatDate } from '@/lib/newsletters';
import type { Newsletter } from '@/lib/newsletters';

export const getStaticPaths: GetStaticPaths = () => {
  const newsletters = getNewsletters();
  return newsletters.map((newsletter, index) => ({
    params: {
      year: newsletter.year,
      month: newsletter.month,
      date: newsletter.slug,
    },
    props: {
      newsletter,
      older: newsletters[index + 1] ?? null,
      newer: newsletters[index - 1] ?? null,
    },
  }));
};

interface Props {
  newsletter: Newsletter;
  older: Newsletter | null;
  newer: Newsletter | null;
}

const { newsletter, older, newer } = Astro.props;
const { Content, title } = newsletter;
---

<Layout
  title={title}
  prev={older ? { url: older.url, label: formatDate(older.slug) } : undefined}
  next={newer ? { url: newer.url, label: formatDate(newer.slug) } : undefined}
>
  <div class="content">
    <Content />
  </div>
  <nav class="bottom-nav">
    {older
      ? <a href={older.url}>← {formatDate(older.slug)}</a>
      : <span class="disabled">←</span>
    }
    <a href="/archive">Archive</a>
    {newer
      ? <a href={newer.url}>{formatDate(newer.slug)} →</a>
      : <span class="disabled">→</span>
    }
  </nav>
</Layout>
```

- [ ] **Step 2: Start the dev server and verify**

```bash
npm run dev
```

Navigate to http://localhost:4321/2026/june/2026-06-04

Expected:
- Page renders the June 4 newsletter
- Nav bar shows "←" disabled on left (oldest/only newsletter), "→" disabled on right (newest)
- Bottom nav same pattern
- "Archive" link is present in the center

- [ ] **Step 3: Stop the dev server and commit**

```bash
git add "src/pages/[year]/[month]/[date].astro"
git commit -m "feat: add individual newsletter page with prev/next routing"
```

---

### Task 6: Archive page

**Files:**
- Create: `src/pages/archive.astro`

Groups newsletters by year (descending), then lists each with a short date and title. Nav uses `prev = { url: '/', label: 'Latest' }` so the top-left shows "← Latest".

- [ ] **Step 1: Create `src/pages/archive.astro`**

```astro
---
import Layout from '@/layouts/Layout.astro';
import { getNewsletters, formatShortDate } from '@/lib/newsletters';

const newsletters = getNewsletters();

// Group by year, preserving descending order within each year
const byYear = newsletters.reduce<Record<string, typeof newsletters>>((acc, n) => {
  (acc[n.year] ??= []).push(n);
  return acc;
}, {});

// Years sorted descending
const years = Object.keys(byYear).sort((a, b) => b.localeCompare(a));
---

<Layout title="Archive" prev={{ url: '/', label: 'Latest' }}>
  <div class="archive-content">
    <h1 class="archive-title">Archive</h1>

    {years.map(year => (
      <div class="year-group">
        <div class="year-heading">{year}</div>
        {byYear[year].map(n => (
          <div class="archive-entry">
            <span class="archive-date">{formatShortDate(n.slug)}</span>
            <a href={n.url} class="archive-link">{n.title}</a>
          </div>
        ))}
      </div>
    ))}
  </div>
</Layout>
```

- [ ] **Step 2: Start dev server and verify**

```bash
npm run dev
```

Navigate to http://localhost:4321/archive

Expected:
- "Archive" as page title
- Nav shows "← Latest" on the left (links to `/`), "→" disabled on right
- Year group "2026" with one entry: "Jun 4" and "Morning Digest, June 4, 2026" as a link
- Clicking the entry navigates to the newsletter page

- [ ] **Step 3: Stop dev server and commit**

```bash
git add src/pages/archive.astro
git commit -m "feat: add archive page with year grouping"
```

---

### Task 7: Build and verify

No new files. Verify the production build works and produces the correct output.

- [ ] **Step 1: Run the production build**

```bash
npm run build
```

Expected:
- Build completes with no errors
- `dist/` directory created
- Output includes: `dist/index.html`, `dist/2026/june/2026-06-04/index.html`, `dist/archive/index.html`

- [ ] **Step 2: Preview the production build locally**

```bash
npm run preview
```

Open http://localhost:4321 (or whatever port Astro prints).

Verify all three pages work:
- `/` — renders latest newsletter
- `/2026/june/2026-06-04` — renders the newsletter with nav
- `/archive` — shows archive list
- Nav prev/next links work correctly
- "← Latest" on archive links back to `/`

- [ ] **Step 3: Commit any fixes, then commit a build-verified note**

If `npm run build` needed any fixes, commit them. Then:

```bash
git add -A
git commit -m "chore: verify production build"
```

---

### Task 8: Cloudflare Pages setup

No code files — this task configures the deployment in the Cloudflare dashboard.

- [ ] **Step 1: Push the branch to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Create a Cloudflare Pages project**

In the [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages → Create a project → Connect to Git.

Select this repository.

- [ ] **Step 3: Configure build settings**

| Setting | Value |
|---------|-------|
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |
| Node.js version | `18` (set in Environment variables as `NODE_VERSION = 18`) |

- [ ] **Step 4: Deploy and verify**

Click "Save and Deploy". Wait for the build to complete (~1-2 minutes).

Open the `*.pages.dev` URL Cloudflare assigns.

Expected: all three pages load, styling matches the local preview, external links open in new tabs.

- [ ] **Step 5: Verify automatic deploys work**

Add a test newsletter file (e.g. copy `newsletters/2026/June/2026-06-04.md` to `newsletters/2026/June/2026-06-05.md` and adjust the title), commit, and push.

```bash
git add newsletters/
git commit -m "test: add second newsletter to verify auto-deploy"
git push origin main
```

Watch the Cloudflare Pages dashboard — a new build should trigger automatically. After it completes, verify the new newsletter appears on `/`, the prev/next links update, and the archive shows both editions.

Once confirmed, you can revert the test file if it was fake content:

```bash
git revert HEAD
git push origin main
```
