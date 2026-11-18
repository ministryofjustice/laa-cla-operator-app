import {
  step,
  submit,
  redirect,
  Post,
  Condition,
  Format,
  Data,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { InboundCallEffects } from "#src/journeys/effects.js";
import { clientDetailsBlock } from "./block.js";
import { ADDRESS_LOOKUP_STEP_CODE } from "../address-lookup/step.js";

// Step 3: Add new client if clicked on "Start a new case"
export const addClientDetailsStep = step({
  code: "add-client-details",
  path: "add-client-details",
  title: "Client's details",
  reachability: { entryWhen: true },
  view: { template: "main/add-client-details.njk" },
  blocks: [clientDetailsBlock],
  onSubmission: [
    submit({
      when: Post("action").match(Condition.Equals("start-eligibility")),
      validate: true,
      onValid: {
        effects: [InboundCallEffects.saveClientDetails()],
        next: [
          redirect({
            goto: Format(
              "/cases/%1/cfe-eligibility/change",
              Data("case.reference"),
            ),
          }),
        ],
      },
    }),
    submit({
      validate: true,
      onValid: {
        effects: [InboundCallEffects.saveClientDetails()],
        next: [redirect({ goto: ADDRESS_LOOKUP_STEP_CODE })],
      },
    }),
  ],
});
