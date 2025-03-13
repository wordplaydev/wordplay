type PageText = {
    /** The header for the teach page. */
    header: string;
    prompt: {
        /** No classes */
        none: string;
        /** One or more classes */
        some: string;
    };
    error: {
        /** When unable to check teacher status or classes */
        offline: string;
        /** When not logged in */
        login: string;
        /** When logged in, but not a teacher */
        teacher: string;
    };
    link: {
        /** The prompt to request teacher privileges */
        request: string;
        /** The prompt to create a new class */
        new: string;
    };
};

export type { PageText as default };
