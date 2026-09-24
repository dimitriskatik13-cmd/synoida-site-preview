/* Local visual lab: finite, event-driven motion. Original logo renderer is separate. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktop = window.matchMedia('(min-width:1024px)');
  var hero = document.querySelector('.hero-depth');
  var plane = hero && hero.querySelector('.hero-plane');
  var planes = hero && hero.querySelector('.hero-planes');
  var foreground = hero && hero.querySelector('.hero-fg');
  var pin = document.querySelector('.svc-pin');
  var stage = pin && pin.querySelector('.svc-stage');
  var rail = pin && pin.querySelector('.svc-rail');
  var mark = document.querySelector('.cta-mark');
  var header = document.querySelector('header');
  var reveals = Array.from(document.querySelectorAll('.reveal'));
  var progresses = Array.from(document.querySelectorAll('[data-progress]')).map(function (el) {
    var range = (el.getAttribute('data-progress') || '').trim().split(/\s+/).map(Number);
    return {el: el, start: Number.isFinite(range[0]) ? range[0] : .85,
      end: Number.isFinite(range[1]) ? range[1] : .6, top: 0, height: 0, value: ''};
  });
  var counts = Array.from(document.querySelectorAll('[data-count]')).map(function (el) {
    return {el: el, target: Number(el.getAttribute('data-count')) || 0,
      duration: Math.min(1400, Math.max(300, Number(el.getAttribute('data-count-ms')) || 1200)),
      started: null, active: false, done: false};
  });
  var raf = 0, dirty = true, focusTarget = null, currentShift = 0;
  var lastY = null, lastReduced = null;
  var geometry = {height: 0, width: 0, heroTop: 0, heroHeight: 1, markTop: 0,
    markHeight: 0, pinTop: 0, railLeft: 0, over: 0, travel: 0, header: 72};
  var SPEED = 1.4;
  function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
  function railOn() { return !!(pin && stage && rail && desktop.matches && !reduce.matches); }
  function wake() {
    if (!document.hidden && !raf) raf = requestAnimationFrame(frame);
  }
  function invalidate() { dirty = true; wake(); }
  function finishCount(count) {
    count.el.textContent = String(count.target); count.done = true; count.active = false;
  }
  /* Every geometry read precedes writes, and scrolling uses cached document positions. */
  function readLayout() {
    var y = window.scrollY, vh = window.innerHeight;
    var g = {height: vh, width: window.innerWidth, header: header ? header.offsetHeight : 72,
      heroTop: 0, heroHeight: 1, markTop: 0, markHeight: 0, pinTop: 0,
      railLeft: 0, over: 0, travel: 0};
    var positions = [], anchors = [];
    if (hero) { var hr = hero.getBoundingClientRect(); g.heroTop = hr.top + y; g.heroHeight = hr.height || 1; }
    if (mark) { var mr = mark.getBoundingClientRect(); g.markTop = mr.top + y; g.markHeight = mr.height; }
    if (railOn()) {
      var rr = rail.getBoundingClientRect(), pr = pin.getBoundingClientRect();
      g.railLeft = rr.left + currentShift + stage.scrollLeft;
      g.over = Math.max(0, Math.round(g.railLeft + rail.scrollWidth - g.width + 32));
      g.travel = g.over / SPEED; g.stageHeight = stage.offsetHeight;
      g.pinTop = pr.top + y - g.header;
    }
    progresses.forEach(function (item) {
      var r = item.el.getBoundingClientRect();
      positions.push({item: item, top: r.top + y, height: r.height});
      if (r.height > 0) item.el.querySelectorAll('[data-at]').forEach(function (child) {
        var c = child.getBoundingClientRect();
        anchors.push({el: child, value: clamp((c.top + c.height / 2 - r.top) / r.height, 0, 1).toFixed(3)});
      });
    });
    return {geometry: g, positions: positions, anchors: anchors};
  }
  function frame(time) {
    raf = 0;
    if (document.hidden) return;
    var layout = dirty ? readLayout() : null;
    if (layout) geometry = layout.geometry;
    var g = geometry, y = window.scrollY;
    var focused = focusTarget;
    var focusedRect = focused && railOn() ? focused.getBoundingClientRect() : null;
    var focusShift = focusedRect ? clamp(focusedRect.left + currentShift + stage.scrollLeft - Math.max(24, g.railLeft), 0, g.over) : 0;
    /* No layout reads below this point. A pin height change gets one settling pass. */
    dirty = false;
    if (layout) {
      root.style.setProperty('--hdr', g.header + 'px');
      layout.positions.forEach(function (p) { p.item.top = p.top; p.item.height = p.height; });
      layout.anchors.forEach(function (p) { p.el.style.setProperty('--at', p.value); });
      if (pin && rail) {
        var height = railOn() ? (g.stageHeight + g.travel) + 'px' : '';
        if (pin.style.height !== height) { pin.style.height = height; dirty = true; }
      }
    }
    if (focusedRect) {
      focusTarget = null; stage.scrollLeft = 0;
      y = Math.max(0, g.pinTop + focusShift / SPEED);
      window.scrollTo({top: y, left: 0, behavior: 'instant'});
    } else focusTarget = null;
    var paintMotion = !!layout || !!focusedRect || y !== lastY || reduce.matches !== lastReduced;
    lastY = y; lastReduced = reduce.matches;
    if (paintMotion && reduce.matches) {
      [plane, planes, foreground, rail].forEach(function (el) { if (el) el.style.transform = ''; });
      currentShift = 0;
      if (mark) mark.style.setProperty('--k', '0');
      progresses.forEach(function (p) { p.el.style.setProperty('--p', '1'); p.value = '1'; });
    } else if (paintMotion) {
      if (hero && g.heroTop + g.heroHeight >= y && g.heroTop <= y + g.height) {
        var p = clamp((y - g.heroTop) / g.heroHeight, 0, 1);
        if (planes) {
          planes.style.transform = 'scale(' + (1 + p * .08).toFixed(4) + ')';
          if (plane) plane.style.transform = 'translate3d(0,' + (p * g.heroHeight * .12).toFixed(1) + 'px,0)';
          if (foreground) foreground.style.transform = 'translate3d(0,' + (-p * g.heroHeight * .045).toFixed(1) + 'px,0)';
        } else if (plane) plane.style.transform = 'translate3d(0,' + (p * g.heroHeight * .16).toFixed(1) + 'px,0) scale(' + (1 + p * .08).toFixed(4) + ')';
      }
      if (railOn()) {
        currentShift = clamp((y - g.pinTop) * SPEED, 0, g.over);
        rail.style.transform = 'translate3d(' + (-currentShift).toFixed(1) + 'px,0,0)';
      } else if (rail) { rail.style.transform = ''; currentShift = 0; }
      if (mark) {
        var k = clamp((g.markTop - y - g.height * .60) / (g.height * .55), 0, 1).toFixed(3);
        mark.style.setProperty('--k', k);
      }
      progresses.forEach(function (item) {
        var top = item.top - y;
        var value = clamp((g.height * item.start - top) / Math.max(1, g.height * (item.start - item.end) + item.height), 0, 1).toFixed(3);
        if (value !== item.value) { item.el.style.setProperty('--p', value); item.value = value; }
      });
    }
    var counting = false;
    counts.forEach(function (count) {
      if (!count.active) return;
      if (reduce.matches) { finishCount(count); return; }
      if (count.started === null) count.started = time;
      var p = clamp((time - count.started) / count.duration, 0, 1);
      count.el.textContent = String(Math.round(count.target * (1 - Math.pow(1 - p, 3))));
      if (p === 1) finishCount(count); else counting = true;
    });
    if (dirty || counting) wake();
  }
  var revealObserver = null, countObserver = null;
  if ('IntersectionObserver' in window && !reduce.matches) {
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); revealObserver.unobserve(e.target); } });
    }, {threshold: 0, rootMargin: '0px 0px 32px 0px'});
    reveals.forEach(function (el) { revealObserver.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add('in'); });
  if ('IntersectionObserver' in window && !reduce.matches) {
    countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var count = counts.find(function (c) { return c.el === entry.target; });
        if (!count || count.done) return;
        if (entry.isIntersecting) { count.active = true; wake(); }
        else if (count.active) { finishCount(count); countObserver.unobserve(count.el); }
      });
    }, {threshold: .3});
    counts.forEach(function (count) { count.el.textContent = '0'; countObserver.observe(count.el); });
  } else counts.forEach(finishCount);
  function preferenceChanged() {
    if (reduce.matches) {
      if (revealObserver) revealObserver.disconnect();
      if (countObserver) countObserver.disconnect();
      reveals.forEach(function (el) { el.classList.add('in'); });
      counts.forEach(finishCount);
    }
    invalidate();
  }
  function watch(mq, callback) {
    if (mq.addEventListener) mq.addEventListener('change', callback);
    else if (mq.addListener) mq.addListener(callback);
  }
  watch(reduce, preferenceChanged); watch(desktop, invalidate);
  window.addEventListener('scroll', wake, {passive: true});
  window.addEventListener('resize', invalidate, {passive: true});
  window.addEventListener('pageshow', invalidate);
  document.addEventListener('load', invalidate, true);
  document.addEventListener('toggle', invalidate, true);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; counts.forEach(function (c) { if (c.active) finishCount(c); }); }
    else invalidate();
  });
  if (rail) rail.addEventListener('focusin', function (event) {
    var target = event.target.closest('.svc-card');
    if (target && railOn()) { target.classList.add('in'); focusTarget = target; wake(); }
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(invalidate);
  if ('ResizeObserver' in window) {
    var resize = new ResizeObserver(invalidate);
    resize.observe(document.body);
    if (header) resize.observe(header);
    if (stage) resize.observe(stage);
  }
  invalidate();
})();
