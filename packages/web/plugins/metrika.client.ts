export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const CONSENT_KEY = 'donate_metrika_consent';
  const consent = localStorage.getItem(CONSENT_KEY);
  if (consent !== 'true') return;

  const script = document.createElement('script')
  script.type = 'text/javascript'
  script.text = `
    (function(m,e,t,r,i,k,a){
      m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=110025785', 'ym');

    ym(110025785, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
  `
  document.head.appendChild(script)

  const noscript = document.createElement('noscript')
  const img = document.createElement('img')
  img.src = 'https://mc.yandex.ru/watch/110025785'
  img.style.cssText = 'position:absolute; left:-9999px;'
  img.alt = ''
  noscript.appendChild(img)
  document.body.appendChild(noscript)
})
