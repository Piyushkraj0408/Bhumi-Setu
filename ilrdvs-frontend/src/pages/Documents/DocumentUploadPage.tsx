import { useCallback, useRef, useState, useEffect } from "react";
import type { ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UploadCloud,
  File as FileIcon,
  X,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Trash2,
  Eye,
  FileText,
  Image,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { STATES, DISTRICTS_BY_STATE, VILLAGES } from "../../data/mockData";
import { formatFileSize } from "../../utils/format";
import { useToast } from "../../components/ui/Toast";
import { uploadDocument, type UploadMeta } from "../../services/document.service";

const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "tiff", "tif"];
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

interface QueueItem {
  id: string;
  file?: File;
  name: string;
  sizeKb: number;
  progress: number;
  status: "ready" | "uploading" | "completed" | "failed";
  error?: string;
  uploadedDocId?: string;
  previewUrl?: string;
}

export function DocumentUploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [docType, setDocType] = useState("Khasra");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [tehsil, setTehsil] = useState("");
  const [village, setVillage] = useState("");
  const [year, setYear] = useState("");
  const [isUploadingAll, setIsUploadingAll] = useState(false);
  const [previewItem, setPreviewItem] = useState<QueueItem | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { push } = useToast();

  const districts = state ? DISTRICTS_BY_STATE[state] ?? [] : [];

  // Check if all required metadata fields (except year) are filled
  const isFormValid = Boolean(
    docType.trim() && state.trim() && district.trim() && tehsil.trim() && village.trim()
  );

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      queue.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getMeta = (): UploadMeta => ({
    documentType: docType,
    state,
    district,
    tehsil,
    village,
    year,
  });

  const addFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const newItems: QueueItem[] = [];
      let rejectedCount = 0;

      Array.from(files).forEach((file, i) => {
        const ext = file.name.includes(".")
          ? file.name.split(".").pop()?.toLowerCase() || ""
          : "";
        const isSupported = ALLOWED_EXTENSIONS.includes(ext);
        const isSizeOk = file.size <= MAX_FILE_SIZE_BYTES;
        const isImage = ["jpg", "jpeg", "png"].includes(ext);
        const isPdf = ext === "pdf";

        let previewUrl: string | undefined;
        if (isSupported && isSizeOk && (isImage || isPdf)) {
          previewUrl = URL.createObjectURL(file);
        }

        if (!isSupported) {
          rejectedCount++;
          newItems.push({
            id: `item-${Date.now()}-${i}`,
            file,
            name: file.name,
            sizeKb: Math.round(file.size / 1024),
            progress: 0,
            status: "failed",
            error: `Unsupported format (.${ext || "unknown"}). Allowed: PDF, JPG, PNG, TIFF.`,
          });
        } else if (!isSizeOk) {
          rejectedCount++;
          newItems.push({
            id: `item-${Date.now()}-${i}`,
            file,
            name: file.name,
            sizeKb: Math.round(file.size / 1024),
            progress: 0,
            status: "failed",
            error: `File size exceeds maximum limit of 50 MB.`,
          });
        } else {
          newItems.push({
            id: `item-${Date.now()}-${i}`,
            file,
            name: file.name,
            sizeKb: Math.round(file.size / 1024),
            progress: 0,
            status: "ready",
            previewUrl,
          });
        }
      });

      setQueue((prev) => [...newItems, ...prev]);

      // Auto-select first new item for preview
      const firstValid = newItems.find((x) => x.status === "ready");
      if (firstValid) setPreviewItem(firstValid);

      if (rejectedCount > 0) {
        push(
          "error",
          `${rejectedCount} file(s) failed validation (unsupported format or >50MB).`
        );
      } else {
        push("info", `${newItems.length} file(s) added to the upload queue.`);
      }
    },
    [push]
  );

  const removeItem = (id: string) => {
    setQueue((q) => {
      const item = q.find((x) => x.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return q.filter((x) => x.id !== id);
    });
    setPreviewItem((p) => (p?.id === id ? null : p));
  };

  const clearCompleted = () => {
    setQueue((q) => {
      q.filter((x) => x.status === "completed").forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      return q.filter((x) => x.status !== "completed");
    });
  };

  const uploadSingleItem = async (item: QueueItem): Promise<string | null> => {
    if (!item.file || item.status === "uploading") return null;

    const ext = item.name.includes(".")
      ? item.name.split(".").pop()?.toLowerCase() || ""
      : "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setQueue((q) =>
        q.map((x) =>
          x.id === item.id
            ? {
                ...x,
                status: "failed",
                error: `Unsupported format (.${ext || "unknown"}). Allowed: PDF, JPG, PNG, TIFF.`,
              }
            : x
        )
      );
      return null;
    }

    setQueue((q) =>
      q.map((x) =>
        x.id === item.id
          ? { ...x, status: "uploading", progress: 25, error: undefined }
          : x
      )
    );

    try {
      const progressTimer = setInterval(() => {
        setQueue((q) =>
          q.map((x) =>
            x.id === item.id && x.status === "uploading" && x.progress < 85
              ? { ...x, progress: x.progress + 15 }
              : x
          )
        );
      }, 150);

      const res = await uploadDocument(item.file, getMeta());
      clearInterval(progressTimer);

      setQueue((q) =>
        q.map((x) =>
          x.id === item.id
            ? {
                ...x,
                status: "completed",
                progress: 100,
                uploadedDocId: res.id,
                error: undefined,
              }
            : x
        )
      );
      push("success", `${item.name} uploaded successfully.`);
      return res.id;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to upload document.";
      setQueue((q) =>
        q.map((x) =>
          x.id === item.id
            ? { ...x, status: "failed", progress: 0, error: msg }
            : x
        )
      );
      push("error", `Failed to upload ${item.name}: ${msg}`);
      return null;
    }
  };

  const handleUploadAll = async () => {
    if (!isFormValid) {
      push("warning", "Please select Document Type, State, District, Tehsil, and Village before uploading.");
      return;
    }

    const readyItems = queue.filter(
      (item) => item.file && (item.status === "ready" || item.status === "failed")
    );

    if (readyItems.length === 0) {
      if (queue.length === 0) {
        push("warning", "Please choose or drop files to upload first.");
      } else {
        push("info", "All files in queue have already been processed.");
      }
      return;
    }

    setIsUploadingAll(true);
    let lastDocId: string | null = null;

    for (const item of readyItems) {
      const docId = await uploadSingleItem(item);
      if (docId) lastDocId = docId;
    }
    setIsUploadingAll(false);

    if (lastDocId) {
      push("success", "Redirecting directly to AI Extraction Viewer...");
      navigate(`/documents/${lastDocId}/extraction`);
    }
  };

  const statusMeta: Record<
    QueueItem["status"],
    { icon: ReactElement; label: string; color: string }
  > = {
    ready: {
      icon: <FileIcon className="h-3.5 w-3.5" />,
      label: "Ready",
      color: "text-brand-600",
    },
    uploading: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      label: "Uploading...",
      color: "text-brand-600",
    },
    completed: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: "Uploaded",
      color: "text-success-600",
    },
    failed: {
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: "Failed",
      color: "text-danger-500",
    },
  };

  const completedCount = queue.filter((x) => x.status === "completed").length;
  const pendingCount = queue.filter(
    (x) => x.status === "ready" || x.status === "failed"
  ).length;

  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    if (["jpg", "jpeg", "png", "tiff", "tif"].includes(ext))
      return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const isImage = (name: string) =>
    ["jpg", "jpeg", "png"].includes(name.split(".").pop()?.toLowerCase() ?? "");
  const isPdf = (name: string) =>
    name.split(".").pop()?.toLowerCase() === "pdf";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-navy-900">
          Upload Historical Land Records
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Upload scanned documents, handwritten registers, or legacy PDFs for AI-assisted digitization.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Drop Zone */}
          <Card>
            <CardBody>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={`flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg py-10 px-6 transition-colors ${
                  dragOver
                    ? "border-brand-500 bg-brand-50"
                    : "border-slate-300 bg-slate-50/50"
                }`}
              >
                <div className="h-12 w-12 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mb-3">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-navy-800">
                  Drag &amp; drop files here, or
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => fileInput.current?.click()}
                >
                  Choose Files
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,application/pdf,image/jpeg,image/png,image/tiff"
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                />
                <p className="text-xs text-slate-400 mt-3">
                  Supported formats: PDF, JPG, PNG, TIFF · Max 50MB per file
                </p>
              </div>
            </CardBody>
          </Card>

          {/* File Preview Panel */}
          {previewItem && (
            <Card>
              <CardHeader
                title="File Preview"
                subtitle={previewItem.name}
                action={
                  <button
                    onClick={() => setPreviewItem(null)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    title="Close preview"
                  >
                    <X className="h-4 w-4" />
                  </button>
                }
              />
              <div className="p-4 flex items-center justify-center bg-slate-50 rounded-b-lg min-h-[320px]">
                {previewItem.previewUrl ? (
                  isImage(previewItem.name) ? (
                    <img
                      src={previewItem.previewUrl}
                      alt={`Preview of ${previewItem.name}`}
                      className="max-h-[400px] max-w-full object-contain rounded shadow"
                    />
                  ) : isPdf(previewItem.name) ? (
                    <iframe
                      src={previewItem.previewUrl}
                      title={`PDF preview of ${previewItem.name}`}
                      className="w-full rounded border border-slate-200"
                      style={{ height: 420 }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <FileText className="h-16 w-16 opacity-40" />
                      <p className="text-sm">Preview not available for this file type</p>
                      <p className="text-xs text-slate-400">{previewItem.name}</p>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <FileText className="h-16 w-16 opacity-40" />
                    <p className="text-sm">Preview not available</p>
                    <p className="text-xs">{previewItem.name}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Upload Queue */}
          <Card>
            <CardHeader
              title="Upload Queue"
              subtitle={`${queue.length} file(s) in this session`}
              action={
                completedCount > 0 ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={clearCompleted}
                  >
                    Clear Uploaded
                  </Button>
                ) : undefined
              }
            />
            <div className="divide-y divide-slate-100">
              {queue.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">
                  No files added yet. Select or drop documents above.
                </p>
              )}
              {queue.map((item) => {
                const meta = statusMeta[item.status];
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
                  >
                    <span
                      className={`h-9 w-9 rounded-md flex items-center justify-center shrink-0 ${
                        item.status === "failed"
                          ? "bg-danger-50 text-danger-500"
                          : item.status === "completed"
                          ? "bg-success-50 text-success-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {getFileIcon(item.name)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-navy-800 truncate font-medium">
                        {item.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">
                          {formatFileSize(item.sizeKb)}
                        </span>
                        {item.status === "uploading" && (
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-[140px]">
                            <div
                              className="h-full bg-brand-500 transition-all duration-300"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        )}
                        {item.error && (
                          <span className="text-xs text-danger-600 font-medium">
                            {item.error}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`flex items-center gap-1 text-xs font-medium ${meta.color}`}
                      >
                        {meta.icon}
                        {meta.label}
                      </span>

                      {/* Preview button */}
                      {item.previewUrl && (
                        <button
                          onClick={() =>
                            setPreviewItem((p) =>
                              p?.id === item.id ? null : item
                            )
                          }
                          className={`p-1.5 rounded transition-colors ${
                            previewItem?.id === item.id
                              ? "bg-brand-100 text-brand-600"
                              : "text-slate-400 hover:text-brand-600 hover:bg-brand-50"
                          }`}
                          title="Preview file"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {item.status === "completed" && item.uploadedDocId && (
                        <Link
                          to={`/documents/${item.uploadedDocId}/extraction`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2 py-1 rounded transition-colors"
                        >
                          Extraction <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}

                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate-300 hover:text-danger-500 p-1 rounded transition-colors"
                        title="Remove from queue"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Required Metadata Sidebar */}
        <div className="h-fit">
          <Card>
            <CardHeader
              title="Upload Options"
              subtitle="Required metadata to speed up AI extraction"
            />
            <CardBody className="space-y-4">
              <Select
                label="Document Type *"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                <option value="Khasra">Khasra</option>
                <option value="Khatauni">Khatauni</option>
                <option value="Jamabandi">Jamabandi</option>
                <option value="Record of Rights">Record of Rights</option>
                <option value="Mutation Register">Mutation Register</option>
                <option value="Survey Settlement">Survey Settlement</option>
                <option value="Register">Register</option>
              </Select>
              <Select
                label="State *"
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setDistrict("");
                  setTehsil("");
                }}
              >
                <option value="">Select state</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Select
                label="District *"
                disabled={!state}
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  setTehsil("");
                }}
              >
                <option value="">Select district</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
              <Select
                label="Tehsil *"
                disabled={!district}
                value={tehsil}
                onChange={(e) => setTehsil(e.target.value)}
              >
                <option value="">Select tehsil</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
              <Select
                label="Village *"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
              >
                <option value="">Select village</option>
                {VILLAGES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
              <Input
                label="Year (Optional)"
                placeholder="e.g. 1987"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />

              {!isFormValid && (
                <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Fill in State, District, Tehsil, and Village to enable upload.
                  </span>
                </div>
              )}

              <Button
                className="w-full"
                loading={isUploadingAll}
                disabled={isUploadingAll || pendingCount === 0 || !isFormValid}
                onClick={handleUploadAll}
              >
                {isUploadingAll
                  ? "Uploading..."
                  : !isFormValid
                  ? "Fill Metadata to Upload"
                  : pendingCount > 0
                  ? `Apply & Upload (${pendingCount})`
                  : "Apply to Queue & Upload"}
              </Button>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
