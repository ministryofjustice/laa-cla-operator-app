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

export interface StateBenefitType {
  code: string;
  label: string;
  category_description?: string;
}
