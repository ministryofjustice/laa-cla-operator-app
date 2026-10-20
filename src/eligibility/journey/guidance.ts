// Links into the Lord Chancellor's guidance, as CCQ's `ExternalLinkService`
// has them. The guide, and the page a topic is on, depend on the level of help.
const CONTROLLED_PAGES = { disregardedPayments: 15, income: 13 };
const CERTIFICATED_PAGES = { disregardedPayments: 34, income: 23 };

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
 * @returns {string} the anchor's HTML
 */
export function guidanceLink(
  levelOfHelp: LevelOfHelp,
  topic: GuidanceTopic,
  text: string,
): string {
  const { url, size, pages } = LC_GUIDANCE[levelOfHelp];
  return `<a class="govuk-link" href="${url}#page=${pages[topic]}" target="_blank" rel="noreferrer noopener">${text} (PDF, ${size})</a>`;
}
