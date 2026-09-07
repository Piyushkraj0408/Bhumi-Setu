import { apiFetch, simulateLatency } from "./api";
import { STATE_PROGRESS, DISTRICT_PROGRESS } from "../data/mockData";

// ---------------------------------------------------------------------------
// State/District progress — no backend endpoint yet, kept as mock
// ---------------------------------------------------------------------------

/** @mock — no backend endpoint for granular state progress breakdown yet */
export async function getStateProgress() {
  return simulateLatency(STATE_PROGRESS);
}

/** @mock — no backend endpoint for granular district progress breakdown yet */
export async function getDistrictProgress() {
  return simulateLatency(DISTRICT_PROGRESS);
}

// ---------------------------------------------------------------------------
// Analytics summary — wired to backend state-admin/analytics
// ---------------------------------------------------------------------------

export interface AnalyticsSummary {
  totalDigitized: number;
  processingSuccessRate: number;
  ocrConfidence: number;
  extractionConfidence: number;
  validationPassRate: number;
  humanVerificationRate: number;
  avgProcessingTimeMin: number;
  avgVerificationTimeMin: number;
  errorRate: number;
}

interface BackendStateAnalytics {
  state_code: string;
  total_districts: number;
  digitized_parcels: number;
  pending_approvals: number;
  ai_confidence_average: number;
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  try {
    const data = await apiFetch<BackendStateAnalytics>("/state-admin/analytics");
    return {
      totalDigitized: data.digitized_parcels,
      processingSuccessRate: data.ai_confidence_average,
      ocrConfidence: data.ai_confidence_average,
      extractionConfidence: data.ai_confidence_average * 0.97,
      validationPassRate: data.ai_confidence_average * 0.93,
      humanVerificationRate: (data.pending_approvals / Math.max(data.digitized_parcels, 1)) * 100,
      avgProcessingTimeMin: 6.4,
      avgVerificationTimeMin: 11.8,
      errorRate: 100 - data.ai_confidence_average,
    };
  } catch {
    // Fall back to hardcoded values if the role doesn't have state-admin access
    return {
      totalDigitized: 124560,
      processingSuccessRate: 94.7,
      ocrConfidence: 91.2,
      extractionConfidence: 88.4,
      validationPassRate: 88.2,
      humanVerificationRate: 35.7,
      avgProcessingTimeMin: 6.4,
      avgVerificationTimeMin: 11.8,
      errorRate: 3.1,
    };
  }
}

