import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardHeader } from "../../components/ui/Card";
import { DocumentViewer } from "../../components/documents/DocumentViewer";
import { ConfidenceBadge } from "../../components/ui/Confidence";
import { getExtractedFields } from "../../services/extraction.service";
import type { ExtractedField } from "../../types";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { AlertTriangle, Edit3, Check, X, Save } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";

export function OcrViewerPage() {
  const { id } = useParams();
  const [fields, setFields] = useState<ExtractedField[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [active, setActive] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    if (!id) return;
    setFields(null);
    getExtractedFields(id).then(setFields);
  }, [id]);

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center h-60 text-slate-400 gap-2">
        <AlertTriangle className="h-8 w-8" />
        <p className="text-sm">No document selected. Please upload a document first.</p>
      </div>
    );
  }

  const handleStartEdit = (field: ExtractedField, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(field.id);
    setEditValue(field.value);
    setActive(field.id);
  };

  const handleSaveEdit = (fieldId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFields((prev) =>
      prev
        ? prev.map((f) =>
            f.id === fieldId
              ? { ...f, value: editValue, source: "Manual" as const }
              : f
          )
        : null
    );
    setEditingId(null);
    push("success", "OCR field updated successfully.");
  };

  const handleCancelEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(null);
  };

  const handleSaveAll = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      push("success", "All OCR corrections saved to document record.");
    }, 400);
  };

  const lowConfidenceCount = fields?.filter((f) => f.confidence < 85).length ?? 0;
  const editedCount = fields?.filter((f) => f.source === "Manual").length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy-900">OCR / HTR Viewer</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Document: {id} — verify &amp; edit recognized text against the original scan.
          </p>
        </div>
        {editedCount > 0 && (
          <Button
            size="sm"
            icon={<Save className="h-3.5 w-3.5" />}
            loading={isSaving}
            onClick={handleSaveAll}
          >
            Save All Changes ({editedCount})
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="h-[600px] flex flex-col">
          <CardHeader title="Original Document" subtitle="Zoom, rotate, or navigate pages" />
          <div className="flex-1 p-4">
            <DocumentViewer
              documentId={id}
              pages={2}
              highlightRegion={active ? { x: 20, y: 25, w: 55, h: 8 } : null}
            />
          </div>
        </Card>

        <Card className="h-[600px] flex flex-col">
          <CardHeader
            title="OCR Output & Verification"
            subtitle={
              lowConfidenceCount > 0
                ? `${lowConfidenceCount} low-confidence region(s) detected`
                : "All regions read with strong confidence"
            }
            action={
              lowConfidenceCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-warning-600 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" /> Review needed
                </span>
              )
            }
          />
          <div className="flex-1 overflow-y-auto p-2">
            {fields === null ? (
              <TableSkeleton rows={8} cols={2} />
            ) : (
              <div className="divide-y divide-slate-100">
                {fields.map((f) => {
                  const isEditing = editingId === f.id;
                  const isSelected = active === f.id;

                  return (
                    <div
                      key={f.id}
                      onClick={() => setActive(f.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                        isSelected ? "bg-brand-50/70" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-medium">
                            {f.label}
                          </span>
                          {f.source === "Manual" && (
                            <span className="text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-medium">
                              Edited
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <ConfidenceBadge value={f.confidence} kind="OCR Confidence" />
                          {!isEditing && (
                            <button
                              onClick={(e) => handleStartEdit(f, e)}
                              className="text-slate-400 hover:text-brand-600 p-1 rounded transition-colors"
                              title="Edit field value"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <form
                          onSubmit={(e) => handleSaveEdit(f.id, e)}
                          className="flex items-center gap-2 mt-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                            className="flex-1 px-2.5 py-1 text-sm border border-brand-500 rounded outline-none bg-white text-navy-900 shadow-sm"
                          />
                          <button
                            type="submit"
                            className="p-1.5 bg-brand-600 text-white rounded hover:bg-brand-700 transition-colors"
                            title="Save"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="p-1.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition-colors"
                            title="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center justify-between group">
                          <p className="text-sm font-medium text-navy-900">{f.value}</p>
                          <button
                            onClick={(e) => handleStartEdit(f, e)}
                            className="text-xs text-brand-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
