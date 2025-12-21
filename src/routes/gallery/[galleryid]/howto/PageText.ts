import type { ButtonText, DialogText, FieldText } from "@locale/UITexts";

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
    /** Headers on the how-to canvas page */
    canvasView: {
        /** Header for the how-to space page */
        header: string;
        /** Explanation for the how-to space page */
        howtoprompt: string;
        /** Header for the drafts area */
        draftsheader: string;
        /** Explanation for the drafts area */
        draftsprompt: string;
        /** Header for the bookmarks area */
        bookmarksheader: string;
    },
    /** Buttons and dialogs for adding a new how-to */
    newHowTo: {
        /** Button text for the how-to addition button */
        add: ButtonText;
        /** Dialog text for how-to form (new how-to or edit existing) */
        newForm: DialogText;
        editForm: DialogText;
        /** Button text for submitting the how-to */
        post: ButtonText;
        /** Button text for saving a how-to draft */
        save: ButtonText;
        /** Checkbox text for opting out of notifying subscribers */
        notificationOptOut: string;
        /** How-to prompt / editor placeholder and description text */
        prompt: string;
        editorPlaceholder: string;
        editorDescription: string;
        /** Field text for how-to title */
        title: FieldText;
    },
    /** Buttons and dialogs for viewing a new how-to */
    viewHowTo: {
        /** Button text for viewing the how-to */
        view: ButtonText;
        /** Button text for bookmarking the how-to */
        canBookmark: ButtonText;
        alreadyBookmarked: ButtonText;
        /** Button text for submitting the how-to to be included in the public guide */
        submit: ButtonText;
        /** Text for prompting reactions */
        reactionPrompt: string;
        /** Text for asking if the user used this how-to in their project or another how-to */
        usedPrompt: string;
        /** Text displaying the number of users who have used this how-to */
        usedCountDisplay: string;
        /** Text for prompting users to chat */
        chatPrompt: string;
        /** Text indicating that the how-to is currently a draft */
        draftNote: string;
    },
    error: {
        /** When the how-to is not known or is not public */
        unknown: string;
    },
    /** Default reaction options for viewing a how-to */
    reactions: ButtonText[];
}

export type { PageText as default };
