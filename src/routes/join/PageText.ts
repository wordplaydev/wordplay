import type { FormattedText } from '@locale/LocaleText';

type PageText = {
    /** The account creation header */
    header: string;
    /** Requests for information on the account creation page */
    prompt: {
        /** Prompt to create an account */
        create: FormattedText;
        /** Username rules */
        username: FormattedText;
        /** Password rules and warnings */
        password: FormattedText;
    };
};

export type { PageText as default };
