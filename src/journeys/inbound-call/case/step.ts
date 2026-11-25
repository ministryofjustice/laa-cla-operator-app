import { step, access } from "@ministryofjustice/hmpps-forge/core/authoring";
import { InboundCallEffects } from "#src/journeys/effects.js";
import {
  clientHomeBlock,
} from "../case/block.js";
import {clientHomePersonalDetailsBlock} from "../case/client-details-block.js";

export const clientCaseStep = step({
  code: "client-case-details",
  path: "/case-homepage",
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
