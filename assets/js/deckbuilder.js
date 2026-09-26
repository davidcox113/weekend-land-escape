/* Weekend Land Escape — Deck Builder for the card gallery (cards.html). Plain JS, no libraries.
   Reads card data from the gallery tiles (data-name/type/mana/cost/gold/legendary/token/basic/lgroup).
   Deck = { name, cards: { slug: count } } saved in localStorage. Shareable as cards.html#deck=slug:2,slug:1&name=...
   Copy limits follow the PROPOSED 100-card rules: 2 per card, Legendary 1 (alternate versions that share a
   Legendary slot count together), basic lands unlimited, tokens not allowed. */
(function () {
  "use strict";
  var dock = document.getElementById("deck-builder");
  if (!dock) return;
  var TARGET = 100, KEY = "wle-deck-v1", PREV = "wle-deck-prev";
  var TYPES = [["creature", "Creatures"], ["instant", "Instants"], ["sorcery", "Sorceries"], ["enhancement", "Enhancements"],
               ["land", "Lands"], ["fortification", "Fortifications"], ["economy", "Economy"], ["equipment", "Equipment"],
               ["artifact", "Artifacts"], ["siege_engine", "Siege Engines"], ["token", "Tokens"]];
  var MARKS = ["bastion", "harbor", "mire", "forge", "wildwood", "quarry"];
  var GROUP_NAMES = { "count-valdrek": "Count Valdrek", "bleakcloud": "Bleakcloud", "platebound": "Platebound" };
  var $ = function (id) { return document.getElementById(id); };
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function norm(s) {
    return String(s).toLowerCase().replace(/[\u2018\u2019\u02bc`]/g, "'").replace(/[\u2012-\u2015\u2212]/g, "-")
      .replace(/\s*-\s*/g, " - ").replace(/\s+/g, " ").trim();
  }

  // ---------- card data from the tiles ----------
  var CARDS = {}, BY_NAME = {}, ORDER = [];
  Array.prototype.forEach.call(document.querySelectorAll(".card[data-set]"), function (el) {
    var d = el.dataset, cost = +d.cost || 0, gold = +d.gold || 0;
    var c = { slug: el.id, name: d.name, type: d.type, mana: (d.mana || "").split(" ").filter(Boolean), cost: cost, gold: gold,
              mv: Math.max(0, cost - gold), legendary: d.legendary === "1", token: d.token === "1", basic: d.basic === "1",
              lgroup: d.lgroup || "", shared: d.shared === "1", el: el };
    c.limit = (c.token || c.shared) ? 0 : c.basic ? Infinity : c.legendary ? 1 : 2;
    CARDS[c.slug] = c; BY_NAME[norm(c.name)] = c; if (!c.shared) ORDER.push(c.slug);
  });

  // ---------- state ----------
  var deck = { name: "", cards: {} };
  function load() {
    try { var d = JSON.parse(localStorage.getItem(KEY) || "null"); if (d && d.cards) deck = { name: d.name || "", cards: d.cards }; } catch (e) {}
    clean();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(deck)); } catch (e) {} }
  function clean() { Object.keys(deck.cards).forEach(function (s) { if (!CARDS[s] || CARDS[s].shared || !(deck.cards[s] > 0)) delete deck.cards[s]; }); }
  function total() { return Object.keys(deck.cards).reduce(function (n, s) { return n + deck.cards[s]; }, 0); }
  function setCount(slug, n) {
    if (!CARDS[slug] || CARDS[slug].shared) return;
    n = Math.max(0, Math.min(n, 999));
    if (n) deck.cards[slug] = n; else delete deck.cards[slug];
    save(); render();
  }
  function add(slug, d) { setCount(slug, (deck.cards[slug] || 0) + d); bump(); }

  // ---------- tile controls ----------
  ORDER.forEach(function (slug) {
    var c = CARDS[slug], cap_ = c.el.querySelector("figcaption");
    var lim = c.shared ? "shared deck" : c.token ? "token" : c.basic ? "no limit" : c.legendary ? "max 1" : "max 2";
    var ctl = document.createElement("div");
    ctl.className = "deck-ctl";
    ctl.innerHTML = '<button type="button" class="dc-btn dc-minus" aria-label="Remove one ' + esc(c.name) + ' from deck">&minus;</button>' +
      '<span class="dc-count" aria-label="copies in deck">0</span>' +
      '<button type="button" class="dc-btn dc-plus" aria-label="Add one ' + esc(c.name) + ' to deck">+</button>' +
      '<span class="dc-limit">' + lim + '</span>';
    cap_.appendChild(ctl);
    var badge = document.createElement("span");
    badge.className = "dc-badge"; badge.hidden = true;
    c.el.appendChild(badge);
    c.ctl = ctl; c.countEl = ctl.querySelector(".dc-count"); c.badge = badge;
    ctl.querySelector(".dc-plus").addEventListener("click", function () { add(slug, 1); });
    ctl.querySelector(".dc-minus").addEventListener("click", function () { add(slug, -1); });
  });

  // ---------- rules check ----------
  function problems() {
    var out = [], groups = {};
    Object.keys(deck.cards).forEach(function (s) {
      var c = CARDS[s], n = deck.cards[s];
      if (c.shared) out.push({ slug: s, msg: esc(c.name) + " belongs to the shared Battlefield deck, not a player deck." });
      else if (c.token) out.push({ slug: s, msg: esc(c.name) + " is a token. Tokens are not put in the deck." });
      else if (n > c.limit) out.push({ slug: s, msg: n + "× " + esc(c.name) + ": limit " + c.limit + (c.legendary ? " (Legendary)" : "") + "." });
      if (c.lgroup) groups[c.lgroup] = (groups[c.lgroup] || 0) + n;
    });
    Object.keys(groups).forEach(function (g) {
      if (groups[g] > 1) out.push({ group: g, msg: groups[g] + " " + (GROUP_NAMES[g] || g) + " cards: these versions share one Legendary slot (1 in total)." });
    });
    var t = total();
    if (t > TARGET) out.push({ msg: t + " cards: a deck is exactly " + TARGET + ". Remove " + (t - TARGET) + "." });
    return out;
  }

  // ---------- rendering ----------
  var els = { count: $("db-count"), meter: $("db-meter"), warnBadge: $("db-warn-badge"), warnings: $("db-warnings"),
              types: $("db-types"), marks: $("db-marks"), curve: $("db-curve"), list: $("db-list"), name: $("db-name"),
              status: $("db-status"), toggle: $("db-toggle"), panel: $("db-panel") };
  function sorted() {
    var ti = {}; TYPES.forEach(function (t, i) { ti[t[0]] = i; });
    return Object.keys(deck.cards).map(function (s) { return CARDS[s]; }).sort(function (a, b) {
      return ti[a.type] - ti[b.type] || (a.type === "land" ? (b.basic - a.basic) : a.mv - b.mv) || a.name.localeCompare(b.name);
    });
  }
  function bar(label, n, max, extra) {
    return '<div class="db-bar"><span class="db-bl">' + label + '</span><span class="db-bt"><span style="width:' +
      (max ? Math.round(100 * n / max) : 0) + '%"></span></span><span class="db-bn">' + n + (extra || "") + '</span></div>';
  }
  function render() {
    var t = total(), probs = problems(), bad = {};
    probs.forEach(function (p) { if (p.slug) bad[p.slug] = 1; if (p.group) ORDER.forEach(function (s) { if (CARDS[s].lgroup === p.group && deck.cards[s]) bad[s] = 1; }); });
    // tiles
    ORDER.forEach(function (s) {
      var c = CARDS[s], n = deck.cards[s] || 0;
      c.countEl.textContent = n;
      c.ctl.classList.toggle("has", n > 0);
      c.el.classList.toggle("in-deck", n > 0);
      c.el.classList.toggle("over-limit", !!bad[s]);
      c.badge.hidden = !n; c.badge.textContent = "×" + n;
      c.ctl.querySelector(".dc-minus").disabled = !n;
    });
    // header
    els.count.textContent = t + "/" + TARGET;
    dock.classList.toggle("is-full", t === TARGET && !probs.length);
    dock.classList.toggle("has-warn", probs.length > 0);
    els.meter.style.width = Math.min(100, t) + "%";
    els.warnBadge.hidden = !probs.length; els.warnBadge.textContent = probs.length;
    els.warnBadge.setAttribute("aria-label", probs.length + " deck warning" + (probs.length === 1 ? "" : "s"));
    if (document.activeElement !== els.name) els.name.value = deck.name;
    // warnings
    var info = t < TARGET ? '<p class="db-info">' + (t ? "Add " + (TARGET - t) + " more to reach " + TARGET + "." : "Your deck is empty. Tap <strong>+</strong> on any card to add it.") + "</p>" :
      (t === TARGET && !probs.length ? '<p class="db-ok">✓ 100 cards and within the copy limits.</p>' : "");
    els.warnings.innerHTML = info + (probs.length ? '<ul class="db-warn">' + probs.map(function (p) { return "<li>" + p.msg + "</li>"; }).join("") + "</ul>" : "");
    // types
    var tc = {}; TYPES.forEach(function (x) { tc[x[0]] = 0; });
    var marks = {}, lands = {}, curve = [0, 0, 0, 0, 0, 0, 0, 0], goldCards = 0;
    MARKS.forEach(function (m) { marks[m] = 0; lands[m] = 0; });
    Object.keys(deck.cards).forEach(function (s) {
      var c = CARDS[s], n = deck.cards[s];
      tc[c.type] = (tc[c.type] || 0) + n;
      if (c.type === "land") c.mana.forEach(function (m) { if (m in lands) lands[m] += n; });
      else if (!c.token) {
        c.mana.forEach(function (m) { if (m in marks) marks[m] += n; });
        if (c.gold) goldCards += n;
        curve[Math.min(7, c.mv)] += n;
      }
    });
    var tmax = Math.max.apply(null, TYPES.map(function (x) { return tc[x[0]]; }).concat([1]));
    els.types.innerHTML = "<h4>By type</h4>" + TYPES.filter(function (x) { return x[0] !== "token" || tc.token; })
      .map(function (x) { return bar(x[1], tc[x[0]], tmax); }).join("");
    els.marks.innerHTML = '<h4>By mana mark</h4><table class="db-mt"><thead><tr><th></th><th>Cards</th><th>Lands</th></tr></thead><tbody>' +
      MARKS.map(function (m) {
        return '<tr' + (marks[m] || lands[m] ? "" : ' class="zero"') + '><td><span class="mi mi-' + m + '" aria-hidden="true"></span>' + cap(m) +
          "</td><td>" + marks[m] + "</td><td>" + lands[m] + "</td></tr>";
      }).join("") + '<tr><td><span class="mi mi-gold" aria-hidden="true"></span>Gold cost</td><td>' + goldCards + "</td><td></td></tr></tbody></table>" +
      '<p class="db-note">Cards = copies whose cost uses that mark. Lands = lands that tap for it.</p>';
    var cmax = Math.max.apply(null, curve.concat([1]));
    els.curve.innerHTML = '<h4>Mana curve <span class="db-note">(non-land cards, mana only)</span></h4><div class="db-curve">' +
      curve.map(function (n, i) {
        return '<div class="db-col"><span class="db-cn">' + n + '</span><span class="db-cb" style="height:' + Math.round(64 * n / cmax) + 'px"></span><span class="db-cl">' + (i === 7 ? "7+" : i) + "</span></div>";
      }).join("") + "</div>";
    // list
    var rows = sorted(), html = "", cur = "";
    rows.forEach(function (c) {
      if (c.type !== cur) {
        cur = c.type;
        var label = TYPES.filter(function (x) { return x[0] === cur; })[0][1];
        html += (html ? "</ul>" : "") + "<h5>" + label + " (" + tc[cur] + ")</h5><ul>";
      }
      var n = deck.cards[c.slug];
      html += '<li class="' + (bad[c.slug] ? "bad" : "") + '"><button type="button" class="dc-btn sm" data-d="-1" data-s="' + c.slug + '" aria-label="Remove one ' + esc(c.name) + '">&minus;</button>' +
        '<span class="db-q">' + n + '</span><button type="button" class="dc-btn sm" data-d="1" data-s="' + c.slug + '" aria-label="Add one ' + esc(c.name) + '">+</button>' +
        '<a class="db-name" href="#' + c.slug + '" data-goto="' + c.slug + '">' + esc(c.name) + "</a>" + (c.type === "land" ? "" : '<span class="db-mv">' + c.mv + (c.gold ? '<span class="gold-dot" title="+' + c.gold + ' gold">•</span>' : "") + "</span>") + "</li>";
    });
    els.list.innerHTML = rows.length ? html + "</ul>" : "";
  }
  var bumpT = null;
  function bump() { dock.classList.remove("bump"); void dock.offsetWidth; dock.classList.add("bump"); clearTimeout(bumpT); bumpT = setTimeout(function () { dock.classList.remove("bump"); }, 400); }
  function status(msg) { els.status.textContent = msg; clearTimeout(status.t); status.t = setTimeout(function () { els.status.textContent = ""; }, 4000); }

  els.list.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-s]");
    if (b) { add(b.dataset.s, +b.dataset.d); return; }
    var a = e.target.closest("a[data-goto]");
    if (a) {
      e.preventDefault();
      var el = $(a.dataset.goto);
      if (el.offsetParent === null) { var cl = $("f-clear"); if (cl && !cl.disabled) cl.click(); }
      if (window.matchMedia("(max-width: 1099px)").matches) setOpen(false);
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.classList.add("flash"); setTimeout(function () { el.classList.remove("flash"); }, 1400);
    }
  });
  els.name.addEventListener("input", function () { deck.name = els.name.value.slice(0, 80); save(); });

  // ---------- open / close ----------
  function setOpen(open) {
    els.panel.hidden = !open;
    els.toggle.setAttribute("aria-expanded", open ? "true" : "false");
    dock.classList.toggle("open", open);
    document.body.classList.toggle("db-open", open);
    try { localStorage.setItem(KEY + "-open", open ? "1" : "0"); } catch (e) {}
  }
  els.toggle.addEventListener("click", function () { setOpen(els.panel.hidden); });
  $("db-close").addEventListener("click", function () { setOpen(false); els.toggle.focus(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !els.panel.hidden && !document.querySelector(".lightbox.open")) setOpen(false);
  });
  Array.prototype.forEach.call(document.querySelectorAll('a[href="#deck-builder"]'), function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); setOpen(true); });
  });

  // ---------- text export / import ----------
  function toText() {
    var lines = ["// " + (deck.name || "Weekend Land Escape deck") + " (" + total() + " cards)"], cur = "";
    sorted().forEach(function (c) {
      if (c.type !== cur) { cur = c.type; lines.push("// " + TYPES.filter(function (x) { return x[0] === cur; })[0][1]); }
      lines.push(deck.cards[c.slug] + " " + c.name);
    });
    return lines.join("\n");
  }
  function parse(text) {
    var cards = {}, unknown = [], name = "";
    text.split(/\r?\n/).forEach(function (raw, i) {
      var ln = raw.trim();
      if (!ln) return;
      if (/^(\/\/|#)/.test(ln)) {
        if (i === 0 || !name) { var m0 = ln.replace(/^(\/\/|#)\s*/, "").replace(/\s*\(\d+ cards\)\s*$/, ""); if (i === 0 && m0) name = m0; }
        return;
      }
      var m = ln.match(/^(\d+)\s*[x×]?\s+(.+)$/i), n = 1, nm = ln;
      if (m) { n = +m[1]; nm = m[2]; }
      var c = BY_NAME[norm(nm)] || CARDS[nm.toLowerCase()];
      if (!c) { unknown.push(nm); return; }
      cards[c.slug] = (cards[c.slug] || 0) + n;
    });
    return { cards: cards, unknown: unknown, name: name };
  }
  function copy(text, okMsg) {
    function fallback() { showIO(text, "Copy the text below:", false); var ta = $("db-text"); ta.focus(); ta.select(); }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { status(okMsg); }, fallback);
    } else fallback();
  }
  var io = $("db-io");
  function showIO(text, msg, importing) {
    io.hidden = false; $("db-text").value = text; $("db-io-msg").textContent = msg;
    $("db-import-go").hidden = !importing;
    $("db-text").readOnly = !importing;
  }
  $("db-export").addEventListener("click", function () { copy(toText(), "Deck list copied to the clipboard."); showIO(toText(), "Deck list (also copied to the clipboard):", false); });
  $("db-import").addEventListener("click", function () {
    showIO("", "Paste a deck list, one card per line, like “2 Howlmoon Werewolf”. It replaces the current deck.", true);
    $("db-text").focus();
  });
  $("db-import-go").addEventListener("click", function () {
    var r = parse($("db-text").value);
    if (!Object.keys(r.cards).length) { $("db-io-msg").textContent = "No card names recognised." + (r.unknown.length ? " Unknown: " + r.unknown.join(", ") : ""); return; }
    remember();
    deck = { name: r.name || deck.name, cards: r.cards }; save(); render();
    $("db-io-msg").textContent = "Loaded " + total() + " cards." + (r.unknown.length ? " Not found: " + r.unknown.join(", ") + "." : "");
    status("Deck imported.");
  });
  $("db-io-close").addEventListener("click", function () { io.hidden = true; });
  function shareUrl() {
    var enc = Object.keys(deck.cards).map(function (s) { return s + ":" + deck.cards[s]; }).join(",");
    return location.href.split("#")[0].split("?")[0] + "#deck=" + enc + (deck.name ? "&name=" + encodeURIComponent(deck.name) : "");
  }
  $("db-share").addEventListener("click", function () {
    if (!total()) { status("Add some cards first."); return; }
    var u = shareUrl(); copy(u, "Share link copied to the clipboard."); showIO(u, "Share link (also copied): anyone who opens it gets this deck.", false);
  });
  $("db-clear").addEventListener("click", function () {
    if (!total()) return;
    remember(); deck = { name: "", cards: {} }; save(); render();
    offerUndo("Deck cleared.");
  });

  // ---------- undo (after clear / import / opening a shared deck) ----------
  function remember() { if (total()) try { localStorage.setItem(PREV, JSON.stringify(deck)); } catch (e) {} }
  function offerUndo(msg) {
    els.status.innerHTML = esc(msg) + ' <button type="button" class="db-link" id="db-undo">Undo</button>';
    $("db-undo").addEventListener("click", function () {
      try { var p = JSON.parse(localStorage.getItem(PREV) || "null"); if (p) { deck = p; clean(); save(); render(); status("Previous deck restored."); } } catch (e) {}
    });
  }

  // ---------- print ----------
  $("db-print").addEventListener("click", function () {
    var pr = $("deck-print");
    if (!pr) { pr = document.createElement("div"); pr.id = "deck-print"; document.body.appendChild(pr); }
    var html = "<h1>" + esc(deck.name || "Weekend Land Escape deck") + "</h1><p>" + total() + " cards · weekend-land-escape</p><div class=\"dp-cols\">", cur = "";
    sorted().forEach(function (c) {
      if (c.type !== cur) {
        if (cur) html += "</ul></div>";
        cur = c.type;
        var n = 0; Object.keys(deck.cards).forEach(function (s) { if (CARDS[s].type === cur) n += deck.cards[s]; });
        html += "<div class=\"dp-group\"><h2>" + TYPES.filter(function (x) { return x[0] === cur; })[0][1] + " (" + n + ")</h2><ul>";
      }
      html += "<li><b>" + deck.cards[c.slug] + "</b> " + esc(c.name) + "</li>";
    });
    pr.innerHTML = html + (cur ? "</ul></div>" : "") + "</div>";
    document.body.classList.add("print-deck");
    window.print();
  });
  window.addEventListener("afterprint", function () { document.body.classList.remove("print-deck"); });

  // ---------- shared / starter deck in the URL hash ----------
  function fromHash() {
    var h = location.hash.slice(1);
    if (h === "deck-builder") { setOpen(true); return true; }
    if (h.indexOf("deck=") !== 0) return false;
    var p = new URLSearchParams(h), cards = {}, unknown = [];
    (p.get("deck") || "").split(",").forEach(function (part) {
      var m = part.match(/^([a-z0-9-]+)(?::(\d+))?$/);
      if (!m) return;
      if (CARDS[m[1]]) cards[m[1]] = (cards[m[1]] || 0) + (+(m[2] || 1)); else unknown.push(m[1]);
    });
    var incoming = { name: p.get("name") || "", cards: cards };
    if (JSON.stringify(incoming.cards) !== JSON.stringify(deck.cards)) remember();
    deck = incoming; save(); render(); setOpen(true);
    if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
    offerUndo("Loaded “" + (deck.name || "shared deck") + "”." + (unknown.length ? " Unknown cards skipped: " + unknown.join(", ") + "." : ""));
    return true;
  }

  load(); render();
  var wasOpen = false; try { wasOpen = localStorage.getItem(KEY + "-open") === "1"; } catch (e) {}
  if (!fromHash()) setOpen(wasOpen && window.matchMedia("(min-width: 1100px)").matches);
  window.addEventListener("hashchange", fromHash);
  window.wleDeck = { get: function () { return JSON.parse(JSON.stringify(deck)); }, total: total, text: toText, problems: problems };
})();
