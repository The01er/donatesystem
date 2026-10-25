import { PrismaClient, Prisma } from '@prisma/client';

function convertDecimals(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Prisma.Decimal) return Number(obj);
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(convertDecimals);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = convertDecimals(value);
    }
    return result;
  }
  return obj;
}

const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async findMany({ args, query }) {
        return convertDecimals(await query(args));
      },
      async findFirst({ args, query }) {
        return convertDecimals(await query(args));
      },
      async findUnique({ args, query }) {
        return convertDecimals(await query(args));
      },
      async findFirstOrThrow({ args, query }) {
        return convertDecimals(await query(args));
      },
      async findUniqueOrThrow({ args, query }) {
        return convertDecimals(await query(args));
      },
      async create({ args, query }) {
        return convertDecimals(await query(args));
      },
      async update({ args, query }) {
        return convertDecimals(await query(args));
      },
      async upsert({ args, query }) {
        return convertDecimals(await query(args));
      },
      async delete({ args, query }) {
        return convertDecimals(await query(args));
      },
      async aggregate({ args, query }) {
        return convertDecimals(await query(args));
      },
      async groupBy({ args, query }) {
        return convertDecimals(await query(args));
      },
      async count({ args, query }) {
        return convertDecimals(await query(args));
      },
    },
  },
});

export default prisma;
