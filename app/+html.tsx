import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

const STARTUP_FALLBACK_SCRIPT = `
(function () {
  var startupError = null;

  function showStartupFallback(message) {
    if (window.__ENOUGH_APP_HYDRATED__) return;
    if (document.getElementById('enough-startup-fallback')) return;

    var root = document.body;
    if (!root) return;

    var fallback = document.createElement('div');
    fallback.id = 'enough-startup-fallback';
    fallback.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:#0B0F14',
      'color:#F8FAFC',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      'padding:24px',
      'text-align:center'
    ].join(';');

    fallback.innerHTML =
      '<div style="max-width:460px">' +
      '<h1 style="font-size:24px;line-height:1.25;margin:0 0 12px">The app did not finish loading</h1>' +
      '<p style="font-size:15px;line-height:1.5;color:#CBD5E1;margin:0 0 16px">' +
      message +
      '</p>' +
      '<button type="button" onclick="window.location.reload()" style="min-height:48px;min-width:140px;border:0;border-radius:16px;background:#2F7D5B;color:#fff;font-weight:700;font-size:15px">Retry</button>' +
      '</div>';

    root.appendChild(fallback);
  }

  window.addEventListener('error', function (event) {
    startupError = event && event.message ? event.message : 'A browser error stopped startup.';
    setTimeout(function () {
      showStartupFallback(startupError);
    }, 1000);
  });

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event && event.reason;
    startupError = reason && reason.message ? reason.message : 'A startup request failed before the app could render.';
    setTimeout(function () {
      showStartupFallback(startupError);
    }, 1000);
  });

  setTimeout(function () {
    showStartupFallback(startupError || 'The browser loaded the page, but the app JavaScript did not hydrate. This usually means the deployed bundle is old, blocked, or crashing before React starts.');
  }, 30000);
})();
`;

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ScrollViewStyleReset />
        <script dangerouslySetInnerHTML={{ __html: STARTUP_FALLBACK_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
