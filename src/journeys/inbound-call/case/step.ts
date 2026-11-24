import { step, access } from "@ministryofjustice/hmpps-forge/core/authoring";
import { InboundCallEffects } from "#src/journeys/effects.js";
import { clientHomeBlock, clientHomePersonalDetailsBlock } from "../case/block.js";

export const clientCaseStep = step({
  code: "client-case-details",
  path: "/client-homepage",
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
