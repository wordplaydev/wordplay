import type { NameAndDoc, Template, NameText } from './Locale';

export type TypeTexts = {
    /** How tall glyphs in a phrase, group, or stage should be */
    size: NameAndDoc;
    /** The font face used in a phrase, group, or stage */
    face: NameAndDoc;
    /** The place on stage of a phrase, group, or stage */
    place: NameAndDoc;
    /** The name of a phrase, group, or stage, used in Choice, Collision, and animations */
    name: NameAndDoc;
    /** Whether a phrase, group, or stage is selectable by Choice */
    selectable: NameAndDoc;
    /** The color of glyphs in a phrase, group, or stage */
    color: NameAndDoc;
    /** The background color behind a phrase, group, or stage */
    background: NameAndDoc;
    /** The opacity of a phrase, group, or stage */
    opacity: NameAndDoc;
    /** The offset of phrase, group, or stage from its place */
    offset: NameAndDoc;
    /** The rotation of a phrase, group, or stage */
    rotation: NameAndDoc;
    /** The scale of phrase, group, or stage */
    scale: NameAndDoc;
    /** Whether a phrase, group, or stage is flipped horizontally */
    flipx: NameAndDoc;
    /** Whether a phrase, group, or stage is flipped vertically */
    flipy: NameAndDoc;
    /** Pose or sequence for when a phrase, group, or stage enters stage */
    entering: NameAndDoc;
    /** Pose or sequence for when a phrase, group, or stage is not moving */
    resting: NameAndDoc;
    /** Pose or sequence for when a phrase, group, or stage is moving */
    moving: NameAndDoc;
    /** Pose or sequence for when a phrase, group, or stage is leaving stage */
    exiting: NameAndDoc;
    /** The curation of transition */
    duration: NameAndDoc;
    /** The transition style of transitions */
    style: NameAndDoc;
};

type OutputTexts = {
    /** The base interface for Phrase, Group, and Stage */
    Type: NameAndDoc;
    /** A group of output with a layout */
    Group: NameAndDoc & {
        /** The list of content in the group */
        content: NameAndDoc;
        /** The layout to use to place the content in the group on stage */
        layout: NameAndDoc;
        /** The matter to use for the group if it's involved in collisions */
        matter: NameAndDoc;
        /** $1 = Layout description, $2 = pose description */
        description: Template;
    } & TypeTexts;
    /** A sequence of glyphs */
    Phrase: NameAndDoc & {
        /** The glyphs to render */
        text: NameAndDoc;
        /** The boundary at which to wrap glyphs to another line */
        wrap: NameAndDoc;
        /** The alignment to use when wrapped */
        alignment: NameAndDoc;
        /** The matter properties for the phrase */
        matter: NameAndDoc;
        /** A description of the phrase for screen readers. 1$: non-optional text, $2: optional name, $3: optional size, $4: optional font, $5: then non-optional pose */
        description: Template;
    } & TypeTexts;
    /** The whole stage view and settings to control its appearance */
    Stage: NameAndDoc & {
        /** A description of the stage for screen readers. $1: total outputs, $2: total phrases, $3: total groups, $4: pose */
        description: Template;
        /** A list of content to show on stage */
        content: NameAndDoc;
        /** The shape of the frame to clip stage content */
        frame: NameAndDoc;
    } & TypeTexts & {
            /** Gravity, influencing change in y velocity */
            gravity: NameAndDoc;
        };
    /** The base interface for shape types */
    Shape: NameAndDoc;
    /** A rectangle shape, for Stage.frame */
    Rectangle: NameAndDoc & {
        left: NameAndDoc;
        top: NameAndDoc;
        right: NameAndDoc;
        bottom: NameAndDoc;
    };
    /** A pose, for use in overriding an output's defaults for entering, resting, moving, or existing states */
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
    /** A sequence of poses, keyed by percentage complete, for use in overriding an output's defaults for entering, resting, moving, or existing states */
    Sequence: NameAndDoc & {
        /** A map from percents complete to poses */
        poses: NameAndDoc;
        /** How long the sequence is */
        duration: NameAndDoc;
        /** How many times to repeat the sequence */
        count: NameAndDoc;
        /** The style to use to complete the sequence */
        style: NameAndDoc;
    };
    /** A color in LCH spaces */
    Color: NameAndDoc & {
        /** 0-100%, with 0 as black and 100 as white */
        lightness: NameAndDoc;
        /** 0-150 with 0 as grey and 150 as full color */
        chroma: NameAndDoc;
        /** 0-360, a color wheel  */
        hue: NameAndDoc;
    };
    /** A place on stage */
    Place: NameAndDoc & {
        /** x-coordinate */
        x: NameAndDoc;
        /** y-coordinate */
        y: NameAndDoc;
        /** z-coordinate */
        z: NameAndDoc;
        /** optional rotation */
        rotation: NameAndDoc;
    };
    /** A velocity vector */
    Velocity: NameAndDoc & {
        /** x-coordinate */
        x: NameAndDoc;
        /** y-coordinate */
        y: NameAndDoc;
        /** rotation */
        angle: NameAndDoc;
    };
    /** Physical properties of matter */
    Matter: NameAndDoc & {
        /** in kilograms, how much something weighs for the purposes of collisions */
        mass: NameAndDoc;
        /** from 0-1, how bouncy something should be, where 0 means not bouncy at all, and 1 means retaining all of it's energy on collision */
        bounciness: NameAndDoc;
        /** from 0-1, where 0 means no sliding, and 1 means sliding indefinitely */
        friction: NameAndDoc;
    };
    /** The base interface for arrangement types */
    Arrangement: NameAndDoc;
    /** A horizontal row arrangement */
    Row: NameAndDoc & {
        /**
         * A description of the row for screen readers.
         * $1: total count
         * $2: phrase count
         * $3: group count
         */
        description: Template;
        /** Whether to align content vertically at the start, center, or end of the vertical axis */
        alignment: NameAndDoc;
        /** How much padding to place between content */
        padding: NameAndDoc;
    };
    /** A vertical stack arragement */
    Stack: NameAndDoc & {
        /**
         * A description of the stack for screen readers.
         * $1: total count
         * $2: phrase count
         * $3: group count
         */
        description: Template;
        /** Whether to align content at the start, center, or end of the horizontal axis */
        alignment: NameAndDoc;
        /** How much padding to place between content */
        padding: NameAndDoc;
    };
    /** A grid arrangement, like a table */
    Grid: NameAndDoc & {
        /**
         * A description of the grid of content
         * $1: rows
         * $2: columns
         */
        description: Template;
        /** How many rows in the grid */
        rows: NameAndDoc;
        /** How many columns in the grid */
        columns: NameAndDoc;
        /** How much padding between cells */
        padding: NameAndDoc;
        /** How wide the cells are */
        cellWidth: NameAndDoc;
        /** How tall the cells are */
        cellHeight: NameAndDoc;
    };
    /** An arrangement where locations are specified by content */
    Free: NameAndDoc & {
        /**
         * A description of the free layout for screen readers.
         * $1: output count
         */
        description: Template;
    };
    /** Localized descriptions of transition styles */
    Easing: {
        /** CSS linear */
        straight: NameText;
        /** CSS ease-in */
        pokey: NameText;
        /** CSS ease-in-out */
        cautious: NameText;
        /** CSS ease-out */
        zippy: NameText;
    };
    /** Convenience functions for generating maps for Sequences */
    sequence: {
        /** Rotates on center axis left and right */
        sway: NameAndDoc & {
            /** How much to rotate */
            angle: NameAndDoc;
        };
        /** Bounces up and down on the vertical axis */
        bounce: NameAndDoc & {
            /** How high to bounce */
            height: NameAndDoc;
        };
        /** Spins on its center 0 to 360 dgrees */
        spin: NameAndDoc;
        /** Fades in from purely transparent to purely opaque */
        fadein: NameAndDoc;
        /** Scales from 0 to larger than its size, then back to scale of 1 */
        popup: NameAndDoc;
        /** Offsets randomly in multiple directions */
        shake: NameAndDoc;
    };
};

export default OutputTexts;
