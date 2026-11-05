export interface CfeResult {
  result: "eligible" | "contribution_required" | "ineligible";
  calculations?: {
    disposable_income?: number;
    disposable_capital?: number;
    upper_tribunal?: boolean;
  };
}

export interface Assessor {
  assess: (payload: unknown) => Promise<CfeResult>;
  stateBenefitTypes: () => Promise<StateBenefitType[]>;
}

// The fields CFE's `GET /state_benefit_type` returns for each benefit type.
export interface StateBenefitType {
  name: string;
  label: string;
  dwp_code?: string | null;
  exclude_from_gross_income: boolean;
  category?: string | null;
}
