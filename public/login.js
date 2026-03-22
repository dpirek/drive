const form = document.getElementById("loginForm");
const statusEl = document.getElementById("status");

function setStatus(message) {
  statusEl.textContent = message || "";
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

async function init() {
  try {
    const authUser = await request("/api/auth");
    if (authUser) {
      window.location.replace("/");
      return;
    }
  } catch {
    // Ignore and continue showing login form.
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("");

  const formData = new FormData(form);
  const payload = {
    username: String(formData.get("username") || ""),
    password: String(formData.get("password") || ""),
  };

  try {
    await request("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    window.location.replace("/");
  } catch (error) {
    setStatus(error.message || "Invalid credentials");
  }
});

init();
