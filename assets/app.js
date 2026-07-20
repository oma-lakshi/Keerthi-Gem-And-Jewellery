/* ============================================================
   KEERTHI GEM & JEWELLERY — app logic
   Backed by Supabase (see /supabase/schema.sql for the database
   setup, and assets/config.js for the two values you need to fill
   in). All reads/writes below go through Supabase; the security
   comes from Row Level Security policies in the database itself
   (see is_admin() and the policies in schema.sql), not from
   anything hidden in this file — none of this file is secret and
   none of it needs to be.
   ============================================================ */

/* ---------------- CONFIGURATION — edit these ---------------- */
const CONFIG = {
  shopName: "Keerthi Gem & Jewellery",
  tagline: "Fine gems & handcrafted jewellery",
  address: "217/1, Main Street, Moratuwa.",       // TODO: replace
  shopPhone: "+94 112646575",                         // TODO: replace with real shop number
  shopWhatsApp: "94 773156496",                          // TODO: replace, digits only, no + or spaces
  shopEmail: "keerthigemjewellery000@gmail.com",                      // TODO: replace

  social: {
    facebook: "https://web.facebook.com/p/Keerthi-gem-and-jewellery-100064092038356/?_rdc=1&_rdr#",
    instagram: "https://www.instagram.com/keerthi_gem.jwlry?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    google: "https://share.google/73iCWbLMpqwFta5OY"
  },
  mapsUrl: "https://maps.app.goo.gl/6jgUNqXvmKRtW9gc6",

  // Extra client-side friction on top of Supabase's own login protection —
  // the real access control lives in the database (is_admin() in
  // schema.sql), this just avoids hammering the login form with requests.
  maxLoginAttempts: 5,
  lockoutSeconds: 60,

  developer: {
    name: "Omesh Lakshitha",
    phone: "+94 77 475 0576",
    whatsapp: "94774750576",
    insta: "https://www.instagram.com/oma_lakshi/"
  }
};

/* ---------------- SUPABASE CLIENT ---------------- */
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------------- LIVE DATA (loaded from Supabase) ---------------- */
const STATE = {
  banners: [],
  weeklyHours: {
    mon: { open: true, time: "" }, tue: { open: true, time: "" }, wed: { open: true, time: "" },
    thu: { open: true, time: "" }, fri: { open: true, time: "" }, sat: { open: true, time: "" },
    sun: { open: false, time: "" }
  },
  closedDates: [],
  products: [],
  appointments: [],
  about: { heading: "Our Story", body: "", establishedYear: null },
  aboutPhotos: []
};

let session = {
  loggedIn: false,
  attempts: Number(localStorage.getItem("kg_login_attempts") || 0),
  lockedUntil: Number(localStorage.getItem("kg_login_locked_until") || 0)
};
function saveSession(){
  localStorage.setItem("kg_login_attempts", String(session.attempts));
  localStorage.setItem("kg_login_locked_until", String(session.lockedUntil));
}
const DAY_KEYS = ["sun","mon","tue","wed","thu","fri","sat"];
const DAY_LABELS = { mon:"Mon", tue:"Tue", wed:"Wed", thu:"Thu", fri:"Fri", sat:"Sat", sun:"Sun" };

/* ================= SUPABASE DATA LOADERS ================= */
async function loadBanners(){
  const { data, error } = await sb.from("banners").select("*").order("sort_order", { ascending: true });
  if (error){ console.error("Couldn't load banners:", error.message); return; }
  STATE.banners = data.map(b => ({ id: b.id, img: b.image_url, caption: b.caption, sort_order: b.sort_order }));
}
async function loadWeeklyHours(){
  const { data, error } = await sb.from("weekly_hours").select("*");
  if (error){ console.error("Couldn't load hours:", error.message); return; }
  data.forEach(row => { STATE.weeklyHours[row.day_key] = { open: row.is_open, time: row.time_range }; });
}
async function loadClosedDates(){
  const { data, error } = await sb.from("closed_dates").select("*").order("closed_date", { ascending: true });
  if (error){ console.error("Couldn't load closed dates:", error.message); return; }
  STATE.closedDates = data.map(d => ({ id: d.id, date: d.closed_date, reason: d.reason }));
}
async function loadProducts(){
  const { data, error } = await sb.from("products").select("*").order("created_at", { ascending: true });
  if (error){ console.error("Couldn't load products:", error.message); return; }
  STATE.products = data.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price, img: p.image_url, desc: p.description }));
}
async function loadAboutContent(){
  const { data, error } = await sb.from("about_content").select("*").eq("id", 1).maybeSingle();
  if (error){ console.error("Couldn't load about content:", error.message); return; }
  if (data) STATE.about = { heading: data.heading, body: data.body, establishedYear: data.established_year };
}
async function loadAboutPhotos(){
  const { data, error } = await sb.from("about_photos").select("*").order("sort_order", { ascending: true });
  if (error){ console.error("Couldn't load about photos:", error.message); return; }
  STATE.aboutPhotos = data.map(p => ({ id: p.id, img: p.image_url, caption: p.caption, sort_order: p.sort_order }));
}
async function loadAppointments(){
  const { data, error } = await sb.from("appointments").select("*").order("created_at", { ascending: false });
  if (error){ console.error("Couldn't load appointments (are you logged in as admin?):", error.message); return; }
  STATE.appointments = data;
}
async function loadPublicData(){
  await Promise.all([loadBanners(), loadWeeklyHours(), loadClosedDates(), loadProducts(), loadAboutContent(), loadAboutPhotos()]);
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", async () => {
  const minPreload = new Promise(res => setTimeout(res, 900));
  await Promise.all([loadPublicData(), minPreload]);
  document.getElementById("preloader").classList.add("hidden");

  renderHero();
  renderHours();
  renderAbout();
  renderProducts("All");
  initReveal();
  initNavScroll();
  initFilters();
  initFab();
  initSocial();
  initMaps();
  initAppointmentForm();
  initLogin();
  initAdmin();

  document.getElementById("apptDate").min = new Date().toISOString().split("T")[0];
});

/* ================= SCROLL REVEAL ================= */
function initReveal(){
  const els = document.querySelectorAll(".reveal");
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("in-view"); });
  }, { threshold: 0.15 });
  els.forEach(el => io.observe(el));
}

function initNavScroll(){
  const nav = document.getElementById("siteNav");
  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 60);
  });
  document.getElementById("navToggle").addEventListener("click", () => {
    document.getElementById("navLinks").classList.toggle("open");
  });
}

/* ================= HERO CAROUSEL ================= */
let heroIndex = 0, heroTimer = null;
function renderHero(){
  const wrap = document.getElementById("heroSlides");
  const dots = document.getElementById("heroDots");
  wrap.innerHTML = ""; dots.innerHTML = "";
  STATE.banners.forEach((b, i) => {
    const div = document.createElement("div");
    div.className = "hero-slide" + (i === 0 ? " active" : "");
    div.style.backgroundImage = `url('${b.img}')`;
    wrap.appendChild(div);
    const dot = document.createElement("button");
    dot.className = "hero-dot" + (i === 0 ? " active" : "");
    dot.setAttribute("aria-label", "Show banner " + (i+1));
    dot.addEventListener("click", () => showHero(i));
    dots.appendChild(dot);
  });
  heroIndex = 0;
  clearInterval(heroTimer);
  if (STATE.banners.length > 1){
    heroTimer = setInterval(() => showHero((heroIndex + 1) % STATE.banners.length), 5500);
  }
}
function showHero(i){
  heroIndex = i;
  document.querySelectorAll(".hero-slide").forEach((el, idx) => el.classList.toggle("active", idx === i));
  document.querySelectorAll(".hero-dot").forEach((el, idx) => el.classList.toggle("active", idx === i));
}

/* ================= OPEN DAYS ================= */
function renderHours(){
  const grid = document.getElementById("hoursGrid");
  grid.innerHTML = "";
  const todayKey = DAY_KEYS[new Date().getDay()];
  Object.keys(STATE.weeklyHours).forEach(key => {
    const d = STATE.weeklyHours[key];
    const card = document.createElement("div");
    card.className = "hour-card" + (key === todayKey ? " today" : "");
    card.innerHTML = `
      <div class="day">${DAY_LABELS[key]}</div>
      <div class="status ${d.open ? "open" : "closed"}">${d.open ? "Open" : "Closed"}</div>
      <div class="time">${d.open ? d.time : "—"}</div>`;
    grid.appendChild(card);
  });

  const chipRow = document.getElementById("specialClosedChips");
  const specialWrap = document.getElementById("specialClosedBlock");
  chipRow.innerHTML = "";
  if (STATE.closedDates.length === 0){
    specialWrap.style.display = "none";
  } else {
    specialWrap.style.display = "block";
    STATE.closedDates
      .slice().sort((a,b) => a.date.localeCompare(b.date))
      .forEach(cd => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = `${formatDate(cd.date)} — ${cd.reason || "Closed"}`;
        chipRow.appendChild(chip);
      });
  }
}
function formatDate(iso){
  const dt = new Date(iso + "T00:00:00");
  return dt.toLocaleDateString(undefined, { day:"numeric", month:"short", year:"numeric" });
}

/* ================= ABOUT ================= */
function renderAbout(){
  const yearBadge = STATE.about.establishedYear ? `Est. ${STATE.about.establishedYear} · Sri Lanka` : "Est. Sri Lanka";
  document.getElementById("heroEstLabel").textContent = yearBadge;
  document.getElementById("aboutEstLabel").textContent = STATE.about.establishedYear ? `Since ${STATE.about.establishedYear}` : "Our Story";
  document.getElementById("aboutHeading").textContent = STATE.about.heading || "Our Story";
  document.getElementById("aboutBody").textContent = STATE.about.body || "";

  const gallery = document.getElementById("aboutGallery");
  gallery.innerHTML = "";
  STATE.aboutPhotos.forEach((p, i) => {
    const item = document.createElement("div");
    item.className = "about-gallery-item reveal";
    item.style.setProperty("--stagger", i % 4);
    item.innerHTML = `<img src="${p.img}" alt="${p.caption || "About us"}" loading="lazy">${p.caption ? `<div class="caption">${p.caption}</div>` : ""}`;
    gallery.appendChild(item);
  });
  initReveal();
}

/* ================= MAPS / DIRECTIONS ================= */
function initMaps(){
  document.getElementById("aboutDirectionsBtn").href = CONFIG.mapsUrl;
  document.getElementById("footerDirectionsLink").href = CONFIG.mapsUrl;
}

/* ================= PRODUCTS / COLLECTION ================= */
function initFilters(){
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      renderProducts(chip.dataset.cat);
    });
  });
}
function renderProducts(filter){
  const grid = document.getElementById("productsGrid");
  grid.innerHTML = "";
  const list = filter === "All" ? STATE.products : STATE.products.filter(p => p.category === filter);
  if (list.length === 0){
    grid.innerHTML = `<div class="products-empty">No pieces in this category yet — check back soon.</div>`;
    return;
  }
  list.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "product-card reveal";
    card.style.setProperty("--stagger", i % 4);
    card.innerHTML = `
      <div class="product-media"><img src="${p.img}" alt="${p.name}" loading="lazy"></div>
      <div class="product-body">
        <div class="cat">${p.category}</div>
        <h3>${p.name}</h3>
        <p class="desc">${p.desc || ""}</p>
        <div class="product-price">${p.price}</div>
      </div>`;
    grid.appendChild(card);
  });
  initReveal();
}

/* ================= APPOINTMENT FORM ================= */
function isShopClosed(dateStr){
  if (!dateStr) return false;
  const dayKey = DAY_KEYS[new Date(dateStr + "T00:00:00").getDay()];
  if (!STATE.weeklyHours[dayKey].open) return { reason: `We're closed every ${DAY_LABELS[dayKey]}day.` };
  const special = STATE.closedDates.find(cd => cd.date === dateStr);
  if (special) return { reason: `We're closed on ${formatDate(dateStr)} (${special.reason || "holiday"}).` };
  return false;
}

function initAppointmentForm(){
  const form = document.getElementById("apptForm");
  const dateInput = document.getElementById("apptDate");
  const dateRow = dateInput.closest(".form-row");

  /* ---- Bot protection ----
     1) Honeypot field (apptWebsite) that's invisible to real people —
        anything filled in there means it wasn't a human.
     2) Time-trap — a script that fills and submits the form instantly
        is treated as a bot; real visitors take a few seconds.
     3) A tiny rotating math question so scripted/automated submissions
        (which don't render or solve it) get blocked.
     4) A short cooldown so the same browser can't fire off repeated
        requests back-to-back.
     Note: the database itself also only allows *inserting* appointment
     rows from the public — nobody can read, edit, or delete them without
     being signed in as the admin (see schema.sql), so even if all of the
     above were bypassed, no data could be tampered with or leaked. */
  let apptRenderedAt = Date.now();
  let apptCaptchaAnswer = 0;
  function newApptCaptcha(){
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    apptCaptchaAnswer = a + b;
    document.getElementById("apptCaptchaQ").textContent = `what is ${a} + ${b}?`;
    document.getElementById("apptCaptcha").value = "";
  }
  newApptCaptcha();

  dateInput.addEventListener("change", () => {
    const closed = isShopClosed(dateInput.value);
    dateRow.classList.toggle("error", !!closed);
    if (closed) document.getElementById("apptDateError").textContent = closed.reason + " Please pick another date.";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Honeypot: real visitors never see or fill this field, so if it has
    // a value the submission almost certainly came from a bot — drop it
    // quietly, no error shown (showing one just teaches the bot to adapt).
    if (document.getElementById("apptWebsite").value.trim() !== "") return;

    // Time-trap: a human needs at least a couple of seconds to read and
    // fill this form in.
    if (Date.now() - apptRenderedAt < 2000) return;

    // Cooldown: stop the same browser firing off repeated requests.
    const lastSubmit = Number(localStorage.getItem("kg_last_appt_submit") || 0);
    const captchaRow = document.getElementById("apptCaptcha").closest(".form-row");
    if (Date.now() - lastSubmit < 30000){
      captchaRow.classList.add("error");
      document.getElementById("apptCaptchaError").textContent = "Please wait a few seconds before sending another request.";
      return;
    }

    // Quick math check to filter out scripted submissions.
    const captchaVal = parseInt(document.getElementById("apptCaptcha").value, 10);
    if (captchaVal !== apptCaptchaAnswer){
      captchaRow.classList.add("error");
      document.getElementById("apptCaptchaError").textContent = "That's not quite right — please try again.";
      newApptCaptcha();
      return;
    }
    captchaRow.classList.remove("error");

    const closed = isShopClosed(dateInput.value);
    dateRow.classList.toggle("error", !!closed);
    if (closed){
      document.getElementById("apptDateError").textContent = closed.reason + " Please pick another date.";
      dateInput.focus();
      return;
    }

    const btn = document.getElementById("apptSubmitBtn");
    btn.classList.add("is-loading");
    btn.disabled = true;

    const data = {
      name: document.getElementById("apptName").value,
      phone: document.getElementById("apptPhone").value,
      purpose: document.getElementById("apptPurpose").value,
      date: dateInput.value,
      notes: document.getElementById("apptNotes").value
    };

    // Save to Supabase so the request isn't lost even if nobody catches
    // the WhatsApp ping right away — it'll be sitting in the admin
    // dashboard's Appointments tab.
    const { error: saveError } = await sb.from("appointments").insert({
      full_name: data.name,
      phone: data.phone,
      purpose: data.purpose,
      preferred_date: data.date,
      notes: data.notes || null
    });
    if (saveError) console.error("Couldn't save appointment to the database:", saveError.message);

    localStorage.setItem("kg_last_appt_submit", String(Date.now()));

    // Also hand the request straight to the shop's WhatsApp as a
    // pre-filled message for an instant heads-up.
    const msg = `New appointment request%0A` +
      `Name: ${encodeURIComponent(data.name)}%0A` +
      `Phone: ${encodeURIComponent(data.phone)}%0A` +
      `Purpose: ${encodeURIComponent(data.purpose)}%0A` +
      `Preferred date: ${encodeURIComponent(formatDate(data.date))}%0A` +
      `Notes: ${encodeURIComponent(data.notes || "-")}`;
    window.open(`https://wa.me/${CONFIG.shopWhatsApp}?text=${msg}`, "_blank");

    btn.classList.remove("is-loading");
    btn.classList.add("is-success");
    document.getElementById("apptForm").style.display = "none";
    document.getElementById("apptSuccess").classList.add("show");

    window.setTimeout(() => {
      btn.classList.remove("is-success");
      btn.disabled = false;
      form.reset();
      form.style.display = "block";
      document.getElementById("apptSuccess").classList.remove("show");
      dateRow.classList.remove("error");
      apptRenderedAt = Date.now();
      newApptCaptcha();
    }, 6000);
  });
}

/* ================= FLOATING ACTION BUTTONS ================= */
function initFab(){
  const cluster = document.getElementById("fabCluster");
  document.getElementById("fabMain").addEventListener("click", () => cluster.classList.toggle("open"));
  document.getElementById("fabCall").href = `tel:${CONFIG.shopPhone.replace(/\s+/g,"")}`;
  document.getElementById("fabWhatsapp").href = `https://wa.me/${CONFIG.shopWhatsApp}?text=${encodeURIComponent("Hello Keerthi Gem & Jewellery, I'd like to ask about ")}`;
  document.getElementById("fabAppt").addEventListener("click", () => {
    cluster.classList.remove("open");
    document.getElementById("appointment").scrollIntoView({ behavior:"smooth" });
  });
}

/* ================= SOCIAL LINKS ================= */
function initSocial(){
  document.getElementById("socialFacebook").href = CONFIG.social.facebook;
  document.getElementById("socialInstagram").href = CONFIG.social.instagram;
  document.getElementById("socialGoogle").href = CONFIG.social.google;
}

/* ================= SECURE HOST LOGIN (Supabase Auth) ================= */
function initLogin(){
  const backdrop = document.getElementById("loginBackdrop");
  const openBtns = document.querySelectorAll("[data-open-login]");
  const closeBtn = document.getElementById("loginClose");
  const form = document.getElementById("loginForm");
  const modal = document.getElementById("loginModal");
  const errorEl = document.getElementById("loginError");
  const lockEl = document.getElementById("loginLock");
  let lockTimer = null;

  /* ---- Bot protection: honeypot, time-trap, and a rotating math
     question, same idea as the appointment form — see comments there.
     This is on top of, not instead of, Supabase Auth actually checking
     the password server-side. */
  let loginRenderedAt = Date.now();
  let loginCaptchaAnswer = 0;
  function newLoginCaptcha(){
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    loginCaptchaAnswer = a + b;
    document.getElementById("loginCaptchaQ").textContent = `what is ${a} + ${b}?`;
    document.getElementById("loginCaptcha").value = "";
  }
  newLoginCaptcha();

  openBtns.forEach(b => b.addEventListener("click", async (e) => {
    e.preventDefault();
    // Already have a valid Supabase session (e.g. from an earlier visit)?
    // Skip straight to the dashboard instead of asking to log in again.
    const { data } = await sb.auth.getSession();
    if (data.session){ openAdmin(); return; }
    backdrop.classList.add("show");
    loginRenderedAt = Date.now();
    newLoginCaptcha();
  }));
  closeBtn.addEventListener("click", () => backdrop.classList.remove("show"));
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.classList.remove("show"); });

  function updateLockUI(){
    const remaining = Math.ceil((session.lockedUntil - Date.now()) / 1000);
    if (remaining > 0){
      lockEl.classList.add("show");
      lockEl.textContent = `Too many attempts. Try again in ${remaining}s.`;
      form.querySelector("button[type=submit]").disabled = true;
    } else {
      clearInterval(lockTimer);
      lockEl.classList.remove("show");
      form.querySelector("button[type=submit]").disabled = false;
    }
  }
  if (session.lockedUntil > Date.now()){
    updateLockUI();
    lockTimer = setInterval(updateLockUI, 1000);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.style.display = "none";
    if (session.lockedUntil > Date.now()){ updateLockUI(); return; }

    // Honeypot — silently drop, no feedback given to a script.
    if (document.getElementById("loginWebsite").value.trim() !== "") return;

    // Time-trap — a login attempt fired within a fraction of a second of
    // the modal opening is a script, not someone typing a password.
    if (Date.now() - loginRenderedAt < 1200) return;

    // Quick math check to filter out scripted brute-force attempts.
    const captchaVal = parseInt(document.getElementById("loginCaptcha").value, 10);
    if (captchaVal !== loginCaptchaAnswer){
      errorEl.style.display = "block";
      errorEl.textContent = "Incorrect answer to the check above.";
      newLoginCaptcha();
      return;
    }

    const email = document.getElementById("loginUser").value.trim();
    const pass = document.getElementById("loginPass").value;
    const btn = document.getElementById("loginSubmitBtn");
    btn.classList.add("is-loading");

    // The actual credential check happens on Supabase's server, not in
    // this browser — the password never gets compared against anything
    // stored in this file.
    const { error } = await sb.auth.signInWithPassword({ email, password: pass });

    btn.classList.remove("is-loading");
    if (!error){
      session.loggedIn = true;
      session.attempts = 0;
      saveSession();
      backdrop.classList.remove("show");
      form.reset();
      newLoginCaptcha();
      openAdmin();
    } else {
      session.attempts++;
      modal.classList.add("shake");
      setTimeout(() => modal.classList.remove("shake"), 400);
      errorEl.style.display = "block";
      errorEl.textContent = "Incorrect email or password.";
      newLoginCaptcha();
      if (session.attempts >= CONFIG.maxLoginAttempts){
        session.lockedUntil = Date.now() + CONFIG.lockoutSeconds * 1000;
        session.attempts = 0;
        updateLockUI();
        lockTimer = setInterval(updateLockUI, 1000);
      }
      saveSession();
    }
  });
}

/* ================= ADMIN DASHBOARD ================= */
async function openAdmin(){
  document.getElementById("adminPanel").classList.add("show");
  document.body.style.overflow = "hidden";
  renderAdminBanners();
  renderAdminHours();
  renderAdminAbout();
  renderAdminProducts();
  await loadAppointments();
  renderAdminAppointments();
}
async function closeAdmin(loggingOut){
  document.getElementById("adminPanel").classList.remove("show");
  document.body.style.overflow = "";
  if (loggingOut){
    session.loggedIn = false;
    await sb.auth.signOut();
  }
}

function initAdmin(){
  document.getElementById("adminLogout").addEventListener("click", () => closeAdmin(true));
  document.getElementById("adminPreview").addEventListener("click", () => closeAdmin(false));

  document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.addEventListener("click", async () => {
      document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".admin-pane").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("pane-" + tab.dataset.tab).classList.add("active");
      if (tab.dataset.tab === "appointments"){
        await loadAppointments();
        renderAdminAppointments();
      }
    });
  });

  /* ---- Banners ---- */
  document.getElementById("bannerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const img = document.getElementById("bannerImg").value.trim();
    const caption = document.getElementById("bannerCaption").value.trim();
    if (!img) return;
    const { error } = await sb.from("banners").insert({ image_url: img, caption: caption || null, sort_order: STATE.banners.length });
    if (error){ alert("Couldn't save banner: " + error.message); return; }
    e.target.reset();
    await loadBanners();
    renderAdminBanners();
    renderHero();
  });

  /* ---- Weekly hours ---- */
  document.getElementById("saveHoursBtn").addEventListener("click", async () => {
    const rows = Object.keys(STATE.weeklyHours).map(key => {
      const toggle = document.getElementById("open-" + key);
      const time = document.getElementById("time-" + key);
      return { day_key: key, is_open: toggle.checked, time_range: time.value.trim() || STATE.weeklyHours[key].time };
    });
    const { error } = await sb.from("weekly_hours").upsert(rows, { onConflict: "day_key" });
    if (error){ alert("Couldn't save hours: " + error.message); return; }
    await loadWeeklyHours();
    renderHours();
    flashSaved("saveHoursBtn");
  });

  document.getElementById("closedDateForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const date = document.getElementById("closedDateInput").value;
    const reason = document.getElementById("closedReasonInput").value.trim();
    if (!date) return;
    const { error } = await sb.from("closed_dates").insert({ closed_date: date, reason: reason || null });
    if (error){ alert("Couldn't save closed date: " + error.message); return; }
    e.target.reset();
    await loadClosedDates();
    renderAdminHours();
    renderHours();
  });

  /* ---- About ---- */
  document.getElementById("aboutForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      id: 1,
      heading: document.getElementById("aboutHeadingInput").value.trim() || "Our Story",
      body: document.getElementById("aboutBodyInput").value.trim(),
      established_year: document.getElementById("aboutYearInput").value ? Number(document.getElementById("aboutYearInput").value) : null
    };
    const { error } = await sb.from("about_content").upsert(payload, { onConflict: "id" });
    if (error){ alert("Couldn't save about section: " + error.message); return; }
    await loadAboutContent();
    renderAbout();
    flashSaved("aboutSaveBtn");
  });

  document.getElementById("aboutPhotoForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const img = document.getElementById("aboutPhotoImg").value.trim();
    const caption = document.getElementById("aboutPhotoCaption").value.trim();
    if (!img) return;
    const { error } = await sb.from("about_photos").insert({ image_url: img, caption: caption || null, sort_order: STATE.aboutPhotos.length });
    if (error){ alert("Couldn't save photo: " + error.message); return; }
    e.target.reset();
    await loadAboutPhotos();
    renderAdminAbout();
    renderAbout();
  });

  /* ---- Products ---- */
  document.getElementById("productForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const editingId = document.getElementById("productForm").dataset.editing;
    const payload = {
      name: document.getElementById("prodName").value.trim(),
      category: document.getElementById("prodCategory").value.trim() || "Uncategorised",
      price: document.getElementById("prodPrice").value.trim(),
      image_url: document.getElementById("prodImg").value.trim(),
      description: document.getElementById("prodDesc").value.trim() || null
    };
    if (!payload.name || !payload.image_url) return;

    let error;
    if (editingId){
      ({ error } = await sb.from("products").update(payload).eq("id", editingId));
    } else {
      ({ error } = await sb.from("products").insert(payload));
    }
    if (error){ alert("Couldn't save product: " + error.message); return; }

    delete document.getElementById("productForm").dataset.editing;
    document.getElementById("productFormTitle").textContent = "Add a piece";
    document.getElementById("productSubmitBtn").textContent = "Add to collection";
    e.target.reset();
    await loadProducts();
    renderAdminProducts();
    renderProducts("All");
    resetFilterChips();
  });
}

function flashSaved(btnId){
  const btn = document.getElementById(btnId);
  const original = btn.textContent;
  btn.textContent = "Saved ✓";
  setTimeout(() => btn.textContent = original, 1400);
}
function resetFilterChips(){
  document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
  document.querySelector('.filter-chip[data-cat="All"]').classList.add("active");
}

function renderAdminBanners(){
  const list = document.getElementById("bannerList");
  list.innerHTML = "";
  STATE.banners.forEach((b, i) => {
    const row = document.createElement("div");
    row.className = "admin-list-item";
    row.innerHTML = `
      <img src="${b.img}" alt="">
      <div class="meta"><strong>Banner ${i+1}</strong><span>${b.caption || "No caption"}</span></div>
      <button class="icon-btn" title="Remove">${trashIcon()}</button>`;
    row.querySelector("button").addEventListener("click", async () => {
      const { error } = await sb.from("banners").delete().eq("id", b.id);
      if (error){ alert("Couldn't delete banner: " + error.message); return; }
      await loadBanners();
      renderAdminBanners();
      renderHero();
    });
    list.appendChild(row);
  });
}

function renderAdminHours(){
  const wrap = document.getElementById("hoursEditor");
  wrap.innerHTML = "";
  Object.keys(STATE.weeklyHours).forEach(key => {
    const d = STATE.weeklyHours[key];
    const row = document.createElement("div");
    row.className = "hours-editor-row";
    row.innerHTML = `
      <div class="day-name">${DAY_LABELS[key]}</div>
      <label class="toggle"><input type="checkbox" id="open-${key}" ${d.open ? "checked" : ""}><span></span></label>
      <input type="text" id="time-${key}" value="${d.open ? d.time : ""}" placeholder="e.g. 9.00 AM – 6.00 PM" style="flex:1; background:var(--obsidian); border:1px solid var(--line); color:var(--ivory); padding:9px 12px;">`;
    wrap.appendChild(row);
  });

  const list = document.getElementById("closedDatesList");
  list.innerHTML = "";
  STATE.closedDates.forEach((cd) => {
    const row = document.createElement("div");
    row.className = "admin-list-item";
    row.innerHTML = `
      <div class="meta"><strong>${formatDate(cd.date)}</strong><span>${cd.reason || "Closed"}</span></div>
      <button class="icon-btn" title="Remove">${trashIcon()}</button>`;
    row.querySelector("button").addEventListener("click", async () => {
      const { error } = await sb.from("closed_dates").delete().eq("id", cd.id);
      if (error){ alert("Couldn't delete closed date: " + error.message); return; }
      await loadClosedDates();
      renderAdminHours();
      renderHours();
    });
    list.appendChild(row);
  });
}

function renderAdminAbout(){
  document.getElementById("aboutHeadingInput").value = STATE.about.heading || "";
  document.getElementById("aboutYearInput").value = STATE.about.establishedYear || "";
  document.getElementById("aboutBodyInput").value = STATE.about.body || "";

  const list = document.getElementById("aboutPhotoList");
  list.innerHTML = "";
  STATE.aboutPhotos.forEach((p) => {
    const row = document.createElement("div");
    row.className = "admin-list-item";
    row.innerHTML = `
      <img src="${p.img}" alt="">
      <div class="meta"><strong>${p.caption || "No caption"}</strong></div>
      <button class="icon-btn" title="Remove">${trashIcon()}</button>`;
    row.querySelector("button").addEventListener("click", async () => {
      const { error } = await sb.from("about_photos").delete().eq("id", p.id);
      if (error){ alert("Couldn't delete photo: " + error.message); return; }
      await loadAboutPhotos();
      renderAdminAbout();
      renderAbout();
    });
    list.appendChild(row);
  });
}

function renderAdminProducts(){
  const list = document.getElementById("productList");
  list.innerHTML = "";
  STATE.products.forEach((p) => {
    const row = document.createElement("div");
    row.className = "admin-list-item";
    row.innerHTML = `
      <img src="${p.img}" alt="">
      <div class="meta"><strong>${p.name}</strong><span>${p.category} · ${p.price}</span></div>
      <button class="icon-btn edit" title="Edit">${editIcon()}</button>
      <button class="icon-btn" title="Delete">${trashIcon()}</button>`;
    const [editBtn, delBtn] = row.querySelectorAll("button");
    editBtn.addEventListener("click", () => {
      document.getElementById("prodName").value = p.name;
      document.getElementById("prodCategory").value = p.category;
      document.getElementById("prodPrice").value = p.price;
      document.getElementById("prodImg").value = p.img;
      document.getElementById("prodDesc").value = p.desc || "";
      document.getElementById("productForm").dataset.editing = p.id;
      document.getElementById("productFormTitle").textContent = "Edit this piece";
      document.getElementById("productSubmitBtn").textContent = "Save changes";
      document.getElementById("productForm").scrollIntoView({ behavior:"smooth", block:"center" });
    });
    delBtn.addEventListener("click", async () => {
      const { error } = await sb.from("products").delete().eq("id", p.id);
      if (error){ alert("Couldn't delete product: " + error.message); return; }
      await loadProducts();
      renderAdminProducts();
      renderProducts("All");
      resetFilterChips();
    });
    list.appendChild(row);
  });
}

function renderAdminAppointments(){
  const list = document.getElementById("appointmentsList");
  list.innerHTML = "";
  if (STATE.appointments.length === 0){
    list.innerHTML = `<p style="color:var(--ivory-dim); font-size:.85rem;">No appointment requests yet.</p>`;
    return;
  }
  STATE.appointments.forEach((a) => {
    const row = document.createElement("div");
    row.className = "admin-list-item";
    row.innerHTML = `
      <div class="meta">
        <strong>${a.full_name} — ${formatDate(a.preferred_date)}</strong>
        <span>${a.purpose} · ${a.phone}${a.notes ? " · " + a.notes : ""}</span><br>
        <span class="status-pill status-${a.status}">${a.status}</span>
      </div>
      <select class="appt-status-select">
        <option value="new" ${a.status === "new" ? "selected" : ""}>New</option>
        <option value="confirmed" ${a.status === "confirmed" ? "selected" : ""}>Confirmed</option>
        <option value="done" ${a.status === "done" ? "selected" : ""}>Done</option>
        <option value="cancelled" ${a.status === "cancelled" ? "selected" : ""}>Cancelled</option>
      </select>
      <button class="icon-btn" title="Delete">${trashIcon()}</button>`;
    row.querySelector("select").addEventListener("change", async (e) => {
      const { error } = await sb.from("appointments").update({ status: e.target.value }).eq("id", a.id);
      if (error){ alert("Couldn't update status: " + error.message); return; }
      await loadAppointments();
      renderAdminAppointments();
    });
    row.querySelector("button.icon-btn").addEventListener("click", async () => {
      const { error } = await sb.from("appointments").delete().eq("id", a.id);
      if (error){ alert("Couldn't delete appointment: " + error.message); return; }
      await loadAppointments();
      renderAdminAppointments();
    });
    list.appendChild(row);
  });
}

function trashIcon(){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h10l1-13" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
function editIcon(){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
