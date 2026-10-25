import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  const baseUrl = process.env.BASE_URL || process.env.PLATFORM_URL || 'https://example.com'
  const domain = baseUrl.replace(/\/$/, '')

  return new Response(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /admin/
Disallow: /profile/
Disallow: /tickets/

Sitemap: ${domain}/sitemap.xml
`, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
})
