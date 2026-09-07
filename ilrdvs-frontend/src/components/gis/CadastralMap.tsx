import type { CadastralParcel } from "../../types";

const STATUS_FILL: Record<CadastralParcel["status"], string> = {
  Validated: "rgba(46,125,79,0.18)",
  Pending: "rgba(184,134,11,0.18)",
  Mismatch: "rgba(192,57,43,0.18)",
};
const STATUS_STROKE: Record<CadastralParcel["status"], string> = {
  Validated: "#2e7d4f",
  Pending: "#b8860b",
  Mismatch: "#c0392b",
};

function centroid(points: Array<[number, number]>): [number, number] {
  const x = points.reduce((s, p) => s + p[0], 0) / points.length;
  const y = points.reduce((s, p) => s + p[1], 0) / points.length;
  return [x, y];
}

export function CadastralMap({
  parcels,
  selectedId,
  onSelect,
}: {
  parcels: CadastralParcel[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative rounded-lg border border-slate-200 bg-[#eef0e6] overflow-hidden h-full">
      {/* survey grid backdrop */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-40">
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 10} y1={0} x2={i * 10} y2={100} stroke="#c7c2ab" strokeWidth="0.15" />
        ))}
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`h${i}`} x1={0} y1={i * 10} x2={100} y2={i * 10} stroke="#c7c2ab" strokeWidth="0.15" />
        ))}
      </svg>

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {parcels.map((p) => {
          const isSelected = p.id === selectedId;
          const [cx, cy] = centroid(p.coordinates);
          return (
            <g key={p.id} className="cursor-pointer" onClick={() => onSelect(p.id)}>
              <polygon
                points={p.coordinates.map(([x, y]) => `${x},${y}`).join(" ")}
                fill={STATUS_FILL[p.status]}
                stroke={STATUS_STROKE[p.status]}
                strokeWidth={isSelected ? 0.8 : 0.4}
                className="transition-all"
              />
              <text x={cx} y={cy} fontSize="3" textAnchor="middle" fill="#1b342c" fontWeight={600}>
                {p.surveyNumber}
              </text>
              {isSelected && (
                <>
                  {[
                    [p.coordinates[0][0], p.coordinates[0][1], -1, -1],
                    [p.coordinates[1][0], p.coordinates[1][1], 1, -1],
                    [p.coordinates[2][0], p.coordinates[2][1], 1, 1],
                    [p.coordinates[3]?.[0] ?? p.coordinates[0][0], p.coordinates[3]?.[1] ?? p.coordinates[0][1], -1, 1],
                  ].map(([x, y, dx, dy], i) => (
                    <g key={i}>
                      <line x1={x} y1={y} x2={x + dx * 4} y2={y} stroke="#9c5a34" strokeWidth="0.7" />
                      <line x1={x} y1={y} x2={x} y2={y + dy * 4} stroke="#9c5a34" strokeWidth="0.7" />
                    </g>
                  ))}
                </>
              )}
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-md px-3 py-1.5 text-[11px] text-slate-600 border border-slate-200">
        {(["Validated", "Pending", "Mismatch"] as const).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: STATUS_STROKE[s] }} />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
