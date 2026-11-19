// Rafe site — progressive enhancement only. Everything works (and reads) without it.
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ready = (fn) => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn());

ready(() => {
  /* Header hairline + frost after 24px */
  const header = $('[data-header]');
  if (header) {
    const onScroll = () => header.classList.toggle('scrolled', scrollY > 24);
    addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  /* Menu sheet closes after choosing a link */
  $$('[data-close-menu]').forEach((a) => a.addEventListener('click', () => $('#site-menu')?.hidePopover?.()));

  /* Scroll reveals */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
  $$('[data-reveal], [data-inview]').forEach((el) => io.observe(el));

  /* Pause looping work when off-screen or when the tab is hidden */
  const pauser = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.classList.toggle(e.target.matches('[data-bottle]') ? 'paused-anim' : 'paused', !e.isIntersecting);
  });
  document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('tab-hidden', document.hidden));

  /* Bloom plates */
  $$('[data-bloom]').forEach((plate) => {
    pauser.observe(plate);
    let turn = 0, aliveTimer;
    const bloom = () => {
      clearTimeout(aliveTimer);
      plate.classList.remove('bloomed', 'alive');
      void plate.getBoundingClientRect();
      plate.classList.add('bloomed');
      if (!reduce.matches) aliveTimer = setTimeout(() => plate.classList.add('alive'), 2400);
    };
    if (plate.hasAttribute('data-autoplay')) requestAnimationFrame(() => requestAnimationFrame(bloom));
    else {
      const once = new IntersectionObserver(([e]) => { if (e.isIntersecting) { bloom(); once.disconnect(); } }, { threshold: 0.4 });
      once.observe(plate);
    }
    if (plate.tagName === 'BUTTON') plate.addEventListener('click', () => {
      turn += 45;
      const head = $('.p-head', plate); if (head && !reduce.matches) head.style.rotate = `${turn}deg`;
      bloom();
    });
  });

  /* Sticky life-stage story */
  const story = $('[data-story]');
  if (story) {
    const steps = $$('[data-step]', story), phones = $$('[data-phone]', story), name = $('.stage-name ul', story), arch = $('.stage-arch', story);
    let current = -1;
    const setStage = (i) => {
      if (i === current) return; current = i;
      const s = steps[i];
      story.style.setProperty('--stage-accent', s.dataset.accent);
      story.style.setProperty('--stage-wash', s.dataset.wash);
      story.style.setProperty('--stage-petal', s.dataset.petal);
      phones.forEach((p, k) => p.setAttribute('aria-hidden', k === i ? 'false' : 'true'));
      name?.style.setProperty('--si', i);
    };
    const sio = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setStage(Number(e.target.dataset.step));
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach((s) => sio.observe(s));
    if (arch && !reduce.matches) {
      let ticking = false;
      const par = () => {
        ticking = false;
        const r = story.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
        arch.style.setProperty('--parallax', `${(p - 0.5) * -36}px`);
      };
      addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(par); } }, { passive: true });
      par();
    }
  }

  /* Water bottle demo */
  const demo = $('[data-bottle]');
  if (demo) {
    pauser.observe(demo);
    const goal = Number(demo.dataset.goal) || 2000;
    const bottle = $('.bottle', demo), liquid = $('.liquid', demo), amountEl = $('[data-amount]', demo), pctEl = $('[data-pct]', demo), drop = $('.drop', demo);
    let amount = Number(demo.dataset.start) || 0, shown = amount, raf;
    const fmt = new Intl.NumberFormat('en');
    const roll = (to) => {
      cancelAnimationFrame(raf);
      if (reduce.matches) { shown = to; amountEl.textContent = fmt.format(to); return; }
      const from = shown, t0 = performance.now(), dur = 620;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        shown = Math.round(from + (to - from) * e); amountEl.textContent = fmt.format(shown);
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const render = (poured) => {
      const level = Math.min(1, amount / goal);
      const surface = 360 * (1 - level); // 44 → 404 in the app's 200 × 420 design space
      drop?.style.setProperty('--fall', `${Math.max(30, 44 + surface - 30)}px`);
      const apply = () => { liquid.style.translate = `0 ${surface}px`; bottle.classList.toggle('half', level >= 0.5); bottle.classList.toggle('full', level >= 1); };
      if (poured && !reduce.matches) {
        bottle.classList.remove('pour', 'ripple-on'); void bottle.getBoundingClientRect(); bottle.classList.add('pour');
        setTimeout(() => { apply(); bottle.classList.add('ripple-on'); }, 520);
        setTimeout(() => bottle.classList.remove('pour'), 900);
      } else apply();
      roll(amount); pctEl.textContent = String(Math.round(level * 100));
    };
    $$('[data-add]', demo).forEach((b) => b.addEventListener('click', () => { amount = Math.min(goal * 1.5, amount + Number(b.dataset.add)); render(true); }));
    $('[data-reset]', demo)?.addEventListener('click', () => { amount = 0; bottle.classList.remove('full', 'half'); render(false); });
  }

  /* Serving size demo: ¼ to 2 servings in quarter steps, like the app's slider */
  $$('[data-serving]').forEach((box) => {
    const range = $('input[type=range]', box), frac = $('[data-frac]', box), out = $('[data-kcal-out]', box);
    const base = Number(box.dataset.kcal) || 600, labels = ['¼', '½', '¾', '1', '1¼', '1½', '1¾', '2'];
    const fmt = new Intl.NumberFormat('en');
    let shown = base, raf, touched = false;
    const tween = (to) => {
      cancelAnimationFrame(raf);
      if (reduce.matches) { shown = to; out.textContent = fmt.format(to); return; }
      const from = shown, t0 = performance.now(), dur = 420;
      const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4); shown = Math.round(from + (to - from) * e); out.textContent = fmt.format(shown); if (k < 1) raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    };
    const update = () => {
      const i = Number(range.value), kcal = Math.round(base * i / 4);
      frac.textContent = labels[i - 1]; tween(kcal);
      range.setAttribute('aria-valuetext', `${labels[i - 1]} serving, ${fmt.format(kcal)} kcal`);
    };
    range.addEventListener('input', () => { touched = true; update(); });
    ['pointerdown', 'keydown', 'focus'].forEach((ev) => range.addEventListener(ev, () => { touched = true; }, { once: true }));
    update();
    /* One gentle demo glide when first seen: 1 → 1¼ → 1½ → ¾ → 1 */
    if (!reduce.matches) {
      const seen = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return; seen.disconnect();
        [5, 6, 3, 4].forEach((v, k) => setTimeout(() => { if (!touched) { range.value = String(v); update(); } }, 700 + k * 700));
      }, { threshold: 0.6 });
      seen.observe(box);
    }
  });

  /* Count-up for kcal / percent figures (final value is already in the HTML) */
  const counts = $$('.count[data-count]');
  if (counts.length && !reduce.matches) {
    const fmtN = new Intl.NumberFormat('en');
    const cio = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue; cio.unobserve(e.target);
        const el = e.target, to = Number(el.dataset.count), t0 = performance.now(), dur = 1100;
        const step = (t) => { const k = Math.min(1, (t - t0) / dur), ease = 1 - Math.pow(1 - k, 4); el.textContent = fmtN.format(Math.round(to * ease)); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.6 });
    counts.forEach((c) => cio.observe(c));
  }

  /* Phone frames: gentle parallax + slight tilt while in view (transform only) */
  if (!reduce.matches) {
    const phones = $$('.flow-list .device, .things .device:not(.back), .inline-phone .device');
    const live = new Set();
    const vis = new IntersectionObserver((entries) => { for (const e of entries) e.isIntersecting ? live.add(e.target) : live.delete(e.target); }, { rootMargin: '10% 0px' });
    phones.forEach((d, k) => { d.classList.add('drift'); d.dataset.dir = k % 2 ? '-1' : '1'; vis.observe(d); });
    let ticking = false;
    const tick = () => {
      ticking = false;
      const vh = innerHeight;
      live.forEach((d) => {
        const r = d.getBoundingClientRect();
        const p = Math.max(-1, Math.min(1, ((r.top + r.height / 2) - vh / 2) / vh)); // -1 above … 1 below
        d.style.setProperty('--py', `${(p * 18).toFixed(1)}px`);
        d.style.setProperty('--tilt', `${(p * 1.6 * Number(d.dataset.dir)).toFixed(2)}deg`);
      });
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }, { passive: true });
  }

  /* Pause the pull hint off-screen */
  $$('.pull-hint-wrap').forEach((w) => pauser.observe(w));

  /* Copy email (support) */
  $$('[data-copy]').forEach((btn) => btn.addEventListener('click', async () => {
    const status = $(btn.dataset.status);
    try { await navigator.clipboard.writeText(btn.dataset.copy); if (status) status.textContent = 'Copied. Paste it into any mail app.'; }
    catch { if (status) status.textContent = 'Copy didn’t work here. Select the address above instead.'; }
  }));

  /* Table of contents: mark the section in view */
  const toc = $$('.toc a');
  if (toc.length) {
    const map = new Map(toc.map((a) => [a.getAttribute('href').slice(1), a]));
    const tio = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { toc.forEach((a) => a.removeAttribute('aria-current')); map.get(e.target.id)?.setAttribute('aria-current', 'true'); }
    }, { rootMargin: '-20% 0px -70% 0px' });
    map.forEach((_, id) => { const s = document.getElementById(id); if (s) tio.observe(s); });
  }
});
