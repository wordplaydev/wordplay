import type { ButtonText, FieldText, ToggleText } from '@locale/UITexts';

type PageText = {
    /** Header for the login page when not logged in */
    header: string;
    /** Subtitle for the header link on the landing page */
    subtitle: string;
    prompt: {
        /** Prompts creator to login to save their work */
        login: string;
        /** Prompt to join on the login page */
        join: string;
        /** Forgot password regrets */
        forgot: string;
        /** Email login explanation */
        email: string;
        /** Prompt to check email for a login link. */
        sent: string;
        /** Tells the creator that they can change their email address. */
        changeEmail: string;
        /** Tells the creator that they can cahnge their password */
        changePassword: string;
        /** Asks the creator to enter their email if they opened the email link in a different browser. */
        enter: string;
        /** Encouragement to go create after logging in. */
        play: string;
        /** Description of password rules */
        passwordrule: string;
        /** Reminder to write down password */
        passwordreminder: string;
        /** Too young feedback */
        tooyoung: string;
        /** Offers to log out the creator. */
        logout: string;
        /** Shown briefly before page redirects to projects */
        success: string;
        /** Prompts creator to check their original email to confirm the email change */
        confirm: string;
        /** Offers to delete account */
        delete: string;
        /** Offers to really delete account forever */
        reallyDelete: string;
        /** Pick an emoji as a name */
        name: string;
    };
    /** Shown in the footer a creator is not logged in. */
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
        /** Change email pending */
        changing: string;
        /** Account deleting pending */
        deleting: string;
        /** Password successfully updated */
        updatedPassword: string;
        /** Email or username must match to delete account */
        match: string;
    };
    error: {
        /** Shown when the login link expired */
        expired: string;
        /** Shown when the login link isn't valid */
        invalid: string;
        /** Shown when the email address isn't valid */
        email: string;
        /** Invalid username */
        invalidUsername: string;
        /** Unknown failure to login */
        failure: string;
        /** When there's no connection to Firebase */
        offline: string;
        /** When the email address couldn't be changed for unknown reasons. */
        unchanged: string;
        /** When account deletion failed */
        delete: string;
        /** When a password is wrong */
        wrongPassword: string;
        /** When the password is invalid */
        invalidPassword: string;
        /** When the passwords don't match */
        mismatched: string;
        /** When there are too mant failed attempts */
        tooMany: string;
    };
    button: {
        /** Log out of the account */
        logout: ButtonText;
        /** Login button description */
        login: string;
        /** Update email button description  */
        updateEmail: string;
        /** Delete account button */
        delete: ButtonText;
        /** Confirm deletion */
        reallyDelete: ButtonText;
        /** Update password */
        updatePassword: string;
    };
    toggle: {
        /** Reveal password toggle */
        reveal: ToggleText;
    };
};

export type { PageText as default };
