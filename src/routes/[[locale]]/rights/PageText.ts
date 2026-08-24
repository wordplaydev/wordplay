import type { FormattedText } from '@locale/LocaleText';

type PageText = {
    /** [plain] Header for the rights page */
    header: string;
    /** [formatted] Paragraphs for the rights page */
    content: FormattedText[];
    /** [formatted] The consequences of violating a promise. */
    consequences: FormattedText[];
    /** [formatted] How warnings work, what three of them mean, and how to ask for public sharing back. */
    warnings: FormattedText[];
    /** [formatted] Paragraphs about the license public projects are shared under, and what remixing them means. */
    license: FormattedText[];
    /** [formatted] Paragraphs about letting Wordplay show a project anonymously in research and communications about the platform. */
    research: FormattedText[];
};

export type { PageText as default };
