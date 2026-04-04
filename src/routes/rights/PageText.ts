import type { FormattedText } from '@locale/LocaleText';

type PageText = {
    /** Header for the rights page */
    header: string;
    /** Paragraphs for the rights page */
    content: FormattedText[];
    /** The consequences of violating a promise. */
    consequences: FormattedText[];
};

export type { PageText as default };
