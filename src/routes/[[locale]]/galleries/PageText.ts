import type { FormattedText } from '@locale/LocaleText';
import type { ModeText } from '@locale/UITexts';

type PageText = {
    /** [plain] How to describe galleries of projects */
    header: string;
    /** [formatted] Explanation for the galleries page */
    prompt: FormattedText;
    /** The tabs for the gallery types, and the prompt shown in each */
    section: {
        /** Labels and tooltips for the three gallery tabs */
        tabs: ModeText<[string, string, string]>;
        /** [formatted] Prompt for galleries the creator curates or contributes to */
        own: FormattedText[];
        /** [formatted] Prompt for the built-in galleries */
        examples: FormattedText;
        /** [formatted] Prompt for galleries creators have made public */
        public: FormattedText;
    };
    /** Buttons on the gallery page */
    button: {
        /** [plain] Create a new gallery tip */
        newgallery: string;
    };
    /** Error messages on the galleries page */
    error: {
        /** [plain] When the creator is not logged in. */
        nogalleryedits: string;
        /** [plain] When no galleries have been approved for public listing yet. */
        nopublic: string;
    };
    /** Searching the built-in examples and the public galleries */
    search: {
        /** [plain] Description for the search field */
        description: string;
        /** [plain] No search results message */
        noResults: string;
        /** [plain] Heading above matching galleries */
        galleries: string;
        /** [plain] Heading above matching projects from the built-in example galleries */
        examples: string;
        /** [plain] Heading above matching projects from public galleries */
        projects: string;
    };
};

export type { PageText as default };
