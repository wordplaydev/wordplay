import type { SupportedFaces } from '../basis/Fonts';
import type EditTexts from './EditTexts';
import type { DocText, Template } from './Locale';

export type ButtonText = {
    label: string;
    tip: string;
};

export type ToggleText = {
    on: string;
    off: string;
};

export type ModeText<Modes extends string[]> = {
    label: string;
    modes: Modes;
};

export type DialogText = {
    header: string;
    explanation: string;
};

export type ConfirmText = {
    description: string;
    prompt: string;
};

export type FieldText = {
    description: string;
    placeholder: string;
};

type UITexts = {
    font: {
        app: (typeof SupportedFaces)[number];
        code: (typeof SupportedFaces)[number];
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
    };
    /** Controls for the tiled windows in the project */
    tile: {
        button: {
            /** Collapse the tile window */
            collapse: string;
        };
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
        };
        toggle: {
            /** Whether the project is public or private */
            public: ToggleText;
        };
        field: {
            /** The project name text field */
            name: {
                description: string;
                placeholder: string;
            };
        };
        /** The keyboard shortcut to show the shortcut menu */
        help: string;
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
            delete: {
                description: string;
                prompt: string;
            };
        };
        toggle: {
            /** The blocks/text toggle */
            blocks: ToggleText;
            /** The glyph chooser expand/collapse toggle */
            glyphs: ToggleText;
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
            /** Insert ← symbol */
            insertPrevious: string;
            /** Insert → symbol */
            insertConvert: string;
            /** Insert table symbol */
            insertTable: string;
            /** Insert new line */
            insertLine: string;
            /** Delete previous symbol */
            backspace: string;
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
        };
    };
    /** The conflicts area at the bottom of the editor. */
    conflicts: {
        /** The ARIA label for the conflicts section in the editor. */
        label: string;
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
            /** The invisible text field that accepts key input when a key stream is active */
            key: string;
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
            text: string;
            coordinate: string;
        };
        sequence: {
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
            field: {
                /** The email address of the collaborator being added */
                email: {
                    placeholder: string;
                    description: string;
                };
            };
            error: {
                /** When someone tries to add an email collaborator that doesn't have a Wordplay account */
                unknown: string;
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
        };
        /** The locale chooser dialog */
        locale: DialogText & {
            subheader: {
                /** How to label the locales that have been selected */
                selected: string;
                /** How to label the supported locales that have not been selected */
                supported: string;
                /** How to request help with localization */
                help: string;
            };
            button: {
                /** Show the locale chooser dialog */
                show: string;
                /** Add a locale */
                add: string;
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
            /** The motto for Wordplay on the landing page. */
            motto: string;
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
        };
        /** The project creation and browsing page */
        projects: {
            /** Header for the projects page */
            header: string;
            /** Explanation for the project page */
            prompt: string;
            button: {
                /** Create a new project */
                create: string;
                /** Edit a project */
                edit: string;
            };
            confirm: {
                /** The project archive button */
                archive: ConfirmText;
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
            /** Header for the login page */
            header: string;
            prompt: {
                login: string;
                enter: string;
                anonymous: string;
                change: string;
                check: string;
                play: string;
                logout: string;
            };
            /** Shown when using an anonymous account instead of creator's email */
            anonymous: string;
            submit: string;
            sent: string;
            success: string;
            field: {
                /** The login email */
                email: {
                    description: string;
                    placeholder: string;
                };
            };
            error: {
                expired: string;
                invalid: string;
                email: string;
                other: string;
                failure: string;
                offline: string;
            };
            button: {
                logout: ButtonText;
                login: ButtonText;
                update: ButtonText;
            };
        };
        /** The rights/terms of service page */
        rights: {
            /** Header for the rights page */
            header: string;
            /** Paragraphs for the rights page */
            content: string[];
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

export default UITexts;
