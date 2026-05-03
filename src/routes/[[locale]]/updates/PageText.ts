import type { FormattedText } from '@locale/LocaleText';

type PageText = {
    /** [plain] Header for the about page */
    header: string;
    /** [formatted] Text for the about page */
    content: FormattedText[];
    /** Expand, collapse tooltips for the updates page */
    tips: {
        /** [plain] Expand the section */
        expand: string;
        /** [plain] Collapse the section */
        collapse: string;
    };
    /** Categories for updates */
    categories: {
        /** [plain] New features */
        added: string;
        /** [plain] Changes to existing features */
        changed: string;
        /** [plain] Removed features */
        removed: string;
        /** [plain] Bug fixes */
        fixed: string;
    };
};

export type { PageText as default };
