import fs from "fs";
import { contentType } from "./string.js";

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
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

  res.writeHead(200, {
    "Content-Type": contentType(filePath) || "application/octet-stream",
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
