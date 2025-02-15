import type { Template } from '@locale/LocaleText';
import type {
    ButtonText,
    DialogText,
    FieldText,
    ModeText,
} from '@locale/UITexts';

type PageText = {
    header: string;
    prompt: string;
    instructions: {
        empty: string;
        unselected: string;
        selected: string;
        pixel: string;
        rect: string;
        ellipse: string;
        path: string;
    };
    shape: {
        shape: string;
        pixel: string;
        rect: string;
        ellipse: string;
        path: string;
    };
    share: {
        dialog: DialogText;
        button: ButtonText;
        delete: ButtonText;
        public: ModeText<string[]>;
        collaborators: string;
    };
    field: {
        name: FieldText;
        description: FieldText;
        mode: ModeText<string[]>;
        fill: ModeText<string[]>;
        stroke: ModeText<string[]>;
        /** What to call no color */
        none: string;
        /** What to call inherited color */
        inherit: string;
        /** Labels for the stroke width slider*/
        strokeWidth: { label: string; tip: string };
        /** Labels for the border radius slider */
        radius: { label: string; tip: string };
        /** Labels for the rotation slider */
        angle: { label: string; tip: string };
        /** Width slider */
        width: { label: string; tip: string };
        /** Height slider */
        height: { label: string; tip: string };
        /** Closed path label */
        closed: string;
    };
    button: {
        /** The move selection back button */
        back: ButtonText;
        /** The move to back button */
        toBack: ButtonText;
        /** The move selection forward button */
        forward: ButtonText;
        /** The move to front button */
        toFront: ButtonText;
        /** Copy button text */
        copy: ButtonText;
        /** Paste button text */
        paste: ButtonText;
        /** The clear pixels button */
        clearPixels: ButtonText;
        /** The clear all button */
        clear: ButtonText;
        /** The undo tooltip */
        undo: ButtonText;
        /** The redo tooltip */
        redo: ButtonText;
        /** The select all button */
        all: ButtonText;
        /** End path button */
        end: ButtonText;
        /** Flip path horizontal */
        horizontal: ButtonText;
        /** Flip path vertical */
        vertical: ButtonText;
    };
    feedback: {
        /** When the name isn't a valid Wordplay name */
        name: string;
        /** When the description is empty */
        description: string;
        /** When completing a path, instructions on how to end it. */
        end: string;
        /** Couldn't load the character */
        loadfail: string;
        /** The character doesn't exist */
        notfound: string;
        /** Not logged in */
        unauthenticated: string;
        /** Not saving because name is taken */
        taken: string;
        /** Not saving because not authenticated, invalid name or description. */
        unsaved: string;
    };
    announce: {
        /** When cursor position changes $1 x, $2: y. */
        position: Template;
        /** When selection changes. $1 is list of shape types. */
        selection: Template;
    };
};

export type { PageText as default };
