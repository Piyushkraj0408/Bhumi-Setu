import { useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Expand,
} from "lucide-react";
import { cn } from "../../lib/cn";

/**
 * Mock document viewer. In production this renders the actual scanned page
 * (image or PDF canvas) at the given zoom/rotation; here it renders a
 * stylised placeholder that still exercises all the viewer controls so the
 * interaction pattern is fully demonstrable.
 */
export function DocumentViewer({
  pages = 3,
  highlightRegion,
}: {
  pages?: number;
  highlightRegion?: { x: number; y: number; w: number; h: number } | null;
}) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [page, setPage] = useState(1);

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
      <div className="flex items-center gap-1 px-2.5 py-2 bg-white border-b border-slate-200 shrink-0">
        <button onClick={() => setZoom((z) => Math.max(50, z - 10))} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Zoom out">
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs text-slate-500 w-10 text-center tabular-nums">{zoom}%</span>
        <button onClick={() => setZoom((z) => Math.min(200, z + 10))} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Zoom in">
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setZoom(100)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Fit page">
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => setRotation((r) => (r + 90) % 360)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Rotate">
          <RotateCw className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1" />
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Previous page">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs text-slate-500 tabular-nums">
          Page {page} / {pages}
        </span>
        <button onClick={() => setPage((p) => Math.min(pages, p + 1))} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Next page">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Full screen">
          <Expand className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center p-6">
        <div
          className="relative bg-[#f3eedf] shadow-md transition-transform"
          style={{
            width: 320,
            height: 440,
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
          }}
        >
          {/* faux handwritten-register texture */}
          <div className="absolute inset-0 p-6 opacity-70">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="h-px bg-[#d8c79f] mb-6" style={{ width: `${70 + (i % 3) * 10}%` }} />
            ))}
          </div>
          <div className="absolute inset-x-6 top-4 text-[10px] text-[#9c8a5f] tracking-wide font-medium">
            KHASRA REGISTER — PAGE {page}
          </div>
          {highlightRegion && (
            <div
              className="absolute border-2 border-survey-500 bg-survey-500/10 rounded-sm animate-pulse"
              style={{
                left: `${highlightRegion.x}%`,
                top: `${highlightRegion.y}%`,
                width: `${highlightRegion.w}%`,
                height: `${highlightRegion.h}%`,
              }}
            />
          )}
        </div>
      </div>

      <div className="flex gap-1.5 px-2.5 py-2 bg-white border-t border-slate-200 overflow-x-auto shrink-0">
        {Array.from({ length: pages }).map((_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            className={cn(
              "h-12 w-9 rounded border shrink-0 bg-[#f3eedf]",
              page === i + 1 ? "survey-mark border-survey-400" : "border-slate-200"
            )}
          />
        ))}
      </div>
    </div>
  );
}
