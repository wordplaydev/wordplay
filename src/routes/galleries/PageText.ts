import type { ButtonText, HeaderAndExplanationText } from '@locale/UITexts';

type PageText = {
    /** How to describe galleries of projects */
    header: string;
    /** Explanation for the galleries page */
    prompt: string;
    /** Subheaders and prompts for the gallery types */
    section: {
        /** Subheader for personally owned galleries */
        own: HeaderAndExplanationText;
        /** Subheader for built-in galleries */
        examples: HeaderAndExplanationText;
        /** Subheader for public galleries */
        public: HeaderAndExplanationText;
    };
    /** Buttons on the gallery page */
    button: {
        /** Create a new gallery tip */
        newgallery: string;
        /** Button for showing more galleries */
        more: ButtonText;
    };
    /** Error messages on the galleries page */
    error: {
        /** When the creator is not logged in. */
        nogalleryedits: string;
    };
};

export type { PageText as default };
