import type { Template } from '@locale/LocaleText';

type PageText = {
    /** The value proposition for the site */
    value: Template;
    /** A description of the platform's features */
    description: Template | Template[];
    /** The landing page beta warning */
    beta: Template[];
    /** Text between locale buttons - "or choose" */
    chooseLocales: string;
    /** The subtitles below links */
    link: {
        /** What content is on the about page */
        about: string;
        /** What content is on the learn page */
        learn: string;
        /** What content is on the teach page */
        teach: string;
        /** What content is on the guide page */
        guide: string;
        /** What content is on the projects page */
        projects: string;
        /** What content is on the galleries page */
        galleries: string;
        /** What content is on on the characters page */
        characters: string;
        /** What content is on the rights page */
        rights: string;
        /** What content is on the updates page */
        updates: string;
        /** The community link */
        community: { label: string; subtitle: string };
        /** The contributor link */
        contribute: { label: string; subtitle: string };
    };
};

export type { PageText as default };
