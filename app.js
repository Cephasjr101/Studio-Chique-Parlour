/* MVP template — consent, analytics, mobile nav, reveal, form validation + spam protection */
(function () {
  "use strict";

  /* ---------- Force HTTPS (client-side belt & braces; server redirect is primary) ---------- */
  if (location.protocol === "http:" && !/^(localhost|127\.)/.test(location.hostname)) {
    location.replace("https://" + location.host + location.pathname + location.search + location.hash);
  }

  /* ---------- Consent ---------- */
  var CONSENT_KEY = "mvp-consent";
  function getConsent() {
    try { var v = localStorage.getItem(CONSENT_KEY); return v === "accepted" || v === "rejected" ? v : null; }
    catch (e) { return null; }
  }
  function setConsent(v) {
    try { localStorage.setItem(CONSENT_KEY, v); } catch (e) {}
    if (v === "accepted") trackPage();
  }

  /* ---------- First-party cookieless analytics (consent-gated) ---------- */
  function trackPage() {
    try {
      var payload = JSON.stringify({
        site: document.body.getAttribute("data-site"),
        path: location.pathname,
        referrer: document.referrer || null,
        ts: Date.now()
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/track", { method: "POST", body: payload, headers: { "Content-Type": "application/json" }, keepalive: true });
      }
    } catch (e) {}
  }

  var banner = document.getElementById("cookie-banner");
  if (banner && getConsent() === null) banner.classList.add("show");
  document.querySelectorAll("[data-consent]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setConsent(btn.getAttribute("data-consent"));
      banner.classList.remove("show");
    });
  });
  if (getConsent() === "accepted") trackPage();

  /* ---------- Mobile nav ---------- */
  var menuBtn = document.getElementById("menu-btn");
  var nav = document.getElementById("nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------- Scroll reveal ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

  /* ---------- Contact form: validation + spam protection ---------- */
  var form = document.getElementById("contact-form");
  if (!form) return;
  var openedAt = Date.now();
  var GH_PHONE = /^(\+233|0)\d{9}$/;

  function showErr(id, msg) {
    var el = document.getElementById(id);
    if (el) { el.textContent = msg; el.classList.add("show"); }
  }
  function clearErrs() {
    document.querySelectorAll(".err").forEach(function (e) { e.classList.remove("show"); });
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    clearErrs();

    var name = form.name.value.trim();
    var phone = form.phone.value.trim();
    var message = form.message.value.trim();
    var ok = true;

    if (name.length < 2) { showErr("err-name", "Please enter your name."); ok = false; }
    if (!GH_PHONE.test(phone)) { showErr("err-phone", "Enter a valid Ghanaian number, e.g. 0241234567."); ok = false; }
    if (message.length < 5) { showErr("err-message", "Please tell us what you need."); ok = false; }

    /* spam traps: honeypot + minimum fill time */
    if (form.website && form.website.value !== "") ok = false;
    if (Date.now() - openedAt < 3000) { showErr("err-form", "That was too quick — please try again."); ok = false; }

    if (!ok) return;

    /* MVP: no backend per site — hand off to the business via tel/WhatsApp deep link,
       and show a confirmation. Swap this for a POST to a shared intake API in production. */
    var success = document.getElementById("person");
    var ref = "REQ-" + Date.now().toString(36).toUpperCase();
    var refEl = document.getElementById("ref-number");
    if (refEl) refEl.textContent = ref;
    form.style.display = "none";
    var done = document.getElementById("form-success");
    if (done) done.classList.add("show");
  });
})();
