import type { FormattedText } from '@locale/LocaleText';
import type { ModeText } from '@locale/UITexts';

type PageText = {
    /** [plain] The header for the tutorial page */
    header: string;
    /** [formatted] When the tutorial could not be found */
    error: FormattedText;
    /** The dialog shown when a creator hasn't yet chosen which tutorial to take */
    choice: {
        /** [plain] Heading asking which tutorial the creator would like to take */
        prompt: string;
        quick: {
            /** [plain] Title of the quick tutorial choice */
            title: string;
            /** [plain] Description of who the quick tutorial is good for */
            description: string;
        };
        complete: {
            /** [plain] Title of the complete tutorial choice */
            title: string;
            /** [plain] Description of who the complete tutorial is good for */
            description: string;
        };
    };
    /** The control in the header for switching between tutorial modes (quick, complete) */
    mode: ModeText<[string, string]>;
    /** [plain] Label for the chooser that picks which programming language tutorial examples are contrasted against */
    contrast: string;
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
