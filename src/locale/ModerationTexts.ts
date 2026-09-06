import type { FlagDescriptions } from '@db/projects/Moderation';
import type { FormattedText, Template } from '@locale/LocaleText';
import type {
    ButtonText,
    ConfirmText,
    HeaderAndExplanationText,
    ModeText,
} from '@locale/UITexts';

export type ModerationTexts = {
    /** What to say to warn viewers before showing content with warnings. */
    warning: HeaderAndExplanationText;
    /** What to say when content is blocked */
    blocked: HeaderAndExplanationText;
    /** What to sa when content has not yet been moderated */
    unmoderated: HeaderAndExplanationText;
    /** Moderation view text */
    moderate: HeaderAndExplanationText;
    /** Which queue the moderator is working through: projects, galleries, or
     *  reported messages. Appended to, never inserted into: locales-fix pads a
     *  positional array by appending, so a label added in the middle would
     *  shift every locale's existing labels onto the wrong tabs. */
    queue: ModeText<[string, string, string]>;
    /** [formatted] Content moderation rules that creators promise to follow. See en-US.json for ground truth language. */
    flags: FlagDescriptions;
    /** [formatted] Progress message */
    progress: Template<['moderated', 'remaining']>;
    /** [formatted] Done message */
    done: FormattedText;
    /** Buttons on the moderation page */
    button: {
        /** Submit moderation decisions button */
        submit: ButtonText;
        /** Skip moderation button */
        skip: ButtonText;
        /** [plain] Checkbox for moderation property */
        property: string;
    };
    /** Reporting public content for a moderator to look at (#193) */
    report: {
        /** [plain] The tooltip on the report button shown on someone else's public project */
        button: string;
        /** [plain] What pressing report will do, shown before it happens */
        confirm: string;
        /** [plain] Shown in place of the tip once a report has been sent */
        sent: string;
        /** [plain] Said to screen readers when a report is sent */
        announce: Template<['project']>;
        /** [formatted] Shown to a moderator above a project someone reported, explaining why it came up first */
        flagged: FormattedText;
    };
    /** Warnings, and the loss of public sharing they can lead to (#193) */
    strike: {
        /** [plain] The moderator's checkbox for attaching a warning to a decision */
        issue: string;
        /** [formatted] What issuing this warning will do to this creator, shown to the moderator before they confirm. `banning` says this warning is the one that takes publishing away — a count can't express that, since English has no zero plural form. */
        consequence: Template<['#count', '#remaining', 'banning']>;
        /** The moderator's confirmation for a decision that carries a warning */
        confirm: ConfirmText;
        /** [formatted] Shown to a creator who has lost the ability to make anything public */
        banned: FormattedText;
        /** [formatted] Shown to a creator who has been warned but can still share publicly */
        warned: Template<['#count', '#remaining']>;
        /** [plain] The notification saying a warning has arrived */
        notification: Template<['#count']>;
    };
    /**
     * Who reviews a piece of content, said wherever a creator can see it
     * (#938). One sentence per level of the responsibility ladder, all derived
     * from the same rule the server enforces — a surface that said something
     * else would be promising a reviewer nobody assigned.
     */
    responsibility: {
        /** [formatted] Nothing here is shared widely enough for anyone to review it. */
        none: FormattedText;
        /** [formatted] A gallery's curators review it. */
        curators: FormattedText;
        /** [formatted] Its gallery's curators and Wordplay's moderators both do. */
        both: FormattedText;
        /** [formatted] Wordplay's moderators review it, because anyone can see it. */
        platform: FormattedText;
    };
    /** Curated public gallery listing (#1311). A gallery being public is its
     *  curator's request; a moderator's approval is what lists it. */
    gallery: {
        /** [formatted] Shown to a curator whose gallery is waiting for a decision */
        pending: FormattedText;
        /** [formatted] Shown to a curator whose gallery is listed publicly */
        approved: FormattedText;
        /** [formatted] Shown to a curator whose gallery was not accepted for the public list */
        denied: FormattedText;
        /** [formatted] Shown to a moderator above a gallery awaiting a decision */
        explain: FormattedText;
        /** [formatted] Shown to a moderator when no gallery is waiting for a decision */
        done: FormattedText;
        /** The moderator's button that lists a gallery publicly */
        approve: ButtonText;
        /** The moderator's button that refuses to list a gallery */
        deny: ButtonText;
        /** The moderator's button that leaves a gallery for someone else to decide */
        skip: ButtonText;
        /** The notification headers a curator gets when a decision is made. The
         *  gallery's name rides along so a decision about a second gallery isn't
         *  read as a repeat of the first. */
        notification: {
            /** [formatted] A gallery is now listed publicly */
            approved: Template<['name']>;
            /** [formatted] A gallery was not accepted for the public list */
            denied: Template<['name']>;
        };
    };
    /** Moderation errors */
    error: {
        /** [plain] Not a moderator */
        notmod: string;
    };
};
