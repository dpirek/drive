import { route } from "./utils/router.js";

function createAppRouter({ filesHandlers, directoriesHandlers, uploadHandlers, staticHandler }) {
  const appRouter = route();

  appRouter.add("/api/files", "GET", filesHandlers.listFilesFromQuery);
  appRouter.add("/api/files/:dirPath*", "GET", filesHandlers.listFilesFromPath);
  appRouter.add("/api/file", "GET", filesHandlers.getFile);
  appRouter.add("/api/directories", "POST", directoriesHandlers.createDirectory);
  appRouter.add("/api/upload", "POST", uploadHandlers.uploadFiles);
  appRouter.add("/api/files", "DELETE", filesHandlers.deleteFileOrDirectory);
  appRouter.add("*", "GET", staticHandler);
  appRouter.add("*", "HEAD", staticHandler);

  return appRouter;
}

export { createAppRouter };
