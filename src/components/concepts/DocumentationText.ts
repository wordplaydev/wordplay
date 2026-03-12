import type { HowToCategories } from '@concepts/HowTo';
import type Purpose from '@concepts/Purpose';
import type { Template } from '@locale/LocaleText';
import type { HeaderAndExplanationText, ModeText } from '@locale/UITexts';

type DocumentationText = {
    /** The ARIA label for the palette section. */
    label: string;
    /** A link to a concept in documentation */
    link: Template;
    /** A link to the tutorial for a concept */
    learn: string;
    /** Shown if documentation is missing for a concept */
    nodoc: string;
    button: {
        /** The home button in the docs tile */
        home: string;
        /** The back button in the docs tile */
        back: string;
        /** The toggle to expand and collapse concept groups */
        toggle: string;
    };
    field: {
        /** The search text field */
        search: string;
    };
    note: {
        /** The project has no concepts. */
        empty: string;
    };
    /** Modes in the guide */
    mode: {
        browse: ModeText<[string, string]>;
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
            ]
        >;
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
        /** The category names */
        category: Record<keyof typeof HowToCategories, string>;
        /** The subheader for related how to's */
        related: string;
    };
};

export { type DocumentationText as default };
