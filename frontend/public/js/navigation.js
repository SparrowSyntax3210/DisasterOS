// =====================================================
// DISASTEROS NAVIGATION SYSTEM
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🧭 DisasterOS Navigation Loaded");

  const navItems = document.querySelectorAll(".nav-item[data-view]");
  const viewLinks = document.querySelectorAll("[data-view]");
  const appViews = document.querySelectorAll(".app-view");
  const pageTitle = document.getElementById("pageTitle");
  const sidebar = document.getElementById("sidebar");
  const mobileMenu = document.getElementById("mobileMenu");

  console.log("Navigation items:", navItems.length);
  console.log("App views:", appViews.length);

  // =====================================================
  // PAGE TITLES
  // =====================================================

  const titles = {
    dashboard: "Citizen Dashboard",
    risk: "Risk & Weather",
    map: "Live Map",
    incident: "Report Incident",
    sos: "Emergency SOS",
    evacuation: "Evacuation",
    alerts: "Alerts",
    resources: "Resources",
    settings: "Settings",
  };

  // =====================================================
  // CHANGE VIEW
  // =====================================================

  function showView(viewName) {
    console.log("➡️ Switching to:", viewName);

    // ---------------------------------------------
    // Hide every view
    // ---------------------------------------------

    appViews.forEach((view) => {
      view.classList.remove("active-view");
    });

    // ---------------------------------------------
    // Remove active from every navigation item
    // ---------------------------------------------

    navItems.forEach((item) => {
      item.classList.remove("active");
    });

    // ---------------------------------------------
    // Find requested view
    // ---------------------------------------------

    const targetView = document.querySelector(
      `.app-view[data-panel="${viewName}"]`,
    );

    if (!targetView) {
      console.error(`❌ View not found: ${viewName}`);
      return;
    }

    // ---------------------------------------------
    // Activate view
    // ---------------------------------------------

    targetView.classList.add("active-view");

    // ---------------------------------------------
    // Activate matching nav item
    // ---------------------------------------------

    navItems.forEach((item) => {
      if (item.dataset.view === viewName) {
        item.classList.add("active");
      }
    });

    // ---------------------------------------------
    // Update title
    // ---------------------------------------------

    if (pageTitle) {
      pageTitle.textContent = titles[viewName] || "Citizen Dashboard";
    }

    // ---------------------------------------------
    // Update URL hash
    // ---------------------------------------------

    if (window.location.hash !== `#${viewName}`) {
      history.replaceState(null, "", `#${viewName}`);
    }

    // ---------------------------------------------
    // Close mobile sidebar
    // ---------------------------------------------

    if (window.innerWidth <= 900 && sidebar) {
      sidebar.classList.remove("mobile-open");
    }

    // ---------------------------------------------
    // Leaflet map fix
    // ---------------------------------------------

    if (viewName === "map") {
      setTimeout(() => {
        if (window.liveMapInstance) {
          window.liveMapInstance.invalidateSize();
        }

        if (window.map) {
          window.map.invalidateSize();
        }
      }, 300);
    }

    // ---------------------------------------------
    // Trigger custom event
    // ---------------------------------------------

    document.dispatchEvent(
      new CustomEvent("disasteros:viewChanged", {
        detail: {
          view: viewName,
        },
      }),
    );
  }

  // =====================================================
  // NAVIGATION CLICK
  // =====================================================

  viewLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();

      const viewName = link.dataset.view;

      if (!viewName) {
        console.warn("⚠️ No data-view found:", link);
        return;
      }

      showView(viewName);
    });
  });

  // =====================================================
  // HANDLE BROWSER HASH
  // =====================================================

  function loadFromHash() {
    let viewName = window.location.hash.replace("#", "");

    if (!viewName) {
      viewName = "dashboard";
    }

    const validView = document.querySelector(
      `.app-view[data-panel="${viewName}"]`,
    );

    if (validView) {
      showView(viewName);
    } else {
      showView("dashboard");
    }
  }

  // =====================================================
  // HASH CHANGE
  // =====================================================

  window.addEventListener("hashchange", () => {
    loadFromHash();
  });

  // =====================================================
  // MOBILE MENU
  // =====================================================

  if (mobileMenu && sidebar) {
    mobileMenu.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");
    });
  }

  // =====================================================
  // INITIAL VIEW
  // =====================================================

  loadFromHash();
});
