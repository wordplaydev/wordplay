import type { FormattedText } from '@locale/LocaleText';
import type { ButtonText, FieldText } from '@locale/UITexts';

type PageText = {
    /** Header for the class page*/
    header: string;
    subheader: {
        /** [plain] The teachers header */
        teachers: string;
        /** [plain] The student header */
        students: string;
        /** [plain] The galleries header */
        galleries: string;
    };
    prompt: {
        /** [formatted] Encourage galleries */
        gallery: FormattedText;
        /** [formatted] Explain deletion */
        delete: FormattedText;
    };
    field: {
        /** The name of the class */
        name: FieldText;
        /** The description of the class */
        description: FieldText;
        /** Add a teacher */
        newteacher: FieldText;
        /** [plain] Add a teacher button */
        addteacher: string;
        /** Delete class */
        delete: ButtonText;
    };
    error: {
        /** [plain] Couldn't find the requested class */
        notfound: string;
        /** [plain]Couldn't create a gallery*/
        gallery: string;
    };
};

export type { PageText as default };
