import type { FormattedText, Template } from '@locale/LocaleText';
import type { ButtonText, FieldText } from '@locale/UITexts';

type PageText = {
    /** [plain] The account creation header */
    header: string;
    /** Requests for information on the account creation page */
    prompt: {
        /** [formatted] Prompt to create an account */
        create: FormattedText;
        /** [formatted] Username rules */
        username: FormattedText;
        /** [formatted] Password rules and warnings */
        password: FormattedText;
        /** [formatted] Why we ask where someone lives, and that we don't keep the answer */
        region: FormattedText;
        /** [formatted] Why we ask for a birthday, and that we keep only whether they're old enough */
        birthday: FormattedText;
        /** [formatted] Offers the choice between a password and an emailed sign-in link */
        choose: FormattedText;
        /** [formatted] Explains what a password account means: no email, and no way to recover it */
        withPassword: FormattedText;
        /** [formatted] Explains what an email account means: no password to forget, and we keep the address */
        withEmail: FormattedText;
        /** [formatted] Explains that an email account isn't available at this age where they live. $#age is the age of consent there. */
        tooYoung: Template<['#age']>;
        /** [plain] Confirms a sign-in link was sent, without saying whether the address already had an account */
        sent: string;
    };
    field: {
        /** The country someone lives in */
        region: FieldText;
        /** The year someone was born */
        year: FieldText;
        /** The month someone was born */
        month: FieldText;
        /** The day someone was born */
        day: FieldText;
        /** The email address to sign in with */
        email: FieldText;
    };
    button: {
        /** Continue to the next step of joining */
        next: ButtonText;
        /** Go back to the previous step of joining */
        back: ButtonText;
        /** Choose to sign in with a password */
        usePassword: ButtonText;
        /** Choose to sign in with an emailed link */
        useEmail: ButtonText;
    };
    error: {
        /** [plain] The birthday given isn't a real date */
        birthday: string;
        /** [plain] Someone else claimed this username while it was being typed */
        taken: string;
        /** [plain] Too many sign-in links have been requested; wait and try again */
        throttled: string;
        /** [plain] The account couldn't be created */
        failed: string;
    };
};

export type { PageText as default };
