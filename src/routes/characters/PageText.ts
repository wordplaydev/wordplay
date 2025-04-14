type PageText = {
    /** Header for the character page */
    header: string;
    /** Explanation for the character page */
    prompt: string;
    /** Buttons for the page */
    button: {
        /** Create a new project */
        new: string;
    };
    subheader: {
        /** Header for the shared character list */
        shared: string;
    };
    error: {
        /** When there's no access to the database. */
        offline: string;
        /** When not logged in */
        noauth: string;
        /** Problem creating a character */
        create: string;
    };
};

export type { PageText as default };
