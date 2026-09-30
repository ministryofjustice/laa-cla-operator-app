import { CollectionBlock } from "@ministryofjustice/hmpps-forge/core/components";
import { GovUKButton, GovUKCheckboxInput, GovUKTextareaInput,GovUKHeading, GovUKBody, GovUKInsetText,GovUKUtilityClasses } from "@ministryofjustice/hmpps-forge/govuk-components";


export const clientSupportNeeds = CollectionBlock({
  collection: [
  
    GovUKBody(
        { text: 'A client may need translation services, a Welsh language speaker or extra support due to a disability or condition which makes communication difficult. ', size: 's' }
    ),

    GovUKInsetText({
        text: "Is there anything we can do to make it easier to communicate with us?",
        classes: "govuk-tag--blue"
    }),

    GovUKHeading({ 
        text: 'Client’s language requirements (optional)', 
        size: 'm'
    }),
    GovUKCheckboxInput({
      code: "language_choice",
      items: [
        { value: "welsh", text: "Welsh language service needed" },
        { value: "other_language", text: "Other language – interpreter needed" },
      ],
    }),

    GovUKHeading({ 

        text: 'Client’s communication and support needs (optional)', 
        size: 'm',
      
    }),
    GovUKCheckboxInput({
      code: "client-communication-needs",
      items: [
        { value: "bsl", text: "British Sign Language (BSL)" },
        { value: "relay_uk", text: "Relay UK" },
          { value: "other", text: "Any other support or accessibility needs" },
      ],
    }),

      GovUKTextareaInput({
        code: "other", 
        label: "Enter client’s preferences, for example, ‘Client is hard of hearing, please speak distinctly’. ‘Client has an ADHD diagnosis and may need questions to be repeated’.",
        rows: 4
      }),
    
    GovUKButton({ text: "Continue" }),
  ],
});