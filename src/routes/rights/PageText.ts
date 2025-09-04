import type { Template } from '@locale/LocaleText';

type PageText = {
    /** Header for the rights page */
    header: string;
    /** Paragraphs for the rights page */
    content: Template[];
    /** The consequences of violating a promise. */
    consequences: Template[];
};

export type { PageText as default };
