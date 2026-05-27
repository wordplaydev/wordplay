import type { FormattedText } from '@locale/LocaleText';
import type { ButtonText } from '@locale/UITexts';

type PageText = {
    /** [plain] Page title */
    header: string;
    /** [formatted] Description for the moderation page */
    description: FormattedText;
    labels: {
        /** [plain] Labels the message for display */
        message: string;
        /** [plain] Labels the username of the user who reported the message */
        reporter: string;
        /** [plain] Labels for the buttons that allow taking moderation action */
        action: string;
    };
    /** Button for vieweing the chat the message originated from */
    view: ButtonText;
    /** Button for deleting the message as a result of moderation action */
    remove: ButtonText;
    /** Button for keeping the message as a result of moderation action (i.e., no action) */
    keep: ButtonText;
    /** [plain] No messages need moderation */
    empty: string;
    /** [plain] No access to the moderation page (not logged in) */
    error: string;
};

export type { PageText as default };
