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
    document.querySelectorAll("[data-i18n-href]").forEach(function (el) {
      var v = d[el.getAttribute("data-i18n-href")];
      if (v != null) el.setAttribute("href", v);
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
    var COOL = [0, 170, 205];    // gedämpftes Cyan (Richtung 0,221,255)
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

  /* ---------- Showcase: Polaroids bei jedem Aufruf neu streuen ----------
     Die Positionen im CSS sind der Fallback (ohne JS liegt trotzdem alles
     ordentlich). Hier werden dieselben neun Ablage-Plätze zufällig auf die
     Bilder verteilt und zusätzlich leicht verwackelt, damit die Karte bei
     jedem Seitenaufruf anders aussieht. */
  function initScatter() {
    var host = document.querySelector(".card-scatter");
    if (!host) return;
    var imgs = Array.prototype.slice.call(host.querySelectorAll("img"));
    if (!imgs.length) return;

    // Ablage-Plätze: Kanten und Breite in % der Karte, rot in Grad.
    var SLOTS = [
      { top:  4, left: 10, w: 24, rot: -17 },
      { top: 10, left: 33, w: 20, rot:   9 },
      { top:  2, right: 8, w: 23, rot:  21 },
      { top: 34, left: 22, w: 22, rot:  -6 },
      { top: 40, right:14, w: 25, rot:  13 },
      { top: 30, left:  2, w: 19, rot:   4 },
      { bottom:  6, left: 14, w: 23, rot: -24 },
      { bottom:  2, left: 42, w: 21, rot:  16 },
      { bottom: 10, right: 8, w: 20, rot: -11 }
    ];

    function shuffle(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
    function jitter(max) { return (Math.random() * 2 - 1) * max; }
    // nie unter 1% — sonst schneidet der Kartenrand ein Foto glatt ab
    function pos(v, max) { return v == null ? "auto" : Math.max(1, v + jitter(max)).toFixed(1) + "%"; }

    var slots = shuffle(SLOTS.slice());
    var layers = shuffle(imgs.map(function (_, i) { return i + 1; }));

    imgs.forEach(function (img, i) {
      var s = slots[i % slots.length];
      var st = img.style;
      // immer alle vier Kanten setzen, sonst bleiben die CSS-Werte stehen
      st.top    = pos(s.top, 3);
      st.bottom = pos(s.bottom, 3);
      st.left   = pos(s.left, 3);
      st.right  = pos(s.right, 3);
      st.width  = (s.w + jitter(1.5)).toFixed(1) + "%";
      st.transform = "rotate(" + (s.rot + jitter(7)).toFixed(1) + "deg)";
      st.zIndex = layers[i];   // Stapelreihenfolge ebenfalls würfeln
    });
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
                   '<button class="lb-prev" aria-label="Vorheriges Bild">‹</button>' +
                   '<button class="lb-next" aria-label="Nächstes Bild">›</button>' +
                   '<div><img alt=""><div class="lb-caption"></div></div>';
    document.body.appendChild(lb);
    var img = lb.querySelector("img");
    var cap = lb.querySelector(".lb-caption");
    var prevBtn = lb.querySelector(".lb-prev");
    var nextBtn = lb.querySelector(".lb-next");

    var gallery = [];
    var index = 0;

    function show(i) {
      index = (i + gallery.length) % gallery.length;
      img.src = gallery[index].src;
      cap.textContent = gallery[index].caption || "";
      var multi = gallery.length > 1;
      prevBtn.classList.toggle("lb-nav-hidden", !multi);
      nextBtn.classList.toggle("lb-nav-hidden", !multi);
    }
    function open(list, startIndex) { gallery = list; show(startIndex); lb.classList.add("open"); }
    function close() { lb.classList.remove("open"); img.src = ""; }

    tiles.forEach(function (t) {
      t.setAttribute("tabindex", "0");
      t.setAttribute("role", "button");
      function trigger() {
        var scope = t.closest("[data-cat]") || t;
        var titleEl = scope.querySelector(".tile-title");
        var caption = titleEl ? titleEl.textContent : "";
        var group = Array.prototype.slice.call(scope.querySelectorAll("[data-full]"));
        var list = group.map(function (g) { return { src: g.getAttribute("data-full"), caption: caption }; });
        open(list, group.indexOf(t));
      }
      t.addEventListener("click", trigger);
      t.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); trigger(); } });
    });
    prevBtn.addEventListener("click", function () { show(index - 1); });
    nextBtn.addEventListener("click", function () { show(index + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lb-close")) close(); });
    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
  }

  /* ---------- E-Mail-Adresse kopieren ---------- */
  function initCopyMail() {
    var btn = document.getElementById("copy-mail");
    if (!btn) return;
    var label = btn.querySelector("span");
    var timer = null;

    function copy(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
      // Fallback für ältere Browser bzw. Seiten ohne HTTPS
      return new Promise(function (resolve, reject) {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta);
        ok ? resolve() : reject();
      });
    }

    btn.addEventListener("click", function () {
      copy(btn.dataset.copy).then(function () {
        btn.classList.add("is-copied");
        label.textContent = dict()["ct.mail.copied"] || "Kopiert";
        clearTimeout(timer);
        timer = setTimeout(function () {
          btn.classList.remove("is-copied");
          label.textContent = dict()["ct.mail.copy"] || "Adresse kopieren";
        }, 2000);
      }).catch(function () {
        // Kopieren blockiert: Adresse markieren, damit man sie selbst kopieren kann
        var addr = document.querySelector(".mail-line .addr");
        if (!addr) return;
        var range = document.createRange();
        range.selectNodeContents(addr);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initScatter();   // vor dem ersten Paint, damit nichts sichtbar umspringt
    renderNav();
    renderFooter();
    applyI18n();     // nach dem Rendern von Nav/Footer, damit deren Keys greifen
    initReveal();
    initAccentGradient();
    initFilters();
    initLightbox();
    initCopyMail();
  });
})();
