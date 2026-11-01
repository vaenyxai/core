import type { ResearchRange } from "@vaenyx/contracts";

// Only host-authored diagnostics are exposed; never raw model/provider output.
export class ResearchValidationError extends Error {
  constructor(
    readonly code: string,
    detail: string,
  ) {
    super(`${code}: ${detail}`);
  }
}

export class ResearchRangeError extends ResearchValidationError {
  constructor(
    readonly sourceId: string,
    readonly requested: ResearchRange | null,
    readonly unit: ResearchRange["unit"],
    readonly totalUnits: number,
  ) {
    super(
      "invalid_read_range",
      `Read range is invalid. Available ${unit} units: ${totalUnits}. Use one-based positions or to:null for a bounded initial read.`,
    );
  }
}
