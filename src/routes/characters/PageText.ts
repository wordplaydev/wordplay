import type { FormattedText } from '@locale/LocaleText';

type PageText = {
    /** [plain] Header for the character page */
    header: string;
    /** [formatted] Explanation for the character page */
    prompt: FormattedText;
    /** Buttons for the page */
    button: {
        /** [plain] Create a new character */
        new: string;
        /** [plain] Copy a character */
        copy: string;
        /** Delete a character */
        remove: {
            /** [plain] Confirmation message */
            prompt: string;
            /** [plain] Delete character toolitp */
            tip: string;
        };
    };
    subheader: {
        /** [plain] Header for the shared character list */
        shared: string;
    };
    error: {
        /** [plain] When there's no access to the database. */
        offline: string;
        /** [plain] When not logged in */
        noauth: string;
        /** [plain] Problem creating a character */
        create: string;
    };
};

export type { PageText as default };
