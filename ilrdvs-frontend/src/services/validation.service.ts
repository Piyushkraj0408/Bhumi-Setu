import { simulateLatency } from "./api";
import { VALIDATION_ISSUES } from "../data/mockData";
import type { ValidationIssue } from "../types";

export async function getValidationIssues(documentId?: string): Promise<ValidationIssue[]> {
  const items = documentId ? VALIDATION_ISSUES.filter((v) => v.documentId === documentId) : VALIDATION_ISSUES;
  return simulateLatency(items);
}

export async function submitOfficerAction(
  _issueId: string,
  _action: "accept" | "correct" | "reject"
): Promise<void> {
  return simulateLatency(undefined, 350);
}

export async function rerunValidation(_documentId: string): Promise<{ passed: boolean }> {
  return simulateLatency({ passed: true }, 900);
}
