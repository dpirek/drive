import fs from "fs";
import { contentType } from "./string.js";

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function sendFile(req, res, filePath) {
  const stats = fs.statSync(filePath);
  const totalSize = stats.size;
  const fileContentType = contentType(filePath) || "application/octet-stream";
  const rangeHeader = req.headers.range;

  if (!rangeHeader) {
    res.writeHead(200, {
      "Content-Type": fileContentType,
      "Content-Length": totalSize,
      "Accept-Ranges": "bytes",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on("error", () => {
      if (!res.headersSent) {
        sendJson(res, 500, { error: "Unable to read file" });
      } else {
        res.destroy();
      }
    });
    stream.pipe(res);
    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
  if (!match) {
    res.writeHead(416, { "Content-Range": `bytes */${totalSize}` });
    res.end();
    return;
  }

  const start = match[1] === "" ? 0 : Number.parseInt(match[1], 10);
  const end = match[2] === "" ? totalSize - 1 : Number.parseInt(match[2], 10);
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= totalSize) {
    res.writeHead(416, { "Content-Range": `bytes */${totalSize}` });
    res.end();
    return;
  }

  const safeEnd = Math.min(end, totalSize - 1);
  const chunkSize = safeEnd - start + 1;
  res.writeHead(206, {
    "Content-Type": fileContentType,
    "Content-Length": chunkSize,
    "Content-Range": `bytes ${start}-${safeEnd}/${totalSize}`,
    "Accept-Ranges": "bytes",
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }

  const stream = fs.createReadStream(filePath, { start, end: safeEnd });
  stream.on("error", () => {
    if (!res.headersSent) {
      sendJson(res, 500, { error: "Unable to read file" });
    } else {
      res.destroy();
    }
  });

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

export {
  sendJson,
  sendFile,
  readRawBody,
  readJsonBody,
};
