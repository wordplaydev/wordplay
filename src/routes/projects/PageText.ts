import type { ConfirmText, DialogText } from '@locale/UITexts';

type PageText = {
    /** Header for the projects page */
    header: string;
    /** Explanation for the project page */
    projectprompt: string;
    /** Explanation for the archive subsection */
    archiveprompt: string;
    /** Header for the galleries page */
    galleriesheader: string;
    /** A prompt to create galleries */
    galleryprompt: string;
    /** Dialog text for the project addition dialog */
    add: DialogText;
    /** Buttons on the project page */
    subheader: {
        /** Header for the shared project list */
        shared: string;
        /** Header for the unarchived project list */
        archived: string;
    };
    /** Search functionality */
    search: {
        /** Description for the search field */
        description: string;
    };
    button: {
        /** Create a new project */
        newproject: string;
        /** Edit a project */
        editproject: string;
        /** View a project's code */
        viewcode: string;
        /** Create a new gallery */
        newgallery: string;
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
        /** When the creator is not logged in. */
        nogalleryedits: string;
        /** Unable to create a gallery */
        newgallery: string;
        /** Feedback that we are unable to delete when logged out */
        nodeletes: string;
        /** Unable to delete project */
        delete: string;
    };
};

export type { PageText as default };
