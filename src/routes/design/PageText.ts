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
    /** [plain] Subheader for the palette colors subsection */
    palette: string;
    /** [plain] Subheader for the semantic colors subsection */
    semantic: string;
    /** [plain] Subheader for the fonts section */
    fonts: string;
    /** [plain] Label for the application font subsection */
    appfont: string;
    /** [plain] Label for the code font subsection */
    codefont: string;
    /** [plain] Subheader for the spacing section */
    spacing: string;
    /** [plain] Subheader for typography */
    typography: string;
    /** [plain] Subheader for the components section */
    components: string;
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
        /** [plain] Text shown in the Warning demo */
        warning: string;
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
    };
};

export type { PageText as default };
