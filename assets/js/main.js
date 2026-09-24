/* Weekend Land Escape — nav toggle, card filters, lightbox. Vanilla JS, no dependencies. */
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

  // Unit filters (cards.html)
  var filterBtns = document.querySelectorAll(".filter-btn");
  var units = document.querySelectorAll(".unit");
  function applyFilter(id) {
    filterBtns.forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.filter === id ? "true" : "false"); });
    units.forEach(function (u) { u.hidden = !(id === "all" || u.id === id); });
  }
  filterBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyFilter(btn.dataset.filter);
      if (history.replaceState) history.replaceState(null, "", btn.dataset.filter === "all" ? location.pathname : "#" + btn.dataset.filter);
    });
  });

  // Lightbox (any .card-btn with data-full)
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

  function visible() { return triggers.filter(function (t) { return t.offsetParent !== null; }); }
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

  function initHash() {
    var h = decodeURIComponent(location.hash.slice(1));
    if (!h) return;
    var unitMatch = document.querySelector('.filter-btn[data-filter="' + h + '"]');
    if (unitMatch) { applyFilter(h); return; }
    var card = document.getElementById(h);
    if (card && triggers.length) {
      var btn = card.querySelector(".card-btn");
      card.scrollIntoView({ block: "center" });
      if (btn) open(btn);
    }
  }
  initHash();
})();
