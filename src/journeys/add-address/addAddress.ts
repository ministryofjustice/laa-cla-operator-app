import { hasValidSilasToken } from "#src/middleware/apiMiddleware.js";
import {
  journey,
  step,
  submit,
  redirect,
  access,Session, ConditionRegistry
} from "@ministryofjustice/hmpps-forge/core/authoring";

export const conditionRegistry = new ConditionRegistry()
export const AuthConditions = {
  /**
   * Checks that a numeric value meets the minimum score threshold.
   * @param minScore - The minimum value required for eligibility.
   */
  HasValidSilasToken: conditionRegistry.register(
    'HasValidSilasToken',
    (deps) => hasValidSilasToken
  )
}


//Step 1 - adding address manually

const AddAdressManually = step({
    code: "",
    path: "/",
    title: "", 
    reachability : {

    },
    onAccess: [
        access({
            when: Session("silasAuth").not.match(AuthConditions.HasValidSilasToken()),
            next: [redirect({goto: "/login"})]
        })
    ],
    view: { template: ""}, 
    blocks: [
        
    ]
})



export const AddressJourney = journey({
    code: "addressManuallyJourney",
    title: "address Manually Journey",
    path: "/add-address-manually", 
    view: {
        template: "", 
    }, 
    steps: [AddAdressManually]
})