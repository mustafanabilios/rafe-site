// "Rafe, in action": swipeable phone demo. Vanilla, no dependencies. Animates transform/opacity via CSS + rAF.
const root = document.querySelector('[data-demo]');
if (root) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = root) => r.querySelector(s);
  const $$ = (s, r = root) => [...r.querySelectorAll(s)];
  const app = $('[data-app]'), viewport = $('[data-viewport]'), track = $('[data-track]');
  const slides = $$('[data-slide]'), steps = $$('[data-go]'), caption = $('[data-caption]'), capN = $('[data-cap-n]');
  const tabs = $$('.tabbar [data-tab]'), playBtn = $('[data-play]');
  const TABS = { log: 'add', camera: 'add', serving: 'add', day: 'home', history: 'home', pregnancy: 'home', levels: 'you', meadow: 'insights', control: 'home', report: 'you' };
  const CHROME = { control: 'system', report: 'document' };
  const CAPS = steps.map((b) => b.closest('li') && b.querySelector('.nm').textContent);
  const captions = JSON.parse(root.dataset.captions || '[]');
  const N = slides.length, DWELL = 7000;
  const fmt = new Intl.NumberFormat('en');
  let index = 0, started = false, autoplay = !reduce, visible = false;

  /* ---------- timers per slide (cleared on leave) ---------- */
  let timers = [];
  const later = (fn, ms) => { timers.push(setTimeout(fn, reduce ? 0 : ms)); };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  const count = (el, from, to, dur = 900, fmtFn = (v) => fmt.format(v)) => {
    if (!el) return;
    if (reduce) { el.textContent = fmtFn(to); return; }
    const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4); el.textContent = fmtFn(Math.round(from + (to - from) * e)); if (k < 1 && el.isConnected) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const typeText = (el, text, speed = 55, done) => {
    if (reduce) { el.textContent = text; done && done(); return; }
    el.textContent = ''; let i = 0;
    const tick = () => { el.textContent = text.slice(0, ++i); if (i < text.length) later(tick, speed); else done && later(done, 250); };
    later(tick, 300);
  };
  const theme = (id) => {
    if (app.dataset.theme === id) return;
    app.dataset.theme = id;
    const r = $('.ripple'); r.classList.remove('go'); void r.offsetWidth; if (!reduce) r.classList.add('go');
    $$('[data-pal]').forEach((b) => { const on = b.dataset.pal === id; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  };

  /* ---------- slide scripts ---------- */
  const S = {
    log: {
      reset(s) { $('[data-type]', s).textContent = ''; $('.inside', s).classList.remove('show'); $('[data-total]', s).textContent = '0'; },
      play(s) {
        typeText($('[data-type]', s), 'chicken shawarma wrap', 55, () => {
          const b = $('[data-analyze]', s); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
          later(() => { $('.inside', s).classList.add('show'); count($('[data-total]', s), 0, 540, 1100); }, 500);
        });
      },
      init(s) { $('[data-analyze]', s).addEventListener('click', () => { stopAuto(); clearTimers(); S.log.reset(s); S.log.play(s); }); },
    },
    camera: {
      reset(s) { const f = $('[data-finder]', s); f.classList.remove('shot', 'scan'); $('[data-result]', s).classList.remove('show'); $('[data-shutter]', s).classList.remove('press'); },
      play(s) {
        const f = $('[data-finder]', s), sh = $('[data-shutter]', s);
        later(() => { sh.classList.add('press'); f.classList.add('shot'); }, 1100);
        later(() => { sh.classList.remove('press'); f.classList.add('scan'); }, 1450);
        later(() => { $('[data-result]', s).classList.add('show'); count($('[data-cam-kcal]', s), 0, 620, 1000); }, 3700);
      },
      init(s) {
        const again = () => { stopAuto(); clearTimers(); S.camera.reset(s); S.camera.play(s); };
        $('[data-shutter]', s).addEventListener('click', again);
        $('[data-cam-again]', s).addEventListener('click', again);
      },
    },
    serving: {
      set(s, i, anim = true) {
        const labels = ['¼', '½', '¾', '1', '1¼', '1½', '1¾', '2'], base = 540, kcal = Math.round(base * i / 4);
        const box = $('[data-serve]', s), input = $('[data-serve-input]', s);
        box.classList.toggle('anim', anim && !reduce);
        input.value = String(i);
        box.style.setProperty('--v', String((i - 0.5) / 8)); box.style.setProperty('--v2', String(i - 1));
        $('[data-serve-bubble]', s).textContent = labels[i - 1]; $('[data-serve-frac]', s).textContent = labels[i - 1];
        const k = $('[data-serve-kcal]', s); count(k, Number(k.textContent.replace(/,/g, '')) || base, kcal, 450);
        input.setAttribute('aria-valuetext', `${labels[i - 1]} serving, ${fmt.format(kcal)} kcal`);
      },
      reset(s) { S.serving.set(s, 4, false); },
      play(s) { [6, 8, 3, 5].forEach((v, k) => later(() => S.serving.set(s, v), 1100 + k * 1200)); },
      init(s) {
        const input = $('[data-serve-input]', s);
        input.addEventListener('input', () => { stopAuto(); clearTimers(); S.serving.set(s, Number(input.value), false); });
        input.addEventListener('pointerdown', (e) => e.stopPropagation());
      },
    },
    day: {
      level: 0.375,
      pour(s, ml) { S.day.level = Math.min(1, S.day.level + ml / 2000); s.querySelector('[data-liquid]').style.setProperty('--lv', S.day.level); count($('[data-water]', s), 0, Math.round(S.day.level * 200), 500, (v) => (v / 100).toFixed(2)); },
      reset(s) { S.day.level = 0.375; $('[data-liquid]', s).style.setProperty('--lv', 0.375); $('[data-water]', s).textContent = '0.75'; $('.ringcard', s).classList.remove('show'); $$('.tick', s).forEach((t) => t.classList.remove('lit')); $('[data-pct]', s).textContent = '0'; },
      play(s) {
        later(() => { $('.ringcard', s).classList.add('show'); $$('.tick', s).forEach((t, k) => t.classList.toggle('lit', k < 24)); count($('[data-pct]', s), 0, 59, 1100); }, 500);
        later(() => { const b = $('[data-pour="250"]', s); b.classList.add('press'); S.day.pour(s, 250); later(() => b.classList.remove('press'), 250); }, 2600);
      },
      init(s) { $$('[data-pour]', s).forEach((b) => b.addEventListener('click', () => { stopAuto(); S.day.pour(s, Number(b.dataset.pour)); })); },
    },
    history: {
      meal: 'Lunch',
      reset(s) { s.classList.remove('pulling', 'open'); $$('[data-relog]', s).forEach((b) => { b.classList.remove('done'); b.textContent = '+'; }); $('[data-toast]', s).classList.remove('show'); },
      relog(s, b) {
        b.classList.add('done'); b.textContent = '✓';
        const t = $('[data-toast]', s); t.textContent = `planted “${b.dataset.relog}” into ${S.history.meal.toLowerCase()} 🌿`;
        t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
      },
      play(s) {
        later(() => s.classList.add('pulling'), 500);
        later(() => s.classList.add('open'), 1700);
        later(() => S.history.relog(s, $('[data-relog]', s)), 3300);
      },
      init(s) {
        $$('[data-meal]', s).forEach((c) => c.addEventListener('click', () => { stopAuto(); S.history.meal = c.dataset.meal; $$('[data-meal]', s).forEach((x) => x.setAttribute('aria-pressed', String(x === c))); }));
        $$('[data-relog]', s).forEach((b) => b.addEventListener('click', () => { stopAuto(); S.history.relog(s, b); }));
      },
    },
    pregnancy: {
      reset(s) { $('[data-week]', s).textContent = '1'; const v = $('[data-vit]', s); v.setAttribute('aria-checked', 'false'); },
      play(s) { later(() => count($('[data-week]', s), 1, 24, 1500), 400); later(() => $('[data-vit]', s).setAttribute('aria-checked', 'true'), 2800); },
      init(s) { const v = $('[data-vit]', s); v.addEventListener('click', () => { stopAuto(); v.setAttribute('aria-checked', String(v.getAttribute('aria-checked') !== 'true')); }); },
    },
    levels: {
      unlocked: new Set(['meadow']),
      paint(s, meals) {
        const lvl = meals >= 90 ? 4 : 3, name = lvl === 4 ? 'Bloom' : 'Buds';
        const from = lvl === 4 ? 90 : 40, to = lvl === 4 ? 180 : 90;
        $('[data-lvl]', s).textContent = lvl; $('[data-lvl-name]', s).textContent = name;
        $('[data-meals]', s).textContent = meals;
        $('[data-lvfill]', s).style.setProperty('--lvf', ((meals - from) / (to - from)).toFixed(3));
        $('[data-lvnext]', s).textContent = `${to - meals} meals to Level ${lvl + 1} · ${lvl === 4 ? 'Gardener' : 'Bloom'}`;
        const need = { pearl: 90, ivory: 180, velvet: 800 };
        $$('[data-earn]', s).forEach((e) => { const id = e.dataset.earn; e.querySelector('span').firstChild.textContent = `${Math.max(0, need[id] - meals)} meals to earn free`; });
      },
      unlock(s, id) {
        S.levels.unlocked.add(id);
        const b = $(`[data-pal="${id}"]`, s); b.dataset.locked = 'false'; b.querySelector('[data-note]').textContent = 'Earned';
        const ico = b.querySelector('[data-lockico]'); ico.classList.remove('lk'); ico.classList.add('ok');
        $(`[data-earn="${id}"]`, s)?.classList.remove('show');
      },
      reset(s) {
        S.levels.unlocked = new Set(['meadow']);
        const b = $('[data-pal="pearl"]', s); b.dataset.locked = 'true'; b.querySelector('[data-note]').textContent = 'Level 4';
        const ico = b.querySelector('[data-lockico]'); ico.classList.add('lk'); ico.classList.remove('ok');
        $$('[data-earn]', s).forEach((e) => e.classList.remove('show'));
        $('[data-levelup]', s).classList.remove('show');
        theme('meadow'); S.levels.paint(s, 84);
      },
      play(s) {
        for (let m = 85; m <= 90; m++) later(() => S.levels.paint(s, m), 700 + (m - 85) * 260);
        later(() => $('[data-levelup]', s).classList.add('show'), 2300);
        later(() => { $('[data-levelup]', s).classList.remove('show'); S.levels.unlock(s, 'pearl'); theme('pearl'); }, 4600);
      },
      init(s) {
        $$('[data-pal]', s).forEach((b) => b.addEventListener('click', () => {
          stopAuto();
          if (b.dataset.locked === 'true') {
            b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
            $(`[data-earn="${b.dataset.pal}"]`, s)?.classList.toggle('show');
          } else theme(b.dataset.pal);
        }));
      },
    },
    meadow: {
      pick(s, d) {
        $$('.day', s).forEach((x) => { x.classList.toggle('sel', x === d); x.tabIndex = x === d ? 0 : -1; });
        const k = Number(d.dataset.kcal), tip = $('[data-daytip]', s);
        tip.textContent = k ? `${d.dataset.day} · ${fmt.format(k)} kcal` : `${d.dataset.day} · a resting day`;
        tip.classList.remove('swap'); void tip.offsetWidth; tip.classList.add('swap');
      },
      reset(s) { $$('.day', s).forEach((x) => x.classList.remove('sel')); $('[data-daytip]', s).textContent = 'Tap a day to see its plates.'; },
      play(s) { const d = $$('.day', s); later(() => S.meadow.pick(s, d[59]), 2600); later(() => S.meadow.pick(s, d[44]), 4300); },
      init(s) {
        const days = $$('.day', s);
        days.forEach((d, i) => {
          d.addEventListener('click', () => { stopAuto(); clearTimers(); S.meadow.pick(s, d); });
          d.addEventListener('keydown', (e) => {
            const m = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 10, ArrowUp: -10 }[e.key]; if (!m) return;
            e.preventDefault(); e.stopPropagation();
            const n = days[Math.max(0, Math.min(59, i + m))]; S.meadow.pick(s, n); n.focus();
          });
        });
      },
    },
    control: {
      init(s) {
        const toast = $('[data-cc-toast]', s);
        $$('[data-cc]', s).forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            if (!toast) return;
            toast.textContent = btn.dataset.cc || '';
            toast.classList.add('on');
            later(() => toast.classList.remove('on'), 1600);
          });
        });
      },
      reset(s) { const toast = $('[data-cc-toast]', s); if (toast) { toast.classList.remove('on'); toast.textContent = ''; } },
    },
  };
  slides.forEach((s) => S[s.dataset.slide]?.init?.(s));

  /* ---------- track spring ---------- */
  let x = 0, v = 0, target = 0, raf = 0, last = 0;
  const width = () => viewport.clientWidth;
  const render = () => { track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`; };
  const loop = (t) => {
    const dt = Math.min(32, t - (last || t)) / 1000; last = t;
    const k = 220, c = 24; // stiffness, damping (slightly under-damped: a little overshoot)
    v += (-k * (x - target) - c * v) * dt; x += v * dt; render();
    if (Math.abs(x - target) < 0.3 && Math.abs(v) < 2) { x = target; v = 0; render(); raf = 0; last = 0; return; }
    raf = requestAnimationFrame(loop);
  };
  const springTo = (tx) => { target = tx; if (reduce) { x = tx; v = 0; render(); return; } if (!raf) raf = requestAnimationFrame(loop); };

  /* ---------- navigation ---------- */
  const go = (i, user = false) => {
    i = (i + N) % N;
    const prev = index; index = i;
    springTo(-i * width());
    slides.forEach((s, k) => { const on = k === i; s.toggleAttribute('inert', !on); s.setAttribute('aria-hidden', String(!on)); });
    steps.forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
    tabs.forEach((t) => t.classList.toggle('on', t.dataset.tab === TABS[slides[i].dataset.slide]));
    app.dataset.chrome = CHROME[slides[i].dataset.slide] || '';
    caption.setAttribute('aria-live', autoplay ? 'off' : 'polite');
    caption.textContent = captions[i] || ''; capN.textContent = String(i + 1).padStart(2, '0');
    caption.classList.remove('swap'); void caption.offsetWidth; if (!reduce) caption.classList.add('swap');
    if (prev !== i || user) enter(prev, i);
    resetBar();
  };
  const enter = (prev, i) => {
    clearTimers();
    const ps = slides[prev], ns = slides[i];
    ps.classList.remove('on'); if (prev !== i) S[ps.dataset.slide]?.reset?.(ps);
    S[ns.dataset.slide]?.reset?.(ns);
    requestAnimationFrame(() => { ns.classList.add('on'); S[ns.dataset.slide]?.play?.(ns); });
  };

  /* ---------- autoplay with progress ---------- */
  let barStart = 0, barRaf = 0;
  const bar = () => steps[index].querySelector('.bar i');
  const resetBar = () => { steps.forEach((b) => (b.querySelector('.bar i').style.transform = 'scaleX(0)')); barStart = performance.now(); };
  const barLoop = (t) => {
    if (!autoplay || !visible || document.hidden) { barRaf = 0; return; }
    const p = Math.min(1, (t - barStart) / DWELL); bar().style.transform = `scaleX(${p})`;
    if (p >= 1) go(index + 1);
    barRaf = requestAnimationFrame(barLoop);
  };
  const runBar = () => { if (autoplay && visible && !barRaf) { barStart = performance.now() - (parseFloat((bar().style.transform.match(/[\d.]+/) || [0])[0]) * DWELL); barRaf = requestAnimationFrame(barLoop); } };
  function stopAuto() {
    if (!autoplay) return; autoplay = false; playBtn.setAttribute('aria-pressed', 'true'); playBtn.setAttribute('aria-label', 'Play the tour');
    caption.setAttribute('aria-live', 'polite'); steps.forEach((b) => (b.querySelector('.bar i').style.transform = 'scaleX(0)'));
  }
  playBtn.addEventListener('click', () => {
    if (autoplay) { stopAuto(); return; }
    autoplay = true; playBtn.setAttribute('aria-pressed', 'false'); playBtn.setAttribute('aria-label', 'Pause the tour'); caption.setAttribute('aria-live', 'off'); resetBar(); runBar();
  });
  if (reduce) { playBtn.setAttribute('aria-pressed', 'true'); playBtn.setAttribute('aria-label', 'Play the tour'); }

  steps.forEach((b) => b.addEventListener('click', () => { stopAuto(); go(Number(b.dataset.go), true); }));
  $('[data-prev]').addEventListener('click', () => { stopAuto(); go(index - 1, true); });
  $('[data-next]').addEventListener('click', () => { stopAuto(); go(index + 1, true); });
  root.addEventListener('keydown', (e) => {
    if (e.target.matches('input[type=range]') || e.defaultPrevented) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); stopAuto(); go(index + 1, true); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); stopAuto(); go(index - 1, true); }
  });

  /* ---------- swipe / drag with momentum + snap ---------- */
  let down = null, dragging = false, suppressClick = false, samples = [];
  viewport.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('input')) return;
    down = { x: e.clientX, y: e.clientY, start: x, id: e.pointerId }; dragging = false; samples = [[e.timeStamp, e.clientX]];
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!down || e.pointerId !== down.id) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!dragging) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) { if (Math.abs(dy) > 12) down = null; return; }
      dragging = true; stopAuto(); viewport.setPointerCapture(e.pointerId); viewport.classList.add('dragging');
      cancelAnimationFrame(raf); raf = 0; last = 0;
    }
    const w = width(), min = -(N - 1) * w; let nx = down.start + dx;
    if (nx > 0) nx *= 0.35; if (nx < min) nx = min + (nx - min) * 0.35; // rubber band
    x = nx; render(); samples.push([e.timeStamp, e.clientX]); if (samples.length > 6) samples.shift();
  });
  const release = (e) => {
    if (!down) return;
    if (dragging) {
      const [t0, x0] = samples[0], [t1, x1] = samples[samples.length - 1];
      const vel = (x1 - x0) / Math.max(1, t1 - t0); // px/ms
      const w = width(), projected = x + vel * 180;
      let i = Math.round(-projected / w); i = Math.max(index - 1, Math.min(index + 1, i)); i = Math.max(0, Math.min(N - 1, i));
      v = vel * 1000; suppressClick = true; viewport.classList.remove('dragging');
      if (i === index) springTo(-i * w); else go(i, true);
    }
    down = null; dragging = false;
  };
  viewport.addEventListener('pointerup', release); viewport.addEventListener('pointercancel', release);
  viewport.addEventListener('click', (e) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); suppressClick = false; } }, true);
  addEventListener('resize', () => { x = target = -index * width(); render(); });

  /* ---------- phone tilt (cursor) + scroll parallax ---------- */
  const wrap = $('[data-tilt]'), phone = $('.iphone');
  if (!reduce) {
    let rx = 0, ry = 0, trx = 0, try_ = 0, ty = 0, tty = 0, tiltRaf = 0;
    const tl = () => {
      rx += (trx - rx) * 0.08; ry += (try_ - ry) * 0.08; ty += (tty - ty) * 0.12;
      phone.style.setProperty('--rx', rx.toFixed(2) + 'deg'); phone.style.setProperty('--ry', ry.toFixed(2) + 'deg'); phone.style.setProperty('--ty', ty.toFixed(1) + 'px');
      tiltRaf = Math.abs(trx - rx) + Math.abs(try_ - ry) + Math.abs(tty - ty) > 0.02 ? requestAnimationFrame(tl) : 0;
    };
    const kick = () => { if (!tiltRaf) tiltRaf = requestAnimationFrame(tl); };
    if (matchMedia('(pointer: fine)').matches) {
      root.addEventListener('pointermove', (e) => { if (dragging) return; const r = wrap.getBoundingClientRect(); trx = -((e.clientY - (r.top + r.height / 2)) / r.height) * 8; try_ = ((e.clientX - (r.left + r.width / 2)) / innerWidth) * 16; kick(); });
      root.addEventListener('pointerleave', () => { trx = 0; try_ = 0; kick(); });
    }
    addEventListener('scroll', () => { if (!visible) return; const r = root.getBoundingClientRect(); tty = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight)) * -24; kick(); }, { passive: true });
  }

  /* ---------- lazy start when the phone comes into view ---------- */
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !started) {
      started = true;
      x = target = 0; render();
      const splash = $('[data-splash]');
      if (reduce) { splash.remove(); go(0, true); }
      else {
        splash.classList.add('bloom');
        setTimeout(() => { splash.classList.add('gone'); go(0, true); }, 1900);
        setTimeout(() => splash.remove(), 2700);
      }
    }
    if (visible) runBar();
  }, { threshold: 0.35 });
  io.observe(viewport);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { barStart = performance.now(); runBar(); } });
  void CAPS;
}
