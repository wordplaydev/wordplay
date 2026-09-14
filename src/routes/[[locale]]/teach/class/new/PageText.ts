import type { FormattedText } from '@locale/LocaleText';
import type { ButtonText, FieldText, ModeText } from '@locale/UITexts';

/** The localization strings for the page. */
type PageText = {
    /** [plain] The header for the create class page */
    header: string;
    subheader: {
        /** [plain] The subheader for the create class page */
        class: string;
        /** [plain] The subheader for the create class page */
        students: string;
        /** [plain] The subheader for the preview, in a class with passwords */
        credentials: string;
        /** [plain] The subheader for the preview, in a class that signs in by email */
        usernames: string;
        /** [plain] The subheader for submitting*/
        submit: string;
    };
    prompt: {
        /** [formatted] Explain the purpose of the form */
        start: FormattedText;
        /** [formatted] Prompt review of the genrated students.*/
        review: FormattedText;
        /** [formatted] Prompt review of the generated students, who have no passwords */
        reviewEmail: FormattedText;
        /** [formatted] What to say before there are any generated credentials. */
        ready: FormattedText;
        /** [plain] When generating usernames and passwords */
        pending: string;
        /** [formatted] Ready to submit instructions */
        submit: FormattedText;
        /** [formatted] Ready to submit instructions for a class that signs in by email */
        submitEmail: FormattedText;
        /** [plain] Submitting instructions */
        submitting: string;
        /** [formatted] Download instructions */
        download: FormattedText;
        /** [formatted] Download instructions for a class that signs in by email */
        downloadEmail: FormattedText;
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
        /** How the class's students will sign in, which the rest of the form follows from */
        signin: {
            /** [formatted] Explain that a class is one kind of student throughout */
            prompt: FormattedText;
            /** The two ways a class can sign in */
            mode: ModeText<[string, string]>;
        };
        /** [formatted] The student data field, in a class with passwords */
        metadata: FieldText & { prompt: FormattedText };
        /** [formatted] The student data field, in a class that signs in by email */
        addresses: FieldText & { prompt: FormattedText };
        /** [formatted] The password words field */
        words: FieldText & { prompt: FormattedText };
        /** What the teacher affirms before student email addresses are used */
        affirm: {
            /** [formatted] Explain what an email column means and what the teacher is affirming */
            prompt: FormattedText;
            /** [plain] Label for the checkbox affirming permission to use the addresses */
            label: string;
        };
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
        /** [plain] A line doesn't start with an email address */
        addresses: string;
        /** [plain] The teacher has to affirm they may use the email addresses */
        affirmation: string;
        /** [plain] This class may already have been created by an earlier attempt */
        inflight: string;
        /** [plain] Couldn't create one or more accounts */
        account: string;
        /** [plain] Generic error for developers to inspect */
        generic: string;
    };
};

export type { PageText as default };
