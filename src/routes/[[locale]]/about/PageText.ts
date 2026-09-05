import type { FormattedText } from '@locale/LocaleText';

type PageText = {
    /** [plain] Header for the about page */
    header: string;
    /** [formatted] Text for the about page */
    content: FormattedText[];
    /** Text for the section addressed to schools and districts (#697). */
    districts: {
        /** [plain] Header for the school and district section */
        header: string;
        /** [formatted] What we can and can't promise a school or district */
        content: FormattedText[];
        /** [plain] Label for the link that opens a prefilled inquiry email */
        link: string;
        /** [plain] Subject line of the inquiry email the link composes */
        subject: string;
        /** [plain] Prompts in the body of the inquiry email, one per line */
        body: string[];
    };
};

export type { PageText as default };
