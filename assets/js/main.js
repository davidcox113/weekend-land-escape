/* Weekend Land Escape — nav toggle, card gallery filters/sort/search, lightbox. Vanilla JS, no dependencies. */
(function () {
  "use strict";

  // Mobile nav
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // ---------- Card gallery toolbar (cards.html) ----------
  var gallery = null;
  var tools = document.getElementById("card-tools");
  if (tools) gallery = initGallery(tools);

  function initGallery(tools) {
    var GROUPS = ["mana", "type", "rarity", "set"];
    var cards = Array.prototype.slice.call(document.querySelectorAll(".card[data-set]"));
    var total = cards.length;
    cards.forEach(function (c, i) {
      c._home = c.parentNode; c._idx = i;
      c._mana = (c.dataset.mana || "").split(" ");
      c._cost = +c.dataset.cost || 0; c._gold = +c.dataset.gold || 0;
      var txt = c.querySelector(".card-text");
      c._hay = ((c.dataset.name || "") + " " + (txt ? txt.textContent : "")).toLowerCase();
    });
    var chips = Array.prototype.slice.call(tools.querySelectorAll(".chip"));
    var search = document.getElementById("f-search");
    var sortSel = document.getElementById("f-sort");
    var countEl = document.getElementById("f-count");
    var clearBtn = document.getElementById("f-clear");
    var panel = document.getElementById("f-panel");
    var panelBtn = document.getElementById("f-toggle");
    var activeEl = document.getElementById("f-active");
    var noRes = document.getElementById("no-results");
    var sortedView = document.getElementById("sorted-view");
    var resultsTop = document.getElementById("results-top");
    var units = Array.prototype.slice.call(document.querySelectorAll(".unit"));
    var subunits = Array.prototype.slice.call(document.querySelectorAll(".subunit"));
    var state = { mana: [], type: [], rarity: [], set: [], q: "", sort: "section" };

    // Read state from the query string (?mana=forge,mire&type=creature&sort=cost-asc&q=siege)
    var params = new URLSearchParams(location.search);
    GROUPS.forEach(function (g) { var v = params.get(g); if (v) state[g] = v.split(",").filter(Boolean); });
    if (params.get("q")) state.q = params.get("q");
    if (params.get("sort") && sortSel.querySelector('option[value="' + params.get("sort") + '"]')) state.sort = params.get("sort");

    function matches(c, q) {
      if (state.mana.length && !state.mana.some(function (m) { return c._mana.indexOf(m) !== -1; })) return false;
      if (state.type.length && state.type.indexOf(c.dataset.type) === -1) return false;
      if (state.rarity.length && state.rarity.indexOf(c.dataset.rarity) === -1) return false;
      if (state.set.length && state.set.indexOf(c.dataset.set) === -1) return false;
      if (q && !q.every(function (w) { return c._hay.indexOf(w) !== -1; })) return false;
      return true;
    }
    function byName(a, b) { return a.dataset.name.localeCompare(b.dataset.name); }
    var SORTS = {
      // total mana cost counts gold; ties: fewer gold first (asc) / more gold first (desc), then name
      "cost-asc": function (a, b) { return a._cost - b._cost || a._gold - b._gold || byName(a, b); },
      "cost-desc": function (a, b) { return b._cost - a._cost || b._gold - a._gold || byName(a, b); },
      "name": byName
    };
    function activeCount() {
      return GROUPS.reduce(function (n, g) { return n + state[g].length; }, 0) + (state.q.trim() ? 1 : 0);
    }
    function apply(opts) {
      var q = state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
      var shown = 0;
      cards.forEach(function (c) { var ok = matches(c, q); c.hidden = !ok; if (ok) shown++; });
      if (state.sort === "section") {
        if (!sortedView.hidden) {
          // put every card back in its home section, in the original order
          cards.slice().sort(function (a, b) { return a._idx - b._idx; }).forEach(function (c) { c._home.appendChild(c); });
          sortedView.hidden = true;
        }
        subunits.forEach(function (s) { s.hidden = !s.querySelector(".card[data-set]:not([hidden])"); });
        units.forEach(function (u) { u.hidden = !u.querySelector(".card[data-set]:not([hidden])"); });
      } else {
        cards.slice().sort(SORTS[state.sort]).forEach(function (c) { sortedView.appendChild(c); });
        sortedView.hidden = false;
        units.forEach(function (u) { u.hidden = true; });
      }
      noRes.hidden = shown !== 0;
      countEl.innerHTML = "Showing <strong>" + shown + "</strong> of " + total + " cards";
      var n = activeCount();
      activeEl.textContent = n ? " (" + n + ")" : "";
      clearBtn.disabled = !n && state.sort === "section";
      chips.forEach(function (ch) {
        ch.setAttribute("aria-pressed", state[ch.dataset.group].indexOf(ch.dataset.value) !== -1 ? "true" : "false");
      });
      if (search.value !== state.q) search.value = state.q;
      sortSel.value = state.sort;
      syncUrl();
      if (opts && opts.scroll) scrollToResults();
    }
    function syncUrl() {
      if (!history.replaceState) return;
      var p = new URLSearchParams();
      GROUPS.forEach(function (g) { if (state[g].length) p.set(g, state[g].join(",")); });
      if (state.q.trim()) p.set("q", state.q.trim());
      if (state.sort !== "section") p.set("sort", state.sort);
      var qs = p.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
    }
    // If the toolbar is stuck and the results start above it, bring the first results into view.
    function scrollToResults() {
      var y = resultsTop.getBoundingClientRect().top;
      var off = 68 + tools.offsetHeight;
      if (y < off - 2) window.scrollTo(0, window.pageYOffset + y - off);
    }
    function setToolsHeight() { document.documentElement.style.setProperty("--tools-h", tools.offsetHeight + "px"); }
    function reset() {
      GROUPS.forEach(function (g) { state[g] = []; });
      state.q = ""; state.sort = "section";
      apply({ scroll: true });
    }

    chips.forEach(function (ch) {
      ch.addEventListener("click", function () {
        var list = state[ch.dataset.group], i = list.indexOf(ch.dataset.value);
        if (i === -1) list.push(ch.dataset.value); else list.splice(i, 1);
        userTouchedPanel = true;
        apply({ scroll: true });
      });
    });
    var t = null;
    search.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () { state.q = search.value; apply({ scroll: true }); }, 120);
    });
    search.addEventListener("keydown", function (e) { if (e.key === "Escape") { state.q = ""; apply(); } });
    sortSel.addEventListener("change", function () { state.sort = sortSel.value; apply({ scroll: true }); });
    clearBtn.addEventListener("click", reset);
    Array.prototype.forEach.call(document.querySelectorAll("[data-clear]"), function (b) { b.addEventListener("click", reset); });

    // Collapsible chip panel: open on wide screens, collapsed on phones. When opened automatically,
    // it folds itself away once you scroll down into the cards (so the sticky bar stays slim).
    var userTouchedPanel = false;
    function setPanel(open) {
      panel.hidden = !open;
      panelBtn.setAttribute("aria-expanded", open ? "true" : "false");
      setToolsHeight();
    }
    panelBtn.addEventListener("click", function () { userTouchedPanel = true; setPanel(panel.hidden); });
    var wide = window.matchMedia("(min-width: 900px)").matches;
    setPanel(wide && !(location.hash && location.hash.length > 1));
    var startTop = tools.getBoundingClientRect().top + window.pageYOffset;
    window.addEventListener("scroll", function () {
      if (!userTouchedPanel && !panel.hidden && window.pageYOffset > startTop + 320) setPanel(false);
    }, { passive: true });
    window.addEventListener("resize", setToolsHeight);

    // Jump nav: if the target is hidden by filters or the sorted view, reset first.
    Array.prototype.forEach.call(document.querySelectorAll(".jump-nav a"), function (a) {
      a.addEventListener("click", function (e) {
        var el = document.getElementById(a.getAttribute("href").slice(1));
        if (!el) return;
        if (el.offsetParent === null) { reset(); }
        e.preventDefault();
        if (!userTouchedPanel) setPanel(false);
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        if (history.replaceState) history.replaceState(null, "", location.pathname + location.search + "#" + el.id);
      });
    });

    apply();
    return { reset: reset };
  }

  // ---------- Lightbox (any .card-btn with data-full) ----------
  var triggers = Array.prototype.slice.call(document.querySelectorAll(".card-btn[data-full]"));
  if (!triggers.length) return initHash();

  var lb = document.createElement("div");
  lb.className = "lightbox";
  lb.setAttribute("role", "dialog");
  lb.setAttribute("aria-modal", "true");
  lb.setAttribute("aria-label", "Card viewer");
  lb.innerHTML =
    '<button class="lb-btn lb-close" type="button" aria-label="Close">&times;</button>' +
    '<button class="lb-btn lb-prev" type="button" aria-label="Previous card">&#8249;</button>' +
    '<button class="lb-btn lb-next" type="button" aria-label="Next card">&#8250;</button>' +
    '<div class="lb-inner"><img alt=""><div class="lb-cap"><strong></strong><span></span></div></div>';
  document.body.appendChild(lb);
  var lbImg = lb.querySelector("img"), lbName = lb.querySelector("strong"), lbText = lb.querySelector(".lb-cap span");
  var current = -1, lastFocus = null;

  // visible cards in current on-screen order (respects filters and sorting)
  function visible() {
    return Array.prototype.filter.call(document.querySelectorAll(".card-btn[data-full]"), function (t) { return t.offsetParent !== null; });
  }
  function show(t) {
    lbImg.src = t.dataset.full;
    lbImg.alt = t.dataset.name || "";
    lbName.textContent = t.dataset.name || "";
    lbText.textContent = t.dataset.text || "";
  }
  function open(t) {
    lastFocus = document.activeElement;
    var list = visible(); current = list.indexOf(t);
    show(t);
    lb.classList.add("open");
    document.body.style.overflow = "hidden";
    lb.querySelector(".lb-close").focus();
  }
  function close() {
    lb.classList.remove("open");
    document.body.style.overflow = "";
    lbImg.removeAttribute("src");
    if (lastFocus) lastFocus.focus();
  }
  function step(d) {
    var list = visible(); if (!list.length) return;
    current = (current + d + list.length) % list.length;
    show(list[current]);
  }
  triggers.forEach(function (t) { t.addEventListener("click", function () { open(t); }); });
  lb.querySelector(".lb-close").addEventListener("click", close);
  lb.querySelector(".lb-prev").addEventListener("click", function () { step(-1); });
  lb.querySelector(".lb-next").addEventListener("click", function () { step(1); });
  lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lb-inner")) close(); });
  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
  });

  // Deep links: #card-slug opens that card; #section just scrolls there (reset filters if it is hidden).
  // Web-font swaps can shift the layout after the first jump, so re-align once fonts/images settle
  // (unless the visitor has already scrolled on their own).
  function initHash() {
    var h = decodeURIComponent(location.hash.slice(1));
    if (!h) return;
    var el = document.getElementById(h);
    if (!el) return;
    if (el.offsetParent === null && gallery) gallery.reset();
    var isCard = el.classList.contains("card");
    var userMoved = false;
    ["wheel", "touchstart", "keydown", "mousedown"].forEach(function (ev) {
      window.addEventListener(ev, function () { userMoved = true; }, { once: true, passive: true });
    });
    function align() {
      if (userMoved) return;  // the visitor has started scrolling; leave them be
      el.scrollIntoView({ block: isCard ? "center" : "start", behavior: "instant" });
    }
    align();
    if (isCard && triggers.length) { var btn = el.querySelector(".card-btn"); if (btn) open(btn); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(align);
    window.addEventListener("load", align);
    setTimeout(align, 1200);
  }
  initHash();
})();
