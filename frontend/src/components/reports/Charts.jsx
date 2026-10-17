import { rs0, rs2 } from "../../utils/costCalc";

/* Simple charts drawn by hand (no chart library needed). Spacing classes use the "!" prefix. */

// Two bars for each period: what came in, and what it cost
export const BarChart = ({ data, aLabel, bLabel }) => {
  const max = Math.max(1, ...data.flatMap((d) => [d.a, d.b]));
  const every = Math.max(1, Math.ceil(data.length / 12)); // show about 12 labels at most
  const h = (v) => ({ height: `${(Math.max(0, v) / max) * 100}%`, minHeight: v > 0 ? 2 : 0 });

  return (
    <div>
      <div className="flex h-52 items-end gap-1 border-b border-slate-200">
        {data.map((d) => (
          <div
            key={d.key}
            title={`${d.label}\n${aLabel}: ${rs0(d.a)}\n${bLabel}: ${rs0(d.b)}\nProfit: ${rs0(d.a - d.b)}`}
            className="flex h-full flex-1 items-end justify-center gap-0.5"
          >
            <div className="w-full max-w-[18px] rounded-t bg-green-500" style={h(d.a)} />
            <div className="w-full max-w-[18px] rounded-t bg-amber-500" style={h(d.b)} />
          </div>
        ))}
      </div>
      <div className="flex gap-1 !pt-1.5">
        {data.map((d, i) => (
          <div key={d.key} className="flex-1 whitespace-nowrap text-center text-[10px] text-slate-500">
            {i % every === 0 ? d.label : ""}
          </div>
        ))}
      </div>
      <div className="!mt-3 flex gap-5 text-xs text-slate-500">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-green-500" /> {aLabel}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> {bLabel}
        </span>
      </div>
    </div>
  );
};

// A line through the periods that have a value (periods with no value are skipped)
export const LineChart = ({ points, empty = "No data in this period." }) => {
  const real = points.filter((p) => p.value !== null && p.value !== undefined);
  if (!real.length) return <p className="!py-8 text-center text-sm text-slate-400">{empty}</p>;

  const W = 600;
  const H = 150;
  const padX = 8;
  const padY = 14;
  const lo = Math.min(...real.map((p) => p.value));
  const hi = Math.max(...real.map((p) => p.value));
  const span = hi - lo || 1;
  const x = (i) => padX + (points.length === 1 ? (W - 2 * padX) / 2 : (i * (W - 2 * padX)) / (points.length - 1));
  const y = (v) => padY + (1 - (v - lo) / span) * (H - 2 * padY);
  const line = points.map((p, i) => (p.value === null || p.value === undefined ? null : `${x(i)},${y(p.value)}`)).filter(Boolean).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" role="img" aria-label="Scrap rate over time">
        <line x1={padX} y1={H - padY} x2={W - padX} y2={H - padY} stroke="currentColor" className="text-slate-200" />
        <polyline points={line} fill="none" stroke="#f97316" strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) =>
          p.value === null || p.value === undefined ? null : (
            <circle key={p.key} cx={x(i)} cy={y(p.value)} r="3.5" fill="#f97316">
              <title>{`${p.label}: ${rs2(p.value)} per kg`}</title>
            </circle>
          )
        )}
      </svg>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{points[0].label}</span>
        <span>
          Low {rs2(lo)} · High {rs2(hi)} per kg
        </span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
};