import type { FormattedText, Template } from '@locale/LocaleText';
import type { ConfirmText, FieldText, ModeText } from '@locale/UITexts';

type PageText = {
    /** [plain] The header for the localization workspace page */
    header: string;
    /** [formatted] Introduction to the workspace shown above the dropdown */
    description: FormattedText[];
    /** [plain] Visible label for the link from the in-context Localizer side
     *  panel to the full workspace page where translators see all strings and
     *  submit their edits. */
    workspaceLink: string;
    /** [plain] Header for the section that lists strings to write or review */
    workspaceHeader: string;
    /** [plain] Header for the section that contains the publish form */
    submitHeader: string;
    /** [formatted] Paragraph shown at the top of the publish section */
    submitPrompt: FormattedText;
    /** [formatted] Note explaining that each submission targets one locale at
     *  a time. Rendered alongside the submit prompt. The active locale is
     *  inserted via a `$1` template placeholder. */
    oneLocaleNote: Template<['locale']>;
    /** [plain] Header above the bundle review viewer */
    bundleSummary: string;
    /** [plain] Tooltip for the bundle-item viewer body that jumps back to the editor and scrolls to the top */
    editEntry: string;
    /** [plain] Tooltip for the button that discards a single edit from the bundle */
    revertEntry: string;
    /** [plain] Tooltip for the back arrow that moves to the previous edit in the bundle */
    prevBundleItem: string;
    /** [plain] Tooltip for the forward arrow that moves to the next edit in the bundle */
    nextBundleItem: string;
    /** Multiline text box for the contributor's description of the batch of edits */
    descriptionField: FieldText;
    /** [plain] Checkbox label confirming the contributor's submission is not spam */
    notSpamLabel: string;
    /** [plain] Note shown below the not-spam checkbox explaining the project context */
    notSpamNote: string;
    /** [plain] Notice shown when the user is not logged in and tries to view this page */
    requireLogin: string;
    /** [plain] Warning shown below the editor when the draft contains words that
     *  occur only once across the entire locale, hinting at possible typos or
     *  inconsistent vocabulary. The actual word list is rendered separately. */
    singletonWordsWarning: string;
    /** [plain] Warning shown below the editor when the draft uses a glossary
     *  term as plain prose; each finding is offered as a one-click fix that
     *  swaps it for a symbolic @term reference (rendered separately). */
    literalTermsWarning: string;
    /** [plain] Tooltip for the button that checks the current string's reading
     *  level with an AI assistant. */
    checkReadingLevel: string;
    /** [plain] Result shown when the AI judges the current string too complex
     *  for the target ~6th-grade reading level. */
    readingLevelComplex: string;
    /** [plain] Result shown when the AI judges the current string's reading
     *  level acceptable. */
    readingLevelOk: string;
    /** The submit button shown after the contributor has reviewed their bundle */
    submit: ConfirmText;
    /** [formatted] Notice rendered after the server accepts a submitted batch.
     *  The backend opens a GitHub pull request and returns its URL; the success
     *  Notice combines this text with a link the contributor can click to view
     *  and comment on the PR. */
    submitSuccess: FormattedText;
    /** [plain] Label for the link in the success Notice that opens the freshly
     *  created GitHub pull request. */
    viewPR: string;
    /** [formatted] Notice rendered after the server rejects a submitted batch.
     *  Surfaced when the backend reports a network or server error. */
    submitError: FormattedText;
    /** [plain] Notice text shown when no strings match the current filter */
    empty: string;
    /** [plain] Tooltip for the back arrow that moves to the previous entry in the filtered list */
    prevEntry: string;
    /** [plain] Tooltip for the forward arrow that moves to the next entry in the filtered list */
    nextEntry: string;
    /** Mode widget that filters the dropdown to "all" strings or only the
     *  machine-translated ones. The "machine translated" option is the default. */
    qualityMode: ModeText<[string, string]>;
    /** Mode widget that filters the dropdown by top-level locale section.
     *  First option is "all sections"; the rest correspond to `section` keys
     *  in the same order as `sectionOrder` in +page.svelte. */
    sectionMode: ModeText<
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
        ]
    >;
    /** Localized labels for the top-level sections of the locale file */
    section: {
        /** [plain] Section label for glossary: shared vocabulary used across the platform */
        glossary: string;
        /** [plain] Section label for token descriptions */
        token: string;
        /** [plain] Section label for node: programming language constructs */
        node: string;
        /** [plain] Section label for basis: built-in types like number, text, list */
        basis: string;
        /** [plain] Section label for input: streams and input sources */
        input: string;
        /** [plain] Section label for output: visual output types */
        output: string;
        /** [plain] Section label for ui: the application user interface */
        ui: string;
        /** [plain] Section label for gallery: the default gallery content */
        gallery: string;
        /** [plain] Section label for moderation: content moderation messages */
        moderation: string;
    };
};

export type { PageText as default };
