/* ==========================================================
   DISASTEROS AUTH UI
   Avatar + Profile + Logout + Session Check
========================================================== */

const AUTH_API = "http://localhost:4000/api/auth";

/* ==========================================================
   GET CURRENT SESSION
========================================================== */

async function getCurrentUser() {
  try {
    const response = await fetch(`${AUTH_API}/status`, {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok || !data.loggedIn) {
      return null;
    }

    return data.user;
  } catch (error) {
    console.error("AUTH STATUS ERROR:", error);

    return null;
  }
}

/* ==========================================================
   CREATE AVATAR
========================================================== */

function createUserAvatar(user) {
  if (!user) return;

  // Existing auth container
  let authContainer = document.getElementById("authUser");

  if (!authContainer) {
    authContainer = document.createElement("div");

    authContainer.id = "authUser";

    document.body.appendChild(authContainer);
  }

  const username = user.username || "User";

  const firstLetter = username.charAt(0).toUpperCase();

  authContainer.innerHTML = `

        <div class="user-profile-wrapper">

            <button
                id="avatarButton"
                class="user-avatar"
                title="${username}"
            >
                ${firstLetter}
            </button>


            <div
                id="userDropdown"
                class="user-dropdown"
            >

                <div class="dropdown-user">

                    <div class="dropdown-avatar">
                        ${firstLetter}
                    </div>

                    <div class="dropdown-info">

                        <strong>
                            ${escapeHTML(username)}
                        </strong>

                        <span>
                            ${escapeHTML(user.email || "")}
                        </span>

                        <small>
                            ${formatRole(user.role)}
                        </small>

                    </div>

                </div>


                <div class="dropdown-divider"></div>


                <button
                    id="logoutButton"
                    class="logout-button"
                >
                    <span>↪</span>
                    Logout
                </button>

            </div>

        </div>
    `;

  /* ======================================================
       TOGGLE DROPDOWN
    ====================================================== */

  const avatarButton = document.getElementById("avatarButton");

  const dropdown = document.getElementById("userDropdown");

  avatarButton.addEventListener("click", function (event) {
    event.stopPropagation();

    dropdown.classList.toggle("show");
  });

  /* ======================================================
       CLOSE WHEN CLICKING OUTSIDE
    ====================================================== */

  document.addEventListener("click", function (event) {
    if (!authContainer.contains(event.target)) {
      dropdown.classList.remove("show");
    }
  });

  /* ======================================================
       LOGOUT
    ====================================================== */

  document.getElementById("logoutButton").addEventListener("click", logoutUser);
}

/* ==========================================================
   LOGOUT
========================================================== */

async function logoutUser() {
  try {
    const response = await fetch(`${AUTH_API}/logout`, {
      method: "GET",

      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Logout failed.");

      return;
    }

    // Remove selected role
    localStorage.removeItem("disasterOSRole");

    // Go back to role selection
    window.location.href = "role-selection.html";
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    alert("Unable to logout. Please try again.");
  }
}

/* ==========================================================
   AUTHENTICATE DASHBOARD
========================================================== */

async function protectDashboard(expectedRole) {
  const user = await getCurrentUser();

  if (!user) {
    localStorage.removeItem("disasterOSRole");

    window.location.href = "role-selection.html";

    return null;
  }

  const selectedRole = localStorage.getItem("disasterOSRole");

  /*
   * Check frontend selected role.
   */

  if (selectedRole && selectedRole !== expectedRole) {
    if (selectedRole === "user") {
      window.location.href = "user-dashboard.html";
    } else if (selectedRole === "command-center") {
      window.location.href = "command-center.html";
    }

    return null;
  }

  createUserAvatar(user);

  return user;
}

/* ==========================================================
   ROLE FORMATTER
========================================================== */

function formatRole(role) {
  if (!role) return "User";

  if (role === "command-center") {
    return "Command Center";
  }

  if (role === "command_center") {
    return "Command Center";
  }

  return role
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/* ==========================================================
   HTML ESCAPE
========================================================== */

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
