import { MOJCardGroup } from "@ministryofjustice/hmpps-forge/moj-components";

export const dashboardBlock = MOJCardGroup({
  items: [
    {
      heading: "Inbound calls",
      href: "/receive-call/search-client",
      description:
        "Take calls from clients, search for client case histories, start new cases or work existing cases.",
    },
  ],
});
