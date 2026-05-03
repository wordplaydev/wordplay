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
    };
    field: { name: FieldText; description: FieldText };
};

export type { PageText as default };
