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
        /** Title of how-to space in the gallery view */
        header: string;
        /** Subtitle for the how-to space in the gallery view */
        subheader: string;
        /** Subtitle for the how-to space in the gallery if no how-tos */
        subheaderEmpty: string;
        /** Prompt for the how-to space in the gallery view */
        prompt: string;
    };
    /** Tooltip for header/breadcrumb to gallery for the how-to space page */
    headerTooltip: string;
    drafts: {
        /** Header for the drafts area */
        header: string;
        /** Explanation for the drafts area */
        prompt: string;
        /** Tooltip for viewing a draft */
        tooltip: string;
        /** Text indicating that the how-to is currently a draft */
        note: string;
    };
    bookmarks: {
        /** Header for the bookmarks area */
        header: string;
        /** Bookmarks  tooltip */
        tooltip: string;
        /** Button text for bookmarking the how-to */
        canBookmark: ButtonText;
        /** For when a how-to is already bookmarked */
        alreadyBookmarked: ButtonText;
        /** When there are no bookmarks */
        empty: string;
        /** Error message if the user is not logged in */
        notLoggedIn: string;
    };
    /** Navigation tooltip */
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
        /** Placeholder for an untitled how-to */
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
        /** Label for options for translation */
        localeOptionsLabel: string;
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
            /** Text for asking if the user used this how-to in their project or another how-to */
            prompt: string;
            /** Text for if the user does not have any other how-tos or projects */
            empty: string;
            /** Text for how many others projects or how-tos, other than the user's own, have used this how-to */
            countDisplay: string;
            /** Options text for selecting which projects and how-tos used this how-to */
            selector: string;
            removeButton: string;
            addButton: string;
        };
        /** Prompt for reaction summary */
        reactionsPrompt: string;
        /** Text for prompting users to chat */
        chatPrompt: string;
        /** Button text for copying the how-to's URL */
        link: ButtonText;
        /** Label for list of creators and collaborators */
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
            /** Name of visibility option for limiting visibility to gallery curators and creators */
            limited: string;
            /** Name of visibility option for making how-tos visible to anyone who has access to the curator's galleries */
            expanded: string;
        };
        /** Subheaders and descriptions for configuring guiding questions */
        guidingQuestions: {
            /** Guiding questions header */
            subheader: HeaderAndExplanationText;
            /** Guiding questions description */
            descriptor: string;
            /** Guiding questions default text */
            default: string[];
        };
        /** Subheaders and descriptions for configuring reaction options */
        reactions: {
            /** Reactions header */
            subheader: HeaderAndExplanationText;
            /** Reaction picker tip */
            reactionPickerTip: string;
            /** Reaction picker description tip */
            reactionDescriptionTip: string;
            /** Add reaction tip */
            addReactionTip: string;
            /** Remove reaction tip */
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
        /** When the how-to is not known or is not public */
        unknown: string;
    };
};

export type { PageText as default };
