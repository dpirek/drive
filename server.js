import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { isInside } from "./utils/path.js";
import { sendJson } from "./utils/http.js";
import { createStorageUtils } from "./utils/storage.js";
import { createFilesHandlers } from "./api/files.js";
import { createDirectoriesHandlers } from "./api/directories.js";
import { createUploadHandlers } from "./api/upload.js";
import { createStaticHandler } from "./api/static.js";
import { createAuthHandlers } from "./api/auth.js";
import { createStorageHandlers } from "./api/storage.js";
import { createAppRouter } from "./routes.js";
import { getUserFromRequest } from "./utils/auth.js";
import { getDiskSpaceStats } from "./utils/disk.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const STORAGE_ROOT = process.platform === "linux"
  ? "/home/dpirek/files"
  : "/Users/dpirek/Documents";
const PUBLIC_ROOT = path.join(__dirname, "public");

console.log(`Storage root: ${STORAGE_ROOT}`);
const { resolveInsideRoot, listDirectory } = createStorageUtils({ storageRoot: STORAGE_ROOT });

const filesHandlers = createFilesHandlers({ listDirectory, resolveInsideRoot });
const directoriesHandlers = createDirectoriesHandlers({ resolveInsideRoot });
const uploadHandlers = createUploadHandlers({ resolveInsideRoot });
const authHandlers = createAuthHandlers();
const storageHandlers = createStorageHandlers({ getDiskSpaceStats, storageRoot: STORAGE_ROOT });
const handleStatic = createStaticHandler({ publicRoot: PUBLIC_ROOT, isInside });

const appRouter = createAppRouter({
  filesHandlers,
  directoriesHandlers,
  uploadHandlers,
  authHandlers,
  storageHandlers,
  staticHandler: handleStatic,
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || `localhost:${PORT}`}`);

  try {
    const matched = appRouter.match(req.url || "/", req.method || "GET");
    if (matched) {
      const authUser = getUserFromRequest(req);
      if (matched.auth && !authUser) {
        if (url.pathname.startsWith("/api/")) {
          return sendJson(res, 401, { error: "Unauthorized" });
        }
        res.writeHead(302, { Location: "/login" });
        res.end();
        return;
      }

      return await matched.handler(req, res, {
        params: matched.params,
        queryParams: matched.queryParams,
        pathname: url.pathname,
        authUser,
      });
    }
    return sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    return sendJson(res, 500, { error: error.message || "Request failed" });
  }
});

server.listen(PORT, () => {
  console.log(`File manager running at http://localhost:${PORT}`);
});
