// Story milestone and drama event generator for data battles

export interface DramaEvent {
  yearIndex: number;
  yearLabel: string;
  badge: string; // e.g. "LEAD CHANGE", "MARKET SURGE", "CRASH"
  headline: string; // e.g. "Apple overtakes Samsung for #1"
  color: string;
}

export function extractDramaEvents(
  timelineLabels: string[],
  entities: { name: string; short_name?: string; values: number[]; color: string }[],
  unit: string,
  prefix: string
): DramaEvent[] {
  const events: DramaEvent[] = [];
  const numYears = timelineLabels.length;
  if (numYears < 2 || entities.length === 0) return events;

  let prevLeaderName: string | null = null;

  for (let y = 0; y < numYears; y++) {
    // Find current leader
    const sorted = [...entities].sort((a, b) => b.values[y] - a.values[y]);
    const currentLeader = sorted[0];
    const leaderShort = currentLeader.short_name || currentLeader.name.split(' ')[0];

    // 1. Leader change
    if (prevLeaderName && prevLeaderName !== currentLeader.name && y > 0) {
      events.push({
        yearIndex: y,
        yearLabel: timelineLabels[y],
        badge: '👑 LEAD CHANGE',
        headline: `${leaderShort} takes #1 position!`,
        color: currentLeader.color
      });
    }
    prevLeaderName = currentLeader.name;

    // 2. Severe crash detection (>40% drop in single step)
    for (const e of entities) {
      if (y > 0 && e.values[y - 1] > 20) {
        const dropPct = (e.values[y - 1] - e.values[y]) / e.values[y - 1];
        if (dropPct >= 0.45) {
          const sName = e.short_name || e.name.split(' ')[0];
          events.push({
            yearIndex: y,
            yearLabel: timelineLabels[y],
            badge: '📉 SHARP DECLINE',
            headline: `${sName} plunges -${Math.round(dropPct * 100)}%`,
            color: '#ff3b30'
          });
          break; // Max 1 per year
        }
      }
    }

    // 3. Huge surge detection (>40% gain)
    for (const e of entities) {
      if (y > 0 && e.values[y - 1] > 20) {
        const gainPct = (e.values[y] - e.values[y - 1]) / e.values[y - 1];
        if (gainPct >= 0.45 && !events.some(ev => ev.yearIndex === y)) {
          const sName = e.short_name || e.name.split(' ')[0];
          events.push({
            yearIndex: y,
            yearLabel: timelineLabels[y],
            badge: '🚀 MASSIVE SURGE',
            headline: `${sName} jumps +${Math.round(gainPct * 100)}%`,
            color: '#00f0ff'
          });
          break;
        }
      }
    }
  }

  return events;
}
