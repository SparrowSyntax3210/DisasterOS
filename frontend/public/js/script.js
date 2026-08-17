gsap.registerPlugin(ScrollTrigger);

const loader = document.getElementById("loader");
const main = document.getElementById("mainPage");

const fill = document.querySelector(".progress-fill");
const percent = document.querySelector(".percent");
const status = document.getElementById("status");
const StartBtn = document.querySelector(".nav-btn")

StartBtn.addEventListener("click", ()=> {
  window.location.href = "./role-selection.html"
})

const messages = [
    "Initializing DisasterOS...",
    "Connecting IMD Weather Grid...",
    "Loading Satellite Layers...",
    "Running AI Flood Prediction...",
    "Deploying GIS Engine...",
    "Synchronizing Resources...",
    "System Ready"
];

let data = { value: 0 };

function updateStatus(v){

    if(v<20)
        status.innerHTML=messages[0];

    else if(v<35)
        status.innerHTML=messages[1];

    else if(v<55)
        status.innerHTML=messages[2];

    else if(v<75)
        status.innerHTML=messages[3];

    else if(v<95)
        status.innerHTML=messages[4];

    else if(v<100)
        status.innerHTML=messages[5];

    else
        status.innerHTML=messages[6];

}

function startHeroAnimations(){

    const tl=gsap.timeline();

    tl.from("nav",{
        y:-80,
        opacity:0,
        duration:.8
    })

    .from(".tag",{
        opacity:0,
        y:25,
        duration:.5
    },"-=.3")

    .from(".left h1",{
        opacity:0,
        y:60,
        duration:.8
    },"-=.2")

    .from(".left p",{
        opacity:0,
        y:30,
        duration:.5
    },"-=.4")

    .from(".buttons",{
        opacity:0,
        y:20,
        duration:.5
    })

    .from(".status-card",{
        opacity:0,
        x:100,
        duration:.8
    },"-=.8")

    .from(".feature",{
        opacity:0,
        y:40,
        stagger:.08,
        duration:.5
    },"-=.4");

}

gsap.to(data,{

    value:100,

    duration:2.6,

    ease:"power2.out",

    onUpdate:()=>{

        const v=Math.round(data.value);

        percent.innerHTML=v+"%";

        fill.style.width=v+"%";

        updateStatus(v);

    },

    onComplete:()=>{

        gsap.to(loader,{

            opacity:0,

            duration:.6,

            onComplete:()=>{

                loader.remove();

                main.style.display="block";

                gsap.to(main,{

                    opacity:1,

                    duration:.8,

                    onComplete:startHeroAnimations

                });

            }

        });

    }

});

gsap.to(".scan-line",{
    top:"100%",
    repeat:-1,
    duration:1.8,
    ease:"none"
});

gsap.to(".bg-grid",{
    backgroundPosition:"40px 40px",
    repeat:-1,
    duration:8,
    ease:"none"
});

gsap.to(".loader-logo",{
    y:-8,
    repeat:-1,
    yoyo:true,
    duration:2
});
/* ============================================
   HERO ENTRY ANIMATION
============================================ */

const tl = gsap.timeline();

tl.from("nav", {
  y: -80,
  opacity: 0,
  duration: 1,
  ease: "power3.out",
})

  .from(
    ".tag",
    {
      y: 35,
      opacity: 0,
      duration: 0.8,
    },
    "-=.4",
  )

  .from(
    ".left h1",
    {
      y: 80,
      opacity: 0,
      duration: 1,
      ease: "power4.out",
    },
    "-=.4",
  )

  .from(
    ".left p",
    {
      y: 40,
      opacity: 0,
      duration: 0.8,
    },
    "-=.6",
  )

  .from(
    ".buttons",
    {
      y: 30,
      opacity: 0,
      duration: 0.8,
    },
    "-=.4",
  )

  .from(
    ".status-card",
    {
      x: 120,
      opacity: 0,
      duration: 1.2,
      ease: "power4.out",
    },
    "-=1",
  )

  .from(
    ".feature",
    {
      y: 60,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
    },
    "-=.6",
  );

/* ============================================
   RAIN
============================================ */

const rain = document.querySelector(".rain-container");

const DROP_COUNT = 180;

for (let i = 0; i < DROP_COUNT; i++) {
  const drop = document.createElement("div");

  drop.classList.add("drop");

  if (Math.random() > 0.7) drop.classList.add("large");
  else if (Math.random() > 0.45) drop.classList.add("small");

  drop.style.left = Math.random() * 100 + "vw";

  drop.style.top = -Math.random() * 120 + "vh";

  rain.appendChild(drop);

  gsap.to(drop, {
    y: window.innerHeight + 250,

    x: -150,

    duration: gsap.utils.random(0.45, 0.9),

    repeat: -1,

    delay: Math.random(),

    ease: "none",
  });
}

/* ============================================
   FLOATING PARTICLES
============================================ */

for (let i = 0; i < 45; i++) {
  const p = document.createElement("div");

  p.classList.add("particle");

  p.style.left = Math.random() * 100 + "vw";

  p.style.top = Math.random() * 100 + "vh";

  document.body.appendChild(p);

  gsap.to(p, {
    y: -120,

    opacity: 0,

    duration: gsap.utils.random(6, 10),

    repeat: -1,

    delay: Math.random() * 5,

    ease: "none",
  });

  gsap.to(p, {
    x: "+=30",

    duration: gsap.utils.random(3, 6),

    repeat: -1,

    yoyo: true,

    ease: "sine.inOut",
  });
}

/* ============================================
   LIGHTNING
============================================ */

const flash = document.querySelector(".lightning");

function strike() {
  gsap
    .timeline()

    .to(flash, {
      opacity: 0.95,
      duration: 0.05,
    })

    .to(flash, {
      opacity: 0.15,
      duration: 0.08,
    })

    .to(flash, {
      opacity: 1,
      duration: 0.03,
    })

    .to(flash, {
      opacity: 0,
      duration: 0.35,
    });

  gsap.fromTo(
    ".hero-bg",

    {
      scale: 1,
    },

    {
      scale: 1.02,
      duration: 0.25,
      yoyo: true,
      repeat: 1,
    },
  );

  setTimeout(strike, gsap.utils.random(2500, 7000));
}

setTimeout(strike, 2500);

/* ============================================
   FLOATING CARD
============================================ */

gsap.to(".status-card", {
  y: -15,

  duration: 2.5,

  repeat: -1,

  yoyo: true,

  ease: "sine.inOut",
});

/* ============================================
   MOUSE PARALLAX
============================================ */

window.addEventListener("mousemove", (e) => {
  let x = e.clientX / window.innerWidth - 0.5;

  let y = e.clientY / window.innerHeight - 0.5;

  gsap.to(".hero-bg", {
    x: x * 30,

    y: y * 20,

    duration: 2,

    ease: "power3.out",
  });

  gsap.to(".status-card", {
    x: x * 20,

    y: y * 15,

    duration: 1.5,
  });
});

/* ============================================
   BUTTON HOVER
============================================ */

document.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("mouseenter", () => {
    gsap.to(btn, {
      scale: 1.05,
      duration: 0.25,
    });
  });

  btn.addEventListener("mouseleave", () => {
    gsap.to(btn, {
      scale: 1,
      duration: 0.25,
    });
  });
});

/* ============================================
   FEATURE HOVER
============================================ */

document.querySelectorAll(".feature").forEach((card) => {
  card.addEventListener("mouseenter", () => {
    gsap.to(card, {
      y: -12,
      duration: 0.3,
    });
  });

  card.addEventListener("mouseleave", () => {
    gsap.to(card, {
      y: 0,
      duration: 0.3,
    });
  });
});

/* ============================================
   LIVE RISK TEXT
============================================ */

const levels = ["Low Risk", "Moderate Risk", "High Risk", "Critical"];

const colors = ["#00d26a", "#ffc400", "#16bfff", "#ff4040"];

const risk = document.querySelector(".status-card h2");

let index = 2;

setInterval(() => {
  index = (index + 1) % levels.length;

  gsap.to(risk, {
    opacity: 0,

    y: -10,

    duration: 0.2,

    onComplete: () => {
      risk.innerHTML = `${levels[index]} <i class="ri-error-warning-fill"></i>`;

      risk.style.color = colors[index];

      gsap.to(risk, {
        opacity: 1,
        y: 0,
        duration: 0.35,
      });
    },
  });
}, 7000);

/* ============================================
   SCROLL ANIMATION
============================================ */

gsap.utils.toArray(".feature").forEach((item) => {
  gsap.from(item, {
    scrollTrigger: {
      trigger: item,

      start: "top 85%",
    },

    y: 60,

    opacity: 0,

    duration: 1,
  });
});

/* ============================================
   CONTINUOUS BACKGROUND ZOOM
============================================ */

gsap.to(".hero-bg", {
  scale: 1.08,

  duration: 18,

  repeat: -1,

  yoyo: true,

  ease: "none",
});
