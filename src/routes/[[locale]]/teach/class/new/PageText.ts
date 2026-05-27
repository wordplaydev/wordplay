import type { FormattedText } from '@locale/LocaleText';
import type { ButtonText, FieldText } from '@locale/UITexts';

/** The localization strings for the page. */
type PageText = {
    /** [plain] The header for the create class page */
    header: string;
    subheader: {
        /** [plain] The subheader for the create class page */
        class: string;
        /** [plain] The subheader for the create class page */
        students: string;
        /** [plain] The subheader for the preview */
        credentials: string;
        /** The subheader for submitting*/
        submit: string;
    };
    prompt: {
        /** [formatted] Explain the purpose of the form */
        start: FormattedText;
        /** Prompt review of the genrated students.*/
        review: FormattedText;
        /** [formatted] What to say before there are any generated credentials. */
        ready: FormattedText;
        /** [plain] When generating usernames and passwords */
        pending: string;
        /** [formatted] Ready to submit instructions */
        submit: FormattedText;
        /** [plain] Submitting instructions */
        submitting: string;
        /** [formatted] Download instructions */
        download: FormattedText;
    };
    field: {
        /** [name] The class name */
        name: FieldText;
        /** The class description */
        description: FieldText;
        existing: {
            /** [formatted] Explanation of existing users. */
            prompt: FormattedText;
            /** [plain] Label for existing users. */
            label: string;
        };
        /** The student data field */
        metadata: FieldText & { prompt: FormattedText };
        /** The password words field */
        words: FieldText & { prompt: FormattedText };
        /** The generate credentials button */
        generate: ButtonText;
        /** The submit button */
        submit: ButtonText;
        /** The edit button */
        edit: ButtonText;
    };
    error: {
        /** [plain] Inconsistent columns */
        columns: string;
        /** [plain] Duplicate columns */
        duplicates: string;
        /** [plain] A problem generating usernames */
        generate: string;
        /** [plain] A user name is taken */
        taken: string;
        /** [plain] Too many users */
        limit: string;
        /** [plain] Not enough words */
        words: string;
        /** [plain] Couldn't create one or more accounts */
        account: string;
        /** [plain] Generic error for developers to inspect */
        generic: string;
    };
};

export type { PageText as default };
