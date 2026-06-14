import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, beforeEach, expect, it } from "vitest";
import { ViewerService } from "../../src/app/viewer-service.js";
import { GitChangeReview } from "../../src/infra/git-change-review.js";
import { NodeFileSystem } from "../../src/infra/node-file-system.js";
import { startHttpServer } from "../../src/server/http-server.js";

const execFileAsync = promisify(execFile);

let dir: string;
let server: { url: string; close: () => Promise<void> } | null = null;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "pathlens-git-diff-"));
  await mkdir(path.join(dir, "src"), { recursive: true });
  await writeFile(
    path.join(dir, "src", "app.ts"),
    'export const message = "before";\n',
  );
  await git("init");
  await git("config", "user.email", "pathlens@example.test");
  await git("config", "user.name", "pathlens");
  await git("add", ".");
  await git("commit", "-m", "initial");
  await writeFile(
    path.join(dir, "src", "app.ts"),
    'export const message = "after";\n',
  );
});

afterEach(async () => {
  await server?.close();
  await rm(dir, { recursive: true, force: true });
});

it("serves HEAD diffs for changed source files", async () => {
  const service = new ViewerService({
    fileSystem: new NodeFileSystem({ rootDir: dir }),
    changeReview: new GitChangeReview({ rootDir: dir }),
  });
  server = await startHttpServer({ host: "127.0.0.1", port: 0, service });

  const changes = await fetch(`${server.url}/api/changes`).then(
    (res) =>
      res.json() as Promise<{
        available: boolean;
        changes: Array<{ path: string; status: string }>;
      }>,
  );
  expect(changes.available).toBe(true);
  expect(changes.changes).toContainEqual({
    path: "src/app.ts",
    status: "modified",
  });

  const diff = await fetch(
    `${server.url}/api/diff?path=${encodeURIComponent("src/app.ts")}&base=HEAD`,
  ).then(
    (res) =>
      res.json() as Promise<{
        status: string;
        content: string;
      }>,
  );

  expect(diff.status).toBe("available");
  expect(diff.content).toContain('-export const message = "before";');
  expect(diff.content).toContain('+export const message = "after";');
}, 10000);

async function git(...args: string[]) {
  await execFileAsync("git", args, { cwd: dir });
}
