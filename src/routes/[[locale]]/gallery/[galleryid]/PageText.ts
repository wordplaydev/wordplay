import type { Template } from '@locale/LocaleText';
import type {
    ConfirmText,
    FieldText,
    HeaderAndExplanationText,
    ModeText,
} from '@locale/UITexts';

type PageText = {
    /** [plain] What to call a gallery by default, before it's given a name */
    untitled: string;
    /** [plain] What to say if the description is empty */
    undescribed: string;
    /** [plain] The count of projects in a gallery, shown on gallery preview cards. A count, so it chooses a plural form: "$#count[$count project|$count projects]". */
    projects: Template<['#count']>;
    /** [plain] The count of characters in a gallery, shown on gallery preview cards. A count, so it chooses a plural form. */
    characters: Template<['#count']>;
    /** Headers on the page */
    subheader: {
        /** Associtaed classes header */
        classes: HeaderAndExplanationText;
        /** The list of curators */
        curators: HeaderAndExplanationText;
        /** The list of curators */
        creators: HeaderAndExplanationText;
        /** The projects shared in the gallery */
        projects: HeaderAndExplanationText;
        /** The characters shared in the gallery */
        characters: HeaderAndExplanationText;
        /** Delete header */
        delete: HeaderAndExplanationText;
    };
    /** The tabs the gallery's settings are grouped into */
    tab: ModeText<[string, string, string, string]>;
    /** Buttons on the characters in a gallery */
    button: {
        /** [plain] Tooltip for the button that opens a character you can edit */
        editcharacter: string;
        /** [plain] Tooltip for the button that copies a reference to a character, to paste into a project */
        copyreference: string;
        /** [plain] Shown in place of the copy tooltip just after a reference is copied */
        copied: string;
    };
    /** Confirm buttons on the gallery page */
    confirm: {
        /** The confirm button that deletes a source file */
        delete: ConfirmText;
        /** The confirm button that removes a project from a gallery */
        remove: ConfirmText;
        /** The confirm button that removes a character from a gallery */
        removecharacter: ConfirmText;
    };
    error: {
        /** [plain] When the gallery is not known or is not public */
        unknown: string;
        /** [plain] When we couldn't load the gallery because the database was unreachable (vs. it not existing) */
        unreachable: string;
    };
    field: { name: FieldText; description: FieldText };
};

export type { PageText as default };
