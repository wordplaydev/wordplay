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
        /** Dialog text for how-to form */
        form: DialogText;
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
    },
    error: {
        /** When the how-to is not known or is not public */
        unknown: string;
    },
    /** Default reaction options for viewing a how-to */
    reactions: ButtonText[];
}

export type { PageText as default };
