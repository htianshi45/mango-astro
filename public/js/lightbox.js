/**
 * Mango 全站图片灯箱 · 微信朋友圈式交互 · 零依赖
 *
 * 触发源：
 *   1. .lightbox-link（PostImages 九宫格）→ 从 .post-images[data-images] 读取完整分组
 *   2. .post-content 内的裸 <img>（Markdown 正文）→ 自动按正文容器收集成一组
 *   3. 任意带 data-lightbox 的 <img> → 单图预览
 *   排除：data-no-lightbox、naturalWidth < 80 的图标、灯箱自身
 *
 * 交互：左右按钮 / ←→ / 单指横滑切换；下拉 / 点空白 / × / ESC 关闭；
 *      双击 / 滚轮 / 双指捏合缩放；放大后拖拽平移；顶部 1/9 计数。
 *
 * 打开/关闭用 FLIP 动画（First-Last-Invert-Play）：
 *      大图先被 transform 到「点击的那张缩略图」的位置与尺寸，再过渡回居中原始尺寸；
 *      关闭时反向缩回当前图片对应的缩略图。缩略图在动画期间 visibility:hidden 避免重影。
 *      缩略图与大图共用同一个 URL，浏览器已缓存，动画可以立即起步。
 *
 * ⚠️ 样式必须放在全局 CSS（src/styles/global.css），不能写在 .astro 的 <style> 里：
 *    浮层是运行时 createElement 创建的，没有 data-astro-cid-xxx，scoped 选择器命中不了。
 */
(function () {
  'use strict';
  if (window.__mangoLightbox) return;
  window.__mangoLightbox = true;

  var overlay = null, stage = null, imgEl = null, counterEl = null, prevBtn = null, nextBtn = null;
  var gallery = [], galleryThumbs = [], current = 0;
  var scale = 1, panX = 0, panY = 0;
  var savedOverflow = '', closing = false, animating = false;
  var hiddenOrigin = null;
  var pointers = new Map();
  var gesture = null, pinchStartDist = 0, pinchStartScale = 1;
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var DUR_OPEN = 360, DUR_CLOSE = 290;

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function srcOf(img) { return img.getAttribute('src') || img.currentSrc || ''; }
  function pointerDistance() {
    var p = Array.from(pointers.values());
    return p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }

  /** 把 last 矩形「伪装」成 first 矩形所需的 transform */
  function flipTransform(first, last) {
    var sx = first.width / last.width;
    var sy = first.height / last.height;
    var dx = (first.left + first.width / 2) - (last.left + last.width / 2);
    var dy = (first.top + first.height / 2) - (last.top + last.height / 2);
    return 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px) scale(' +
      sx.toFixed(4) + ',' + sy.toFixed(4) + ')';
  }
  function hideOrigin(el) { if (el) el.classList.add('mango-origin-hidden'); }
  function showOrigin(el) { if (el) el.classList.remove('mango-origin-hidden'); }

  function resolveSource(target) {
    // 1) 九宫格缩略图：保存 <a> 作为动画起点（它的方形框正好等于 object-fit:cover 的裁切框）
    var link = target.closest('.lightbox-link');
    if (link) {
      var box = link.closest('.post-images');
      var links = box
        ? Array.prototype.slice.call(box.querySelectorAll('.lightbox-link'))
        : Array.prototype.slice.call(document.querySelectorAll('.lightbox-link'));
      var list = [];
      if (box && box.dataset.images) {
        try { list = JSON.parse(box.dataset.images) || []; } catch (e) { list = []; }
      }
      if (!list.length) {
        var group = link.dataset.gallery;
        list = Array.prototype.filter.call(
          document.querySelectorAll('.lightbox-link'),
          function (a) { return !group || a.dataset.gallery === group; }
        ).map(function (a) { return a.getAttribute('href') || ''; });
      }
      var href = link.getAttribute('href') || '';
      var idx = list.indexOf(href);
      if (idx < 0) idx = Number(link.dataset.index || 0);
      if (!list.length) list = [href];
      // 前 9 张有对应缩略图 DOM，+N 折叠的没有 → 关闭时退回淡出
      var thumbs = list.map(function (_, i) { return links[i] || null; });
      return { list: list, index: idx, thumbs: thumbs };
    }

    // 2) 文章正文 / 显式标记的图片
    var img = target.closest('img');
    if (!img || img.hasAttribute('data-no-lightbox') || img.closest('.mango-lightbox')) return null;
    var scope = img.closest('.post-content');
    if (!scope && !img.hasAttribute('data-lightbox')) return null;
    var imgs = scope
      ? Array.prototype.filter.call(
          scope.querySelectorAll('img:not([data-no-lightbox])'),
          function (el) { return !el.naturalWidth || el.naturalWidth >= 80; }
        )
      : [img];
    var srcs = imgs.map(srcOf);
    if (!srcs.filter(Boolean).length) return null;
    return { list: srcs, index: Math.max(0, imgs.indexOf(img)), thumbs: imgs };
  }

  function applyTransform() {
    if (!imgEl) return;
    if (scale === 1 && panX === 0 && panY === 0) {
      imgEl.style.transform = '';
    } else {
      imgEl.style.transform = 'translate(' + panX + 'px,' + panY + 'px) scale(' + scale + ')';
    }
    imgEl.classList.toggle('is-zoomed', scale > 1);
  }

  function setScale(v) {
    scale = clamp(v, 1, 5);
    if (scale === 1) { panX = 0; panY = 0; }
    applyTransform();
  }

  /** 打开动画：大图从缩略图原位放大到居中 */
  function playOpenFlip() {
    if (!overlay || !imgEl) return;
    var origin = galleryThumbs[current];
    var first = origin ? origin.getBoundingClientRect() : null;
    var last = imgEl.getBoundingClientRect();
    if (reduceMotion || closing || !first || !first.width || !first.height || !last.width || !last.height) {
      overlay.classList.remove('is-animating');
      return;
    }

    hiddenOrigin = origin;
    hideOrigin(origin);
    animating = true;

    imgEl.style.transition = 'none';
    imgEl.style.transform = flipTransform(first, last);
    void imgEl.offsetWidth; // 强制回流，让起始 transform 生效

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (!overlay || !imgEl || closing) return;
        imgEl.style.transition = 'transform ' + DUR_OPEN + 'ms cubic-bezier(0.22, 0.75, 0.2, 1)';
        imgEl.style.transform = '';
        setTimeout(finishOpen, DUR_OPEN + 30);
      });
    });
  }

  function finishOpen() {
    animating = false;
    if (!overlay || !imgEl) return;
    imgEl.style.transition = '';
    imgEl.style.transform = '';
    overlay.classList.remove('is-animating');
    showOrigin(hiddenOrigin);
    hiddenOrigin = null;
  }

  function render(isOpen) {
    if (!imgEl || !counterEl) return;
    var src = gallery[current] || '';
    var handled = false;

    setScale(1);
    imgEl.style.transition = '';
    overlay.classList.add('is-loading');

    function afterLoad() {
      if (handled || !overlay) return;
      handled = true;
      overlay.classList.remove('is-loading');
      if (isOpen) playOpenFlip();
      else overlay.classList.remove('is-animating');
    }
    imgEl.onload = afterLoad;
    imgEl.onerror = afterLoad;
    imgEl.src = src;
    imgEl.alt = '第 ' + (current + 1) + ' 张，共 ' + gallery.length + ' 张';
    if (imgEl.complete && imgEl.naturalWidth) afterLoad(); // 缓存命中兜底

    var multi = gallery.length > 1;
    counterEl.textContent = multi ? (current + 1) + ' / ' + gallery.length : '';
    counterEl.style.display = multi ? '' : 'none';
    prevBtn.style.display = multi ? '' : 'none';
    nextBtn.style.display = multi ? '' : 'none';

    if (!isOpen) {
      imgEl.classList.remove('is-fade');
      void imgEl.offsetWidth;
      imgEl.classList.add('is-fade');
    } else {
      imgEl.classList.remove('is-fade');
    }

    // 预加载前后各一张，翻页不闪白
    [current + 1, current - 1].forEach(function (i) {
      var s = gallery[(i + gallery.length) % gallery.length];
      if (s) { var pre = new Image(); pre.src = s; }
    });
  }

  function go(dir) {
    if (gallery.length < 2) return;
    if (animating) finishOpen(); // 打断未结束的打开动画，避免残留 transform 影响切换
    current = (current + dir + gallery.length) % gallery.length;
    render(false);
  }

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'mango-lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '图片预览');
    overlay.innerHTML =
      '<div class="mango-lightbox-spinner" aria-hidden="true"></div>' +
      '<div class="mango-lightbox-stage">' +
        '<img class="mango-lightbox-img" alt="图片预览" draggable="false" />' +
      '</div>' +
      '<button class="mango-lightbox-btn mlb-close" type="button" aria-label="关闭">&times;</button>' +
      '<button class="mango-lightbox-btn mlb-prev" type="button" aria-label="上一张">&#8249;</button>' +
      '<button class="mango-lightbox-btn mlb-next" type="button" aria-label="下一张">&#8250;</button>' +
      '<div class="mango-lightbox-counter" aria-live="polite"></div>' +
      '<div class="mango-lightbox-hint">左右滑动 / ←→ 切换 · 双击 / 滚轮 / 双指缩放 · ESC 或点空白处关闭</div>';
    document.body.appendChild(overlay);
    void overlay.offsetWidth; // 强制首帧布局，否则随后加 is-solid 不会触发 background-color 过渡

    stage = overlay.querySelector('.mango-lightbox-stage');
    imgEl = overlay.querySelector('.mango-lightbox-img');
    counterEl = overlay.querySelector('.mango-lightbox-counter');
    prevBtn = overlay.querySelector('.mlb-prev');
    nextBtn = overlay.querySelector('.mlb-next');

    overlay.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('.mlb-close')) { close(); return; }
      if (t.closest('.mlb-prev')) { go(-1); return; }
      if (t.closest('.mlb-next')) { go(1); return; }
      if (t === overlay || t === stage) close();
    });

    imgEl.addEventListener('dblclick', function (e) {
      e.preventDefault();
      setScale(scale > 1 ? 1 : 2.5);
    });

    overlay.addEventListener('wheel', function (e) {
      e.preventDefault();
      setScale(scale + (e.deltaY < 0 ? 0.3 : -0.3));
    }, { passive: false });

    // 指针：放大后拖拽平移；未放大时横滑切换 / 下拉关闭；双指捏合缩放
    stage.addEventListener('pointerdown', function (e) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      if (pointers.size === 1) {
        gesture = { x: e.clientX, y: e.clientY, panX: panX, panY: panY };
      } else if (pointers.size === 2) {
        pinchStartDist = pointerDistance();
        pinchStartScale = scale;
        gesture = null;
      }
    });

    stage.addEventListener('pointermove', function (e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size >= 2) {
        if (pinchStartDist) setScale(pinchStartScale * pointerDistance() / pinchStartDist);
        return;
      }
      if (!gesture) return;
      var dx = e.clientX - gesture.x;
      var dy = e.clientY - gesture.y;
      if (scale > 1) {
        panX = gesture.panX + dx;
        panY = gesture.panY + dy;
        applyTransform();
      } else if (Math.abs(dy) > Math.abs(dx)) {
        overlay.style.opacity = String(Math.max(0.35, 1 - Math.abs(dy) / 500));
      }
    });

    function endPointer(e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchStartDist = 0;
      if (!gesture) return;
      var dx = e.clientX - gesture.x;
      var dy = e.clientY - gesture.y;
      gesture = null;
      if (scale > 1) return;
      overlay.style.opacity = '';
      if (Math.abs(dy) > 110 && Math.abs(dy) > Math.abs(dx)) { close(); return; }
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    }
    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);
  }

  function open(source) {
    if (!source || !source.list.length || closing) return;
    gallery = source.list.slice();
    galleryThumbs = (source.thumbs || []).slice();
    current = clamp(source.index, 0, gallery.length - 1);
    ensureOverlay();
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('lightbox-open');
    overlay.classList.remove('is-closing', 'is-flipping');
    overlay.classList.add('is-animating', 'is-solid'); // 背景渐黑，与放大同时进行
    overlay.style.opacity = '';
    render(true);
    var closeBtn = overlay.querySelector('.mlb-close');
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function close() {
    if (!overlay || closing) return;
    closing = true;
    var el = overlay;
    var origin = galleryThumbs[current];
    // 放大状态 / 打开动画未结束 / 折叠图片无对应缩略图 → 退回淡出
    var canFlip = !reduceMotion && !animating && scale === 1 && !!origin && !!imgEl;
    var first = canFlip ? origin.getBoundingClientRect() : null;
    var last = canFlip ? imgEl.getBoundingClientRect() : null;
    if (!first || !first.width || !first.height || !last || !last.width || !last.height) canFlip = false;

    if (canFlip) {
      hideOrigin(origin);
      hiddenOrigin = origin;
      el.classList.add('is-flipping');
      imgEl.style.transition = 'none';
      imgEl.style.transform = '';
      void imgEl.offsetWidth;
      var target = flipTransform(first, last);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (!imgEl) return;
          imgEl.style.transition = 'transform ' + DUR_CLOSE + 'ms cubic-bezier(0.4, 0, 0.7, 0.3)';
          imgEl.style.transform = target;
        });
      });
    }

    el.classList.remove('is-solid');
    el.classList.add('is-closing');

    setTimeout(function () {
      el.remove();
      document.body.style.overflow = savedOverflow;
      document.documentElement.classList.remove('lightbox-open');
      showOrigin(hiddenOrigin);
      overlay = stage = imgEl = counterEl = prevBtn = nextBtn = null;
      gallery = []; galleryThumbs = [];
      pointers.clear();
      gesture = null;
      closing = false; animating = false; hiddenOrigin = null;
    }, canFlip ? DUR_CLOSE + 20 : 200);
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof Element) || t.closest('.mango-lightbox')) return;
    var source = resolveSource(t);
    if (!source) return;
    e.preventDefault();
    open(source);
  });

  document.addEventListener('keydown', function (e) {
    if (!overlay) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === '+' || e.key === '=') setScale(scale + 0.5);
    else if (e.key === '-') setScale(scale - 0.5);
  });
})();
