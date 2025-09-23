import type { FormattedText } from '@locale/LocaleText';
import type { ConfirmText, HeaderAndExplanationText } from '@locale/UITexts';

type PageText = {
    /** [plain] Header for the projects page */
    header: string;
    /** [formatted] Explanation for the project page */
    projectprompt: FormattedText;
    /** [formatted] Explanation for the archive subsection */
    archiveprompt: FormattedText;
    /** Dialog text for the project addition dialog */
    add: HeaderAndExplanationText;
    /** Buttons on the project page */
    subheader: {
        /** [plain] Header for the shared project list */
        shared: string;
        /** [plain] Header for the unarchived project list */
        archived: string;
        /** Header for the galleries where the user can see how-tos but not projects */
        howtoviewonly: HeaderAndExplanationText;
    };
    /** Search functionality */
    search: {
        /** Description for the search field */
        description: string;
    };
    button: {
        /** [plain] Create a new project */
        newproject: string;
        /** [plain] Edit a project */
        editproject: string;
        /** [plain] View a project's code */
        viewcode: string;
        /** [plain] The project unarchive button description */
        unarchive: string;
    };
    confirm: {
        /** The project archive button */
        archive: ConfirmText;
        /** The project delete button */
        delete: ConfirmText;
    };
    error: {
        /** [plain] When there's no access to the database. */
        noaccess: string;
        /** [plain] Unable to create a gallery */
        newgallery: string;
        /** [plain] Feedback that we are unable to delete when logged out */
        nodeletes: string;
        /** [plain] Unable to delete project */
        delete: string;
    };
};

export type { PageText as default };
