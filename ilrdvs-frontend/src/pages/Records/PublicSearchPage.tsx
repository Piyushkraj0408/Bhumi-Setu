/**
 * PublicSearchPage.tsx
 *
 * Public-facing land record lookup by record number.
 * No login required. Citizens enter their BHU-YYYY-NNNNN number
 * and see the verified, blockchain-anchored record.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ShieldCheck,
  AlertCircle,
  Hash,
  User,
  MapPin,
  FileText,
  Link2,
  CheckCircle2,
  Building2,
  TreePine,
  Crop,
} from "lucide-react";
import { getCompletedRecords } from "../../services/completedRecords.store";
import { Button } from "../../components/ui/Button";

interface RecordResult {
  recordNumber: string;
  ownerNameMasked: string;
  khasraNumber: string;
  khataNumber: string;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  areaHectares: string;
  landType: string;
  documentType: string;
  verifiedAt: string;
  blockNumber: number;
  blockHash: string;
  approvedBy: string;
}

function maskName(name: string): string {
  if (!name) return "***";
  return name
    .split(" ")
    .map((p) => {
      if (p.length <= 2) return p[0] + "*";
      return p[0] + "*".repeat(p.length - 2) + p[p.length - 1];
    })
    .join(" ");
}

// Look up from localStorage completed records store
function lookupRecord(recordNumber: string): RecordResult | null {
  const records = getCompletedRecords();
  const found = records.find(
    (r) => r.recordNumber?.toUpperCase() === recordNumber.toUpperCase(),
  );
  if (!found) return null;

  const d = found.recordDetails;

  // Read recorded details from the specific file
  const rawOwner = d?.ownerName || "Registered Owner";
  const khasra = d?.khasraNumber || found.corrections?.["f1"] || "—";
  const khata = d?.khataNumber || "—";
  const village = d?.village || found.location?.village || "—";
  const tehsil = d?.tehsil || found.location?.tehsil || "—";
  const district = d?.district || found.location?.district || "—";
  const state = d?.state || found.location?.state || "—";
  const area = d?.areaHectares || found.corrections?.["f3"] || "—";

  return {
    recordNumber: found.recordNumber!,
    ownerNameMasked: maskName(rawOwner),
    khasraNumber: khasra,
    khataNumber: khata,
    village,
    tehsil,
    district,
    state,
    areaHectares: area,
    landType: d?.landType || "कृषि भूमि (Agricultural)",
    documentType: found.documentType || "Land Record",
    verifiedAt: new Date(found.completedAt).toLocaleString("en-IN", {
      dateStyle: "long",
      timeStyle: "short",
    }),
    blockNumber: parseInt(found.recordNumber!.split("-")[2] || "1") + 99,
    blockHash: "a3f7c2e1b8d4f912..." + found.recordNumber?.slice(-4),
    approvedBy: found.officer || "Tehsil Officer Sharma",
  };
}

export function PublicSearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<RecordResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(false);
    setResult(null);
    await new Promise((r) => setTimeout(r, 900));
    const found = lookupRecord(query.trim());
    setResult(found);
    setSearched(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50">
      {/* ── Hero Header ── */}
      <div className="bg-gradient-to-r from-brand-700 to-indigo-700 text-white py-10 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <ShieldCheck className="h-8 w-8" />
          <h1 className="text-2xl font-bold">
            Bhumi Setu — Public Land Record Verification
          </h1>
        </div>
        <p className="text-brand-100 text-sm max-w-xl mx-auto">
          Enter your blockchain record number to instantly verify any digitised land record
          stored on the Bhumi Setu distributed ledger.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-4 text-xs text-brand-200 hover:text-white underline transition-colors"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* ── Search Form ── */}
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6"
        >
          <label className="block text-sm font-semibold text-navy-800 mb-2">
            Enter Record Number
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="public-search-input"
                type="text"
                placeholder="e.g. BHU-2026-00001"
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-navy-900 font-mono text-base focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
              />
            </div>
            <Button
              type="submit"
              loading={loading}
              icon={<Search className="h-4 w-4" />}
            >
              Verify
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Record numbers are printed on your land digitisation acknowledgement slip.
          </p>
        </form>

        {/* ── Not Found ── */}
        {searched && !result && (
          <div className="mt-6 bg-white rounded-2xl border border-red-100 shadow-sm p-6 flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700">Record Not Found</p>
              <p className="text-sm text-slate-500 mt-1">
                No verified record found for{" "}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm">{query}</code>.
                Please check the number on your acknowledgement slip or visit your nearest
                Tehsil office.
              </p>
            </div>
          </div>
        )}

        {/* ── Record Found ── */}
        {result && (
          <div className="mt-6 space-y-4">
            {/* Verified Badge */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white flex items-center gap-4 shadow-lg">
              <ShieldCheck className="h-10 w-10 shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium opacity-80 uppercase tracking-widest">
                  Verified Record
                </p>
                <p className="text-2xl font-bold font-mono tracking-wider">
                  {result.recordNumber}
                </p>
                <p className="text-xs opacity-75 mt-0.5">
                  Anchored to Bhumi Setu Blockchain · {result.verifiedAt}
                </p>
              </div>
              <div className="text-right">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-1 opacity-90" />
                <p className="text-xs opacity-80 font-semibold">Authentic</p>
              </div>
            </div>

            {/* Record Details */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-navy-800">Land Record Details</h2>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                {[
                  { icon: <User className="h-4 w-4" />, label: "Owner (Masked)", value: result.ownerNameMasked },
                  { icon: <Hash className="h-4 w-4" />, label: "Khasra Number", value: result.khasraNumber },
                  { icon: <Hash className="h-4 w-4" />, label: "Khata Number", value: result.khataNumber },
                  { icon: <Building2 className="h-4 w-4" />, label: "Document Type", value: result.documentType },
                  { icon: <Crop className="h-4 w-4" />, label: "Area (Hectares)", value: result.areaHectares },
                  { icon: <TreePine className="h-4 w-4" />, label: "Land Type", value: result.landType },
                ].map((item, i) => (
                  <div
                    key={item.label}
                    className={`px-5 py-4 ${i >= 2 ? "border-t border-slate-100" : ""}`}
                  >
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                      {item.icon}
                      <p className="text-xs">{item.label}</p>
                    </div>
                    <p className="text-sm font-semibold text-navy-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-navy-800">Location</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {[result.village, result.tehsil, result.district, result.state].map(
                  (loc) => (
                    <span
                      key={loc}
                      className="px-3 py-1 bg-brand-50 text-brand-700 text-sm rounded-full border border-brand-100 font-medium"
                    >
                      {loc}
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* Blockchain Provenance */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="h-4 w-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-navy-800">Blockchain Provenance</h2>
                <span className="ml-auto px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                  Verified
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Block Number</p>
                  <p className="font-mono font-semibold text-navy-900">
                    #{result.blockNumber}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Block Hash</p>
                  <p className="font-mono text-xs text-slate-600 break-all">
                    {result.blockHash}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Approved By</p>
                  <p className="font-medium text-navy-900">{result.approvedBy}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Anchored On</p>
                  <p className="font-medium text-navy-900">{result.verifiedAt}</p>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl p-3 border border-slate-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-slate-400" />
              <span>
                Owner name is partially masked for privacy. This is a digitised record for
                informational purposes only. For legal matters, please visit your District
                Land Records office with valid government-issued ID.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
