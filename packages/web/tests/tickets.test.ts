import { describe, it, expect } from 'vitest';
import { ticketStatusClass, ticketStatusLabel, ticketPriorityClass, ticketPriorityLabel } from '../utils/tickets';

describe('ticketStatusClass', () => {
  it('returns class for open', () => {
    expect(ticketStatusClass('open')).toContain('bg-blue-100');
  });

  it('returns class for answered', () => {
    expect(ticketStatusClass('answered')).toContain('bg-green-100');
  });

  it('returns class for closed', () => {
    expect(ticketStatusClass('closed')).toContain('bg-slate-100');
  });

  it('returns empty string for unknown status', () => {
    expect(ticketStatusClass('unknown')).toBe('');
  });
});

describe('ticketStatusLabel', () => {
  it('returns label for open', () => {
    expect(ticketStatusLabel('open')).toBe('Открыт');
  });

  it('returns label for answered', () => {
    expect(ticketStatusLabel('answered')).toBe('Отвечен');
  });

  it('returns label for closed', () => {
    expect(ticketStatusLabel('closed')).toBe('Закрыт');
  });

  it('returns the status itself for unknown status', () => {
    expect(ticketStatusLabel('unknown')).toBe('unknown');
  });
});

describe('ticketPriorityClass', () => {
  it('returns class for low', () => {
    expect(ticketPriorityClass('low')).toContain('bg-slate-100');
  });

  it('returns class for medium', () => {
    expect(ticketPriorityClass('medium')).toContain('bg-yellow-100');
  });

  it('returns class for high', () => {
    expect(ticketPriorityClass('high')).toContain('bg-red-100');
  });

  it('returns empty string for unknown priority', () => {
    expect(ticketPriorityClass('unknown')).toBe('');
  });
});

describe('ticketPriorityLabel', () => {
  it('returns label for low', () => {
    expect(ticketPriorityLabel('low')).toBe('Низкий');
  });

  it('returns label for medium', () => {
    expect(ticketPriorityLabel('medium')).toBe('Средний');
  });

  it('returns label for high', () => {
    expect(ticketPriorityLabel('high')).toBe('Высокий');
  });

  it('returns the priority itself for unknown priority', () => {
    expect(ticketPriorityLabel('unknown')).toBe('unknown');
  });
});
