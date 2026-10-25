import { z } from 'zod';

// ── Placeholders ────────────────────────────────────────────
// {player} - ник игрока
// {order_id} - UUID заказа
// {server} - slug сервера
const PLACEHOLDERS = ['{player}', '{order_id}', '{server}'] as const;

export function validatePlaceholders(value: string): boolean {
  // Only allow known placeholder keywords
  const placeholders = value.match(/\{[a-z_]+\}/g) || [];
  return placeholders.every((p) => PLACEHOLDERS.includes(p as (typeof PLACEHOLDERS)[number]));
}

// ── Atomic Actions ──────────────────────────────────────────

const commandAction = z.object({
  type: z.literal('command'),
  value: z.string().min(1).max(2000).refine(validatePlaceholders, {
    message: 'Invalid placeholder in value',
  }),
});

const addGroupAction = z.object({
  type: z.literal('add_group'),
  value: z.string().min(1).max(100),
  duration: z.string().max(20).optional(), // "30d", "permanent"
});

const removeGroupAction = z.object({
  type: z.literal('remove_group'),
  value: z.string().min(1).max(100),
});

const giveItemAction = z.object({
  type: z.literal('give_item'),
  value: z.string().min(1).max(100),
  amount: z.number().int().positive().default(1),
  metadata: z.string().max(200).optional(),
  nbt: z.string().max(5000).optional(),
});

const removeItemAction = z.object({
  type: z.literal('remove_item'),
  value: z.string().min(1).max(100),
  amount: z.number().int().positive().default(1),
});

const giveMoneyAction = z.object({
  type: z.literal('give_money'),
  value: z.number().positive(),
  currency: z.string().max(20).optional().default('rub'),
});

const broadcastAction = z.object({
  type: z.literal('broadcast'),
  value: z.string().min(1).max(2000).refine(validatePlaceholders, {
    message: 'Invalid placeholder in value',
  }),
});

const playSoundAction = z.object({
  type: z.literal('play_sound'),
  value: z.string().min(1).max(100),
  pitch: z.number().min(0.1).max(2.0).optional(),
  volume: z.number().min(0.1).max(1.0).optional(),
});

const sendToServerAction = z.object({
  type: z.literal('send_to_server'),
  value: z.string().min(1).max(200),
  port: z.number().int().positive().optional(),
});

// ── Roulette Action ─────────────────────────────────────────

const rouletteVariant = z.object({
  chance: z.number().positive().max(100),
  description: z.string().min(1).max(200),
  command: z.string().min(1).max(2000).refine(validatePlaceholders, {
    message: 'Invalid placeholder in value',
  }),
});

const rouletteAction = z.object({
  type: z.literal('roulette'),
  variants: z
    .array(rouletteVariant)
    .min(2, 'At least 2 variants required')
    .max(20, 'Maximum 20 variants')
    .refine(
      (variants) => {
        const sum = variants.reduce((s, v) => s + v.chance, 0);
        return Math.abs(sum - 100) < 0.01;
      },
      { message: 'Sum of chances must be 100%' },
    ),
});

// ── Conditional Actions ─────────────────────────────────────
// Рекурсивный тип: condition содержит then/else с Action[]

const conditionAction: z.ZodType<any> = z.object({
  type: z.enum(['if_has_group', 'if_missing_group', 'if_has_permission']),
  value: z.string().min(1).max(100),
  then: z.lazy(() => z.array(actionSchema)),
  else: z.lazy(() => z.array(actionSchema).optional()),
});

// ── Composite ───────────────────────────────────────────────

const atomicActions = z.discriminatedUnion('type', [
  commandAction,
  addGroupAction,
  removeGroupAction,
  giveItemAction,
  removeItemAction,
  giveMoneyAction,
  broadcastAction,
  playSoundAction,
  sendToServerAction,
  rouletteAction,
]);

const actionSchema: z.ZodType<any> = z.union([atomicActions, conditionAction]);

// ── Root schemas ────────────────────────────────────────────

/** Валидация одиночного action */
export const singleActionSchema = actionSchema;

/** Валидация массива actions — используется при создании/обновлении Product */
export const actionsArraySchema = z
  .array(actionSchema)
  .min(1, 'At least one action required')
  .max(50, 'Maximum 50 actions per product');

/** Валидация поля actionsJson (строка → парсинг → валидация → обратно в строку) */
export const actionsJsonSchema = z
  .string()
  .max(8000, 'Actions JSON too long')
  .transform((val, ctx) => {
    if (!val || val.trim() === '') return null;
    try {
      const parsed = JSON.parse(val);
      // Валидируем структуру
      const result = actionsArraySchema.safeParse(parsed);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: issue.message,
            path: issue.path,
          });
        });
        return z.NEVER;
      }
      // Возвращаем компактную JSON-строку для хранения
      return JSON.stringify(result.data);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid JSON' });
      return z.NEVER;
    }
  });

// ── Types ───────────────────────────────────────────────────

export type Action = z.infer<typeof actionSchema>;
export type CommandAction = z.infer<typeof commandAction>;
export type AddGroupAction = z.infer<typeof addGroupAction>;
export type ConditionAction = z.infer<typeof conditionAction>;
export type GiveItemAction = z.infer<typeof giveItemAction>;
export type RouletteVariant = z.infer<typeof rouletteVariant>;
export type RouletteAction = z.infer<typeof rouletteAction>;

/** Все поддерживаемые типы действий */
export const ACTION_TYPES = [
  'command',
  'add_group',
  'remove_group',
  'give_item',
  'remove_item',
  'give_money',
  'broadcast',
  'play_sound',
  'send_to_server',
  'roulette',
  'if_has_group',
  'if_missing_group',
  'if_has_permission',
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

// ── Reverse Action Map (для отката) ─────────────────────────

export const REVERSE_ACTION_MAP: Record<string, string | null> = {
  command: null, // команды необратимы
  add_group: 'remove_group',
  remove_group: 'add_group',
  give_item: 'remove_item',
  remove_item: 'give_item',
  give_money: null, // деньги откатываются отдельной логикой
  broadcast: null, // сообщения необратимы
  play_sound: null,
  send_to_server: null,
  roulette: null, // рулетка необратима
  if_has_group: null, // условные не откатываются автоматически
  if_missing_group: null,
  if_has_permission: null,
};

/** Проверяет, есть ли у действия обратное действие */
export function isReversible(type: string): boolean {
  return REVERSE_ACTION_MAP[type] != null && REVERSE_ACTION_MAP[type] !== undefined;
}

/** Генерирует обратное действие для отката */
export function buildRollbackAction(action: Action): Action | null {
  const reverseType = REVERSE_ACTION_MAP[action.type];
  if (!reverseType) return null;

  if (reverseType === 'remove_group' && action.type === 'add_group') {
    return {
      type: 'remove_group',
      value: (action as AddGroupAction).value,
    } as Action;
  }

  if (reverseType === 'add_group' && action.type === 'remove_group') {
    return {
      type: 'add_group',
      value: action.value,
    } as Action;
  }

  if (reverseType === 'remove_item' && action.type === 'give_item') {
    return {
      type: 'remove_item',
      value: action.value,
      amount: (action as GiveItemAction).amount ?? 1,
    } as Action;
  }

  if (reverseType === 'give_item' && action.type === 'remove_item') {
    return {
      type: 'give_item',
      value: action.value,
      amount: action.amount ?? 1,
    } as Action;
  }

  return null;
}
