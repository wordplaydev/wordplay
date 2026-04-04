import type { FormattedText } from '@locale/LocaleText';
import type { ButtonText, FieldText } from '@locale/UITexts';

/** The localization strings for the page. */
type PageText = {
    /** The header for the create class page */
    header: string;
    subheader: {
        /** The subheader for the create class page */
        class: string;
        /** The subheader for the create class page */
        students: string;
        /** The subheader for the preview */
        credentials: string;
        /** The subheader for submitting*/
        submit: string;
    };
    prompt: {
        /** Explain the purpose of the form */
        start: FormattedText;
        /** Prompt review of the genrated students.*/
        review: FormattedText;
        /** What to say before there are any generated credentials. */
        ready: FormattedText;
        /** When generating usernames and passwords */
        pending: string;
        /** Ready to submit instructions */
        submit: FormattedText;
        /** Submitting instructions */
        submitting: string;
        /** Download instructions */
        download: FormattedText;
    };
    field: {
        /** The class name */
        name: FieldText;
        /** The class description */
        description: FieldText;
        existing: {
            /** Explanation of existing users. */
            prompt: FormattedText;
            /** Label for existing users. */
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
        /** Inconsistent columns */
        columns: string;
        /** Duplicate columns */
        duplicates: string;
        /** A problem generating usernames */
        generate: string;
        /** A user name is taken */
        taken: string;
        /** Too many users */
        limit: string;
        /** Not enough words */
        words: string;
        /** Couldn't create one or more accounts */
        account: string;
        /** Generic error for developers to inspect */
        generic: string;
    };
};

export type { PageText as default };
