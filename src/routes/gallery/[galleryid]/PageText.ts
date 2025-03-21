import type { ConfirmText, DialogText, FieldText } from '@locale/UITexts';

type PageText = {
    /** What to call a gallery by default, before it's given a name */
    untitled: string;
    /** What to say if the description is empty */
    undescribed: string;
    /** Headers on the page */
    subheader: {
        /** Associtaed classes header */
        classes: DialogText;
        /** The list of curators */
        curators: DialogText;
        /** The list of curators */
        creators: DialogText;
        /** Delete header */
        delete: DialogText;
    };
    /** Confirm buttons on the gallery page */
    confirm: {
        /** The confirm button that deletes a source file */
        delete: ConfirmText;
        /** The confirm button that removes a project from a gallery */
        remove: ConfirmText;
    };
    error: {
        /** When the gallery is not known or is not public */
        unknown: string;
    };
    field: { name: FieldText; description: FieldText };
};

export type { PageText as default };
