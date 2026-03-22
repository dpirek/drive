import fsPromises from "fs/promises";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { sanitizeFileName } from "../utils/string.js";
import { sendJson } from "../utils/http.js";

function createUploadHandlers({ resolveInsideRoot }) {
  async function uploadFiles(req, res, { queryParams }) {
    try {
      const requestedDir = String(queryParams.dir || "");
      const rawName = String(queryParams.name || "").trim();
      if (!rawName) {
        return sendJson(res, 400, { error: "File name is required" });
      }

      const { target: uploadTarget } = resolveInsideRoot(requestedDir);
      await fsPromises.mkdir(uploadTarget, { recursive: true });

      const safeName = sanitizeFileName(rawName) || `upload-${Date.now()}`;
      const filePath = path.join(uploadTarget, safeName);
      const writeStream = fs.createWriteStream(filePath);
      await pipeline(req, writeStream);

      return sendJson(res, 201, { message: "File uploaded", name: safeName });
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Unable to upload files" });
    }
  }

  return { uploadFiles };
}

export { createUploadHandlers };
