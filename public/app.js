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
};

const el = {
  currentPath: document.getElementById("currentPath"),
  upButton: document.getElementById("upButton"),
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

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
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
    const query = new URLSearchParams({ dir: normalizedDir });
    const data = await request(`/api/files?${query.toString()}`);

    state.currentPath = data.currentPath;
    state.parentPath = data.parentPath;

    el.currentPath.textContent = `/${state.currentPath}`.replace(/\/$/, "") || "/";
    el.upButton.disabled = state.parentPath == null;

    renderFiles(data.items);
    if (syncUrl) {
      syncUrlToDir(data.currentPath, { replace: replaceHistory });
    }
    setStatus("Ready");
  } catch (error) {
    setStatus(error.message, true);
  }
}

el.upButton.addEventListener("click", () => {
  if (state.parentPath == null) return;
  loadDirectory(state.parentPath);
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

loadDirectory(getDirFromUrl(), { replaceHistory: true });
