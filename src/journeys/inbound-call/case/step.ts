import {
  step,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import { clientHomeBlock } from "../case/block.js";

export const clientCaseStep = step( {
    code: "client-case-details",
    path: "/client-homepage",
    title: "Client Homepage",

    reachability: { entryWhen: true },
    view : {template: "main/client-homepage.njk"},
    blocks: [clientHomeBlock]

}); 