import type { FormattedText } from '@locale/LocaleText';

type PageText = {
    /** [plain] Header for the rights page */
    header: string;
    /** [formatted] Paragraphs for the rights page */
    content: FormattedText[];
    /** [formatted] The consequences of violating a promise. */
    consequences: FormattedText[];
    /** [formatted] Paragraphs about the license public projects are shared under, and what remixing them means. */
    license: FormattedText[];
};

export type { PageText as default };
