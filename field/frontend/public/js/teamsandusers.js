const volunteers = [
  { name: "Arjun Patel", role: "Team Lead", status: "Online", team: true, initials: "AP", color: "#1b6996" },
  { name: "Neha Verma", role: "Medic", status: "Online", team: true, initials: "NV", color: "#9a5f4e" },
  { name: "Rohan Das", role: "Rescue Team", status: "Busy", team: true, initials: "RD", color: "#79513f" },
  { name: "Meera Iyer", role: "Navigator", status: "Online", team: false, initials: "MI", color: "#3b7a55" },
  { name: "Priya Singh", role: "Logistics", status: "Online", team: false, initials: "PS", color: "#3f8463" },
  { name: "Vikram Rao", role: "Driver", status: "Offline", team: false, initials: "VR", color: "#57718a" }
];

const list = document.querySelector("#userList");
const toast = document.querySelector("#toast");
let currentFilter = "all";
let toastTimer;

function renderUsers() {
  const displayedUsers =
    currentFilter === "team"
      ? volunteers.filter((user) => user.team)
      : volunteers;

  list.innerHTML = displayedUsers
    .map(
      (user) => `
        <article class="user">
          <div class="avatar" style="--avatar: ${user.color}">
            ${user.initials}
          </div>

          <div class="details">
            <strong>${user.name}</strong>
            <span>${user.role}</span>
          </div>

          <span class="availability ${user.status.toLowerCase()}">
            ${user.status}
          </span>
        </article>
      `
    )
    .join("");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelector(".tab.active").classList.remove("active");
    tab.classList.add("active");

    currentFilter = tab.dataset.filter;
    renderUsers();
  });
});

document.querySelector("#mapButton").addEventListener("click", () => {
  showToast("Opening your team on the map…");
});

document.querySelector("#backButton").addEventListener("click", () => {
  showToast("Returning to the previous screen…");
});

lucide.createIcons({
  attrs: { "stroke-width": 2 }
});

renderUsers();