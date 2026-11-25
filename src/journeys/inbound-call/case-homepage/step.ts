import { step, access, Data, Condition } from "@ministryofjustice/hmpps-forge/core/authoring";
import { clientHomeBlock, clientDetailsBlock } from "./block.js";
import { InboundCallEffects } from "#src/journeys/effects.js";

export const clientCaseStep = step({
  code: "client-case-details",
  path: "/case-homepage",
  title: "Client Homepage",

  reachability: { entryWhen: true },
  view: { template: "main/client-homepage.njk" },
  blocks: [clientHomeBlock, clientDetailsBlock],
  onAccess: [
    access({
      when: Data("case.thirdparty_details").match(Condition.IsRequired()),
      effects: [InboundCallEffects.LoadThirdPartyDetails()],
    }),
],});
