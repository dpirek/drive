import fsPromises from "fs/promises";
import path from "path";
import { sendFile, sendJson } from "../utils/http.js";

function createStaticHandler({ publicRoot, isInside }) {
  return async function handleStatic(req, res, { pathname, authUser }) {
    const decodedPath = decodeURIComponent(pathname);
    const isLoginPage = decodedPath === "/login";

    if (isLoginPage) {
      if (authUser) {
        res.writeHead(302, { Location: "/" });
        res.end();
        return;
      }
      return sendFile(req, res, path.join(publicRoot, "login.html"));
    }

    if (!authUser && !path.extname(decodedPath)) {
      res.writeHead(302, { Location: "/login" });
      res.end();
      return;
    }

    if (decodedPath === "/") {
      return sendFile(req, res, path.join(publicRoot, "index.html"));
    }

    const relative = decodedPath.replace(/^\/+/, "");
    const candidate = path.resolve(publicRoot, relative);

    if (!isInside(publicRoot, candidate)) {
      return sendJson(res, 400, { error: "Invalid path" });
    }

    try {
      const stats = await fsPromises.stat(candidate);
      if (stats.isFile()) {
        return sendFile(req, res, candidate);
      }
    } catch {
      // fall through to SPA fallback
    }

    if (path.extname(decodedPath)) {
      return sendJson(res, 404, { error: "Not found" });
    }

    return sendFile(req, res, path.join(publicRoot, "index.html"));
  };
}

export { createStaticHandler };
