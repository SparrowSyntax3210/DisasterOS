// ==========================================================
// DISASTEROS AUTHENTICATION
// ==========================================================

const API_BASE = "http://localhost:4000";

console.log("🔐 DisasterOS Authentication starting...");

// ==========================================================
// HELPERS
// ==========================================================

function showMessage(id, message) {
  const element = document.getElementById(id);

  if (!element) return;

  element.textContent = message;
  element.classList.remove("hidden");
}

function hideMessage(id) {
  const element = document.getElementById(id);

  if (!element) return;

  element.classList.add("hidden");
}

function setLoading(buttonId, textId, loaderId, loading, text) {
  const button = document.getElementById(buttonId);

  const textElement = document.getElementById(textId);

  const loader = document.getElementById(loaderId);

  if (button) {
    button.disabled = loading;
  }

  if (textElement) {
    textElement.textContent = loading ? "" : text;
  }

  if (loader) {
    loader.classList.toggle("hidden", !loading);
  }
}

// ==========================================================
// PASSWORD TOGGLE
// ==========================================================

function setupPasswordToggle(buttonId, inputId) {
  const button = document.getElementById(buttonId);

  const input = document.getElementById(inputId);

  if (!button || !input) return;

  button.addEventListener("click", () => {
    if (input.type === "password") {
      input.type = "text";

      button.textContent = "HIDE";
    } else {
      input.type = "password";

      button.textContent = "SHOW";
    }
  });
}

setupPasswordToggle("togglePassword", "password");

setupPasswordToggle("toggleSignupPassword", "signupPassword");

// ==========================================================
// GET CURRENT AUTHENTICATED USER
// ==========================================================
//
// SERVER SESSION IS THE SOURCE OF TRUTH.
//
// We NEVER use localStorage to determine login state.
//
// /auth/status
//      ↓
// session
//      ↓
// userId
//      ↓
// MongoDB
//
// ==========================================================

async function fetchCurrentUser() {
  try {
    console.log("📡 Checking DisasterOS session...");

    const response = await fetch(`${API_BASE}/auth/status`, {
      method: "GET",

      credentials: "include",

      headers: {
        Accept: "application/json",
      },

      cache: "no-store",
    });

    const data = await response.json();

    console.log("📡 /auth/status response:", data);

    if (!response.ok) {
      console.error("❌ Status request failed:", response.status);

      return null;
    }

    // ======================================================
    // NOT LOGGED IN
    // ======================================================

    if (data.loggedIn !== true || !data.user) {
      console.log("ℹ️ No active DisasterOS session.");

      sessionStorage.removeItem("disasterOSUser");

      return null;
    }

    // ======================================================
    // LOGGED IN
    // ======================================================

    const user = data.user;

    console.log("✅ Authenticated DisasterOS user:", user);

    // Cache profile only for UI.
    // This is NOT used as authentication.

    sessionStorage.setItem("disasterOSUser", JSON.stringify(user));

    return user;
  } catch (error) {
    console.error("❌ Could not check DisasterOS session:", error);

    return null;
  }
}

async function openUserProfile() {
  console.log("👤 DisasterOS avatar clicked.");
  console.log("📡 Checking authentication...");

  try {
    const user = await fetchCurrentUser();

    // ======================================================
    // LOGGED IN
    // ======================================================

    if (user) {
      console.log("✅ User is logged in.");
      console.log("👤 Opening profile for:", user.username);

      window.location.href = "./profile.html";

      return;
    }

    // ======================================================
    // NOT LOGGED IN
    // ======================================================

    console.log("🔒 User is not logged in.");
    console.log("➡️ Redirecting to login...");

    window.location.href = "./login.html";
  } catch (error) {
    console.error("❌ Avatar authentication check failed:", error);

    // If authentication cannot be verified,
    // send the user to login.

    window.location.href = "./login.html";
  }
}

// ==========================================================
// SETUP AVATAR
// ==========================================================

function setupAvatar() {
  const avatar = document.getElementById("userAvatar");

  if (!avatar) {
    console.log("ℹ️ No index page avatar found.");
    return;
  }

  console.log("👤 Setting up DisasterOS avatar.");

  // Avatar is ALWAYS visible.
  avatar.style.display = "";
  avatar.style.cursor = "pointer";

  // Prevent duplicate event listeners
  if (avatar.dataset.authReady === "true") {
    return;
  }

  avatar.dataset.authReady = "true";

  avatar.addEventListener("click", openUserProfile);

  console.log("✅ Avatar authentication handler ready.");
}

function redirectAfterAuth() {
  console.log("✅ Login successful.");

  console.log("🏠 Returning to DisasterOS home...");

  window.location.href = "./index.html";
}

// ==========================================================
// LOGIN
// ==========================================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    hideMessage("authError");

    const emailElement = document.getElementById("email");

    const passwordElement = document.getElementById("password");

    if (!emailElement || !passwordElement) {
      showMessage("authError", "Login form configuration error.");

      return;
    }

    const email = emailElement.value.trim();

    const password = passwordElement.value;

    // ====================================================
    // VALIDATION
    // ====================================================

    if (!email || !password) {
      showMessage("authError", "Please enter your email and password.");

      return;
    }

    // ====================================================
    // LOADING
    // ====================================================

    setLoading(
      "loginButton",
      "loginButtonText",
      "loginLoader",
      true,
      "Sign In",
    );

    try {
      console.log("📡 Sending login request...");

      // ==================================================
      // LOGIN REQUEST
      // ==================================================

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",

        credentials: "include",

        headers: {
          "Content-Type": "application/json",

          Accept: "application/json",
        },

        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const contentType = response.headers.get("content-type") || "";

      let data = {};

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();

        data = {
          message: text || "Login failed.",
        };
      }

      // ==================================================
      // LOGIN FAILED
      // ==================================================

      if (!response.ok) {
        throw new Error(data.message || "Invalid email or password.");
      }

      console.log("✅ Login request successful.");

      // ==================================================
      // VERIFY SESSION
      // ==================================================

      console.log("📡 Verifying login session...");

      const user = await fetchCurrentUser();

      if (!user) {
        throw new Error(
          "Login succeeded, but the session could not be verified.",
        );
      }

      console.log("✅ Session verified.");

      console.log("👤 Logged in user:", user.username);

      // ==================================================
      // SUCCESS MESSAGE
      // ==================================================

      showMessage("authError", `Welcome ${user.username}. Redirecting...`);

      // ==================================================
      // GO BACK TO INDEX
      // ==================================================

      setTimeout(() => {
        redirectAfterAuth();
      }, 500);
    } catch (error) {
      console.error("❌ Login failed:", error);

      showMessage(
        "authError",
        error.message || "Unable to login. Please try again.",
      );
    } finally {
      setLoading(
        "loginButton",
        "loginButtonText",
        "loginLoader",
        false,
        "Sign In",
      );
    }
  });
}

// ==========================================================
// FORGOT PASSWORD
// ==========================================================

document.getElementById("forgotPassword")?.addEventListener("click", () => {
  alert("Password recovery will be available soon.");
});

// ==========================================================
// CHECK EXISTING SESSION ON LOGIN PAGE
// ==========================================================
//
// If someone is already logged in and somehow opens
// login.html again, send them back to index.html.
//
// ==========================================================

async function checkExistingSession() {
  // Only run on login page

  if (!loginForm) {
    return;
  }

  console.log("🔎 Checking existing DisasterOS session...");

  const user = await fetchCurrentUser();

  if (!user) {
    console.log("ℹ️ No existing session.");

    return;
  }

  console.log("✅ Existing session detected:", user.username);

  // Already logged in.
  // Return to home.

  window.location.href = "./index.html";
}

checkExistingSession();

// ==========================================================
// LOGOUT
// ==========================================================

async function logoutDisasterOS() {
  try {
    console.log("🚪 Logging out of DisasterOS...");

    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: "GET",

      credentials: "include",

      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Logout failed.");
    }

    // Remove UI cache

    sessionStorage.removeItem("disasterOSUser");

    localStorage.removeItem("disasterOSUser");

    console.log("✅ DisasterOS logout successful.");

    // Return to main website

    window.location.href = "./index.html";
  } catch (error) {
    console.error("❌ Logout failed:", error);
  }
}

// ==========================================================
// GLOBAL LOGOUT
// ==========================================================

window.disasterOSLogout = logoutDisasterOS;

// ==========================================================
// PUBLIC AUTH API
// ==========================================================

window.disasterOSAuth = {
  login: () => {
    document.getElementById("loginForm")?.requestSubmit();
  },

  getCurrentUser: fetchCurrentUser,

  logout: logoutDisasterOS,

  openProfile: openUserProfile,
};

// ==========================================================
// START
// ==========================================================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupAvatar);
} else {
  setupAvatar();
}

console.log("✅ DisasterOS authentication ready");
