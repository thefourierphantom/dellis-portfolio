/* ═══════════════════════════════════════════════════════════════
   ELLIS COMMAND ENVIRONMENT — shared runtime
   cursor system · top nav · transitions · utilities
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const doc = document;
  const CE = window.CE = window.CE || {};

  /* ── device capability ─────────────────────────────────── */
  CE.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  CE.touch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  CE.dpr = Math.min(window.devicePixelRatio || 1, 2);
  CE.lowPower = CE.touch || (navigator.hardwareConcurrency || 8) <= 4;
  if (CE.reducedMotion) doc.documentElement.classList.add('rm');

  const PAGE = (doc.currentScript && doc.currentScript.dataset.page) || 'home';

  /* ── audio stub (site is silent for now) ───────────────── */
  CE.audio = { on: false, tick() {}, blip() {}, confirm() {}, deny() {}, sweep() {}, tone() {} };

  /* ── text scramble utility ─────────────────────────────── */
  const GLYPHS = '▓▒░<>/\\|=+*#01∆Σπ§';
  CE.scramble = function (el, finalText, opts) {
    opts = opts || {};
    const dur = opts.duration || 900;
    if (CE.reducedMotion || !el) { if (el) el.textContent = finalText; if (opts.onDone) opts.onDone(); return; }
    const len = finalText.length;
    const start = performance.now();
    let raf;
    (function frame(now) {
      const p = Math.min((now - start) / dur, 1);
      const solved = Math.floor(p * len);
      let out = '';
      for (let i = 0; i < len; i++) {
        if (i < solved || finalText[i] === ' ') out += finalText[i];
        else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) raf = requestAnimationFrame(frame);
      else { el.textContent = finalText; if (opts.onDone) opts.onDone(); }
    })(start);
    return () => cancelAnimationFrame(raf);
  };

  /* ── DOM injection: cursor + wipe ──────────────────────── */
  function injectChrome() {
    if (!CE.touch && !CE.reducedMotion) {
      const cur = doc.createElement('div');
      cur.id = 'cur';
      cur.innerHTML = '<div class="cur-ring"></div><div class="cur-dot"></div>' +
        '<div class="cur-tick t-n"></div><div class="cur-tick t-s"></div>' +
        '<div class="cur-tick t-w"></div><div class="cur-tick t-e"></div>' +
        '<div class="cur-label"></div><div class="cur-xy"></div>';
      doc.body.appendChild(cur);
      doc.body.classList.add('no-cursor');
      initCursor(cur);
    }
    const wipe = doc.createElement('div');
    wipe.id = 'wipe';
    wipe.innerHTML = '<div class="wipe-panel"></div><div class="wipe-scan"></div><div class="wipe-label">ROUTING…</div>';
    doc.body.appendChild(wipe);
  }

  /* ── cursor system ─────────────────────────────────────── */
  function initCursor(cur) {
    const label = cur.querySelector('.cur-label');
    const xy = cur.querySelector('.cur-xy');
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    let pmx = mx, pmy = my, vis = false;

    doc.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      if (!vis) { vis = true; cx = mx; cy = my; cur.classList.remove('c-hidden'); }
    });
    doc.addEventListener('mouseleave', () => { vis = false; cur.classList.add('c-hidden'); });
    doc.addEventListener('mousedown', () => cur.classList.add('c-down'));
    doc.addEventListener('mouseup', () => cur.classList.remove('c-down'));

    let frame = 0;
    (function loop() {
      // schedule FIRST and guard the body — nothing may ever kill this loop
      requestAnimationFrame(loop);
      if (doc.hidden) return;
      try {
        cx += (mx - cx) * 0.22;
        cy += (my - cy) * 0.22;
        const vx = mx - pmx, vy = my - pmy;
        pmx += vx * 0.2; pmy += vy * 0.2;
        const sp = Math.min(Math.hypot(vx, vy) / 40, 1);
        const ang = Math.atan2(vy, vx) * 180 / Math.PI;
        cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
        const ring = cur.firstElementChild;
        if (!cur.classList.contains('c-hover') && !cur.classList.contains('c-text')) {
          ring.style.transform = 'rotate(' + ang + 'deg) scaleX(' + (1 + sp * 0.35) + ')';
        } else ring.style.transform = '';
        if ((frame++ & 7) === 0) xy.textContent = String(Math.round(cx)).padStart(4, '0') + ' / ' + String(Math.round(cy)).padStart(4, '0');
      } catch (e) {}
    })();

    function stateFor(el) {
      const t = el.closest('[data-cursor]');
      if (t) return { s: t.dataset.cursor, l: t.dataset.cursorLabel || '' };
      const i = el.closest('a,button,[role="button"],summary,input[type="range"]');
      if (i) {
        const lbl = el.closest('[data-cursor-label]');
        return { s: 'hover', l: lbl ? lbl.dataset.cursorLabel : 'OPEN' };
      }
      return null;
    }
    doc.addEventListener('mouseover', e => {
      const st = stateFor(e.target);
      cur.classList.remove('c-hover', 'c-drag', 'c-text');
      if (st) {
        cur.classList.add('c-' + (st.s === 'hover' ? 'hover' : st.s));
        if (st.s !== 'text') { label.textContent = st.l; if (st.l) cur.classList.add('c-hover'); }
      }
    });
  }

  /* ── magnetic elements ─────────────────────────────────── */
  CE.magnetize = function (root) {
    if (CE.touch || CE.reducedMotion) return;
    (root || doc).querySelectorAll('[data-magnetic]').forEach(el => {
      const strength = parseFloat(el.dataset.magnetic) || 0.3;
      const R = 90;
      let raf = null, tx = 0, ty = 0, x = 0, y = 0;
      function step() {
        x += (tx - x) * 0.18; y += (ty - y) * 0.18;
        el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        if (Math.abs(tx - x) > 0.2 || Math.abs(ty - y) > 0.2) raf = requestAnimationFrame(step);
        else raf = null;
      }
      doc.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy);
        const inRange = d < R + Math.max(r.width, r.height) / 2;
        tx = inRange ? dx * strength : 0;
        ty = inRange ? dy * strength : 0;
        if (!raf) raf = requestAnimationFrame(step);
      }, { passive: true });
    });
  };

  /* ── top navigation (classic layout, command styling) ──── */
  const LINKS = [
    { href: 'index.html',    name: 'Home',           key: 'home' },
    { href: 'about.html',    name: 'About',          key: 'about' },
    { href: 'projects.html', name: 'Ellis Dynamics', key: 'ed' },
    { href: 'resume.html',   name: 'Resume',         key: 'resume', cta: true }
  ];

  function injectNav() {
    const nav = doc.createElement('header');
    nav.className = 'cmd-nav';
    let links = '';
    LINKS.forEach(l => {
      links += '<a href="' + l.href + '" data-route class="' +
        (l.cta ? 'nav-cta' : '') + (l.key === PAGE ? ' active' : '') + '">' + l.name + '</a>';
    });
    nav.innerHTML =
      '<a class="cmd-brand" href="index.html" data-route>' +
      '<svg class="brand-bolt" viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 1.5 L4.5 13.5 h5.4 L8.7 22.5 L19.5 9.5 h-6.2 Z" fill="var(--red)"/></svg>' +
      '<span class="cmd-brand-txt"><span class="cmd-brand-name">Dontavious Ellis</span>' +
      '<span class="cmd-brand-sub">EE · Countermeasure Systems</span></span></a>' +
      '<nav class="cmd-links" aria-label="Primary">' + links + '</nav>';
    doc.body.prepend(nav);
  }

  /* ── page transition wipe ──────────────────────────────── */
  function routeTo(href) {
    const wipe = doc.getElementById('wipe');
    if (!wipe || CE.reducedMotion || !window.gsap) { location.href = href; return; }
    wipe.style.visibility = 'visible';
    const tl = gsap.timeline({ onComplete: () => { location.href = href; } });
    tl.set(wipe.querySelector('.wipe-scan'), { opacity: 1, top: '100%' })
      .to(wipe.querySelector('.wipe-scan'), { top: '0%', duration: 0.45, ease: 'power3.inOut' }, 0)
      .to(wipe.querySelector('.wipe-panel'), { scaleY: 1, duration: 0.45, ease: 'power3.inOut' }, 0)
      .to(wipe.querySelector('.wipe-label'), { opacity: 1, duration: 0.15 }, 0.22);
  }
  CE.routeTo = routeTo;

  function interceptLinks() {
    doc.addEventListener('click', e => {
      const a = e.target.closest('a[data-route]');
      if (!a) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      routeTo(a.getAttribute('href'));
    });
  }

  /* ── scroll reveal ─────────────────────────────────────── */
  CE.reveal = function (root) {
    const els = (root || doc).querySelectorAll('.rv');
    if (CE.reducedMotion) { els.forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; }); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          const el = en.target;
          const d = parseFloat(el.dataset.rvDelay || 0);
          if (window.gsap) gsap.to(el, { opacity: 1, y: 0, duration: 0.9, delay: d, ease: 'power3.out' });
          else { el.style.transition = 'opacity .8s, transform .8s'; el.style.opacity = 1; el.style.transform = 'none'; }
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
  };

  /* ── marquee ───────────────────────────────────────────── */
  CE.marquee = function () {
    doc.querySelectorAll('.marquee').forEach(m => {
      const track = m.querySelector('.marquee-track');
      if (!track) return;
      track.innerHTML += track.innerHTML;
      if (CE.reducedMotion) return;
      let x = 0;
      const speed = parseFloat(m.dataset.speed || 0.5);
      (function loop() {
        x -= speed;
        const half = track.scrollWidth / 2;
        if (-x >= half) x += half;
        track.style.transform = 'translateX(' + x + 'px)';
        requestAnimationFrame(loop);
      })();
    });
  };

  /* ── init (robust against defer-script timing) ─────────── */
  function init() {
    if (CE.ready) return;
    if (CE.touch) doc.body.classList.add('touch');
    injectChrome();
    injectNav();
    interceptLinks();
    CE.magnetize();
    CE.marquee();
    CE.ready = true;
    doc.dispatchEvent(new CustomEvent('ce:ready'));
  }

  // Absolute safety net — registered BEFORE init so exceptions thrown by
  // page code running inside the ce:ready dispatch are also caught. Any
  // uncaught error must never leave content hidden behind un-run reveals.
  addEventListener('error', function () {
    const boot = doc.getElementById('boot');
    if (boot) boot.style.display = 'none';
    doc.querySelectorAll('.rv').forEach(el => {
      if (getComputedStyle(el).opacity === '0') { el.style.opacity = 1; el.style.transform = 'none'; }
    });
  });

  // Deferred scripts execute after the document is fully parsed, so the
  // DOM is complete right now — initialize synchronously. No event races.
  try {
    init();
  } catch (err) {
    // If init itself fails, surrender the enhancements but show the page.
    doc.documentElement.classList.remove('js');
  }

  // Reset transition chrome on every show (including back/forward cache
  // restores, where the page returns exactly as it was left — possibly
  // with the route wipe still covering the viewport).
  addEventListener('pageshow', function (e) {
    const wipe = doc.getElementById('wipe');
    if (wipe) {
      wipe.style.visibility = 'hidden';
      const p = wipe.querySelector('.wipe-panel');
      const s = wipe.querySelector('.wipe-scan');
      const l = wipe.querySelector('.wipe-label');
      if (p) p.style.transform = 'scaleY(0)';
      if (s) { s.style.opacity = 0; s.style.top = '100%'; }
      if (l) l.style.opacity = 0;
    }
    if (e.persisted) {
      const boot = doc.getElementById('boot');
      if (boot) boot.style.display = 'none';
      doc.querySelectorAll('.rv').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
    }
  });

  // Pages should call CE.onReady(fn) — runs now if ready, else on ce:ready.
  CE.onReady = function (fn) {
    if (CE.ready) fn();
    else doc.addEventListener('ce:ready', fn, { once: true });
  };
})();
