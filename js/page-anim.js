/**
 * Page-wide reveal animations (no framework).
 * Uses IntersectionObserver for smooth fade/slide-in.
 * Add class "reveal" to any element you want animated.
 * Optional: add data-reveal="fast|slow" and data-reveal-delay="120".
 */
(() => {
  const els = Array.from(document.querySelectorAll('.reveal'));
  if (!els.length) return;

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    els.forEach(el => el.classList.add('reveal-in'));
    return;
  }

  const obs = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      const delay = Number(el.getAttribute('data-reveal-delay') || '0');
      const speed = el.getAttribute('data-reveal') || 'normal';
      el.style.setProperty('--reveal-delay', `${delay}ms`);
      el.style.setProperty('--reveal-dur', speed === 'fast' ? '520ms' : speed === 'slow' ? '820ms' : '650ms');
      el.classList.add('reveal-in');
      obs.unobserve(el);
    }
  }, { threshold: 0.12 });

  els.forEach(el => obs.observe(el));
})();
