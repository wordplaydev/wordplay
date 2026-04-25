import type { FormattedText } from '@locale/LocaleText';
import type {
    ButtonText,
    ConfirmText,
    FieldText,
    HeaderAndExplanationText,
    ModeText,
    ToggleText,
} from '@locale/UITexts';

type PageText = {
    /** Headers on the gallery page */
    galleryView: {
        /** [plain] Title of how-to space in the gallery view */
        header: string;
        /** [plain] Subtitle for the how-to space in the gallery view */
        subheader: string;
        /** [plain] Subtitle for the how-to space in the gallery if no how-tos */
        subheaderEmpty: string;
        /** [formatted] Prompt for the how-to space in the gallery view */
        prompt: FormattedText;
    };
    /** [plain] Tooltip for header/breadcrumb to gallery for the how-to space page */
    headerTooltip: string;
    drafts: {
        /** [plain] Header for the drafts area */
        header: string;
        /** [plain] Explanation for the drafts area */
        prompt: string;
        /** [plain] Tooltip for viewing a draft */
        tooltip: string;
        /** [formatted] Text indicating that the how-to is currently a draft */
        note: FormattedText;
    };
    bookmarks: {
        /** [plain] Header for the bookmarks area */
        header: string;
        /** [plain] Bookmarks  tooltip */
        tooltip: string;
        /** Button text for bookmarking the how-to */
        canBookmark: ButtonText;
        /** For when a how-to is already bookmarked */
        alreadyBookmarked: ButtonText;
        /** [plain] When there are no bookmarks */
        empty: string;
        /** [plain] Error message if the user is not logged in */
        notLoggedIn: string;
    };
    /** [plain] Navigation tooltip */
    navigationtooltip: string;
    /** Buttons for the how-to space */
    button: {
        /** Button text for the canvas reset button */
        reset: ButtonText;
    };
    editor: {
        /** Dialog text for how-to form (new how-to or edit existing) */
        newForm: HeaderAndExplanationText;
        /** Dialog text for how-to form when editing an existing how-to */
        editForm: HeaderAndExplanationText;
        /** Button text for submitting the how-to */
        post: ButtonText;
        /** Button text for saving a how-to draft */
        save: ButtonText;
        /** Checkbox text for opting out of notifying subscribers */
        notification: ModeText<[string, string]>;
        /** How-to content editor */
        editor: FieldText;
        /** Field text for how-to title */
        title: FieldText;
        /** [plain] Placeholder for an untitled how-to */
        untitledHowToPlaceholder: string;
        /** Header for collaborator settings */
        collaborators: HeaderAndExplanationText;
        /** Collaborator toggle text */
        collaboratorsToggle: ToggleText;
        /** Header for access settings */
        access: HeaderAndExplanationText;
        /** Access settings toggle text */
        accessToggle: ToggleText;
        /** Mode text for opting in/out of expanded access to how-tos */
        accessMode: ModeText<[string, string]>;
        /** [plain] Label for options for translation */
        localeOptionsLabel: string;
        /** [plain] Explanation for public/private visibility setting */
        publicExplanation: string;
        /** Mode text for setting the how-to to be publicly visible */
        publicMode: ModeText<[string, string]>;
    };
    viewer: {
        /** Button text for viewing the how-to */
        view: ButtonText;
        /** Button text for editing the how-to */
        edit: ButtonText;
        /** Button text for deleting the how-to */
        delete: ConfirmText;
        /** Button text for submitting the how-to to be included in the public guide */
        submitToGuide: {
            submit: ButtonText;
            alreadySubmitted: ButtonText;
        };
        usedBy: {
            /** [plain] Text for asking if the user used this how-to in their project or another how-to */
            prompt: string;
            /** [formatted] Text for if the user does not have any other how-tos or projects */
            empty: FormattedText;
            /** [plain] Text for how many others projects or how-tos, other than the user's own, have used this how-to */
            countDisplay: string;
            /** [plain] Options text for selecting which projects and how-tos used this how-to */
            selector: string;
            removeButton: string;
            addButton: string;
        };
        /** [plain] Prompt for reaction summary */
        reactionsPrompt: string;
        /** [plain] Text for prompting users to chat */
        chatPrompt: string;
        /** Button text for copying the how-to's URL */
        link: ButtonText;
        /** [plain] Label for list of creators and collaborators */
        collaborators: string;
    };
    /** For configuring the how-to space */
    configuration: {
        /** Dialog header and explanation for configuring settings */
        configurationDialog: HeaderAndExplanationText;
        /** Button text for opening configuration dialog */
        configurationButton: ButtonText;
        /** Subheaders and descriptions for configuring visibility */
        visibility: {
            subheader: HeaderAndExplanationText;
            mode: ModeText<[string, string]>;
            /** [plain] Name of visibility option for limiting visibility to gallery curators and creators */
            limited: string;
            /** [plain] Name of visibility option for making how-tos visible to anyone who has access to the curator's galleries */
            expanded: string;
        };
        /** Subheaders and descriptions for configuring guiding questions */
        guidingQuestions: {
            /** Guiding questions header */
            subheader: HeaderAndExplanationText;
            /** [plain] Guiding questions description */
            descriptor: string;
            /** Guiding questions default text */
            default: string[];
        };
        /** Subheaders and descriptions for configuring reaction options */
        reactions: {
            /** Reactions header */
            subheader: HeaderAndExplanationText;
            /** [plain] Reaction picker tip */
            reactionPickerTip: string;
            /** [plain] Reaction picker description tip */
            reactionDescriptionTip: string;
            /** [plain] Add reaction tip */
            addReactionTip: string;
            /** [plain] Remove reaction tip */
            removeReactionTip: string;
            /** Default reactions */
            default: Record<string, string>;
        };
        submit: ButtonText & {
            error: string;
        };
    };
    /** For announcing changes to the canvas or to how-to positions */
    announce: {
        howToPosition: string;
        canvasPosition: string;
        moveActivated: string;
        moveDeactivated: string;
    };
    error: {
        /** [plain] When the how-to is not known or is not public */
        unknown: string;
    };
};

export type { PageText as default };
