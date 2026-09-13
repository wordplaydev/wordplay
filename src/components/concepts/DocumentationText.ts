import type KitsText from '@components/concepts/KitsText';
import type { HowToCategories } from '@concepts/HowTo';
import { Purpose } from '@concepts/Purpose';
import type { FormattedText, Template } from '@locale/LocaleText';
import type {
    ButtonText,
    HeaderAndExplanationText,
    ModeText,
} from '@locale/UITexts';

type DocumentationText = {
    /** Published kits, which are a section of the guide rather than a page of their own. */
    kits: KitsText;
    /** [plain] The ARIA label for the palette section. */
    label: string;
    /** [formatted] A link to a concept in documentation */
    link: Template<['name']>;
    /** [plain] A link to the tutorial for a concept */
    tutorial: string;
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
        /** Toggle between the code concepts, how-to guides, glossary, and published kits */
        browse: ModeText<[string, string, string, string]>;
        /** Filter concepts by purpose category. **Aligned by position with the
         *  order of {@link Purpose}'s keys** — `Documentation` and `Wellspring`
         *  both index one by the other — so a purpose added in the middle must
         *  be added here at the same index, and in `getPurposeIcons`.
         *  `purposeFilters.test.ts` fails when the three disagree, which is how
         *  `Kit` came to be labelled "output" for a while.
         *
         *  project, kit, output, input, decide, name, text, pattern, numbers,
         *  truth, lists, sets, tables, docs, types, etc. */
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
        /** [plain] The category names */
        category: Record<keyof typeof HowToCategories, string>;
        /** [plain] The subheader for how-tos the creator bookmarked, shown above the per-gallery groups */
        bookmarked: string;
        /** [plain] The subheader for how-tos a moderator has listed in the guide, which
         *  everyone sees. Not a key in `category` below: that is a record over the
         *  built-in how-to categories, and a key added there would render as an empty
         *  one — and the same goes for the two beneath it. */
        community: string;
        /** [plain] The subheader over the how-tos from galleries this creator is in,
         *  each of which is named beneath it */
        galleries: string;
        /** [plain] The subheader over the how-tos that ship with Wordplay, whose
         *  categories are named beneath it */
        wordplay: string;
        /** [plain] The subheader for related how to's */
        related: string;
        /** [plain] The heading for the list of how-tos relevant to a concept, shown in the concept sidebar */
        conceptHowTos: string;
        /** Button text to go to the how-to in the space */
        howToGalleryButton: ButtonText;
    };
    /** Everything related to the glossary section */
    glossary: {
        /** Header and explanation of what the glossary is, shown atop the glossary section */
        explain: HeaderAndExplanationText;
    };
    /** Interactive tour explaining the documentation tile */
    tour: {
        /** [plain] Tooltip on the help button that opens the tour */
        launch: string;
        /** [formatted] Markup describing the guide overall */
        guide: FormattedText;
        /** [formatted] Markup describing the code (programming language) section */
        code: FormattedText;
        /** [formatted] Markup describing the how-to section */
        howto: FormattedText;
        /** [formatted] Markup describing the code/how-to mode toggle */
        mode: FormattedText;
        /** [formatted] Markup describing the search field */
        search: FormattedText;
    };
};

export { type DocumentationText as default };
