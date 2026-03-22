import fsPromises from "fs/promises";
import path from "path";
import { readJsonBody, sendJson } from "../utils/http.js";

function createDirectoriesHandlers({ resolveInsideRoot }) {
  async function createDirectory(req, res) {
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

  return { createDirectory };
}

export { createDirectoriesHandlers };
