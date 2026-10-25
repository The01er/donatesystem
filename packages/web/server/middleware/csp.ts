export default defineEventHandler((event) => {
  const url = getRequestURL(event).pathname;
  if (url.startsWith('/shop/') || url.startsWith('/shop-legal/') || url === '/') {
    const isDev = process.env.NODE_ENV !== 'production';
    setResponseHeader(
      event,
      'Content-Security-Policy',
      "default-src 'self'; " +
        `connect-src 'self' ${isDev ? 'ws://localhost:5173 wss://localhost:5173 ' : ''}https://mc.yandex.ru wss://mc.yandex.ru https://mc.yandex.com wss://mc.yandex.com https://fonts.googleapis.com https://fonts.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com; ` +
        "script-src 'self' 'unsafe-inline' https://mc.yandex.ru https://mc.yandex.com https://challenges.cloudflare.com https://www.googletagmanager.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "img-src 'self' data: blob: https:; " +
        "font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com; " +
        "frame-src 'self' about: https://yoomoney.ru https://*.yoomoney.ru https://anypay.io https://enot.io https://challenges.cloudflare.com https://yookassa.ru; " +
        "base-uri 'self'; " +
        "form-action 'self'; " +
        "frame-ancestors 'none'; " +
        "object-src 'none'",
    );
  }
});
