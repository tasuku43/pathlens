import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { ViewerService } from '../../src/app/viewer-service.js';
import { NodeFileSystem } from '../../src/infra/node-file-system.js';
import { startHttpServer } from '../../src/server/http-server.js';

let dir: string;
let server: { url: string; close: () => Promise<void> } | null = null;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'pathlens-e2e-'));
  await writeFile(path.join(dir, 'README.md'), '# E2E');
});

afterEach(async () => {
  await server?.close();
  await rm(dir, { recursive: true, force: true });
});

it('serves tree and file API responses', async () => {
  const service = new ViewerService({ fileSystem: new NodeFileSystem({ rootDir: dir }) });
  server = await startHttpServer({ host: '127.0.0.1', port: 0, service });
  const tree = await fetch(`${server.url}/api/tree`).then((res) => res.json());
  expect(JSON.stringify(tree)).toContain('README.md');
});
