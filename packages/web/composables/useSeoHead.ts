export function useSeoHead(options: {
  title: string;
  description: string;
  ogImage?: string;
  canonical?: string;
  jsonLd?: Record<string, unknown>[];
  noTemplate?: boolean;
}) {
  const baseUrl = 'https://example.com';
  const ogImage = options.ogImage || `${baseUrl}/og-image.png`;

  useHead({
    title: options.title,
    titleTemplate: options.noTemplate ? undefined : `%s | DonatePlatform`,
    meta: [
      { name: 'description', content: options.description },
      { property: 'og:locale', content: 'ru_RU' },
      { property: 'og:title', content: options.title },
      { property: 'og:description', content: options.description },
      { property: 'og:image', content: ogImage },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: options.title },
      { name: 'twitter:description', content: options.description },
      { name: 'twitter:image', content: ogImage },
    ],
    link: options.canonical ? [{ rel: 'canonical', href: options.canonical }] : [],
    script: options.jsonLd
      ? options.jsonLd.map((data) => ({
          type: 'application/ld+json',
          innerHTML: JSON.stringify(data),
        }))
      : [],
  });
}
