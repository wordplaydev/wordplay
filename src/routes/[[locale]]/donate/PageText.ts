import type { FormattedText } from '@locale/LocaleText';

type PageText = {
    /** [formatted] The label for the link and header */
    header: FormattedText;
    /** [formatted] The explanation of the link */
    prompt: FormattedText;
    /** [formatted] The content of the page */
    content: FormattedText[];
};

export type { PageText as default };
