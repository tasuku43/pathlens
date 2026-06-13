import { createServer, type AddressInfo, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ViewerService } from '../app/viewer-service.js';

export interface ServerOptions {
  host: string;
  port: number;
  service: ViewerService;
  staticDir?: string;
}

export async function startHttpServer(options: ServerOptions): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer(async (req, res) => {
    try {
      await routeRequest(req, res, options);
    } catch (error) {
      sendJson(res, 500, { error: error instanceof Error ? error.message : 'unknown error' });
    }
  });

  await options.service.start();

  await new Promise<void>((resolve) => server.listen(options.port, options.host, resolve));
  const address = server.address() as AddressInfo;
  const actualPort = address.port;

  return {
    url: `http://${options.host}:${actualPort}`,
    close: async () => {
      await options.service.stop();
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    },
  };
}

async function routeRequest(req: IncomingMessage, res: ServerResponse, options: ServerOptions): Promise<void> {
  const host = req.headers.host ?? `${options.host}:${options.port}`;
  const url = new URL(req.url ?? '/', `http://${host}`);

  if (url.pathname === '/api/tree') {
    sendJson(res, 200, await options.service.readTree());
    return;
  }

  if (url.pathname === '/api/file') {
    const requestedPath = url.searchParams.get('path') ?? '';
    sendJson(res, 200, await options.service.readFile(requestedPath));
    return;
  }

  if (url.pathname === '/preview/html') {
    const requestedPath = url.searchParams.get('path') ?? '';
    const html = await options.service.readHtmlPreview(requestedPath);
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-store',
    });
    res.end(html);
    return;
  }

  if (url.pathname === '/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
    });
    const unsubscribe = options.service.subscribe((event) => {
      res.write(`event: fs\n`);
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
    req.on('close', unsubscribe);
    return;
  }

  await serveSpa(req, res, options.staticDir);
}

async function serveSpa(req: IncomingMessage, res: ServerResponse, staticDir?: string): Promise<void> {
  const base = staticDir ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../ui');
  const requested = req.url && req.url !== '/' ? req.url.split('?')[0] : '/index.html';
  const filePath = path.join(base, requested ?? '/index.html');
  try {
    const content = await readFile(filePath);
    res.writeHead(200, { 'content-type': contentTypeFor(filePath) });
    res.end(content);
  } catch {
    const content = await readFile(path.join(base, 'index.html'));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(content);
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function contentTypeFor(filePath: string): string {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  return 'application/octet-stream';
}
