// ==========================================================
// DISASTEROS PROFILE
// ==========================================================

console.log("👤 DisasterOS Profile starting...");

// ==========================================================
// CONFIG
// ==========================================================

const PROFILE_API_BASE = "http://localhost:4000";

// ==========================================================
// ELEMENTS
// ==========================================================

const profileLoading = document.getElementById("profileLoading");

const profileContent = document.getElementById("profileContent");

const profileError = document.getElementById("profileError");

const profileUsername = document.getElementById("profileUsername");

const profileRole = document.getElementById("profileRole");

const profileRoleBadge = document.getElementById("profileRoleBadge");

const profileEmail = document.getElementById("profileEmail");

const profilePhone = document.getElementById("profilePhone");

const profileLocation = document.getElementById("profileLocation");

const avatarPreview = document.getElementById("avatarPreview");

const profileImage = document.getElementById("profileImage");

const logoutButton = document.getElementById("logoutButton");

const loginButton = document.getElementById("loginButton");

const settingsButton = document.getElementById("settingsButton");

const profileSettingsButton = document.getElementById("profileSettingsButton");

const tasksButton = document.getElementById("tasksButton");

const offlineMapsButton = document.getElementById("offlineMapsButton");

const helpButton = document.getElementById("helpButton");

const toast = document.getElementById("toast");

const missionsCount = document.getElementById("missionsCount");

const hoursCount = document.getElementById("hoursCount");

const peopleHelpedCount = document.getElementById("peopleHelpedCount");

// ==========================================================
// TOAST
// ==========================================================

let toastTimer;

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

// ==========================================================
// SCREEN STATES
// ==========================================================

function showProfileLoading() {
  profileLoading?.classList.remove("hidden");

  profileContent?.classList.add("hidden");

  profileError?.classList.add("hidden");
}

function showProfile() {
  profileLoading?.classList.add("hidden");

  profileError?.classList.add("hidden");

  profileContent?.classList.remove("hidden");
}

function showProfileError() {
  profileLoading?.classList.add("hidden");

  profileContent?.classList.add("hidden");

  profileError?.classList.remove("hidden");
}

// ==========================================================
// ROLE FORMATTER
// ==========================================================

function formatRole(role) {
  if (!role) {
    return "Responder";
  }

  const normalized = String(role).trim().toLowerCase();

  const roleNames = {
    volunteer: "Volunteer",

    responder: "Responder",

    field: "Field Responder",

    guardian: "Guardian",

    admin: "Administrator",

    command: "Command Operator",
  };

  return (
    roleNames[normalized] ||
    normalized.charAt(0).toUpperCase() + normalized.slice(1)
  );
}

// ==========================================================
// INITIALS
// ==========================================================

function createInitials(username) {
  if (!username) {
    return "--";
  }

  const parts = username.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ==========================================================
// STATISTICS
// ==========================================================

function renderStatistics(user) {
  /*
    These fields will work automatically if your backend
    eventually sends them.

    Example:

    user.stats.missions
    user.stats.hours
    user.stats.peopleHelped

    Until then they safely show 0.
  */

  const stats = user.stats || {};

  const missions = stats.missions ?? user.missions ?? 0;

  const hours = stats.hours ?? user.hours ?? 0;

  const peopleHelped = stats.peopleHelped ?? user.peopleHelped ?? 0;

  if (missionsCount) {
    missionsCount.textContent = missions;
  }

  if (hoursCount) {
    hoursCount.textContent = hours;
  }

  if (peopleHelpedCount) {
    peopleHelpedCount.textContent = peopleHelped;
  }
}

// ==========================================================
// RENDER PROFILE
// ==========================================================

function renderProfile(user) {
  if (!user) {
    showProfileError();

    return;
  }

  console.log("👤 Rendering profile:", user);

  // ========================================================
  // USERNAME
  // ========================================================

  if (profileUsername) {
    profileUsername.textContent = user.username || "DisasterOS User";
  }

  // ========================================================
  // ROLE
  // ========================================================

  const formattedRole = formatRole(user.role);

  if (profileRole) {
    profileRole.textContent = formattedRole;
  }

  if (profileRoleBadge) {
    profileRoleBadge.textContent = formattedRole;
  }

  // ========================================================
  // EMAIL
  // ========================================================

  if (profileEmail) {
    profileEmail.textContent = user.email || "Not provided";
  }

  // ========================================================
  // PHONE
  // ========================================================

  if (profilePhone) {
    profilePhone.textContent = user.Phone || user.phone || "Not provided";
  }

  // ========================================================
  // LOCATION
  // ========================================================

  if (profileLocation) {
    profileLocation.textContent =
      user.Location || user.location || "Not provided";
  }

  // ========================================================
  // PROFILE IMAGE
  // ========================================================

  if (avatarPreview && user.ProfileImage) {
    avatarPreview.style.backgroundImage = `url("${user.ProfileImage}")`;

    avatarPreview.style.backgroundSize = "cover";

    avatarPreview.style.backgroundPosition = "center";

    avatarPreview.textContent = "";
  } else if (avatarPreview) {
    avatarPreview.style.backgroundImage = "";

    avatarPreview.textContent = createInitials(user.username);
  }

  // ========================================================
  // STATISTICS
  // ========================================================

  renderStatistics(user);

  // ========================================================
  // CACHE
  // ========================================================

  try {
    sessionStorage.setItem("disasterOSUser", JSON.stringify(user));
  } catch (error) {
    console.warn("Unable to cache profile:", error);
  }

  // ========================================================
  // SHOW
  // ========================================================

  showProfile();

  // ========================================================
  // LUCIDE
  // ========================================================

  refreshIcons();
}

// ==========================================================
// LUCIDE
// ==========================================================

function refreshIcons() {
  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons({
      attrs: {
        "stroke-width": 1.8,
      },
    });
  }
}

// ==========================================================
// LOAD PROFILE
// ==========================================================

async function loadProfile() {
  console.log("📡 Fetching profile...");

  showProfileLoading();

  try {
    const response = await fetch(`${PROFILE_API_BASE}/auth/status`, {
      method: "GET",

      credentials: "include",

      headers: {
        Accept: "application/json",
      },
    });

    console.log("📡 Status:", response.status);

    const data = await response.json();

    console.log("📡 Auth data:", data);

    if (!response.ok || !data.loggedIn || !data.user) {
      console.warn("⚠️ User is not authenticated.");

      sessionStorage.removeItem("disasterOSUser");

      showProfileError();

      return;
    }

    console.log("✅ Session verified.");

    renderProfile(data.user);
  } catch (error) {
    console.error("❌ Profile request failed:", error);

    showProfileError();
  }
}

// ==========================================================
// PROFILE IMAGE PREVIEW
// ==========================================================

profileImage?.addEventListener("change", (event) => {
  const image = event.target.files?.[0];

  if (!image) {
    return;
  }

  if (!image.type.startsWith("image/")) {
    showToast("Please select an image");

    return;
  }

  const imageURL = URL.createObjectURL(image);

  if (avatarPreview) {
    avatarPreview.style.backgroundImage = `url("${imageURL}")`;

    avatarPreview.style.backgroundSize = "cover";

    avatarPreview.style.backgroundPosition = "center";

    avatarPreview.textContent = "";
  }

  showToast("Profile image preview updated");
});

// ==========================================================
// SETTINGS
// ==========================================================

settingsButton?.addEventListener("click", () => {
  showToast("Profile settings coming soon");
});

profileSettingsButton?.addEventListener("click", () => {
  showToast("Settings module coming soon");
});

// ==========================================================
// TASKS
// ==========================================================

tasksButton?.addEventListener("click", () => {
  showToast("Opening your missions...");

  /*
      Later:

      window.location.href =
        "./field-app/tasks.html";
    */
});

// ==========================================================
// OFFLINE MAPS
// ==========================================================

offlineMapsButton?.addEventListener("click", () => {
  showToast("Offline maps module coming soon");

  /*
      Later this can open:

      ./field-app/offline-maps.html
    */
});

// ==========================================================
// HELP
// ==========================================================

helpButton?.addEventListener("click", () => {
  showToast("Help & Support coming soon");
});

// ==========================================================
// LOGOUT
// ==========================================================

logoutButton?.addEventListener("click", async () => {
  logoutButton.disabled = true;

  try {
    console.log("🚪 Logging out...");

    const response = await fetch(`${PROFILE_API_BASE}/auth/logout`, {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Logout failed");
    }

    sessionStorage.removeItem("disasterOSUser");

    localStorage.removeItem("disasterOSUser");

    console.log("✅ Logout successful");

    window.location.href = "./login.html";
  } catch (error) {
    console.error("❌ Logout failed:", error);

    showToast(error.message || "Unable to logout");

    logoutButton.disabled = false;
  }
});

// ==========================================================
// LOGIN
// ==========================================================

loginButton?.addEventListener("click", () => {
  window.location.href = "./login.html";
});

// ==========================================================
// RAIN GENERATOR
// ==========================================================

function createRain() {
  const rainLayer = document.getElementById("rainLayer");

  if (!rainLayer) {
    return;
  }

  const dropCount = window.innerWidth < 600 ? 35 : 65;

  rainLayer.innerHTML = "";

  for (let i = 0; i < dropCount; i++) {
    const drop = document.createElement("span");

    drop.className = "rain-drop";

    drop.style.left = `${Math.random() * 110}%`;

    drop.style.top = `${Math.random() * -100}%`;

    drop.style.height = `${40 + Math.random() * 60}px`;

    drop.style.opacity = `${0.2 + Math.random() * 0.5}`;

    drop.style.animationDuration = `${0.7 + Math.random() * 1.3}s`;

    drop.style.animationDelay = `${Math.random() * 2}s`;

    rainLayer.appendChild(drop);
  }
}

// ==========================================================
// START
// ==========================================================

function startProfile() {
  createRain();

  refreshIcons();

  loadProfile();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startProfile);
} else {
  startProfile();
}

console.log("✅ DisasterOS Profile ready");
