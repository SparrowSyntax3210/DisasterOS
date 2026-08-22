"use strict";

console.log("🚨 Command Alerts Loaded");

const CommandCenterAlerts = (() => {
  let container = null;
  let initialized = false;

  const MAX_ALERTS = 20;

  function getContainer() {
    if (container) return container;

    container =
      document.getElementById("commandAlerts") ||
      document.getElementById("alertContainer") ||
      document.querySelector("[data-command-alerts]");

    return container;
  }

  function escape(value) {
    if (typeof window.escapeCommandHTML === "function") {
      return window.escapeCommandHTML(value);
    }

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function createAlert({
    type = "info",
    title = "Command Alert",
    message = "",
    entityId = null,
    timestamp = new Date(),
  }) {
    const element = document.createElement("div");

    element.className = `command-alert command-alert-${type}`;

    if (entityId) {
      element.dataset.entityId = entityId;
    }

    element.innerHTML = `
      <div class="command-alert-icon">
        ${getIcon(type)}
      </div>

      <div class="command-alert-content">

        <strong>
          ${escape(title)}
        </strong>

        <span>
          ${escape(message)}
        </span>

        <small>
          ${new Date(timestamp).toLocaleTimeString()}
        </small>

      </div>

      <button
        type="button"
        class="command-alert-close"
        aria-label="Dismiss alert"
      >
        ×
      </button>
    `;

    element
      .querySelector(".command-alert-close")
      ?.addEventListener("click", () => {
        element.remove();
      });

    return element;
  }

  function getIcon(type) {
    switch (type) {
      case "critical":
        return "🚨";

      case "warning":
        return "⚠️";

      case "success":
        return "✓";

      case "sos":
        return "🆘";

      case "mission":
        return "🎯";

      case "incident":
        return "⚡";

      default:
        return "ℹ";
    }
  }

  function show(options = {}) {
    const target = getContainer();

    if (!target) {
      console.warn("⚠️ Command alert container not found.");

      return;
    }

    const alert = createAlert(options);

    target.prepend(alert);

    while (target.children.length > MAX_ALERTS) {
      target.lastElementChild?.remove();
    }

    return alert;
  }

  function clear() {
    const target = getContainer();

    if (target) {
      target.innerHTML = "";
    }
  }

  function handleStateChange(state, type) {
    if (!type) return;

    if (type === "incidents:updated") {
      show({
        type: "incident",
        title: "Incident Updated",
        message: "An incident has been updated.",
      });
    }

    if (type === "sos:updated") {
      show({
        type: "sos",
        title: "SOS Updated",
        message: "An emergency SOS request changed.",
      });
    }

    if (type === "missions:updated") {
      show({
        type: "mission",
        title: "Mission Updated",
        message: "A field mission has been updated.",
      });
    }
  }

  function initialize() {
    if (initialized) return;

    initialized = true;

    getContainer();

    if (window.CommandCenterData) {
      CommandCenterData.subscribe(handleStateChange);
    }

    console.log("✅ Command Alerts Ready");
  }

  return {
    initialize,
    show,
    clear,
  };
})();

window.CommandCenterAlerts = CommandCenterAlerts;

console.log("✅ Command Alert Engine Ready");
