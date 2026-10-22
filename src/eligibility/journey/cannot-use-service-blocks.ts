import eligibilityCopy from "../locales/en.json" with { type: "json" };
import {
  CollectionBlock,
  HtmlBlock,
} from "@ministryofjustice/hmpps-forge/core/components";
import { GovUKButton } from "@ministryofjustice/hmpps-forge/govuk-components";

export const cannotUseServiceBlock = CollectionBlock({
  collection: [
    HtmlBlock({
      tag: "div",
      content:
        eligibilityCopy.div_class_govuk_panel_govuk_panel_confirmation_style_ba_806a7b5f79,
    }),
    GovUKButton({
      text: eligibilityCopy.exit,
    }),
  ],
});
