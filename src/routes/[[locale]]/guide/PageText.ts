import type { FormattedText } from '@locale/LocaleText';

type GuideText = {
    /** [plain] The header for the guide page */
    header: string;
    /** [formatted] A description of the guide */
    description: FormattedText;
};

export type { GuideText as default };
