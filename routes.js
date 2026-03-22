import { route } from "./utils/router.js";

function createAppRouter({ filesHandlers, directoriesHandlers, uploadHandlers, authHandlers, staticHandler }) {
  const appRouter = route();

  appRouter.add("/api/files", "GET", filesHandlers.listFilesFromQuery);
  appRouter.add("/api/files/:dirPath*", "GET", filesHandlers.listFilesFromPath);
  appRouter.add("/api/file", "GET", filesHandlers.getFile);
  appRouter.add("/api/directories", "POST", directoriesHandlers.createDirectory);
  appRouter.add("/api/upload", "POST", uploadHandlers.uploadFiles);
  appRouter.add("/api/files", "DELETE", filesHandlers.deleteFileOrDirectory);
  appRouter.add("/api/auth", "GET", authHandlers.getAuth, null, false);
  appRouter.add("/api/login", "POST", authHandlers.login, null, false);
  appRouter.add("/api/logout", "POST", authHandlers.logout, null, false);
  appRouter.add("*", "GET", staticHandler, null, false);
  appRouter.add("*", "HEAD", staticHandler, null, false);

  return appRouter;
}

export { createAppRouter };
