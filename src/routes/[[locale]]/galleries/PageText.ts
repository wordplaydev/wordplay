import type { FormattedText } from '@locale/LocaleText';
import type { ButtonText, ModeText } from '@locale/UITexts';

type PageText = {
    /** [plain] How to describe galleries of projects */
    header: string;
    /** [formatted] Explanation for the galleries page */
    prompt: FormattedText;
    /** The tabs for the gallery types, and the prompt shown in each */
    section: {
        /** Labels and tooltips for the four gallery tabs */
        tabs: ModeText<[string, string, string, string]>;
        /** [formatted] Prompt for galleries the creator curates or contributes to */
        own: FormattedText[];
        /** [formatted] Prompt for the built-in galleries */
        examples: FormattedText;
        /** [formatted] Prompt for how-tos shared by galleries the creator belongs to */
        howtos: FormattedText;
        /** [formatted] Prompt for galleries creators have made public */
        public: FormattedText;
    };
    /** Buttons on the gallery page */
    button: {
        /** [plain] Create a new gallery tip */
        newgallery: string;
        /** Button for showing more galleries */
        more: ButtonText;
    };
    /** Error messages on the galleries page */
    error: {
        /** [plain] When the creator is not logged in. */
        nogalleryedits: string;
    };
    /** Search functionality for example gallery projects */
    search: {
        /** [plain] Description for the search field */
        description: string;
        /** [plain] No search results message */
        noResults: string;
    };
};

export type { PageText as default };
