/**
 * BiggerPockets Money — Financial Resource Library
 * Embed loader script (embed.js)
 * ------------------------------------------------------------------
 * Paste ONE <script src=".../embed.js"></script> on a landing page, then add one or more
 * container <div>s. Each container becomes an auto-sizing iframe showing a single resource
 * module in the layout you choose.
 *
 * CONTAINER ATTRIBUTES:
 *   data-resource-id  (required)  The resource id, e.g. "bp-budget-template-tracker".
 *                                 If omitted, the full library home page is embedded instead.
 *   data-layout       (optional)  "wide"    -> full desktop-width horizontal module
 *                                 "compact" -> tall/skinny vertical module (default)
 *
 * You can place as many containers on a page as you like. Each is sized independently.
 *
 * Recommended container class: "bp-money-embed"
 * (Legacy IDs #bp-money-library / #bp-money-library-root are still supported.)
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';

  // The origin the iframes load from. Derived automatically from this script's own src,
  // with a hard fallback for cases where document.currentScript is unavailable.
  var FALLBACK_ORIGIN = 'https://financialresourcelibraryv3.vercel.app';

  function resolveBaseUrl() {
    var cs = document.currentScript;
    var src = cs && cs.src ? cs.src : '';
    if (src) {
      try {
        return new URL(src).origin;
      } catch (e) {
        /* fall through */
      }
    }
    // As a secondary attempt, scan for any script tag pointing at embed.js
    try {
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].src && scripts[i].src.indexOf('embed.js') !== -1) {
          return new URL(scripts[i].src).origin;
        }
      }
    } catch (e2) {
      /* ignore */
    }
    return FALLBACK_ORIGIN;
  }

  var BASE_URL = resolveBaseUrl();

  // Minimum safe heights (px) per layout, applied during load and as a floor afterward,
  // so the module never visually clips before the real height arrives.
  var MIN_HEIGHT = { wide: 360, compact: 420, home: 600 };

  // Track every iframe we create so the shared message listener can match height
  // updates back to the correct frame (supports multiple embeds on one page).
  var frames = [];

  function normalizeLayout(value) {
    var v = (value || '').toString().toLowerCase().trim();
    if (v === 'wide') return 'wide';
    if (v === 'compact') return 'compact';
    return 'compact'; // default
  }

  function buildIframeUrl(resourceId, layout) {
    if (!resourceId) {
      // No specific resource -> embed the whole library home page.
      return BASE_URL + '/#/';
    }
    return BASE_URL + '/#/embed/' + encodeURIComponent(resourceId) + '?layout=' + encodeURIComponent(layout);
  }

  function createEmbed(container) {
    // Guard against double-initialization (e.g. script included twice).
    if (container.getAttribute('data-bp-initialized') === 'true') return;
    if (container.querySelector('iframe')) {
      container.setAttribute('data-bp-initialized', 'true');
      return;
    }

    var resourceId = container.getAttribute('data-resource-id') || '';
    var layout = normalizeLayout(container.getAttribute('data-layout'));
    var minKey = resourceId ? layout : 'home';
    var minHeight = MIN_HEIGHT[minKey] || 420;

    var iframe = document.createElement('iframe');
    iframe.src = buildIframeUrl(resourceId, layout);
    iframe.style.width = '100%';
    iframe.style.height = minHeight + 'px';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    iframe.style.display = 'block';
    iframe.style.margin = '0 auto';
    iframe.style.transition = 'height 0.2s ease-out';
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute(
      'title',
      resourceId
        ? 'BiggerPockets Money resource: ' + resourceId
        : 'BiggerPockets Money Financial Resource Library'
    );

    container.appendChild(iframe);
    container.setAttribute('data-bp-initialized', 'true');

    frames.push({
      iframe: iframe,
      win: iframe.contentWindow,
      minHeight: minHeight
    });

    // contentWindow becomes reliable after load; refresh the reference then.
    iframe.addEventListener('load', function () {
      for (var i = 0; i < frames.length; i++) {
        if (frames[i].iframe === iframe) {
          frames[i].win = iframe.contentWindow;
          break;
        }
      }
    });
  }

  function initAll() {
    // Preferred: any element with the class "bp-money-embed".
    var containers = [];
    var byClass = document.querySelectorAll('.bp-money-embed');
    for (var i = 0; i < byClass.length; i++) containers.push(byClass[i]);

    // Legacy single-container IDs, included only if not already matched by class.
    ['bp-money-library', 'bp-money-library-root'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && containers.indexOf(el) === -1) containers.push(el);
    });

    if (containers.length === 0) {
      console.warn(
        '[BP Money Embed] No embed containers found. Add a <div class="bp-money-embed" data-resource-id="..."></div>.'
      );
      return;
    }

    containers.forEach(createEmbed);
  }

  // Single shared listener for height messages from all embedded frames.
  window.addEventListener(
    'message',
    function (e) {
      var data = e.data;
      if (!data || data.type !== 'financial-library-resize') return;

      var height = parseInt(data.height, 10);
      if (isNaN(height) || height <= 0) return;

      // Match the message to the frame it came from via event.source.
      for (var i = 0; i < frames.length; i++) {
        var f = frames[i];
        if (f.win && e.source === f.win) {
          f.iframe.style.height = Math.max(f.minHeight, height) + 'px';
          return;
        }
      }

      // Fallback: if we couldn't match the source (some browsers/edge cases),
      // and there is exactly one frame on the page, size that one.
      if (frames.length === 1) {
        frames[0].iframe.style.height = Math.max(frames[0].minHeight, height) + 'px';
      }
    },
    false
  );

  // Initialize as soon as the DOM is ready.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
