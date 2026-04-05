import type { FormattedText } from '@locale/LocaleText';

type PageText = {
    /** [plain] The header for the teach page. */
    header: string;
    prompt: {
        /** [formatted] No classes */
        none: FormattedText;
        /** [formatted] One or more classes */
        some: FormattedText;
    };
    error: {
        /** [formatted] When unable to check teacher status or classes */
        offline: FormattedText;
        /** [formatted] When not logged in */
        login: FormattedText;
        /** [formatted] When logged in, but not a teacher */
        teacher: FormattedText;
    };
    link: {
        /** [plain] The prompt to request teacher privileges */
        request: string;
        /** [plain] The prompt to create a new class */
        new: string;
    };
};

export type { PageText as default };
