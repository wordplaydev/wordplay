import type { SupportedFace } from '@basis/faces/Fonts';
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

export type IconButtonText = {
    /** [plain] Icon button tooltip and ARIA-label, spoken by screen readers */
    tip: string;
};

export type ToggleText = {
    /** [plain] The tooltip and ARIA-label for when the toggle is in the on state */
    on: string;
    /** [plain] The tooltip and ARIA-label for when the toggle is in the off state */
    off: string;
};

export type OnToggleText = {
    /** [plain] The tooltip and ARIA-label for when the toggle is in the on state */
    on: string;
};

export type ModeText<Options extends readonly string[]> = {
    /** [plain] The tooltip and ARIA-label for the entire mode widget, describing the kind of modes it supports switching to. */
    label: string;
    /** [plain] A list of short labels, one per mode */
    labels: Options;
    /** [plain] A list of tooltip/ARIA descriptions, one per mode */
    tips: Options;
};

export type TipsModeText<Options extends readonly string[]> = {
    /** [plain] A list of tooltip/ARIA descriptions, one per mode */
    tips: Options;
};

/** A section whose title comes from elsewhere — a tab, say — so it carries only
 *  its explanatory prose. */
export type ExplanationText = {
    /** [formatted] The explanation text for the section. */
    explanation: FormattedText | FormattedText[];
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
        /** [plain] The application font to use throughout the application. Should support the language used in this locale so that characters render correctly. Add the face to Fonts.ts if the one you choose is not yet supported. */
        app: SupportedFace;
        /** [plain] The monospace font to use for code in the editor and code examples. Should support the language used in this locale so that characters render correctly. Add the face to Fonts.ts if the one you choose is not yet supported. */
        code: SupportedFace;
        /** [plain] The word shown before the markup symbols that a font face doesn't support (e.g. "missing * ^" for a face without bold or extra bold) */
        missing: string;
        /** What a font face looks like, said in words, for creators who can't see
         * it. One small vocabulary rather than a description per font: Wordplay
         * ships in thirty languages, so these terms are translated once and hold
         * when a font is added. See faceWords.ts. */
        form: {
            /** [plain] Letters with no feet on them. */
            sans: string;
            /** [plain] Letters with small feet. */
            serif: string;
            /** [plain] Letters with thick square feet. */
            slab: string;
            /** [plain] A face where every letter is the same width. */
            typewriter: string;
            /** [plain] Written by hand, with the letters apart. */
            handwriting: string;
            /** [plain] Painted with a brush or a marker. */
            brush: string;
            /** [plain] Joined up, like cursive. */
            script: string;
            /** [plain] Fat letters made for big words. */
            poster: string;
            /** [plain] Letters built out of squares or dots. */
            pixel: string;
            /** [plain] Hollow or shadowed letters. */
            outline: string;
            /** [plain] Letters that look worn, sketched, or scratchy. */
            textured: string;
            /** [plain] Pictures instead of letters. */
            emoji: string;
        };
        /** [plain] What a face feels like. At most two are said about any face. */
        impression: {
            /** [plain] Quiet and ordinary; a face for reading rather than for effect. */
            calm: string;
            /** [plain] Looks like it comes from another time. */
            oldFashioned: string;
            /** [plain] Heavy and forceful. */
            strong: string;
            /** [plain] Odd or uneven on purpose. */
            quirky: string;
            /** [plain] Fun and not serious. */
            playful: string;
            /** [plain] Loud and full of energy. */
            excited: string;
            /** [plain] Looks like a child wrote it. */
            childlike: string;
            /** [plain] Looks hand-made or drawn. */
            artistic: string;
            /** [plain] Looks like the future, or a machine. */
            futuristic: string;
            /** [plain] Quick and lively. */
            energetic: string;
            /** [plain] Small, round and sweet. */
            cute: string;
            /** [plain] Bright and happy. */
            cheerful: string;
            /** [plain] Elegant and decorated. */
            fancy: string;
        };
        /** [plain] Facts measured from the font file rather than judged. */
        mechanic: {
            /** [plain] Every letter takes up the same amount of room. */
            sameWidth: string;
            /** [plain] The small letters are as tall as the capital letters. */
            tallLowercase: string;
            /** [plain] The small letters are much shorter than the capital letters. */
            shortLowercase: string;
        };
        description: {
            /** [plain] Joins two of the words above. $first: the first word, $second: the second */
            and: Template<['first', 'second']>;
            /** [plain] A whole description of a face. $form: what shape the letters are, $impression: what it feels like, $mechanics: what was measured. Any of the three may be empty. */
            full: Template<['form', 'impression', 'mechanics']>;
        };
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
        /** The cloud badge marking a setting that follows a creator's account rather than staying on one device */
        synced: {
            /** [plain] Tooltip for the cloud badge when the creator is signed in: this setting is saved to their account, so it will be there on their other devices */
            saved: string;
            /** [plain] Tooltip for the cloud badge when the creator is signed out: this setting would follow them to their other devices if they signed in */
            signedOut: string;
        };
        /** The Wordplay logo mark */
        logo: {
            /** [plain] Accessible description of the Wordplay logo: a speech bubble holding one letter of the reader's writing system */
            description: string;
        };
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
            /** [plain] The expected-defect example button (🪲) */
            defect: string;
            /** [plain] The bullet list item button */
            bullet: string;
            /** [plain] The highlight line of code button (👀) */
            attention: string;
        };
        /** The color chooser widget */
        color: {
            /** The eyedropper button that picks a color from the screen */
            pick: IconButtonText;
            /** [plain] Screen-reader role description for the 2-D chroma×hue color field */
            field: string;
            /** [plain] Screen-reader usage instructions for adjusting the color field with the keyboard */
            instructions: string;
            /** [plain] The spoken color readout: the described color name followed by its lightness, chroma, and hue values, e.g. "dark grey, LCH 50, 117, 90" */
            value: Template<['color', 'l', 'c', 'h']>;
            /** The text field for entering a color in any web format */
            input: {
                /** [plain] Tooltip and ARIA label for the color text field */
                description: string;
                /** [plain] Placeholder showing example formats, e.g. "#f00, rgb(), hsl(), red" */
                placeholder: string;
                /** [plain] Validation message shown when the typed value isn't a recognized color */
                invalid: string;
                /** [plain] Tooltip on the small chip that shows the inferred color format */
                format: string;
            };
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
            /** Show or hide a tile, named by its kind — a project's toggles sit side by
             *  side, and an unnamed "show" reads identically on every one. */
            show: {
                /** [plain] Tooltip and ARIA label for hiding the $name tile */
                on: Template<['name']>;
                /** [plain] Tooltip and ARIA label for showing the $name tile */
                off: Template<['name']>;
            };
            /** Show or hide a source file's tile. Named, because a project can have
             *  several, and an unnamed "show" reads identically on every one. */
            showSource: {
                /** [plain] Tooltip and ARIA label for hiding the source named $name */
                on: Template<['name']>;
                /** [plain] Tooltip and ARIA label for showing the source named $name */
                off: Template<['name']>;
            };
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
        /** [formatted] Shown in a scratch project — a copy of a guide example,
         *  kept on this device and left out of the project list */
        scratch: FormattedText;
        /** [plain] What to call a project that has no name, in the browser tab */
        untitled: string;
        error: {
            /** [plain] Shown when a project doesn't exist or the user doesn't have access */
            unknown: string;
            /** [plain] The error to show if translation wasn't possible */
            translate: string;
            /** [plain] The error to show when translating would have introduced errors in the program, so nothing changed */
            translateBroken: string;
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
            /** Remix the project into a new project of your own */
            remix: ButtonText;
            /** The button that opens a guide example as an editable scratch project */
            tinker: ButtonText;
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
            /** [plain] The tooltip for the source language button in the translate dialog */
            primary: string;
            /** [plain] The tooltip for the destination language button in the translate dialog */
            destination: string;
            /** [plain] Show the project's languages dialog */
            languages: string;
            /** [plain] Add a language to the project, so its code can use that language's names and words */
            addLanguage: string;
            /** [plain] Remove a language from the project */
            removeLanguage: string;
            /** [plain] Make a language the project's first, deciding how its output is laid out */
            firstLanguage: string;
            /** Remove every language nothing in the project's code uses */
            removeUnusedLanguages: ButtonText;
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
            /** [formatted] Projects failed to load */
            projectsNotLoadingOnline: FormattedText;
            /** [formatted] Some projects are still only on this device */
            projectsNotSavingOnline: FormattedText;
            /** [formatted] When settings are being saved */
            settingsUnsaved: FormattedText;
            /** Per-reason explanations shown in the save-failure dialog,
             *  grouped above the list of affected project names. */
            failureReason: {
                /** [formatted] Browser local save failed (IndexedDB write error) */
                indexedDBWriteFailed: FormattedText;
                /** [formatted] Local save failed for a project with NO cloud copy
                 *  (signed out / not synced) — real data loss; nudges sign-in */
                localProjectStorageFailed: FormattedText;
                /** [formatted] Browser doesn't support saving projects locally */
                indexedDBUnsupported: FormattedText;
                /** [formatted] Sending projects to the cloud failed */
                firestoreBatchFailed: FormattedText;
                /** [formatted] Project contained personal info so wasn't sent online */
                projectContainsPII: FormattedText;
                /** [formatted] Project is too big for the cloud to accept */
                projectTooLarge: FormattedText;
                /** [formatted] Nowhere to save online: signed out or offline setup */
                noCloudTarget: FormattedText;
            };
        };
        dialog: {
            /** The content for the project's languages dialog: which languages its code is
             *  written in, which ones it looks like it needs, and translating it into another. */
            languages: HeaderAndExplanationText & {
                /** The tabs that switch between the languages the project is written in and translating it */
                tab: ModeText<[string, string]>;
                /** [plain] The dialog button's label, saying how many languages the project is written in */
                count: Template<['#count']>;
                /** [plain] The dialog button's label when the project has just one language, inviting translation instead of counting */
                prompt: string;
                /** Whether translating adds the new language alongside what's written, or rewrites the program in it */
                mode: ModeText<[string, string]>;
                /** [formatted] Explains what a project's languages decide, above the list of them */
                meaning: FormattedText | FormattedText[];
                /** [plain] Marks a language nothing in the project's code uses */
                unused: string;
                /** [plain] Marks a language whose words couldn't be loaded, so its names don't work right now */
                unloaded: string;
                /** [formatted] Shown while checking which languages the project's code needs */
                checking: FormattedText;
                /** [formatted] Shown when the code doesn't use any language the project is missing */
                complete: FormattedText;
                /** The field that filters languages by name or region */
                search: FieldText;
            };
        };
        subheader: {
            /** [formatted] The header for languages the project's code uses but doesn't have */
            missing: FormattedText;
            /** [formatted] The header for the source language */
            source: FormattedText;
            /** [formatted] The header for the destination language */
            destination: FormattedText;
        };
        options: {
            /** The tile layout chooser in the project footer */
            layout: {
                /** [plain] Tooltip when the layout is chosen automatically, naming the layout currently in effect */
                auto: Template<['layout']>;
            };
        };
        toggle: {
            /** [plain] Tip text for the project full screen button */
            fullscreen: ToggleText;
            /** [plain] Toggles between showing the project's localized name and editing the raw multilingual name literal */
            editName: ToggleText;
        };
        link: {
            /** [plain] Tooltip on the link from a remixed project back to the project it was remixed from */
            remixOf: string;
            /** [plain] The link from a scratch project back to where it was opened from, naming that place */
            backTo: Template<['place']>;
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
            /** [formatted] Markup describing the languages button */
            languages: FormattedText;
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
    /** Text shared by everything that machine translates — a project, and later
     *  chat and how-tos — including the daily budget meter (#1073). */
    translation: {
        /** [plain] How much of today's translation budget has been used */
        used: Template<['used', '#limit']>;
        /** [plain] The ARIA label for the translation budget meter */
        meter: string;
        /** [plain] Shown when today's translation budget is spent and resets in $#hours hours */
        exhaustedHours: Template<['#hours']>;
        /** [plain] Shown when today's translation budget is spent and resets in $#minutes minutes */
        exhaustedMinutes: Template<['#minutes']>;
        /** [formatted] Explains that translating requires an account, with a link to sign in */
        signIn: FormattedText;
        /** [plain] The ARIA label for the translation progress bar */
        progressLabel: string;
        /** [plain] Shown and announced while the project is being prepared for translation */
        analyzing: string;
        /** [plain] Shown and announced while the translated text is being put back into the project */
        revising: string;
        /** [plain] Announced when translation starts, naming how much and into which language */
        started: Template<['#count', 'language']>;
        /** [plain] Announced as translation proceeds */
        progress: Template<['done', '#total']>;
        /** [plain] Announced when translation finishes */
        finished: Template<['language']>;
        /** [plain] Announced when translation finishes but some text kept its original wording */
        finishedPartial: Template<['language', '#kept']>;
    };
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
            blocks: OnToggleText;
            /** [plain] The character chooser expand/collapse toggle */
            characters: ToggleText;
            /** [plain] The toggle for expanding and collapsing a long list of items in the editor */
            expandSequence: ToggleText;
            /** [plain] The toggle that shows or hides the editor search field */
            search: ToggleText;
        };
        fold: {
            /** [plain] The fold control's label when activating it will collapse the code; $name is the kind of code (e.g. function, list) */
            collapse: Template<['name']>;
            /** [plain] The fold control's label when activating it will expand collapsed code; $name is the kind of code (e.g. function, list) */
            expand: Template<['name']>;
            /** [plain] The command/button that folds all foldable code */
            all: string;
            /** [plain] The command/button that unfolds all collapsed code */
            none: string;
            /** [plain] Screen-reader announcement when code is collapsed; $name is the kind of code (e.g. function, list) */
            collapsed: Template<['name']>;
            /** [plain] Screen-reader announcement when code is expanded; $name is the kind of code (e.g. function, list) */
            expanded: Template<['name']>;
        };
        button: {
            /** [plain] Output preview button for selecting output for display in output tile */
            selectOutput: string;
            /** [plain] The output preview button when the source's latest value is an exception */
            selectOutputError: string;
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
            /** [plain] An autocomplete suggestion: the code it would insert, then what it is */
            item: Template<['code', 'description']>;
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
                all: Template<['#count']>;
            };
        };
        /** Prefixes shown before a conflict explanation when an edit is rejected in blocks mode. */
        feedback: {
            /** [plain] Precedes the conflict explanation when a dragged block can't be dropped on a target */
            cantDrop: string;
            /** [plain] Precedes the conflict explanation when a paste can't be applied at the caret */
            cantPaste: string;
        };
        /** The clipboard contents shown in the editor footer. */
        clipboard: {
            /** [plain] Label shown before the clipboard's contents in the editor footer */
            label: string;
        };
        /** Editor footer notices. */
        notice: {
            /** [plain] Tooltip for the button that dismisses an editor footer notice */
            dismiss: string;
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
            /** [plain] Move cursor to the matching delimiter */
            matchDelimiter: string;
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
            /** [plain] Insert ⣿⣿ pattern symbol */
            insertPattern: string;
            /** [plain] Insert ⌕ pattern search symbol */
            insertSearch: string;
            /** [plain] Insert ◌ any-grapheme pattern symbol */
            insertPatternAny: string;
            /** [plain] Insert ␣ space pattern symbol */
            insertPatternSpace: string;
            /** [plain] Insert ⊢ pattern start symbol */
            insertPatternStart: string;
            /** [plain] Insert ⊣ pattern end symbol */
            insertPatternEnd: string;
            /** [plain] Insert Aa pattern case-fold symbol */
            insertPatternFold: string;
            /** [plain] Insert ▸ pattern lookahead symbol */
            insertPatternAhead: string;
            /** [plain] Insert ◂ pattern lookbehind symbol */
            insertPatternBehind: string;
            /** [plain] Insert ▭ pattern word symbol */
            insertPatternWord: string;
            /** [plain] Insert ┊ pattern word-edge symbol */
            insertPatternWordEdge: string;
            /** [plain] Insert 𝅝 whole note duration */
            insertWholeNote: string;
            /** [plain] Insert 𝅝𝅭 dotted whole note duration */
            insertDottedWholeNote: string;
            /** [plain] Insert 𝅗𝅥 half note duration */
            insertHalfNote: string;
            /** [plain] Insert 𝅗𝅥𝅭 dotted half note duration */
            insertDottedHalfNote: string;
            /** [plain] Insert 𝅘𝅥 quarter note duration */
            insertQuarterNote: string;
            /** [plain] Insert 𝅘𝅥𝅭 dotted quarter note duration */
            insertDottedQuarterNote: string;
            /** [plain] Insert 𝅘𝅥𝅮 eighth note duration */
            insertEighthNote: string;
            /** [plain] Insert 𝅘𝅥𝅮𝅭 dotted eighth note duration */
            insertDottedEighthNote: string;
            /** [plain] Insert 𝅘𝅥𝅯 sixteenth note duration */
            insertSixteenthNote: string;
            /** [plain] Insert 𝅘𝅥𝅯𝅭 dotted sixteenth note duration */
            insertDottedSixteenthNote: string;
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
            /** [plain] Notice shown when Tab is pressed and tab-inserts-tab is off, explaining how to insert a tab. $control and $alt are the platform-specific Control/Command and Alt/Option modifier labels. */
            tab: Template<['control', 'alt']>;
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
                /** [plain] A key that does nothing in this context */
                unhandled: string;
            };
            /** Spoken names for characters that would otherwise be silent when
             * echoed to a screen reader one keystroke at a time. */
            echo: {
                /** [plain] Spoken name of the space character */
                space: string;
                /** [plain] Spoken name of the line break character */
                newline: string;
                /** [plain] Spoken name of the tab character */
                tab: string;
            };
            /** [plain] Describes a selection: how many characters, and their text */
            selected: Template<['#count', 'text']>;
            /** [plain] Where the caret is when nothing more specific applies */
            unknownPosition: string;
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
    /**
     * Spoken confirmations that a command did something, for commands whose
     * effect a screen reader wouldn't otherwise convey (see `Command.feedback`
     * in Commands.ts, and CLAUDE.md's Screen-reader announcements section).
     * Past tense: these report a result, not an available action.
     */
    feedback: {
        /** [plain] Confirms a copy, naming what was copied */
        copied: Template<['text']>;
        /** [plain] Confirms a cut, naming what was cut */
        cut: Template<['text']>;
        /** [plain] Confirms a paste, naming what was pasted */
        pasted: Template<['text']>;
        /** [plain] Confirms a deletion, naming what was deleted */
        deleted: Template<['text']>;
        /** [plain] Confirms the last edit was undone */
        undone: string;
        /** [plain] Confirms an undone edit was redone */
        redone: string;
        /** [plain] Confirms all code was folded */
        foldedAll: string;
        /** [plain] Confirms all code was unfolded */
        unfoldedAll: string;
        /** [plain] Announces the editing mode now in effect (blocks or text) */
        editMode: Template<['mode']>;
        /** [plain] Announces the new editor zoom level as a percentage */
        zoom: Template<['percent']>;
        /** [plain] Confirms entering full screen */
        fullscreenOn: string;
        /** [plain] Confirms leaving full screen */
        fullscreenOff: string;
        /** [plain] Confirms the program's inputs were reset */
        restarted: string;
        /** [plain] Announces the current evaluation step and the node at it */
        step: Template<['step', 'node']>;
        /** [plain] Says stepping reached the beginning of the program */
        stepAtStart: string;
        /** [plain] Says stepping reached the end of the program */
        stepAtEnd: string;
        /** [plain] Confirms the code search opened */
        searchOpened: string;
        /** [plain] Confirms the code search closed */
        searchClosed: string;
        /** [plain] Announces which search match is now selected */
        searchMatch: Template<['index', 'count']>;
        /** [plain] Says the search found nothing */
        searchNoMatches: string;
        /** [plain] Confirms the autocomplete menu opened, with how many suggestions */
        menuOpened: Template<['#count']>;
        /** [plain] Says the autocomplete menu has no suggestions */
        menuEmpty: string;
        /** [plain] Confirms the autocomplete menu closed */
        menuClosed: string;
        /** [plain] Says tidying was unnecessary because the code is already tidy */
        tidyNoop: string;
    };
    /** The conflicts area in the margin of the editor. */
    annotations: {
        /** [plain] The ARIA label for the conflicts section in the editor. */
        label: string;
        /** [formatted] The description of the cursor position */
        cursor: Template<['node', 'type']>;
        /** [formatted] A quote of the first sentence of the cursor node's documentation, shown as its own paragraph below the cursor description */
        cursorDoc: Template<['description']>;
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
        /** The severity words shown on and announced with each conflict, so severity never rides on color alone. */
        severity: {
            /** [plain] Label for a major conflict, an error that prevents evaluation */
            major: string;
            /** [plain] Label for a minor conflict, a warning that doesn't prevent evaluation */
            minor: string;
        };
        /** [plain] The accessible name of a conflict row, combining its severity word and the conflict's name */
        conflictLabel: Template<['severity', 'conflict']>;
        button: {
            /** [formatted] How the resolution button should should be described */
            resolution: FormattedText;
            /** [formatted] How the button that opens the dialog where a fix lives should be described */
            elsewhere: FormattedText;
            /** [plain] The button to toggle the annotations */
            toggle: string;
            /** [plain] The collapsed-sidebar button that shows a major conflict's code in the editor */
            highlightMajor: string;
            /** [plain] The collapsed-sidebar button that shows a minor conflict's code in the editor */
            highlightMinor: string;
            /** [plain] The collapsed-sidebar button that shows an evaluation step's code in the editor */
            highlightStep: string;
        };
    };
    wellspring: {
        /** [plain] The ARIA label for the blocks-mode Wellspring drag-and-drop sidebar */
        label: string;
        /** [plain] The ARIA label and tooltip for the recycle bin that deletes a dropped node */
        recycle: string;
        /** [plain] Shown in the code-view area when the selected category has no concepts (e.g. an empty project filter) */
        empty: string;
        field: {
            /** [plain] The description of the Wellspring's concept search field */
            search: string;
        };
        button: {
            /** [plain] The button to expand or collapse the Wellspring */
            toggle: string;
            /** [plain] The button that clears the Wellspring's search field */
            clear: string;
        };
    };
    output: {
        /** [plain] The ARIA label for the output section */
        label: string;
        /** [plain] Screen-reader instructions for selecting multiple outputs on stage with the keyboard */
        multiselect: string;
        /** [plain] Announced when an output is added to the selection. $name is the output, $count is the number now selected. */
        selected: Template<['name', 'count']>;
        /** [plain] Announced when an output is removed from the selection. $name is the output, $count is the number now selected. */
        deselected: Template<['name', 'count']>;
        /** [plain] Announced when all outputs are selected. $count is the number now selected. */
        allSelected: Template<['count']>;
        /** [plain] Announced when the selection is cleared */
        cleared: string;
        /** [plain] Announced when selected output is deleted from the program. $#count is how many went. */
        removed: Template<['#count']>;
        /** [plain] Announced when a path is drawn on stage. $#count is how many points it has. */
        drew: Template<['#count']>;
        /** [plain] Announced as a path is built point by point. $#count is how many points it has so far, $place where the last one went. */
        drawing: Template<['#count', 'place']>;
        /** What a @Path's individual point handles say. */
        point: {
            /** [plain] A point handle's label. $number is which point it is, $#count how many there are, $place where it sits. */
            label: Template<['number', '#count', 'place']>;
            /** [plain] Announced when a point is moved. $number is which point, $place where it went. */
            moved: Template<['number', 'place']>;
            /** [plain] Announced when a point is added. $number is which point it became. */
            added: Template<['number']>;
            /** [plain] Announced when a point is removed. $number is which point it was. */
            removed: Template<['number']>;
            /** [plain] Announced when a point can't be removed, because a path needs two. */
            last: string;
        };
        /** [plain] Announced when selected output can't be deleted, because it isn't something the program can do without */
        notRemovable: string;
        /** [plain] Announced when an output moved on stage. $name is the output, $direction is which way it went, $place is where it landed. */
        moved: Template<['name', 'direction', 'place']>;
        /** [plain] The eight directions an output can move, starting at up and proceeding clockwise: up, up and right, right, down and right, down, down and left, left, up and left. */
        directions: string[];
        /** [plain] Announced when an output moved toward the viewer */
        closer: string;
        /** [plain] Announced when an output moved away from the viewer */
        farther: string;
        /** [plain] Announced when an output turned in place without moving */
        turned: string;
        /** [plain] Announced when too many outputs changed to list them. $count is how many, $container is what holds them, $example is one of the changes. */
        manyChanged: Template<['#count', 'container', 'example']>;
        /** What an output being moved on stage lined up with */
        snap: {
            /** [plain] The seven parts of an output that can line up with another, in this order: horizontal center, left edge, right edge, vertical center, bottom edge, top edge, text baseline. */
            anchors: string[];
            /** [plain] Announced when a moved output lines up with another output. $anchor is the part of the moved output, $target is the other output, $targetAnchor is the part of it they met on. */
            withOutput: Template<['anchor', 'target', 'targetAnchor']>;
            /** [plain] Announced when a moved output lines up with a grid line. $anchor is the part of the moved output that landed on it. */
            withGrid: Template<['anchor']>;
            /** [plain] Announced after a move, naming what it lined up with and where it landed. $constraints is what it lined up with, $place is where it is now. */
            aligned: Template<['constraints', 'place']>;
            /** [plain] Announced when there is nothing further to line up with that way. $direction is which way was asked for. */
            none: Template<['direction']>;
        };
        /** [plain] Announced when selecting one output and opening the palette. $name is the output. */
        selectedOnly: Template<['name']>;
        /** [plain] Suffix appended to a selected group's accessible name, since a group cannot use aria-pressed */
        selectedSuffix: string;
        toggle: {
            /** Toggle whether grid is shown */
            grid: ToggleText;
            /** Toggle whether output is fit to window */
            fit: ToggleText;
        };
        field: {
            key: {
                /** [plain] The ARIA label for the hidden text field that receives keyboard focus for key and placement input streams */
                description: string;
            };
            /** The text field for sending a message to a project's Chat stream */
            chat: FieldText;
        };
        button: {
            /** [plain] The chat submit button */
            submit: string;
            /** [plain] Zoom in output button */
            zoomIn: string;
            /** [plain] Zoom in output button */
            zoomOut: string;
            /** [plain] Clear the viewer's own pan and zoom, handing the camera back to the project */
            resetZoom: string;
            /** [plain] Clear the viewer's own pan and zoom, when they have zoomed away from the project's own view. $percent is how large the view is now, as a percentage of the project's own. */
            resetZoomAt: Template<['percent']>;
            /** [plain] The button that begins a fresh performance, from any mode: restarts the program, enters play mode, and fullscreens the stage */
            perform: string;
            /** [plain] The rotation handle on a selected output. $name is the kind of output (e.g. phrase, rectangle). */
            rotate: Template<['name']>;
            /** [plain] The size handle on a selected output. $name is the kind of output (e.g. phrase, rectangle). */
            resize: Template<['name']>;
        };
        /** What the stage says to screen readers as the viewer moves the camera. */
        announce: {
            /** [plain] Announced as the viewer zooms the stage. $percent is how large the view is now, as a percentage of the project's own view. */
            zoom: Template<['percent']>;
            /** [plain] Announced when the viewer's own zoom or pan has left nothing on the stage. $percent is how large the view is now, as a percentage of the project's own view. */
            hidden: Template<['percent']>;
            /** [plain] Announced when the stage's content comes back into view */
            shown: string;
        };
        /** What the stage shows when the viewer's own pan or zoom has hidden everything. */
        hidden: {
            /** [plain] Explains that the viewer's pan or zoom has moved everything out of view */
            message: string;
            /** [plain] The button that returns the camera to the project's own view */
            show: string;
        };
        options: {
            /** [plain] The label for the locale chooser in output */
            locale: string;
            /** [plain] The "no filter" option in the output locale chooser, showing how many languages are available to choose from. $count is the number of languages. */
            default: Template<['#count']>;
        };
        /** The evaluation mode switcher in the output toolbar */
        mode: {
            /** The edit/debug/play mode switcher, shown for editable projects */
            evaluation: ModeText<[string, string, string]>;
            /** The view/debug/play mode switcher, shown for read-only projects */
            evaluationView: ModeText<[string, string, string]>;
            /** [plain] Announced when the evaluation mode changes. $mode is the new mode's label. */
            announce: Template<['mode']>;
            /** [plain] Announced when switching to play mode, which resumes the performance from wherever it is. $position is the step it picked up at. */
            resuming: Template<['position']>;
            /** [plain] Announced when the perform command begins a fresh performance. $number is which performance this is. */
            performing: Template<['number']>;
            /** [plain] Announced when an error pauses the program into debug mode so it can be inspected */
            exception: string;
            /** [plain] Description of the keyboard command that cycles between edit, debug, and play modes */
            toggle: string;
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
            /** [plain] Label of the button that retries permission after a denial */
            retry: string;
        };
        /** The unified start gate (permissions, moderation, and photosensitivity warnings). */
        gate: {
            /** The button that dismisses the gate and shows the project. */
            start: ButtonText;
        };
        /** The download screen shown while a camera model downloads, before the project appears. */
        download: {
            /** [plain] Heading while one or more camera models are downloading */
            title: string;
            /** [plain] Note explaining the download happens once and is then cached */
            note: string;
            /** [plain] Progress line, percent complete of the current download */
            percent: Template<['percent']>;
            /** [plain] Label for the downloading hand tracker model */
            hand: string;
            /** [plain] Label for the downloading face tracker model */
            face: string;
            /** [plain] Label for the downloading object recognizer model */
            objects: string;
            /** [plain] Tooltip/label for the small corner chip while a model loads */
            loading: Template<['model']>;
        };
        /** Sensor input monitors (microphone waveform, camera preview) */
        sensor: {
            microphone: {
                /** [plain] Tooltip when the microphone monitor toggle is on */
                on: string;
                /** [plain] Tooltip when the microphone monitor toggle is off */
                off: string;
            };
            camera: {
                /** [plain] Tooltip when the camera monitor toggle is on */
                on: string;
                /** [plain] Tooltip when the camera monitor toggle is off */
                off: string;
            };
        };
        /** The affordance offered when a stage has music but the browser has
         *  not yet allowed sound to start */
        sound: {
            /** [plain] Label for the button that starts sound */
            enable: string;
            /** [plain] Explanation of why sound hasn't started */
            explanation: string;
            /** [plain] Chip shown on stage while an instrument's recordings load, before its music starts */
            loading: Template<['instruments']>;
            /** [plain] Chip shown when an instrument's recordings couldn't load and it will sound synthesized */
            synthesized: Template<['instruments']>;
        };
        /** The buttons offered on a touch screen in place of the on-screen
         *  keyboard, for a project that responds to a known set of keys */
        keypad: {
            /** [plain] Description of the group of key buttons */
            label: string;
            /** [plain] Label for the single button shown when a project responds to any key */
            any: string;
        };
    };
    /** The documentation browser */
    docs: DocumentationText;
    /** The project chat */
    collaborate: {
        /** [plain] The ARIA label for the chat section */
        label: string;
        /** Reading a conversation in another language, and saying what
         *  language you are writing in */
        translate: {
            /** [plain] Label on the picker that chooses what language to read messages in */
            label: string;
            /** [plain] The picker's first option, meaning don't translate — both the state it starts in and the way back to it */
            none: string;
            /** [plain] Button that stops a translation that is still running */
            off: string;
            /** [plain] Button that dismisses a translation failure */
            dismiss: string;
            /** [plain] Label on the picker that says what language the message being written is in */
            writingIn: string;
            /** [plain] Label on the spinner shown while messages are being translated */
            translating: string;
            /** [formatted] Shown while the browser downloads its own translator. $language is the language it is downloading. */
            downloading: Template<['language']>;
            /** [plain] Announced when translating finishes. $#count is how many messages were translated, $language is the language they were translated into. */
            translated: Template<['#count', 'language']>;
            /** [plain] The tag under a translated message. $from is the language it was written in, $to the language it was translated into. */
            direction: Template<['from', 'to']>;
            /** [plain] Shown when the browser translated on this device, so no messages were sent to Wordplay */
            onDevice: string;
            /** [formatted] Shown when the conversation couldn't be translated. $to is the language it was being translated into. */
            error: Template<['to']>;
            /** [plain] Shown in place of one message that couldn't be translated */
            messageError: string;
            /** [plain] Announced when messages couldn't be translated. $#count is how many. */
            messageErrors: Template<['#count']>;
        };
        /** The chat message input field */
        field: {
            /** The chat message input field */
            message: FieldText;
        };
        /** Replying to one message, instead of to the room */
        thread: {
            /** [plain] Button that starts a thread on a message that has none */
            reply: string;
            /** [plain] Button that opens a message's thread. $#count is how many replies it has. */
            replies: Template<['#count']>;
            /** [plain] Tip on a thread that has replies this reader hasn't seen. $#count is how many are new. */
            unseen: Template<['#count']>;
            /** [plain] Header above an open thread */
            header: string;
            /** [plain] Button that leaves a thread and returns to the conversation */
            back: string;
            /** [plain] Shown in an open thread that has no replies yet */
            empty: string;
            /** [plain] The message field's placeholder while writing in a thread */
            placeholder: string;
        };
        /** Reacting to a message with an emoji */
        reaction: {
            /** [plain] Button that opens the reaction chooser */
            add: string;
            /** [plain] The same button once the chooser is open, when pressing it closes it again */
            close: string;
            /** [plain] Button that opens the whole emoji chooser, for a reaction not offered */
            more: string;
            /** [plain] The accessible name of the reaction chooser */
            label: string;
            /** [plain] One of the reactions offered without a search. $emoji names it. */
            pick: Template<['emoji']>;
            /** [plain] A reaction you have not chosen, so pressing adds yours. $emoji names the emoji, $#count is how many people have chosen it. */
            give: Template<['emoji', '#count']>;
            /** [plain] A reaction you have chosen, so pressing takes yours back. $emoji names the emoji, $#count is how many people have chosen it. */
            take: Template<['emoji', '#count']>;
            /** [plain] Shown when a message has collected as many different reactions as it can hold */
            full: string;
        };
        /** Saying which code a message is about */
        reference: {
            /** The control on the message being written that says it is about
             *  wherever the caret is in the code. Pressing it again takes the
             *  link back; there is nothing else to press. */
            mode: ToggleText;
            /** [formatted] Shown in the editor holding the code the message being written is about. $location is the line or lines. */
            prompt: Template<['location']>;
            /** [plain] Names one line of code. $line is its number. */
            line: Template<['line']>;
            /** [plain] Names a run of lines. $first and $last are their numbers. */
            lines: Template<['first', 'last']>;
            /** [plain] The accessible name of a reference in a message. $location is the line or lines it names, $code the code that is there now. */
            label: Template<['location', 'code']>;
            /** [plain] Shown in place of a reference whose code is no longer there */
            invalid: string;
            /** [plain] The marker in the code's gutter that leads to what was said about it. $#count is how many messages are about this code. */
            marker: Template<['#count']>;
        };
        /** [plain] Shown above the add field while nobody has been added yet, saying what the tile is for */
        prompt: string;
        /** What each person in the project may do. These name a privilege, not a
         *  kind of person, so they read both as a cell in the table of people
         *  and as an option in the picker that changes one. */
        role: {
            /** [plain] The privilege of the person who owns the project */
            owner: string;
            /** [plain] The privilege of someone who may edit the project and chat about it */
            collaborate: string;
            /** [plain] The privilege of someone who may chat about the project but not edit it */
            comment: string;
            /** [plain] The privilege of someone who may look at the project but not chat or edit */
            view: string;
            /** [plain] The privilege of a curator of the gallery the project is in, which the project's owner cannot change */
            curate: string;
        };
        /** The table of everyone who can reach the project */
        table: {
            /** [plain] The accessible name of the table listing everyone who can reach the project */
            label: string;
            /** [plain] The accessible name of the picker that changes one person's privilege. $name is that person. */
            choose: Template<['name']>;
            /** [plain] The accessible name of the picker that chooses what a person being added may do */
            adding: string;
            /** [plain] The button at the end of the table that shows the field for adding someone */
            add: string;
            /** [plain] The same button once the field is showing, when pressing it puts the field away */
            cancel: string;
            /** [plain] The accessible name of the row of people, shown in place of the table while a message is being written, who can see the chat */
            audience: string;
        };
        /** Buttons in the chat tile */
        button: {
            /** The chat send button */
            submit: ButtonText;
            /** [plain] The message delete button */
            delete: string;
            /** [plain] Confirm deleting the message */
            confirmDelete: string;
            /** The button that hands ownership of the project to a collaborator.
             *  Its `prompt` is the button's own label, so it stays short enough
             *  not to stretch the row it sits in; what it costs you is said
             *  beside it. */
            transfer: ConfirmText & {
                /** [plain] What the owner gives up by handing the project over */
                consequence: string;
            };
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

            /** [formatted] Shown next to the ownership transfer control when the project is in a gallery, since gallery membership doesn't follow the project to its new owner */
            transferGallery: FormattedText;
        };
        /** Announcements made as collaboration changes. Each names the person,
         *  since an announcement that reads the same twice running is heard
         *  once and then sounds broken. */
        announce: {
            /** [plain] Said when the project is handed to a new owner */
            transferred: Template<['name', 'project']>;
            /** [plain] Said when someone's privilege changes. $name is that person, $privilege what they may now do. */
            privilege: Template<['name', 'privilege']>;
            /** [plain] Said when someone is taken off the project. $name is that person. */
            removed: Template<['name']>;
            /** [plain] Said when a thread is opened. $name is who wrote the message it is about, $#count how many replies it has. */
            thread: Template<['name', '#count']>;
            /** [plain] Said when a reaction is added. $emoji is the emoji, $#count how many people have now chosen it. */
            reacted: Template<['emoji', '#count']>;
            /** [plain] Said when a reaction is taken back. $emoji is the emoji, $#count how many people are left. */
            unreacted: Template<['emoji', '#count']>;
            /** [plain] Said when code is attached to the message being written. $location is the line or lines. */
            attached: Template<['location']>;
            /** [plain] Said when a marker in the code takes the reader to what was said about it. $name is who said it, $opening how it starts. */
            found: Template<['name', 'opening']>;
        };
        /** Controls for restricting project visibility when it is in a gallery */
        restrictGalleryCreatorAccess: {
            /** The toggle mode for restricting project visibility to owner and curators only */
            mode: ModeText<[string, string]>;
        };
        /** Interactive tour explaining the collaborate tile */
        tour: {
            /** [plain] Tooltip on the help button that opens the tour */
            launch: string;
            /** [formatted] Markup describing the collaborate panel */
            collaborate: FormattedText;
            /** [formatted] Markup describing the table of people and what each privilege means */
            collaborators: FormattedText;
            /** [formatted] Markup describing the field that adds someone to the project */
            add: FormattedText;
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
            /** [plain] The button that shows the previous track of a music */
            previousTrack: string;
            /** [plain] The button that shows the next track of a music */
            nextTrack: string;
            /** [plain] The button that adds a track to a music */
            addTrack: string;
            /** [plain] The button that removes the track being shown */
            removeTrack: string;
            /** [plain] The button that removes every note from the track being shown */
            clearTrack: string;
            /** [plain] The button that moves the player back to the start */
            rewind: string;
            /** [plain] The button that plays only the track being edited */
            playTrack: string;
            /** [plain] The button that stops the track being edited */
            pauseTrack: string;
            /** [plain] The button that plays the music being edited */
            playMusic: string;
            /** [plain] The button that stops the music being edited */
            pauseMusic: string;
            /** [plain] The button that imports a MIDI file as a new music */
            importMIDI: string;
            /** [plain] The button that starts recording humming to transcribe */
            record: string;
            /** [plain] The button that stops recording and transcribes what was heard */
            stopRecording: string;
            /** [plain] The button that makes the focused note into a chord */
            makeChord: string;
            /** [plain] The button that reduces the focused chord back to one note */
            unmakeChord: string;
            /** [plain] The button in the palette's read-only prompt that switches to edit mode */
            editMode: string;
        };
        /** The row of buttons at the top of the palette that add output */
        toolbar: {
            /** [plain] The ARIA label for the row of buttons that add output */
            label: string;
            /** [plain] The button that adds a @Phrase */
            addPhrase: string;
            /** [plain] The button that adds a @Phrase, when it will show the program's existing value as text instead */
            wrapPhrase: string;
            /** [plain] The button that adds a @Shape shaped like a rectangle */
            addRectangle: string;
            /** [plain] The button that adds a @Shape shaped like a circle */
            addCircle: string;
            /** [plain] The button that adds a @Shape shaped like a polygon */
            addPolygon: string;
            /** [plain] The button that adds a @Shape shaped like a drawn path */
            addPath: string;
            /** Toggle for drawing a @Path on stage by dragging, clicking, or with the arrow keys */
            draw: ToggleText;
            /** [plain] A shape button, when it will show the @Form the program already has instead of adding a new one */
            wrapForm: string;
            /** [plain] The button that collects the selected output into a @Group */
            group: string;
            /** [plain] The group button, when nothing is selected to group */
            groupEmpty: string;
            /** [plain] The group button, when the selected output is in more than one place */
            groupScattered: string;
            /** [plain] The group button, when something selected is not allowed inside a @Group */
            groupKind: string;
            /** [plain] The button that wraps everything in a @Stage */
            addStage: string;
            /** [plain] The stage button, when there is already a @Stage */
            stageExists: string;
            /** [plain] The button that adds @Music */
            addMusic: string;
            /** [plain] The button that adds a @Say */
            addSay: string;
        };
        prompt: {
            /** [formatted] Prompt if no selection */
            select: FormattedText;
            /** [formatted] The text prompting the creator to edit the selected output */
            editing: FormattedText;
            /** [formatted] Shown at the top of the palette in step and play modes, explaining that values are read-only */
            readonly: FormattedText;
        };
        /** The music editor, shown when a Music is selected */
        music: {
            /** [plain] The ARIA label for the staff a track's notes are edited on */
            staff: string;
            /** [plain] The strip along the staff that chooses which beat to play from */
            cursor: string;
            /** What a MIDI import reports about what it could and couldn't keep.
             *  Each is a structured finding from the converter, so the numbers
             *  come from the file rather than from the sentence. */
            findings: {
                /** [formatted] Polyphonic tracks were split into several Tracks */
                tracksSplit: Template<['#count', 'extra']>;
                /** [formatted] Percussion notes with no matching kit piece were dropped */
                percussionDropped: Template<['#count']>;
                /** [formatted] Tracks past the limit were dropped */
                tracksTruncated: Template<['#count', 'cap']>;
                /** [formatted] Pitches outside the scale moved to the nearest degree */
                pitchesSnapped: Template<['#count', 'scale', 'semitones']>;
                /** [formatted] Note lengths were rounded slightly */
                beatsRounded: Template<['#count', 'error']>;
                /** [formatted] Tempo changes were folded into note lengths, since Music has one tempo */
                tempoFolded: Template<['#count', 'using']>;
                /** [formatted] Time signature changes were ignored */
                meterChanges: Template<['#count']>;
                /** [formatted] A track's velocity range, which becomes per-note volume */
                velocityRange: Template<['#count', 'track']>;
                /** [formatted] Notes far from the tonic will play but not from a sampled zone */
                outOfRange: Template<['#count']>;
            };
            /** [formatted] Shown while a MIDI file is being read, with how far along it is */
            importing: Template<['percent', 'step']>;
            /** The named steps of an import, so the wait says what it's doing */
            steps: ModeText<[string, string, string, string, string]>;
            /** [formatted] Shown when a MIDI file holds more than a project can */
            tooBig: Template<['#count', 'cap']>;
            /** [plain] Shown when the chosen file isn't a MIDI file */
            notMIDI: string;
            /** [plain] Shown when a MIDI file can't be read */
            badMIDI: string;
            /** [formatted] Explains what recording does, shown while it listens */
            listening: FormattedText;
            /** [formatted] Shown when a recording had nothing recognizable in it */
            heardNothing: FormattedText;
            /** [formatted] Reports what a recording became */
            transcribed: Template<['#count', 'scale', 'tempo']>;
            /** [formatted] Shown when the microphone isn't available */
            noMicrophone: FormattedText;
            /** [formatted] Summarizes what was imported */
            imported: Template<['#count', 'notes']>;
            /** [plain] The heading of the dialog reporting what an import kept and changed */
            report: string;
            /** [formatted] Explains what the import report is for */
            reportExplanation: FormattedText;
            /** [plain] The label for the dropdown choosing which music to edit */
            chooser: string;
            /** [plain] How a music with no name of its own is listed in the chooser */
            unnamed: Template<['count']>;
            /** [formatted] Which track of how many is shown. The count stands
             *  alone rather than inflecting a noun ("track 2 of 3"), so it is a
             *  plain input rather than a '#count'. */
            track: Template<['count', 'total']>;
            /** The picker choosing how long a placed note lasts. The labels are
             *  the note-value glyphs themselves, which read the same in every
             *  language, so only the descriptions are really translated. */
            duration: ModeText<[string, string, string, string, string]>;
            /** [plain] Shown in place of the staff when a track's notes are computed rather than written out */
            computed: string;
            /** [plain] How one note reads to a screen reader: its degree and the beat it starts on */
            note: Template<['degree', 'beat']>;
            /** [plain] How a rest reads to a screen reader */
            rest: Template<['beat']>;
            /** [plain] Announced when a note is added */
            added: Template<['degree', 'beat', '#count']>;
            /** [plain] Announced when a note is removed */
            removed: Template<['degree', 'beat', '#count']>;
            /** [plain] Announced when a note moves to a new degree */
            moved: Template<['degree', 'beat']>;
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
            /** The pre-defined sequence picker */
            preset: {
                /** [plain] Label for the pre-defined sequence dropdown */
                label: string;
                /** [plain] The option for a hand-written sequence of poses */
                custom: string;
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
    /** The evaluation-history timeline and stepping controls, hosted in the output toolbar in edit and debug modes */
    timeline: {
        /** [plain] The description of the timeline slider */
        slider: string;
        button: {
            /** [plain] Evaluate in real time (used by doc example players) */
            play: string;
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
        /** Explanations of the stepping controls, shown in the stage tour */
        tour: {
            /** [formatted] Markup describing the evaluation-history timeline */
            timeline: FormattedText;
            /** [formatted] Markup describing the edit/step/play mode switcher */
            modes: FormattedText;
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
        /** [plain] Message shown when the targeted UI is tucked inside an overflow menu, and the menu's toggle is highlighted instead */
        overflowed: string;
    };
    dialog: {
        /** The sharing dialog */
        share: HeaderAndExplanationText & {
            /** The prose introducing each of the dialog's tabbed sections. Only
             *  the public/private section keeps a header of its own, because it
             *  is also rendered outside this dialog, on a gallery's page. */
            subheader: {
                /** The gallery section's explanation */
                gallery: ExplanationText;
                /** The public/private toggle subheader and explanation */
                public: HeaderAndExplanationText;
                /** The personal information section's explanation */
                pii: ExplanationText;
                /** The preview-glyph customization section's explanation */
                preview: ExplanationText;
                /** The remix provenance section's explanation */
                remix: ExplanationText;
                /** The research consent subheader and explanation. Sits inside
                 *  the public/private section, since it is a second, narrower
                 *  permission about the same project. */
                research: HeaderAndExplanationText;
            };
            /** The tabs that switch between the dialog's sharing settings */
            tab: ModeText<[string, string, string, string, string]>;
            /** Personal information details in the share dialog */
            pii: {
                /** [formatted] Shown in place of the list when no personal information was found in the project */
                none: FormattedText;
            };
            /** Remix provenance details in the share dialog */
            remix: {
                /** [formatted] Shown above the project this one was remixed from */
                source: FormattedText;
                /** [formatted] Shown above the list of projects that remixed this one */
                remixes: FormattedText;
                /** [formatted] Shown on a public project of yours that no one has publicly remixed yet */
                none: FormattedText;
                /** [plain] Shown when the source project can't be loaded, because it was deleted or isn't public */
                unknown: string;
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
                preview: TipsModeText<[string, string]>;
                /** The research consent toggle mode widget */
                research: ModeText<[string, string]>;
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
            /** The tabs that switch between groups of settings */
            tab: ModeText<[string, string, string, string]>;
            /** Names the output each group of settings belongs to, so the labels
             *  beneath them don't each have to repeat it. Music and Say are the
             *  names of Wordplay's own output types; cues are the app's own
             *  sounds rather than a program's. */
            subheader: {
                /** [plain] Heads the settings for Music output */
                music: string;
                /** [plain] Heads the settings for Say output */
                say: string;
                /** [plain] Heads the settings for the sounds the app makes as a program evaluates */
                cues: string;
            };
            mode: {
                /** The project tile layout mode */
                layout: ModeText<
                    [string, string, string, string, string, string]
                >;
                /** Where the stage sits in the layouts that lay tiles out on
                 *  axes, which mirrors the other tiles around it */
                placement: ModeText<[string, string, string, string]>;
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
                /** Whether a project's colors are shown as written or flipped to suit a dark screen */
                adaptOutput: ModeText<[string, string]>;
                /** The writing layout direction (automatic, horizontal, vertical rtl, vertical ltr) */
                writing: ModeText<[string, string, string, string]>;
                /** The blocks on/off mode */
                blocks: ModeText<[string, string]>;
                /** The keyword display mode: built-in keywords as symbols or as localized words */
                words: ModeText<[string, string]>;
                /** The block-editing density mode (compact/normal/spacious) */
                blockDensity: ModeText<[string, string, string]>;
                /** The space_indicator on/off mode */
                space: ModeText<[string, string]>;
                /** The line number on/off mode */
                lines: ModeText<[string, string]>;
                /** The soft-wrap on/off mode for the editor's text mode */
                wrap: ModeText<[string, string]>;
                /** The tab key behavior mode (switch focus/insert tab) */
                tab: ModeText<[string, string]>;
                /** How music is shown: as an orchestra, as a light show, as a mood cloud, as sheet music, or not at all */
                musicVisualization: ModeText<
                    [string, string, string, string, string]
                >;
                /** How loud music is: off, quiet, or full */
                musicVolume: ModeText<[string, string, string]>;
                /** How far music ducks while something is being spoken */
                musicDucking: ModeText<[string, string, string]>;
                /** Whether to vibrate on the beat where the device supports it */
                haptics: ModeText<[string, string]>;
                /** Whether to sound a short cue each time the program reevaluates, naming what caused it */
                cues: ModeText<[string, string]>;
                /** Whether to sound the stage's physics collisions */
                contactCues: ModeText<[string, string]>;
                /** Whether to sound what an animation is doing as it reaches each pose */
                animationCues: ModeText<[string, string]>;
                /** How big the caption of what Say is speaking is, as a multiple of the standard text size */
                captionSize: ModeText<[string, string, string, string, string]>;
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
                /** [plain] Title for a notice that something the reader made was reported and is being reviewed. Never says who reported it. */
                reportedHeader: Template<['title']>;
                /** [plain] Title for a notice confirming the reader's report reached whoever is responsible */
                reportReceivedHeader: Template<['title']>;
                /** [plain] Title for a notice that a decision was made about something the reader made */
                decisionHeader: Template<['title']>;
                /** [plain] Title for a notice that a decision was made about something the reader reported */
                outcomeHeader: Template<['title']>;
                /** [plain] Label before the list of rules a decision found were broken */
                because: string;
                /** [plain] Label before a moderator's note to the person whose content it was */
                note: string;
                /** [plain] Link label to view notification details */
                link: string;
            };
            /** [plain] Tooltip for the button that deletes a notification */
            delete: string;
            /** The link to the moderation queue, shown only to someone responsible for reviewing something */
            moderate: ButtonText;
            /** [plain] Said to screen readers when notifications arrive. Carries
             *  the count, because a live region handed the same string twice
             *  stays silent — a constant here is heard once and never again. */
            popup: Template<['#count']>;
        };
        /** The locale chooser dialog */
        locale: HeaderAndExplanationText & {
            /** [plain] Invitation to pick a language, shown to a visitor who hasn't chosen one yet. Every locale's translation of this is shown at once, so keep it short. */
            choose: string;
            /** [formatted] Banner at the top of the dialog prompting users to enter localization mode via the pencil icon in the app footer. */
            localizeHelp: FormattedText;
            /** Subheaders in the local chooser dialog. */
            subheader: {
                /** [plain] How to label the locales that have been selected */
                selected: string;
                /** [plain] How to label the supported locales that have not been selected */
                supported: string;
            };
            /** The field that filters the available locales by name or region */
            search: FieldText;
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
                /** [plain] Placeholder for the field that filters the language and region dropdowns. */
                searchPlaceholder: string;
                /** [plain] Description of the field that filters the language and region dropdowns. */
                searchDescription: string;
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
                /** [plain] Link text shown when someone had already requested this language; the link points to that issue. */
                alreadyRequested: string;
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
    };
    /** Transient top-of-page banner messages for one-off action failures that
     *  aren't tied to a form field (e.g. a delete that couldn't reach the
     *  cloud). Also reused for inline notices on form actions. */
    banner: {
        /** [plain] Shown when deleting something didn't reach the cloud */
        deleteFailed: string;
        /** [plain] Shown when saving a change didn't reach the cloud */
        saveFailed: string;
        /** [plain] Shown when submitting something (e.g. feedback) didn't reach the cloud */
        submitFailed: string;
        /** [plain] Shown when loading/reading something from the cloud failed.
         *  Belongs inline, next to the missing content, or on the one page whose
         *  content is the thing that failed — never as a floating banner, which
         *  outlives the page that raised it and reads as an error about a page
         *  that loaded fine. */
        loadFailed: string;
        /** [plain] Shown when a local (this-device) save failed because storage
         *  is full, but the data is still safe in the cloud */
        storageFull: string;
        /** [plain] Shown proactively when this device's storage is nearly full */
        storageNearFull: string;
        /** [plain] Shown when a change is too large to save (exceeds the cloud
         *  document size limit) */
        saveTooLarge: string;
    };
    /** Notification shown when a newer version of the app has been deployed while the tab was open. */
    update: {
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
        /** [plain] Label for the section that shows this locale's writing guidance */
        guidance: string;
        /** The switch that shows and hides this locale's writing guidance */
        guidanceToggle: ToggleText;
        /** [plain] Shown in place of this locale's guidance when none has been written yet, as an invitation to write some */
        guidanceEmpty: string;
        /** The per-locale word list editor: keys mapped to phrases, substituted wherever `$key` appears in this locale's text. */
        terms: {
            /** [plain] Header for the word list (terms) editor section */
            header: string;
            /** [formatted] An explanation of the per-locale word list */
            description: FormattedText;
            /** [plain] Shown when this locale has defined no terms yet, as an invitation to add some */
            empty: string;
            /** The field for a new term's key (the word after the $) */
            key: FieldText;
            /** The field for a new term's phrase (what the key expands to) */
            phrase: FieldText;
            /** [plain] Tooltip for the button that adds a new term */
            add: string;
            /** [plain] Tooltip for the button that removes a term */
            remove: string;
            /** [plain] Error shown when a term key is not a valid identifier (must start with a letter and use only letters and numbers, in any language) */
            invalidKey: string;
            /** [plain] Error shown when a term key is already defined in this locale */
            duplicateKey: string;
            /** [plain] Error shown when a term key collides with a template input name and so can't be used */
            reservedKey: string;
        };
        /** The glossary's other written forms: the plurals, conjugations, and
         *  synonyms a reference to a term may also use. Each locale writes its
         *  own, so how many a language needs is its own business. */
        glossary: {
            /** [plain] Header for the glossary forms editor section */
            header: string;
            /** [formatted] An explanation of a term's other written forms */
            description: FormattedText;
            /** [plain] Label above the English forms shown as a reference beside a term */
            reference: string;
            /** [plain] Shown beside a term that has no other written forms yet, as an invitation to add some */
            empty: string;
            /** The field for a new written form of a term */
            form: FieldText;
            /** [plain] Tooltip for the button that adds a written form to a term */
            add: string;
            /** [plain] Tooltip for the button that removes a written form from a term */
            remove: string;
            /** [formatted] Error shown when a form is the term's own word, which already works on its own */
            ownWord: FormattedText;
            /** [formatted] Error shown when a form is another term's word, so a reference to it would be ambiguous. $term = that term's word */
            otherWord: Template<['term']>;
            /** [formatted] Error shown when a form is the name of something the documentation already defines, which a reference finds first */
            conceptName: FormattedText;
            /** [formatted] Error shown when a form is already a written form of another term. $term = that term's word */
            alreadyUsed: Template<['term']>;
            /** [formatted] Note shown when a form contains something a reference can't include, so it only helps searching */
            searchOnly: FormattedText;
        };
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
            /** Guidance for a count input, whose template must choose one
             *  version of the sentence per plural form this language has. */
            plural: {
                /** [plain] Subheader above the list of plural forms */
                header: string;
                /** [plain] Tooltip on a count input's chip, explaining that inserting it writes one slot per plural form. $forms = how many forms this language has */
                tip: Template<['forms']>;
                /** [plain] Prose shown when a count's branch has the wrong number of versions. $name = the input, $found = versions written, $expected = versions needed */
                arity: Template<['name', 'found', 'expected']>;
                /** [plain] Prose shown when a count is mentioned without choosing a version. $name = the input */
                missing: Template<['name']>;
                /** [plain] Label for the column showing an example number for each plural form */
                example: string;
            };
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
    /** The phoneme chooser, which lists the sounds the singing voice can make */
    phonemes: {
        /** [plain] The phoneme chooser expand/collapse toggle */
        toggle: ToggleText;
        /** [plain] Headings for the sound groups, in the order phonemes.ts
         * lists them: vowel, approximant, lateral, nasal, fricative, trill,
         * plosive, click. */
        groups: string[];
        /** [plain] An English word containing each sound, one per symbol in
         * the order phonemes.ts lists them. These cannot be machine
         * translated — a translator would translate the word rather than pick
         * one containing the sound — so each locale needs a speaker of it to
         * choose its own. */
        examples: string[];
        /** [plain] ARIA label for the button that plays a sound. $symbol is the IPA letter. */
        play: Template<['symbol']>;
        /** [plain] ARIA label for the button that types a sound into the code. $symbol is the IPA letter. */
        insert: Template<['symbol']>;
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
        /** Whether a picked emoji is inserted in color or black and white */
        presentation: ModeText<[string, string]>;
        /** [plain] Suffix appended after the first few language names captioning a script option, when more languages use the script than fit. $count is the number of additional languages. */
        moreLanguages: Template<['count']>;
        /** [plain] Hint shown in the glyph area when no category and no script is selected */
        pickFilter: string;
        /** [plain] Hint shown below a large glyph grid that was capped. $count is how many are shown; the rest are reachable by searching. */
        moreGlyphs: Template<['count']>;
        /** Emoji category labels for the filter. The last is the search tab,
         *  which only appears while a query is active. */
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
                string,
            ]
        >;
    };
};

export { type UITexts as default };
