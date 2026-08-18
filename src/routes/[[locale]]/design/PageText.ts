import type { FormattedText } from '@locale/LocaleText';

type PageText = {
    /** [plain] Header for the design page */
    header: string;
    /** [formatted] Description of the design system page, with links to wiki guides */
    description: FormattedText;
    /** [plain] Subheader for the theme toggle section */
    theme: string;
    /** [plain] Subheader for the colors section */
    colors: string;
    /** [plain] Subheader for the accessibility section */
    accessibility: string;
    /** [formatted] The color-accessibility rules contributors must follow: the text-variant vs background-hue split, the contrast requirements and how they're enforced, the border waiver, and never conveying meaning by color alone, with links to WCAG and the wiki */
    accessibilityRules: FormattedText | FormattedText[];
    /** [plain] Subheader for the palette colors subsection */
    palette: string;
    /** [plain] Subheader for the semantic colors subsection */
    semantic: string;
    /** [plain] Subheader for the fonts section */
    fonts: string;
    /** [plain] Subheader for the spacing section */
    spacing: string;
    /** [plain] Subheader for typography */
    typography: string;
    /** [plain] Subheader for the logo section */
    logo: string;
    /** [formatted] What the logo is (a speech bubble holding one letter, a stage that can say anything), how it localizes to the reader's writing system, why motion is behavioral and animation-gated, and the color rule (always the current text color) */
    logoDescription: FormattedText | FormattedText[];
    /** [plain] Subheader for the components section */
    components: string;
    /** [plain] Tooltip for the button that copies a font stack's full CSS value to the clipboard */
    copyvalue: string;
    /** Column header labels for data tables */
    col: {
        /** [plain] Column header for the component name */
        component: string;
        /** [plain] Column header for the live preview */
        preview: string;
        /** [plain] Column header for the CSS variable name */
        variable: string;
        /** [plain] Column header for the color swatch */
        color: string;
        /** [plain] Column header for the hex value */
        hex: string;
        /** [plain] Column header for the color's contrast ratio against the page background */
        contrast: string;
        /** [plain] Column header for the description */
        description: string;
        /** [plain] Column header for the raw CSS value */
        cssvalue: string;
        /** [plain] Column header for the computed/resolved measurement */
        computed: string;
        /** [plain] Row label for the primary font face name */
        primaryface: string;
    };
    /** Placeholder text used in live component demos */
    demo: {
        /** [plain] Label shown inside the Button demo */
        button: string;
        /** [plain] Text shown in the Note demo */
        note: string;
        /** [plain] Text shown in the Notice demo */
        notice: string;
        /** [plain] Text shown inside the Header demo */
        header: string;
        /** [plain] Text shown inside the Subheader demo */
        subheader: string;
        /** [plain] Tooltip when the Toggle demo is on */
        toggleon: string;
        /** [plain] Tooltip when the Toggle demo is off */
        toggleoff: string;
        /** [plain] Placeholder text in the TextField demo */
        textfieldplaceholder: string;
        /** [plain] ARIA description for the TextField demo */
        textfielddescription: string;
        /** [plain] Label for the Options demo select */
        optionslabel: string;
        /** [plain] First option in the Options demo */
        optiona: string;
        /** [plain] Second option in the Options demo */
        optionb: string;
        /** [plain] Third option in the Options demo */
        optionc: string;
        /** [plain] Label for the logo's resting state specimen */
        logoresting: string;
        /** [plain] Label for the logo's loading state specimen */
        logoloading: string;
        /** [plain] Label for the row of logo glyphs across writing systems */
        logoscripts: string;
        /** [plain] Label for the SVG logo download link */
        logodownloadsvg: string;
        /** [plain] Label for the 512-pixel PNG logo download link */
        logodownloadpng: string;
        /** [plain] Label for the social share image download link */
        logodownloadcard: string;
    };
};

export type { PageText as default };
