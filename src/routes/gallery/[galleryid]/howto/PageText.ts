import type { ButtonText, ConfirmText, FieldText, HeaderAndExplanationText, ModeText, ToggleText } from "@locale/UITexts";

type PageText = {
    /** Headers on the gallery page */
    galleryView: {
        /** Title of how-to space in the gallery view */
        header: string;
        /** Subtitle for the how-to space in the gallery view */
        subheader: string;
        /** Subtitle for the how-to space in the gallery if no how-tos */
        subheaderEmpty: string;
    },
    /** Header for the how-to space page */
    header: string;
    /** Explanation for the how-to space page */
    howtoprompt: string;
    drafts: {
        /** Header for the drafts area */
        header: string;
        /** Explanation for the drafts area */
        prompt: string;
        /** Tooltip for viewing a draft */
        tooltip: string;
        /** Text indicating that the how-to is currently a draft */
        note: string;
    }
    bookmarks: {
        /** Header for the bookmarks area */
        header: string;
        /** Bookmarks  tooltip */
        tooltip: string;
        /** Button text for bookmarking the how-to */
        canBookmark: ButtonText;
        alreadyBookmarked: ButtonText;
    }
    /** Navigation tooltip */
    navigationtooltip: string;
    /** Button text for the how-to addition button */
    add: ButtonText;
    editor: {
        /** Dialog text for how-to form (new how-to or edit existing) */
        newForm: HeaderAndExplanationText;
        editForm: HeaderAndExplanationText;
        /** Button text for submitting the how-to */
        post: ButtonText;
        /** Button text for saving a how-to draft */
        save: ButtonText;
        /** Checkbox text for opting out of notifying subscribers */
        notification: ModeText<[string, string]>;
        /** How-to prompt / editor placeholder and description text */
        editorPlaceholder: string;
        editorDescription: string;
        /** Field text for how-to title */
        title: FieldText;
        /** Placeholder for an untitled how-to */
        titlePlaceholder: string;
        /** Collaboration */
        collaboratorsPrompt: string;
        collaboratorsToggle: ToggleText;
    }
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
        }
        usedBy: {
            /** Text for asking if the user used this how-to in their project or another how-to */
            prompt: string;
            /** Text for how many others projects or how-tos, other than the user's own, have used this how-to */
            countDisplay: string;
            /** Options text for selecting which projects and how-tos used this how-to */
            selector: string;
            removeButton: string;
            addButton: string;
        }
        reactionsPrompt: string;
        /** Text for prompting users to chat */
        chatPrompt: string;
        /** Button text for copying the how-to's URL */
        link: ButtonText;
    }
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
        }
        /** Subheaders and descriptions for configuring guiding questions */
        guidingQuestions: {
            subheader: HeaderAndExplanationText;
            descriptor: string;
            default: string[];
        }
        /** Subheaders and descriptions for configuring reaction options */
        reactions: {
            subheader: HeaderAndExplanationText;
            reactionPickerTip: string;
            reactionDescriptionTip: string;
            addReactionTip: string;
            removeReactionTip: string;
            default: Record<string, string>;
        }
        submit: ButtonText & {
            error: string;
        };
    },
    /** For announcing changes to the canvas or to how-to positions */
    announcePosition: string;
    error: {
        /** When the how-to is not known or is not public */
        unknown: string;
    },
}

export type { PageText as default };
