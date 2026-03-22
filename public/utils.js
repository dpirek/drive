export function normalizeDir(value = "") {
  return String(value).replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

function encodeDirForPath(dir) {
  if (!dir) return "/";
  return `/${dir
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function decodePathToDir(pathname = "/") {
  const trimmed = String(pathname).replace(/^\/+/, "").replace(/\/+$/, "");
  if (!trimmed) return "";

  return normalizeDir(
    trimmed
      .split("/")
      .filter(Boolean)
      .map((segment) => {
        try {
          return decodeURIComponent(segment);
        } catch {
          return segment;
        }
      })
      .join("/")
  );
}

export function getDirFromUrl() {
  const url = new URL(window.location.href);
  const dirFromPath = decodePathToDir(url.pathname);
  if (dirFromPath) return dirFromPath;

  // Backward compatibility: allow legacy `?dir=` links and migrate via history replace.
  return normalizeDir(url.searchParams.get("dir") || "");
}

export function syncUrlToDir(dir, { replace = false } = {}) {
  const normalized = normalizeDir(dir);
  const current = getDirFromUrl();
  if (normalized === current) return;

  const url = new URL(window.location.href);
  url.searchParams.delete("dir");

  const pathname = encodeDirForPath(normalized);
  const search = url.searchParams.toString();
  const nextUrl = `${pathname}${search ? `?${search}` : ""}${url.hash}`;

  const method = replace ? "replaceState" : "pushState";
  window.history[method]({ dir: normalized }, "", nextUrl);
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
