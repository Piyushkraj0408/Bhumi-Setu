import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, UploadCloud } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { DocumentsTable } from "../../components/tables/DocumentsTable";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { listDocuments } from "../../services/document.service";
import { STATES } from "../../data/mockData";
import type { LandDocument } from "../../types";
import { useNavigate } from "react-router-dom";
import { FileStack } from "lucide-react";

export function DocumentManagementPage() {
  const [items, setItems] = useState<LandDocument[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();
  const pageSize = 8;

  useEffect(() => {
    setItems(null);
    listDocuments({
      search: search || undefined,
      state: state || undefined,
      status: (status as LandDocument["processingStatus"]) || undefined,
      page,
      pageSize,
    }).then((res) => {
      setItems(res.items);
      setTotal(res.total);
    });
  }, [search, state, status, page]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-navy-900">Document Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">Search, filter, and manage all uploaded land record documents.</p>
        </div>
        <Button icon={<UploadCloud className="h-3.5 w-3.5" />} onClick={() => navigate("/documents/upload")}>
          Upload Document
        </Button>
      </div>

      <Card>
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-slate-100">
          <div className="flex-1 min-w-[220px]">
            <Input
              icon={<Search className="h-3.5 w-3.5" />}
              placeholder="Search by document ID, file name, village…"
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            />
          </div>
          <div className="w-44">
            <Select value={state} onChange={(e) => { setPage(1); setState(e.target.value); }}>
              <option value="">All States</option>
              {STATES.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </div>
          <div className="w-44">
            <Select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
              <option value="">All Statuses</option>
              <option value="uploaded">Uploaded</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </Select>
          </div>
          <Button variant="outline" size="sm" icon={<SlidersHorizontal className="h-3.5 w-3.5" />}>
            More Filters
          </Button>
        </div>

        {items === null ? (
          <TableSkeleton rows={8} cols={10} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<FileStack className="h-5 w-5" />}
            title="No documents found"
            description="Try adjusting your search or filters, or upload a new land record document."
            action={<Button size="sm" onClick={() => navigate("/documents/upload")}>Upload Document</Button>}
          />
        ) : (
          <>
            <DocumentsTable documents={items} />
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
