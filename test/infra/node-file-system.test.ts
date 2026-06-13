import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { NodeFileSystem } from '../../src/infra/node-file-system.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'pathlens-'));
  await writeFile(path.join(dir, 'README.md'), '# Hello');
  await mkdir(path.join(dir, 'node_modules'));
  await writeFile(path.join(dir, 'node_modules', 'ignored.js'), 'ignored');
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

it('scans a tree and ignores default ignored directories', async () => {
  const fs = new NodeFileSystem({ rootDir: dir });
  const tree = await fs.readTree();
  expect(tree.nodes.map((node) => node.path)).toContain('README.md');
  expect(JSON.stringify(tree)).not.toContain('node_modules');
});

it('reads a file payload with viewer kind and etag', async () => {
  const fs = new NodeFileSystem({ rootDir: dir });
  const file = await fs.readFile('README.md');
  expect(file.viewerKind).toBe('markdown');
  expect(file.etag).toMatch(/^sha256:/);
});
