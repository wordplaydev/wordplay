import type { ButtonText } from "@locale/UITexts";

type PageText = {
    /** Title of how-to space in the gallery view */
    galleryTitle: string;
    /** Subtitle for the how-to space in the gallery view */
    gallerySubtitle: string;
    /** Subtitle for the how-to space in the gallery if no how-tos */
    gallerySubtitleEmpty: string;
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
    /** Dialog text for the how-to addition button */
    add: ButtonText;
    error: {
        /** When the how-to is not known or is not public */
        unknown: string;
    };
}

export type { PageText as default };
