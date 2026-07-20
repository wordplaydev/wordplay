import type { Template } from '@locale/LocaleText';
import type {
    ConfirmText,
    FieldText,
    HeaderAndExplanationText,
} from '@locale/UITexts';

type PageText = {
    /** [plain] What to call a gallery by default, before it's given a name */
    untitled: string;
    /** [plain] What to say if the description is empty */
    undescribed: string;
    /** [plain] The count of projects in a gallery, shown on gallery preview cards. $count is the number; $zero/$one/$two/$few/$many are CLDR plural-category flags for choosing a plural form with branches, e.g. "$count $one[project|projects]". */
    projects: Template<['count', 'zero', 'one', 'two', 'few', 'many']>;
    /** Headers on the page */
    subheader: {
        /** Associtaed classes header */
        classes: HeaderAndExplanationText;
        /** The list of curators */
        curators: HeaderAndExplanationText;
        /** The list of curators */
        creators: HeaderAndExplanationText;
        /** Delete header */
        delete: HeaderAndExplanationText;
    };
    /** Confirm buttons on the gallery page */
    confirm: {
        /** The confirm button that deletes a source file */
        delete: ConfirmText;
        /** The confirm button that removes a project from a gallery */
        remove: ConfirmText;
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
