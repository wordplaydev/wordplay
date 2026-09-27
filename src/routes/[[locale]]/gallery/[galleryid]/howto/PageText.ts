import type { FormattedText, Template } from '@locale/LocaleText';
import type {
    ButtonText,
    ConfirmText,
    FieldText,
    HeaderAndExplanationText,
    IconButtonText,
    ModeText,
    ToggleText,
} from '@locale/UITexts';

type PageText = {
    /** Headers on the gallery page */
    galleryView: {
        /** [plain] Title of how-to space in the gallery view */
        header: string;
        /** [plain] Subtitle for the how-to space in the gallery view */
        subheader: Template<['#total', 'new']>;
        /** [plain] Subtitle for the how-to space in the gallery if no how-tos */
        subheaderEmpty: string;
        /** [formatted] Prompt for the how-to space in the gallery view */
        prompt: FormattedText;
    };
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
        /** [formatted] Shown in the editor when the gallery has no guiding questions to answer */
        noGuidingQuestions: FormattedText;
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
        view: IconButtonText;
        /** Button text for editing the how-to */
        edit: ButtonText;
        /** Button text for deleting the how-to */
        delete: ConfirmText;
        /** Button text for submitting the how-to to be included in the public guide */
        submitToGuide: {
            submit: ButtonText;
            alreadySubmitted: ButtonText;
            /** [plain] Label for the row in the Sharing section where the how-to can be submitted to the public guide, and where that request stands */
            label: string;
        };
        usedBy: {
            /** [plain] Label for the row listing the projects and how-tos that used this how-to */
            label: string;
            /** [formatted] Text for if the user does not have any other how-tos or projects */
            empty: FormattedText;
            /** [plain] Text for how many others projects or how-tos, other than the user's own, have used this how-to */
            countDisplay: Template<['#count']>;
            /** [plain] Options text for selecting which projects and how-tos used this how-to */
            selector: string;
            /** [plain] Button to remove a project/how-to from those using this how-to */
            removeButton: string;
            /** [plain] Button to add a project/how-to to those using this how-to */
            addButton: string;
        };
        /** Sharing a how-to into other galleries as the same how-to, not a copy (#1065) */
        repost: {
            /** [plain] Label for the list of the other galleries this how-to has been shared in, besides the one it belongs to. A noun phrase, since it labels a list of gallery names that follows it */
            prompt: string;
            /** [plain] Label before the picker for choosing another gallery to share this how-to in */
            add: string;
            /** [plain] Accessible name of the picker for choosing another gallery to share this how-to in */
            selector: string;
            /** [plain] Tooltip for the button that shares this how-to in the chosen gallery */
            addButton: string;
            /** [plain] Tooltip for the button that stops sharing this how-to in one gallery */
            removeButton: string;
            /** [plain] Label for the name of the gallery this how-to belongs to, shown when it is read in another gallery it is shared in. A noun phrase, since it labels the gallery name that follows it */
            from: string;
            /** [formatted] Explains, below that, that one how-to is shared rather than copied */
            same: FormattedText;
            /** [plain] Error shown when this how-to could not be shared in a gallery or stopped being shared there */
            failed: string;
        };
        /** [plain] Header for the section of the how-to where readers respond to it: reactions, what used it, and comments */
        responses: string;
        /** [plain] Header for the section about where the how-to is shared: its gallery, other galleries, and the public guide */
        sharing: string;
        /** [plain] Label for the row of reaction buttons */
        reactions: string;
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
            /** [plain] Label for options for galleries to add as expanded permissions */
            expandedOptions: string;
            /** [plain] Label for adding a gallery to expanded list */
            expandedAdd: string;
            /** [plain] Label for removing a gallery from expanded list */
            expandedRemove: string;
        };
        /** Subheaders and descriptions for configuring guiding questions */
        guidingQuestions: {
            /** Guiding questions header */
            subheader: HeaderAndExplanationText;
            /** [plain] Guiding questions description */
            descriptor: string;
            /** [plain] Guiding questions default text */
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
            /** [plain] Default reactions */
            default: Record<string, string>;
        };
        submit: ButtonText & {
            /** [plain] Error shown when saving how-to configuration fails */
            error: string;
        };
    };
    /** [formatted] For announcing changes to the canvas or to how-to positions */
    announce: {
        howToPosition: Template<['title', 'x', 'y']>;
        canvasPosition: Template<['x', 'y']>;
        moveActivated: Template<['target']>;
        moveDeactivated: string;
    };
    error: {
        /** [plain] When the how-to is not known or is not public */
        unknown: string;
    };
};

export type { PageText as default };
