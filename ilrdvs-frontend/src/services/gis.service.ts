import { simulateLatency } from "./api";
import { CADASTRAL_PARCELS } from "../data/mockData";
import type { CadastralParcel } from "../types";

export async function listParcels(): Promise<CadastralParcel[]> {
  return simulateLatency(CADASTRAL_PARCELS);
}

export async function getParcelBySurveyNumber(surveyNumber: string): Promise<CadastralParcel | undefined> {
  return simulateLatency(CADASTRAL_PARCELS.find((p) => p.surveyNumber === surveyNumber));
}

export async function runSpatialValidation(_parcelId: string): Promise<{ ok: boolean; message: string }> {
  return simulateLatency({ ok: true, message: "Parcel boundary matches cadastral survey within tolerance." }, 1100);
}
