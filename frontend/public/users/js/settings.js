// =========================================================
// DISASTEROS SETTINGS
// =========================================================

(function () {
  let initialized = false;

  function getAPI() {
    return window.API || "http://localhost:4000";
  }

  function initSettingsOverlay() {
    if (!initialized) {
      initialized = true;

      const form = document.getElementById("settingsForm");

      if (form) {
        form.addEventListener("submit", updateProfile);
      }
    }

    loadProfile();
  }

  async function loadProfile() {
    const user = window.currentUser;

    if (!user) {
      return;
    }

    setValue("settingsName", user.name);

    setValue("settingsEmail", user.email);

    setValue("settingsPhone", user.phone);

    setText("settingsRole", user.role || "Citizen");
  }

  async function updateProfile(event) {
    event.preventDefault();

    const user = window.currentUser;

    if (!user?._id) {
      showMessage("Unable to identify current user.", "error");

      return;
    }

    const payload = {
      name: document.getElementById("settingsName").value.trim(),

      phone: document.getElementById("settingsPhone").value.trim(),
    };

    try {
      const response = await fetch(
        `${getAPI()}/api/users/users/update/${user._id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          credentials: "include",

          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to update profile.");
      }

      window.currentUser = result;

      await loadProfile();

      showMessage("Profile updated successfully.", "success");

      updateTopbar();
    } catch (error) {
      console.error("Settings Error:", error);

      showMessage(error.message, "error");
    }
  }

  function updateTopbar() {
    const user = window.currentUser;

    if (!user) {
      return;
    }

    setText("userName", user.name || "Citizen");

    setText("userRole", user.role || "Citizen");

    const avatar = document.getElementById("profileAvatar");

    if (avatar) {
      avatar.textContent = (user.name || "C").charAt(0).toUpperCase();
    }
  }

  function setValue(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.value = value || "";
    }
  }

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value || "";
    }
  }

  function showMessage(message, type) {
    const element = document.getElementById("settingsMessage");

    if (!element) {
      return;
    }

    element.textContent = message;

    element.style.color =
      type === "success" ? "var(--accent)" : "var(--danger)";
  }

  window.initSettingsOverlay = initSettingsOverlay;
})();
