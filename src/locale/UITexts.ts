import type { ProjectText } from '@components/project/ProjectView.svelte';
import type { SupportedFace } from '../basis/Fonts';
import type { TileKind } from '../components/project/Tile';
import type { UnknownPageText } from '../routes/+error.svelte';
import type { LandingPageText } from '../routes/+page.svelte';
import type { AboutPageText } from '../routes/about/+page.svelte';
import type { DonatePageText } from '../routes/donate/+page.svelte';
import type { GalleriesPageText } from '../routes/galleries/+page.svelte';
import type { GalleryPageText } from '../routes/gallery/[galleryid]/+page.svelte';
import type { GuidePageText } from '../routes/guide/Guide.svelte';
import type { JoinPageText } from '../routes/join/Join.svelte';
import type { LearnPageText } from '../routes/learn/+page.svelte';
import type { LoginPageText } from '../routes/login/Login.svelte';
import type { ProjectsPageText } from '../routes/projects/+page.svelte';
import type { RightsPageText } from '../routes/rights/+page.svelte';
import type { TeachPageText } from '../routes/teach/+page.svelte';
import type { ClassPageText } from '../routes/teach/class/[classid]/+page.svelte';
import type { NewClassPageText } from '../routes/teach/class/new/+page.svelte';
import type EditTexts from './EditTexts';
import type { GalleryText } from './GalleryTexts';
import type { DocText, Template } from './LocaleText';
import type { CheckpointsText } from '@components/project/Checkpoints.svelte';

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
        /** An editable table */
        table: {
            /** The field to edit a cell */
            cell: FieldText;
            /** The button to remove a row from the table */
            addcolumn: string;
            /** The button to remove a row from the table */
            removecolumn: string;
        };
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
    project: ProjectText;
    /** Checkpoints text */
    checkpoints: CheckpointsText;
    /** Gallery page labels */
    gallery: GalleryPageText;
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
            /** Insert ¶ symbol */
            insertDocs: string;
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
            /** Toggle elision */
            elide: string;
        };
    };
    /** The conflicts area in the margin of the editor. */
    annotations: {
        /** The ARIA label for the conflicts section in the editor. */
        label: string;
        /** The description of the cursor position */
        cursor: Template;
        /** The description fo the cursor position's parent */
        cursorParent: Template;
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
        options: {
            /** The label for the locale chooser in output */
            locale: string;
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
    /** The project chat */
    collaborate: {
        /** The ARIA label for the chat section */
        label: string;
        /** The chat message input field */
        field: {
            /** The chat message input field */
            message: FieldText;
        };
        role: {
            /** What to call the owner of a project */
            owner: string;
            /** What to call collaborators */
            collaborators: string;
            /** What to call curators */
            curators: string;
        };
        /** Buttons in the chat tile */
        button: {
            /** The chat send button */
            submit: ButtonText;
            /** The start a chat button */
            start: ButtonText;
            /** The message delete button */
            delete: string;
        };
        /** Errors that can happen in the chat tile */
        error: {
            /** The project isn't owned by a person */
            unowned: string;
            /** Offline, or couldn't load the chat */
            offline: string;
            /** No messages in the chat */
            empty: string;
            /** A message was deleted */
            deleted: string;
        };
        /** Messages to explain the purpose */
        prompt: {
            solo: string;
            owner: string;
            collaborator: string;
            curator: string;
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
                /** The space_indicator on/off mode */
                space: ModeText<[string, string]>;
                /** The line number on/off mode */
                lines: ModeText<[string, string]>;
                /** The localized none/localized/symbolic mode */
                localized: ModeText<[string, string, string]>;
            };
            options: {
                /** The label for the font face chooser */
                face: string;
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
        unknown: UnknownPageText;
        /** Landing page text */
        landing: LandingPageText;
        /** Tutorial page text */
        learn: LearnPageText;
        /** Teacher landing page text */
        teach: TeachPageText;
        /** New class page text */
        newclass: NewClassPageText;
        /** Class page text */
        class: ClassPageText;
        /** Docuemntation guide page text */
        guide: GuidePageText;
        /** The project creation and browsing page */
        projects: ProjectsPageText;
        /** Gallery browsing page text */
        galleries: GalleriesPageText;
        /** About page text */
        about: AboutPageText;
        /** The login and account page */
        login: LoginPageText;
        /** Account creation page text */
        join: JoinPageText;
        /** The rights/terms of service page */
        rights: RightsPageText;
        /** Giving related text */
        donate: DonatePageText;
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
