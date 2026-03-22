import {
  buildFileUrl,
  getDirFromUrl,
  isAudioFile,
  isImageFile,
  isVideoFile,
  normalizeDir,
  syncUrlToDir,
} from "./utils.js";

const state = {
  currentPath: "",
  parentPath: null,
  authUser: null,
};

const el = {
  userAvatar: document.getElementById("userAvatar"),
  userName: document.getElementById("userName"),
  logoutButton: document.getElementById("logoutButton"),
  currentPath: document.getElementById("currentPath"),
  sidebarNav: document.getElementById("sidebarNav"),
  createDirForm: document.getElementById("createDirForm"),
  directoryName: document.getElementById("directoryName"),
  uploadForm: document.getElementById("uploadForm"),
  fileInput: document.getElementById("fileInput"),
  status: document.getElementById("status"),
  fileList: document.getElementById("fileList"),
  imagePreviewModal: document.getElementById("imagePreviewModal"),
  imagePreviewLabel: document.getElementById("imagePreviewLabel"),
  imagePreview: document.getElementById("imagePreview"),
  audioPlayerModal: document.getElementById("audioPlayerModal"),
  audioPlayerLabel: document.getElementById("audioPlayerLabel"),
  audioPlayer: document.getElementById("audioPlayer"),
  videoPreviewModal: document.getElementById("videoPreviewModal"),
  videoPreviewLabel: document.getElementById("videoPreviewLabel"),
  videoPreview: document.getElementById("videoPreview"),
};

const imageModal = window.bootstrap?.Modal
  ? new window.bootstrap.Modal(el.imagePreviewModal)
  : null;
const audioModal = window.bootstrap?.Modal
  ? new window.bootstrap.Modal(el.audioPlayerModal)
  : null;
const videoModal = window.bootstrap?.Modal
  ? new window.bootstrap.Modal(el.videoPreviewModal)
  : null;

function formatSize(bytes) {
  if (bytes == null) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

function showImagePreview(name) {
  if (!imageModal) {
    setStatus("Preview is unavailable because Bootstrap JS did not load", true);
    return;
  }

  el.imagePreviewLabel.textContent = name;
  el.imagePreview.src = buildFileUrl(state.currentPath, name);
  el.imagePreview.alt = name;
  imageModal.show();
}

function showAudioPlayer(name) {
  if (!audioModal) {
    setStatus("Audio player is unavailable because Bootstrap JS did not load", true);
    return;
  }

  el.audioPlayerLabel.textContent = name;
  el.audioPlayer.src = buildFileUrl(state.currentPath, name);
  el.audioPlayer.load();
  audioModal.show();
  void el.audioPlayer.play().catch(() => {});
}

function showVideoPreview(name) {
  if (!videoModal) {
    setStatus("Video preview is unavailable because Bootstrap JS did not load", true);
    return;
  }

  el.videoPreviewLabel.textContent = name;
  el.videoPreview.src = buildFileUrl(state.currentPath, name);
  el.videoPreview.load();
  videoModal.show();
  void el.videoPreview.play().catch(() => {});
}

function downloadFile(name) {
  const link = document.createElement("a");
  link.href = buildFileUrl(state.currentPath, name);
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function setStatus(message, isError = false) {
  el.status.textContent = message;
  el.status.className = isError
    ? "small text-danger-emphasis bg-danger-subtle border border-danger-subtle rounded px-2 py-1 mb-3"
    : "small text-body-secondary mb-3";
}

function renderUser() {
  const username = String(state.authUser?.username || "");
  const initial = username ? username.charAt(0).toUpperCase() : "U";
  el.userAvatar.innerHTML = username ? initial : '<i class="bi bi-person-fill"></i>';
  el.userName.textContent = username || "";
}

function renderFiles(items) {
  el.fileList.innerHTML = "";

  if (items.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td colspan="5" class="text-body-secondary text-center py-4">Directory is empty</td>';
    el.fileList.appendChild(tr);
    return;
  }

  for (const item of items) {
    const tr = document.createElement("tr");

    const openButton =
      item.type === "directory"
        ? `<button class="btn btn-outline-primary btn-sm me-2" data-action="open" data-name="${item.name}" title="Open" aria-label="Open ${item.name}"><i class="bi bi-folder2-open"></i></button>`
        : "";
    const previewButton =
      item.type === "file" && isImageFile(item.name)
        ? `<button class="btn btn-outline-info btn-sm me-2" data-action="preview" data-name="${item.name}" title="Preview" aria-label="Preview ${item.name}"><i class="bi bi-eye"></i></button>`
        : "";
    const playButton =
      item.type === "file" && isAudioFile(item.name)
        ? `<button class="btn btn-outline-success btn-sm me-2" data-action="play" data-name="${item.name}" title="Play" aria-label="Play ${item.name}"><i class="bi bi-play-circle"></i></button>`
        : "";
    const videoButton =
      item.type === "file" && isVideoFile(item.name)
        ? `<button class="btn btn-outline-warning btn-sm me-2" data-action="video" data-name="${item.name}" title="View Video" aria-label="View video ${item.name}"><i class="bi bi-film"></i></button>`
        : "";
    const downloadButton =
      item.type === "file"
        ? `<button class="btn btn-outline-secondary btn-sm me-2" data-action="download" data-name="${item.name}" title="Download" aria-label="Download ${item.name}"><i class="bi bi-download"></i></button>`
        : "";

    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.type}</td>
      <td>${formatSize(item.size)}</td>
      <td>${formatDate(item.modifiedAt)}</td>
      <td>
        ${openButton}
        ${previewButton}
        ${playButton}
        ${videoButton}
        ${downloadButton}
        <button class="btn btn-outline-danger btn-sm" data-action="delete" data-name="${item.name}" data-type="${item.type}" title="Delete" aria-label="Delete ${item.name}"><i class="bi bi-trash"></i></button>
      </td>
    `;

    el.fileList.appendChild(tr);
  }
}

function renderSidebar(items) {
  el.sidebarNav.innerHTML = "";
  const addTreeNode = (label, path, depth, { active = false, icon = "bi-folder" } = {}) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `list-group-item list-group-item-action border-0${active ? " active" : ""}`;
    btn.dataset.path = path;
    btn.style.paddingLeft = `${0.75 + depth * 0.55}rem`;
    btn.innerHTML = `<i class="bi ${icon} me-2"></i>${label}`;
    el.sidebarNav.appendChild(btn);
  };

  addTreeNode("Root", "", 0, {
    active: !state.currentPath,
    icon: "bi-house-door",
  });

  const segments = state.currentPath ? state.currentPath.split("/") : [];
  let partial = "";
  for (let depth = 0; depth < segments.length; depth += 1) {
    const segment = segments[depth];
    partial = partial ? `${partial}/${segment}` : segment;
    addTreeNode(segment, partial, depth + 1, {
      active: partial === state.currentPath,
      icon: "bi-folder2-open",
    });
  }

  const directories = items.filter((item) => item.type === "directory");
  for (const directory of directories) {
    const path = state.currentPath ? `${state.currentPath}/${directory.name}` : directory.name;
    addTreeNode(directory.name, path, segments.length + 1, {
      icon: "bi-folder",
    });
  }
}

function renderPathNav() {
  el.currentPath.innerHTML = "";

  const rootPath = "";
  const rootLink = document.createElement("a");
  rootLink.href = "/";
  rootLink.className = `btn btn-sm ${state.currentPath ? "btn-outline-secondary" : "btn-secondary"}`;
  rootLink.dataset.path = rootPath;
  rootLink.textContent = "/";
  el.currentPath.appendChild(rootLink);

  const segments = state.currentPath ? state.currentPath.split("/") : [];
  let partial = "";
  for (const segment of segments) {
    const separator = document.createElement("span");
    separator.className = "text-body-secondary px-1";
    separator.textContent = "/";
    el.currentPath.appendChild(separator);

    partial = partial ? `${partial}/${segment}` : segment;
    const link = document.createElement("a");
    link.href = `/${partial.split("/").map((part) => encodeURIComponent(part)).join("/")}`;
    link.className = `btn btn-sm ${partial === state.currentPath ? "btn-secondary" : "btn-outline-secondary"}`;
    link.dataset.path = partial;
    link.textContent = segment;
    el.currentPath.appendChild(link);
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    window.location.replace("/login");
    throw new Error("Unauthorized");
  }
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

async function loadDirectory(
  dir = state.currentPath,
  { syncUrl = true, replaceHistory = false } = {}
) {
  try {
    const normalizedDir = normalizeDir(dir);
    const encodedPath = normalizedDir
      ? `/${normalizedDir
          .split("/")
          .filter(Boolean)
          .map((segment) => encodeURIComponent(segment))
          .join("/")}`
      : "";
    const data = await request(`/api/files${encodedPath}`);

    state.currentPath = data.currentPath;
    state.parentPath = data.parentPath;

    renderPathNav();
    renderFiles(data.items);
    renderSidebar(data.items);
    if (syncUrl) {
      syncUrlToDir(data.currentPath, { replace: replaceHistory });
    }
    setStatus("Ready");
  } catch (error) {
    setStatus(error.message, true);
  }
}

el.sidebarNav.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-path]");
  if (!button) return;
  loadDirectory(button.dataset.path || "");
});

el.currentPath.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-path]");
  if (!link) return;
  event.preventDefault();
  loadDirectory(link.dataset.path || "");
});

el.logoutButton.addEventListener("click", async () => {
  try {
    await request("/api/logout", { method: "POST" });
  } catch {
    // Ignore and force redirect to login anyway.
  }
  window.location.replace("/login");
});

el.createDirForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await request("/api/directories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentDir: state.currentPath,
        name: el.directoryName.value,
      }),
    });
    el.createDirForm.reset();
    await loadDirectory();
    setStatus("Folder created");
  } catch (error) {
    setStatus(error.message, true);
  }
});

el.uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!el.fileInput.files.length) {
    setStatus("Select at least one file", true);
    return;
  }

  try {
    const formData = new FormData();
    formData.append("dir", state.currentPath);
    for (const file of el.fileInput.files) {
      formData.append("files", file);
    }

    await request("/api/upload", {
      method: "POST",
      body: formData,
    });

    el.uploadForm.reset();
    await loadDirectory();
    setStatus("Upload complete");
  } catch (error) {
    setStatus(error.message, true);
  }
});

el.fileList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const name = button.dataset.name;

  if (action === "open") {
    const nextPath = state.currentPath ? `${state.currentPath}/${name}` : name;
    loadDirectory(nextPath);
    return;
  }

  if (action === "preview") {
    showImagePreview(name);
    return;
  }

  if (action === "play") {
    showAudioPlayer(name);
    return;
  }

  if (action === "video") {
    showVideoPreview(name);
    return;
  }

  if (action === "download") {
    downloadFile(name);
    return;
  }

  if (action === "delete") {
    const type = button.dataset.type;
    const confirmed = window.confirm(`Delete ${type} \"${name}\"?`);
    if (!confirmed) return;

    try {
      await request("/api/files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dir: state.currentPath,
          name,
          type,
        }),
      });
      await loadDirectory();
      setStatus("Deleted");
    } catch (error) {
      setStatus(error.message, true);
    }
  }
});

el.imagePreviewModal.addEventListener("hidden.bs.modal", () => {
  el.imagePreview.src = "";
});
el.audioPlayerModal.addEventListener("hidden.bs.modal", () => {
  el.audioPlayer.pause();
  el.audioPlayer.src = "";
  el.audioPlayer.load();
});
el.videoPreviewModal.addEventListener("hidden.bs.modal", () => {
  el.videoPreview.pause();
  el.videoPreview.src = "";
  el.videoPreview.load();
});

window.addEventListener("popstate", () => {
  loadDirectory(getDirFromUrl(), { syncUrl: false });
});

async function init() {
  try {
    state.authUser = await request("/api/auth");
    if (!state.authUser) {
      window.location.replace("/login");
      return;
    }
    renderUser();
    await loadDirectory(getDirFromUrl(), { replaceHistory: true });
  } catch {
    window.location.replace("/login");
  }
}

init();
