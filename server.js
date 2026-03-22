import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
//const STORAGE_ROOT = path.join(__dirname, "storage");
const STORAGE_ROOT = '/Users/dpirek/Documents';
console.log(`Storage root: ${STORAGE_ROOT}`);

await fs.mkdir(STORAGE_ROOT, { recursive: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use((err, _req, res, _next) => res.status(400).json({ error: err.message || "Request failed" }));

app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const storage = multer.diskStorage({
  destination: async (req, _file, cb) => {
    try {
      const requestedDir = req.body.dir || "";
      const { target } = resolveInsideRoot(requestedDir);
      await fs.mkdir(target, { recursive: true });
      cb(null, target);
    } catch {
      cb(new Error("Invalid upload path"));
    }
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
    cb(null, safeName || `upload-${Date.now()}`);
  },
});

const upload = multer({ storage });

function resolveInsideRoot(relativeDir = "") {
  const normalized = relativeDir.replace(/\\/g, "/").replace(/^\/+/, "");
  const target = path.resolve(STORAGE_ROOT, normalized);

  if (!target.startsWith(STORAGE_ROOT)) {
    throw new Error("Invalid path");
  }

  return { target, normalized };
}

async function listDirectory(relativeDir = "") {
  const { target, normalized } = resolveInsideRoot(relativeDir);
  const entries = await fs.readdir(target, { withFileTypes: true });

  const items = await Promise.all(
    entries.map(async (entry) => {
      const itemPath = path.join(target, entry.name);
      const stats = await fs.stat(itemPath);
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

function decodeApiDirPath(pathValue = "") {
  const normalized = String(pathValue).replace(/^\/+/, "").replace(/\/+$/, "");
  if (!normalized) return "";

  return normalized
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
}

async function handleListDirectory(req, res, dirFromPath = "") {
  try {
    // Keep query support for older clients while preferring path-based routing.
    const dir = decodeApiDirPath(dirFromPath || String(req.query.dir || ""));
    const result = await listDirectory(dir);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "Unable to list directory" });
  }
}

app.get("/api/files", (req, res) => {
  handleListDirectory(req, res);
});

app.get("/api/files/*", (req, res) => {
  handleListDirectory(req, res, req.params[0] || "");
});

app.get("/api/file", async (req, res) => {
  try {
    const dir = String(req.query.dir || "");
    const name = String(req.query.name || "");

    if (!name) {
      return res.status(400).json({ error: "File name is required" });
    }

    const { target } = resolveInsideRoot(path.join(dir, name));
    const stats = await fs.stat(target);

    if (!stats.isFile()) {
      return res.status(400).json({ error: "Requested path is not a file" });
    }

    res.sendFile(target);
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: "File not found" });
    }
    res.status(400).json({ error: error.message || "Unable to read file" });
  }
});

app.post("/api/directories", async (req, res) => {
  try {
    const parentDir = String(req.body.parentDir || "");
    const name = String(req.body.name || "").trim();

    if (!name) {
      return res.status(400).json({ error: "Directory name is required" });
    }

    if (name.includes("/") || name.includes("\\")) {
      return res.status(400).json({ error: "Invalid directory name" });
    }

    const { target } = resolveInsideRoot(path.join(parentDir, name));
    await fs.mkdir(target, { recursive: false });

    res.status(201).json({ message: "Directory created" });
  } catch (error) {
    if (error.code === "EEXIST") {
      return res.status(409).json({ error: "Directory already exists" });
    }
    res.status(400).json({ error: error.message || "Unable to create directory" });
  }
});

app.post("/api/upload", upload.array("files"), (_req, res) => {
  res.status(201).json({ message: "Files uploaded" });
});

app.delete("/api/files", async (req, res) => {
  try {
    const dir = String(req.body.dir || "");
    const name = String(req.body.name || "");
    const type = String(req.body.type || "");

    if (!name || !type) {
      return res.status(400).json({ error: "Name and type are required" });
    }

    const { target } = resolveInsideRoot(path.join(dir, name));

    if (type === "directory") {
      await fs.rm(target, { recursive: true, force: false });
    } else {
      await fs.unlink(target);
    }

    res.json({ message: "Deleted" });
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).json({ error: "Item not found" });
    }
    res.status(400).json({ error: error.message || "Unable to delete item" });
  }
});

app.listen(PORT, () => {
  console.log(`File manager running at http://localhost:${PORT}`);
});
