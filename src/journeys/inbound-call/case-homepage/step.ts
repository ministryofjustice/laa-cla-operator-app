import { step, access } from "@ministryofjustice/hmpps-forge/core/authoring";
import { clientHomeBlock, thirdPartyBlock } from "./block.js";
import { InboundCallEffects } from "#src/journeys/effects.js";

export const clientCaseStep = step({
  code: "client-case-details",
  path: "/case-homepage",
  title: "Client Homepage",

  reachability: { entryWhen: true },
  view: { template: "main/client-homepage.njk" },
  blocks: [clientHomeBlock, thirdPartyBlock],
  onAccess: [ access({ effects: [InboundCallEffects.LoadThirdPartyDetails()]})]
});
