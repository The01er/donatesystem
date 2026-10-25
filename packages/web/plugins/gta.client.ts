declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

function gtag(...args: unknown[]): void {
  window.dataLayer.push(args);
}

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const CONSENT_KEY = 'donate_analytics_consent';
  const consent = localStorage.getItem(CONSENT_KEY);
  if (consent !== 'true') return;

  const GA_ID = 'G-NEVKJ4QW8W';

  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.async = true;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  gtag('js', new Date());
  gtag('config', GA_ID);
})
