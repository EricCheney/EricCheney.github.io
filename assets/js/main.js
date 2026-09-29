(() => {
  const root = document.documentElement;
  root.classList.add('js');

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  /* ---------- Theme toggle (circular reveal via the View Transitions API) ---------- */
  const themeToggle = $('[data-theme-toggle]');
  const setTheme = (theme) => {
    root.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch (e) { /* storage unavailable */ }
  };

  themeToggle?.addEventListener('click', (event) => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';

    if (!document.startViewTransition || reducedMotion.matches) {
      root.classList.add('theme-anim');
      setTheme(next);
      setTimeout(() => root.classList.remove('theme-anim'), 500);
      return;
    }

    const rect = themeToggle.getBoundingClientRect();
    const x = event.clientX || rect.left + rect.width / 2;
    const y = event.clientY || rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    document.startViewTransition(() => setTheme(next)).ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: 'cubic-bezier(.65, 0, .35, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  });

  /* ---------- Header state + scroll progress ---------- */
  const header = $('[data-header]');
  let ticking = false;

  const onScroll = () => {
    const max = root.scrollHeight - innerHeight;
    root.style.setProperty('--progress', max > 0 ? (scrollY / max).toFixed(4) : 0);
    header?.classList.toggle('is-scrolled', scrollY > 12);
    updateTimeline();
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });

  /* ---------- Mobile menu ---------- */
  const menuToggle = $('[data-menu-toggle]');
  const setMenu = (open) => {
    root.classList.toggle('menu-open', open);
    menuToggle?.setAttribute('aria-expanded', String(open));
    menuToggle?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  menuToggle?.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  $$('[data-nav-links] a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.classList.contains('menu-open')) { setMenu(false); menuToggle?.focus(); }
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', (mq) => mq.matches && setMenu(false));

  /* ---------- Active section indicator ---------- */
  const navLinks = $$('[data-nav-link]');
  const indicator = $('[data-nav-indicator]');
  let activeLink = null;

  const moveIndicator = (link) => {
    if (!indicator) return;
    if (!link) { indicator.style.opacity = '0'; return; }
    indicator.style.width = `${link.offsetWidth}px`;
    indicator.style.transform = `translateX(${link.offsetLeft}px)`;
    indicator.style.opacity = '1';
  };
  const setActive = (id) => {
    const link = navLinks.find((a) => a.getAttribute('href') === `#${id}`) || null;
    if (link === activeLink) return;
    navLinks.forEach((a) => a.classList.toggle('is-active', a === link));
    if (link) link.setAttribute('aria-current', 'true');
    navLinks.filter((a) => a !== link).forEach((a) => a.removeAttribute('aria-current'));
    activeLink = link;
    moveIndicator(link);
  };

  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const visible = new Map();
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0));
      const best = [...visible.entries()].filter(([, r]) => r > 0).sort((a, b) => b[1] - a[1])[0];
      setActive(best ? best[0] : null);
    }, { rootMargin: '-35% 0px -55% 0px', threshold: [0, .01, .25, .5, .75, 1] });
    sections.forEach((section) => sectionObserver.observe(section));
  }
  window.addEventListener('resize', () => moveIndicator(activeLink));

  /* ---------- Scroll reveal (with per-batch stagger) ---------- */
  const revealItems = $$('.reveal');
  const countItems = $$('[data-count]');

  const countUp = (el) => {
    const target = Number(el.dataset.count);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = `${prefix}${Math.round(target * eased)}${suffix}`;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      const entering = entries.filter((entry) => entry.isIntersecting);
      entering.forEach((entry, index) => {
        const el = entry.target;
        el.style.setProperty('--d', `${Math.min(index, 5) * 90}ms`);
        el.classList.add('is-visible');
        $$('[data-count]', el).forEach(countUp);
        observer.unobserve(el);
        // Clear the delay afterwards so hover transitions aren't held back.
        setTimeout(() => el.style.removeProperty('--d'), 1400);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
    countItems.forEach((el) => { if (!el.closest('.reveal')) countUp(el); });
  }

  /* ---------- Timeline fill ---------- */
  const timeline = $('[data-timeline]');
  const timelineFill = $('[data-timeline-fill]');
  function updateTimeline() {
    if (!timeline || !timelineFill) return;
    const rect = timeline.getBoundingClientRect();
    const progress = (innerHeight * 0.6 - rect.top) / rect.height;
    timelineFill.style.setProperty('--fill', Math.max(0, Math.min(1, progress)).toFixed(3));
  }

  /* ---------- Pointer spotlight on cards ---------- */
  if (finePointer.matches) {
    $$('[data-spotlight]').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        card.style.setProperty('--my', `${event.clientY - rect.top}px`);
      });
    });
  }

  /* ---------- Hero viewport tilt ---------- */
  const tilt = $('[data-tilt]');
  if (tilt && finePointer.matches && !reducedMotion.matches) {
    tilt.addEventListener('pointermove', (event) => {
      const rect = tilt.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      tilt.style.transition = 'transform .15s ease-out';
      tilt.style.setProperty('--ry', `${(px - 0.5) * 8}deg`);
      tilt.style.setProperty('--rx', `${(0.5 - py) * 6}deg`);
      tilt.style.setProperty('--gx', `${px * 100}%`);
      tilt.style.setProperty('--gy', `${py * 100}%`);
    });
    tilt.addEventListener('pointerleave', () => {
      tilt.style.transition = '';
      tilt.style.setProperty('--ry', '0deg');
      tilt.style.setProperty('--rx', '0deg');
    });
  }

  /* ---------- Animated <details> ---------- */
  $$('details.technical-details').forEach((details) => {
    const summary = $('summary', details);
    const body = document.createElement('div');
    body.className = 'details-body';
    while (summary.nextSibling) body.appendChild(summary.nextSibling);
    details.appendChild(body);

    let animation = null;
    summary.addEventListener('click', (event) => {
      if (reducedMotion.matches || !details.animate) return;
      event.preventDefault();

      const startHeight = `${details.offsetHeight}px`;
      const closing = details.open && !(animation && animation.closing);
      animation?.cancel();
      body.getAnimations().forEach((a) => a.cancel());
      details.style.overflow = 'hidden';
      const done = () => { animation = null; details.style.overflow = ''; };

      if (closing) {
        const endHeight = `${summary.offsetHeight}px`;
        animation = details.animate({ height: [startHeight, endHeight] }, { duration: 380, easing: 'cubic-bezier(.65, 0, .35, 1)' });
        animation.closing = true;
        body.animate({ opacity: [1, 0] }, { duration: 200, fill: 'forwards' });
        animation.onfinish = () => { details.open = false; body.getAnimations().forEach((a) => a.cancel()); done(); };
      } else {
        details.open = true;
        const endHeight = `${summary.offsetHeight + body.offsetHeight}px`;
        animation = details.animate({ height: [startHeight, endHeight] }, { duration: 480, easing: 'cubic-bezier(.16, 1, .3, 1)' });
        body.animate({ opacity: [0, 1], transform: ['translateY(-6px)', 'none'] }, { duration: 420, delay: 60, easing: 'ease-out', fill: 'backwards' });
        animation.onfinish = done;
      }
    });
  });

  /* ---------- Lightbox ---------- */
  const dialog = $('[data-lightbox-dialog]');
  if (dialog && typeof dialog.showModal === 'function') {
    const image = $('[data-lightbox-img]', dialog);
    const caption = $('[data-lightbox-caption]', dialog);
    let opener = null;

    $$('a[data-lightbox]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const thumb = $('img', link);
        const figcaption = link.closest('figure')?.querySelector('figcaption');
        image.src = link.href;
        image.alt = thumb?.alt || '';
        caption.textContent = figcaption ? figcaption.textContent.trim().replace(/\s+/g, ' ') : (thumb?.alt || '');
        opener = link;
        dialog.showModal();
      });
    });

    const close = () => dialog.close();
    $('[data-lightbox-close]', dialog)?.addEventListener('click', close);
    dialog.addEventListener('click', (event) => { if (event.target === dialog || event.target.tagName === 'FIGURE') close(); });
    dialog.addEventListener('close', () => { opener?.focus({ preventScroll: true }); });
  }

  /* ---------- Copy email ---------- */
  const copyButton = $('[data-copy]');
  const copyStatus = $('[data-copy-status]');
  copyButton?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(copyButton.dataset.copy);
      copyStatus.textContent = 'Email copied';
    } catch (e) {
      copyStatus.textContent = 'Copy failed. Select the address instead';
    }
    copyButton.classList.add('is-copied');
    copyStatus.classList.add('is-visible');
    clearTimeout(copyButton._timer);
    copyButton._timer = setTimeout(() => {
      copyButton.classList.remove('is-copied');
      copyStatus.classList.remove('is-visible');
    }, 1800);
  });

  onScroll();
})();
