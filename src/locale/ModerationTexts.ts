import type { FlagDescriptions } from '@db/projects/Moderation';
import type { Template } from './LocaleText';
import type { ButtonText, HeaderAndExplanationText } from './UITexts';

export type ModerationTexts = {
    /** What to say to warn viewers before showing content with warnings. */
    warning: HeaderAndExplanationText;
    /** What to say when content is blocked */
    blocked: HeaderAndExplanationText;
    /** What to sa when content has not yet been moderated */
    unmoderated: HeaderAndExplanationText;
    /** Moderation view text */
    moderate: HeaderAndExplanationText;
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
