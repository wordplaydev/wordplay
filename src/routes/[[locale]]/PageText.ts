import type { FormattedText } from '@locale/LocaleText';

/**
 * One example program in the landing page's carousel: a single `\…\` example
 * whose first token is a `¶doc¶` explaining what it does.
 *
 * The doc lives inside the program rather than beside it for two reasons: the
 * page is then demonstrating Wordplay's own documentation rather than describing
 * it, and translation carries the explanation and the code it explains together,
 * through the same pass that localizes every other embedded example.
 */
type TourExampleText = FormattedText;

/** One block of the landing page's granular feature list. */
type FeatureSectionText = {
    /** [plain] The section's declarative headline */
    title: string;
    /** [formatted] One granular claim per element, some illustrated with code */
    bullets: FormattedText[];
};

type PageText = {
    /** [formatted] The value proposition for the site */
    value: FormattedText;
    /** [formatted] The landing page beta warning */
    beta: FormattedText[];
    /** [plain] Text between locale buttons - "or choose" */
    chooseLocales: string;
    /** [plain] The tagline below the wordmark on the stage */
    tagline: string;
    /** The stage's carousel of tiny example programs */
    tour: {
        /** [plain] The button that reveals the carousel */
        button: string;
        /** [plain] Shown on the button while the carousel loads */
        loading: string;
        /** [plain] Shown when the carousel couldn't be loaded */
        failed: string;
        /** [plain] Tooltip for the button that starts an example over */
        restart: string;
        /**
         * The row of example buttons. The buttons are emoji, and each example's
         * own program doc does the explaining, so there are no separate names —
         * a description per example is both the button's accessible name and
         * its tooltip.
         */
        examples: {
            /** [plain] Accessible name for the row itself */
            label: string;
            /** [plain] What each example shows, one per example, in order */
            tips: [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
            ];
        };
        /** The example programs, keyed by the name the page refers to them by */
        example: {
            /** [formatted] The example showing a phrase on stage with color, glow, and motion */
            phrase: TourExampleText;
            /** [formatted] The example showing music playing, with the stage moving on every beat */
            music: TourExampleText;
            /** [formatted] The example showing a greeting in a new language each second, shown and spoken */
            hello: TourExampleText;
            /** [formatted] The example showing the audience moving something with pointer, keys, and clicks */
            keys: TourExampleText;
            /** [formatted] The example showing the audience dragging and choosing */
            choose: TourExampleText;
            /** [formatted] The example showing the audience's word traced along its own glyph outlines */
            letters: TourExampleText;
            /** [formatted] The example showing emoji falling under physics and settling in a pile */
            pile: TourExampleText;
            /** [formatted] The example showing the microphone changing what is on stage */
            listen: TourExampleText;
            /** [formatted] The example showing the camera watching for a smile */
            smile: TourExampleText;
        };
    };
    /** The granular feature list below the links */
    features: {
        language: FeatureSectionText;
        multilingual: FeatureSectionText;
        accessible: FeatureSectionText;
        senses: FeatureSectionText;
        performs: FeatureSectionText;
        typography: FeatureSectionText;
        docs: FeatureSectionText;
        sharing: FeatureSectionText;
        free: FeatureSectionText;
    };
    /** The subtitles below links */
    link: {
        /** [plain] What content is on the about page */
        about: string;
        /** [plain] What content is on the thanks page */
        thanks: string;
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
        /** [plain] The community link */
        community: { label: string; subtitle: string };
        /** [plain] The contributor link */
        contribute: { label: string; subtitle: string };
        /** [plain] What content is on the design page */
        design: string;
        /** [plain] What content is on the localize page */
        localize: string;
    };
};

export type { PageText as default };
