export function normalizeDir(value = "") {
  return String(value).replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

export function getDirFromUrl() {
  const url = new URL(window.location.href);
  return normalizeDir(url.searchParams.get("dir") || "");
}

export function syncUrlToDir(dir, { replace = false } = {}) {
  const normalized = normalizeDir(dir);
  const current = getDirFromUrl();
  if (normalized === current) return;

  const url = new URL(window.location.href);
  if (normalized) {
    url.searchParams.set("dir", normalized);
  } else {
    url.searchParams.delete("dir");
  }

  const method = replace ? "replaceState" : "pushState";
  window.history[method]({ dir: normalized }, "", `${url.pathname}${url.search}${url.hash}`);
}

export function isImageFile(name) {
  return /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(name);
}

export function isAudioFile(name) {
  return /\.(aac|flac|m4a|mp3|ogg|wav|webm)$/i.test(name);
}

export function isVideoFile(name) {
  return /\.mp4$/i.test(name);
}

export function buildFileUrl(dir, name) {
  const query = new URLSearchParams({
    dir: normalizeDir(dir),
    name,
  });
  return `/api/file?${query.toString()}`;
}
