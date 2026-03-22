import fsPromises from "fs/promises";
import path from "path";
import { decodeApiDirPath } from "../utils/string.js";
import { readJsonBody, sendFile, sendJson } from "../utils/http.js";

function createFilesHandlers({ listDirectory, resolveInsideRoot }) {
  async function listFilesFromQuery(_req, res, { queryParams }) {
    try {
      const dir = decodeApiDirPath(String(queryParams.dir || ""));
      const result = await listDirectory(dir);
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Unable to list directory" });
    }
  }

  async function listFilesFromPath(_req, res, { params }) {
    try {
      const dir = decodeApiDirPath(params.dirPath || "");
      const result = await listDirectory(dir);
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Unable to list directory" });
    }
  }

  async function getFile(_req, res, { queryParams }) {
    try {
      const dir = String(queryParams.dir || "");
      const name = String(queryParams.name || "");

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

  async function deleteFileOrDirectory(req, res) {
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

  return {
    listFilesFromQuery,
    listFilesFromPath,
    getFile,
    deleteFileOrDirectory,
  };
}

export { createFilesHandlers };
