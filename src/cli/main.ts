#!/usr/bin/env node
import path from 'node:path';
import { ViewerService } from '../app/viewer-service.js';
import { NodeFileSystem } from '../infra/node-file-system.js';
import { NodeWatcher } from '../infra/node-watcher.js';
import { startHttpServer } from '../server/http-server.js';

interface CliOptions {
  root: string;
  host: string;
  port: number;
  open: boolean;
}

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { root: '.', host: '127.0.0.1', port: 4317, open: false };
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host') options.host = argv[++i] ?? options.host;
    else if (arg === '--port') options.port = Number(argv[++i] ?? options.port);
    else if (arg === '--open') options.open = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else positional.push(arg);
  }

  if (positional[0]) options.root = positional[0];
  return options;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  const rootDir = path.resolve(options.root);
  const fileSystem = new NodeFileSystem({ rootDir });
  const watcher = new NodeWatcher(rootDir);
  const service = new ViewerService({ fileSystem, watcher });
  const server = await startHttpServer({ host: options.host, port: options.port, service });
  console.log(`pathlens serving ${rootDir}`);
  console.log(server.url);
  if (options.open) {
    console.log('Browser auto-open is planned but not implemented in the scaffold.');
  }
}

function printHelp(): void {
  console.log(`pathlens - live local viewer for Markdown, HTML, code, and assets\n\nUsage:\n  pathlens [root] [--host 127.0.0.1] [--port 4317] [--open]\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
