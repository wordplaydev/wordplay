import type { HowToCategories } from '@concepts/HowTo';
import type Purpose from '@concepts/Purpose';
import type { Template } from '@locale/LocaleText';
import type { ModeText } from '@locale/UITexts';

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
        /** Documentation header in structure and functions before inputs */
        inputs: string;
        /** Documentation header in structure view before interfaces */
        interfaces: string;
        /** Documentation header in structure before properties */
        properties: string;
        /** Documentation header in structure before functions */
        functions: string;
        /** Documentation header in structure before conversions */
        conversions: string;
        /** Arrangements header */
        arrangements: string;
        /** Forms header */
        forms: string;
        /** Appearance header */
        appearance: string;
        /** Animation header */
        animation: string;
        /** Location header */
        location: string;
        /** Reactions header */
        reactions: string;
    };
    /** Labels for concept categories */
    purposes: {
        [key in keyof typeof Purpose]: string;
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
