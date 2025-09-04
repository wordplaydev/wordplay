import type { ButtonText } from '@locale/UITexts';

type PageText = {
    /** How to describe galleries of projects */
    header: string;
    /** Explanation for the galleries page */
    prompt: string;
    /** The subheader for the examples */
    examples: string;
    /** Buttons on the gallery page */
    button: {
        /** Button for showing more galleries */
        more: ButtonText;
    };
};

export type { PageText as default };
