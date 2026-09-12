import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Search as SearchIcon, RotateCcw, Landmark } from "lucide-react";
import { useTranslation } from "react-i18next";
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

export function RecordSearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Retrieve any query parameter or stored last search from localStorage
  const urlOwner = searchParams.get("owner") || searchParams.get("q") || "";
  const urlSurvey = searchParams.get("survey") || searchParams.get("surveyNumber") || "";
  const urlState = searchParams.get("state") || "";
  const storedLastQuery = typeof window !== "undefined" ? localStorage.getItem("bhoomi_last_search_query") || "" : "";

  const initialOwner = urlOwner || storedLastQuery || "";
  const initialSurvey = urlSurvey || "";
  const initialState = urlState || "";

  const [hasSearched, setHasSearched] = useState<boolean>(Boolean(initialOwner || initialSurvey || initialState));
  const [owner, setOwner] = useState(initialOwner);
  const [survey, setSurvey] = useState(initialSurvey);
  const [state, setState] = useState(initialState);
  const [activeSearchTerm, setActiveSearchTerm] = useState<string>(initialOwner || initialSurvey || initialState || "");
  const [items, setItems] = useState<LandRecord[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  function runSearch(customQuery?: string) {
    const q = customQuery !== undefined ? customQuery : owner;
    if (customQuery !== undefined) {
      setOwner(customQuery);
    }
    const queryTerm = q.trim();
    const surveyTerm = survey.trim();

    if (!queryTerm && !surveyTerm && !state) {
      clearSearch();
      return;
    }

    setPage(1);
    setHasSearched(true);
    const termLabel = queryTerm || surveyTerm || state;
    setActiveSearchTerm(termLabel);

    if (queryTerm) {
      localStorage.setItem("bhoomi_last_search_query", queryTerm);
      setSearchParams({ owner: queryTerm });
    } else if (surveyTerm) {
      localStorage.setItem("bhoomi_last_search_query", surveyTerm);
      setSearchParams({ survey: surveyTerm });
    } else {
      setSearchParams({ state });
    }

    fetchSearchResults({
      owner: queryTerm || undefined,
      surveyNumber: surveyTerm || undefined,
      state: state || undefined,
      page: 1,
      pageSize,
    });
  }

  function clearSearch() {
    setOwner("");
    setSurvey("");
    setState("");
    setHasSearched(false);
    setActiveSearchTerm("");
    setItems([]);
    setTotal(0);
    localStorage.removeItem("bhoomi_last_search_query");
    setSearchParams({});
  }

  function fetchSearchResults(filters: RecordSearchFilters) {
    setItems(null);
    searchRecords(filters).then((res) => {
      setItems(res.items);
      setTotal(res.total);
    });
  }

  useEffect(() => {
    if (!hasSearched) {
      setItems([]);
      setTotal(0);
      return;
    }

    fetchSearchResults({
      owner: owner.trim() || undefined,
      surveyNumber: survey.trim() || undefined,
      state: state || undefined,
      page,
      pageSize,
    });
  }, [page]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-navy-900">{t("nav.searchRecords", "Land Record Search")}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Search and view verified digital land records, 7/12 extracts, and parcel details.
        </p>
      </div>

      {/* Search Filter Box */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <Input
                label={t("common.search", "Search by Owner Name, Khasra, Survey No, or Village")}
                icon={<Search className="h-3.5 w-3.5" />}
                placeholder="e.g. Ramesh Patil, 42/1, 108/B, Haveli…"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
              />
            </div>
            <div className="w-40">
              <Input
                label={t("records.surveyNumber", "Survey Number")}
                placeholder="e.g. 142/3A"
                value={survey}
                onChange={(e) => setSurvey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
              />
            </div>
            <div className="w-44">
              <Select label={t("records.district", "State")} value={state} onChange={(e) => setState(e.target.value)}>
                <option value="">{t("documents.allStates", "All States")}</option>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <Button icon={<SearchIcon className="h-3.5 w-3.5" />} onClick={() => runSearch()}>
              {t("common.search", "Search")}
            </Button>
            {hasSearched && (
              <Button variant="outline" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={clearSearch}>
                Clear
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Showing Only Last Search Info Banner */}
      {hasSearched && activeSearchTerm && (
        <div className="flex items-center justify-between bg-emerald-50/90 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
            <span>
              Showing only results for your last search: <strong>"{activeSearchTerm}"</strong> ({total} record{total === 1 ? "" : "s"} found)
            </span>
          </div>
          <button
            type="button"
            onClick={clearSearch}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer ml-3 shrink-0"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Results View or Prompt */}
      {!hasSearched ? (
        <Card>
          <CardBody className="py-14 px-6 text-center">
            <div className="max-w-md mx-auto">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-xs">
                <Landmark className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-bold text-navy-900">
                Search to View Your Land Records
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Enter your Owner Name, Khasra Number, or Survey Number in the search box above to view verified 7/12 extract details and cadastral parcel information.
              </p>
              <div className="mt-5 pt-4 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 block mb-2 uppercase tracking-wide">
                  Quick Search Suggestions:
                </span>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {["Ramesh Patil", "42/1", "Anand Rao", "108/B", "77/3", "Haveli"].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => runSearch(q)}
                      className="px-3 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title={`${t("records.searchResults", "Search Results")}${total ? ` (${total.toLocaleString("en-IN")} ${t("records.recordsUnit", "records")})` : ""}`}
          />
          {items === null ? (
            <TableSkeleton rows={6} cols={8} />
          ) : items.length === 0 ? (
            <EmptyState
              title={t("records.noRecordsFound", "No records found")}
              description={`No verified land records match "${activeSearchTerm}". Try searching with a different survey number, khasra, or owner name.`}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                      <th className="px-4 py-3 font-medium">{t("table.recordId", "Record ID")}</th>
                      <th className="px-4 py-3 font-medium">{t("table.owner", "Owner")}</th>
                      <th className="px-4 py-3 font-medium">{t("records.surveyNumber", "Survey / Khasra No.")}</th>
                      <th className="px-4 py-3 font-medium">{t("records.village", "Village / Tehsil")}</th>
                      <th className="px-4 py-3 font-medium">{t("records.area", "Area")}</th>
                      <th className="px-4 py-3 font-medium">{t("table.status", "Status")}</th>
                      <th className="px-4 py-3 font-medium">{t("table.confidence", "Confidence")}</th>
                      <th className="px-4 py-3 font-medium">{t("table.validation", "Validation")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((r) => (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                        onClick={() => navigate(`/records/${r.id}`)}
                      >
                        <td className="px-4 py-3 font-medium text-brand-700 whitespace-nowrap font-ids">
                          {r.id}
                        </td>
                        <td className="px-4 py-3 text-navy-800 whitespace-nowrap font-semibold">
                          {r.owner}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-ids">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono border border-slate-200">
                            {r.khasraNumber || r.surveyNumber}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {r.location.village}, {r.location.tehsil}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-medium">
                          {r.area} {r.areaUnit}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={r.status === "Verified" ? "success" : r.status === "Rejected" ? "danger" : "warning"}>
                            {t(`status.${r.status.toLowerCase()}`, r.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <ConfidenceBadge value={r.extractionConfidence} />
                        </td>
                        <td className="px-4 py-3">
                          <ValidationStatusBadge status={r.validationStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            </>
          )}
        </Card>
      )}
    </div>
  );
}
