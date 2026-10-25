import { describe, it, expect } from 'vitest';
import {
  singleActionSchema,
  actionsArraySchema,
  actionsJsonSchema,
  REVERSE_ACTION_MAP,
  isReversible,
  buildRollbackAction,
  ACTION_TYPES,
} from '../src/validators/actions.js';

// ── Atomic action tests (9 types) ──────────────────────────

describe('atomic action schemas', () => {
  it('validates command action', () => {
    const r = singleActionSchema.safeParse({ type: 'command', value: '/give {player} diamond 1' });
    expect(r.success).toBe(true);
  });

  it('rejects command with empty value', () => {
    const r = singleActionSchema.safeParse({ type: 'command', value: '' });
    expect(r.success).toBe(false);
  });

  it('rejects unknown placeholder keywords', () => {
    const r = singleActionSchema.safeParse({ type: 'command', value: '/give {custom_tag} diamond' });
    expect(r.success).toBe(false);
  });

  it('accepts known placeholders {player}, {order_id}, {server}', () => {
    const r = singleActionSchema.safeParse({
      type: 'command',
      value: 'say {player} bought {order_id} on {server}',
    });
    expect(r.success).toBe(true);
  });

  it('validates command with {player}, {order_id}, {server}', () => {
    const r = singleActionSchema.safeParse({
      type: 'command',
      value: 'say {player} bought via {order_id} on {server}',
    });
    expect(r.success).toBe(true);
  });

  it('validates add_group action', () => {
    const r = singleActionSchema.safeParse({ type: 'add_group', value: 'vip', duration: '30d' });
    expect(r.success).toBe(true);
  });

  it('validates add_group without duration', () => {
    const r = singleActionSchema.safeParse({ type: 'add_group', value: 'premium' });
    expect(r.success).toBe(true);
  });

  it('validates remove_group action', () => {
    const r = singleActionSchema.safeParse({ type: 'remove_group', value: 'vip' });
    expect(r.success).toBe(true);
  });

  it('validates give_item action with defaults', () => {
    const r = singleActionSchema.safeParse({ type: 'give_item', value: 'diamond_sword' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.amount).toBe(1);
    }
  });

  it('validates give_item with explicit amount', () => {
    const r = singleActionSchema.safeParse({ type: 'give_item', value: 'diamond', amount: 64 });
    expect(r.success).toBe(true);
  });

  it('rejects give_item with negative amount', () => {
    const r = singleActionSchema.safeParse({ type: 'give_item', value: 'diamond', amount: -1 });
    expect(r.success).toBe(false);
  });

  it('validates give_item with nbt', () => {
    const r = singleActionSchema.safeParse({
      type: 'give_item',
      value: 'enchanted_sword',
      nbt: '{Enchantments:[{id:"sharpness",lvl:5}]}',
    });
    expect(r.success).toBe(true);
  });

  it('validates remove_item action', () => {
    const r = singleActionSchema.safeParse({ type: 'remove_item', value: 'stone', amount: 10 });
    expect(r.success).toBe(true);
  });

  it('validates give_money action', () => {
    const r = singleActionSchema.safeParse({ type: 'give_money', value: 1000 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.currency).toBe('rub');
    }
  });

  it('rejects give_money with zero', () => {
    const r = singleActionSchema.safeParse({ type: 'give_money', value: 0 });
    expect(r.success).toBe(false);
  });

  it('validates give_money with custom currency', () => {
    const r = singleActionSchema.safeParse({ type: 'give_money', value: 500, currency: 'coins' });
    expect(r.success).toBe(true);
  });

  it('validates broadcast action', () => {
    const r = singleActionSchema.safeParse({ type: 'broadcast', value: '{player} bought VIP!' });
    expect(r.success).toBe(true);
  });

  it('validates play_sound action', () => {
    const r = singleActionSchema.safeParse({
      type: 'play_sound',
      value: 'entity.experience_orb.pickup',
      pitch: 1.0,
      volume: 0.8,
    });
    expect(r.success).toBe(true);
  });

  it('rejects play_sound with volume out of range', () => {
    const r = singleActionSchema.safeParse({ type: 'play_sound', value: 'test', volume: 1.5 });
    expect(r.success).toBe(false);
  });

  it('validates send_to_server action', () => {
    const r = singleActionSchema.safeParse({ type: 'send_to_server', value: 'hub', port: 25565 });
    expect(r.success).toBe(true);
  });

  it('rejects unknown action type', () => {
    const r = singleActionSchema.safeParse({ type: 'unknown_action', value: 'test' });
    expect(r.success).toBe(false);
  });

  it('validates roulette action with 100% chance', () => {
    const r = singleActionSchema.safeParse({
      type: 'roulette',
      variants: [
        { chance: 70, description: 'Алмаз', command: '/give {player} diamond 1' },
        { chance: 30, description: 'Уголь', command: '/give {player} coal 1' },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('rejects roulette with chance sum ≠ 100', () => {
    const r = singleActionSchema.safeParse({
      type: 'roulette',
      variants: [
        { chance: 50, description: 'Алмаз', command: '/give {player} diamond 1' },
        { chance: 20, description: 'Уголь', command: '/give {player} coal 1' },
      ],
    });
    expect(r.success).toBe(false);
  });

  it('rejects roulette with < 2 variants', () => {
    const r = singleActionSchema.safeParse({
      type: 'roulette',
      variants: [{ chance: 100, description: 'Алмаз', command: '/give {player} diamond 1' }],
    });
    expect(r.success).toBe(false);
  });
});

// ── Conditional action tests ───────────────────────────────

describe('conditional action schemas', () => {
  it('validates if_has_group with then actions', () => {
    const r = singleActionSchema.safeParse({
      type: 'if_has_group',
      value: 'vip',
      then: [{ type: 'command', value: '/say VIP {player}' }],
    });
    expect(r.success).toBe(true);
  });

  it('validates if_has_group with then and else', () => {
    const r = singleActionSchema.safeParse({
      type: 'if_has_group',
      value: 'vip',
      then: [{ type: 'give_money', value: 1000 }],
      else: [{ type: 'give_money', value: 100 }],
    });
    expect(r.success).toBe(true);
  });

  it('validates if_missing_group', () => {
    const r = singleActionSchema.safeParse({
      type: 'if_missing_group',
      value: 'newbie',
      then: [{ type: 'add_group', value: 'starter' }],
    });
    expect(r.success).toBe(true);
  });

  it('validates if_has_permission', () => {
    const r = singleActionSchema.safeParse({
      type: 'if_has_permission',
      value: 'essentials.fly',
      then: [{ type: 'command', value: '/fly {player}' }],
    });
    expect(r.success).toBe(true);
  });

  it('validates nested conditional (condition inside then)', () => {
    const r = singleActionSchema.safeParse({
      type: 'if_has_group',
      value: 'donator',
      then: [
        {
          type: 'if_has_permission',
          value: 'essentials.gamemode',
          then: [{ type: 'command', value: '/gamemode creative {player}' }],
        },
      ],
    });
    expect(r.success).toBe(true);
  });
});

// ── Array schema tests ─────────────────────────────────────

describe('actionsArraySchema', () => {
  it('validates a single action in array', () => {
    const r = actionsArraySchema.safeParse([{ type: 'command', value: '/say hello' }]);
    expect(r.success).toBe(true);
  });

  it('validates multiple actions in array', () => {
    const r = actionsArraySchema.safeParse([
      { type: 'add_group', value: 'vip' },
      { type: 'command', value: '/say Welcome {player}' },
      { type: 'broadcast', value: '{player} bought VIP!' },
    ]);
    expect(r.success).toBe(true);
  });

  it('rejects empty array', () => {
    const r = actionsArraySchema.safeParse([]);
    expect(r.success).toBe(false);
  });

  it('validates 50 actions (max)', () => {
    const actions = Array.from({ length: 50 }, (_, i) => ({
      type: 'command' as const,
      value: `/say ${i}`,
    }));
    const r = actionsArraySchema.safeParse(actions);
    expect(r.success).toBe(true);
  });

  it('rejects 51 actions (over max)', () => {
    const actions = Array.from({ length: 51 }, (_, i) => ({
      type: 'command' as const,
      value: `/say ${i}`,
    }));
    const r = actionsArraySchema.safeParse(actions);
    expect(r.success).toBe(false);
  });
});

// ── actionsJsonSchema tests ─────────────────────────────────

describe('actionsJsonSchema', () => {
  it('parses valid JSON and serializes back', () => {
    const input = JSON.stringify([{ type: 'command', value: '/say hello' }]);
    const r = actionsJsonSchema.safeParse(input);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(typeof r.data).toBe('string');
      expect(JSON.parse(r.data)).toEqual([{ type: 'command', value: '/say hello' }]);
    }
  });

  it('returns null for empty string', () => {
    const r = actionsJsonSchema.safeParse('');
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toBeNull();
    }
  });

  it('returns null for whitespace string', () => {
    const r = actionsJsonSchema.safeParse('   ');
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toBeNull();
    }
  });

  it('rejects invalid JSON', () => {
    const r = actionsJsonSchema.safeParse('not json');
    expect(r.success).toBe(false);
  });

  it('rejects JSON with invalid action', () => {
    const r = actionsJsonSchema.safeParse(JSON.stringify([{ type: 'invalid' }]));
    expect(r.success).toBe(false);
  });

  it('rejects JSON that is not an array', () => {
    const r = actionsJsonSchema.safeParse(JSON.stringify({ type: 'command', value: '/say' }));
    expect(r.success).toBe(false);
  });

  it('normalizes formatting (compact JSON)', () => {
    const input = JSON.stringify(
      [
        {
          type: 'command',
          value: '/say hello',
        },
      ],
      null,
      2,
    );
    const r = actionsJsonSchema.safeParse(input);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).not.toContain('\n');
      expect(r.data).not.toContain('  ');
    }
  });

  it('validates complex conditional actions through JSON', () => {
    const input = JSON.stringify([
      {
        type: 'if_has_group',
        value: 'vip',
        then: [{ type: 'give_money', value: 1000 }],
        else: [{ type: 'give_money', value: 100 }],
      },
    ]);
    const r = actionsJsonSchema.safeParse(input);
    expect(r.success).toBe(true);
  });
});

// ── Rollback logic tests ───────────────────────────────────

describe('rollback logic', () => {
  it('isReversible returns true for add_group', () => {
    expect(isReversible('add_group')).toBe(true);
  });

  it('isReversible returns true for give_item', () => {
    expect(isReversible('give_item')).toBe(true);
  });

  it('isReversible returns false for command', () => {
    expect(isReversible('command')).toBe(false);
  });

  it('isReversible returns false for give_money', () => {
    expect(isReversible('give_money')).toBe(false);
  });

  it('isReversible returns false for conditional', () => {
    expect(isReversible('if_has_group')).toBe(false);
  });

  it('buildRollbackAction: add_group → remove_group', () => {
    const rb = buildRollbackAction({ type: 'add_group', value: 'vip' } as any);
    expect(rb).toEqual({ type: 'remove_group', value: 'vip' });
  });

  it('buildRollbackAction: remove_group → add_group', () => {
    const rb = buildRollbackAction({ type: 'remove_group', value: 'vip' } as any);
    expect(rb).toEqual({ type: 'add_group', value: 'vip' });
  });

  it('buildRollbackAction: give_item → remove_item (preserves amount)', () => {
    const rb = buildRollbackAction({ type: 'give_item', value: 'diamond', amount: 64 } as any);
    expect(rb).toMatchObject({ type: 'remove_item', value: 'diamond', amount: 64 });
  });

  it('buildRollbackAction: remove_item → give_item (preserves amount)', () => {
    const rb = buildRollbackAction({ type: 'remove_item', value: 'stone', amount: 10 } as any);
    expect(rb).toMatchObject({ type: 'give_item', value: 'stone', amount: 10 });
  });

  it('buildRollbackAction returns null for irreversible', () => {
    expect(buildRollbackAction({ type: 'command', value: '/say' } as any)).toBeNull();
    expect(buildRollbackAction({ type: 'broadcast', value: 'test' } as any)).toBeNull();
    expect(buildRollbackAction({ type: 'if_has_group' } as any)).toBeNull();
  });
});

// ── Constants ──────────────────────────────────────────────

describe('constants', () => {
  it('ACTION_TYPES has 13 types', () => {
    expect(ACTION_TYPES).toHaveLength(13);
  });

  it('REVERSE_ACTION_MAP covers all ACTION_TYPES', () => {
    for (const t of ACTION_TYPES) {
      expect(t in REVERSE_ACTION_MAP).toBe(true);
    }
  });

  it('every reversible type has a corresponding reverse in ACTION_TYPES', () => {
    for (const t of ACTION_TYPES) {
      const rev = REVERSE_ACTION_MAP[t];
      if (rev) {
        expect(ACTION_TYPES).toContain(rev);
      }
    }
  });
});
