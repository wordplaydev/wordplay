import type { ButtonText } from "@locale/UITexts";

type PageText = {
    /** Header for the how-to space page */
    header: string;
    /** Explanation for the how-to space page */
    howtoprompt: string;
    /** Header for the drafts area */
    draftsheader: string;
    /** Explanation for the drafts area */
    draftsprompt: string;
    /** Button text for the how-to addition button */
    add: ButtonText;
    error: {
        /** When the how-to is not known or is not public */
        unknown: string;
    };
}

export type { PageText as default };
