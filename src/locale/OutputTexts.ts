import type { NameAndDoc, Template, NameText } from './Locale';

export type TypeTexts = {
    size: NameAndDoc;
    family: NameAndDoc;
    place: NameAndDoc;
    name: NameAndDoc;
    selectable: NameAndDoc;
    color: NameAndDoc;
    opacity: NameAndDoc;
    offset: NameAndDoc;
    rotation: NameAndDoc;
    scale: NameAndDoc;
    flipx: NameAndDoc;
    flipy: NameAndDoc;
    enter: NameAndDoc;
    rest: NameAndDoc;
    move: NameAndDoc;
    exit: NameAndDoc;
    duration: NameAndDoc;
    style: NameAndDoc;
};

type OutputTexts = {
    Type: NameAndDoc & TypeTexts;
    Group: NameAndDoc & {
        content: NameAndDoc;
        layout: NameAndDoc;
        /** $1 = Layout description, $2 = pose description */
        description: Template;
    };
    Phrase: NameAndDoc & {
        text: NameAndDoc;
        /** non-optional text, optional name, optional size, optional font, then non-optional pose */
        description: Template;
    };
    Stage: NameAndDoc & {
        /** $1: total outputs, $2: total phrases, $3: total groups, $4: pose */
        description: Template;
        content: NameAndDoc;
        background: NameAndDoc;
        frame: NameAndDoc;
    };
    Arrangement: NameAndDoc;
    Shape: NameAndDoc;
    Rectangle: NameAndDoc & {
        left: NameAndDoc;
        top: NameAndDoc;
        right: NameAndDoc;
        bottom: NameAndDoc;
    };
    Pose: NameAndDoc & {
        duration: NameAndDoc;
        style: NameAndDoc;
        color: NameAndDoc;
        opacity: NameAndDoc;
        offset: NameAndDoc;
        rotation: NameAndDoc;
        scale: NameAndDoc;
        flipx: NameAndDoc;
        flipy: NameAndDoc;
        /** all optional inputs: opacity, rotation, scale, flipx, flipy */
        description: Template;
    };
    Sequence: NameAndDoc & {
        count: NameAndDoc;
        poses: NameAndDoc;
    };
    Color: NameAndDoc & {
        lightness: NameAndDoc;
        chroma: NameAndDoc;
        hue: NameAndDoc;
    };
    Place: NameAndDoc & {
        x: NameAndDoc;
        y: NameAndDoc;
        z: NameAndDoc;
    };
    Row: NameAndDoc & {
        /**
         * $1 total count
         * $2 phrase count
         * $3 group count
         */
        description: Template;
        padding: NameAndDoc;
    };
    Stack: NameAndDoc & {
        /**
         * $1 total count
         * $2 phrase count
         * $3 group count
         */
        description: Template;
        padding: NameAndDoc;
    };
    Grid: NameAndDoc & {
        /**
         *
         * $1: rows
         * $2: columns
         */
        description: Template;
        rows: NameAndDoc;
        columns: NameAndDoc;
        padding: NameAndDoc;
        cellWidth: NameAndDoc;
        cellHeight: NameAndDoc;
    };
    Free: NameAndDoc & {
        /**
         * $1: output count
         */
        description: Template;
    };
    Easing: {
        // CSS linear
        straight: NameText;
        // CSS ease-in
        pokey: NameText;
        // CSS ease-in-out
        cautious: NameText;
        // CSS ease-out
        zippy: NameText;
    };
    sequence: {
        sway: NameAndDoc & { angle: NameAndDoc };
        bounce: NameAndDoc & { height: NameAndDoc };
        spin: NameAndDoc;
        fadein: NameAndDoc;
        popup: NameAndDoc;
        shake: NameAndDoc;
    };
};

export default OutputTexts;
