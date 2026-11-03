/* Niche Scouting — Mixpanel EU analytics
 * Tracking starts ONLY after the visitor explicitly accepts analytics.
 * The consent choice is stored locally. No cookies or analytics SDK are
 * loaded before consent.
 */
(() => {
  'use strict';

  const MIXPANEL_TOKEN = 'cb43e82d486dcd7c51138c00bf0cdcd6';
  const MIXPANEL_API_HOST = 'https://api-eu.mixpanel.com';
  const CONSENT_KEY = 'niche_scouting_analytics_consent';
  const SDK_URL = 'https://cdn.mxpnl.com/libs/mixpanel-2-latest.min.js';

  let initialized = false;
  let sdkPromise;

  function getConsent() {
    try { return localStorage.getItem(CONSENT_KEY); }
    catch (_) { return null; }
  }

  function loadMixpanel() {
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      if (window.mixpanel && typeof window.mixpanel.init === 'function') {
        resolve(window.mixpanel);
        return;
      }
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => window.mixpanel ? resolve(window.mixpanel) : reject(new Error('Mixpanel SDK unavailable'));
      script.onerror = () => reject(new Error('Mixpanel SDK failed to load'));
      document.head.appendChild(script);
    });
    return sdkPromise;
  }

  function currentPageProperties() {
    return {
      page_title: document.title,
      page_path: window.location.pathname,
      page_url: window.location.href
    };
  }

  async function enableAnalytics() {
    if (initialized) return;
    try {
      const mp = await loadMixpanel();
      if (initialized) return;
      mp.init(MIXPANEL_TOKEN, {
        api_host: MIXPANEL_API_HOST,
        track_pageview: false,
        persistence: 'localStorage',
        autocapture: false
      });
      initialized = true;
      mp.track('page_viewed', currentPageProperties());

      document.addEventListener('click', (event) => {
        const link = event.target.closest('a[href]');
        if (!link) return;
        let url;
        try { url = new URL(link.href, window.location.href); } catch (_) { return; }
        if (url.origin !== window.location.origin) return;
        const match = url.pathname.match(/^\/niche\/([^/]+)\/?$/);
        if (!match) return;
        mp.track('niche_selected', {
          niche_slug: match[1],
          niche_name: (link.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
          source_page: window.location.pathname
        });
      });
    } catch (error) {
      console.warn('[Niche Scouting] Analytics could not initialize:', error);
      sdkPromise = null;
    }
  }

  function saveConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (_) {}
    const banner = document.getElementById('ns-consent-banner');
    if (banner) banner.remove();
    if (value === 'accepted') enableAnalytics();
  }

  function showConsentBanner() {
    if (document.getElementById('ns-consent-banner')) return;
    const banner = document.createElement('section');
    banner.id = 'ns-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Analytics consent');
    banner.innerHTML = `
      <div class="ns-consent-copy">
        <strong>Analytics preferences</strong>
        <p>We use Mixpanel to understand how visitors use Niche Scouting. Analytics remains disabled unless you accept. You can reject and still use the site.</p>
      </div>
      <div class="ns-consent-actions">
        <button type="button" data-consent="rejected">Reject</button>
        <button type="button" data-consent="accepted">Accept analytics</button>
      </div>`;
    const style = document.createElement('style');
    style.textContent = `
      #ns-consent-banner{position:fixed;z-index:99999;left:16px;right:16px;bottom:16px;max-width:760px;margin:auto;padding:18px;display:flex;gap:18px;align-items:center;justify-content:space-between;background:#111;color:#fff;border:1px solid #444;border-radius:14px;box-shadow:0 8px 32px #0005;font:14px/1.5 system-ui,sans-serif}
      #ns-consent-banner p{margin:5px 0 0;color:#ddd}
      .ns-consent-actions{display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap}
      .ns-consent-actions button{border:1px solid #aaa;border-radius:8px;padding:9px 13px;font:600 13px system-ui;cursor:pointer}
      .ns-consent-actions button[data-consent="rejected"]{background:transparent;color:#fff}
      .ns-consent-actions button[data-consent="accepted"]{background:#ba2be2;border-color:#ba2be2;color:#fff}
      @media(max-width:600px){#ns-consent-banner{align-items:stretch;flex-direction:column;bottom:8px;left:8px;right:8px}.ns-consent-actions{justify-content:flex-end}}
    `;
    document.head.appendChild(style);
    banner.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-consent]');
      if (button) saveConsent(button.dataset.consent);
    });
    document.body.appendChild(banner);
  }

  function start() {
    const consent = getConsent();
    if (consent === 'accepted') enableAnalytics();
    else if (consent !== 'rejected') showConsentBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  // Expose a small method for a future Privacy Settings link.
  window.NicheScoutingAnalytics = {
    reopenConsent: () => {
      try { localStorage.removeItem(CONSENT_KEY); } catch (_) {}
      showConsentBanner();
    }
  };
})();
