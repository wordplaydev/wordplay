type PageText = {
    /** The account creation header */
    header: string;
    /** Requests for information on the account creation page */
    prompt: {
        /** Prompt to create an account */
        create: string;
        /** Username rules */
        username: string;
        /** Password rules and warnings */
        password: string;
    };
};

export type { PageText as default };
