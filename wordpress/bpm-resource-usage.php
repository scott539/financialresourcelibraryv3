<?php
/**
 * Plugin Name: BiggerPockets Money Resource Usage
 * Description: Connects published tool pages and embedded file cards to the Resource Library counters.
 */
defined('ABSPATH') || exit;

// Preserve the old spoken/printed PFS shortcut. Its landing page is never a download.
add_action('template_redirect', static function () {
    if (is_404() && is_string($_SERVER['REQUEST_URI'] ?? null) &&
        strtolower(trim(wp_parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/')) === 'pfs') {
        wp_safe_redirect(home_url('/resources-pfs/'), 301);
        exit;
    }
});

add_action('wp_footer', static function () {
    if (is_admin() || is_preview() || is_404() || !is_singular() ||
        !in_array(wp_parse_url(home_url(), PHP_URL_HOST), array('biggerpocketsmoney.com', 'www.biggerpocketsmoney.com'), true)) {
        return;
    }
    $tool = is_page(array(15847, 4956, 15931, 15807, 15853));
    ?>
    <script>
    (() => {
      const app = 'https://financialresourcelibraryv3.vercel.app';
      const root = document.documentElement;
      function script(path) {
        const tag = document.createElement('script');
        tag.src = app + path;
        document.body.appendChild(tag);
      }
      script('/usage-consent.js');
      let sent = false;
      function update(granted) {
        root.dataset.bpmAnalyticsConsent = granted === true ? 'granted' : 'denied';
        if (<?php echo $tool ? 'true' : 'false'; ?> && granted === true && !sent) {
          sent = true;
          script('/tool-pageview.js');
        }
      }
      // Fail closed. Sites using a different CMP dispatch this event from their
      // analytics consent trigger on initial state and on subsequent changes.
      window.addEventListener('bpm:analytics-consent', e => update(e.detail === true));
      function sync() {
        if (typeof window.wp_has_consent === 'function') update(window.wp_has_consent('statistics'));
      }
      document.addEventListener('wp_listen_for_consent_change', sync);
      window.addEventListener('load', sync, {once:true});
      sync();
    })();
    </script>
    <?php
}, 99);
