import { useEffect, useState } from "react";
import { Search, Compass, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardHeader, CardBody } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ConfidenceBar } from "../../components/ui/Confidence";
import { CadastralMap } from "../../components/gis/CadastralMap";
import { listParcels, runSpatialValidation } from "../../services/gis.service";
import type { CadastralParcel } from "../../types";
import { useToast } from "../../components/ui/Toast";

export function GisMapPage() {
  const { t } = useTranslation();
  const [parcels, setParcels] = useState<CadastralParcel[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    listParcels().then((p) => {
      setParcels(p);
      setSelectedId(p[1]?.id ?? p[0]?.id ?? null);
    });
  }, []);

  const selected = parcels.find((p) => p.id === selectedId) ?? null;

  async function handleValidate() {
    if (!selected) return;
    setValidating(true);
    const res = await runSpatialValidation(selected.id);
    setValidating(false);
    push(res.ok ? "success" : "error", res.message);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-navy-900">{t("nav.cadastralMap", "GIS / Cadastral Map")}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {t("gis.subtitle", "Spatially verify land records against surveyed parcel boundaries — part of the evidence chain from document to digital record.")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-5">
        <Card className="h-fit">
          <CardHeader title={t("gis.searchRecord", "Search Land Record")} />
          <CardBody className="space-y-3">
            <Input icon={<Search className="h-3.5 w-3.5" />} placeholder={t("records.searchPlaceholder", "Survey no., khasra, owner…")} />
            <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">{t("gis.mapLayers", "Map Layers")}</p>
            {[t("gis.cadastralParcels", "Cadastral parcels"), t("gis.villageBoundaries", "Village boundaries"), t("gis.tehsilBoundaries", "Tehsil boundaries"), t("gis.districtBoundaries", "District boundaries")].map((layer, i) => (
              <label key={layer} className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" defaultChecked={i < 2} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                {layer}
              </label>
            ))}
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-2">{t("gis.workflow", "GIS Workflow")}</p>
              <ol className="text-[11px] text-slate-500 space-y-1">
                <li>{t("nav.landRecords", "Land Record")}</li>
                <li>↓ {t("records.surveyNumber", "Survey / Khasra")}</li>
                <li>↓ {t("gis.cadastralParcel", "Cadastral Parcel")}</li>
                <li>↓ {t("nav.cadastralMap", "Map")}</li>
                <li>↓ {t("nav.spatialValidation", "Spatial Validation")}</li>
              </ol>
            </div>
          </CardBody>
        </Card>

        <Card className="h-[560px]">
          <CardBody className="h-full p-3">
            <CadastralMap parcels={parcels} selectedId={selectedId} onSelect={setSelectedId} />
          </CardBody>
        </Card>

        <Card className="h-fit">
          <CardHeader title={t("gis.parcelInfo", "Parcel Information")} />
          {selected ? (
            <CardBody className="space-y-3">
              <div>
                <p className="text-xs text-slate-500">{t("records.surveyNumber", "Survey No.")}</p>
                <p className="text-sm font-semibold text-navy-900 font-ids">{selected.surveyNumber}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{t("table.owner", "Owner")}</p>
                <p className="text-sm font-medium text-navy-900">{selected.owner}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500">{t("records.area", "Area (GIS)")}</p>
                  <p className="text-sm font-medium text-navy-900">{selected.area} {t("records.acres", "Acres")}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t("table.status", "Status")}</p>
                  <Badge tone={selected.status === "Validated" ? "success" : selected.status === "Pending" ? "warning" : "danger"}>
                    {t(`status.${selected.status.toLowerCase()}`, selected.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t("records.village", "Village")}</p>
                  <p className="text-sm text-navy-800">{selected.village}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t("records.district", "District")}</p>
                  <p className="text-sm text-navy-800">{selected.district}</p>
                </div>
              </div>
              <ConfidenceBar value={selected.gisConfidence} label={t("gis.confidenceLabel", "GIS Confidence")} kind="GIS" />
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1">{t("nav.recordDetails", "View Land Record")}</Button>
                <Button size="sm" className="flex-1" loading={validating} icon={<Compass className="h-3.5 w-3.5" />} onClick={handleValidate}>
                  {t("gis.runValidation", "Run Validation")}
                </Button>
              </div>
            </CardBody>
          ) : (
            <CardBody>
              <p className="text-sm text-slate-400 text-center py-6">{t("gis.selectParcel", "Select a parcel on the map to view details.")}</p>
            </CardBody>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title={t("gis.spatialIssues", "Spatial Validation Issues")} subtitle={t("gis.spatialIssuesSub", "Discrepancies found between recorded and surveyed geometry")} />
        <CardBody className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { title: t("gis.boundaryMismatch", "Boundary mismatch"), detail: "Survey 124/1 — recorded boundary overlaps neighboring parcel 124/2 by 0.08 acres." },
            { title: t("gis.areaMismatch", "Area mismatch"), detail: "Survey 125/1 — declared area (2.45 ac) differs from GIS-measured area (2.10 ac)." },
          ].map((issue) => (
            <div key={issue.title} className="flex gap-3 rounded-md border border-amber-200 bg-warning-50/50 p-3">
              <ShieldCheck className="h-4 w-4 text-warning-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-navy-900">{issue.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{issue.detail}</p>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
