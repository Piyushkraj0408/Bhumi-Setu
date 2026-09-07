import { useNavigate } from "react-router-dom";
import { Eye, Cpu, ClipboardCheck, Download, MoreHorizontal } from "lucide-react";
import type { LandDocument } from "../../types";
import { ProcessingStatusBadge, ValidationStatusBadge, VerificationStatusBadge } from "../ui/StatusBadge";
import { ConfidenceBadge } from "../ui/Confidence";
import { formatDate } from "../../utils/format";

export function DocumentsTable({ documents }: { documents: LandDocument[] }) {
  const navigate = useNavigate();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
            <th className="px-4 py-3 font-medium">Document ID</th>
            <th className="px-4 py-3 font-medium">File Name</th>
            <th className="px-4 py-3 font-medium">Location</th>
            <th className="px-4 py-3 font-medium">Record Type</th>
            <th className="px-4 py-3 font-medium">Uploaded By</th>
            <th className="px-4 py-3 font-medium">Upload Date</th>
            <th className="px-4 py-3 font-medium">Processing</th>
            <th className="px-4 py-3 font-medium">Confidence</th>
            <th className="px-4 py-3 font-medium">Validation</th>
            <th className="px-4 py-3 font-medium">Verification</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="px-4 py-3 font-medium text-brand-700 whitespace-nowrap font-ids">
                <button onClick={() => navigate(`/documents/${doc.id}`)} className="hover:underline">
                  {doc.id}
                </button>
              </td>
              <td className="px-4 py-3 text-navy-800 max-w-[180px] truncate">{doc.fileName}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                {doc.location.village}, {doc.location.district}
              </td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{doc.documentType}</td>
              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{doc.uploadedBy}</td>
              <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(doc.uploadDate)}</td>
              <td className="px-4 py-3 whitespace-nowrap"><ProcessingStatusBadge status={doc.processingStatus} /></td>
              <td className="px-4 py-3 whitespace-nowrap"><ConfidenceBadge value={doc.confidence} /></td>
              <td className="px-4 py-3 whitespace-nowrap"><ValidationStatusBadge status={doc.validationStatus} /></td>
              <td className="px-4 py-3 whitespace-nowrap"><VerificationStatusBadge status={doc.verificationStatus} /></td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button title="View" onClick={() => navigate(`/documents/${doc.id}`)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button title="Process" onClick={() => navigate(`/documents/processing/${doc.id}`)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500">
                    <Cpu className="h-3.5 w-3.5" />
                  </button>
                  <button title="Verify" onClick={() => navigate(`/verification`)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500">
                    <ClipboardCheck className="h-3.5 w-3.5" />
                  </button>
                  <button title="Download" className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500">
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button title="More" className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
