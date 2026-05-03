import type { FormattedText } from '@locale/LocaleText';

type PageText = {
    /** [plain] Header for the about page */
    header: string;
    /** [formatted] Text for the about page */
    content: FormattedText[];
};

export type { PageText as default };
