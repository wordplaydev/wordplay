import type { ButtonText } from '@locale/UITexts';

type PageText = {
    /** Page title */
    header: string;
    /** Description for the moderation page */
    description: string;
    labels: {
        /** Labels the message for display */
        message: string;
        /** Labels the username of the user who reported the message */
        reporter: string;
        /** Labels for the buttons that allow taking moderation action */
        action: string;
    };
    /** Button for vieweing the chat the message originated from */
    view: ButtonText;
    /** Button for deleting the message as a result of moderation action */
    remove: ButtonText;
    /** Button for keeping the message as a result of moderation action (i.e., no action) */
    keep: ButtonText;
    /** No messages need moderation */
    empty: string;
    /** No access to the moderation page (not logged in) */
    error: string;
};

export type { PageText as default };
