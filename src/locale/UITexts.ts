import type { SupportedFace } from '../basis/Fonts';
import type { TileKind } from '../components/project/Tile';
import type EditTexts from './EditTexts';
import type { DocText, Template } from './Locale';

export type ButtonText = {
    /** The buttons label */
    label: string;
    /** THe buttons tooltip and ARIA-label, spoken by screen readers */
    tip: string;
};

export type ToggleText = {
    /** The tooltip and ARIA-label for when the toggle is in the on state */
    on: string;
    /** The tooltip and ARIA-label for when the toggle is in the off state */
    off: string;
};

export type ModeText<Modes extends string[]> = {
    /** The tooltip and ARIA-label for the entire mode widget, describing the kind of modes it supports switching to. */
    label: string;
    /** The tooltip and ARIA-labels to use for each mode button describing the mode to be switched to, in the order of appearance */
    modes: Modes;
};

export type DialogText = {
    /** The header to be shown at the top of the dialog */
    header: string;
    /** The explanation text just below the header. */
    explanation: Template | Template[];
};

export type ConfirmText = {
    /** The tooltip and ARIA-label for the button */
    description: string;
    /** The confirmation prompt to show after clicked the first time. */
    prompt: string;
};

export type FieldText = {
    /** The tooltip and ARIA-label for the text field */
    description: string;
    /** The placeholder text fo the text field. */
    placeholder: string;
};

type UITexts = {
    font: {
        /** The application font to use throughout the application. Should support the language used in this locale so that glyphs render correctly. Add the face to Fonts.ts if the one you choose is not yet supported. */
        app: SupportedFace;
        /** The monospace font to use for code in the editor and code examples. Should support the language used in this locale so that glyphs render correctly. Add the face to Fonts.ts if the one you choose is not yet supported. */
        code: SupportedFace;
    };
    phrases: {
        /** Placeholder text used in code examples. */
        welcome: string;
    };
    /** Generic reusable widgets and their generic labels. */
    widget: {
        /** A confirm button */
        confirm: {
            /** The 'x' cancel button after a confirm button has been pressed. */
            cancel: string;
        };
        /** A modal dialog */
        dialog: {
            /** The close button on modal dialogs */
            close: string;
        };
        /** The page loading widget, before content is shown */
        loading: {
            /** The message shown in the page loading feedback */
            message: string;
        };
        /** The go home button description */
        home: string;
    };
    /** Controls for the tiled windows in the project */
    tile: {
        button: {
            /** Collapse the tile window */
            collapse: string;
        };
        /** Tile labels appearing in the project footer tile toggles, except for source files. */
        label: { [ID in TileKind]: string };
        toggle: {
            /** Enter and exit tile fullscreen mode */
            fullscreen: ToggleText;
            /** Show or hide the tile */
            show: ToggleText;
        };
    };
    /** Project settings and controls */
    project: {
        /** The error shown when a project ID is unknown. */
        error: {
            unknown: string;
        };
        button: {
            /** Shows the sharing dialog */
            showCollaborators: string;
            /** Remove a collaborator that has been shared with */
            removeCollaborator: string;
            /** Copy the project as text to the clipboard */
            copy: string;
            /** Add a source file */
            addSource: string;
            /** Duplicate the project */
            duplicate: string;
            /** Revert project to original code */
            revert: string;
            /** Keyboard shortcut to focus output tile */
            focusOutput: string;
            /** Keyboard shortcut to focus source tiles */
            focusSource: string;
            /** Keyboard shortcut to focus documentation tile */
            focusDocs: string;
            /** Keyboard shortcut to focus palette tiles */
            focusPalette: string;
            /** Keyboard shortcut to cycle between tiles */
            focusCycle: string;
            /** Show save error button */
            unsaved: string;
        };
        field: {
            /** The project name text field */
            name: FieldText;
        };
        /** The keyboard shortcut to show the shortcut menu */
        help: string;
        /** The messages shown for save status */
        save: {
            /** When projects fail to save locally */
            projectsNotSavedLocally: Template;
            /** When projects can't save locally */
            projectsCannotNotSaveLocally: Template;
            /** When a project wasn't saved because it contained PII */
            projectContainedPII: Template;
            /** Projects failed to load */
            projectsNotLoadingOnline: Template;
            /** When a project couldn't be saved to the database */
            projectNotSavedOnline: Template;
            /** When settings are being saved */
            settingsUnsaved: Template;
        };
        dialog: {
            /** The header for the save error */
            unsaved: Template;
        };
    };
    /** Gallery page labels */
    gallery: {
        /** What to call a gallery by default, before it's given a name */
        untitled: string;
        /** Headers on the page */
        subheader: {
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
        field: {
            name: FieldText;
            description: FieldText;
        };
    };
    /** Source file controls */
    source: {
        /** The ARIA label for the source file section */
        label: string;
        /** The text to show when a source file is empty */
        empty: DocText;
        /** When some other device had a more recent edit that overrode this device's version. */
        overwritten: string;
        confirm: {
            /** The confirm button that deletes a source file */
            delete: ConfirmText;
        };
        toggle: {
            /** The blocks/text toggle */
            blocks: ToggleText;
            /** The glyph chooser expand/collapse toggle */
            glyphs: ToggleText;
            /** The localized on/off toggle */
            localized: ToggleText;
        };
        button: {
            /** Output preview button for selecting output for display in output tile */
            selectOutput: string;
            /** The button shown when a list of code is ellided; clicking it shows the hidden code. */
            expandSequence: string;
        };
        menu: {
            /** How to describe the autocomplete menu */
            label: string;
            /** The menu show button and keyboard shortcut */
            show: string;
            /** How to describe the autocomplete back button for leaving the submenu */
            back: string;
        };
        field: {
            /** The name of the source file */
            name: FieldText;
        };
        cursor: {
            /** Move caret to the line before */
            priorLine: string;
            /** Move caret to the line after */
            nextLine: string;
            /** Move cursor inline one position before */
            priorInline: string;
            /** Move cursor inline one position after */
            nextInline: string;
            /** Move cursor to line start */
            lineStart: string;
            /** Move cursor to line end */
            lineEnd: string;
            /** Move cursor to start of source */
            sourceStart: string;
            /** Move cursor to end of source */
            sourceEnd: string;
            /** Move cursor to node prior */
            priorNode: string;
            /** Move cursor to node after */
            nextNode: string;
            /** Select parent of node */
            parent: string;
            /** Select the whole program */
            selectAll: string;
            /** Increment the literal at the cursor */
            incrementLiteral: string;
            /** Decrement the literal at the cursor */
            decrementLiteral: string;
            /** Insert selected symbol */
            insertSymbol: string;
            /** Insert tab symbol */
            insertTab: string;
            /** Insert true symbol */
            insertTrue: string;
            /** Insert false symbol */
            insertFalse: string;
            /** Insert none symbol */
            insertNone: string;
            /** Insert ≠ symbol */
            insertNotEqual: string;
            /** Insert · symbol */
            insertProduct: string;
            /** Insert ÷ symbol */
            insertQuotient: string;
            /** Insert ° symbol */
            insertDegree: string;
            /** Insert ƒ symbol */
            insertFunction: string;
            /** Insert ≤ symbol */
            insertLessOrEqual: string;
            /** Insert ≥ symbol */
            insertGreaterOrEqual: string;
            /** Insert • symbol */
            insertType: string;
            /** Insert … symbol */
            insertStream: string;
            /** Insert ∆ symbol */
            insertChange: string;
            /** Insert ← symbol */
            insertPrevious: string;
            /** Insert → symbol */
            insertConvert: string;
            /** Insert table symbol */
            insertTable: string;
            /** Insert table close symbol */
            insertTableClose: string;
            /** Insert borrow symbol */
            insertBorrow: string;
            /** Insert share symbol */
            insertShare: string;
            /** Insert new line */
            insertLine: string;
            /** Delete previous symbol */
            backspace: string;
            /** Delete next symbol */
            delete: string;
            /** Copy selection to clipboard as text */
            copy: string;
            /** Cut selection to clipboard as text */
            cut: string;
            /** Paste clipboard text as code */
            paste: string;
            /** Parenthesize selection */
            parenthesize: string;
            /** Listify selection */
            enumerate: string;
            /** Insert a symbol */
            type: string;
            /** Undo last edit */
            undo: string;
            /** Redo undone edit */
            redo: string;
            /** Search for glyph */
            search: string;
            /** Tidy spacing */
            tidy: string;
        };
    };
    /** The conflicts area in the margin of the editor. */
    annotations: {
        /** The ARIA label for the conflicts section in the editor. */
        label: string;
        /** The description of the cursor position */
        cursor: Template;
        /** The prompt to line more about the cursor node */
        learn: Template;
        /** What function should say when evaluating */
        evaluating: Template;
        /** What function should say when the cursor is in space */
        space: Template;
        button: {
            /** How the resolution button should should be described */
            resolution: Template;
        };
    };
    output: {
        /** The ARIA label for the output section */
        label: string;
        toggle: {
            /** Toggle whether grid is shown */
            grid: ToggleText;
            /** Toggle whether output is fit to window */
            fit: ToggleText;
            /** Toggle whether painting or placing */
            paint: ToggleText;
        };
        field: {
            /** The text field that accepts key, placement, and chat input when a key stream is active */
            key: FieldText;
        };
        button: {
            /** The chat submit button */
            submit: string;
        };
    };
    /** The documentation browser */
    docs: {
        /** The ARIA label for the palette section. */
        label: string;
        /** A link to a concept in documentation */
        link: Template;
        /** A link to the tutorial for a concept */
        learn: string;
        /** Shown if documentation is missing for a concept */
        nodoc: string;
        button: {
            /** The home button in the docs tile */
            home: string;
            /** The back button in the docs tile */
            back: string;
        };
        field: {
            /** The search text field */
            search: string;
        };
        header: {
            /** Documentation header in structure and functions before inputs */
            inputs: string;
            /** Documentation header in structure view before interfaces */
            interfaces: string;
            /** Documentation header in structure before properties */
            properties: string;
            /** Documentation header in structure before functions */
            functions: string;
            /** Documentation header in structure before conversions */
            conversions: string;
        };
    };
    /** The palette editor */
    palette: {
        /** The ARIA label for the palette section */
        label: string;
        labels: {
            /** Shown in the output palette when multiple outputs are selected but they have unequal values. */
            mixed: string;
            /** Shown in the output palette when the output(s) selected have expressions that are not editable using the editor. */
            computed: string;
            /** Shown in the output palette when the output(s) selected have no value set, but have a default */
            default: string;
            /** Shown in the output palette when a value is unset but is inherited */
            inherited: string;
            /** Shown in the output palette when a sequence isn't valid */
            notSequence: string;
            /** Shown in the output palette when a list of content is isn't valid */
            notContent: string;
            /** The word to describe whether text is rich text formatted */
            format: string;
            /** The word to describe font weight */
            weight: string;
            /** The word to describe light font weight */
            light: string;
            /** The word to describe normal font weight */
            normal: string;
            /** The word to describe bold font weight */
            bold: string;
            /** The word to describe extra bold font weight */
            extra: string;
            /** The word to describe italic font style */
            italic: string;
            /** The word to describe underline text decoration */
            underline: string;
        };
        button: {
            /** Resets a property to it's default value */
            revert: string;
            /** Sets the property to a value, allowing modification */
            set: string;
            /** Add a group to the output */
            addGroup: string;
            /** Add a phrase to the output */
            addPhrase: string;
            /** Add a shape to the output */
            addShape: string;
            /** Set place to Motion stream */
            addMotion: string;
            /** Set place to Placement stream */
            addPlacement: string;
            /** Remove child from this output */
            remove: string;
            /** Move child up in list */
            up: string;
            /** Move child down in list */
            down: string;
            /** Edit the child */
            edit: string;
            /** Convert a pose to a sequence */
            sequence: string;
            /** The button that creates a phrase when there is none */
            createPhrase: string;
            /** The button that creates a group when there is none */
            createGroup: string;
            /** The button that creates a stage when there is none */
            createStage: string;
        };
        prompt: {
            /** The text offering to create a phrase in the palette without a stage */
            offerPhrase: Template;
            /** The text offering to create a group in the palette without a stage */
            offerGroup: Template;
            /** The text offering to create a stage in the palette without a stage */
            offerStage: Template;
            /** The text offering to pause the project to allow palette editing */
            pauseToEdit: Template;
            /** The text prompting the creator to edit the selected output */
            editing: Template;
        };
        field: {
            /** The tooltip and ARIA-label for the text input to Phrase */
            text: string;
            /** The tooltip and ARIA-label fro the text input for a Place coordinate */
            coordinate: string;
        };
        /** Widgets for editing sequences */
        sequence: {
            /** Buttons for editing sequences */
            button: {
                /** Add pose */
                add: string;
                /** Remove pose */
                remove: string;
                /** Move pose up */
                up: string;
                /** Move pose down */
                down: string;
            };
            /** Text fields for editing sequences */
            field: {
                /** Edit percent for pose */
                percent: string;
            };
        };
    };
    /** The timeline view below the output */
    timeline: {
        /** The ARIA label for the timeline section */
        label: string;
        /** The description of the timeline slider */
        slider: string;
        button: {
            /** Evaluate in real time */
            play: string;
            /** Pause evaluation */
            pause: string;
            /** One step back */
            backStep: string;
            /** Step to the previous evaluation of the node at the cursor  */
            backNode: string;
            /** Step to the previous input */
            backInput: string;
            /** Step out of the current function evaluation */
            out: string;
            /** Step to the very beginning */
            start: string;
            /** Step forward one step */
            forwardStep: string;
            /** Step to the next evaluation of the node at the cursor */
            forwardNode: string;
            /** Step to the next input */
            forwardInput: string;
            /** Step to the present */
            present: string;
            /** Reset the input history to restart the performance */
            reset: string;
        };
    };
    dialog: {
        /** The sharing dialog */
        share: DialogText & {
            /** The subheaders of the dialog */
            subheader: {
                /** The collaborators subheader and explanation */
                collaborators: DialogText;
                /** The gallery subheader and explanation */
                gallery: DialogText;
                /** The public/private toggle subheader and explanation */
                public: DialogText;
                /** The personal information subheader and explanation */
                pii: DialogText;
            };
            /** Text fields in the share dialog */
            field: {
                /** The email or username of the collaborator being added */
                emailOrUsername: FieldText;
            };
            /** Buttons in the share dialog */
            button: {
                /** Description for the email submission button. */
                submit: string;
                /** Description and label for the button to mark PII as sensitive again. */
                sensitive: ButtonText;
            };
            /** Modes in the share dialog */
            mode: {
                /** The private and public mode descriptions */
                public: ModeText<[string, string]>;
            };
            /** Errors in the share dialog */
            error: {
                /** When someone tries to add an email collaborator that doesn't have a Wordplay account */
                unknown: string;
                /** When someone wants to add a collaborator but isn't authenticated */
                anonymous: string;
            };
            options: {
                /** The label for the gallery chooser */
                gallery: string;
            };
        };
        /** The settings dialog */
        settings: DialogText & {
            button: {
                /** Show the settings dialog */
                show: string;
            };
            mode: {
                /** The project tile layout mode */
                layout: ModeText<[string, string, string, string]>;
                /** The animation on/off/slowdown mode */
                animate: ModeText<[string, string, string, string, string]>;
                /** The dark on/off/automatic mode */
                dark: ModeText<[string, string, string]>;
                /** The writing layout direction */
                writing: ModeText<[string, string, string]>;
            };
            options: {
                /** The label for the microphone drop down */
                mic: string;
                /** The label for the camera drop down */
                camera: string;
            };
        };
        /** The locale chooser dialog */
        locale: DialogText & {
            /** Subheaders in the local chooser dialog. */
            subheader: {
                /** How to label the locales that have been selected */
                selected: string;
                /** How to label the supported locales that have not been selected */
                supported: string;
                /** How to label locales that are coming soon */
                coming: string;
                /** How to request help with localization */
                help: string;
            };
            /** Buttons in the locale chooser dialog */
            button: {
                /** Show the locale chooser dialog */
                show: string;
                /** Add a locale */
                add: string;
                /** Replace locale */
                replace: string;
                /** Remove a locale */
                remove: string;
            };
        };
        /** The keyboard shortcut reference dialog */
        help: DialogText & {
            subheader: {
                moveCursor: string;
                editCode: string;
                insertCode: string;
                debug: string;
            };
        };
    };
    save: {
        /** Shown when saving has started */
        saving: string;
        /** Shown when online saving was successful */
        saved: string;
        /** Shown when saving on device was successful */
        local: string;
        /** Shown when there was a problem saving */
        unsaved: string;
    };
    page: {
        /** The unknown route page */
        unknown: {
            /** The header for the unknown route */
            header: string;
            /** The message for the unknown route */
            message: string;
        };
        landing: {
            /** What function says as a call to action */
            call: Template[];
            /** The value proposition for the site */
            value: Template;
            /** A description of the platform's features */
            description: Template;
            /** The landing page beta warning */
            beta: Template[];
            /** The subtitles below links */
            link: {
                /** What content is on the about page */
                about: string;
                /** What content is on the learn page */
                learn: string;
                /** What content is on the projects page */
                projects: string;
                /** What content is on the galleries page */
                galleries: string;
                /** What content is on the rights page */
                rights: string;
            };
        };
        learn: {
            /** The header for the tutorial page */
            header: string;
            /** When the tutorial could not be found */
            error: string;
            button: {
                /** Advance to the next pause in the dialog */
                next: string;
                /** Navigate back to the previous pause in the dialog */
                previous: string;
            };
            /** Labels for drop down menus */
            options: {
                /** The label for the lesson drop down */
                lesson: string;
            };
        };
        /** The project creation and browsing page */
        projects: {
            /** Header for the projects page */
            header: string;
            /** Explanation for the project page */
            projectprompt: string;
            /** The header for the archived subsection */
            archiveheader: string;
            /** Explanation for the archive subsection */
            archiveprompt: string;
            /** Header for the galleries page */
            galleriesheader: string;
            /** A prompt to create galleries */
            galleryprompt: string;
            /** Buttons on the project page */
            button: {
                /** Create a new project */
                newproject: string;
                /** Edit a project */
                editproject: string;
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
        galleries: {
            /** How to describe galleries of projects */
            header: string;
            /** Explanation for the galleries page */
            prompt: string;
            /** The subheader for the examples */
            examples: string;
        };
        about: {
            /** Header for the about page */
            header: string;
            /** Text for the about page */
            content: string[];
        };
        /** The login and account page */
        login: {
            /** Header for the login page when not logged in */
            header: string;
            /** Subtitle for the header link on the landing page */
            subtitle: string;
            prompt: {
                /** Prompts creator to login to save their work */
                login: string;
                /** Forgot password regrets */
                forgot: string;
                /** Email login explanation */
                email: string;
                /** Prompt to check email for a login link. */
                sent: string;
                /** Tells the creator that they can change their email address. */
                changeEmail: string;
                /** Tells the creator that they can cahnge their password */
                changePassword: string;
                /** Asks the creator to enter their email if they opened the email link in a different browser. */
                enter: string;
                /** Encouragement to go create after logging in. */
                play: string;
                /** Description of password rules */
                passwordrule: string;
                /** Reminder to write down password */
                passwordreminder: string;
                /** Too young feedback */
                tooyoung: string;
                /** Offers to log out the creator. */
                logout: string;
                /** Shown briefly before page redirects to projects */
                success: string;
                /** Prompts creator to check their original email to confirm the email change */
                confirm: string;
                /** Offers to delete account */
                delete: string;
                /** Offers to really delete account forever */
                reallyDelete: string;
                /** Pick an emoji as a name */
                name: string;
            };
            /** Shown in the footer a creator is not logged in. */
            anonymous: string;
            field: {
                /** The login email */
                email: FieldText;
                /** The login username */
                username: FieldText;
                /** The login password */
                password: FieldText;
                /** The old password */
                currentPassword: FieldText;
                /** The new password */
                newPassword: FieldText;
            };
            feedback: {
                /** Change email pending */
                changing: string;
                /** Account deleting pending */
                deleting: string;
                /** Password successfully updated */
                updatedPassword: string;
                /** Email or username must match to delete account */
                match: string;
            };
            error: {
                /** Shown when the login link expired */
                expired: string;
                /** Shown when the login link isn't valid */
                invalid: string;
                /** Shown when the email address isn't valid */
                email: string;
                /** Unknown failure to login */
                failure: string;
                /** When there's no connection to Firebase */
                offline: string;
                /** When the email address couldn't be changed for unknown reasons. */
                unchanged: string;
                /** When account deletion failed */
                delete: string;
                /** When a password is wrong */
                wrongPassword: string;
            };
            button: {
                /** Log out of the account */
                logout: ButtonText;
                /** Login button description */
                login: string;
                /** Update email button description  */
                updateEmail: string;
                /** Delete account button */
                delete: ButtonText;
                /** Confirm deletion */
                reallyDelete: ButtonText;
                /** Update password */
                updatePassword: string;
            };
            toggle: {
                /** Reveal password toggle */
                reveal: ToggleText;
            };
        };
        join: {
            /** The account creation header */
            header: string;
            /** Requests for information on the account creation page */
            prompt: {
                /** Username rules */
                username: string;
                /** Password rules and warnings */
                password: string;
            };
        };
        /** The rights/terms of service page */
        rights: {
            /** Header for the rights page */
            header: string;
            /** Paragraphs for the rights page */
            content: Template[];
            /** The consequences of violating a promise. */
            consequences: Template[];
        };
        /** Giving related text */
        donate: {
            /** The label for the link and header */
            header: Template;
            /** The explanation of the link */
            prompt: Template;
            /** The content of the page */
            content: Template[];
        };
    };
    /** Descriptions of cursor positions and code transformations */
    edit: EditTexts;
    template: {
        /** The placeholder indicating that a locale string is not yet written */
        unwritten: string;
        /** The placeholder string indicating that a template string could not be parsed */
        unparsable: string;
    };
};

export { type UITexts as default };
