/* =========================================================================
   AMK — works wheel
   A real 3D ring: cards are laid on a circle in preserved-3D space, the ring
   turns on one axis and each card is counter-rotated so its face keeps
   looking at the viewer. Depth comes from CSS perspective, not from scaling
   by hand, so the near card genuinely passes in front of the far ones.

   Input: drag (pointer or touch), arrow keys, prev/next buttons, autoplay,
   and a snap that always finishes on a whole card.
   ========================================================================= */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) {
    return Array.prototype.slice.call((c || document).querySelectorAll(s));
  };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  function init() {
    var root = $("#workWheel");
    var ring = $("#wheelRing");
    var stage = $("#wheelStage");
    var template = $("#wheelData");
    if (!root || !ring || !template) return;
    /* Never build the ring twice, whatever fires the boot. */
    if (root.getAttribute("data-wheel-ready") === "1") return;
    root.setAttribute("data-wheel-ready", "1");

    /* A <template>'s children live in .content, not on the element itself. */
    var source = template.content || template;
    var items = $$("[data-name]", source).map(function (node) {
      return {
        name: node.getAttribute("data-name"),
        cat: node.getAttribute("data-cat"),
        year: node.getAttribute("data-year"),
        img: node.getAttribute("data-img")
      };
    });
    if (!items.length) return;

    var n = items.length;
    var step = 360 / n;
    var radius = 0;
    var index = 0;       // nearest card, always an integer
    var angle = 0;       // current ring rotation
    var target = 0;      // where the ring is heading
    var raf = 0;
    var running = false;
    var dragging = false;
    var pointerId = null;
    var startX = 0;
    var startAngle = 0;
    var lastX = 0;
    var lastT = 0;
    var velocity = 0;
    var moved = 0;
    var paused = false;
    var autoTimer = 0;
    var cards = [];

    /* --- build ---------------------------------------------------------- */
    items.forEach(function (item, i) {
      var el = document.createElement("a");
      el.className = "w-card";
      el.href = "#contact";
      el.setAttribute("aria-label", item.name + " — " + item.cat);
      el.innerHTML =
        '<img src="' + item.img + '" alt="' + item.name + ' — ' + item.cat +
        '" width="720" height="900" loading="lazy" decoding="async" />' +
        '<span class="w-card-body"><b>' + item.name + '</b><span>' + item.cat + '</span></span>';
      ring.appendChild(el);
      cards.push(el);
    });

    function measureRadius() {
      var w = window.innerWidth;
      var cardW = cardWanted() || 240;
      /* Smallest ring that still keeps the side cards inside the frame.
         Rings smaller than this look tight on desktop but overflow a phone. */
      radius = Math.round(cardW / (2 * Math.tan(Math.PI / n)) * 1.28);
      if (w < 620) {
        radius = Math.round((w * 0.5 - cardW * 0.5) / Math.max(0.55, Math.sin(2 * Math.PI / n)));
      }
      radius = Math.max(150, radius);
    }

    function cardWanted() {
      var probe = cards[0];
      return probe ? probe.getBoundingClientRect().width : 240;
    }

    function layout() {
      measureRadius();
      cards.forEach(function (el, i) {
        var a = i * step;
        el.style.transform =
          "rotateY(" + a + "deg) translateZ(" + radius + "px) rotateY(" + (-a) + "deg)";
      });
      paint(true);
    }

    /* --- paint ---------------------------------------------------------- */
    var caption = $("#wheelCaption");
    var catEl = $(".wheel-cat", caption || document);
    var titleEl = $(".wheel-title", caption || document);
    var yearEl = $(".wheel-year", caption || document);
    var indexEl = $("#wheelIndex");

    function paint(force) {
      ring.style.transform = "rotateY(" + angle.toFixed(2) + "deg)";

      var nearest = ((Math.round(-angle / step) % n) + n) % n;
      if (nearest === index && !force) return;
      index = nearest;

      cards.forEach(function (el, i) {
        el.classList.toggle("is-front", i === index);
        el.setAttribute("aria-hidden", i === index ? "false" : "true");
        el.tabIndex = i === index ? 0 : -1;
      });

      if (indexEl) indexEl.textContent = ("0" + (index + 1)).slice(-2);
      if (catEl) catEl.textContent = items[index].cat;
      if (titleEl) titleEl.textContent = items[index].name;
      if (yearEl) yearEl.textContent = items[index].year;

      if (caption) {
        caption.classList.remove("wheel-cap-anim");
        /* force a reflow so the animation can restart */
        void caption.offsetWidth;
        caption.classList.add("wheel-cap-anim");
      }
    }

    /* --- motion --------------------------------------------------------- */
    function tick() {
      var delta = target - angle;
      angle += delta * 0.115;
      if (Math.abs(delta) < 0.02) {
        angle = target;
        paint();
        running = false;
        raf = 0;
        return;
      }
      paint();
      raf = window.requestAnimationFrame(tick);
    }

    function kick() {
      if (running) return;
      running = true;
      raf = window.requestAnimationFrame(tick);
    }

    function goTo(i) {
      var wanted = ((i % n) + n) % n;
      var current = -angle / step;
      var diff = wanted - current;
      // Take the short way round, and never unwind more than half the ring.
      if (diff > n / 2) diff -= n;
      if (diff < -n / 2) diff += n;
      target = -(current + diff) * step;
      kick();
    }

    function next() { goTo(index + 1); }
    function prev() { goTo(index - 1); }

    /* --- pointer drag --------------------------------------------------- */
    function onDown(e) {
      if (e.target.closest("button")) return;
      dragging = true;
      moved = 0;
      pointerId = e.pointerId;
      startX = e.clientX;
      startAngle = angle;
      target = angle;
      velocity = 0;
      lastX = e.clientX;
      lastT = performance.now();
      root.classList.add("is-dragging");
      if (root.setPointerCapture) {
        try { root.setPointerCapture(pointerId); } catch (err) {}
      }
      stopAuto();
    }

    function onMove(e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      // Drag right rotates the ring clockwise, matching the finger.
      angle = startAngle + dx * 0.28;
      target = angle;

      var now = performance.now();
      var dt = Math.max(1, now - lastT);
      velocity = ((e.clientX - lastX) / dt) * 16;
      lastX = e.clientX;
      lastT = now;

      paint();
      if (e.cancelable) e.preventDefault();
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      root.classList.remove("is-dragging");
      if (root.releasePointerCapture && pointerId !== null) {
        try { root.releasePointerCapture(pointerId); } catch (err) {}
      }
      pointerId = null;
      // Momentum, then snap to the closest card.
      var projected = angle + velocity * 3.2;
      var snapped = Math.round(projected / step) * step;
      target = snapped;
      kick();
      startAuto();
    }

    /* --- autoplay ------------------------------------------------------- */
    function startAuto() {
      stopAuto();
      if (paused || reduce()) return;
      autoTimer = window.setInterval(next, 4200);
    }
    function stopAuto() {
      if (autoTimer) window.clearInterval(autoTimer);
      autoTimer = 0;
    }

    function reduce() {
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }

    /* --- wiring --------------------------------------------------------- */
    root.addEventListener("click", function (e) {
      if (moved > 8) {
        e.preventDefault();
        e.stopPropagation();
        moved = 0;
      }
    }, true);

    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove, { passive: false });
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);
    root.addEventListener("pointerleave", function () { if (dragging) onUp(); });
    root.addEventListener("mouseenter", stopAuto);
    root.addEventListener("mouseleave", startAuto);
    root.addEventListener("focusin", stopAuto);
    root.addEventListener("focusout", startAuto);

    root.setAttribute("tabindex", "0");
    root.setAttribute("role", "region");
    root.setAttribute("aria-roledescription", "عجلة أعمال");
    root.setAttribute("aria-label", "عجلة أعمال AMK — استخدم الأسهم للتنقل");

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); startAuto(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); next(); startAuto(); }
      else if (e.key === "Home") { e.preventDefault(); goTo(0); }
      else if (e.key === "Escape") { stopAuto(); }
    });

    function bind(id, fn) {
      var el = $(id);
      if (el) el.addEventListener("click", fn);
    }
    bind("#wheelNext", function () { next(); startAuto(); });
    bind("#wheelPrev", function () { prev(); startAuto(); });
    bind("#wheelPlay", function () {
      paused = !paused;
      var btn = $("#wheelPlay");
      btn.setAttribute("aria-pressed", paused ? "true" : "false");
      btn.setAttribute("aria-label", paused ? "تشغيل الدوران التلقائي" : "إيقاف الدوران التلقائي");
      if (paused) stopAuto(); else startAuto();
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0] && entries[0].isIntersecting) { if (!paused) startAuto(); }
        else stopAuto();
      }, { threshold: 0.25 }).observe(root);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopAuto();
      else if (!paused) startAuto();
    });

    var resizeTimer;
    window.addEventListener("resize", function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(layout, 140);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(layout);
    }

    /* Reduced motion: lay the ring out, drop the entrance, never rotate. */
    if (reduce()) {
      layout();
      angle = 0;
      target = 0;
      ring.style.transition = "none";
      return;
    }

    layout();
    startAuto();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
