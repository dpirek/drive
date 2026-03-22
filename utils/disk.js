import { statfs } from "fs/promises";

async function getDiskSpaceStats(targetPath) {
  const stats = await statfs(targetPath);
  const blockSize = Number(stats.bsize || 0);
  const totalBlocks = Number(stats.blocks || 0);
  const availableBlocks = Number(stats.bavail || 0);

  const totalBytes = blockSize * totalBlocks;
  const freeBytes = blockSize * availableBlocks;
  const usedBytes = Math.max(0, totalBytes - freeBytes);
  const freePercent = totalBytes > 0 ? (freeBytes / totalBytes) * 100 : 0;
  const usedPercent = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;

  return {
    totalBytes,
    freeBytes,
    usedBytes,
    freePercent,
    usedPercent,
  };
}

export { getDiskSpaceStats };
