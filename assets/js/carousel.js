(function () {
  const carousel = document.querySelector("[data-carousel]");
  if (!carousel) return;

  const track = carousel.querySelector("[data-carousel-track]");
  const prevBtn = carousel.querySelector("[data-carousel-prev]");
  const nextBtn = carousel.querySelector("[data-carousel-next]");
  const dotsWrap = carousel.querySelector("[data-carousel-dots]");
  const AUTOPLAY_MS = 6000;

  let slides = [];
  let dots = [];
  let index = 0;
  let autoplayTimer = null;

  function render() {
    track.style.transform = `translateX(-${index * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
  }

  function goTo(i) {
    if (slides.length === 0) return;
    index = (i + slides.length) % slides.length;
    render();
    restartAutoplay();
  }

  function next() {
    goTo(index + 1);
  }

  function prev() {
    goTo(index - 1);
  }

  function restartAutoplay() {
    if (autoplayTimer) clearInterval(autoplayTimer);
    if (slides.length === 0) return;
    autoplayTimer = setInterval(next, AUTOPLAY_MS);
  }

  function initCarousel() {
    slides = Array.from(track.children);
    index = 0;

    dotsWrap.innerHTML = "";
    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Go to project ${i + 1}`);
      dot.addEventListener("click", () => goTo(i));
      dotsWrap.appendChild(dot);
    });
    dots = Array.from(dotsWrap.children);

    if (autoplayTimer) clearInterval(autoplayTimer);
    if (slides.length === 0) return;

    render();
    restartAutoplay();
  }

  nextBtn.addEventListener("click", next);
  prevBtn.addEventListener("click", prev);

  carousel.addEventListener("mouseenter", () => clearInterval(autoplayTimer));
  carousel.addEventListener("mouseleave", restartAutoplay);

  carousel.setAttribute("tabindex", "0");
  carousel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
  });

  // Touch / swipe support
  let touchStartX = null;
  track.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  track.addEventListener("touchend", (e) => {
    if (touchStartX === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 40) {
      delta < 0 ? next() : prev();
    }
    touchStartX = null;
  });

  window.PortfolioCarousel = { init: initCarousel };
})();
