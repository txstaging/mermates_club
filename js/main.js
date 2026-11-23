(function () {
  "use strict";

  var toggle = document.querySelector(".nav__toggle");
  var menu = document.getElementById("nav-links");

  /* Mobile / tablet menu */
  function setMenu(open) {
    menu.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  }

  toggle.addEventListener("click", function () {
    setMenu(toggle.getAttribute("aria-expanded") !== "true");
  });

  menu.addEventListener("click", function (event) {
    if (event.target.closest("a")) setMenu(false);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      toggle.focus();
    }
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".nav")) setMenu(false);
  });

  /* Course cards: collapse the description and add a "show more" toggle */
  /* The bullet list and the description are wrapped together, so only the first
     four lines of the card's text show until "عرض المزيد" is pressed. */
  document.querySelectorAll(".course__body").forEach(function (body, index) {
    var details = body.querySelector(".course__details");
    var text = body.querySelector(".course__desc");
    if (!details || !text) return;
    var desc = document.createElement("div");
    var button = document.createElement("button");
    desc.className = "course__collapse is-clamped";
    desc.id = "course-more-" + (index + 1);
    body.insertBefore(desc, details);
    desc.appendChild(details);
    desc.appendChild(text);
    button.type = "button";
    button.className = "course__more";
    button.textContent = "عرض المزيد";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", desc.id);
    button.addEventListener("click", function () {
      var expanded = button.getAttribute("aria-expanded") === "true";
      desc.classList.toggle("is-clamped", expanded);
      button.setAttribute("aria-expanded", String(!expanded));
      button.textContent = expanded ? "عرض المزيد" : "عرض أقل";
    });
    desc.insertAdjacentElement("afterend", button);
    /* No toggle needed when the whole text already fits in four lines */
    function sync() {
      if (desc.classList.contains("is-clamped")) {
        button.hidden = desc.scrollHeight <= desc.clientHeight + 1;
      }
    }
    sync();
    window.addEventListener("load", sync);
    window.addEventListener("resize", sync);
  });

  /* Tablet / mobile: the video strip scrolls sideways — start it on the middle video */
  var strip = document.querySelector(".hero__strip");
  function centerStrip() {
    if (strip.scrollWidth > strip.clientWidth) {
      strip.scrollLeft = (strip.scrollWidth - strip.clientWidth) / 2;
    }
  }
  centerStrip();
  window.addEventListener("load", centerStrip);

  /* Slider dots: one per video; the dot of the video nearest the centre is active */
  var slides = Array.prototype.slice.call(strip.querySelectorAll(".hero__photo"));
  var dotsBox = document.querySelector(".hero__dots");
  var dots = slides.map(function (slide, index) {
    var dot = document.createElement("button");
    dot.type = "button";
    dot.className = "hero__dot";
    dot.setAttribute("aria-label", "الفيديو " + (index + 1));
    dot.addEventListener("click", function () {
      var target = slide.offsetLeft + slide.offsetWidth / 2 - strip.clientWidth / 2;
      strip.scrollTo({ left: target, behavior: "smooth" });
    });
    dotsBox.appendChild(dot);
    return dot;
  });

  function updateDots() {
    var centre = strip.scrollLeft + strip.clientWidth / 2;
    var active = 0;
    var best = Infinity;
    slides.forEach(function (slide, index) {
      var distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - centre);
      if (distance < best) { best = distance; active = index; }
    });
    dots.forEach(function (dot, index) {
      dot.setAttribute("aria-current", String(index === active));
    });
  }

  strip.addEventListener("scroll", updateDots, { passive: true });
  window.addEventListener("resize", updateDots);
  window.addEventListener("load", updateDots);
  updateDots();

  /* Auto-advance the slider every 40 seconds (tablet / mobile only, where the strip scrolls).
     The countdown restarts whenever the visitor swipes or taps a dot. */
  var AUTO_ADVANCE_MS = 40000;
  var autoTimer = null;

  function goToSlide(index) {
    var slide = slides[index];
    strip.scrollTo({ left: slide.offsetLeft + slide.offsetWidth / 2 - strip.clientWidth / 2, behavior: "smooth" });
  }

  function nextSlide() {
    if (strip.scrollWidth <= strip.clientWidth || document.hidden) return;
    var active = dots.findIndex(function (dot) { return dot.getAttribute("aria-current") === "true"; });
    goToSlide((active + 1) % slides.length);
  }

  function restartAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(nextSlide, AUTO_ADVANCE_MS);
  }

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    restartAuto();
    strip.addEventListener("pointerdown", restartAuto, { passive: true });
    strip.addEventListener("touchstart", restartAuto, { passive: true });
    dotsBox.addEventListener("click", restartAuto);
  }

  /* Background videos: stay on the cover image when the visitor prefers reduced motion */
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.querySelectorAll("video[autoplay]").forEach(function (video) {
      video.removeAttribute("autoplay");
      video.pause();
    });
  }

  /* Highlight the nav link of the section currently in view */
  var links = Array.prototype.slice.call(menu.querySelectorAll('a[href^="#"]'));
  var sections = links
    .map(function (link) { return document.querySelector(link.getAttribute("href")); })
    .filter(Boolean);

  function updateActive() {
    var line = window.scrollY + window.innerHeight * 0.35;
    var current = sections[0];
    sections.forEach(function (section) {
      if (section.offsetTop <= line) current = section;
    });
    links.forEach(function (link) {
      link.classList.toggle("is-active", link.getAttribute("href") === "#" + current.id);
    });
  }

  window.addEventListener("scroll", updateActive, { passive: true });
  window.addEventListener("resize", updateActive);
  updateActive();
})();
