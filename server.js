import http from "http";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
// const STORAGE_ROOT = path.join(__dirname, "storage");
const STORAGE_ROOT = "/Users/dpirek/Documents";
const PUBLIC_ROOT = path.join(__dirname, "public");

console.log(`Storage root: ${STORAGE_ROOT}`);

await fsPromises.mkdir(STORAGE_ROOT, { recursive: true });

function isInside(parent, target) {
  return target === parent || target.startsWith(`${parent}${path.sep}`);
}

function resolveInsideRoot(relativeDir = "") {
  const normalized = String(relativeDir).replace(/\\/g, "/").replace(/^\/+/, "");
  const target = path.resolve(STORAGE_ROOT, normalized);

  if (!isInside(STORAGE_ROOT, target)) {
    throw new Error("Invalid path");
  }

  return { target, normalized };
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

function sanitizeFileName(name = "") {
  return String(name).replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_");
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

function sendJson(res, statusCode, body) {
  const data = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(data),
  });
  res.end(data);
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const byExt = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".mp4": "video/mp4",
  };
  return byExt[ext] || "application/octet-stream";
}

function sendFile(res, filePath) {
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) {
      sendJson(res, 500, { error: "Unable to read file" });
    } else {
      res.destroy();
    }
  });

  res.writeHead(200, { "Content-Type": getContentType(filePath) });
  stream.pipe(res);
}

async function readRawBody(req, maxBytes = 50 * 1024 * 1024) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) {
      throw new Error("Request body too large");
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

async function readJsonBody(req) {
  const raw = await readRawBody(req);
  if (!raw.length) return {};

  try {
    return JSON.parse(raw.toString("utf8"));
  } catch {
    throw new Error("Invalid JSON body");
  }
}

async function readMultipartFormData(req) {
  const host = req.headers.host || `localhost:${PORT}`;
  const request = new Request(`http://${host}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: req,
    duplex: "half",
  });

  return request.formData();
}

async function handleApi(req, res, url) {
  const { pathname, searchParams } = url;

  if (req.method === "GET" && pathname === "/api/files") {
    try {
      const dir = decodeApiDirPath(String(searchParams.get("dir") || ""));
      const result = await listDirectory(dir);
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Unable to list directory" });
    }
  }

  if (req.method === "GET" && pathname.startsWith("/api/files/")) {
    try {
      const dir = decodeApiDirPath(pathname.slice("/api/files/".length));
      const result = await listDirectory(dir);
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Unable to list directory" });
    }
  }

  if (req.method === "GET" && pathname === "/api/file") {
    try {
      const dir = String(searchParams.get("dir") || "");
      const name = String(searchParams.get("name") || "");

      if (!name) {
        return sendJson(res, 400, { error: "File name is required" });
      }

      const { target } = resolveInsideRoot(path.join(dir, name));
      const stats = await fsPromises.stat(target);

      if (!stats.isFile()) {
        return sendJson(res, 400, { error: "Requested path is not a file" });
      }

      return sendFile(res, target);
    } catch (error) {
      if (error.code === "ENOENT") {
        return sendJson(res, 404, { error: "File not found" });
      }
      return sendJson(res, 400, { error: error.message || "Unable to read file" });
    }
  }

  if (req.method === "POST" && pathname === "/api/directories") {
    try {
      const body = await readJsonBody(req);
      const parentDir = String(body.parentDir || "");
      const name = String(body.name || "").trim();

      if (!name) {
        return sendJson(res, 400, { error: "Directory name is required" });
      }

      if (name.includes("/") || name.includes("\\")) {
        return sendJson(res, 400, { error: "Invalid directory name" });
      }

      const { target } = resolveInsideRoot(path.join(parentDir, name));
      await fsPromises.mkdir(target, { recursive: false });

      return sendJson(res, 201, { message: "Directory created" });
    } catch (error) {
      if (error.code === "EEXIST") {
        return sendJson(res, 409, { error: "Directory already exists" });
      }
      return sendJson(res, 400, { error: error.message || "Unable to create directory" });
    }
  }

  if (req.method === "POST" && pathname === "/api/upload") {
    try {
      const formData = await readMultipartFormData(req);
      const requestedDir = String(formData.get("dir") || "");
      const { target: uploadTarget } = resolveInsideRoot(requestedDir);
      await fsPromises.mkdir(uploadTarget, { recursive: true });

      const files = formData
        .getAll("files")
        .filter((value) => value && typeof value === "object" && typeof value.arrayBuffer === "function");

      if (!files.length) {
        return sendJson(res, 400, { error: "No files uploaded" });
      }

      await Promise.all(
        files.map(async (file, index) => {
          const safeName = sanitizeFileName(file.name) || `upload-${Date.now()}-${index}`;
          const filePath = path.join(uploadTarget, safeName);
          const content = Buffer.from(await file.arrayBuffer());
          await fsPromises.writeFile(filePath, content);
        })
      );

      return sendJson(res, 201, { message: "Files uploaded" });
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Unable to upload files" });
    }
  }

  if (req.method === "DELETE" && pathname === "/api/files") {
    try {
      const body = await readJsonBody(req);
      const dir = String(body.dir || "");
      const name = String(body.name || "");
      const type = String(body.type || "");

      if (!name || !type) {
        return sendJson(res, 400, { error: "Name and type are required" });
      }

      const { target } = resolveInsideRoot(path.join(dir, name));

      if (type === "directory") {
        await fsPromises.rm(target, { recursive: true, force: false });
      } else {
        await fsPromises.unlink(target);
      }

      return sendJson(res, 200, { message: "Deleted" });
    } catch (error) {
      if (error.code === "ENOENT") {
        return sendJson(res, 404, { error: "Item not found" });
      }
      return sendJson(res, 400, { error: error.message || "Unable to delete item" });
    }
  }

  return sendJson(res, 404, { error: "Not found" });
}

async function handleStatic(req, res, url) {
  const { pathname } = url;
  const decodedPath = decodeURIComponent(pathname);

  if (decodedPath === "/") {
    return sendFile(res, path.join(PUBLIC_ROOT, "index.html"));
  }

  const relative = decodedPath.replace(/^\/+/, "");
  const candidate = path.resolve(PUBLIC_ROOT, relative);

  if (!isInside(PUBLIC_ROOT, candidate)) {
    return sendJson(res, 400, { error: "Invalid path" });
  }

  try {
    const stats = await fsPromises.stat(candidate);
    if (stats.isFile()) {
      return sendFile(res, candidate);
    }
  } catch {
    // fall through to SPA fallback
  }

  if (path.extname(decodedPath)) {
    return sendJson(res, 404, { error: "Not found" });
  }

  return sendFile(res, path.join(PUBLIC_ROOT, "index.html"));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);

  try {
    if (url.pathname.startsWith("/api/")) {
      return await handleApi(req, res, url);
    }

    if (req.method === "GET" || req.method === "HEAD") {
      return await handleStatic(req, res, url);
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || "Request failed" });
  }
});

server.listen(PORT, () => {
  console.log(`File manager running at http://localhost:${PORT}`);
});
