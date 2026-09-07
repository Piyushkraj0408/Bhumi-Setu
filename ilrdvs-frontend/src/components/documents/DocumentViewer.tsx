import { useState, useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Expand,
  FileText,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { getDownloadUrl, getDocumentById } from "../../services/document.service";
import type { LandDocument } from "../../types";

interface DocumentViewerProps {
  pages?: number;
  highlightRegion?: { x: number; y: number; w: number; h: number } | null;
  fileUrl?: string;
  documentId?: string;
  docTitle?: string;
}

export function DocumentViewer({
  pages = 1,
  highlightRegion,
  fileUrl: propFileUrl,
  documentId,
  docTitle,
}: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [page, setPage] = useState(1);
  const [fetchedUrl, setFetchedUrl] = useState<string | null>(null);
  const [docMeta, setDocMeta] = useState<LandDocument | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (documentId) {
      getDocumentById(documentId).then((d) => {
        if (d) {
          setDocMeta(d);
          if (d.previewUrl || d.fileUrl) {
            setFetchedUrl(d.previewUrl || d.fileUrl || null);
          }
        }
      });
      if (!propFileUrl) {
        getDownloadUrl(documentId).then((url) => {
          if (url) setFetchedUrl(url);
        });
      }
    }
  }, [documentId, propFileUrl]);

  const activeUrl = propFileUrl || fetchedUrl;
  const fileName = docTitle || docMeta?.fileName || (documentId ? `Document ${documentId}` : "Scanned Document");
  
  const isPdf = Boolean(
    activeUrl &&
      (/\.pdf($|\?)/i.test(activeUrl) ||
        fileName.toLowerCase().endsWith(".pdf") ||
        activeUrl.includes("application/pdf"))
  );
  
  const isImage = Boolean(
    activeUrl &&
      !isPdf
  );

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200",
        isFullscreen && "fixed inset-0 z-50 rounded-none border-none"
      )}
    >
      {/* Controls Bar */}
      <div className="flex items-center gap-1 px-2.5 py-2 bg-white border-b border-slate-200 shrink-0">
        <button
          onClick={() => setZoom((z) => Math.max(50, z - 10))}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
          title="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs text-slate-500 w-10 text-center tabular-nums">{zoom}%</span>
        <button
          onClick={() => setZoom((z) => Math.min(200, z + 10))}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
          title="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setZoom(100)}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
          title="Fit page"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setRotation((r) => (r + 90) % 360)}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
          title="Rotate"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 text-center text-xs text-slate-600 font-medium truncate px-2">
          {fileName}
        </div>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
          title="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs text-slate-500 tabular-nums">
          Page {page} / {pages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
          title="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setIsFullscreen((f) => !f)}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
          title={isFullscreen ? "Exit full screen" : "Full screen"}
        >
          <Expand className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Document Viewport */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-200/70">
        {activeUrl ? (
          isPdf ? (
            <iframe
              src={activeUrl}
              title={fileName}
              className="w-full h-full rounded shadow-md border border-slate-300 bg-white"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
              }}
            />
          ) : isImage ? (
            <div
              className="relative shadow-xl transition-transform bg-white rounded p-2"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
              }}
            >
              <img
                src={activeUrl}
                alt={fileName}
                className="max-w-full max-h-[520px] object-contain rounded"
              />
              {highlightRegion && (
                <div
                  className="absolute border-2 border-brand-500 bg-brand-500/20 rounded-sm animate-pulse"
                  style={{
                    left: `${highlightRegion.x}%`,
                    top: `${highlightRegion.y}%`,
                    width: `${highlightRegion.w}%`,
                    height: `${highlightRegion.h}%`,
                  }}
                />
              )}
            </div>
          ) : (
            <a
              href={activeUrl}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-2 text-brand-600 hover:text-brand-700 bg-white p-6 rounded-lg shadow border border-slate-200"
            >
              <FileText className="h-12 w-12" />
              <span className="text-sm font-medium">Open {fileName}</span>
            </a>
          )
        ) : (
          /* Clean Uploaded Document Summary Card (No static fake prewritten names) */
          <div
            className="relative bg-white shadow-md border border-slate-200 rounded-lg text-slate-800 p-6 space-y-4 max-w-sm w-full"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: "center center",
            }}
          >
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="h-10 w-10 rounded-md bg-brand-50 text-brand-600 flex items-center justify-center font-bold shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-navy-900 truncate">{fileName}</h4>
                <p className="text-xs text-slate-400">ID: {documentId || "Pending Upload"}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Document Type</span>
                <span className="font-medium text-navy-900">{docMeta?.documentType || "Land Record"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">State</span>
                <span className="font-medium text-navy-900">{docMeta?.location?.state || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">District</span>
                <span className="font-medium text-navy-900">{docMeta?.location?.district || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Tehsil</span>
                <span className="font-medium text-navy-900">{docMeta?.location?.tehsil || "N/A"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Village</span>
                <span className="font-medium text-navy-900">{docMeta?.location?.village || "N/A"}</span>
              </div>
            </div>

            <div className="pt-2 text-center text-[11px] text-slate-400 italic">
              Document Scan &amp; OCR Data Preview
            </div>

            {highlightRegion && (
              <div
                className="absolute border-2 border-brand-600 bg-brand-500/20 rounded-sm animate-pulse"
                style={{
                  left: `${highlightRegion.x}%`,
                  top: `${highlightRegion.y}%`,
                  width: `${highlightRegion.w}%`,
                  height: `${highlightRegion.h}%`,
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Page Thumbnails */}
      <div className="flex gap-1.5 px-2.5 py-2 bg-white border-t border-slate-200 overflow-x-auto shrink-0">
        {Array.from({ length: pages }).map((_, i) => (
          <button
            key={i}
            onClick={() => setPage(i + 1)}
            className={cn(
              "h-10 w-8 rounded border shrink-0 bg-slate-50 flex items-center justify-center text-[10px] font-bold text-slate-500",
              page === i + 1 ? "border-brand-500 ring-2 ring-brand-200 text-brand-700 bg-brand-50" : "border-slate-200"
            )}
          >
            P{i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
