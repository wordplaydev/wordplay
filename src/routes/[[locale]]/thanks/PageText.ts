type ThanksPageText = {
    /** [plain] The page heading */
    header: string;
    /** [formatted] Introductory paragraph (use $count as a placeholder for the contributor count) */
    intro: string;
    /** [plain] The subheader for the teacher partners section */
    teachers: string;
    /** [plain] The subheader for the GitHub contributors section */
    contributors: string;
};

export type { ThanksPageText as default };
