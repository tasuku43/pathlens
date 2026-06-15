import { expect, it } from "vitest";
import { ViewerService } from "../../src/app/viewer-service.js";
import type {
  ChangeReviewPort,
  FileSystemPort,
} from "../../src/app/contracts.js";

it("delegates tree reads to the filesystem port", async () => {
  const fsPort: FileSystemPort = {
    async readTree() {
      return { root: ".", version: 1, nodes: [] };
    },
    async readFile() {
      throw new Error("not used");
    },
    async readHtmlPreview() {
      throw new Error("not used");
    },
    getConfig() {
      return { root: ".", allowHtmlScripts: false, maxFileSizeBytes: 123 };
    },
  };
  const service = new ViewerService({ fileSystem: fsPort });
  await expect(service.readTree()).resolves.toEqual({
    root: ".",
    version: 1,
    nodes: [],
  });
  expect(service.getConfig()).toEqual({
    root: ".",
    allowHtmlScripts: false,
    maxFileSizeBytes: 123,
  });
});

it("delegates Git review reads when the optional port is present", async () => {
  const fsPort: FileSystemPort = {
    async readTree() {
      return { root: ".", version: 1, nodes: [] };
    },
    async readFile() {
      throw new Error("not used");
    },
    async readHtmlPreview() {
      throw new Error("not used");
    },
  };
  const changeReview: ChangeReviewPort = {
    async readChanges() {
      return {
        available: true,
        changes: [{ path: "README.md", status: "modified" }],
      };
    },
    async readDiff(relativePath, baseRef) {
      return {
        path: relativePath,
        status: "available",
        baseLabel: baseRef ?? "HEAD",
        compareLabel: "working tree",
        content: "diff",
      };
    },
    async readDiffBases() {
      return {
        available: true,
        options: [{ ref: "HEAD", label: "HEAD", subject: "initial" }],
      };
    },
  };

  const service = new ViewerService({ fileSystem: fsPort, changeReview });

  await expect(service.readChanges()).resolves.toEqual({
    available: true,
    changes: [{ path: "README.md", status: "modified" }],
  });
  await expect(service.readDiff("README.md", "HEAD")).resolves.toMatchObject({
    path: "README.md",
    status: "available",
  });
  await expect(service.readDiffBases()).resolves.toEqual({
    available: true,
    options: [{ ref: "HEAD", label: "HEAD", subject: "initial" }],
  });
});

it("searches text files through the filesystem port", async () => {
  const fsPort: FileSystemPort = {
    async readTree() {
      return {
        root: ".",
        version: 1,
        nodes: [
          {
            id: "README.md",
            path: "README.md",
            name: "README.md",
            kind: "file",
            parentPath: null,
            viewerKind: "markdown",
          },
          {
            id: "logo.png",
            path: "logo.png",
            name: "logo.png",
            kind: "file",
            parentPath: null,
            viewerKind: "image",
          },
        ],
      };
    },
    async readFile(relativePath) {
      if (relativePath !== "README.md") throw new Error("not searchable");
      return {
        path: "README.md",
        viewerKind: "markdown",
        encoding: "utf8",
        content: "# Demo\nFind this local workspace",
        etag: "sha256:test",
        size: 32,
        mtimeMs: 1,
      };
    },
    async readHtmlPreview() {
      throw new Error("not used");
    },
  };
  const service = new ViewerService({ fileSystem: fsPort });

  await expect(service.searchText("local")).resolves.toEqual({
    query: "local",
    results: [
      {
        path: "README.md",
        viewerKind: "markdown",
        lineNumber: 2,
        lineText: "Find this local workspace",
        matchStart: 10,
        matchLength: 5,
      },
    ],
  });
});
