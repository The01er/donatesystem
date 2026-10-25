type ActiveTimer = { id: NodeJS.Timeout; type: 'timeout' | 'interval' };

const activeTimers: ActiveTimer[] = [];

function registerTimer(id: NodeJS.Timeout, type: 'timeout' | 'interval'): NodeJS.Timeout {
  activeTimers.push({ id, type });
  return id;
}

export function trackTimeout(fn: () => void, ms: number): NodeJS.Timeout {
  return registerTimer(setTimeout(fn, ms), 'timeout');
}

export function trackInterval(fn: () => void, ms: number): NodeJS.Timeout {
  return registerTimer(setInterval(fn, ms), 'interval');
}

export function clearAllTimers(): void {
  while (activeTimers.length > 0) {
    const t = activeTimers.pop();
    if (!t) continue;
    try {
      if (t.type === 'interval') clearInterval(t.id);
      else clearTimeout(t.id);
    } catch {
      // timer may have already fired or been cleared — safe to ignore
    }
  }
}

export function activeTimerCount(): number {
  return activeTimers.length;
}
