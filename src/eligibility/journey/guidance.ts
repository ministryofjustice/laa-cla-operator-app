import eligibilityCopy from "../locales/en.json" with { type: "json" };
import { Format } from "@ministryofjustice/hmpps-forge/core/authoring";
import type { ResolvableString } from "@ministryofjustice/hmpps-forge/core/components";

// Links into the Lord Chancellor's guidance, as CCQ's `ExternalLinkService`
// has them. The guide, and the page a topic is on, depend on the level of help.
const CONTROLLED_PAGES = {
  disregardedPayments: 15,
  income: 13,
  disregardedCapital: 26,
  exercisingDiscretion: 32,
};
const CERTIFICATED_PAGES = {
  disregardedPayments: 34,
  income: 23,
  disregardedCapital: 73,
  exercisingDiscretion: 78,
};

// Topics only the certificated guide covers, linked whatever the level of help.
export const CERTIFICATED_ONLY_PAGES = { trusts: 65, businessCapital: 86 };

export const LC_GUIDANCE = {
  controlled: {
    url: "https://assets.publishing.service.gov.uk/media/673602d2b613efc3f182312e/Lord_Chancellor_s_guide_to_determining_financial_eligibility_for_controlled_work_and_family_mediation_November_2024.pdf",
    size: "940KB",
    pages: CONTROLLED_PAGES,
  },
  certificated: {
    url: "https://assets.publishing.service.gov.uk/media/673601dc37aabe56c416117e/Lord_Chancellor_s_guide_to_determining_financial_eligibility_for_Certificated_work_November_2024.pdf",
    size: "1.51MB",
    pages: CERTIFICATED_PAGES,
  },
} as const;

type LevelOfHelp = keyof typeof LC_GUIDANCE;
type GuidanceTopic = keyof (typeof LC_GUIDANCE)["controlled"]["pages"];

/**
 * An anchor to a page of the guidance, opening in a new tab.
 * @param {LevelOfHelp} levelOfHelp - whose guidance to link to
 * @param {GuidanceTopic} topic - the topic whose page to open
 * @param {string} text - the link text, without the file size
 * @returns {ResolvableString} the anchor's HTML
 */
export function guidanceLink(
  levelOfHelp: LevelOfHelp,
  topic: GuidanceTopic,
  text: string,
): ResolvableString {
  const { url, size, pages } = LC_GUIDANCE[levelOfHelp];
  return Format(
    eligibilityCopy.dynamic.guidanceLinkHtml,
    url,
    String(pages[topic]),
    text,
    size,
  );
}

/**
 * An anchor to a page of the certificated guidance, which is the only guide
 * covering the topic.
 * @param {keyof typeof CERTIFICATED_ONLY_PAGES} topic - the topic whose page to open
 * @param {string} text - the link text, without the file size
 * @returns {ResolvableString} the anchor's HTML
 */
export function certificatedGuidanceLink(
  topic: keyof typeof CERTIFICATED_ONLY_PAGES,
  text: string,
): ResolvableString {
  const { url, size } = LC_GUIDANCE.certificated;
  return Format(
    eligibilityCopy.dynamic.guidanceLinkHtml,
    url,
    String(CERTIFICATED_ONLY_PAGES[topic]),
    text,
    size,
  );
}
