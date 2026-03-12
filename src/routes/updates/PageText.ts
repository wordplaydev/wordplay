type PageText = {
    /** Header for the about page */
    header: string;
    /** Text for the about page */
    content: string[];
    /** Expand, collapse tooltips for the updates page */
    tips: {
        /** Expand the section */
        expand: string;
        /** Collapse the section */
        collapse: string;
    };
    /** Categories for updates */
    categories: {
        /** New features */
        added: string;
        /** Changes to existing features */
        changed: string;
        /** Removed features */
        removed: string;
        /** Bug fixes */
        fixed: string;
    };
};

export type { PageText as default };
