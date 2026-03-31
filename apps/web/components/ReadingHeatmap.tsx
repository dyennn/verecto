"use client";

import { useMemo, useState } from "react";

interface ReadingHeatmapProps {
  data: Record<string, number>;
}

// SVG rects use `fill`, not `background-color`, so we must use inline styles.
function getCellStyle(count: number): React.CSSProperties {
  if (count === 0) return { fill: "var(--secondary)" };
  if (count === 1) return { fill: "var(--primary)", opacity: 0.3 };
  if (count === 2) return { fill: "var(--primary)", opacity: 0.55 };
  if (count === 3) return { fill: "var(--primary)", opacity: 0.75 };
  return { fill: "var(--primary)", opacity: 1 };
}

// Legend cells are HTML divs — bg-* works fine here.
function getLegendStyle(level: number): React.CSSProperties {
  if (level === 0) return { backgroundColor: "var(--secondary)" };
  const opacity = [0.3, 0.55, 0.75, 1][level - 1];
  return { backgroundColor: "var(--primary)", opacity };
}

export function ReadingHeatmap({ data }: ReadingHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    date: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  // Build a 52-week grid of days (Sun → Sat), ending on today
  const weeks = useMemo(() => {
    const today = new Date();
    const endDay = new Date(today);
    endDay.setDate(endDay.getDate() + (6 - endDay.getDay()));

    const startDay = new Date(endDay);
    startDay.setDate(startDay.getDate() - 52 * 7 + 1);

    const grid: Array<Array<{ date: string; count: number } | null>> = [];
    let current = new Date(startDay);

    for (let week = 0; week < 52; week++) {
      const col: Array<{ date: string; count: number } | null> = [];
      for (let dow = 0; dow < 7; dow++) {
        const dateStr = current.toISOString().slice(0, 10);
        col.push(current <= endDay ? { date: dateStr, count: data[dateStr] ?? 0 } : null);
        current.setDate(current.getDate() + 1);
      }
      grid.push(col);
    }
    return grid;
  }, [data]);

  // Month labels: first column where a new month appears
  const monthLabels = useMemo(() => {
    const labels: Array<{ label: string; col: number }> = [];
    let lastMonth = -1;
    weeks.forEach((col, colIdx) => {
      const firstDay = col.find((d) => d !== null);
      if (!firstDay) return;
      const month = new Date(firstDay.date).getUTCMonth();
      if (month !== lastMonth) {
        labels.push({
          label: new Date(firstDay.date).toLocaleString("en-US", {
            month: "short",
            timeZone: "UTC",
          }),
          col: colIdx,
        });
        lastMonth = month;
      }
    });
    return labels;
  }, [weeks]);

  const CELL_SIZE = 12;
  const CELL_GAP = 3;
  const STEP = CELL_SIZE + CELL_GAP;
  const LABEL_HEIGHT = 18;

  const totalBooks = Object.values(data).reduce((s, c) => s + c, 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-[var(--muted-foreground)]">
        <span>Reading activity — last 52 weeks</span>
        <span>
          {totalBooks} book{totalBooks !== 1 ? "s" : ""} finished
        </span>
      </div>

      <div className="relative overflow-x-auto">
        <svg
          width={52 * STEP}
          height={LABEL_HEIGHT + 7 * STEP}
          className="overflow-visible"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Month labels */}
          {monthLabels.map(({ label, col }) => (
            <text
              key={`${label}-${col}`}
              x={col * STEP}
              y={LABEL_HEIGHT - 4}
              fontSize={10}
              fill="var(--muted-foreground)"
            >
              {label}
            </text>
          ))}

          {/* Day cells */}
          {weeks.map((col, colIdx) =>
            col.map((cell, rowIdx) => {
              if (!cell) return null;
              const cx = colIdx * STEP;
              const cy = LABEL_HEIGHT + rowIdx * STEP;
              return (
                <rect
                  key={cell.date}
                  x={cx}
                  y={cy}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={2}
                  style={getCellStyle(cell.count)}
                  className="cursor-default"
                  onMouseEnter={() =>
                    setTooltip({ date: cell.date, count: cell.count, x: cx + CELL_SIZE / 2, y: cy })
                  }
                />
              );
            })
          )}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs shadow-md"
            style={{
              left: tooltip.x,
              top: tooltip.y - 36,
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
            }}
          >
            <span className="font-medium">{tooltip.date}</span>
            <span className="ml-1 text-[var(--muted-foreground)]">
              — {tooltip.count} book{tooltip.count !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className="h-3 w-3 rounded-sm"
            style={getLegendStyle(level)}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
