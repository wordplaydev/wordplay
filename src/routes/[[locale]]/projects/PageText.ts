import type { FormattedText, Template } from '@locale/LocaleText';
import type {
    ButtonText,
    ConfirmText,
    FieldText,
    ModeText,
} from '@locale/UITexts';

type PageText = {
    /** [plain] Header for the projects page */
    header: string;
    /** [formatted] Explanation for the project page */
    projectprompt: FormattedText;
    /** [formatted] Explanation for the archive subsection */
    archiveprompt: FormattedText;
    /** [formatted] Explanation shown in the installed app when signed out with no projects, since an installed app's projects are stored separately from the web browser's */
    installedprompt: FormattedText;
    /** Buttons on the project page */
    subheader: {
        /** [plain] Header for the shared project list */
        shared: string;
        /** [plain] Header for the unarchived project list */
        archived: string;
    };
    /** How the project list is ordered. One choice, applied to the top level and
     *  inside every folder. */
    sort: ModeText<[string, string]>;
    /** Folders, which a creator uses to organize their own projects */
    folder: {
        /** The folder name field, shown in a folder's header while it's selected */
        name: FieldText;
        /** [plain] What the top level is called in the list of places a project can move to */
        none: string;
        button: {
            /** [plain] Make a new folder */
            create: string;
            /** [plain] Show the projects inside a folder */
            expand: string;
            /** [plain] Hide the projects inside a folder */
            collapse: string;
        };
        /** What to do with whatever is selected, shown below the project list
         *  and pointed at by the list's aria-describedby. Anything a pointer
         *  can do here has to have a key that does it too, so this is where
         *  those keys are named. */
        instructions: {
            /** [formatted] Shown when nothing is selected */
            none: FormattedText;
            /** [formatted] Shown when a project is selected */
            project: FormattedText;
            /** [formatted] Shown when a folder is selected */
            folder: FormattedText;
        };
        confirm: {
            /** Delete a folder, archiving the projects inside it */
            delete: ConfirmText;
        };
        /** What screen readers are told as projects are organized. Each names
         *  what changed rather than summarizing, since a summary reads the same
         *  every time and is heard only once. */
        announce: {
            /** [plain] Where a project being moved would land */
            destination: Template<['project', 'folder']>;
            /** [plain] A project was moved into a folder */
            moved: Template<['project', 'folder']>;
            /** [plain] A project was moved out of every folder */
            movedOut: Template<['project']>;
            /** [plain] A folder was expanded, and how many projects it holds */
            expanded: Template<['folder', '#count']>;
            /** [plain] A folder was collapsed, and how many projects it holds */
            collapsed: Template<['folder', '#count']>;
            /** [plain] A folder was selected, and how many projects it holds */
            selected: Template<['folder', '#count']>;
            /** [plain] A project was selected */
            projectSelected: Template<['project']>;
            /** [plain] Nothing is selected any more */
            cleared: string;
            /** [plain] A folder was created */
            created: Template<['folder']>;
            /** [plain] A folder was deleted and its projects archived */
            deleted: Template<['folder', '#count']>;
            /** [plain] A folder was renamed */
            renamed: Template<['folder']>;
        };
    };
    /** Search functionality */
    search: {
        /** [plain] Description for the search field */
        description: string;
        /** [plain] No project search results */
        noResults: string;
    };
    button: {
        /** [plain] Create a new project */
        newproject: string;
        /** [plain] Edit a project */
        editproject: string;
        /** [plain] Open a read-only view of a project's code */
        viewproject: string;
        /** [plain] The project unarchive button description */
        unarchive: string;
        /** Bring a project back from a file (#152) */
        import: ButtonText;
    };
    /** Bringing a project back from a file (#152) */
    import: {
        /** [plain] Announced when a project has been brought back, naming it */
        done: Template<['name']>;
        /** [plain] Invitation shown while a file is held over the page */
        drop: string;
        /** [plain] Announced when a dropped project replaced an open one */
        replaced: Template<['name']>;
        /** Asking before a dropped file replaces what an open project holds */
        replace: {
            /** [plain] Names the question */
            header: string;
            /** [plain] Says what replacing does, and that the old version is kept */
            explanation: string;
            /** [formatted] Names the project that would replace this one */
            prompt: Template<['name']>;
            /** Go ahead and replace */
            confirm: ButtonText;
        };
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
        /** [plain] When a chosen project file has nothing in it */
        importEmpty: string;
        /** [plain] When a chosen project file is too big to ever save */
        importTooLarge: string;
        /** [plain] When a chosen file is not a project Wordplay can read */
        importUnreadable: string;
    };
};

export type { PageText as default };
