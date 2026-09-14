import type { FormattedText } from '@locale/LocaleText';
import type { ButtonText } from '@locale/UITexts';

/**
 * Everyone who holds a privilege, and how to give or take one away.
 *
 * Two things the copy must not say. Superuser is not one privilege among four —
 * it includes moderating and teaching, so someone who has it needs neither of
 * the others. And "can't share publicly" is not a privilege at all but the loss
 * of one, shown here only because this is where it can be given back.
 */
type PageText = {
    /** [plain] The header for the privileges page, and the label of the link to it */
    header: string;
    /** [formatted] What this page is for, and how soon a change takes effect */
    prompt: FormattedText;
    /** The privileges, one per column heading and per checkbox */
    claim: {
        /** [plain] The superuser privilege, which includes moderating and teaching */
        admin: string;
        /** [plain] The privilege to review content reported across Wordplay */
        mod: string;
        /** [plain] The privilege to create and manage classes */
        teacher: string;
        /** [plain] Whether this creator has lost the ability to share publicly */
        banned: string;
    };
    /** [plain] Column heading for who someone is */
    creator: string;
    /** [plain] Column heading for a creator's email address */
    email: string;
    /** [plain] Column heading for the privileges someone holds */
    privileges: string;
    button: {
        /** [plain] Tooltip for the button that takes away every privilege someone holds, leaving any loss of public sharing alone */
        revoke: string;
        /** The button that gives public sharing back to a creator who lost it */
        lift: ButtonText;
    };
    /** [formatted] Shown before a loss of public sharing is given back: their warning count goes back to zero, and the record of what happened stays */
    confirm: FormattedText;
    /** [plain] Tooltip on a superuser's own superuser checkbox, which they may not untick */
    ownAdmin: string;
    /** [formatted] Shown when nobody holds any privilege at all */
    nobody: FormattedText;
    /** Looking at Wordplay as another creator, to debug what they see (#1313) */
    proxy: {
        /** [plain] Heading for the section that starts a read-only session as someone else */
        header: string;
        /** [formatted] What it does, and what it deliberately cannot do */
        prompt: FormattedText;
        /** The button that opens the session in a new tab */
        start: ButtonText;
    };
    error: {
        /** [formatted] When signed in, but not a superuser */
        notadmin: FormattedText;
        /** [formatted] When not signed in at all */
        login: FormattedText;
        /** [formatted] When the list of privilege holders couldn't be loaded */
        offline: FormattedText;
        /** [formatted] When a change to someone's privileges couldn't be saved */
        save: FormattedText;
        /** [formatted] When someone is added without any privilege chosen */
        none: FormattedText;
    };
};

export type { PageText as default };
