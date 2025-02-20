import type { ButtonText, FieldText } from '@locale/UITexts';

type PageText = {
    /** Header for the class page*/
    header: string;
    subheader: {
        /** The teachers header */
        teachers: string;
        /** The student header */
        students: string;
        /** The galleries header */
        galleries: string;
    };
    prompt: {
        /** Encourage galleries */
        gallery: string;
        /** Explain deletion */
        delete: string;
    };
    field: {
        /** The name of the class */
        name: FieldText;
        /** The description of the class */
        description: FieldText;
        /** Add a teacher */
        newteacher: FieldText;
        /** Add a teacher button */
        addteacher: string;
        /** Delete class */
        delete: ButtonText;
    };
    error: {
        /** Couldn't find the requested class */
        notfound: string;
        /** Couldn't create a gallery*/
        gallery: string;
    };
};

export type { PageText as default };
