import type { FormattedText } from '@locale/LocaleText';

type PageText = {
    /** [plain] The header for the tutorial page */
    header: string;
    /** [formatted] When the tutorial could not be found */
    error: FormattedText;
    button: {
        /** [plain] Advance to the next pause in the dialog */
        next: string;
        /** [plain] Navigate back to the previous pause in the dialog */
        previous: string;
    };
    /** Labels for drop down menus */
    options: {
        /** [plain] The label for the lesson drop down */
        lesson: string;
    };
    /** Tutorial search */
    search: {
        /** [plain] Placeholder text for the search field */
        placeholder: string;
        /** [plain] Shown when a search query has no results */
        noResults: string;
    };
};

export type { PageText as default };
