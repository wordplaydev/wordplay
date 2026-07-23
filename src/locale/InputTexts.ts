import type { WellKnownKey } from '@input/KeyboardKeys';
import type { ObjectCategory } from '@input/ObjectCategories';
import type { DocText, NameAndDoc } from '@locale/LocaleText';

type InputTexts = {
    /** The Random function, which generates random numbers */
    Random: NameAndDoc & {
        /** Min and max value inputs */
        inputs: [NameAndDoc, NameAndDoc];
    };
    /** A stream of names selected with the pointer or keyboard */
    Choice: NameAndDoc;
    /** A stream of button presses and up/down states */
    Button: NameAndDoc & { down: NameAndDoc };
    /** A stream of pointer positions */
    Pointer: NameAndDoc;
    /** A stream of keys pressed, configurable to only show up or down states */
    Key: NameAndDoc & {
        /** The optional key to listen for */
        key: NameAndDoc;
        /** The optional up or down state to notify about */
        down: NameAndDoc;
        /** [plain] Per-locale translations for the named keys `Key()` can emit
         *  (Space, Enter, ArrowUp, etc.). Keyed by the canonical English
         *  `KeyboardEvent.key` string from [KeyboardKeys.ts](src/input/KeyboardKeys.ts).
         *  Each value is an array whose first entry is this locale's display
         *  name (what `Key()` emits) and any remaining entries are accepted
         *  aliases for the `key` filter argument; the alias count may vary per
         *  locale (the locale tooling classifies these as name-like, see
         *  `classifyLocalePath`). The record's literal-key type pins every
         *  `WellKnownKey` as required so the locale verifier and `locales-fix`
         *  ensure full coverage in every locale. */
        keys: Record<WellKnownKey, string[]>;
    };
    /** A stream of times since evaluation began */
    Time: NameAndDoc & {
        /** The frequency with which time should tick */
        frequency: NameAndDoc;
        /** Whether the time should be relative or absolute */
        relative: NameAndDoc;
    };
    /** A stream of wall-clock date/time Moments in a chosen time zone and calendar */
    Now: NameAndDoc & {
        /** How often to emit a new Moment, in seconds, minutes, or hours */
        frequency: NameAndDoc;
        /** The optional IANA time zone to compute Moments in */
        timezone: NameAndDoc;
        /** The optional Unicode calendar to compute Moments in */
        calendar: NameAndDoc;
    };
    /** A single moment in time: a date, a time of day, a time zone, and a calendar */
    Moment: NameAndDoc & {
        /** The calendar year */
        year: NameAndDoc;
        /** The month of the year, starting at 1 */
        month: NameAndDoc;
        /** The day of the month */
        day: NameAndDoc;
        /** The hour of the day, 0–23 */
        hour: NameAndDoc;
        /** The minute of the hour */
        minute: NameAndDoc;
        /** The second of the minute */
        second: NameAndDoc;
        /** The millisecond of the second */
        millisecond: NameAndDoc;
        /** The IANA time zone identifier the moment is expressed in */
        timezone: NameAndDoc;
        /** The Unicode calendar identifier the moment is expressed in */
        calendar: NameAndDoc;
        /** The era the moment's year is in, informational */
        era: NameAndDoc;
        /** The week of the year, informational */
        week: NameAndDoc;
        /** The day of the week, 1 (Monday) through 7 (Sunday), informational */
        weekday: NameAndDoc;
        /** Conversions on Moment */
        conversion: {
            /** [formatted] See `en-US.json` for documentation */
            text: DocText;
        };
        /** Errors from invalid time zone or calendar identifiers, generating exception values */
        error: {
            /** [plain] The given time zone is not a valid IANA time zone identifier */
            timezone: string;
            /** [plain] The given calendar is not a supported Unicode calendar identifier */
            calendar: string;
        };
    };
    /** A stream of amplitude values */
    Volume: NameAndDoc & {
        /** The frequency with which amplitude should be sampled */
        frequency: NameAndDoc;
    };
    /** A stream of pitch values */
    Pitch: NameAndDoc & {
        /** The frequency with which pitch should be sampled */
        frequency: NameAndDoc;
    };
    /** A stream of recognized speech as text */
    Speech: NameAndDoc & {
        /** Whether to reset/clear the accumulated speech */
        reset: NameAndDoc;
        /** The BCP 47 language code for speech recognition (e.g., 'en-US', 'es-MX', 'zh-CN') */
        language: NameAndDoc;
        /** Maximum number of words to keep (sliding window) */
        limit: NameAndDoc;
        /** Errors that can happen during speech recognition, modeled after WebPage */
        error: {
            /** [plain] Browser does not support speech recognition */
            browserNotSupported: string;
            /** [plain] There was no connection to the internet */
            noConnection: string;
            /** [plain] Speech service denied or rate limited */
            serviceNotAllowed: string;
            /** [plain] Microphone permission denied */
            micNotAllowed: string;
            /** [plain] Microphone hardware not available */
            noMicrophone: string;
            /** [plain] Requested language not supported */
            languageNotSupported: string;
            /** [plain] Too many failed attempts to reconnect */
            limit: string;
        };
    };
    /** A stream of color matrices from a camera sensor */
    Camera: NameAndDoc & {
        /** An optional width of the color matrices */
        width: NameAndDoc;
        /** An optional height of the color matrices */
        height: NameAndDoc;
        /** The frequdncy with which color matrices should be sensed */
        frequency: NameAndDoc;
    };
    /** A stream that tracks a hand in the camera image using MediaPipe's hand landmarker */
    Hand: NameAndDoc & {
        /** The time between samples */
        frequency: NameAndDoc;
        /** The width (in pixels) at which to sample the camera */
        resolution: NameAndDoc;
    };
    /** A stream that tracks a face in the camera image using MediaPipe's face landmarker */
    Face: NameAndDoc & {
        /** The time between samples */
        frequency: NameAndDoc;
        /** The width (in pixels) at which to sample the camera */
        resolution: NameAndDoc;
    };
    /** A stream of things seen in the camera image, using MediaPipe's object detector */
    Objects: NameAndDoc & {
        /** [ the time between samples, the width in pixels at which to sample the camera, the optional kind of thing to look for, the minimum confidence, the maximum number of things ] */
        inputs: [NameAndDoc, NameAndDoc, NameAndDoc, NameAndDoc, NameAndDoc];
        /** [plain] Per-locale translations for the kinds of things `Objects()`
         *  can recognize (cat, cup, book, …). Keyed by the canonical English
         *  label from the detector model's own metadata, listed in
         *  [ObjectCategories.ts](src/input/ObjectCategories.ts). Each value is
         *  an array whose first entry is this locale's display name (what
         *  `Objects()` emits) and any remaining entries are accepted aliases
         *  for the `category` filter argument; the alias count may vary per
         *  locale (the locale tooling classifies these as name-like, see
         *  `classifyLocalePath`). The record's literal-key type pins every
         *  `ObjectCategory` as required so the locale verifier and
         *  `locales-fix` ensure full coverage in every locale. */
        categories: Record<ObjectCategory, string[]>;
    };
    /** A stream of animated outputs */
    Scene: NameAndDoc & {
        /** A list of outputs to show in sequence */
        outputs: NameAndDoc;
    };
    /** A stream of phrases in places and rotations simulating physics */
    Motion: NameAndDoc & {
        /** The initial place for the motion */
        place: NameAndDoc;
        /** The initial velocity for the motion */
        velocity: NameAndDoc;
        /** The next place for the motion, overriding physics */
        nextplace: NameAndDoc;
        /** The next velocity for the motion, overriding physics */
        nextvelocity: NameAndDoc;
    };
    /** A stream of Place for easily moving Phrases by keyboard */
    Placement: NameAndDoc & {
        /** [ A starting place, how much to move when moved, whether to move on x-axis, whether to move on y-axes, whether to move on z-axis] */
        inputs: [NameAndDoc, NameAndDoc, NameAndDoc, NameAndDoc, NameAndDoc];
    };
    /** A stream of text messages from the audience */
    Chat: NameAndDoc;
    /** A stream of Place values tracing the glyph outlines of text in a font face */
    Contour: NameAndDoc & {
        /** [ the text to outline, the font face, the em size in meters, the origin place, the font weight, whether to use italics, the spacing between points in meters, the order of the points ] */
        inputs: [
            NameAndDoc,
            NameAndDoc,
            NameAndDoc,
            NameAndDoc,
            NameAndDoc,
            NameAndDoc,
            NameAndDoc,
            NameAndDoc,
        ];
        /** Errors that can happen while tracing, generating exception values */
        error: {
            /** [plain] The font file couldn't be reached (no network) */
            connection: string;
            /** [plain] The font file wasn't found on the server */
            unavailable: string;
            /** [plain] The font file downloaded but couldn't be read */
            unreadable: string;
            /** [plain] The font loaded but its glyphs couldn't be outlined */
            outline: string;
        };
    };
    /** A stream of list of text from an HTML document indicated by a URL */
    Webpage: NameAndDoc & {
        /** The URL to retrieve */
        url: NameAndDoc;
        /** The CSS query for selecting content on the page */
        query: NameAndDoc;
        /** The frequency with which to request the page */
        frequency: NameAndDoc;
        /** Errors that can happen during page retrieval, generating exception values */
        error: {
            /** [plain] When the URL is not valid */
            invalid: string;
            /** [plain] The URL could not be accessed */
            unvailable: string;
            /** [plain] The response was not HTML */
            notHTML: string;
            /** [plain] There was no connection to the internet */
            noConnection: string;
            /** [plain] Too many requests to the same domain */
            limit: string;
        };
    };
    /** A stream of collisions between objects with matter. */
    Collision: NameAndDoc & {
        /** The subject of a collision */
        subject: NameAndDoc;
        /** The object of a collision. */
        object: NameAndDoc;
    };
    /** The values that come out of a collision stream. */
    Rebound: NameAndDoc & {
        /** The name a collision stream collided with. */
        subject: NameAndDoc;
        /** The name a collision stream collided with. */
        object: NameAndDoc;
        /** The direction of the collision, relative to the collision stream's subject. */
        direction: NameAndDoc;
    };
    /** A vector indicating a direction and magnitude. */
    Direction: NameAndDoc & {
        /** The direction and magnitude on the x-axis */
        x: NameAndDoc;
        /** The direction and magnitude on the y-axis */
        y: NameAndDoc;
    };
};

export { type InputTexts as default };
