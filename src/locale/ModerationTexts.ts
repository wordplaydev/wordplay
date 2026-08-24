import type { FlagDescriptions } from '@db/projects/Moderation';
import type { FormattedText, Template } from '@locale/LocaleText';
import type {
    ButtonText,
    ConfirmText,
    HeaderAndExplanationText,
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
        /** [formatted] What issuing this warning will do to this creator, shown to the moderator before they confirm */
        consequence: Template<['#count', '#remaining']>;
        /** The moderator's confirmation for a decision that carries a warning */
        confirm: ConfirmText;
        /** [formatted] Shown to a creator who has lost the ability to make anything public */
        banned: FormattedText;
        /** [formatted] Shown to a creator who has been warned but can still share publicly */
        warned: Template<['#count', '#remaining']>;
        /** [plain] The notification saying a warning has arrived */
        notification: Template<['#count']>;
    };
    /** Moderation errors */
    error: {
        /** [plain] Not a moderator */
        notmod: string;
    };
};
