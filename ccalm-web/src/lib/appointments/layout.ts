export type TimeSlot = { startTime: string; endTime: string };

export type LaidOut<T> = T & { lane: number; lanes: number };

export function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * 同一天重叠的卡片分道：
 * 相互重叠的卡片属于同一簇，簇内按开始时间贪心分配到最早空闲的道，
 * 同簇卡片共享 lanes（宽度），互不重叠的簇可以各自占满整列。
 */
export function assignLanes<T extends TimeSlot>(items: T[]): LaidOut<T>[] {
  const rows = items
    .map((item) => ({
      item,
      start: minutesOf(item.startTime),
      end: minutesOf(item.endTime),
    }))
    .filter(
      (r) =>
        Number.isFinite(r.start) && Number.isFinite(r.end) && r.end > r.start,
    )
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const out: LaidOut<T>[] = [];
  let i = 0;
  while (i < rows.length) {
    let j = i;
    let clusterEnd = rows[i].end;
    while (j + 1 < rows.length && rows[j + 1].start < clusterEnd) {
      j += 1;
      clusterEnd = Math.max(clusterEnd, rows[j].end);
    }

    const laneEnds: number[] = [];
    const assigned: { item: T; lane: number }[] = [];
    for (let k = i; k <= j; k += 1) {
      const row = rows[k];
      let lane = laneEnds.findIndex((end) => end <= row.start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(row.end);
      } else {
        laneEnds[lane] = row.end;
      }
      assigned.push({ item: row.item, lane });
    }

    const lanes = laneEnds.length;
    for (const a of assigned) out.push({ ...a.item, lane: a.lane, lanes });
    i = j + 1;
  }
  return out;
}
