const STORAGE_KEY = "limitless-v1";

const defaultFriends = [
  { id: "maya", name: "Maya", scrolling: true },
  { id: "jordan", name: "Jordan", scrolling: true },
  { id: "sam", name: "Sam", scrolling: false }
];

const partners = [
  { name: "GoOut Tickets", code: "METIS15", perk: "15% off event tickets" },
  { name: "Pedal Local", code: "CREWRIDE", perk: "free extra hour on bike rentals" },
  { name: "CourtTime", code: "OFFCOUCH", perk: "$10 off court or lane bookings" },
  { name: "TrailSnack Co", code: "GETOUTSIDE", perk: "buy-one snack, get one" }
];

const templates = [
  {
    title: "Sunset walk + cheap tacos",
    energy: "Easy",
    minutes: 90,
    blurb: "Leave the couch, walk a loop near {place}, then grab tacos outside. Phones stay in pockets until food arrives."
  },
  {
    title: "Pickup game or shootaround",
    energy: "Sweaty",
    minutes: 75,
    blurb: "Find a public court near {place}. First to 11, loser buys drinks. No sitting on the sidelines scrolling."
  },
  {
    title: "Thrift crawl + park hang",
    energy: "Social",
    minutes: 120,
    blurb: "Hit two nearby shops, then sit in a park and show your finds. Walking between stops is the point."
  },
  {
    title: "Bike or scooter loop",
    energy: "Active",
    minutes: 80,
    blurb: "Rent or bring wheels. Do a {place} loop, stop for something cold, race the last three blocks home."
  },
  {
    title: "Live music or open mic",
    energy: "Night out",
    minutes: 150,
    blurb: "Catch whatever is happening near {place} tonight. Stand in the back, talk between sets, actually be in the room."
  },
  {
    title: "Mini adventure hour",
    energy: "Wild card",
    minutes: 60,
    blurb: "Timer starts now: get outside, take a photo of something weird near {place}, reconvene, pick the next move."
  }
];

const state = load() || {
  locationLabel: "",
  coords: null,
  friends: defaultFriends,
  plans: [],
  votes: {},
  chosenId: null
};

const el = {
  crew: document.getElementById("crew-list"),
  plans: document.getElementById("plans"),
  tonight: document.getElementById("tonight"),
  status: document.getElementById("status-line"),
  location: document.getElementById("location-line"),
  dialog: document.getElementById("location-dialog"),
  city: document.getElementById("city-input")
};

document.getElementById("location-btn").addEventListener("click", () => {
  el.city.value = state.locationLabel;
  el.dialog.showModal();
});

document.getElementById("geo-btn").addEventListener("click", async () => {
  if (!navigator.geolocation) {
    el.city.value = el.city.value || "your neighborhood";
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      el.city.value = `Near ${state.coords.lat.toFixed(3)}, ${state.coords.lng.toFixed(3)}`;
    },
    () => {
      el.city.placeholder = "Location blocked — type a city instead";
    }
  );
});

document.getElementById("location-form").addEventListener("submit", (e) => {
  if (e.submitter && e.submitter.value === "save") {
    state.locationLabel = el.city.value.trim();
    save();
    render();
  }
});

document.getElementById("add-friend").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = new FormData(e.target).get("name").trim();
  if (!name) return;
  state.friends.push({
    id: crypto.randomUUID(),
    name,
    scrolling: true
  });
  e.target.reset();
  save();
  render();
});

document.getElementById("nudge-all").addEventListener("click", () => {
  state.friends = state.friends.map((f) => ({ ...f, scrolling: false }));
  save();
  render();
  flashStatus("Crew disrupted. Everybody outside — pick a plan.");
});

document.getElementById("generate").addEventListener("click", () => {
  if (!state.locationLabel) {
    el.dialog.showModal();
    return;
  }
  state.plans = inventPlans(state.locationLabel);
  state.votes = {};
  state.chosenId = null;
  save();
  render();
});

function inventPlans(place) {
  const shuffled = [...templates].sort(() => Math.random() - 0.5).slice(0, 3);
  return shuffled.map((t, i) => {
    const affiliate = partners[i % partners.length];
    return {
      id: crypto.randomUUID(),
      title: t.title,
      energy: t.energy,
      minutes: t.minutes,
      blurb: t.blurb.replaceAll("{place}", place),
      affiliate
    };
  });
}

function vote(planId) {
  const voter = "you";
  state.votes[voter] = planId;
  const counts = tally();
  const [leader] = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (leader && leader[1] >= 1) state.chosenId = leader[0];
  save();
  render();
}

function tally() {
  const counts = {};
  Object.values(state.votes).forEach((id) => {
    counts[id] = (counts[id] || 0) + 1;
  });
  return counts;
}

function nudge(id) {
  state.friends = state.friends.map((f) =>
    f.id === id ? { ...f, scrolling: false } : f
  );
  const friend = state.friends.find((f) => f.id === id);
  save();
  render();
  flashStatus(`${friend.name} just got yanked off their phone.`);
}

function flashStatus(text) {
  el.status.textContent = text;
}

function render() {
  const scrolling = state.friends.filter((f) => f.scrolling).length;
  el.status.textContent = scrolling
    ? `${scrolling} friend${scrolling === 1 ? " is" : "s are"} doomscrolling. Disrupt them.`
    : "Crew is clear. Time to go do something.";
  el.location.textContent = state.locationLabel
    ? `Planning around ${state.locationLabel}`
    : "Location unknown — set a spot so the AI can plan.";

  el.crew.innerHTML = state.friends
    .map(
      (f) => `
      <li>
        <strong>${escapeHtml(f.name)}</strong>
        <span class="badge ${f.scrolling ? "scroll" : "out"}">${f.scrolling ? "scrolling" : "outside-ready"}</span>
        <button class="nudge" data-nudge="${f.id}" ${f.scrolling ? "" : "disabled"}>Nudge</button>
      </li>`
    )
    .join("");

  el.crew.querySelectorAll("[data-nudge]").forEach((btn) => {
    btn.addEventListener("click", () => nudge(btn.dataset.nudge));
  });

  const counts = tally();
  if (!state.plans.length) {
    el.plans.innerHTML = `<p class="hint">No plans yet. Generate a few and vote.</p>`;
  } else {
    el.plans.innerHTML = state.plans
      .map((p) => {
        const votes = counts[p.id] || 0;
        const leading = p.id === state.chosenId;
        return `
        <article class="plan ${leading ? "is-leading" : ""}">
          <h3>${escapeHtml(p.title)}</h3>
          <p class="meta">${escapeHtml(p.energy)} · ${p.minutes} min · ${votes} vote${votes === 1 ? "" : "s"}</p>
          <p>${escapeHtml(p.blurb)}</p>
          <button class="vote" data-vote="${p.id}">Vote this one</button>
          <div class="affiliates">
            Book via <strong>${escapeHtml(p.affiliate.name)}</strong>
            · code <code>${escapeHtml(p.affiliate.code)}</code>
            · ${escapeHtml(p.affiliate.perk)}
          </div>
        </article>`;
      })
      .join("");
    el.plans.querySelectorAll("[data-vote]").forEach((btn) => {
      btn.addEventListener("click", () => vote(btn.dataset.vote));
    });
  }

  const chosen = state.plans.find((p) => p.id === state.chosenId);
  if (!chosen) {
    el.tonight.classList.add("empty");
    el.tonight.innerHTML = `<p>No plan locked yet. Generate options, then vote.</p>`;
  } else {
    el.tonight.classList.remove("empty");
    el.tonight.innerHTML = `
      <h3>${escapeHtml(chosen.title)}</h3>
      <p>${escapeHtml(chosen.blurb)}</p>
      <p class="meta">Meet around ${escapeHtml(state.locationLabel)} · ${chosen.minutes} min</p>
      <div class="affiliates">
        Crew pick is locked. Use <code>${escapeHtml(chosen.affiliate.code)}</code>
        at ${escapeHtml(chosen.affiliate.name)} for ${escapeHtml(chosen.affiliate.perk)}.
      </div>
    `;
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "");
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

render();
