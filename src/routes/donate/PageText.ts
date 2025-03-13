import type { Template } from '@locale/LocaleText';

type PageText = {
    /** The label for the link and header */
    header: Template;
    /** The explanation of the link */
    prompt: Template;
    /** The content of the page */
    content: Template[];
};

export type { PageText as default };
