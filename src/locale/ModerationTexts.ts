import type { FlagDescriptions } from '@db/projects/Moderation';
import type { Template } from './LocaleText';
import type { ButtonText, DialogText } from './UITexts';

export type ModerationTexts = {
    /** What to say to warn viewers before showing content with warnings. */
    warning: DialogText;
    /** What to say when content is blocked */
    blocked: DialogText;
    /** What to sa when content has not yet been moderated */
    unmoderated: DialogText;
    /** Moderation view text */
    moderate: DialogText;
    /** Content moderation rules that creators promise to follow. See en-US.json for ground truth language. */
    flags: FlagDescriptions;
    /** Progress message */
    progress: Template;
    /** Done message */
    done: Template;
    /** Buttons on the moderation page */
    button: {
        /** Submit moderation decisions button */
        submit: ButtonText;
        /** Skip moderation button */
        skip: ButtonText;
        /** Checkbox for moderation property */
        property: string;
    };
    /** Moderation errors */
    error: {
        /** Not a moderator */
        notmod: string;
    };
};
