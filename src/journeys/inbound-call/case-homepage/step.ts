import { step } from "@ministryofjustice/hmpps-forge/core/authoring";
import {
  clientHomeBlock,
  caseHomeBlockHeader,
} from "../case-homepage/block.js";

export const clientCaseStep = step({
  code: "client-case-details",
  path: "/case-homepage",
  title: "Client Homepage",

  reachability: { entryWhen: true },
  view: { template: "main/case-homepage.njk" },
  blocks: [caseHomeBlockHeader, clientHomeBlock],
});
