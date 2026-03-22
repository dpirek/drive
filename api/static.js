import fsPromises from "fs/promises";
import path from "path";
import { sendFile, sendJson } from "../utils/http.js";

function createStaticHandler({ publicRoot, isInside }) {
  return async function handleStatic(_req, res, { pathname }) {
    const decodedPath = decodeURIComponent(pathname);

    if (decodedPath === "/") {
      return sendFile(res, path.join(publicRoot, "index.html"));
    }

    const relative = decodedPath.replace(/^\/+/, "");
    const candidate = path.resolve(publicRoot, relative);

    if (!isInside(publicRoot, candidate)) {
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

    return sendFile(res, path.join(publicRoot, "index.html"));
  };
}

export { createStaticHandler };
