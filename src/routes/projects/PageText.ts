import type { ConfirmText, HeaderAndExplanationText } from '@locale/UITexts';

type PageText = {
    /** Header for the projects page */
    header: string;
    /** Explanation for the project page */
    projectprompt: string;
    /** Explanation for the archive subsection */
    archiveprompt: string;
    /** Dialog text for the project addition dialog */
    add: HeaderAndExplanationText;
    /** Buttons on the project page */
    subheader: {
        /** Header for the shared project list */
        shared: string;
        /** Header for the unarchived project list */
        archived: string;
        /** Header for the galleries where the user can see how-tos but not projects */
        howtoviewonly: HeaderAndExplanationText;
    };
    button: {
        /** Create a new project */
        newproject: string;
        /** Edit a project */
        editproject: string;
        /** View a project's code */
        viewcode: string;
        /** The project unarchive button description */
        unarchive: string;
    };
    confirm: {
        /** The project archive button */
        archive: ConfirmText;
        /** The project delete button */
        delete: ConfirmText;
    };
    error: {
        /** When there's no access to the database. */
        noaccess: string;
        /** Unable to create a gallery */
        newgallery: string;
        /** Feedback that we are unable to delete when logged out */
        nodeletes: string;
        /** Unable to delete project */
        delete: string;
    };
};

export type { PageText as default };
