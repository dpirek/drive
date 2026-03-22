import * as auth from "../utils/auth.js";
import { readJsonBody, sendJson } from "../utils/http.js";

async function loginUser({ username, password, response }) {
  if (username === "dave" && password === "a") {
    auth.login(response, username, "admin");
    return {
      username,
      email: "dpirek@gmail.com",
      role: "admin",
    };
  }

  return { error: "invalid credentials" };
}

function createAuthHandlers() {
  async function getAuth(_req, res, { authUser }) {
    return sendJson(res, 200, authUser || null);
  }

  async function login(req, res) {
    try {
      const body = await readJsonBody(req);
      const username = String(body.username || "");
      const password = String(body.password || "");

      const result = await loginUser({ username, password, response: res });
      if (result.error) {
        return sendJson(res, 401, result);
      }

      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 400, { error: error.message || "Unable to login" });
    }
  }

  async function logout(_req, res) {
    auth.logout(res);
    return sendJson(res, 200, { message: "logged out" });
  }

  return {
    getAuth,
    login,
    logout,
  };
}

export { createAuthHandlers };
