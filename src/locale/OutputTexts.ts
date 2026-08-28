import type {
    FunctionText,
    NameAndDoc,
    NameText,
    Template,
} from '@locale/LocaleText';
import type { ExceptionText } from '@locale/NodeTexts';

export type TypeTexts = {
    /** How tall characters in a phrase, group, or stage should be */
    size: NameAndDoc;
    /** The font face used in a phrase, group, or stage */
    face: NameAndDoc;
    /** The place on stage of a phrase, group, or stage */
    place: NameAndDoc;
    /** The name of a phrase, group, or stage, used in Choice, Collision, and animations */
    name: NameAndDoc;
    /** An optional description of the phrase for screen readers */
    description: NameAndDoc;
    /** Whether a phrase, group, or stage is selectable by Choice */
    selectable: NameAndDoc;
    /** The color of characters in a phrase, group, or stage */
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
    /** The base interface for Phrase, Group, and Stage, and other types of Output */
    Output: NameAndDoc;
    /** A group of output with a layout */
    Group: NameAndDoc & {
        /** The list of content in the group */
        content: NameAndDoc;
        /** The layout to use to place the content in the group on stage */
        layout: NameAndDoc;
        /** How heavy, bouncy, and slippery the group is, and what makes it solid when a Motion moves it */
        matter: NameAndDoc;
        /** [formatted] $1 = optional group name, $2 = layout description, $3 = pose description, $4 = optional background color name */
        defaultDescription: Template<['name', 'layout', 'pose', 'color']>;
    } & TypeTexts;
    /** A shadow */
    Aura: NameAndDoc & {
        /** The shadow's color */
        color: NameAndDoc;
        /** The horizontal offset of the shadow */
        offsetX: NameAndDoc;
        /** The vertical offset of the shadow */
        offsetY: NameAndDoc;
        /** The blurriness of the shadow */
        blur: NameAndDoc;
    };
    /** A speech bubble showing what a phrase is saying or thinking */
    Bubble: NameAndDoc & {
        /** What the bubble shows; give it a Say instead of text to have it spoken aloud too */
        text: NameAndDoc;
        /** Which side of the phrase the bubble sits on, as an arrow; unset lets the stage choose */
        side: NameAndDoc;
        /** Whether the bubble is speech or thought */
        kind: NameAndDoc;
        /** The color of the bubble's text; ø means the phrase's own color */
        color: NameAndDoc;
        /** The color the bubble is filled with */
        background: NameAndDoc;
        /** How big the bubble's text is; ø means the phrase's own size */
        size: NameAndDoc;
        /** The boundary at which to wrap the bubble's text to another line */
        wrap: NameAndDoc;
    };
    /** A sequence of characters */
    Phrase: NameAndDoc & {
        /** The characters to render */
        text: NameAndDoc;
        /** The name of the effect used to animate changes to the text, played over the duration and eased by the style; ø means the text changes instantly */
        changing: NameAndDoc;
        /** The boundary at which to wrap characters to another line */
        wrap: NameAndDoc;
        /** The alignment to use when wrapped */
        alignment: NameAndDoc;
        /** The layout of writing */
        direction: NameAndDoc;
        /** How heavy, bouncy, and slippery the phrase is, and what makes it solid when a Motion moves it */
        matter: NameAndDoc;
        /** The shadow properties for the phrase */
        aura: NameAndDoc;
        /** The optional speech bubble showing what the phrase is saying */
        bubble: NameAndDoc;
        /** [formatted] A description of the phrase for screen readers. $1: non-optional text, $2: optional name, $3: optional size, $4: optional font, $5: non-optional pose, $6: optional color name, $7: optional speech bubble text */
        defaultDescription: Template<
            ['text', 'name', 'size', 'face', 'animation', 'color', 'bubble']
        >;
    } & TypeTexts;
    /** The whole stage view and settings to control its appearance */
    Stage: NameAndDoc & {
        /** [formatted] A description of the stage for screen readers. $1: output count, $2: optional stage name, $3: optional frame description, $4: pose description, $5: optional background color name */
        defaultDescription: Template<
            ['#count', 'name', 'frame', 'pose', 'color']
        >;
        /** A list of content to show on stage */
        content: NameAndDoc;
        /** The shape of the frame to clip stage content */
        frame: NameAndDoc;
    } & TypeTexts & {
            /** Gravity, influencing change in y velocity */
            gravity: NameAndDoc;
            /** A list of content pinned flat to the screen (a HUD), unaffected by the camera or depth */
            overlay: NameAndDoc;
            /** How much air resistance slows moving output down; 0 is space */
            air: NameAndDoc;
        };
    /** The base interface for shape types */
    Shape: NameAndDoc & {
        /** The kind of shape and its details */
        form: NameAndDoc;
        /** The name of a phrase, group, or stage, used in Choice, Collision, and animations */
        name: NameAndDoc;
        /** The custom description of the shape */
        description: NameAndDoc;
        /** Whether a phrase, group, or stage is selectable by Choice */
        selectable: NameAndDoc;
        /** The color of characters in a phrase, group, or stage */
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
        /** Whether to paint the shape's inside */
        filled: NameAndDoc;
        /** Whether to paint the shape's outline */
        stroked: NameAndDoc;
        /** Text drawn along the shape's outline */
        glyphs: NameAndDoc;
    };
    /** A text-to-speech output that speaks a plain text literal */
    Say: NameAndDoc & {
        /** The text to speak */
        text: NameAndDoc;
        /** [formatted] A description of the say for screen readers. $1: the text to speak */
        defaultDescription: Template<['text']>;
    };
    /** A musical score: one or more tracks played together at a tempo, in a key, against a scale */
    Music: NameAndDoc & {
        /** One track, or a list of tracks played together */
        tracks: NameAndDoc;
        /** The tempo in beats per minute */
        tempo: NameAndDoc;
        /** Semitones to shift every note */
        key: NameAndDoc;
        /** The semitone offsets that degrees resolve against; a named scale or a custom list */
        scale: NameAndDoc;
        /** The music's overall volume */
        volume: NameAndDoc;
        /** When true on an evaluation, playback restarts from the top */
        replay: NameAndDoc;
        /** While true, playback holds where it is and picks up there again */
        pause: NameAndDoc;
        /** A name for the music, its identity for starting, stopping, and splicing */
        name: NameAndDoc;
        /** A description of the music, spoken when it cannot be heard */
        description: NameAndDoc;
        /** Names for each named scale. Each entry exposes its multilingual
         *  names as static binds on the `Music` structure (so `Music.major`
         *  and `🎼.pentatonic` work). */
        scales: {
            /** The major scale, the default */
            major: NameAndDoc;
            /** The natural minor scale */
            minor: NameAndDoc;
            /** All twelve semitones */
            chromatic: NameAndDoc;
            /** The major pentatonic scale; no wrong notes */
            pentatonic: NameAndDoc;
            /** The minor pentatonic scale; no wrong notes */
            minorPentatonic: NameAndDoc;
            /** The blues scale: the minor pentatonic plus a flat five */
            blues: NameAndDoc;
            /** The dorian mode: minor with a raised sixth */
            dorian: NameAndDoc;
            /** The phrygian mode: minor with a lowered second */
            phrygian: NameAndDoc;
            /** The lydian mode: major with a raised fourth */
            lydian: NameAndDoc;
            /** The mixolydian mode: major with a lowered seventh */
            mixolydian: NameAndDoc;
            /** The locrian mode: tense on purpose, with a lowered second and fifth */
            locrian: NameAndDoc;
            /** The melodic minor scale: minor with a raised sixth and seventh */
            melodicMinor: NameAndDoc;
            /** The harmonic minor scale: minor with a raised seventh */
            harmonicMinor: NameAndDoc;
            /** The lydian dominant scale: lydian with a lowered seventh */
            lydianDominant: NameAndDoc;
            /** The altered scale: deliberately dissonant, for tension over dominant chords */
            altered: NameAndDoc;
            /** The bebop dominant scale: mixolydian plus a natural seventh passing tone */
            bebopDominant: NameAndDoc;
            /** The bebop major scale: major plus a raised fifth passing tone */
            bebopMajor: NameAndDoc;
            /** The whole tone scale: six evenly spaced notes */
            wholeTone: NameAndDoc;
            /** The diminished scale: alternating whole and half steps */
            diminished: NameAndDoc;
        };
        /** [formatted] A description of the music for screen readers. $tracks: how many tracks, $tempo: beats per minute */
        defaultDescription: Template<['#tracks', 'tempo']>;
    };
    /** One track of music: a series of notes played by one instrument */
    Track: NameAndDoc & {
        /** The notes to play: degrees, ø rests, chords in braces, or Notes with their own length */
        notes: NameAndDoc;
        /** The instrument that plays this track */
        instrument: NameAndDoc;
        /** How many beats one entry lasts */
        beat: NameAndDoc;
        /** An optional scale override for this track */
        scale: NameAndDoc;
        /** An optional key override for this track */
        key: NameAndDoc;
        /** The track's volume */
        volume: NameAndDoc;
        /** Stereo position, −1 left to 1 right */
        pan: NameAndDoc;
        /** Whether the track repeats when it ends */
        loop: NameAndDoc;
        /** Whether a note between two notes plays both of them or bends one */
        mash: NameAndDoc;
        /** IPA syllables for the voice to sing, one per note, separated by spaces */
        words: NameAndDoc;
    };
    /** A single note with its own length and volume */
    Note: NameAndDoc & {
        /** The degree to play: a number, ø for a rest, or a set of degrees for a chord */
        degree: NameAndDoc;
        /** How many beats the note lasts */
        beat: NameAndDoc;
        /** The note's volume */
        volume: NameAndDoc;
    };
    /** An instrument from the fixed palette */
    Instrument: NameAndDoc & {
        /** The palette entry this instrument refers to */
        id: NameAndDoc;
        /** Names for each instrument in the palette. Each entry exposes its
         *  multilingual names as static binds on the `Instrument` structure
         *  (so `🔈.piano` and `🔈.🎹` work). Instruments from non-English
         *  cultures keep their native names in every localization. */
        instruments: {
            /** A piano */
            piano: NameAndDoc;
            /** A nylon-strung classical guitar */
            acousticGuitar: NameAndDoc;
            /** A steel-strung electro-acoustic guitar */
            electricGuitar: NameAndDoc;
            /** A violin */
            violin: NameAndDoc;
            /** A drum kit; degrees index the kit: 1 bass, 2 snare, 3 hi-hat, 4 cymbal, 5 tom tom, 6 cowbell */
            drums: NameAndDoc;
            /** A flute */
            flute: NameAndDoc;
            /** A trumpet */
            trumpet: NameAndDoc;
            /** A saxophone */
            saxophone: NameAndDoc;
            /** A harmonica */
            harmonica: NameAndDoc;
            /** A bell */
            bell: NameAndDoc;
            /** A didgeridoo, from Aboriginal Australia */
            didgeridoo: NameAndDoc;
            /** A cat's meow */
            cat: NameAndDoc;
            /** A cat's meow, pitched so it can play a tune */
            pitchedCat: NameAndDoc;
            /** A dog's bark */
            dog: NameAndDoc;
            /** A dog's bark, pitched so it can play a tune */
            pitchedDog: NameAndDoc;
            /** A synthesizer lead */
            synth: NameAndDoc;
            /** A synthesizer bass */
            synthBass: NameAndDoc;
            /** A synthesizer pad */
            synthPad: NameAndDoc;
            /** A synthesized singing voice */
            voice: NameAndDoc;
        };
    };
    /** The base form type */
    Form: NameAndDoc;
    /** A rectangle form */
    Rectangle: NameAndDoc & {
        /** Left of the rectangle */
        left: NameAndDoc;
        /** Top of the rectangle */
        top: NameAndDoc;
        /** Right of the rectangle */
        right: NameAndDoc;
        /** Bottom of the rectangle */
        bottom: NameAndDoc;
        /** Depth of rectangle */
        z: NameAndDoc;
    };
    /** A circle form */
    Circle: NameAndDoc & {
        /** Radius of the circle */
        radius: NameAndDoc;
        /** Horizontal center of the circle */
        x: NameAndDoc;
        /** Vertical center of the circle */
        y: NameAndDoc;
        /** Z coordinate the circle */
        z: NameAndDoc;
    };
    /** An arbitrary path form, drawn through a list of places */
    Path: NameAndDoc & {
        /** The places the path passes through */
        points: NameAndDoc;
        /** Whether the path joins back to its first place */
        closed: NameAndDoc;
        /** Whether the path curves through its places instead of turning at them */
        smooth: NameAndDoc;
        /** How wide to draw the path */
        thickness: NameAndDoc;
        /** The depth the whole path lies at */
        z: NameAndDoc;
    };
    /** A regular polygon form */
    Polygon: NameAndDoc & {
        /** Radius of the polygon */
        radius: NameAndDoc;
        /** Radius of the polygon */
        sides: NameAndDoc;
        /** Horizontal center of the polygon */
        x: NameAndDoc;
        /** Vertical center of the polygon */
        y: NameAndDoc;
        /** Z coordinate the polygon */
        z: NameAndDoc;
    };
    /** A pose, for use in overriding an output's defaults for entering, resting, moving, or existing states */
    Pose: NameAndDoc & {
        style: NameAndDoc;
        color: NameAndDoc;
        opacity: NameAndDoc;
        offset: NameAndDoc;
        rotation: NameAndDoc;
        scale: NameAndDoc;
        flipx: NameAndDoc;
        flipy: NameAndDoc;
        /** Music that sounds when this pose is applied: when its animation state begins, or when a sequence reaches its percentage. */
        music: NameAndDoc;
        /** [formatted] Templated description of the pose. $1: optional opacity, $2: optional rotation degrees, $3: optional scale, $4: optional flipx, $5: optional flipy, $6: optional blur */
        description: Template<
            ['opacity', 'rotation', 'scale', 'flipx', 'flipy', 'blur']
        >;
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
        /** An optional description of this sequence for screen readers */
        description: NameAndDoc;
        /** The predefined animations. Each entry becomes a static function on the
         *  `Sequence` structure (so `Sequence.sway()`/`💃.摇摆()` work), taking its own
         *  inputs below followed by the `duration`, `style`, `count`, and `description`
         *  above. Grouped as: everyday, attention, entrance, exit, ambient, color. */
        animations: {
            /** [plain] doc + [name] names for "sway" */
            sway: NameAndDoc & {
                /** [plain] doc + [name] names for how far to tilt */
                angle: NameAndDoc;
            };
            /** [plain] doc + [name] names for "bounce" */
            bounce: NameAndDoc & {
                /** [plain] doc + [name] names for how high to bounce */
                height: NameAndDoc;
            };
            /** [plain] doc + [name] names for "spin" */
            spin: NameAndDoc;
            /** [plain] doc + [name] names for "fadein" */
            fadein: NameAndDoc;
            /** [plain] doc + [name] names for "fadeout" */
            fadeout: NameAndDoc;
            /** [plain] doc + [name] names for "popup" */
            popup: NameAndDoc;
            /** [plain] doc + [name] names for "shake" */
            shake: NameAndDoc;
            /** [plain] doc + [name] names for "pulse" */
            pulse: NameAndDoc & {
                /** [plain] doc + [name] names for how much to scale at the peak */
                amount: NameAndDoc;
            };
            /** [plain] doc + [name] names for "heartbeat" */
            heartbeat: NameAndDoc & {
                /** [plain] doc + [name] names for how much to scale on each beat */
                amount: NameAndDoc;
            };
            /** [plain] doc + [name] names for "tada" */
            tada: NameAndDoc & {
                /** [plain] doc + [name] names for how much to scale while celebrating */
                amount: NameAndDoc;
            };
            /** [plain] doc + [name] names for "wiggle" */
            wiggle: NameAndDoc & {
                /** [plain] doc + [name] names for how far to tilt */
                angle: NameAndDoc;
            };
            /** [plain] doc + [name] names for "flash" */
            flash: NameAndDoc;
            /** [plain] doc + [name] names for "swing" */
            swing: NameAndDoc & {
                /** [plain] doc + [name] names for how far the first swing goes */
                angle: NameAndDoc;
            };
            /** [plain] doc + [name] names for "blink" */
            blink: NameAndDoc;
            /** [plain] doc + [name] names for "nod" */
            nod: NameAndDoc & {
                /** [plain] doc + [name] names for how far to dip */
                distance: NameAndDoc;
            };
            /** [plain] doc + [name] names for "dim" */
            dim: NameAndDoc & {
                /** [plain] doc + [name] names for how faint to get */
                amount: NameAndDoc;
            };
            /** [plain] doc + [name] names for "zoomin" */
            zoomin: NameAndDoc;
            /** [plain] doc + [name] names for "fadeinup" */
            fadeinup: NameAndDoc & {
                /** [plain] doc + [name] names for how far to slide */
                distance: NameAndDoc;
            };
            /** [plain] doc + [name] names for "fadeindown" */
            fadeindown: NameAndDoc & {
                /** [plain] doc + [name] names for how far to slide */
                distance: NameAndDoc;
            };
            /** [plain] doc + [name] names for "fadeinleft" */
            fadeinleft: NameAndDoc & {
                /** [plain] doc + [name] names for how far to slide */
                distance: NameAndDoc;
            };
            /** [plain] doc + [name] names for "fadeinright" */
            fadeinright: NameAndDoc & {
                /** [plain] doc + [name] names for how far to slide */
                distance: NameAndDoc;
            };
            /** [plain] doc + [name] names for "rotatein" */
            rotatein: NameAndDoc & {
                /** [plain] doc + [name] names for how far to spin */
                angle: NameAndDoc;
            };
            /** [plain] doc + [name] names for "slidein" */
            slidein: NameAndDoc & {
                /** [plain] doc + [name] names for where to slide in from */
                from: NameAndDoc;
            };
            /** [plain] doc + [name] names for "zoomout" */
            zoomout: NameAndDoc;
            /** [plain] doc + [name] names for "fadeoutup" */
            fadeoutup: NameAndDoc & {
                /** [plain] doc + [name] names for how far to slide */
                distance: NameAndDoc;
            };
            /** [plain] doc + [name] names for "fadeoutdown" */
            fadeoutdown: NameAndDoc & {
                /** [plain] doc + [name] names for how far to slide */
                distance: NameAndDoc;
            };
            /** [plain] doc + [name] names for "fadeoutleft" */
            fadeoutleft: NameAndDoc & {
                /** [plain] doc + [name] names for how far to slide */
                distance: NameAndDoc;
            };
            /** [plain] doc + [name] names for "fadeoutright" */
            fadeoutright: NameAndDoc & {
                /** [plain] doc + [name] names for how far to slide */
                distance: NameAndDoc;
            };
            /** [plain] doc + [name] names for "rotateout" */
            rotateout: NameAndDoc & {
                /** [plain] doc + [name] names for how far to spin */
                angle: NameAndDoc;
            };
            /** [plain] doc + [name] names for "slideout" */
            slideout: NameAndDoc & {
                /** [plain] doc + [name] names for where to slide out to */
                to: NameAndDoc;
            };
            /** [plain] doc + [name] names for "float" */
            float: NameAndDoc & {
                /** [plain] doc + [name] names for how far to drift */
                distance: NameAndDoc;
            };
            /** [plain] doc + [name] names for "drift" */
            drift: NameAndDoc & {
                /** [plain] doc + [name] names for how far to drift */
                distance: NameAndDoc;
            };
            /** [plain] doc + [name] names for "orbit" */
            orbit: NameAndDoc & {
                /** [plain] doc + [name] names for how wide the circle is */
                radius: NameAndDoc;
            };
            /** [plain] doc + [name] names for "rainbow" */
            rainbow: NameAndDoc;
            /** [plain] doc + [name] names for "glow" */
            glow: NameAndDoc & {
                /** [plain] doc + [name] names for which color to glow */
                color: NameAndDoc;
            };
        };
    };
    /** A color in LCH spaces */
    Color: NameAndDoc & {
        /** 0-100%, with 0 as black and 100 as white */
        lightness: NameAndDoc;
        /** 0-150 with 0 as grey and 150 as full color */
        chroma: NameAndDoc;
        /** 0-360, a color wheel  */
        hue: NameAndDoc;
        /** Names for each of the 11 Basic Color Terms (black, white, gray,
         *  red, orange, yellow, green, blue, purple, brown, pink). Each
         *  entry exposes its multilingual names as static binds on the
         *  `Color` structure (so `Color.red`/`色.赤`/etc. work), and is also
         *  the user-facing word used by screen-reader color descriptions. */
        colors: {
            /** [plain] doc + [name] names for "black" */
            black: NameAndDoc;
            /** [plain] doc + [name] names for "white" */
            white: NameAndDoc;
            /** [plain] doc + [name] names for "gray" */
            gray: NameAndDoc;
            /** [plain] doc + [name] names for "red" */
            red: NameAndDoc;
            /** [plain] doc + [name] names for "orange" */
            orange: NameAndDoc;
            /** [plain] doc + [name] names for "yellow" */
            yellow: NameAndDoc;
            /** [plain] doc + [name] names for "green" */
            green: NameAndDoc;
            /** [plain] doc + [name] names for "blue" */
            blue: NameAndDoc;
            /** [plain] doc + [name] names for "purple" */
            purple: NameAndDoc;
            /** [plain] doc + [name] names for "brown" */
            brown: NameAndDoc;
            /** [plain] doc + [name] names for "pink" */
            pink: NameAndDoc;
        };
        /** Templates for assembling color descriptions from the BCT names
         *  plus optional light/dark modifier and boundary-color mix. */
        description: {
            /** [plain] $1 = modifier (or empty), $2 = color name(s). Allows
             *  per-locale word order. */
            modified: Template<['modifier', 'color']>;
            /** [plain] Join two BCTs into a mix description; $1 = first
             *  color name, $2 = second color name. */
            mix: Template<['first', 'second']>;
            /** [plain] Word used when lightness is above the matched focal */
            light: string;
            /** [plain] Word used when lightness is below the matched focal */
            dark: string;
        };
        /** The static `Color.random()` function that produces a random color.
         *  With no inputs it picks a random basic color; with one color it
         *  keeps that color's lightness and chroma but randomizes the hue;
         *  with two colors it randomizes each LCH value within their range. */
        random: FunctionText<[NameAndDoc, NameAndDoc]>;
        /** `lighter()` — a new color with lightness increased by a percent
         *  (5% by default). */
        lighter: FunctionText<[NameAndDoc]>;
        /** `darker()` — a new color with lightness decreased by a percent
         *  (5% by default). */
        darker: FunctionText<[NameAndDoc]>;
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
    /** A hand gesture detected in the camera image (returned by the Hand input stream) */
    Gesture: NameAndDoc & {
        /** Where the hand is on stage */
        place: NameAndDoc;
        /** True when the hand is open, false when it's a fist */
        open: NameAndDoc;
        /** Count of extended fingers, 0–5 */
        fingers: NameAndDoc;
        /** True if the thumb is extended */
        thumb: NameAndDoc;
        /** True if the index finger is extended */
        index: NameAndDoc;
        /** True if the middle finger is extended */
        middle: NameAndDoc;
        /** True if the ring finger is extended */
        ring: NameAndDoc;
        /** True if the pinky finger is extended */
        pinky: NameAndDoc;
        /** True if the palm faces the camera, false if the back of the hand does */
        palm: NameAndDoc;
    };
    /** One thing detected in the camera image (an element of the Objects input stream's list) */
    Thing: NameAndDoc & {
        /** What the thing is, in the creator's language */
        name: NameAndDoc;
        /** How sure the model is that it's that thing, from 0 to 1 */
        confidence: NameAndDoc;
        /** Where the thing is on stage */
        place: NameAndDoc;
        /** How wide the thing appeared, in meters */
        width: NameAndDoc;
        /** How tall the thing appeared, in meters */
        height: NameAndDoc;
    };
    /** A facial expression detected in the camera image (returned by the Face input stream) */
    Expression: NameAndDoc & {
        /** Where the face is on stage */
        place: NameAndDoc;
        /** True when the left eye is open */
        leftEyeOpen: NameAndDoc;
        /** True when the right eye is open */
        rightEyeOpen: NameAndDoc;
        /** True when both eyes are open */
        eyesOpen: NameAndDoc;
        /** True when the mouth is open */
        mouthOpen: NameAndDoc;
        /** How open the mouth is, from 0 (closed) to 1 (wide open) */
        mouthOpenAmount: NameAndDoc;
        /** True when the face is smiling */
        smiling: NameAndDoc;
        /** How much the face is smiling, from 0 to 1 */
        smileAmount: NameAndDoc;
        /** True when the face is frowning, by mouth corners or lowered brows */
        frowning: NameAndDoc;
        /** How much the face is frowning, from 0 to 1, by mouth corners or lowered brows */
        frownAmount: NameAndDoc;
        /** True when the eyebrows are raised */
        browsRaised: NameAndDoc;
        /** How much the eyebrows are raised, from 0 to 1 */
        browRaiseAmount: NameAndDoc;
        /** How far the head is turned left or right, in degrees */
        turn: NameAndDoc;
        /** How far the head is tilted up or down, in degrees */
        tilt: NameAndDoc;
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
    /** One match from a pattern search (`⌕`) */
    Result: NameAndDoc & {
        /** the whole matched text */
        text: NameAndDoc;
        /** the 1-based start position of the whole match */
        start: NameAndDoc;
        /** the 1-based end position of the whole match */
        end: NameAndDoc;
        /** each capture name to its matched text */
        groups: NameAndDoc;
        /** each capture name to its start position */
        starts: NameAndDoc;
        /** each capture name to its end position */
        ends: NameAndDoc;
    };
    /** How heavy, bouncy, and slippery output is, and what makes it solid when a Motion moves it */
    Matter: NameAndDoc & {
        /** in kilograms, how much something weighs for the purposes of collisions */
        mass: NameAndDoc;
        /** from 0-1, how bouncy something should be, where 0 means not bouncy at all, and 1 means retaining all of it's energy on collision */
        bounciness: NameAndDoc;
        /** from 0-1, where 0 means no sliding, and 1 means sliding indefinitely */
        friction: NameAndDoc;
        /** from 0-1, what percent of the size to round the corners of the output's rectangle. */
        roundedness: NameAndDoc;
        /** whether the output can collide with other output */
        text: NameAndDoc;
        /** whether the output can collide with other shapes */
        shapes: NameAndDoc;
        /** how strongly the output pulls other output toward it */
        pull: NameAndDoc;
    };
    /** The base interface for arrangement types */
    Arrangement: NameAndDoc;
    /** A horizontal row arrangement */
    Row: NameAndDoc & {
        /**
         * [formatted] A description of the row for screen readers.
         * $count: total count
         */
        description: Template<['#count']>;
        /** Whether to align content vertically at the start, center, or end of the vertical axis */
        alignment: NameAndDoc;
        /** How much padding to place between content */
        padding: NameAndDoc;
    };
    /** A vertical stack arragement */
    Stack: NameAndDoc & {
        /**
         * [formatted] A description of the stack for screen readers.
         * $count: total count
         */
        description: Template<['#count']>;
        /** Whether to align content at the start, center, or end of the horizontal axis */
        alignment: NameAndDoc;
        /** How much padding to place between content */
        padding: NameAndDoc;
    };
    /** A grid arrangement, like a table */
    Grid: NameAndDoc & {
        /**
         * [formatted] A description of the grid of content
         * $1: rows
         * $2: columns
         */
        description: Template<['rows', 'columns']>;
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
         * [formatted] A description of the free layout for screen readers.
         * $count: output count
         */
        description: Template<['#count']>;
    };
    /** Localized descriptions of transition styles */
    Easing: {
        /** [name] CSS linear */
        straight: NameText;
        /** [name] CSS ease-in */
        pokey: NameText;
        /** [name] CSS ease-in-out */
        cautious: NameText;
        /** [name] CSS ease-out */
        zippy: NameText;
    };
    /** Localized names of text change effects for Phrase's changing input */
    TextEffect: {
        /** [name] Backspace the old text to the shared prefix, then type the new text */
        edit: NameText;
        /** [name] Replace old characters with new ones in place, in random order */
        rewrite: NameText;
        /** [name] Slot-machine: cycle random characters of the text's dominant script until each locks in */
        random: NameText;
    };
    /** A data file structure */
    Source: NameAndDoc & {
        /** [name] The name of the data file */
        name: NameAndDoc;
        /** The data value to persist */
        value: NameAndDoc;
        /** When a program persists data too many times in a row, too quickly */
        DynamicEditLimitException: ExceptionText;
        /** When a program persists data too many times in a row */
        ReadOnlyEditException: ExceptionText;
        /** When a source is created with an empty name */
        EmptySourceNameException: ExceptionText;
        /** When a project has become too large to save. */
        ProjectSizeLimitException: ExceptionText;
    };
};

export { type OutputTexts as default };
