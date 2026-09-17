import {
  EffectRegistry,
  Answer,
} from "@ministryofjustice/hmpps-forge/core/authoring";

export const effects = new EffectRegistry();

// TODO: replace with a real backend call once the API contract is confirmed
export const saveClientDetails = effects.register(
  "saveClientDetails",
  () =>
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
    },
);

export { Answer };
