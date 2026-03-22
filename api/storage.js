import { sendJson } from "../utils/http.js";

function createStorageHandlers({ getDiskSpaceStats, storageRoot }) {
  async function getStorageStats(_req, res) {
    const stats = await getDiskSpaceStats(storageRoot);
    return sendJson(res, 200, {
      freePercent: stats.freePercent,
      usedPercent: stats.usedPercent,
      freeBytes: stats.freeBytes,
      totalBytes: stats.totalBytes,
    });
  }

  return {
    getStorageStats,
  };
}

export { createStorageHandlers };
