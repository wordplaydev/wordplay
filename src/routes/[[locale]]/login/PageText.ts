import type { FormattedText, Template } from '@locale/LocaleText';
import type {
    ButtonText,
    FieldText,
    ModeText,
    ToggleText,
} from '@locale/UITexts';

type PageText = {
    /** [plain] Header for the login page when not logged in */
    header: string;
    /** [plain] The browser tab's title for the profile page. Its heading on the page is the creator's own name, which is theirs rather than ours to translate — so the tab needs a word of its own. */
    profile: string;
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
        /** [formatted] Offers to finish login by pasting the emailed link, for when it opened somewhere else, such as a browser instead of the installed app. */
        paste: FormattedText;
        /** [plain] Encouragement to go create after logging in. */
        play: string;
        /** [plain] Description of password rules */
        passwordrule: string;
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
        /** [plain] Prompt inviting the creator to pick an emoji or character as their name */
        name: string;
    };
    /** [plain] Shown in the footer a creator is not logged in. */
    anonymous: string;
    field: {
        /** The login email */
        email: FieldText;
        /** The emailed login link, pasted in by hand */
        link: FieldText;
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
    /** Choosing or changing the name other people see (#628) */
    username: {
        /** [formatted] Explains what a username is for, and offers to change it */
        change: FormattedText;
        /** [formatted] Shown when this account has no username at all: what that costs, and an invitation to pick one */
        missing: FormattedText;
        /** [plain] Confirms the new username took effect */
        changed: string;
        /** [plain] Confirms a first username was recorded */
        claimed: string;
        /** The username someone wants */
        field: FieldText;
        /** Save the chosen username */
        save: ButtonText;
    };
    /** How someone signs in, and moving between the two ways (#628) */
    signin: {
        /** [formatted] Explains that this account signs in with a username and password, and offers an email address instead. Shown only when this creator is old enough to hold one — see notYet for the other case. */
        usesPassword: FormattedText;
        /** [formatted] Explains that this account signs in with an emailed link, and offers a password instead */
        usesEmail: FormattedText;
        /** [formatted] Stands in for usesPassword when this creator isn't old enough for an email address yet. Says the whole thing on its own, rather than following an offer that doesn't apply to them. $date is the day they become eligible, written in this locale's own way. */
        notYet: Template<['date']>;
        /** [plain] Confirms the account now signs in with a username and password */
        switched: string;
        /** Switch to signing in with a username and password */
        toPassword: ButtonText;
    };
    /**
     * One header and explanation per block of the profile page.
     *
     * The page is a row of cards, and a card with no heading is a card whose
     * job you work out by reading it. Headers only: each block already carries
     * its own prose, so an explanation here would say the same thing twice —
     * once on screen, and once again in every translation.
     */
    subheader: {
        /** [plain] Names the block holding links to a creator's projects, characters, and classes */
        work: string;
        /** [plain] Names the block for choosing the character shown beside your name */
        character: string;
        /** [plain] Names the block for choosing your username */
        username: string;
        /** [plain] Names the block for changing your password */
        password: string;
        /** [plain] Names the block holding your email address and what Wordplay sends to it */
        email: string;
        /** [plain] Names the block for signing out of this device */
        logout: string;
        /** [plain] Names the block for downloading a copy of everything you have made */
        export: string;
        /** [plain] Names the block for deleting your account */
        delete: string;
    };
    /** Which emails Wordplay sends this creator */
    notifications: {
        /** [plain] Heads the email notification choices inside the email block, and begins the sentence each choice below finishes */
        header: string;
        /** [formatted] Shown instead of the choices when this account has no email address to write to, pointing at the way to add one just above */
        noAddress: FormattedText;
        /** [formatted] Shown instead of noAddress when this creator isn't old enough for an email address yet, so they are not told to add one they cannot have. Names no date: the sign-in explanation just above already does, and saying it twice in one block reads as a mistake. */
        notYet: FormattedText;
        /** On or off for decisions about this creator's own work */
        decisions: ModeText<[string, string]>;
        /** On or off for work waiting for this creator to review */
        reviews: ModeText<[string, string]>;
        /** On or off for messages and newly published how-tos */
        activity: ModeText<[string, string]>;
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
        /** [plain] When we couldn't confirm this is a real browser, which
         *  happens on some school and work networks, and which trying again
         *  won't fix */
        unverified: string;
        /** [plain] When there's no connection to Firebase */
        offline: string;
        /** [plain] When account deletion removed the account's data but couldn't
         *  finish removing the account itself (partial deletion) */
        deletePartial: string;
        /** [plain] When a password is wrong */
        wrongPassword: string;
        /** [plain] When the password is invalid */
        invalidPassword: string;
        /** [plain] When the passwords don't match */
        mismatched: string;
        /** [plain] When there are too mant failed attempts */
        tooMany: string;
        /** [plain] Warning shown before logging out when there are edits not
         *  yet saved online (e.g. made offline); logging out discards them
         *  from this device. */
        unsaved: string;
    };
    /**
     * Downloading a copy of everything a creator has made (#152).
     *
     * The archive itself is a document rather than interface text: its README is
     * written in the creator's primary language, one paragraph per string here,
     * so that a file they may open years from now still explains itself.
     */
    export: {
        /** [formatted] Explains what the archive holds, including that conversations and class lists contain other people's words and names */
        prompt: FormattedText;
        /** [formatted] Explains why a copy can't be made while looking at someone else's account in a read-only session */
        proxy: FormattedText;
        /** Start making the archive and download it */
        button: ButtonText;
        /** [plain] How far along the archive is, naming what was just collected and how much there is so far */
        progress: Template<['kind', '#count']>;
        /** [plain] Announced when the archive starts being made */
        started: string;
        /** [plain] Announced when the archive is ready, naming the file and how many things are in it */
        finished: Template<['name', '#count']>;
        /** [plain] Announced when the archive is ready but some of it couldn't be read */
        finishedPartial: Template<['name', '#count', '#missing']>;
        /** [plain] Shown when the archive couldn't be made at all */
        failed: string;
        /** [formatted] Shown beside the button when the archive was made but some kinds of thing could not be read */
        incomplete: Template<['kinds']>;
        /** [plain] Shown when there is too much to fit in one archive */
        tooLarge: string;
        /** [plain] Shown when there's no connection to make an archive with */
        offline: string;
        /** What each kind of thing is called, in the progress message and in the archive's own explanation of what's missing */
        kind: {
            /** [plain] The creator's account itself: their name, when they joined, and what they may do */
            account: string;
            /** [plain] The creator's projects */
            projects: string;
            /** [plain] The creator's galleries */
            galleries: string;
            /** [plain] The creator's characters */
            characters: string;
            /** [plain] The creator's how-tos */
            howtos: string;
            /** [plain] The creator's conversations */
            chats: string;
            /** [plain] The creator's kits */
            kits: string;
            /** [plain] The creator's classes */
            classes: string;
            /** [plain] The ideas and bugs the creator has sent */
            feedback: string;
            /** [plain] Settings and work that live only on this device */
            device: string;
            /** [plain] Putting the archive together */
            archive: string;
            /** [plain] Handing the archive over to be saved */
            saving: string;
        };
        /** The paragraphs of the explanation written into the archive itself */
        readme: {
            /** [plain] First line of the archive's explanation */
            title: string;
            /** [plain] What this archive is and when it was made */
            intro: Template<['name', 'date']>;
            /** [plain] What each folder in the archive holds */
            contents: string;
            /** [plain] What the .json and .wp files in each folder are */
            contentsFiles: string;
            /** [plain] What account.json and the self folder hold */
            contentsAccount: string;
            /** [plain] What each relationship folder is named and what it holds */
            relationships: string;
            /** [plain] That one relationship word can mean two things, and what index.json is for */
            relationshipsWords: string;
            /** [plain] That the device folder holds things that exist only on the computer the archive was made on */
            device: string;
            /** [plain] How to open a .wp file back up in Wordplay */
            formats: string;
            /** [plain] What was deliberately left out of the archive, and why */
            excluded: string;
            /** [plain] That conversations and class lists hold other people's words and names, and that nothing in the archive is locked */
            privacy: string;
            /** [plain] Introduces the list of things that couldn't be read */
            missing: string;
            /** [plain] Points at the manifest file for the details a program would want */
            manifest: string;
        };
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
