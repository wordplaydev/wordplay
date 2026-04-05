import type { FormattedText } from '@locale/LocaleText';

type PageText = {
    /** [plain] The account creation header */
    header: string;
    /** Requests for information on the account creation page */
    prompt: {
        /** [formatted] Prompt to create an account */
        create: FormattedText;
        /** [formatted] Username rules */
        username: FormattedText;
        /** [formatted] Password rules and warnings */
        password: FormattedText;
    };
};

export type { PageText as default };
