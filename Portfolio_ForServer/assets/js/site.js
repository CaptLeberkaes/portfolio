/* =========================================================================
   site.js — zentrale Logik für alle Seiten.
   - rendert Navigation & Footer (Single Source of Truth)
   - Sprachumschaltung (DE/EN) inkl. Speicherung
   - Scroll-Effekte, Galerie-Filter, Lightbox
   Reines Vanilla-JS, keine Abhängigkeiten.
   ========================================================================= */
(function () {
  "use strict";

  // Links laufen über den PHP-Router (index.php?p=…), solange der WIP-Schutz
  // aktiv ist. Fällt der Schutz später weg, hier auf "*.html" zurückstellen.
  var LINKS = [
    { href: "index.php",            key: "nav.home",     page: "home",     num: "01" },
    { href: "index.php?p=about",    key: "nav.about",    page: "about",    num: "02" },
    { href: "index.php?p=showcase", key: "nav.showcase", page: "showcase", num: "03" },
    { href: "index.php?p=contact",  key: "nav.contact",  page: "contact",  num: "04" }
  ];

  var current = document.body.getAttribute("data-page") || "home";
  var year = new Date().getFullYear();

  /* ---------- Navigation rendern ---------- */
  function renderNav() {
    var host = document.getElementById("site-nav");
    if (!host) return;
    var linksHtml = LINKS.map(function (l) {
      var active = l.page === current ? ' aria-current="page"' : "";
      return '<a href="' + l.href + '"' + active + '>' +
             '<span class="num">' + l.num + '</span>' +
             '<span data-i18n="' + l.key + '"></span></a>';
    }).join("");

    host.className = "nav";
    host.innerHTML =
      '<div class="nav-inner">' +
        '<a class="brand" href="index.php">BEN<span class="cursor">_</span></a>' +
        '<nav class="nav-links" id="nav-links" aria-label="Hauptnavigation">' + linksHtml + '</nav>' +
        '<div class="nav-right">' +
          '<div class="lang" role="group" aria-label="Sprache">' +
            '<button data-lang="de" aria-pressed="true">DE</button>' +
            '<button data-lang="en" aria-pressed="false">EN</button>' +
          '</div>' +
          '<button class="nav-toggle" id="nav-toggle" aria-label="Menü" aria-expanded="false">☰</button>' +
        '</div>' +
      '</div>';

    // Mobile-Menü
    var toggle = document.getElementById("nav-toggle");
    var menu = document.getElementById("nav-links");
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) { menu.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
    });

    // Sprachbuttons
    host.querySelectorAll(".lang button").forEach(function (b) {
      b.addEventListener("click", function () { setLang(b.dataset.lang); });
    });

    // Hintergrund beim Scrollen
    window.addEventListener("scroll", function () {
      host.classList.toggle("scrolled", window.scrollY > 40);
    }, { passive: true });
  }

  /* ---------- Footer rendern ---------- */
  function renderFooter() {
    var host = document.getElementById("site-footer");
    if (!host) return;
    host.className = "site-footer";
    host.innerHTML =
      '<div class="inner">' +
        '<a class="brand" href="index.php" style="text-decoration:none">BEN<span class="cursor">_</span></a>' +
        '<div class="links">' +
          LINKS.map(function (l) { return '<a href="' + l.href + '" data-i18n="' + l.key + '"></a>'; }).join("") +
        '</div>' +
        '<div class="meta">© ' + year + ' · <span data-i18n="foot.built"></span></div>' +
      '</div>';
  }

  /* ---------- i18n ---------- */
  function dict() { return (window.I18N && window.I18N[state.lang]) || {}; }

  function applyI18n() {
    var d = dict();
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var v = d[el.getAttribute("data-i18n")];
      if (v != null) el.textContent = v;
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var v = d[el.getAttribute("data-i18n-placeholder")];
      if (v != null) el.setAttribute("placeholder", v);
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      var v = d[el.getAttribute("data-i18n-alt")];
      if (v != null) el.setAttribute("alt", v);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var v = d[el.getAttribute("data-i18n-aria")];
      if (v != null) el.setAttribute("aria-label", v);
    });
    document.documentElement.lang = state.lang;
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang));
    });
  }

  var state = { lang: "de" };
  try { state.lang = localStorage.getItem("lang") || "de"; } catch (e) {}

  function setLang(lang) {
    state.lang = lang;
    try { localStorage.setItem("lang", lang); } catch (e) {}
    applyI18n();
  }

  /* ---------- Scroll-Reveal ---------- */
  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || !els.length) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Akzentfarbe an das Umgebungslicht koppeln ----------
     Der Seiten-Hintergrund verläuft von Orange (oben) nach Teal (unten).
     Damit Akzent-Elemente (Buttons, "Ansehen →", Eyebrows …) dazu passen,
     bekommt jeder Block je nach seiner vertikalen Position eine passende
     --accent-Farbe zwischen Warm und Kühl. Custom Properties vererben,
     also gilt der Wert automatisch für alle Kinder/Pseudo-Elemente.
     Rein positionsbasiert — kein Scroll-Listener, kein Scroll-Effekt. */
  function initAccentGradient() {
    var WARM = [245, 165, 36];   // --amber
    var COOL = [62, 199, 187];   // --teal
    var SEL = ".hero, .page-head, main .section, .card, .case, .tl-item, .site-footer";

    function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

    function apply() {
      var docH = document.documentElement.scrollHeight || 1;
      var sy = window.scrollY || window.pageYOffset || 0;
      document.querySelectorAll(SEL).forEach(function (el) {
        var r = el.getBoundingClientRect();
        var t = (r.top + sy + r.height / 2) / docH;
        t = Math.max(0, Math.min(1, t));
        t = t * t * (3 - 2 * t);   // Smoothstep: Enden kräftiger (oben Orange, unten Teal)
        el.style.setProperty("--accent",
          "rgb(" + lerp(WARM[0], COOL[0], t) + "," +
                   lerp(WARM[1], COOL[1], t) + "," +
                   lerp(WARM[2], COOL[2], t) + ")");
      });
    }

    apply();
    window.addEventListener("load", apply);            // Bildhöhen final
    var deb;
    window.addEventListener("resize", function () {
      clearTimeout(deb); deb = setTimeout(apply, 150);
    }, { passive: true });
  }

  /* ---------- Galerie-Filter ---------- */
  function initFilters() {
    var buttons = document.querySelectorAll("[data-filter]");
    var tiles = document.querySelectorAll("[data-cat]");
    if (!buttons.length) return;
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var f = btn.getAttribute("data-filter");
        buttons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        tiles.forEach(function (t) {
          var show = f === "all" || t.getAttribute("data-cat") === f;
          t.style.display = show ? "" : "none";
        });
      });
    });
  }

  /* ---------- Lightbox ---------- */
  function initLightbox() {
    var tiles = document.querySelectorAll("[data-full]");
    if (!tiles.length) return;

    var lb = document.createElement("div");
    lb.className = "lightbox";
    lb.innerHTML = '<button class="lb-close" aria-label="Schließen">×</button>' +
                   '<div><img alt=""><div class="lb-caption"></div></div>';
    document.body.appendChild(lb);
    var img = lb.querySelector("img");
    var cap = lb.querySelector(".lb-caption");

    function open(src, caption) { img.src = src; cap.textContent = caption || ""; lb.classList.add("open"); }
    function close() { lb.classList.remove("open"); img.src = ""; }

    tiles.forEach(function (t) {
      t.setAttribute("tabindex", "0");
      t.setAttribute("role", "button");
      function trigger() {
        var scope = t.closest("[data-cat]") || t;
        var titleEl = scope.querySelector(".tile-title");
        open(t.getAttribute("data-full"), titleEl ? titleEl.textContent : "");
      }
      t.addEventListener("click", trigger);
      t.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trigger(); } });
    });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lb-close")) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  /* ---------- Kontaktformular (Platzhalter) ---------- */
  function initForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var note = document.getElementById("form-status");
      if (note) note.hidden = false;
      form.reset();
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    renderNav();
    renderFooter();
    applyI18n();     // nach dem Rendern von Nav/Footer, damit deren Keys greifen
    initReveal();
    initAccentGradient();
    initFilters();
    initLightbox();
    initForm();
  });
})();
