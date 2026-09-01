import { createForgePackage } from "@ministryofjustice/hmpps-forge/core/authoring";
import { signInJourney } from "./journey.js"

export default createForgePackage(
    {
        journey: signInJourney,
    }); 
