type PageText = {
    /** The header for the tutorial page */
    header: string;
    /** When the tutorial could not be found */
    error: string;
    button: {
        /** Advance to the next pause in the dialog */
        next: string;
        /** Navigate back to the previous pause in the dialog */
        previous: string;
    };
    /** Labels for drop down menus */
    options: {
        /** The label for the lesson drop down */
        lesson: string;
    };
};

export type { PageText as default };
