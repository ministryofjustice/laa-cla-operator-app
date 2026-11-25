import { step, access } from "@ministryofjustice/hmpps-forge/core/authoring";
import { InboundCallEffects } from "#src/journeys/effects.js";
import {
  clientHomeBlock,
} from "../case/block.js";
import {clientHomePersonalDetailsBlock} from "../case/client-details-block.js";

export const CASE_HOMEPAGE_STEP_PATH = "case-homepage";

export const clientCaseStep = step({
  code: "client-case-details",
  path: CASE_HOMEPAGE_STEP_PATH,
  title: "Client Homepage",

  reachability: { entryWhen: true },
  view: { template: "main/client-homepage.njk" },
  blocks: [clientHomeBlock, clientHomePersonalDetailsBlock],
  onAccess: [
    access({
      effects: [InboundCallEffects.LoadPersonalDetails()],
    }),
  ],
});
