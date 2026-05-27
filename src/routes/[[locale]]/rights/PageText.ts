import type { FormattedText } from '@locale/LocaleText';

type PageText = {
    /** [plain] Header for the rights page */
    header: string;
    /** [formatted] Paragraphs for the rights page */
    content: FormattedText[];
    /** [formatted] The consequences of violating a promise. */
    consequences: FormattedText[];
};

export type { PageText as default };
