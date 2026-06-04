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
