import type { FormattedText } from '@locale/LocaleText';
import type { ButtonText, FieldText, ToggleText } from '@locale/UITexts';

type PageText = {
    /** [plain] Header for the login page when not logged in */
    header: string;
    /** [plain] Subtitle for the header link on the landing page */
    subtitle: string;
    prompt: {
        /** [formatted] Prompts creator to login to save their work */
        login: FormattedText;
        /** [formatted] Prompt to join on the login page */
        join: FormattedText;
        /** [formatted] Forgot password regrets */
        forgot: FormattedText;
        /** [formatted] Email login explanation */
        email: FormattedText;
        /** [plain] Prompt to check email for a login link. */
        sent: string;
        /** [plain] Tells the creator that they can change their email address. */
        changeEmail: string;
        /** [plain] Tells the creator that they can cahnge their password */
        changePassword: string;
        /** [plain] Asks the creator to enter their email if they opened the email link in a different browser. */
        enter: string;
        /** [plain] Encouragement to go create after logging in. */
        play: string;
        /** [plain] Description of password rules */
        passwordrule: string;
        /** [plain] Reminder to write down password */
        passwordreminder: string;
        /** [plain] Too young feedback */
        tooyoung: string;
        /** [formatted] Offers to log out the creator. */
        logout: FormattedText;
        /** [plain] Shown briefly before page redirects to projects */
        success: string;
        /** [plain] Prompts creator to check their original email to confirm the email change */
        confirm: string;
        /** [plain] Offers to delete account */
        delete: string;
        /** [plain] Offers to really delete account forever */
        reallyDelete: string;
        /** [name] Pick an emoji as a name */
        name: string;
    };
    /** [plain] Shown in the footer a creator is not logged in. */
    anonymous: string;
    field: {
        /** The login email */
        email: FieldText;
        /** The login username */
        username: FieldText;
        /** The login password */
        password: FieldText;
        /** The old password */
        currentPassword: FieldText;
        /** The new password */
        newPassword: FieldText;
    };
    feedback: {
        /** [plain] Change email pending */
        changing: string;
        /** [plain] Account deleting pending */
        deleting: string;
        /** [plain] Password successfully updated */
        updatedPassword: string;
        /** [formatted] Email or username must match to delete account */
        match: FormattedText;
    };
    error: {
        /** [plain] Shown when the login link expired */
        expired: string;
        /** [plain] Shown when the login link isn't valid */
        invalid: string;
        /** [plain] Shown when the email address isn't valid */
        email: string;
        /** [plain] Invalid username */
        invalidUsername: string;
        /** [plain] Username taken */
        usernameTaken: string;
        /** [plain] Unknown failure to login */
        failure: string;
        /** [plain] When there's no connection to Firebase */
        offline: string;
        /** [plain] When the email address couldn't be changed for unknown reasons. */
        unchanged: string;
        /** [plain] When account deletion failed */
        delete: string;
        /** [plain] When a password is wrong */
        wrongPassword: string;
        /** [plain] When the password is invalid */
        invalidPassword: string;
        /** [plain] When the passwords don't match */
        mismatched: string;
        /** [plain] When there are too mant failed attempts */
        tooMany: string;
    };
    button: {
        /** Log out of the account */
        logout: ButtonText;
        /** [plain] Login button description */
        login: string;
        /** [plain] Update email button description  */
        updateEmail: string;
        /** Delete account button */
        delete: ButtonText;
        /** Confirm deletion */
        reallyDelete: ButtonText;
        /** [plain] Update password */
        updatePassword: string;
    };
    toggle: {
        /** Reveal password toggle */
        reveal: ToggleText;
    };
};

export type { PageText as default };
