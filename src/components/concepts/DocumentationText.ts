import type { HowToCategories } from '@concepts/HowTo';
import { Purpose } from '@concepts/Purpose';
import type { FormattedText, Template } from '@locale/LocaleText';
import type {
    ButtonText,
    HeaderAndExplanationText,
    ModeText,
} from '@locale/UITexts';

type DocumentationText = {
    /** [plain] The ARIA label for the palette section. */
    label: string;
    /** [formatted] A link to a concept in documentation */
    link: Template<['name']>;
    /** [plain] A link to the tutorial for a concept */
    learn: string;
    /** [plain] Shown if documentation is missing for a concept */
    nodoc: string;
    /** Buttons in the documentation tile */
    button: {
        /** [plain] The home button in the docs tile */
        home: string;
        /** [plain] The back button in the docs tile */
        back: string;
        /** [plain] The toggle to expand and collapse concept groups */
        toggle: string;
    };
    /** Text fields in the documentation tile */
    field: {
        /** [plain] The search text field */
        search: string;
    };
    /** The navigation breadcrumbs in the documentation tile */
    breadcrumb: {
        /** [plain] The ARIA label for the breadcrumb navigation */
        label: string;
        /** [plain] The first breadcrumb, returning to the browsing page */
        home: string;
    };
    /** Notes shown in the documentation tile */
    note: {
        /** [plain] The project has no concepts. */
        empty: string;
        /** [plain] Prompt shown in search mode when the query is too short to search yet. */
        keepTyping: string;
        /** [plain] Shown in search mode when a query matches no concepts. */
        noMatches: string;
    };
    /** Modes in the guide */
    mode: {
        /** Toggle between browsing all concepts and filtering by purpose */
        browse: ModeText<[string, string]>;
        /** Filter concepts by purpose category (aligned with the order of the
         *  Purpose enum's keys: project, output, input, decide, name, text,
         *  pattern, numbers, truth, lists, sets, tables, docs, types, etc.) */
        purpose: ModeText<
            [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
            ]
        >;
        /** Toggle between seeing all user-created how-tos or only those in the project's gallery */
        howToFilter: ModeText<[string, string]>;
    };
    header: {
        /** Names header */
        names: HeaderAndExplanationText;
        /** Function inputs header */
        inputs: HeaderAndExplanationText;
        /** Structue interfaces header */
        interfaces: HeaderAndExplanationText;
        /** Structure properties header */
        properties: HeaderAndExplanationText;
        /** Functions */
        functions: HeaderAndExplanationText;
        /** Conversions header */
        conversions: HeaderAndExplanationText;
        /** Arrangements header */
        arrangements: HeaderAndExplanationText;
        /** Forms header */
        forms: HeaderAndExplanationText;
        /** Appearance header */
        appearance: HeaderAndExplanationText;
        /** Animation header */
        animation: HeaderAndExplanationText;
        /** Location header */
        location: HeaderAndExplanationText;
        /** Reactions header */
        reactions: HeaderAndExplanationText;
    };
    /** Labels for concept categories */
    purposes: {
        [key in keyof typeof Purpose]: HeaderAndExplanationText;
    };
    /** Everything related to how to content */
    how: {
        /** Header and explanation of what how-tos are, shown atop the how-to section */
        explain: HeaderAndExplanationText;
        /** The category names */
        category: Record<keyof typeof HowToCategories, string>;
        /** [plain] The subheader for related how to's */
        related: string;
        /** Button text to go to the how-to in the space */
        howToGalleryButton: ButtonText;
    };
    /** Interactive tour explaining the documentation tile */
    tour: {
        /** [plain] Tooltip on the help button that opens the tour */
        launch: string;
        /** Markup describing the guide overall */
        guide: FormattedText;
        /** Markup describing the code (programming language) section */
        code: FormattedText;
        /** Markup describing the how-to section */
        howto: FormattedText;
        /** Markup describing the code/how-to mode toggle */
        mode: FormattedText;
        /** Markup describing the search field */
        search: FormattedText;
    };
};

export { type DocumentationText as default };
