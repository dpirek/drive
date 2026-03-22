import fsPromises from "fs/promises";
import path from "path";
import { sanitizeFileName } from "../utils/string.js";
import { readMultipartFormData, sendJson } from "../utils/http.js";

function createUploadHandlers({ resolveInsideRoot, port }) {
  async function uploadFiles(req, res) {
    try {
      const formData = await readMultipartFormData(req, { host: req.headers.host || `localhost:${port}` });
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

  return { uploadFiles };
}

export { createUploadHandlers };
