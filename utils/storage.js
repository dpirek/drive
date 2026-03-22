import fsPromises from "fs/promises";
import path from "path";
import { isInside } from "./path.js";

function createStorageUtils({ storageRoot }) {
  function resolveInsideRoot(relativeDir = "") {
    const normalized = String(relativeDir).replace(/\\/g, "/").replace(/^\/+/, "");
    const target = path.resolve(storageRoot, normalized);

    if (!isInside(storageRoot, target)) {
      throw new Error("Invalid path");
    }

    return { target, normalized };
  }

  async function listDirectory(relativeDir = "") {
    const { target, normalized } = resolveInsideRoot(relativeDir);
    const entries = await fsPromises.readdir(target, { withFileTypes: true });

    const items = await Promise.all(
      entries.map(async (entry) => {
        const itemPath = path.join(target, entry.name);
        const stats = await fsPromises.stat(itemPath);
        return {
          name: entry.name,
          type: entry.isDirectory() ? "directory" : "file",
          size: entry.isDirectory() ? null : stats.size,
          modifiedAt: stats.mtime.toISOString(),
        };
      })
    );

    items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return {
      currentPath: normalized,
      parentPath: normalized ? path.dirname(normalized) : null,
      items,
    };
  }

  return {
    resolveInsideRoot,
    listDirectory,
  };
}

export { createStorageUtils };
