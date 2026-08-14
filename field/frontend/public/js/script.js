// ==========================================================
// DISASTEROS FIELD APP
// DASHBOARD
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
  initializeNavigation();

  initializeMenu();

  initializeQuickSheet();

  initializeAlert();
});

// ==========================================================
// NAVIGATION
// ==========================================================

function navigateTo(page) {
  if (!page) return;

  window.location.href = page;
}

// ==========================================================
// ALL ROUTE BUTTONS
// ==========================================================

function initializeNavigation() {
  document.querySelectorAll("[data-route]").forEach((element) => {
    element.addEventListener("click", () => {
      const route = element.dataset.route;

      if (!route) return;

      navigateTo(route);
    });
  });
}

// ==========================================================
// SIDE MENU
// ==========================================================

const menuButton = document.getElementById("menuButton");

const closeMenu = document.getElementById("closeMenu");

const sideMenu = document.getElementById("sideMenu");

const menuOverlay = document.getElementById("menuOverlay");

function openMenu() {
  sideMenu?.classList.add("active");

  menuOverlay?.classList.add("active");
}

function hideMenu() {
  sideMenu?.classList.remove("active");

  menuOverlay?.classList.remove("active");
}

function initializeMenu() {
  menuButton?.addEventListener("click", openMenu);

  closeMenu?.addEventListener("click", hideMenu);

  menuOverlay?.addEventListener("click", hideMenu);

  document.querySelectorAll(".menu-link").forEach((button) => {
    button.addEventListener("click", () => {
      const route = button.dataset.route;

      hideMenu();

      if (route) {
        setTimeout(() => {
          navigateTo(route);
        }, 150);
      }
    });
  });
}

// ==========================================================
// PROFILE
// ==========================================================

document.getElementById("profileButton")?.addEventListener("click", () => {
  navigateTo("login.html");
});

// ==========================================================
// ALERT
// ==========================================================

function initializeAlert() {
  document.getElementById("viewAlertsButton")?.addEventListener("click", () => {
    navigateTo("alerts.html");
  });

  document.getElementById("alertsCard")?.addEventListener("click", (event) => {
    if (event.target.closest("#viewAlertsButton")) {
      return;
    }

    navigateTo("alerts.html");
  });
}

// ==========================================================
// QUICK ACTION SHEET
// ==========================================================

const quickActionButton = document.getElementById("quickActionButton");

const quickSheet = document.getElementById("quickSheet");

const quickSheetOverlay = document.getElementById("quickSheetOverlay");

function openQuickSheet() {
  quickSheet?.classList.add("active");

  quickSheetOverlay?.classList.add("active");
}

function closeQuickSheet() {
  quickSheet?.classList.remove("active");

  quickSheetOverlay?.classList.remove("active");
}

function initializeQuickSheet() {
  quickActionButton?.addEventListener("click", openQuickSheet);

  quickSheetOverlay?.addEventListener("click", closeQuickSheet);

  quickSheet?.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      const route = button.dataset.route;

      closeQuickSheet();

      if (route) {
        setTimeout(() => {
          navigateTo(route);
        }, 150);
      }
    });
  });
}

// ==========================================================
// PREVENT DOUBLE TAP / ACCIDENTAL SELECTION
// ==========================================================

document.addEventListener("dblclick", (event) => {
  if (event.target.closest("button")) {
    event.preventDefault();
  }
});
