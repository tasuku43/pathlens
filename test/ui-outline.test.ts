import { describe, expect, it } from 'vitest';
import { extractMarkdownOutline } from '../src/ui/state/outline.js';

describe('extractMarkdownOutline', () => {
  it('extracts H1 and H2 headings with stable ids', () => {
    expect(extractMarkdownOutline('# Title\n\n## Intro\n### Ignore\n## Intro')).toEqual([
      { id: 'title', level: 1, text: 'Title' },
      { id: 'intro', level: 2, text: 'Intro' },
      { id: 'intro-2', level: 2, text: 'Intro' },
    ]);
  });
});
