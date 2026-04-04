import type { FormattedText } from '@locale/LocaleText';

type PageText = {
    /** The label for the link and header */
    header: FormattedText;
    /** The explanation of the link */
    prompt: FormattedText;
    /** The content of the page */
    content: FormattedText[];
};

export type { PageText as default };
