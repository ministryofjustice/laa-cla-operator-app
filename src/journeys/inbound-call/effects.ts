import {
  EffectRegistry,
  Answer,
} from "@ministryofjustice/hmpps-forge/core/authoring";
import type { Deps } from "../api.js";

export const effects = new EffectRegistry<Deps>();

// TODO: replace with a real backend call once the API contract is confirmed
export const saveClientDetailsImplementation =
  (_deps: Deps) =>
  (
    context: unknown,
    fullName: string,
    dateOfBirth: string,
    phoneNumber: string,
  ) => {
    console.log("Saving client details", {
      fullName,
      dateOfBirth,
      phoneNumber,
    });
  };

export const saveClientDetails = effects.register(
  "saveClientDetails",
  saveClientDetailsImplementation,
);

export { Answer };
