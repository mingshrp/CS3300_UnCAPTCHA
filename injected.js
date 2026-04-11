// injected.js - runs in the page's main world to deliver a reCAPTCHA v2
// solution token to the page. Content scripts live in an isolated world
// and cannot see the page's window globals (including the site's callback
// or Google's ___grecaptcha_cfg registry), so this runs inline in the page.
//
// An external script file is used instead of a literal inline <script>
// so it is not blocked by page CSP — chrome-extension:// URLs are
// whitelisted in the extension's CSP.
(function () {
  const current = document.currentScript;
  if (!current) return;

  const explicitCallback = current.dataset.callback || '';
  const solution = current.dataset.solution || '';
  if (!solution) return;

  // 1. Fill every g-recaptcha-response textarea on the page. reCAPTCHA v2
  //    creates one per widget (g-recaptcha-response, -1, -2, ...). Writing
  //    to all of them covers pages with multiple widgets and also the
  //    common case where the name-selector and id-selector differ.
  const textareas = new Set();
  document.querySelectorAll('textarea[id^="g-recaptcha-response"], textarea[name^="g-recaptcha-response"]').forEach(t => textareas.add(t));
  textareas.forEach((t) => {
    t.style.display = '';
    t.innerHTML = solution;
    t.value = solution;
    t.dispatchEvent(new Event('input', { bubbles: true }));
    t.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Helper: resolve a dotted path like "myapp.onSuccess" off window.
  function resolvePath(path) {
    if (!path) return null;
    const parts = path.split('.');
    let ref = window;
    for (const p of parts) {
      if (ref == null) return null;
      ref = ref[p];
    }
    return typeof ref === 'function' ? ref : null;
  }

  // 2. If the widget declared data-callback, try to invoke it directly.
  if (explicitCallback) {
    const fn = resolvePath(explicitCallback);
    if (fn) {
      try { fn(solution); } catch (e) { console.log('UnCAPTCHA: explicit callback threw', e); }
    } else {
      console.log('UnCAPTCHA: Callback ' + explicitCallback + ' not found in window');
    }
  }

  // 3. Walk Google's internal client registry to find every widget's
  //    callback and invoke it. This is the path that works when the
  //    site wired the callback via grecaptcha.render({ callback: fn })
  //    (so there is no data-callback attribute to read).
  try {
    const cfg = window.___grecaptcha_cfg;
    if (cfg && cfg.clients) {
      Object.keys(cfg.clients).forEach((clientId) => {
        const client = cfg.clients[clientId];
        // The callback is nested somewhere inside the client object at an
        // unstable path. Walk up to a reasonable depth looking for a
        // function that looks like a reCAPTCHA callback ('callback' key).
        const seen = new Set();
        (function walk(obj, depth) {
          if (!obj || typeof obj !== 'object' || depth > 6 || seen.has(obj)) return;
          seen.add(obj);
          for (const key of Object.keys(obj)) {
            let value;
            try { value = obj[key]; } catch (e) { continue; }
            if (key === 'callback' && typeof value === 'function') {
              try { value(solution); } catch (e) { console.log('UnCAPTCHA: client callback threw', e); }
            } else if (value && typeof value === 'object') {
              walk(value, depth + 1);
            }
          }
        })(client, 0);
      });
    }
  } catch (e) {
    console.log('UnCAPTCHA: grecaptcha client walk failed', e);
  }
})();
