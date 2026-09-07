import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Pagination } from "../../components/ui/Pagination";
import { TableSkeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfidenceBadge } from "../../components/ui/Confidence";
import { ValidationStatusBadge } from "../../components/ui/StatusBadge";
import { Badge } from "../../components/ui/Badge";
import { searchRecords } from "../../services/record.service";
import type { RecordSearchFilters } from "../../services/record.service";
import { STATES } from "../../data/mockData";
import type { LandRecord } from "../../types";
import { Search as SearchIcon } from "lucide-react";

export function RecordSearchPage() {
  const [filters, setFilters] = useState<RecordSearchFilters>({});
  const [owner, setOwner] = useState("");
  const [survey, setSurvey] = useState("");
  const [state, setState] = useState("");
  const [items, setItems] = useState<LandRecord[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const pageSize = 8;

  useEffect(() => {
    setItems(null);
    searchRecords({ ...filters, page, pageSize }).then((res) => {
      setItems(res.items);
      setTotal(res.total);
    });
  }, [filters, page]);

  function runSearch() {
    setPage(1);
    setFilters({ owner: owner || undefined, surveyNumber: survey || undefined, state: state || undefined });
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-navy-900">Land Record Search</h1>
        <p className="text-sm text-slate-500 mt-0.5">Search validated and verified digital land records across states.</p>
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Input label="Search" icon={<Search className="h-3.5 w-3.5" />} placeholder="Owner name, survey no., khasra, khata…" value={owner} onChange={(e) => setOwner(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runSearch()} />
            </div>
            <div className="w-40">
              <Input label="Survey Number" placeholder="e.g. 142/3A" value={survey} onChange={(e) => setSurvey(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runSearch()} />
            </div>
            <div className="w-44">
              <Select label="State" value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">All States</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <Button icon={<SearchIcon className="h-3.5 w-3.5" />} onClick={runSearch}>Search</Button>
            <Button variant="outline" icon={<SlidersHorizontal className="h-3.5 w-3.5" />}>Advanced Filters</Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`Search Results${total ? ` (${total.toLocaleString("en-IN")} records)` : ""}`} />
        {items === null ? (
          <TableSkeleton rows={8} cols={9} />
        ) : items.length === 0 ? (
          <EmptyState title="No records found" description="Try a different owner name, survey number, or location." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="px-4 py-3 font-medium">Record ID</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Survey No.</th>
                    <th className="px-4 py-3 font-medium">Village</th>
                    <th className="px-4 py-3 font-medium">Area</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Confidence</th>
                    <th className="px-4 py-3 font-medium">Validation</th>
                    <th className="px-4 py-3 font-medium">GIS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 cursor-pointer transition-colors" onClick={() => navigate(`/records/${r.id}`)}>
                      <td className="px-4 py-3 font-medium text-brand-700 whitespace-nowrap font-ids">{r.id}</td>
                      <td className="px-4 py-3 text-navy-800 whitespace-nowrap">{r.owner}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-ids">{r.surveyNumber}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.location.village}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.area} {r.areaUnit}</td>
                      <td className="px-4 py-3">
                        <Badge tone={r.status === "Verified" ? "success" : r.status === "Rejected" ? "danger" : "warning"}>{r.status}</Badge>
                      </td>
                      <td className="px-4 py-3"><ConfidenceBadge value={r.extractionConfidence} /></td>
                      <td className="px-4 py-3"><ValidationStatusBadge status={r.validationStatus} /></td>
                      <td className="px-4 py-3"><ConfidenceBadge value={r.gisConfidence} kind="GIS" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
