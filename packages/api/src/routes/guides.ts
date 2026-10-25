import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import prisma from '../plugins/prisma.js';

const createGuideSchema = z.object({
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  excerpt: z.string().max(300).optional().nullable(),
  imageUrl: z.string().max(500).optional().nullable(),
  category: z.string().min(1).max(50).default('general'),
  tags: z.string().max(300).optional().nullable(),
  published: z.boolean().optional().default(false),
  metaTitle: z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(300).optional().nullable(),
});

const updateGuideSchema = z.object({
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/).optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().max(300).optional().nullable(),
  imageUrl: z.string().max(500).optional().nullable(),
  category: z.string().min(1).max(50).optional(),
  tags: z.string().max(300).optional().nullable(),
  published: z.boolean().optional(),
  metaTitle: z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(300).optional().nullable(),
});

export default async function guideRoutes(app: FastifyInstance) {
  // ── Public endpoints ──────────────────────────────────────────
  app.get('/api/guides', { schema: { tags: ['guides'] } }, async (req: FastifyRequest) => {
    const query = req.query as { category?: string; page?: string; limit?: string };
    const category = query.category || undefined;
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit || '12', 10) || 12));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { published: true };
    if (category) where.category = category;

    const [items, total] = await Promise.all([
      prisma.guide.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true, slug: true, title: true, excerpt: true,
          imageUrl: true, category: true, tags: true,
          createdAt: true, updatedAt: true,
        },
      }),
      prisma.guide.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  });

  app.get('/api/guides/categories', { schema: { tags: ['guides'] } }, async () => {
    const result = await prisma.guide.findMany({
      where: { published: true },
      select: { category: true },
      distinct: ['category'],
    });
    return result.map((r) => r.category);
  });

  app.get('/api/guides/:slug', { schema: { tags: ['guides'] } }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { slug } = req.params as { slug: string };
    const guide = await prisma.guide.findUnique({
      where: { slug, published: true },
    });
    if (!guide) return reply.status(404).send({ error: 'Guide not found' });
    return guide;
  });

  // ── Admin endpoints ───────────────────────────────────────────
  app.get(
    '/api/admin/guides',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req: FastifyRequest) => {
      const query = req.query as { page?: string; limit?: string };
      const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10) || 20));
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        prisma.guide.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.guide.count(),
      ]);

      return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
    },
  );

  app.get(
    '/api/admin/guides/:id',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as { id: string };
      const guide = await prisma.guide.findUnique({ where: { id } });
      if (!guide) return reply.status(404).send({ error: 'Guide not found' });
      return guide;
    },
  );

  app.post(
    '/api/admin/guides',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = createGuideSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const existing = await prisma.guide.findUnique({ where: { slug: parsed.data.slug } });
      if (existing) return reply.status(409).send({ error: 'Guide with this slug already exists' });

      return prisma.guide.create({ data: parsed.data });
    },
  );

  app.put(
    '/api/admin/guides/:id',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as { id: string };
      const parsed = updateGuideSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const existing = await prisma.guide.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Guide not found' });

      if (parsed.data.slug) {
        const slugExists = await prisma.guide.findUnique({ where: { slug: parsed.data.slug } });
        if (slugExists && slugExists.id !== id) {
          return reply.status(409).send({ error: 'Slug already in use' });
        }
      }

      return prisma.guide.update({ where: { id }, data: parsed.data });
    },
  );

  app.delete(
    '/api/admin/guides/:id',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as { id: string };
      const existing = await prisma.guide.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Guide not found' });
      await prisma.guide.delete({ where: { id } });
      return { ok: true };
    },
  );

  // ── AI generation ────────────────────────────────────────────
  const generateSchema = z.object({
    topic: z.string().min(3).max(300),
    language: z.string().default('ru'),
  });

  app.post(
    '/api/admin/guides/generate',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = generateSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
      const apiUrl = settings?.aiApiUrl || process.env.AI_API_URL || 'https://routerai.ru/api/v1/chat/completions';
      const apiKey = settings?.aiApiKey || process.env.AI_API_KEY || '';
      const model = settings?.aiModel || process.env.AI_MODEL || 'deepseek/deepseek-v4-flash';

      if (!apiKey) {
        return reply.status(400).send({ error: 'AI API key not configured. Set it in admin settings.' });
      }

      const prompt = `Ты — SEO-копирайтер сайта DonatePlatform (платформа донатов для Minecraft серверов).
Напиши SEO-оптимизированную статью на тему: "${parsed.data.topic}".

Ответь строго в формате JSON, без дополнительного текста до или после:
{
  "title": "Заголовок статьи (до 50 символов, с ключевыми словами)",
  "slug": "transliterated-url-slug",
  "excerpt": "Краткое описание статьи (до 160 символов)",
  "category": "одна из: setup | payment | minecraft | marketing | general",
  "tags": "теги через запятую",
  "metaTitle": "SEO-заголовок для вкладки браузера (до 65 символов, с ключевыми словами)",
  "metaDescription": "SEO-описание для поисковой выдачи (до 170 символов, с ключевыми словами)",
  "content": "HTML-разметка статьи (h2, h3, p, ul, ol, li, strong, em, blockquote — без markdown, без bbcode, без css)"
}

Статья:
- На ${parsed.data.language === 'ru' ? 'русском' : 'английском'} языке
- 1500-3000 слов
- С подзаголовками h2 и h3
- Со списками
- Без вступлений в духе "Привет", "В этой статье" — сразу по делу`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120_000);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 8192,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          return reply.status(502).send({
            error: `AI API error: ${response.status} ${response.statusText}`,
            details: errorBody.slice(0, 2000),
            requestUrl: apiUrl,
          });
        }

        const data = await response.json() as Record<string, unknown>;
        // Try multiple response formats (OpenAI, custom proxy, etc.)
        const choices = data?.choices as Array<Record<string, unknown>> | undefined;
        let content = '';
        if (choices?.[0]) {
          // OpenAI format: { choices: [{ message: { content } }] }
          content = (choices[0]?.message as Record<string, unknown>)?.content as string || '';
          // Streaming format: { choices: [{ delta: { content } }] }
          if (!content) {
            content = (choices[0]?.delta as Record<string, unknown>)?.content as string || '';
          }
        } else {
          // Fallback: direct content field
          content = (data?.response as string) || (data?.content as string) || (data?.text as string) || '';
        }

        if (!content) {
          return reply.status(502).send({ error: 'AI returned empty response', raw: JSON.stringify(data).slice(0, 500) });
        }

        let generated: Record<string, unknown> | null = null;

        // Strategy 1: direct JSON parse
        try {
          generated = JSON.parse(content);
        } catch {
          // Strategy 2: extract from markdown code block
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) {
            try {
              generated = JSON.parse(jsonMatch[1]);
            } catch { /* fall through */ }
          }
        }

        // Strategy 3: find first { ... } block in the response
        if (!generated) {
          const braceStart = content.indexOf('{');
          const braceEnd = content.lastIndexOf('}');
          if (braceStart !== -1 && braceEnd > braceStart) {
            try {
              generated = JSON.parse(content.slice(braceStart, braceEnd + 1));
            } catch { /* fall through */ }
          }
        }

        if (!generated) {
          return reply.status(502).send({ error: 'AI returned invalid JSON format', raw: content.slice(0, 1500) });
        }

        const guide = await prisma.guide.create({
          data: {
            slug: (generated.slug as string) || parsed.data.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 100),
            title: (generated.title as string) || parsed.data.topic,
            content: (generated.content as string) || '',
            excerpt: (generated.excerpt as string) || null,
            category: (generated.category as string) || 'general',
            tags: (generated.tags as string) || null,
            metaTitle: (generated.metaTitle as string) || (generated.title as string) || null,
            metaDescription: (generated.metaDescription as string) || (generated.excerpt as string) || null,
            published: false,
          },
        });

        return guide;
      } catch (e: unknown) {
        const err = e as Error;
        const message = err.name === 'AbortError'
          ? 'AI request timed out after 120 seconds. The model may be overloaded or the topic too complex.'
          : `AI request failed: ${err.message}`;
        return reply.status(502).send({ error: message });
      }
    },
  );

  // ── AI generate SEO for existing guide ──────────────────────
  app.post(
    '/api/admin/guides/:id/generate-seo',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as { id: string };

      const guide = await prisma.guide.findUnique({ where: { id } });
      if (!guide) return reply.status(404).send({ error: 'Guide not found' });

      const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
      const apiUrl = settings?.aiApiUrl || process.env.AI_API_URL || 'https://routerai.ru/api/v1/chat/completions';
      const apiKey = settings?.aiApiKey || process.env.AI_API_KEY || '';
      const model = settings?.aiModel || process.env.AI_MODEL || 'deepseek/deepseek-v4-flash';

      if (!apiKey) {
        return reply.status(400).send({ error: 'AI API key not configured. Set it in admin settings.' });
      }

      const excerpt = guide.excerpt || guide.content.slice(0, 300);
      const prompt = `Ты — SEO-копирайтер сайта DonatePlatform (платформа донатов для Minecraft серверов).
Сгенерируй SEO-метаданные для статьи по её заголовку и содержанию.

Заголовок статьи: "${guide.title}"
Содержание: "${excerpt}"

Ответь строго в формате JSON, без дополнительного текста до или после:
{
  "metaTitle": "SEO-заголовок для вкладки браузера (до 65 символов, с ключевыми словами, уникальный)",
  "metaDescription": "SEO-описание для поисковой выдачи (до 170 символов, с ключевыми словами, отражает суть статьи)"
}`;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30_000);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            max_tokens: 1024,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          return reply.status(502).send({
            error: `AI API error: ${response.status} ${response.statusText}`,
            details: errorBody.slice(0, 2000),
          });
        }

        const data = await response.json() as Record<string, unknown>;
        const choices = data?.choices as Array<Record<string, unknown>> | undefined;
        let content = '';
        if (choices?.[0]) {
          content = (choices[0]?.message as Record<string, unknown>)?.content as string || '';
          if (!content) {
            content = (choices[0]?.delta as Record<string, unknown>)?.content as string || '';
          }
        } else {
          content = (data?.response as string) || (data?.content as string) || (data?.text as string) || '';
        }

        if (!content) {
          return reply.status(502).send({ error: 'AI returned empty response', raw: JSON.stringify(data).slice(0, 500) });
        }

        let generated: Record<string, unknown> | null = null;

        try {
          generated = JSON.parse(content);
        } catch {
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) {
            try { generated = JSON.parse(jsonMatch[1]); } catch { /* fall through */ }
          }
        }

        if (!generated) {
          const braceStart = content.indexOf('{');
          const braceEnd = content.lastIndexOf('}');
          if (braceStart !== -1 && braceEnd > braceStart) {
            try { generated = JSON.parse(content.slice(braceStart, braceEnd + 1)); } catch { /* fall through */ }
          }
        }

        if (!generated) {
          return reply.status(502).send({ error: `AI вернул не JSON. Ответ: ${content.slice(0, 1000)}` });
        }

        const updated = await prisma.guide.update({
          where: { id },
          data: {
            metaTitle: (generated.metaTitle as string) || guide.metaTitle || guide.title,
            metaDescription: (generated.metaDescription as string) || guide.metaDescription || guide.excerpt,
          },
        });

        return updated;
      } catch (e: unknown) {
        const err = e as Error;
        const message = err.name === 'AbortError'
          ? 'AI request timed out'
          : `AI request failed: ${err.message}`;
        return reply.status(502).send({ error: message });
      }
    },
  );

  // ── AI test endpoint ────────────────────────────────────────
  app.post(
    '/api/admin/guides/test-ai',
    { preHandler: [app.authenticate, app.authStaff], schema: { tags: ['admin'] } },
    async (_req: FastifyRequest, reply: FastifyReply) => {
      const settings = await prisma.platformSettings.findUnique({ where: { id: 'global' } });
      const apiUrl = settings?.aiApiUrl || process.env.AI_API_URL || 'https://routerai.ru/api/v1/chat/completions';
      const apiKey = settings?.aiApiKey || process.env.AI_API_KEY || '';

      const result: Record<string, unknown> = {
        configuredUrl: apiUrl,
        hasKey: !!apiKey,
      };

      if (!apiKey) {
        result.error = 'No API key configured';
        return reply.send(result);
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15_000);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: settings?.aiModel || 'deepseek/deepseek-v4-flash',
            messages: [{ role: 'user', content: 'Ответь только "ok"' }],
            max_tokens: 10,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        result.status = response.status;
        result.statusText = response.statusText;
        result.headers = Object.fromEntries(response.headers.entries());
        result.body = await response.text().catch(() => '(unreadable)');
      } catch (e: unknown) {
        const err = e as Error;
        result.error = err.message;
        result.errorName = err.name;
      }

      return reply.send(result);
    },
  );
}
