import { defineEventHandler } from 'h3'

interface StaticPage { loc: string; priority: string; changefreq: string; type: 'static' }
interface NewsPage { loc: string; lastmod?: string; priority: string; type: 'news' }
interface LegalPage { loc: string; priority: string; type: 'legal' }
interface ShopPage { loc: string; priority: string; type: 'shop' }
interface GuidePage { loc: string; lastmod?: string; priority: string; type: 'guide' }

type Page = StaticPage | NewsPage | LegalPage | ShopPage | GuidePage

export default defineEventHandler(async () => {
  const baseUrl = process.env.BASE_URL || process.env.PLATFORM_URL || 'https://example.com'
  const domain = baseUrl.replace(/\/$/, '')

  const staticPages: StaticPage[] = [
    { loc: '', priority: '1.0', changefreq: 'weekly', type: 'static' },
    { loc: '/login', priority: '0.3', changefreq: 'monthly', type: 'static' },
    { loc: '/register', priority: '0.3', changefreq: 'monthly', type: 'static' },
    { loc: '/news', priority: '0.6', changefreq: 'daily', type: 'static' },
    { loc: '/faq', priority: '0.5', changefreq: 'weekly', type: 'static' },
    { loc: '/guides', priority: '0.7', changefreq: 'daily', type: 'static' },
    { loc: '/legal/offer', priority: '0.4', changefreq: 'monthly', type: 'static' },
    { loc: '/legal/privacy', priority: '0.4', changefreq: 'monthly', type: 'static' },
    { loc: '/legal/terms', priority: '0.4', changefreq: 'monthly', type: 'static' },
  ]

  let newsPages: NewsPage[] = []
  let legalPages: LegalPage[] = []
  let shopPages: ShopPage[] = []
  let guidePages: GuidePage[] = []

  try {
    const news = await $fetch<{ slug: string; updatedAt?: string }[]>('http://localhost:3001/api/news', {
      params: { limit: '50' },
    }).catch(() => [])
    newsPages = (Array.isArray(news) ? news : []).map((item) => ({
      loc: `/news/${item.slug || ''}`,
      lastmod: item.updatedAt,
      priority: '0.5',
      type: 'news' as const,
    }))
  } catch {
    console.warn('[sitemap] Failed to fetch news')
  }

  try {
    const docs = await $fetch<{ slug: string }[]>('http://localhost:3001/api/legal').catch(() => [])
    legalPages = (Array.isArray(docs) ? docs : []).map((doc) => ({
      loc: `/legal/${doc.slug}`,
      priority: '0.4',
      type: 'legal' as const,
    }))
  } catch {
    console.warn('[sitemap] Failed to fetch legal docs')
  }

  try {
    const servers = await $fetch<{ slug: string; customDomain?: string | null }[]>('http://localhost:3001/api/servers?limit=1000').catch(() => [])
    if (Array.isArray(servers)) {
      shopPages = servers.map((srv) => ({
        loc: srv.customDomain ? `https://${srv.customDomain}` : `https://${srv.slug}.${new URL(domain).hostname}`,
        priority: '0.5',
        type: 'shop' as const,
      }))
    }
  } catch {
    console.warn('[sitemap] Failed to fetch servers')
  }

  try {
    const guides = await $fetch<{ items: { slug: string; updatedAt: string }[] }>('http://localhost:3001/api/guides?limit=1000').catch(() => null)
    if (guides?.items) {
      guidePages = guides.items.map((g) => ({
        loc: `/guides/${g.slug}`,
        lastmod: g.updatedAt,
        priority: '0.6',
        type: 'guide' as const,
      }))
    }
  } catch {
    console.warn('[sitemap] Failed to fetch guides')
  }

  const allPages: Page[] = [...staticPages, ...newsPages, ...legalPages, ...shopPages, ...guidePages]

  const urls = allPages
    .map((page) => {
      const lastmod = page.type === 'news' || page.type === 'guide' ? (page as NewsPage | GuidePage).lastmod : undefined
      const changefreq = page.type === 'static' ? page.changefreq : 'monthly'
      return `  <url>
    <loc>${domain}${page.loc}</loc>
    ${lastmod ? `<lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
})
