import type { FormattedText } from '@locale/LocaleText';

type PageText = {
    /** The header for the teach page. */
    header: string;
    prompt: {
        /** No classes */
        none: FormattedText;
        /** One or more classes */
        some: FormattedText;
    };
    error: {
        /** When unable to check teacher status or classes */
        offline: FormattedText;
        /** When not logged in */
        login: FormattedText;
        /** When logged in, but not a teacher */
        teacher: FormattedText;
    };
    link: {
        /** The prompt to request teacher privileges */
        request: string;
        /** The prompt to create a new class */
        new: string;
    };
};

export type { PageText as default };
