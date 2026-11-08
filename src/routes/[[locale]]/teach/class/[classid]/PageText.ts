import type { FormattedText, Template } from '#locale/LocaleText.ts';
import type { ButtonText, FieldText } from '#locale/UITexts.ts';

type PageText = {
    /** [plain] Header for the class page*/
    header: string;
    subheader: {
        /** [plain] The teachers header */
        teachers: string;
        /** [plain] The student header */
        students: string;
        /** [plain] The galleries header */
        galleries: string;
        /** [plain] Header over adding a student who already has an account */
        existing: string;
        /** [plain] Header over creating an account for a student who has none */
        new: string;
    };
    prompt: {
        /** [formatted] Encourage galleries */
        gallery: FormattedText;
        /** [formatted] Explain deletion */
        delete: FormattedText;
        /** [formatted] Explain adding a student who already has an account, by username or email */
        existing: FormattedText;
        /** [formatted] Explain creating an account for a student who joins the class late */
        newstudent: FormattedText;
        /** [formatted] Confirm a new student account, and say to write its password down now */
        created: Template<['username']>;
    };
    field: {
        /** The name of the class */
        name: FieldText;
        /** The description of the class */
        description: FieldText;
        /** Delete class */
        delete: ButtonText;
        /** Create a new student account in this class */
        create: ButtonText;
    };
    error: {
        /** [plain] Couldn't find the requested class */
        notfound: string;
        /** [plain]Couldn't create a gallery*/
        gallery: string;
        /** [plain] The class already has as many students as a class may have */
        limit: string;
        /** [plain] A new student account couldn't be created */
        create: string;
    };
};

export type { PageText as default };
