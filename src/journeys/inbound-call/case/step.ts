import { step } from "@ministryofjustice/hmpps-forge/core/authoring";
import { clientHomeBlock } from "../case/block.js";

export const clientCaseStep = step({
  code: "client-case-details",
  path: "/case-homepage",
  title: "Client Homepage",

  reachability: { entryWhen: true },
  view: { template: "main/case-homepage.njk" },
  blocks: [clientHomeBlock],
});
