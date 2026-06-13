export interface OutlineHeading {
  id: string;
  level: 1 | 2;
  text: string;
}

export function extractMarkdownOutline(markdown: string): OutlineHeading[] {
  const headings: OutlineHeading[] = [];
  const used = new Map<string, number>();

  for (const line of markdown.split(/\r?\n/)) {
    const match = /^(#{1,2})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const level = match[1].length as 1 | 2;
    const text = match[2].replace(/#+\s*$/, '').trim();
    if (!text) continue;

    const base = slugify(text) || `heading-${headings.length + 1}`;
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count + 1}`;
    headings.push({ id, level, text });
  }

  return headings;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
