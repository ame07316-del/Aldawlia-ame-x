/* =========================================================================
   AMK — scroll choreography
   One rAF loop, cached geometry, transform/opacity only.

   Effects
   1. Hero outro            — the hole zooms, the copy lifts, the shade closes
   2. Word reveal           — headings type themselves in, word by word
   3. Media curtain         — work images unroll through a clip-path
   4. Parallax              — work imagery drifts slower than the page
   5. Process rail          — a progress rail fills; steps light up as crossed
   6. Highlighter sweep     — the quote marker paints itself
   7. Velocity marquee      — the ticker speeds up while you scroll
   8. Sticky CTA            — appears after the hero, leaves before contact
   9. Readouts              — scroll percentage in the hero meta

   Nothing here runs when the reader asks for reduced motion: the page is
   rendered in its final state and this file exits before it touches the DOM.
   ========================================================================= */
(function () {
  "use strict";

  var docEl = document.documentElement;
  var reduceMQ = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var reduced = !!(reduceMQ && reduceMQ.matches);

  /* Reduced motion (or no observers): render the final state and leave. */
  if (reduced || !("IntersectionObserver" in window)) {
    docEl.classList.add("motion-off");
    var allWords = document.querySelectorAll("[data-words]");
    for (var w = 0; w < allWords.length; w++) allWords[w].classList.add("is-in");
    return;
  }
  docEl.classList.add("motion-on");

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  var vh = window.innerHeight;
  var vw = window.innerWidth;
  var scrollY = window.pageYOffset || docEl.scrollTop;

  /* ---------------------------------------------------------------------
     Registry of things that move with the page.
     Each entry caches its document offset so the frame loop never calls
     getBoundingClientRect — the layout is measured on refresh only.
  --------------------------------------------------------------------- */
  var movers = [];   // { el, kind, speed, top, height, tag }
  var heroEl = null;
  var heroCopy = null;
  var heroStrip = null;
  var heroMeta = null;
  var heroStage = null;
  var stepsEl = null;
  var stepEls = [];
  var stepTops = [];
  var miniCta = null;
  var pctEl = null;
  var contactEl = null;
  var contactTop = Infinity;

  function measure(el) {
    var r = el.getBoundingClientRect();
    return { top: r.top + (window.pageYOffset || docEl.scrollTop), height: r.height, width: r.width };
  }

  function refresh() {
    vh = window.innerHeight;
    vw = window.innerWidth;
    scrollY = window.pageYOffset || docEl.scrollTop;

    movers.forEach(function (m) {
      var box = measure(m.el);
      m.top = box.top;
      m.height = box.height;
    });

    if (heroEl) {
      var hb = measure(heroEl);
      heroTop = hb.top;
      heroHeight = Math.max(1, hb.height);
    }

    stepTops = stepEls.map(function (el) { return measure(el).top; });
    if (contactEl) contactTop = measure(contactEl).top;
    if (stepsEl) {
      var sb = measure(stepsEl);
      stepsTop = sb.top;
      stepsHeight = Math.max(1, sb.height);
    }
  }

  var heroTop = 0;
  var heroHeight = 1;
  var stepsTop = 0;
  var stepsHeight = 1;

  /* --------------------------------------------------------------------- 1 */
  function initHero() {
    heroEl = $("#hero");
    if (!heroEl) return;
    heroCopy = $(".hero-copy", heroEl);
    heroStrip = $(".hero-strip", heroEl);
    heroMeta = $$(".hero-meta", heroEl);
    heroStage = $("[data-blackhole]", heroEl);
    pctEl = $("#scrollPct");
  }

  function paintHero() {
    if (!heroEl) return;
    var p = clamp(scrollY / (heroHeight * 0.86), 0, 1);
    if (heroCopy) {
      heroCopy.style.transform = "translate3d(0," + (-p * 90).toFixed(2) + "px,0)";
      heroCopy.style.opacity = String(clamp(1 - p * 1.18, 0, 1));
    }
    if (heroStrip) {
      heroStrip.style.transform = "translate3d(0," + (-p * 40).toFixed(2) + "px,0)";
      heroStrip.style.opacity = String(clamp(1 - p * 1.1, 0, 1));
    }
    if (heroStage) {
      heroStage.style.transform = "scale(" + (1 + p * 0.16).toFixed(4) + ")";
      heroStage.style.opacity = String(clamp(1 - p * 0.9, 0.08, 1));
    }
    for (var i = 0; i < heroMeta.length; i++) {
      heroMeta[i].style.opacity = String(clamp(1 - p * 2.2, 0, 1));
    }
    if (pctEl) {
      var full = Math.max(docEl.scrollHeight, document.body ? document.body.scrollHeight : 0);
      var page = full - vh;
      var pct = page > 0 ? clamp(scrollY / page, 0, 1) : 0;
      pctEl.textContent = ("00" + Math.round(pct * 100)).slice(-3) + "%";
    }
  }

  /* --------------------------------------------------------------------- 4 */
  function initParallax() {
    $$("[data-parallax]").forEach(function (el) {
      var speed = parseFloat(el.getAttribute("data-parallax")) || 0.12;
      movers.push({ el: el, kind: "y", speed: speed, top: 0, height: 0 });
    });
  }

  function paintMover(m) {
    var mid = m.top + m.height / 2;
    var delta = mid - (scrollY + vh / 2);
    /* The media bleeds 8% top and bottom; stay well inside it. */
    var limit = Math.min(90, m.height * 0.06);
    var off = clamp(delta * m.speed, -limit, limit);
    m.el.style.transform = "translate3d(0," + off.toFixed(2) + "px,0)";
  }

  /* --------------------------------------------------------------------- 5 */
  function initSteps() {
    stepsEl = $("[data-steps]");
    if (!stepsEl) return;
    stepEls = $$(".step", stepsEl);
  }

  function paintSteps() {
    if (!stepsEl || !stepEls.length) return;
    var travel = (scrollY + vh * 0.62 - stepsTop) / stepsHeight;
    var rail = clamp(travel, 0, 1);
    stepsEl.style.setProperty("--rail", rail.toFixed(4));
    for (var i = 0; i < stepEls.length; i++) {
      var on = scrollY + vh * 0.62 > stepTops[i] + 10;
      if (on !== stepEls[i].classList.contains("is-on")) {
        stepEls[i].classList.toggle("is-on", on);
      }
    }
  }

  /* --------------------------------------------------------------------- 8 */
  function initMiniCta() {
    miniCta = $("#miniCta");
    contactEl = $("#contact");
  }

  function paintMiniCta() {
    if (!miniCta) return;
    var pastHero = scrollY > heroHeight * 0.72;
    var nearEnd = scrollY + vh * 0.9 > contactTop;
    var show = pastHero && !nearEnd;
    if (show !== miniCta.classList.contains("is-visible")) {
      miniCta.classList.toggle("is-visible", show);
    }
  }

  /* --------------------------------------------------------------------- 7 */
  function initMarquee() {
    var track = $(".ticker-track");
    if (!track || !track.getAnimations) return;
    var anims = track.getAnimations();
    if (!anims.length) return;
    var anim = anims[0];
    anim.playbackRate = 1;
    return function (speed) {
      anim.playbackRate = 1 + clamp(speed * 9, 0, 3.4);
    };
  }

  /* --------------------------------------------------------------------- 2 */
  /* Wrap words in spans without disturbing any inline markup. */
  function splitWords(root) {
    var textNodes = [];
    (function walk(node) {
      for (var i = 0; i < node.childNodes.length; i++) {
        var child = node.childNodes[i];
        if (child.nodeType === 3) textNodes.push(child);
        else if (child.nodeType === 1 && child.tagName !== "BR" && child.tagName !== "svg") walk(child);
      }
    })(root);

    textNodes.forEach(function (node) {
      var parts = node.nodeValue.split(/(\s+)/);
      var frag = document.createDocumentFragment();
      parts.forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
          return;
        }
        var span = document.createElement("span");
        span.className = "w";
        span.textContent = part;
        frag.appendChild(span);
      });
      node.parentNode.replaceChild(frag, node);
    });
  }

  function initWords() {
    var heads = $$("[data-words]");
    heads.forEach(function (head) {
      if (head.hasAttribute("data-split")) return;
      head.setAttribute("data-split", "");
      splitWords(head);
      var words = $$(".w", head);
      words.forEach(function (word, i) {
        word.style.transitionDelay = Math.min(i * 26, 420) + "ms";
      });
      head.classList.add("words-ready");

      /* Anything already on screen at boot renders straight away — splitting
         must never look like a blink. */
      var box = head.getBoundingClientRect();
      if (box.top < vh * 0.92 && box.bottom > 0) {
        head.classList.add("is-in", "is-settled");
      }
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
        window.setTimeout(function () {
          entry.target.classList.add("is-settled");
        }, 1600);
      });
    }, { threshold: 0.22, rootMargin: "0px 0px -8% 0px" });
    heads.forEach(function (h) { io.observe(h); });

    /* Nothing stays hidden because a callback never fired. */
    window.setTimeout(function () {
      heads.forEach(function (h) { h.classList.add("is-in"); });
    }, 4000);
  }

  /* --------------------------------------------------------------------- 3 */
  function initCurtains() {
    var els = $$("[data-mask]");
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-open");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -10% 0px" });
    els.forEach(function (el) { io.observe(el); });
    window.setTimeout(function () {
      els.forEach(function (el) { el.classList.add("is-open"); });
    }, 4000);
  }

  /* --------------------------------------------------------------------- loop */
  var raf = 0;
  var lastActivity = 0;
  var lastY = scrollY;
  var smoothSpeed = 0;
  var marqueeSpeed = null;
  var running = false;

  function frame(now) {
    if (document.hidden) {
      running = false;
      return;
    }
    var y = window.pageYOffset || docEl.scrollTop;
    var dy = y - lastY;
    lastY = y;
    scrollY = y;

    var instant = Math.min(Math.abs(dy), 120) / Math.max(1, vh) * 10;
    smoothSpeed += (instant - smoothSpeed) * 0.18;

    paintHero();
    for (var i = 0; i < movers.length; i++) paintMover(movers[i]);
    paintSteps();
    paintMiniCta();
    if (marqueeSpeed) marqueeSpeed(smoothSpeed);

    if (docEl.scrollHeight <= vh) { /* short pages never animate the hero */ }

    var idle = now - lastActivity > 520 && smoothSpeed < 0.02;
    if (idle) {
      running = false;
      if (marqueeSpeed) marqueeSpeed(0);
      return;
    }
    raf = window.requestAnimationFrame(frame);
  }

  function kick() {
    lastActivity = performance.now ? performance.now() : Date.now();
    if (running || document.hidden) return;
    running = true;
    lastY = window.pageYOffset || docEl.scrollTop;
    raf = window.requestAnimationFrame(frame);
  }

  /* --------------------------------------------------------------------- boot */
  var booted = false;

  function boot() {
    if (booted) return;
    booted = true;
    initHero();
    initParallax();
    initSteps();
    initMiniCta();
    marqueeSpeed = initMarquee();
    initWords();
    initCurtains();
    refresh();
    paintHero();
    movers.forEach(paintMover);
    paintSteps();
    paintMiniCta();

    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", function () {
      refresh();
      kick();
    }, { passive: true });

    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(function () { refresh(); kick(); });
      ro.observe(document.body);
    }

    window.addEventListener("load", function () { refresh(); kick(); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { refresh(); kick(); });
    }
    window.addEventListener("orientationchange", function () {
      window.setTimeout(function () { refresh(); kick(); }, 260);
    });

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) { refresh(); kick(); }
    });

    /* main.js re-renders the work grid when filtering — geometry moves. */
    document.addEventListener("amk:layout", function () { refresh(); kick(); });

    kick();
  }

  /* Public hook so other scripts can ask for fresh measurements. */
  window.AMKScroll = {
    refresh: function () { refresh(); kick(); },
    stop: function () {
      running = false;
      window.cancelAnimationFrame(raf);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
