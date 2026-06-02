import type { SupportedFace } from '@basis/Fonts';
import type { TileKind } from '@components/project/TileKind';
import type { FormattedText, Template } from '@locale/LocaleText';

import type DocumentationText from '@components/concepts/DocumentationText';
import type CheckpointsText from '@components/project/CheckpointsText';
import type EditTexts from '@locale/EditTexts';
import type ErrorText from '../routes/ErrorText';
import type LandingPageText from '../routes/[[locale]]/PageText';
import type AboutPageText from '../routes/[[locale]]/about/PageText';
import type CharacterPageText from '../routes/[[locale]]/character/[id]/PageText';
import type CharactersPageText from '../routes/[[locale]]/characters/PageText';
import type DesignPageText from '../routes/[[locale]]/design/PageText';
import type DonatePageText from '../routes/[[locale]]/donate/PageText';
import type GalleriesPageText from '../routes/[[locale]]/galleries/PageText';
import type GalleryModerationPageText from '../routes/[[locale]]/galleries/moderation/PageText';
import type GalleryPageText from '../routes/[[locale]]/gallery/[galleryid]/PageText';
import type HowToPageText from '../routes/[[locale]]/gallery/[galleryid]/howto/PageText';
import type { default as GuidePageText } from '../routes/[[locale]]/guide/PageText';
import type JoinPageText from '../routes/[[locale]]/join/PageText';
import type LearnPageText from '../routes/[[locale]]/learn/PageText';
import type LocalizePageText from '../routes/[[locale]]/localize/PageText';
import type LoginPageText from '../routes/[[locale]]/login/PageText';
import type ProjectsPageText from '../routes/[[locale]]/projects/PageText';
import type RightsPageText from '../routes/[[locale]]/rights/PageText';
import type TeachPageText from '../routes/[[locale]]/teach/PageText';
import type ClassPageText from '../routes/[[locale]]/teach/class/[classid]/PageText';
import type NewClassPageText from '../routes/[[locale]]/teach/class/new/PageText';
import type ThanksPageText from '../routes/[[locale]]/thanks/PageText';
import type UpdatesPageText from '../routes/[[locale]]/updates/PageText';

export type ButtonText = {
    /** [plain] The buttons label */
    label: string;
    /** [plain] THe buttons tooltip and ARIA-label, spoken by screen readers */
    tip: string;
};

export type ToggleText = {
    /** [plain] The tooltip and ARIA-label for when the toggle is in the on state */
    on: string;
    /** [plain] The tooltip and ARIA-label for when the toggle is in the off state */
    off: string;
};

export type ModeText<Options extends readonly string[]> = {
    /** [plain] The tooltip and ARIA-label for the entire mode widget, describing the kind of modes it supports switching to. */
    label: string;
    /** [plain] A list of short labels, one per mode */
    labels: Options;
    /** [plain] A list of tooltip/ARIA descriptions, one per mode */
    tips: Options;
};

export type HeaderAndExplanationText = {
    /** [plain] The header to be shown at the top of the dialog */
    header: string;
    /** [formatted] The explanation text just below the header. */
    explanation: FormattedText | FormattedText[];
};

export type ConfirmText = {
    /** [plain] The tooltip and ARIA-label for the button */
    description: string;
    /** [plain] The confirmation prompt to show after clicked the first time. */
    prompt: string;
};

export type FieldText = {
    /** [plain] The tooltip and ARIA-label for the text field */
    description: string;
    /** [plain] The placeholder text fo the text field. */
    placeholder: string;
};

type UITexts = {
    font: {
        /** The application font to use throughout the application. Should support the language used in this locale so that characters render correctly. Add the face to Fonts.ts if the one you choose is not yet supported. */
        app: SupportedFace;
        /** The monospace font to use for code in the editor and code examples. Should support the language used in this locale so that characters render correctly. Add the face to Fonts.ts if the one you choose is not yet supported. */
        code: SupportedFace;
        /** [plain] The word shown before the markup symbols that a font face doesn't support (e.g. "missing * ^" for a face without bold or extra bold) */
        missing: string;
    };
    phrases: {
        /** [plain] Placeholder text used in code examples. */
        welcome: string;
    };
    /** Generic reusable widgets and their generic labels. */
    widget: {
        /** A confirm button */
        confirm: {
            /** [plain] The 'x' cancel button after a confirm button has been pressed. */
            cancel: string;
        };
        /** A modal dialog */
        dialog: {
            /** [plain] The close button on modal dialogs */
            close: string;
        };
        /** The page loading widget, before content is shown */
        loading: {
            /** [plain] The message shown in the page loading feedback */
            message: string;
        };
        /** [plain] The go home button description */
        home: string;
        /** An editable table */
        table: {
            /** The field to edit a cell */
            cell: FieldText;
            /** [plain] The button to remove a row from the table */
            addcolumn: string;
            /** [plain] The button to remove a row from the table */
            removecolumn: string;
        };
        /** Formatted text editor */
        formatted: {
            /** [plain] The edit mode */
            edit: string;
            /** [plain] The preview mode */
            preview: string;
            /** [plain] The highlight example button */
            highlight: string;
            /** [plain] The bullet list item button */
            bullet: string;
            /** [plain] The highlight line of code button (👀) */
            attention: string;
        };
        /** The color chooser widget */
        color: {
            /** The eyedropper button that picks a color from the screen */
            pick: ButtonText;
            /** [plain] Screen-reader role description for the 2-D chroma×hue color field */
            field: string;
            /** [plain] Screen-reader usage instructions for adjusting the color field with the keyboard */
            instructions: string;
            /** [plain] The spoken color readout: the described color name followed by its lightness, chroma, and hue values, e.g. "dark grey, LCH 50, 117, 90" */
            value: Template<['color', 'l', 'c', 'h']>;
        };
        /** [plain] The back to top link label */
        backtotop: string;
        /** The overflow toolbar toggle that reveals clipped toolbar items */
        overflow: {
            /** The toggle button that shows or hides the overflow panel */
            button: ToggleText;
            /** [plain] ARIA label for the overflow panel */
            popup: string;
        };
    };
    /** Controls for the tiled windows in the project */
    tile: {
        button: {
            /** [plain] Collapse the tile window */
            collapse: string;
        };
        /** [plain] Tile labels appearing in the project footer tile toggles, except for source files. */
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
        /** [plain] The label for the bottom-row project controls section */
        label: string;
        defaults: {
            /** [plain] The default template shown when opening a new project */
            starterCode: string;
        };
        /** The error shown when a project ID is unknown. */
        error: {
            /** [plain] Shown when a project doesn't exist or the user doesn't have access */
            unknown: string;
            /** [plain] The error to show if translation wasn't possible */
            translate: string;
            /** [plain] The message for an error in a tile */
            tile: string;
            /** [plain] The button label for an error reset */
            reset: string;
        };
        button: {
            /** Shows the sharing dialog */
            share: ButtonText;
            /** [plain] Remove a collaborator that has been shared with */
            removeCollaborator: string;
            /** Copy the project as text to the clipboard */
            copy: ButtonText;
            /** [plain] Add a source file */
            addSource: string;
            /** Duplicate the project */
            duplicate: ButtonText;
            /** [plain] Revert project to original code */
            revert: string;
            /** [plain] Keyboard shortcut to focus output tile */
            focusOutput: string;
            /** [plain] Keyboard shortcut to focus source tiles */
            focusSource: string;
            /** [plain] Keyboard shortcut to focus documentation tile */
            focusDocs: string;
            /** [plain] Keyboard shortcut to focus palette tiles */
            focusPalette: string;
            /** [plain] Keyboard shortcut to cycle between tiles */
            focusCycle: string;
            /** [plain] Tooltip for saved or saving status locally */
            savedLocally: string;
            /** [plain] Tooltip for saved or saving status online */
            savedOnline: string;
            /** [plain] Show save error button */
            unsaved: string;
            /** Show translation button */
            translate: ButtonText;
            /** [plain] The tooltip for the primary locale setting button */
            primary: string;
        };
        field: {
            /** [name] The project name text field */
            name: FieldText & {
                /** [plain] Shown when the typed name looks like a
                 *  multilingual text literal (e.g. starts with a quote)
                 *  but doesn't parse cleanly — missing close quote,
                 *  missing language tag, trailing garbage, etc. */
                invalid: string;
            };
        };
        /** [plain] The keyboard shortcut to show the shortcut menu */
        help: string;
        /** [plain] The text to show when all of the tiles are collapsed. */
        collapsed: string;
        /** The messages shown for save status */
        save: {
            /** [formatted] When projects fail to save locally */
            projectsNotSavedLocally: FormattedText;
            /** [formatted] When projects can't save locally */
            projectsCannotNotSaveLocally: FormattedText;
            /** [formatted] When a project wasn't saved because it contained PII */
            projectContainedPII: FormattedText;
            /** [formatted] Projects failed to load */
            projectsNotLoadingOnline: FormattedText;
            /** [formatted] When a project couldn't be saved to the database */
            projectNotSavedOnline: FormattedText;
            /** [formatted] When settings are being saved */
            settingsUnsaved: FormattedText;
            /** Per-reason explanations shown in the save-failure dialog,
             *  grouped above the list of affected project names. */
            failureReason: {
                /** [formatted] Browser local save failed (IndexedDB write error) */
                indexedDBWriteFailed: FormattedText;
                /** [formatted] Browser doesn't support saving projects locally */
                indexedDBUnsupported: FormattedText;
                /** [formatted] Sending projects to the cloud failed */
                firestoreBatchFailed: FormattedText;
                /** [formatted] Project contained personal info so wasn't sent online */
                projectContainsPII: FormattedText;
            };
            /** [plain] Header above the per-project failure list. $count = total count */
            failuresHeader: Template<['count']>;
        };
        dialog: {
            /** [formatted] The header for the save error */
            unsaved: FormattedText;
            /** The content for the translation dialog */
            translate: HeaderAndExplanationText;
        };
        subheader: {
            /** [formatted] The header for the source language */
            source: FormattedText;
            /** [formatted] The header for the destination language */
            destination: FormattedText;
        };
        toggle: {
            /** [plain] Tip text for the project full screen button */
            fullscreen: ToggleText;
        };
        /** Interactive tour explaining the bottom-row project controls */
        tour: {
            /** [plain] Tooltip on the help button that opens the tour */
            launch: string;
            /** [formatted] Markup describing the project controls bar overall */
            controls: FormattedText;
            /** [formatted] Markup describing the project name field */
            name: FormattedText;
            /** [formatted] Markup describing the source-tile toggles */
            sourceToggle: FormattedText;
            /** [formatted] Markup describing the add-source button */
            addSource: FormattedText;
            /** [formatted] Markup describing the share dialog button */
            share: FormattedText;
            /** [formatted] Markup describing the translate button */
            translate: FormattedText;
            /** [formatted] Markup describing the checkpoints/revisions panel */
            checkpoints: FormattedText;
        };
    };
    /** Checkpoints text */
    checkpoints: CheckpointsText;
    /** Gallery page labels */
    gallery: GalleryPageText;
    /** Gallery moderation page labels */
    gallerymoderation: GalleryModerationPageText;
    /** How-to space page labels */
    howto: HowToPageText;
    /** Source file controls */
    source: {
        /** [plain] The ARIA label for the source file section */
        label: string;
        /** [plain] The label for the code editor toolbar */
        title: string;
        /** [formatted] The text to show when a source file is empty */
        empty: Template<['symbol']>[];
        confirm: {
            /** [plain] The confirm button that deletes a source file */
            delete: ConfirmText;
        };
        toggle: {
            /** [plain] The blocks/text toggle */
            blocks: ToggleText;
            /** [plain] The character chooser expand/collapse toggle */
            characters: ToggleText;
            /** [plain] The toggle for expanding and collapsing a long list of items in the editor */
            expandSequence: ToggleText;
            /** [plain] The toggle that shows or hides the editor search field */
            search: ToggleText;
        };
        button: {
            /** [plain] Output preview button for selecting output for display in output tile */
            selectOutput: string;
            /** [plain] The button tooltip for expanding the controls accordion */
            expandControls: string;
            /** [plain] The button tooltip for collapsing the controls accordion */
            collapseControls: string;
            /** [plain] The zoom in button for the code editor */
            zoomIn: string;
            /** [plain] The zoom out button for the code editor */
            zoomOut: string;
            /** [plain] The button that replaces all search matches with the replacement text */
            replace: string;
        };
        menu: {
            /** [plain] How to describe the autocomplete menu */
            label: string;
            /** [plain] The menu show button and keyboard shortcut */
            show: string;
            /** [plain] What to say when the menu is empty */
            empty: string;
        };
        field: {
            /** [name] The name of the source file */
            name: FieldText;
            /** [plain] The placeholder and ARIA description for the editor token search field */
            search: string;
            /** [plain] The placeholder and ARIA description for the editor replace field */
            replace: string;
        };
        options: {
            /** The locale chooser for a source file */
            locale: {
                /** [plain] Tooltip for the per-source locale chooser */
                tip: string;
                /** [plain] The "no filter" option in the editor locale chooser, showing how many languages are currently visible in the editor. $count is the number of languages. */
                all: Template<['count']>;
            };
        };
        cursor: {
            /** [plain] Move caret to the line before */
            priorLine: string;
            /** [plain] Move caret to the line after */
            nextLine: string;
            /** [plain] Move cursor inline one position before */
            priorInline: string;
            /** [plain] Move cursor inline one position after */
            nextInline: string;
            /** [plain] Expand selection before inline */
            expandBeforeInline: string;
            /** [plain] Expand selection after inline */
            expandAfterInline: string;
            /** [plain] Expand selection to prior line */
            expandPriorLine: string;
            /** [plain] Expand selection to next line */
            expandNextLine: string;
            /** [plain] Move cursor to line start */
            lineStart: string;
            /** [plain] Move cursor to line end */
            lineEnd: string;
            /** [plain] Move cursor to start of source */
            sourceStart: string;
            /** [plain] Move cursor to end of source */
            sourceEnd: string;
            /** [plain] Move cursor to node prior */
            priorNode: string;
            /** [plain] Move cursor to node after */
            nextNode: string;
            /** [plain] Select parent of node */
            parent: string;
            /** [plain] Select the whole program */
            selectAll: string;
            /** [plain] Move cursor to the next search match */
            nextMatch: string;
            /** [plain] Increment the literal at the cursor */
            incrementLiteral: string;
            /** [plain] Decrement the literal at the cursor */
            decrementLiteral: string;
            /** [plain] Insert tab symbol */
            insertTab: string;
            /** [plain] Insert true symbol */
            insertTrue: string;
            /** [plain] Insert false symbol */
            insertFalse: string;
            /** [plain] Insert none symbol */
            insertNone: string;
            /** [plain] Insert ≠ symbol */
            insertNotEqual: string;
            /** [plain] Insert × symbol */
            insertProduct: string;
            /** [plain] Insert · symbol */
            insertDot: string;
            /** [plain] Insert ÷ symbol */
            insertQuotient: string;
            /** [plain] Insert ° symbol */
            insertDegree: string;
            /** [plain] Insert ƒ symbol */
            insertFunction: string;
            /** [plain] Insert ≤ symbol */
            insertLessOrEqual: string;
            /** [plain] Insert ≥ symbol */
            insertGreaterOrEqual: string;
            /** [plain] Insert • symbol */
            insertType: string;
            /** [plain] Insert ¶ symbol */
            insertDocs: string;
            /** [plain] Insert … symbol */
            insertStream: string;
            /** [plain] Insert ∆ symbol */
            insertChange: string;
            /** [plain] Insert ← symbol */
            insertPrevious: string;
            /** [plain] Insert → symbol */
            insertConvert: string;
            /** [plain] Insert ↦ translate symbol */
            insertTranslate: string;
            /** [plain] Insert ⬚ this symbol */
            insertThis: string;
            /** [plain] Insert table symbol */
            insertTable: string;
            /** [plain] Insert borrow symbol */
            insertBorrow: string;
            /** [plain] Insert share symbol */
            insertShare: string;
            /** [plain] Insert new line */
            insertLine: string;
            /** [plain] Delete previous symbol */
            backspace: string;
            /** [plain] Delete next symbol */
            delete: string;
            /** [plain] Copy selection to clipboard as text */
            copy: string;
            /** [plain] Cut selection to clipboard as text */
            cut: string;
            /** [plain] Paste clipboard text as code */
            paste: string;
            /** [plain] Parenthesize selection */
            parenthesize: string;
            /** [plain] Listify selection */
            enumerate: string;
            /** [plain] Insert a symbol */
            type: string;
            /** [plain] Undo last edit */
            undo: string;
            /** [plain] Redo undone edit */
            redo: string;
            /** [plain] Search for character */
            search: string;
            /** [plain] Tidy spacing */
            tidy: string;
            /** [plain] Toggle elision */
            elide: string;
            /** [plain] Large deletion notification */
            largeDelete: string;
            /** Explanations for why something isn't editable */
            ignored: {
                /** [plain] The source is not editable */
                readOnly: string;
                /** [plain] No spaces in block mode unless in editable */
                blockSpace: string;
                /** [plain] A node couldn't be deleted */
                noDelete: string;
                /** [plain] An insertion failed */
                noInsert: string;
                /** [plain] No errors allowed */
                noError: string;
                /** [plain] No editor active */
                noEditor: string;
                /** [plain] No clipboard */
                noClipboard: string;
                /** [plain] No clipboard item */
                noClipboardItem: string;
                /** [plain] No selection */
                noSelection: string;
                /** [plain] No where to go */
                noMove: string;
            };
        };
        error: {
            /** [plain] An invalid source name */
            invalidName: string;
            /** [plain] Invalid words in a words token editor */
            invalidWords: string;
        };
        /** Interactive tour explaining the source/code tile */
        tour: {
            /** [plain] Tooltip on the help button that opens the tour */
            launch: string;
            /** [formatted] Markup describing the editor */
            editor: FormattedText;
            /** [formatted] Markup describing the text/blocks toggle */
            textBlocks: FormattedText;
            /** [formatted] Markup describing the toolbar group of editing actions */
            toolbar: FormattedText;
            /** [formatted] Markup describing the expand toggle for advanced tools */
            expand: FormattedText;
            /** [formatted] Markup describing the keyboard shortcuts dialog trigger */
            shortcuts: FormattedText;
        };
    };
    /** The conflicts area in the margin of the editor. */
    annotations: {
        /** [plain] The ARIA label for the conflicts section in the editor. */
        label: string;
        /** [formatted] The description of the cursor position */
        cursor: Template<['node', 'type', 'description']>;
        /** [formatted] The description fo the cursor position's parent */
        cursorParent: Template<['node', 'type']>;
        /** [formatted] The prompt to line more about the cursor node */
        learn: FormattedText;
        /** [formatted] What function should say when evaluating */
        evaluating: FormattedText;
        /** [formatted] What function should say when the cursor is in space */
        space: FormattedText;
        /** [formatted] The description of what the selected node does. $1: the node description. */
        nodeDescription: Template<['description']>;
        button: {
            /** [formatted] How the resolution button should should be described */
            resolution: FormattedText;
            /** [plain] The button to toggle the annotations */
            toggle: string;
            /** [plain] The button to show the annotation's node in the code */
            highlight: string;
        };
    };
    output: {
        /** [plain] The ARIA label for the output section */
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
            /** [plain] The chat submit button */
            submit: string;
            /** [plain] Zoom in output button */
            zoomIn: string;
            /** [plain] Zoom in output button */
            zoomOut: string;
            /** [plain] Reset the zoom to the stage's computed place when one is set */
            resetZoom: string;
            /** [plain] The rotation handle on a selected phrase */
            rotate: string;
            /** [plain] The size handle on a selected phrase */
            resize: string;
        };
        options: {
            /** [plain] The label for the locale chooser in output */
            locale: string;
            /** [plain] The "no filter" option in the output locale chooser, showing how many languages are available to choose from. $count is the number of languages. */
            default: Template<['count']>;
        };
        /** Interactive tour explaining the stage tile */
        tour: {
            /** [plain] Tooltip on the help button that opens the tour */
            launch: string;
            /** [formatted] Markup describing the stage area */
            stage: FormattedText;
            /** [formatted] Markup describing the reset zoom button */
            reset: FormattedText;
            /** [formatted] Markup describing the two zoom buttons */
            zoom: FormattedText;
            /** [formatted] Markup describing the grid toggle */
            grid: FormattedText;
            /** [formatted] Markup describing the lock/fit toggle */
            lock: FormattedText;
            /** [formatted] Markup describing the animation speed control */
            animationSpeed: FormattedText;
        };
        /** The pre-evaluation splash shown when a project requires a browser permission. */
        permission: {
            /** [plain] Heading on the splash explaining that the project needs browser permission */
            title: string;
            /** [plain] Microphone permission label on the splash */
            microphone: string;
            /** [plain] Camera permission label on the splash */
            camera: string;
            /** [plain] Note below the permission list explaining the browser will prompt */
            note: string;
            /** [plain] Label of the button that starts the project after the splash */
            start: string;
            /** [plain] Label of the button that retries permission after a denial */
            retry: string;
        };
    };
    /** The documentation browser */
    docs: DocumentationText;
    /** The project chat */
    collaborate: {
        /** [plain] The ARIA label for the chat section */
        label: string;
        /** The chat message input field */
        field: {
            /** The chat message input field */
            message: FieldText;
        };
        role: {
            /** [plain] What to call the owner of a project */
            owner: string;
            /** [plain] What to call collaborators */
            collaborators: string;
            /** [plain] What to call curators */
            curators: string;
            /** [plain] What to call commenters */
            commenters: string;
            /** [plain] What to call viewers */
            viewers: string;
        };
        /** Buttons in the chat tile */
        button: {
            /** The chat send button */
            submit: ButtonText;
            /** The start a chat button */
            start: ButtonText;
            /** [plain] The message delete button */
            delete: string;
            /** [plain] Confirm deleting the message */
            confirmDelete: string;
        };
        /** Dialog for chat moderation */
        moderation: HeaderAndExplanationText & {
            /** The "report" button shown on a chat message */
            report: ButtonText;
            /** The "moderate" button shown to moderators on a chat message */
            moderate: ButtonText;
            /** [plain] Shown in place of a message that is awaiting moderation */
            pending: string;
            /** [plain] Shown in place of a message that moderators removed */
            removed: string;
            /** [formatted] Notice shown when the project is in a gallery, explaining moderator visibility */
            inGallery: FormattedText;
        };
        /** Errors that can happen in the chat tile */
        error: {
            /** [plain] The project isn't owned by a person */
            unowned: string;
            /** [plain] Offline, or couldn't load the chat */
            offline: string;
            /** [plain] No messages in the chat */
            empty: string;
            /** [plain] A message was deleted */
            deleted: string;
        };
        /** Messages to explain the purpose of the chat to each kind of participant */
        prompt: {
            /** [plain] Shown when the user is the only participant; invites them to add collaborators */
            solo: string;
            /** [plain] Shown to the project owner; describes what collaborators and commenters can do */
            owner: string;
            /** [plain] Shown to collaborators; describes their editing and chat permissions */
            collaborator: string;
            /** [plain] Shown to gallery curators; describes their editing and chat permissions */
            curator: string;
            /** [plain] Shown to commenters; describes their chat-only permissions */
            commenter: string;
        };
        /** Controls for restricting project visibility when it is in a gallery */
        restrictGalleryCreatorAccess: {
            /** [formatted] Explains that the project is in a gallery and describes the visibility restriction option */
            explanation: FormattedText;
            /** The toggle mode for restricting project visibility to owner and curators only */
            mode: ModeText<[string, string]>;
        };
        /** Interactive tour explaining the collaborate tile */
        tour: {
            /** [plain] Tooltip on the help button that opens the tour */
            launch: string;
            /** [formatted] Markup describing the collaborate panel */
            collaborate: FormattedText;
            /** [formatted] Markup describing the collaborators field */
            collaborators: FormattedText;
            /** [formatted] Markup describing the commenters field */
            commenters: FormattedText;
            /** [formatted] Markup describing the viewers field */
            viewers: FormattedText;
            /** [formatted] Markup describing the restrict-gallery toggle */
            restrict: FormattedText;
        };
    };

    /** Strings shown by the live-presence layer when other people are
     *  editing the same project. See PresenceTracker and RemoteCarets. */
    presence: {
        /** [plain] ARIA label for the row of collaborator chips in the editor footer */
        peersLabel: string;
        /** [plain] Announcer message when a peer first appears (joins the project). $name is the peer's display name. */
        joined: Template<['name']>;
        /** [plain] Announcer message when a peer's presence falls out of the map (left or went idle). $name is the peer's display name. */
        left: Template<['name']>;
        /** [plain] Banner shown when the local editor can't get a presence slot because the concurrent-editor cap is already reached. */
        waitingForSlot: string;
    };

    /** The palette editor */
    palette: {
        /** [plain] The ARIA label for the palette section */
        label: string;
        labels: {
            /** [plain] Shown in the output palette when multiple outputs are selected but they have unequal values. */
            mixed: string;
            /** [plain] Shown in the output palette when the output(s) selected have expressions that are not editable using the editor. */
            computed: string;
            /** [plain] Shown in the output palette when the output(s) selected have no value set, but have a default */
            default: string;
            /** [plain] Shown in the output palette when a value is unset but is inherited */
            inherited: string;
            /** [plain] Shown in the output palette when a sequence isn't valid */
            notSequence: string;
            /** [plain] The word to describe whether text is rich text formatted */
            format: string;
            /** [plain] The word to describe font weight */
            weight: string;
            /** [plain] The word to describe light font weight */
            light: string;
            /** [plain] The word to describe normal font weight */
            normal: string;
            /** [plain] The word to describe bold font weight */
            bold: string;
            /** [plain] The word to describe extra bold font weight */
            extra: string;
            /** [plain] The word to describe italic font style */
            italic: string;
            /** [plain] The word to describe underline text decoration */
            underline: string;
        };
        button: {
            /** [plain] Resets a property to it's default value */
            revert: string;
            /** [plain] Sets the property to a value, allowing modification */
            set: string;
            /** [plain] Add a group to the output */
            addGroup: string;
            /** [plain] Add a phrase to the output */
            addPhrase: string;
            /** [plain] Add a shape to the output */
            addShape: string;
            /** [plain] Set place to Motion stream */
            addMotion: string;
            /** [plain] Set place to Placement stream */
            addPlacement: string;
            /** [plain] Remove child from this output */
            remove: string;
            /** [plain] Move child up in list */
            up: string;
            /** [plain] Move child down in list */
            down: string;
            /** [plain] Edit the child */
            edit: string;
            /** [plain] Convert a pose to a sequence */
            sequence: string;
            /** [plain] The button that creates a phrase when there is none */
            createPhrase: string;
            /** [plain] The button that creates a group when there is none */
            createGroup: string;
            /** [plain] The button that creates a stage when there is none */
            createStage: string;
        };
        prompt: {
            /** [formatted] The text offering to create a phrase in the palette without a stage */
            offerPhrase: FormattedText;
            /** [formatted] The text offering to create a group in the palette without a stage */
            offerGroup: FormattedText;
            /** [formatted] The text offering to create a stage in the palette without a stage */
            offerStage: FormattedText;
            /** [formatted] Prompt if no selection */
            select: FormattedText;
            /** [formatted] The text prompting the creator to edit the selected output */
            editing: FormattedText;
        };
        field: {
            /** [plain] The tooltip and ARIA-label for the text input to Phrase */
            text: string;
            /** [plain] The tooltip and ARIA-label fro the text input for a Place coordinate */
            coordinate: string;
        };
        /** Widgets for editing sequences */
        sequence: {
            /** Buttons for editing sequences */
            button: {
                /** [plain] Add pose */
                add: string;
                /** [plain] Remove pose */
                remove: string;
                /** [plain] Move pose up */
                up: string;
                /** [plain] Move pose down */
                down: string;
            };
            /** Text fields for editing sequences */
            field: {
                /** [plain] Edit percent for pose */
                percent: string;
            };
        };
        /** Errors for the palette */
        error: {
            /** [plain] The value entered isn't a number */
            nan: string;
            /** [plain] 0-100 range */
            percent: string;
            /** [plain] Sequence percent must be greater than the last */
            moreThanPrevious: string;
            /** [plain] Sequence precent must be less than the next */
            lessThanNext: string;
        };
        /** Interactive tour explaining the palette tile */
        tour: {
            /** [plain] Tooltip on the help button that opens the tour */
            launch: string;
            /** [formatted] Markup describing the palette panel */
            palette: FormattedText;
            /** [formatted] Markup describing the property text field */
            text: FormattedText;
            /** [formatted] Markup describing the pencil button that promotes a default to an explicit value */
            set: FormattedText;
            /** [formatted] Markup describing the X button that removes an explicit value */
            unset: FormattedText;
            /** [formatted] Markup describing the editor's role for palette edits */
            editor: FormattedText;
            /** [formatted] Markup describing how phrases can be manipulated on stage */
            stage: FormattedText;
        };
    };
    /** The timeline view below the output */
    timeline: {
        /** [plain] The ARIA label for the timeline section */
        label: string;
        /** [plain] The label for the debug toolbar */
        debug: string;
        /** [plain] The description of the timeline slider */
        slider: string;
        button: {
            /** [plain] Evaluate in real time */
            play: string;
            /** [plain] Pause evaluation */
            pause: string;
            /** [plain] One step back */
            backStep: string;
            /** [plain] Step to the previous evaluation of the node at the cursor  */
            backNode: string;
            /** [plain] Step to the previous input */
            backInput: string;
            /** [plain] Step out of the current function evaluation */
            out: string;
            /** [plain] Step to the very beginning */
            start: string;
            /** [plain] Step forward one step */
            forwardStep: string;
            /** [plain] Step to the next evaluation of the node at the cursor */
            forwardNode: string;
            /** [plain] Step to the next input */
            forwardInput: string;
            /** [plain] Step to the present */
            present: string;
            /** [plain] Reset the input history to restart the performance */
            reset: string;
        };
        /** Interactive tour explaining the timeline UI */
        tour: {
            /** [plain] The tooltip on the help button that opens the tour */
            launch: string;
            /** [formatted] Markup describing the entire timeline panel */
            timeline: FormattedText;
            /** [formatted] Markup describing the reset evaluation button */
            reset: FormattedText;
            /** [formatted] Markup describing play mode (after starting evaluation) */
            playMode: FormattedText;
            /** [formatted] Markup describing pause mode (after pausing) */
            pauseMode: FormattedText;
            /** [formatted] Markup describing the annotations window */
            annotations: FormattedText;
            /** [formatted] Markup describing the editor */
            editor: FormattedText;
            /** [formatted] Markup describing the history slider */
            history: FormattedText;
            /** [formatted] Markup describing the step button controls */
            stepControls: FormattedText;
        };
    };
    /** Generic chrome for the Tour overlay component */
    tour: {
        /** [plain] ARIA label for the tour overlay */
        label: string;
        /** [plain] Tooltip for the close button */
        close: string;
        /** [plain] Tooltip for the previous step button */
        previous: string;
        /** [plain] Tooltip for the next step button */
        next: string;
        /** [plain] Message shown when the targeted UI is not visible on screen */
        offscreen: string;
    };
    dialog: {
        /** The sharing dialog */
        share: HeaderAndExplanationText & {
            /** The subheaders of the dialog */
            subheader: {
                /** The gallery subheader and explanation */
                gallery: HeaderAndExplanationText;
                /** The public/private toggle subheader and explanation */
                public: HeaderAndExplanationText;
                /** The personal information subheader and explanation */
                pii: HeaderAndExplanationText;
                /** The copy and paste dialog text */
                copy: HeaderAndExplanationText;
                /** The preview-glyph customization subheader and explanation */
                preview: HeaderAndExplanationText;
            };
            /** Text fields in the share dialog */
            field: {
                /** The email or username field for the collaborator being added */
                emailOrUsername: FieldText;
                /** The single-grapheme preview glyph field */
                preview: FieldText;
            };
            /** Buttons in the share dialog */
            button: {
                /** [plain] Description for the email submission button. */
                submit: string;
                /** The button that marks a previously-flagged piece of PII as sensitive again */
                sensitive: ButtonText;
            };
            /** Modes in the share dialog */
            mode: {
                /** The public/private toggle mode widget */
                public: ModeText<[string, string]>;
                /** The preview auto/custom toggle mode widget */
                preview: ModeText<[string, string]>;
            };
            /** Errors in the share dialog */
            error: {
                /** [plain] When someone tries to add an email collaborator that doesn't have a Wordplay account */
                unknown: string;
                /** [plain] When someone wants to add a collaborator but isn't authenticated */
                anonymous: string;
                /** [plain] Can't add self */
                self: string;
                /** [plain] When the preview-glyph text field doesn't contain exactly one grapheme */
                invalidPreview: string;
            };
            options: {
                /** [plain] The label for the gallery chooser */
                gallery: string;
            };
        };
        /** The settings dialog */
        settings: HeaderAndExplanationText & {
            button: {
                /** [plain] Show the settings dialog */
                show: string;
            };
            mode: {
                /** The project tile layout mode */
                layout: ModeText<
                    [string, string, string, string, string, string]
                >;
                /** The animation off/slowdown/auto mode (last entry is
                 * "auto", which follows the device prefers-reduced-motion
                 * setting). */
                animate: ModeText<
                    [
                        string,
                        string,
                        string,
                        string,
                        string,
                        string,
                        string,
                        string,
                        string,
                    ]
                >;
                /** The dark on/off/automatic mode */
                dark: ModeText<[string, string, string]>;
                /** The writing layout direction */
                writing: ModeText<[string, string, string]>;
                /** The blocks on/off mode */
                blocks: ModeText<[string, string]>;
                /** The block-editing density mode (compact/normal/spacious) */
                blockDensity: ModeText<[string, string, string]>;
                /** The space_indicator on/off mode */
                space: ModeText<[string, string]>;
                /** The line number on/off mode */
                lines: ModeText<[string, string]>;
            };
            options: {
                /** [plain] The label for the font face chooser */
                face: string;
                /** [plain] The label for the microphone drop down */
                mic: string;
                /** [plain] The label for the camera drop down */
                camera: string;
                /** [plain] The label for the voice drop down for Say */
                voice: string;
                /** [plain] The label for default device */
                default: string;
            };
        };
        /** The notifications dialog */
        notifications: HeaderAndExplanationText & {
            /** [plain] The how-to notifications on/off mode */
            open: string;
            howToNotifications: ModeText<[string, string]>;
            clearAll: ButtonText;
            /** Templates for the title of each notification kind */
            notification: {
                /** [plain] Title for a new how-to notification, with $1 as the how-to title */
                howToHeader: Template<['title']>;
                /** [plain] Title for a new project chat message notification, with $1 as the project name */
                projectChatHeader: Template<['name']>;
                /** [plain] Title for a new how-to chat message notification, with $1 as the how-to title */
                howToChatHeader: Template<['title']>;
                /** [plain] Title for a moderation-required notification, with $1 as the project name */
                moderationHeader: Template<['name']>;
                /** [plain] Link label to view notification details */
                link: string;
            };
            /** [plain] Tooltip for the button that deletes a notification */
            delete: string;
            /** [plain] ARIA label for the new-notification popup indicator */
            popup: string;
        };
        /** The locale chooser dialog */
        locale: HeaderAndExplanationText & {
            /** [formatted] Banner at the top of the dialog prompting users to enter localization mode via the pencil icon in the app footer. */
            localizeHelp: FormattedText;
            /** Subheaders in the local chooser dialog. */
            subheader: {
                /** [plain] How to label the locales that have been selected */
                selected: string;
                /** [plain] How to label the supported locales that have not been selected */
                supported: string;
            };
            /** Buttons in the locale chooser dialog */
            button: {
                /** [plain] Show the locale chooser dialog */
                show: string;
                /** [plain] Add a locale */
                add: string;
                /** [plain] Replace locale */
                replace: string;
                /** [plain] Remove a locale */
                remove: string;
                /** [plain] Menu button label for "other languages" (landing page) */
                menu: string;
            };
            /** Form to request support for a language/region not yet listed. */
            request: {
                /** [plain] Subheader above the request form. */
                header: string;
                /** [formatted] Short explanation of what the request form does. */
                explanation: FormattedText;
                /** [plain] Placeholder/label for the language dropdown. */
                languageLabel: string;
                /** [plain] Placeholder/label for the region dropdown. */
                regionLabel: string;
                /** [plain] Submit button label. */
                submit: string;
                /** [plain] Status shown while the request is being sent. */
                submitting: string;
                /** [plain] Link text shown after a successful request; the link points to the GitHub issue. */
                success: string;
                /** [plain] Error message shown when the request fails. */
                error: string;
                /** [plain] Error message shown when the combination is already supported. */
                alreadySupported: string;
                /** [plain] Error message shown when the user is not signed in. */
                requiresLogin: string;
            };
        };
        /** The keyboard shortcut reference dialog */
        help: HeaderAndExplanationText & {
            /** Section subheaders grouping related keyboard shortcuts */
            subheader: {
                /** [plain] Subheader for shortcuts that move the cursor */
                moveCursor: string;
                /** [plain] Subheader for shortcuts that edit existing code */
                editCode: string;
                /** [plain] Subheader for shortcuts that insert new code */
                insertCode: string;
                /** [plain] Subheader for shortcuts related to debugging/evaluation */
                debug: string;
            };
        };
        /** The feedback dialog */
        feedback: HeaderAndExplanationText & {
            button: {
                /** [plain] Show the feedback dialog */
                show: string;
                /** Submit the feedback */
                submit: ButtonText;
                /** Delete */
                delete: ConfirmText;
                /** [plain] Like feedback */
                like: string;
                /** Close the feedback */
                close: ButtonText;
                /** Submit comment */
                comment: ButtonText;
            };
            /** The mode chooser for defects and ideas */
            mode: ModeText<[string, string]>;
            field: {
                /** Feedback title */
                title: FieldText;
                /** Defect description */
                defect: FieldText;
                /** Idea description */
                idea: FieldText;
                /** New comment */
                comment: FieldText;
                /** GitHub URL */
                github: FieldText;
            };
            subheader: {
                /** [plain] The subheader for the defect dialog */
                defect: string;
                /** [plain] The subheader for the feedback dialog */
                idea: string;
                /** [plain] The moderator subheader for a moderator comment */
                moderator: string;
            };
            /** Prompts inviting the user to submit new feedback if they didn't find an existing match */
            prompt: {
                /** [plain] Prompt shown above the defect list encouraging new bug reports */
                defect: string;
                /** [plain] Prompt shown above the ideas list encouraging new feature suggestions */
                idea: string;
            };
            error: {
                /** [plain] Must be logged in to submit */
                login: string;
                /** [plain] The error shown when the feedback was not submitted */
                submit: string;
                /** [plain] Unable to laod feedback */
                load: string;
                /** [plain] No feedback yet */
                empty: string;
                /** [plain] Not a valid URL */
                url: string;
            };
        };
    };
    /** Saving related text */
    save: {
        /** [plain] Shown when saving has started */
        saving: string;
        /** [plain] Shown when online saving was successful */
        saved: string;
        /** [plain] Shown when saving on device was successful */
        local: string;
        /** [plain] Shown when there was a problem saving */
        unsaved: string;
        /** Per-domain cloud-sync status shown in the save-status dialog. */
        sync: {
            /** [plain] Header for the cloud-sync status section */
            header: string;
            /** [plain] Label for the projects sync row */
            projects: string;
            /** [plain] Label for the galleries sync row */
            galleries: string;
            /** [plain] Label for the characters sync row */
            characters: string;
            /** [plain] Label for the how-tos sync row */
            howtos: string;
            /** [plain] Label for the chats sync row */
            chats: string;
        };
        /** The save-status dialog that breaks down, per kind of thing, how much
         *  is saved on this device, in the cloud, and not yet saved online. */
        status: {
            /** [plain] Header of the save-status dialog */
            header: string;
            /** [plain] One-line explanation at the top of the save-status dialog */
            intro: string;
            /** Column headers for the per-kind save-status table */
            columns: {
                /** [plain] Column header: how many are saved on this device */
                device: string;
                /** [plain] Column header: how many are saved in the cloud */
                cloud: string;
                /** [plain] Column header: how many are not yet saved online */
                unsaved: string;
            };
            /** Words describing how a kind of thing is syncing with the cloud. */
            state: {
                /** [plain] Saved on this device and in the cloud */
                synced: string;
                /** [plain] Still loading from the cloud */
                loading: string;
                /** [plain] Saving changes to the cloud */
                syncing: string;
                /** [plain] Not connected to the cloud right now */
                offline: string;
                /** [plain] A save or sync failed */
                failed: string;
            };
            /** [plain] Name for a conversation with no title, in the error list */
            conversation: string;
            /** [plain] Explains what the unsaved column means */
            legend: string;
            /** [plain] Header above the list of things that couldn't be saved */
            errorsHeader: string;
        };
    };
    /** Banner shown when the device is offline or Firebase is unreachable. */
    connection: {
        /** [plain] Banner shown when the browser reports no internet connection */
        offline: string;
        /** [plain] Banner shown when the device is online but Firebase requests are failing */
        unreachable: string;
        /** [plain] ARIA label for the connection banner live region */
        label: string;
    };
    /** Notification shown when a newer version of the app has been deployed while the tab was open. */
    update: {
        /** [plain] ARIA label for the new-version notification region */
        label: string;
        /** [plain] Message shown when a newer version of the app is available */
        message: string;
        /** [plain] Action label that reloads the page to the new version */
        refresh: string;
        /** [plain] Link label to the updates/changelog page */
        updates: string;
        /** [plain] Tooltip for the button that dismisses the notification */
        dismiss: string;
    };
    /** Text for the localization editor */
    localize: {
        /** [plain] The header for the localization editor */
        header: string;
        /** [plain] Label for the English reference text shown when an editor is focused */
        reference: string;
        /** [formatted] An explanation of the localization editor */
        description: FormattedText;
        toggle: {
            /** The on/off switch for the localization editor */
            mode: ToggleText;
        };
        button: {
            /** [plain] Tooltip for the button that opens text editing */
            edit: string;
            /** [plain] Tooltip for the button that opens editing of a tooltip (the tip-icon badge attached to widgets without a visible label) */
            editTip: string;
            /** [plain] Tooltip for the button that submits the suggested edit */
            submit: string;
            /** [plain] Tooltip for the button that cancels the suggested edit */
            cancel: string;
            /** [plain] Tooltip for the button that reverts to the official text */
            revert: string;
            /** [plain] Tooltip for the button that navigates to the previous element when editing a tuple-typed key (e.g., ModeText.tips) in the localizer panel */
            prev: string;
            /** [plain] Tooltip for the button that navigates to the next element when editing a tuple-typed key (e.g., ModeText.tips) in the localizer panel */
            next: string;
        };
        field: {
            /** The description and placeholder of the localization plain text editor. */
            plain: FieldText;
            /** The description and placeholder of the localization formatted text editor. */
            formatted: FieldText;
            /** The description and placeholder of the localization name editor. */
            name: FieldText;
            /** The description and placeholder of the localization string filter. */
            filter: FieldText;
        };
        /** Template-input panel shown below the editor when the active field
         *  is typed as `Template<Names>`. */
        inputs: {
            /** [plain] Subheader above the row of input chips */
            header: string;
            /** [plain] Tooltip shown on a chip when the draft references the input */
            usedTip: string;
            /** [plain] Tooltip shown on a chip when the draft doesn't yet reference the input */
            unusedTip: string;
            /** [plain] Prose preceding the list of inputs the draft is missing */
            missing: string;
            /** [plain] Prose preceding the list of bare `$N` legacy refs in the draft */
            legacy: string;
            /** [plain] Prose preceding the list of `$name` refs that aren't
             *  declared inputs and aren't terminology keys (typos / made-up
             *  names that won't substitute at render time) */
            unknown: string;
            /** [plain] Tooltip on the disabled Submit button when inputs are missing */
            submitBlocked: string;
        };
        /** [plain] The ARIA label for the dropdown that lists all locale strings available to review and edit */
        strings: string;
        /** [plain] The ARIA label for the emotion dropdown */
        emotion: string;
        /** [plain] Error shown when a name is not a valid Wordplay name */
        invalidName: string;
        /** [plain] Warning shown below a formatted editor when the draft markup
         *  references one or more concept links (e.g., `@FunctionDefinition`) that
         *  don't resolve in the current locale. The list of unresolved names is
         *  rendered separately. */
        invalidConceptLinks: string;
    };
    page: {
        /** Breadcrumb navigation trail shown above page headers */
        breadcrumb: {
            /** [plain] ARIA label for the breadcrumb navigation trail */
            label: string;
            /** [plain] Accessible name and tooltip for the home breadcrumb link */
            home: string;
        };
        /** The unknown route page */
        unknown: ErrorText;
        /** Landing page text */
        landing: LandingPageText;
        /** Tutorial page text */
        learn: LearnPageText;
        /** Localization workspace page text */
        localize: LocalizePageText;
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
        /** The character creation and browsing page */
        characters: CharactersPageText;
        /** The character editor page */
        character: CharacterPageText;
        /** Gallery browsing page text */
        galleries: GalleriesPageText;
        /** About page text */
        about: AboutPageText;
        /** Update page text */
        updates: UpdatesPageText;
        /** The login and account page */
        login: LoginPageText;
        /** Account creation page text */
        join: JoinPageText;
        /** The rights/terms of service page */
        rights: RightsPageText;
        /** Giving related text */
        donate: DonatePageText;
        /** Design system page text */
        design: DesignPageText;
        /** Thanks/contributors page text */
        thanks: ThanksPageText;
    };
    /** Descriptions of cursor positions and code transformations */
    edit: EditTexts;
    template: {
        /** [plain] The placeholder indicating that a locale string is not yet written */
        unwritten: string;
        /** [plain] The placeholder string indicating that a template string could not be parsed */
        unparsable: Template<['template']>;
        /** [plain] The tooltip for the machine-translated annotation */
        machineTranslated: string;
        /** [plain] The tooltip for the locally-revised annotation */
        locallyRevised: string;
    };
    /** Emoji related text */
    emoji: {
        /** [plain] Prompt when no custom characters are available */
        noCharacters: string;
        /** [plain] Label for the skin tone selector dropdown */
        skinTone: string;
        /** [plain] Placeholder/no-selection label for the script filter dropdown */
        script: string;
        /** [plain] ARIA label for the script filter dropdown */
        scriptLabel: string;
        /** [plain] Suffix appended after the first few language names captioning a script option, when more languages use the script than fit. $count is the number of additional languages. */
        moreLanguages: Template<['count']>;
        /** [plain] Hint shown in the glyph area when no category and no script is selected */
        pickFilter: string;
        /** Emoji category labels for the filter */
        groups: ModeText<
            [
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
                string,
            ]
        >;
    };
};

export { type UITexts as default };
