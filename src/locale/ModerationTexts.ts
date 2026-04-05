import type { FlagDescriptions } from '@db/projects/Moderation';
import type { FormattedText } from './LocaleText';
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
    /** [formatted] Progress message */
    progress: FormattedText;
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
    /** Moderation errors */
    error: {
        /** [plain] Not a moderator */
        notmod: string;
    };
};
