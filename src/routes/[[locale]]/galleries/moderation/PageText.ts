import type { FormattedText, Template } from '@locale/LocaleText';
import type { ButtonText } from '@locale/UITexts';

/**
 * The queue of reported things, for whoever is responsible for them.
 *
 * Named for galleries because that is what it first reviewed; it now takes chat
 * messages, how-tos, characters, and kits, so nothing below may say "message" or
 * "gallery" — a curator deciding about a drawing should not be told it violates
 * the rules about what someone said.
 */
type PageText = {
    /** [plain] Page title */
    header: string;
    /** [formatted] Description for the moderation page */
    description: FormattedText;
    labels: {
        /** [plain] Labels the reported thing for display */
        subject: string;
        /** [plain] Labels the section where a curator says which rules it broke */
        reason: string;
        /** [plain] Labels for the buttons that allow taking moderation action */
        action: string;
    };
    /** The optional note a curator writes to whoever made the reported thing */
    note: {
        /** [plain] Describes the note field for screen readers */
        description: string;
        /** [plain] Shown in the empty note field */
        placeholder: string;
    };
    /** Button for opening the reported thing where it lives */
    view: ButtonText;
    /** Button for taking the reported thing down as a result of moderation action */
    remove: ButtonText;
    /** Button for keeping the reported thing as a result of moderation action (i.e., no action) */
    keep: ButtonText;
    /** [plain] How many reports are still waiting, including the one being decided */
    remaining: Template<['#count']>;
    /** [plain] Nothing needs moderation */
    empty: string;
    /** [plain] No access to the moderation page (not logged in) */
    error: string;
};

export type { PageText as default };
