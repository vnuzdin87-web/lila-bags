/* ============================================================
   LILA — interactions
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ============================================================
     ЗАЯВКИ В GOOGLE ТАБЛИЦУ
     Сюда нужно вставить адрес веб-приложения Google Apps Script —
     он выглядит так: https://script.google.com/macros/s/AKfy.../exec
     Пошаговая инструкция: README-google-sheets.md
     Пока строка пустая, форма работает в демо-режиме и НИЧЕГО не сохраняет.
     ============================================================ */
  var FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbztP2PMcq8A42sy8XYKYs4ZfWif80MT_Xv_BSzFlRBG2pgPeRqG9zwuP_smnpaYzLnz/exec';

  /* ---------- Preloader ---------- */
  var loader = $('#loader');
  function hideLoader() {
    if (loader) loader.classList.add('is-done');
  }
  if (document.readyState === 'complete') {
    setTimeout(hideLoader, 350);
  } else {
    window.addEventListener('load', function () { setTimeout(hideLoader, 350); });
  }
  setTimeout(hideLoader, 3500); // safety net

  /* ---------- Year ---------- */
  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Header + scroll progress ---------- */
  var header = $('#header');
  var progress = $('#progressBar');
  var ticking = false;

  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (header) header.classList.toggle('is-scrolled', y > 24);

    if (progress) {
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (y / max) * 100 : 0;
      progress.style.width = pct.toFixed(2) + '%';
    }

    parallax(y);
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(onScroll);
    }
  }, { passive: true });

  /* ---------- Parallax layers ---------- */
  var parallaxItems = $$('[data-parallax]').filter(function (el) {
    return !el.classList.contains('float-card') &&
           !el.classList.contains('hero__badge') &&
           !el.classList.contains('swatch-card');
  });

  function parallax(scrollY) {
    if (reduceMotion || !parallaxItems.length) return;
    var vh = window.innerHeight;
    parallaxItems.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) return;
      var center = rect.top + rect.height / 2 - vh / 2;
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0.05;
      // `translate` is a separate property from `transform`, so hover/zoom effects keep working.
      el.style.translate = '0 ' + (-center * speed).toFixed(2) + 'px';
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealItems = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    revealItems.forEach(function (el) { io.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- Counters ---------- */
  var counters = $$('[data-count]');
  function runCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduceMotion) { el.innerHTML = target + suffix; return; }
    var dur = 1500;
    var start = null;
    function step(t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.innerHTML = Math.round(target * eased) + suffix;
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          cio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(runCounter);
  }

  /* ---------- Hero cursor glow ---------- */
  var hero = $('#hero');
  var glow = $('#heroGlow');
  if (hero && glow && !reduceMotion && window.matchMedia('(hover: hover)').matches) {
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      glow.style.transform = 'translate3d(' + (x * 46).toFixed(1) + 'px,' + (y * 46).toFixed(1) + 'px,0)';
    });
  }

  /* ---------- Mobile menu ---------- */
  var burger = $('#burger');
  var nav = $('#nav');
  function setMenu(open) {
    if (!burger || !nav) return;
    nav.classList.toggle('is-open', open);
    burger.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    document.body.classList.toggle('is-locked', open);
  }
  if (burger) {
    burger.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
  }
  $$('.nav__link').forEach(function (link) {
    link.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });

  /* ---------- Configurator ---------- */
  var config = $('.config');
  if (config) {
    var state = { model: 'Классический тоут', leather: 'Карамель', thread: 'в тон кожи', color: '#b07a4b' };
    var result = $('#configResult');
    var frame = $('.frame');
    var tint = $('#configTint');

    function render() {
      if (result) {
        result.textContent = state.model + ' · ' + state.leather + ' · строчка ' + state.thread;
      }
      if (frame && tint) {
        tint.style.background = state.color;
        var neutral = state.leather === 'Карамель' || state.leather === 'Мокко' || state.leather === 'Графит';
        frame.classList.toggle('is-tinted', !neutral);
      }
    }

    $$('[data-group]', config).forEach(function (row) {
      var group = row.getAttribute('data-group');
      $$('.chip, .swatch', row).forEach(function (btn) {
        btn.addEventListener('click', function () {
          $$('.chip, .swatch', row).forEach(function (b) { b.classList.remove('is-active'); });
          btn.classList.add('is-active');
          state[group] = btn.getAttribute('data-value');
          var col = btn.getAttribute('data-color');
          if (col) state.color = col;
          render();
        });
      });
    });

    render();
  }

  /* ---------- Gallery filter ---------- */
  var filters = $$('.filter');
  var galleryItems = $$('.gallery__item');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cat = btn.getAttribute('data-filter');
      filters.forEach(function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');

      galleryItems.forEach(function (item) {
        var match = cat === 'all' || item.getAttribute('data-cat') === cat;
        item.classList.toggle('is-hidden', !match);
        if (match) {
          item.classList.remove('is-in');
          // force reflow so the reveal replays softly
          void item.offsetWidth;
          item.classList.add('is-in');
        }
      });
    });
  });

  /* ---------- Gallery tilt (desktop) ---------- */
  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    galleryItems.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -4;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 4;
        card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-8px)';
      });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; });
    });
  }

  /* ---------- Form: заявка уходит в Google Таблицу ---------- */
  var form = $('#form');
  if (form) {
    var success = $('#formSuccess');
    var failure = $('#formError');
    var submitBtn = $('button[type="submit"]', form);
    var submitLabel = submitBtn ? $('span', submitBtn) : null;
    var submitText = submitLabel ? submitLabel.textContent : 'Отправить';
    var hideTimer = null;

    var show = function (node, on) { if (node) node.hidden = !on; };

    function setSending(on) {
      if (submitBtn) {
        submitBtn.classList.toggle('is-loading', on);
        submitBtn.disabled = on;
      }
      if (submitLabel) submitLabel.textContent = on ? 'Отправляем…' : submitText;
    }

    function reportSuccess() {
      window.clearTimeout(hideTimer);
      setSending(false);
      form.reset();
      show(failure, false);
      show(success, true);
      if (success) success.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      hideTimer = window.setTimeout(function () { show(success, false); }, 8000);
    }

    function reportFailure() {
      window.clearTimeout(hideTimer);
      setSending(false);
      show(success, false);
      show(failure, true);
    }

    /* Отправка заявки.
       Используем JSONP (запрос уходит тегом <script>), потому что ответ Google
       нельзя прочитать обычным fetch из-за политики CORS. Так сайт видит
       настоящий ответ Apps Script: сохранилась заявка или нет. */
    function submitLead(data) {
      return new Promise(function (resolve, reject) {
        var cb = 'lilaLead_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
        var params = new URLSearchParams(data);
        var tag = document.createElement('script');
        var settled = false;

        params.set('callback', cb);
        tag.async = true;
        tag.src = FORM_ENDPOINT + (FORM_ENDPOINT.indexOf('?') === -1 ? '?' : '&') + params.toString();

        var timer = window.setTimeout(function () { done(new Error('timeout')); }, 20000);

        function done(err, res) {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          if (tag.parentNode) tag.parentNode.removeChild(tag);
          try { delete window[cb]; } catch (e) { window[cb] = undefined; }
          if (err) { reject(err); } else { resolve(res); }
        }

        window[cb] = function (res) {
          if (res && res.ok === false) { done(new Error(res.error || 'rejected')); } else { done(null, res || {}); }
        };
        tag.onerror = function () { done(new Error('network')); };

        document.head.appendChild(tag);
      });
    }

    function utmTag() {
      var out = [];
      var q = new URLSearchParams(window.location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (key) {
        var v = q.get(key);
        if (v) out.push(key.replace('utm_', '') + ': ' + v);
      });
      return out.join(', ');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      show(success, false);
      show(failure, false);

      // Ловушка для спам-ботов: скрытое поле заполняют только роботы
      var trap = form.elements.company;
      if (trap && trap.value.trim()) return;

      var valid = true;
      $$('.field', form).forEach(function (field) {
        var input = $('input', field);
        if (!input || !input.required) return;
        var ok = input.value.trim().length > 2;
        field.classList.toggle('is-error', !ok);
        if (!ok && valid) { input.focus(); valid = false; }
      });
      if (!valid) return;

      var tag = utmTag();
      var data = {
        name: form.elements.name.value.trim(),
        contact: form.elements.contact.value.trim(),
        wish: form.elements.wish.value.trim(),
        source: 'Лендинг LILA' + (tag ? ' · ' + tag : ''),
        page: window.location.href.slice(0, 200)
      };

      // Таблица ещё не подключена — показываем успех, но заявка не сохраняется
      if (!FORM_ENDPOINT) {
        if (window.console) {
          window.console.warn('FORM_ENDPOINT не задан: заявка не была сохранена. См. README-google-sheets.md');
        }
        reportSuccess();
        return;
      }

      setSending(true);
      submitLead(data).then(reportSuccess, function (err) {
        if (window.console) window.console.warn('Не удалось отправить заявку:', err && err.message);
        reportFailure();
      });
    });

    $$('input', form).forEach(function (input) {
      input.addEventListener('input', function () {
        var field = input.closest('.field');
        if (field) field.classList.remove('is-error');
      });
    });
  }

  /* ---------- Initial paint ---------- */
  onScroll();
  window.addEventListener('resize', function () {
    parallax(window.pageYOffset || 0);
  });
})();
