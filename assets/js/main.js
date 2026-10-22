/* =========================================================
   AMK — Studio website interactions
   ========================================================= */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Safety net: never leave the page hidden if something breaks. */
  window.setTimeout(function () {
    document.body.classList.remove("preloading");
    var pre = $("#preloader");
    if (pre) pre.classList.add("is-done");
  }, 4200);

  document.addEventListener("DOMContentLoaded", function () {
    var body = document.body;

    /* ---------------------------------------------------
       1. Preloader
    --------------------------------------------------- */
    var preloader = $("#preloader");
    var preBar = $("#preloaderBar");
    var preCount = $("#preloaderCount");
    var progress = 0;
    var finished = false;

    function finishPreloader() {
      if (finished) return;
      finished = true;
      progress = 100;
      if (preBar) preBar.style.width = "100%";
      if (preCount) preCount.textContent = "100";
      window.setTimeout(function () {
        body.classList.remove("preloading");
        if (preloader) preloader.classList.add("is-done");
        body.classList.add("is-ready");
        window.setTimeout(function () {
          if (preloader && preloader.parentNode) preloader.parentNode.removeChild(preloader);
        }, 1100);
      }, 320);
    }

    var tick = window.setInterval(function () {
      progress += Math.random() * 9 + 3;
      if (progress > 94) progress = 94;
      if (preBar) preBar.style.width = progress + "%";
      if (preCount) preCount.textContent = progress < 10 ? "0" + Math.floor(progress) : String(Math.floor(progress));
    }, 110);

    window.setTimeout(finishPreloader, 1500);
    window.addEventListener("load", function () {
      window.clearInterval(tick);
      window.setTimeout(finishPreloader, 420);
    });

    /* ---------------------------------------------------
       2. Custom cursor
    --------------------------------------------------- */
    var cursor = $("#cursor");
    if (cursor && !prefersReduced) {
      var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      var tx = cx, ty = cy;
      var shown = false;
      document.addEventListener("mousemove", function (e) {
        tx = e.clientX; ty = e.clientY;
        if (!shown) { cursor.style.opacity = "1"; shown = true; }
      });
      (function loop() {
        cx += (tx - cx) * 0.18;
        cy += (ty - cy) * 0.18;
        cursor.style.transform = "translate(" + cx + "px," + cy + "px)";
        window.requestAnimationFrame(loop);
      })();

      var hoverables = "a, button, .chip, .work-card, .m-card, .step, .plan, input, select, textarea, .socials a";
      document.addEventListener("mouseover", function (e) {
        if (e.target.closest && e.target.closest(hoverables)) cursor.classList.add("is-hover");
      });
      document.addEventListener("mouseout", function (e) {
        if (e.target.closest && e.target.closest(hoverables)) cursor.classList.remove("is-hover");
      });
      document.addEventListener("mouseleave", function () { cursor.style.opacity = "0"; shown = false; });
    }

    /* ---------------------------------------------------
       3. Scroll progress + header state + active nav
    --------------------------------------------------- */
    var bar = $("#progressBar");
    var header = $("#siteHeader");
    var heroWatermark = $(".hero-watermark");
    var heroVisual = $(".hero-visual");
    var ticking = false;

    function onScroll() {
      var top = window.scrollY || window.pageYOffset;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.width = (h > 0 ? Math.min(top / h, 1) * 100 : 0) + "%";
      if (header) header.classList.toggle("is-stuck", top > 24);
      if (!prefersReduced) {
        if (heroWatermark) heroWatermark.style.transform = "translateY(calc(-50% + " + top * 0.18 + "px))";
        if (heroVisual) heroVisual.style.transform = "translateY(" + top * -0.055 + "px)";
      }
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
    onScroll();

    /* nav active link */
    var navLinks = $$(".nav-link");
    var sections = navLinks.map(function (a) { return { a: a, el: $(a.getAttribute("href")) }; }).filter(function (o) { return o.el; });
    if ("IntersectionObserver" in window && sections.length) {
      var navObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            navLinks.forEach(function (l) { l.classList.remove("is-active"); });
            var found = sections.filter(function (o) { return o.el === entry.target; })[0];
            if (found) found.a.classList.add("is-active");
          }
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      sections.forEach(function (o) { navObserver.observe(o.el); });
    }

    /* ---------------------------------------------------
       4. Mobile menu
    --------------------------------------------------- */
    var burger = $("#burger");
    var mobileMenu = $("#mobileMenu");

    function closeMenu() {
      if (!mobileMenu) return;
      mobileMenu.classList.remove("is-open");
      mobileMenu.setAttribute("aria-hidden", "true");
      if (burger) { burger.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); }
      body.classList.remove("is-locked");
    }
    if (burger && mobileMenu) {
      burger.addEventListener("click", function () {
        var open = !mobileMenu.classList.contains("is-open");
        mobileMenu.classList.toggle("is-open", open);
        mobileMenu.setAttribute("aria-hidden", open ? "false" : "true");
        burger.classList.toggle("is-open", open);
        burger.setAttribute("aria-expanded", open ? "true" : "false");
        body.classList.toggle("is-locked", open);
      });
      $$("a", mobileMenu).forEach(function (a) { a.addEventListener("click", closeMenu); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
      window.addEventListener("resize", function () { if (window.innerWidth > 1100) closeMenu(); });
    }

    /* ---------------------------------------------------
       5. Reveal on scroll
    --------------------------------------------------- */
    var revealEls = $$(".reveal, [data-reveal], .step, .plan, .m-card, .slide, .work-card");
    revealEls.forEach(function (el) {
      if (el.hasAttribute("data-delay")) el.style.transitionDelay = el.getAttribute("data-delay") + "ms";
    });
    if ("IntersectionObserver" in window && !prefersReduced) {
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add("is-in"); });
    }

    /* ---------------------------------------------------
       6. Counters
    --------------------------------------------------- */
    var counters = $$(".count");
    function animateCount(el) {
      var target = parseFloat(el.getAttribute("data-count") || "0");
      var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
      var duration = 1600;
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals);
        if (p < 1) window.requestAnimationFrame(step);
        else el.textContent = target.toFixed(decimals);
      }
      window.requestAnimationFrame(step);
    }
    if ("IntersectionObserver" in window && !prefersReduced) {
      var co = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { animateCount(entry.target); obs.unobserve(entry.target); }
        });
      }, { threshold: 0.6 });
      counters.forEach(function (c) { co.observe(c); });
    } else {
      counters.forEach(function (c) { c.textContent = c.getAttribute("data-count"); });
    }

    /* ---------------------------------------------------
       7. Tilt
    --------------------------------------------------- */
    var tilt = $("[data-tilt]");
    if (tilt && !prefersReduced && window.matchMedia("(hover: hover)").matches) {
      var parent = tilt.parentElement;
      parent.addEventListener("mousemove", function (e) {
        var r = parent.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.transform = "rotateX(" + (py * -10) + "deg) rotateY(" + (px * 14) + "deg) rotateZ(" + (px * -3) + "deg)";
      });
      parent.addEventListener("mouseleave", function () {
        tilt.style.transform = "";
      });
    }

    /* ---------------------------------------------------
       8. Magnetic buttons
    --------------------------------------------------- */
    if (!prefersReduced && window.matchMedia("(hover: hover)").matches) {
      $$(".magnetic").forEach(function (btn) {
        var strength = parseFloat(btn.getAttribute("data-strength") || "16");
        btn.addEventListener("mousemove", function (e) {
          var r = btn.getBoundingClientRect();
          var x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
          var y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
          btn.style.transform = "translate(" + x * strength + "px," + y * strength * 0.7 + "px)";
        });
        btn.addEventListener("mouseleave", function () { btn.style.transform = ""; });
      });
    }

    /* ---------------------------------------------------
       9. Work filters
    --------------------------------------------------- */
    var filters = $("#filters");
    var workCards = $$("#workGrid .work-card");
    if (filters && workCards.length) {
      $$(".chip", filters).forEach(function (btn) {
        btn.addEventListener("click", function () {
          $$(".chip", filters).forEach(function (b) {
            b.classList.remove("is-active");
            b.setAttribute("aria-selected", "false");
          });
          btn.classList.add("is-active");
          btn.setAttribute("aria-selected", "true");
          var f = btn.getAttribute("data-filter");
          workCards.forEach(function (card) {
            var match = f === "all" || card.getAttribute("data-cat") === f;
            if (match) {
              card.classList.remove("is-hidden");
              window.requestAnimationFrame(function () { card.classList.remove("is-filtering"); });
            } else {
              card.classList.add("is-filtering");
              window.setTimeout(function () {
                if (card.classList.contains("is-filtering")) card.classList.add("is-hidden");
              }, 260);
            }
          });
        });
      });
    }

    /* ---------------------------------------------------
       10. Accordions
    --------------------------------------------------- */
    $$(".accordion").forEach(function (acc) {
      $$(".acc-head", acc).forEach(function (head) {
        head.addEventListener("click", function () {
          var item = head.parentElement;
          var isOpen = item.classList.contains("is-open");
          $$(".acc-item", acc).forEach(function (it) {
            it.classList.remove("is-open");
            var b = $(".acc-head", it);
            if (b) b.setAttribute("aria-expanded", "false");
          });
          if (!isOpen) {
            item.classList.add("is-open");
            head.setAttribute("aria-expanded", "true");
          }
        });
      });
    });

    /* ---------------------------------------------------
       11. Testimonials slider
    --------------------------------------------------- */
    var track = $("#sliderTrack");
    var sliderEl = $("#slider");
    var dotsWrap = $("#sliderDots");
    if (track && sliderEl) {
      var slides = $$(".slide", track);
      var index = 0;
      var autoplay = null;

      function perView() { return window.innerWidth <= 900 ? 1 : 2; }
      function maxIndex() { return Math.max(0, slides.length - perView()); }
      function slideWidth() {
        if (!slides.length) return 0;
        return slides[0].getBoundingClientRect().width + 20;
      }
      function render() {
        var pv = perView();
        var mi = Math.max(0, slides.length - pv);
        if (index > mi) index = mi;
        track.style.transform = "translateX(" + index * slideWidth() + "px)";
        if (dotsWrap) {
          $$("button", dotsWrap).forEach(function (d, i) { d.classList.toggle("is-active", i === index); });
        }
      }
      function buildDots() {
        if (!dotsWrap) return;
        dotsWrap.innerHTML = "";
        var total = maxIndex() + 1;
        for (var i = 0; i < total; i++) {
          var b = document.createElement("button");
          b.type = "button";
          b.setAttribute("aria-label", "الشهادة رقم " + (i + 1));
          b.addEventListener("click", function (i) {
            return function () { index = i; render(); restart(); };
          }(i));
          dotsWrap.appendChild(b);
        }
        render();
      }
      function next() { index = index >= maxIndex() ? 0 : index + 1; render(); }
      function prev() { index = index <= 0 ? maxIndex() : index - 1; render(); }

      function start() {
        if (prefersReduced) return;
        stop();
        autoplay = window.setInterval(next, 6000);
      }
      function stop() { if (autoplay) { window.clearInterval(autoplay); autoplay = null; } }
      function restart() { stop(); start(); }

      $("#nextSlide").addEventListener("click", function () { next(); restart(); });
      $("#prevSlide").addEventListener("click", function () { prev(); restart(); });
      sliderEl.addEventListener("mouseenter", stop);
      sliderEl.addEventListener("mouseleave", start);

      /* touch / drag */
      var startX = null, startY = null, dragging = false;
      track.addEventListener("touchstart", function (e) {
        startX = e.touches[0].clientX; startY = e.touches[0].clientY; dragging = true; stop();
      }, { passive: true });
      track.addEventListener("touchend", function (e) {
        if (!dragging || startX === null) return;
        var dx = e.changedTouches[0].clientX - startX;
        var dy = e.changedTouches[0].clientY - startY;
        dragging = false;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0) next(); else prev();
        }
        start();
      }, { passive: true });

      var resizeTimer;
      window.addEventListener("resize", function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(function () { buildDots(); }, 160);
      });
      buildDots();
      start();
    }

    /* ---------------------------------------------------
       12. Toast
    --------------------------------------------------- */
    var toast = $("#toast");
    var toastText = $("#toastText");
    var toastTimer;
    function showToast(msg) {
      if (!toast) return;
      if (toastText) toastText.textContent = msg;
      toast.classList.add("is-visible");
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(function () { toast.classList.remove("is-visible"); }, 4200);
    }

    /* ---------------------------------------------------
       13. Forms
    --------------------------------------------------- */
    var form = $("#contactForm");
    function setError(input, message) {
      var field = input.closest(".field");
      if (!field) return;
      var err = $(".error", field);
      if (message) {
        field.classList.add("has-error");
        if (err) err.textContent = message;
      } else {
        field.classList.remove("has-error");
        if (err) err.textContent = "";
      }
    }
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (form) {
      var nameIn = $("#name", form), emailIn = $("#email", form), msgIn = $("#message", form);
      [nameIn, emailIn, msgIn].forEach(function (input) {
        if (!input) return;
        input.addEventListener("input", function () { setError(input, ""); });
      });

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var ok = true;
        if (!nameIn.value.trim() || nameIn.value.trim().length < 2) { setError(nameIn, "اكتب اسمك الكامل من فضلك."); ok = false; }
        if (!emailRe.test(emailIn.value.trim())) { setError(emailIn, "الإيميل مش صحيح — جرّب تاني."); ok = false; }
        if (msgIn.value.trim().length < 10) { setError(msgIn, "اكتب سطرين على الأقل عن فكرتك."); ok = false; }
        if (!ok) { showToast("فيه بيانات ناقصة ✦ راجع الحقول المعلّمة."); return; }

        var btn = $("button[type='submit']", form);
        var label = $("span", btn);
        var original = label.textContent;
        label.textContent = "بيتبعت...";
        btn.disabled = true;

        var payload = {
          name: nameIn.value.trim(),
          email: emailIn.value.trim(),
          budget: $("#budget", form).value,
          service: $("#service", form).value,
          message: msgIn.value.trim(),
          at: new Date().toISOString()
        };

        window.setTimeout(function () {
          try {
            var box = JSON.parse(window.localStorage.getItem("amk_briefs") || "[]");
            box.push(payload);
            window.localStorage.setItem("amk_briefs", JSON.stringify(box));
          } catch (err) { /* ignore storage issues */ }
          label.textContent = original;
          btn.disabled = false;
          form.reset();
          showToast("وصلنا بريفك ✦ هنرد عليك في أقل من ٢٤ ساعة.");
        }, 950);
      });
    }

    var newsForm = $("#newsForm");
    if (newsForm) {
      newsForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = $("input", newsForm);
        var msg = $("#newsMsg");
        if (!emailRe.test(input.value.trim())) {
          if (msg) { msg.textContent = "اكتب إيميل صحيح."; msg.style.color = "var(--accent-2)"; }
          input.focus();
          return;
        }
        if (msg) { msg.textContent = "تم ✦ أول رسالة هتوصلك أول الشهر."; msg.style.color = "var(--accent)"; }
        input.value = "";
      });
    }

    /* ---------------------------------------------------
       14. Theme toggle
    --------------------------------------------------- */
    var themeBtn = $("#themeToggle");
    var root = document.documentElement;
    var storedTheme = null;
    try { storedTheme = window.localStorage.getItem("amk_theme"); } catch (err) {}
    if (storedTheme === "light" || storedTheme === "dark") root.setAttribute("data-theme", storedTheme);
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        var nextTheme = root.getAttribute("data-theme") === "light" ? "dark" : "light";
        root.setAttribute("data-theme", nextTheme);
        try { window.localStorage.setItem("amk_theme", nextTheme); } catch (err) {}
        showToast(nextTheme === "light" ? "الوضع النهاري ☀" : "الوضع الليلي ☾");
      });
    }

    /* ---------------------------------------------------
       15. Local time (Cairo)
    --------------------------------------------------- */
    var timeEl = $("#localTime");
    function renderTime() {
      if (!timeEl) return;
      try {
        var t = new Intl.DateTimeFormat("ar-EG", {
          timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit", hour12: false
        }).format(new Date());
        timeEl.textContent = "القاهرة الآن — " + t;
      } catch (err) {
        timeEl.textContent = "";
      }
    }
    renderTime();
    window.setInterval(renderTime, 30000);

    /* ---------------------------------------------------
       16. Misc
    --------------------------------------------------- */
    var yearEl = $("#year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* Smooth anchor offset for older browsers */
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (!id || id === "#") return;
        var target = $(id);
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.pageYOffset - (window.innerWidth > 1100 ? 78 : 66);
        window.scrollTo({ top: top, behavior: prefersReduced ? "auto" : "smooth" });
        history.replaceState(null, "", id);
      });
    });
  });
})();
