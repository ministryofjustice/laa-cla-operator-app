import { createForgePackage } from "@ministryofjustice/hmpps-forge/core/authoring";
import {AddressJourney,conditionRegistry} from "./addAddress.js";

export default createForgePackage({
  journey: AddressJourney,
  functions: conditionRegistry
});
