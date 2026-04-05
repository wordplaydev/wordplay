import type { FormattedText } from '@locale/LocaleText';

type PageText = {
    /** [formatted] The value proposition for the site */
    value: FormattedText;
    /** A description of the platform's features */
    description: FormattedText | FormattedText[];
    /** [formatted] The landing page beta warning */
    beta: FormattedText[];
    /** [plain] Text between locale buttons - "or choose" */
    chooseLocales: string;
    /** The subtitles below links */
    link: {
        /** [plain] What content is on the about page */
        about: string;
        /** [plain] What content is on the learn page */
        learn: string;
        /** [plain] What content is on the teach page */
        teach: string;
        /** [plain] What content is on the guide page */
        guide: string;
        /** [plain] What content is on the projects page */
        projects: string;
        /** [plain] What content is on the galleries page */
        galleries: string;
        /** [plain] What content is on on the characters page */
        characters: string;
        /** [plain] What content is on the rights page */
        rights: string;
        /** [plain] What content is on the updates page */
        updates: string;
        /** The community link */
        community: { label: string; subtitle: string };
        /** The contributor link */
        contribute: { label: string; subtitle: string };
    };
};

export type { PageText as default };
