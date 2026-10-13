import { step } from "@ministryofjustice/hmpps-forge/core/authoring";
import { requireSilasAuth } from "#src/journeys/auth.js";
import { dashboardBlock } from "./block.js";

export const DASHBOARD_CODE = "dashboard-step";

export const dashboardStep = step({
  code: DASHBOARD_CODE,
  path: "/",
  title: "Assess and refer for civil legal advice Dashboard",
  reachability: { entryWhen: true },
  onAccess: [requireSilasAuth],
  view: { template: "main/forms/form.njk" },
  blocks: [dashboardBlock],
});
