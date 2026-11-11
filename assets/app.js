/* Дистанційний пілот БпС A1/A3 — рушій сайту
 * Контент лежить у content/*.js і додається в window.COURSE.
 * Уроки: { id, module, title, titleEn, kind?, html }
 * Вправи: COURSE.ex[id] = { type: 'tf' | 'mcq' | 'reveal' | 'matrix', ... }
 */
(function () {
  'use strict';

  var C = window.COURSE;
  var STORE_KEY = 'uas-a1a3-progress-v1';
  var state = loadState();

  // ---------- storage ----------
  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : { done: {} };
    } catch (e) { return { done: {} }; }
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  function markDone(id) {
    if (!state.done[id]) { state.done[id] = true; saveState(); }
    renderNav();
    renderProgress();
  }

  // ---------- helpers ----------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function lessonsOf(moduleId) { return C.lessons.filter(function (l) { return l.module === moduleId; }); }
  function lessonIndex(id) {
    for (var i = 0; i < C.lessons.length; i++) if (C.lessons[i].id === id) return i;
    return -1;
  }
  function moduleById(id) {
    for (var i = 0; i < C.modules.length; i++) if (C.modules[i].id === id) return C.modules[i];
    return null;
  }

  // ---------- navigation ----------
  function renderNav() {
    var nav = $('#sidebar');
    var current = currentLessonId();
    nav.innerHTML = '';
    var home = el('ul', 'nav-list');
    home.innerHTML = '<li><a href="#/" class="' + (current ? '' : 'active') + '"><span class="dot"></span><span>Про курс</span></a></li>';
    nav.appendChild(home);

    C.modules.forEach(function (m) {
      var ls = lessonsOf(m.id);
      var doneCount = ls.filter(function (l) { return state.done[l.id]; }).length;
      var wrap = el('div', 'nav-module');
      var t = el('div', 'nav-module-title', '<span>' + m.short + '</span><span class="count">' + doneCount + '/' + ls.length + '</span>');
      wrap.appendChild(t);
      var ul = el('ul', 'nav-list');
      ls.forEach(function (l) {
        var li = el('li');
        var cls = [];
        if (l.id === current) cls.push('active');
        if (state.done[l.id]) cls.push('done');
        if (l.kind === 'exam') cls.push('exam');
        li.innerHTML = '<a href="#/l/' + l.id + '" class="' + cls.join(' ') + '"><span class="dot"></span><span>' + l.title + '</span></a>';
        ul.appendChild(li);
      });
      wrap.appendChild(ul);
      nav.appendChild(wrap);
    });
  }

  function renderProgress() {
    var total = C.lessons.length;
    var done = C.lessons.filter(function (l) { return state.done[l.id]; }).length;
    var pct = total ? Math.round(done / total * 100) : 0;
    $('#progressFill').style.width = pct + '%';
    $('#progressText').textContent = pct + '%';
  }

  function currentLessonId() {
    var m = location.hash.match(/^#\/l\/([\w-]+)/);
    return m ? m[1] : null;
  }

  // ---------- pages ----------
  function renderHome() {
    var main = $('#content');
    var html = C.home;
    html += '<h2>Структура курсу</h2><div class="module-cards">';
    C.modules.forEach(function (m) {
      var first = lessonsOf(m.id)[0];
      html += '<a class="module-card" href="#/l/' + first.id + '"><h3>' + m.title + '</h3>' +
        '<p class="en">' + m.titleEn + '</p><p>' + m.desc + '</p></a>';
    });
    html += '</div>' + C.footer;
    main.innerHTML = html;
    enhance(main);
  }

  function renderLesson(id) {
    var idx = lessonIndex(id);
    if (idx < 0) { location.hash = '#/'; return; }
    var l = C.lessons[idx];
    var m = moduleById(l.module);
    var main = $('#content');
    var html = '<div class="crumbs">' + m.title + '</div>' +
      '<h1>' + l.title + '</h1>' +
      (l.titleEn ? '<p class="subtitle">' + l.titleEn + '</p>' : '') +
      l.html;

    var prev = C.lessons[idx - 1], next = C.lessons[idx + 1];
    html += '<div class="lesson-nav">' +
      (prev ? '<a class="prev" href="#/l/' + prev.id + '"><small>← Попередній</small>' + prev.title + '</a>' : '') +
      (next ? '<a class="next" href="#/l/' + next.id + '"><small>Наступний →</small>' + next.title + '</a>' : '') +
      '</div>' + C.footer;

    main.innerHTML = html;
    enhance(main);
    if (l.kind !== 'exam') markDone(l.id);
  }

  function route() {
    var id = currentLessonId();
    closeMenu();
    if (id) renderLesson(id); else renderHome();
    renderNav();
    renderProgress();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    $('#content').focus({ preventScroll: true });
  }

  // ---------- enhancements: tabs, slider, video, exercises ----------
  function enhance(root) {
    $all('[data-tabs]', root).forEach(buildTabs);
    $all('[data-slider]', root).forEach(buildSlider);
    $all('[data-video]', root).forEach(buildVideo);
    $all('[data-ex]', root).forEach(function (node) {
      var ex = C.ex[node.getAttribute('data-ex')];
      if (!ex) { node.innerHTML = '<p>Вправу не знайдено.</p>'; return; }
      buildExercise(node, ex);
    });
  }

  function buildTabs(node) {
    var sections = $all(':scope > section', node);
    var btns = el('div', 'tab-btns');
    node.classList.add('tabs');
    sections.forEach(function (s, i) {
      var b = el('button', i === 0 ? 'active' : '', s.getAttribute('data-title'));
      b.type = 'button';
      s.classList.add('tab-panel');
      if (i === 0) s.classList.add('active');
      b.addEventListener('click', function () {
        $all('button', btns).forEach(function (x) { x.classList.remove('active'); });
        sections.forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active'); s.classList.add('active');
      });
      btns.appendChild(b);
    });
    node.insertBefore(btns, node.firstChild);
  }

  function buildSlider(node) {
    var slides = $all(':scope > section', node);
    var i = 0;
    node.classList.add('slider');
    slides.forEach(function (s, k) {
      s.classList.add('slide');
      s.insertBefore(el('div', 'slide-num', 'Слайд ' + (k + 1) + ' з ' + slides.length), s.firstChild);
    });
    var nav = el('div', 'slider-nav');
    var prev = el('button', 'btn', '← Назад'); prev.type = 'button';
    var info = el('span');
    var next = el('button', 'btn primary', 'Далі →'); next.type = 'button';
    nav.appendChild(prev); nav.appendChild(info); nav.appendChild(next);
    node.appendChild(nav);
    function show() {
      slides.forEach(function (s, k) { s.classList.toggle('active', k === i); });
      info.textContent = (i + 1) + ' / ' + slides.length;
      prev.disabled = i === 0;
      next.disabled = i === slides.length - 1;
    }
    prev.addEventListener('click', function () { if (i > 0) { i--; show(); } });
    next.addEventListener('click', function () { if (i < slides.length - 1) { i++; show(); } });
    show();
  }

  function buildVideo(node) {
    var id = node.getAttribute('data-video');
    var h = node.getAttribute('data-h');
    var cap = node.getAttribute('data-cap') || '';
    var src = 'https://player.vimeo.com/video/' + id + (h ? '?h=' + h + '&' : '?') + 'dnt=1';
    node.className = 'video';
    node.innerHTML = '<div class="video-frame"><iframe src="' + src + '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy" title="' + cap.replace(/"/g, '&quot;') + '"></iframe></div>' +
      '<div class="video-cap">🎬 ' + cap + ' Відео англійською мовою (EUROCONTROL / DAC Luxembourg). Якщо воно не відтворюється, перегляньте його в курсі на Learning Zone.</div>';
  }

  // ---------- exercises ----------
  function exShell(node, ex, label) {
    node.className = 'ex';
    node.innerHTML = '';
    var head = el('div', 'ex-head',
      '<div class="ex-label">' + (label || 'Вправа') + '</div>' +
      '<div class="ex-title">' + (ex.title || '') + '</div>' +
      (ex.hint ? '<div class="ex-hint">' + ex.hint + '</div>' : ''));
    var body = el('div', 'ex-body');
    var foot = el('div', 'ex-score');
    node.appendChild(head); node.appendChild(body); node.appendChild(foot);
    return { body: body, foot: foot };
  }

  function buildExercise(node, ex) {
    if (ex.type === 'tf') return buildTF(node, ex);
    if (ex.type === 'mcq') return ex.exam ? buildExam(node, ex) : buildMCQ(node, ex);
    if (ex.type === 'reveal') return buildReveal(node, ex);
    if (ex.type === 'matrix') return buildMatrix(node, ex);
  }

  function scoreLine(foot, got, total, onReset) {
    foot.innerHTML = '';
    var s = el('span', '', 'Правильних відповідей: ' + got + ' з ' + total);
    var r = el('button', 'btn', 'Спробувати ще раз'); r.type = 'button';
    r.addEventListener('click', onReset);
    foot.appendChild(s); foot.appendChild(r);
  }

  function itemHeader(item, k) {
    return (item.scenario ? '<div class="scenario">' + item.scenario + '</div>' : '') +
      '<div class="ex-q"><span class="num">' + (k + 1) + '.</span>' + item.q + '</div>';
  }

  // Так / Ні (або інші дві мітки)
  function buildTF(node, ex) {
    var ui = exShell(node, ex);
    var labels = ex.labels || ['Так', 'Ні'];
    var answered = 0, correct = 0;
    ui.foot.style.display = 'none';
    ex.items.forEach(function (item, k) {
      var it = el('div', 'ex-item', itemHeader(item, k));
      var row = el('div', 'btn-row');
      var fb = el('div', 'fb');
      [true, false].forEach(function (val, j) {
        var b = el('button', 'btn', labels[j]); b.type = 'button';
        b.addEventListener('click', function () {
          var ok = val === item.a;
          $all('button', row).forEach(function (x) { x.disabled = true; });
          b.classList.add(ok ? 'correct' : 'wrong');
          if (!ok) $all('button', row)[item.a ? 0 : 1].classList.add('correct');
          fb.className = 'fb show ' + (ok ? 'ok' : 'bad');
          fb.innerHTML = '<strong>' + (ok ? 'Правильно. ' : 'Неправильно. ') + '</strong>' + (item.fb || '');
          answered++; if (ok) correct++;
          if (answered === ex.items.length) {
            ui.foot.style.display = '';
            scoreLine(ui.foot, correct, ex.items.length, function () { buildTF(node, ex); });
          }
        });
        row.appendChild(b);
      });
      it.appendChild(row); it.appendChild(fb);
      ui.body.appendChild(it);
    });
  }

  // Вибір однієї відповіді з миттєвою перевіркою
  function buildMCQ(node, ex) {
    var ui = exShell(node, ex);
    var answered = 0, correct = 0;
    ui.foot.style.display = 'none';
    ex.items.forEach(function (item, k) {
      var it = el('div', 'ex-item', itemHeader(item, k));
      var fb = el('div', 'fb');
      var opts = [];
      item.options.forEach(function (opt, j) {
        var b = el('button', 'btn option', opt); b.type = 'button';
        b.addEventListener('click', function () {
          var ok = j === item.correct;
          opts.forEach(function (x) { x.disabled = true; });
          b.classList.add(ok ? 'correct' : 'wrong');
          opts[item.correct].classList.add('correct');
          fb.className = 'fb show ' + (ok ? 'ok' : 'bad');
          fb.innerHTML = '<strong>' + (ok ? 'Правильно. ' : 'Неправильно. ') + '</strong>' + (item.fb || '');
          answered++; if (ok) correct++;
          if (answered === ex.items.length) {
            ui.foot.style.display = '';
            scoreLine(ui.foot, correct, ex.items.length, function () { buildMCQ(node, ex); });
          }
        });
        opts.push(b); it.appendChild(b);
      });
      it.appendChild(fb);
      ui.body.appendChild(it);
    });
  }

  // Тест модуля: спершу всі відповіді, потім перевірка, прохідний бал
  function buildExam(node, ex) {
    var ui = exShell(node, ex, 'Тест');
    var picks = {};
    var pass = ex.pass || 75;
    ex.items.forEach(function (item, k) {
      var it = el('div', 'ex-item', itemHeader(item, k));
      var opts = [];
      item.options.forEach(function (opt, j) {
        var b = el('button', 'btn option', opt); b.type = 'button';
        b.addEventListener('click', function () {
          if (b.disabled) return;
          opts.forEach(function (x) { x.classList.remove('primary'); });
          b.classList.add('primary');
          picks[k] = j;
        });
        opts.push(b); it.appendChild(b);
      });
      it.appendChild(el('div', 'fb'));
      ui.body.appendChild(it);
    });
    var submit = el('button', 'btn primary', 'Завершити тест'); submit.type = 'button';
    var info = el('span', '', 'Прохідний бал: ' + pass + '%');
    ui.foot.appendChild(info); ui.foot.appendChild(submit);
    var warned = false;
    submit.addEventListener('click', function () {
      var missing = ex.items.length - Object.keys(picks).length;
      if (missing > 0 && !warned) {
        warned = true;
        info.textContent = 'Без відповіді: ' + missing + ' пит. Натисніть ще раз, щоб завершити.';
        return;
      }
      var got = 0;
      $all('.ex-item', ui.body).forEach(function (it, k) {
        var item = ex.items[k];
        var opts = $all('.option', it);
        opts.forEach(function (x) { x.disabled = true; x.classList.remove('primary'); });
        var ok = picks[k] === item.correct;
        if (ok) got++;
        if (picks[k] != null) opts[picks[k]].classList.add(ok ? 'correct' : 'wrong');
        opts[item.correct].classList.add('correct');
        var fb = $('.fb', it);
        fb.className = 'fb show ' + (ok ? 'ok' : 'bad');
        fb.innerHTML = '<strong>' + (ok ? 'Правильно. ' : 'Неправильно. ') + '</strong>' + (item.fb || '');
      });
      var pct = Math.round(got / ex.items.length * 100);
      var passed = pct >= pass;
      ui.foot.innerHTML = '';
      var res = el('span', '', (passed ? '✅ Тест складено: ' : '❌ Тест не складено: ') + got + ' з ' + ex.items.length + ' (' + pct + '%)');
      var again = el('button', 'btn', 'Пройти ще раз'); again.type = 'button';
      again.addEventListener('click', function () { buildExam(node, ex); node.scrollIntoView({ behavior: 'smooth' }); });
      ui.foot.appendChild(res); ui.foot.appendChild(again);
      if (passed && ex.lesson) markDone(ex.lesson);
      ui.foot.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // Питання з відповіддю, яку можна розкрити
  function buildReveal(node, ex) {
    var ui = exShell(node, ex, ex.label || 'Обміркуйте');
    ui.foot.style.display = 'none';
    ex.items.forEach(function (item, k) {
      var it = el('div', 'ex-item', itemHeader(item, k));
      var b = el('button', 'btn', 'Показати відповідь'); b.type = 'button';
      var fb = el('div', 'fb neutral', item.a);
      b.addEventListener('click', function () {
        var open = fb.classList.toggle('show');
        b.textContent = open ? 'Сховати відповідь' : 'Показати відповідь';
      });
      it.appendChild(b); it.appendChild(fb);
      ui.body.appendChild(it);
    });
  }

  // Таблиця «рядки × стовпці» з вибором ТАК/НІ у кожній клітинці
  function buildMatrix(node, ex) {
    var ui = exShell(node, ex);
    var html = '<div class="table-wrap"><table class="matrix"><tr><th></th>';
    ex.cols.forEach(function (c) { html += '<th>' + c + '</th>'; });
    html += '</tr>';
    ex.rows.forEach(function (r, i) {
      html += '<tr><th>' + r + '</th>';
      ex.cols.forEach(function (c, j) {
        html += '<td><select data-r="' + i + '" data-c="' + j + '"><option value="">—</option><option value="1">ТАК</option><option value="0">НІ</option></select></td>';
      });
      html += '</tr>';
    });
    html += '</table></div>';
    ui.body.innerHTML = html;
    var fb = el('div', 'fb');
    ui.body.appendChild(fb);
    var check = el('button', 'btn primary', 'Перевірити'); check.type = 'button';
    var reset = el('button', 'btn', 'Очистити'); reset.type = 'button';
    ui.foot.appendChild(check); ui.foot.appendChild(reset);
    check.addEventListener('click', function () {
      var good = 0, total = 0, empty = 0;
      $all('select', ui.body).forEach(function (s) {
        var want = ex.answer[+s.getAttribute('data-r')][+s.getAttribute('data-c')];
        total++;
        s.classList.remove('correct', 'wrong');
        if (s.value === '') { empty++; return; }
        var ok = +s.value === want;
        if (ok) good++;
        s.classList.add(ok ? 'correct' : 'wrong');
      });
      var all = good === total;
      fb.className = 'fb show ' + (all ? 'ok' : 'bad');
      fb.innerHTML = all ? '<strong>Усе правильно! </strong>' + (ex.fb || '') :
        '<strong>Правильно ' + good + ' з ' + total + '.</strong> ' + (empty ? 'Заповніть порожні клітинки. ' : '') + 'Червоним позначено помилки.';
    });
    reset.addEventListener('click', function () { buildMatrix(node, ex); });
  }

  // ---------- mobile menu ----------
  function closeMenu() {
    $('#sidebar').classList.remove('open');
    $('#overlay').classList.remove('show');
  }
  $('#menuBtn').addEventListener('click', function () {
    $('#sidebar').classList.toggle('open');
    $('#overlay').classList.toggle('show');
  });
  $('#overlay').addEventListener('click', closeMenu);

  window.addEventListener('hashchange', route);
  route();
})();
