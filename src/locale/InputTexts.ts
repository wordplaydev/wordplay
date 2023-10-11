import type { NameAndDoc } from './Locale';

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
    };
    /** A stream of times since evaluation began */
    Time: NameAndDoc & {
        /** The frequency with which time should tick */
        frequency: NameAndDoc;
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
    /** A stream of color matrices from a camera sensor */
    Camera: NameAndDoc & {
        /** An optional width of the color matrices */
        width: NameAndDoc;
        /** An optional height of the color matrices */
        height: NameAndDoc;
        /** The frequdncy with which color matrices should be sensed */
        frequency: NameAndDoc;
    };
    /** A stream of phrases in places and rotations simulating physics */
    Motion: NameAndDoc & {
        /** The phrase template to use */
        type: NameAndDoc;
        /** Where the phrase should start */
        startplace: NameAndDoc;
        /** Starting x velocity */
        startvx: NameAndDoc;
        /** Starting y velocity */
        startvy: NameAndDoc;
        /** Starting z velocity */
        startvz: NameAndDoc;
        /** Starting angular velocity */
        startvangle: NameAndDoc;
        /** A constant x velocity to hold */
        vx: NameAndDoc;
        /** A constant y velocity to hold */
        vy: NameAndDoc;
        /** A constant z velocity to hold */
        vz: NameAndDoc;
        /** A constant angular velocity to hold */
        vangle: NameAndDoc;
        /** Mass, influencing collisions */
        mass: NameAndDoc;
        /** Gravity, influencing change in y velocity */
        gravity: NameAndDoc;
        /** A coefficient that dampens collisions */
        bounciness: NameAndDoc;
    };
    /** A stream of Place for easily moving Phrases by keyboard */
    Placement: NameAndDoc & {
        /** [ A starting place, how much to move when moved, whether to move on x-axis, whether to move on y-axes, whether to move on z-axis] */
        inputs: [NameAndDoc, NameAndDoc, NameAndDoc, NameAndDoc, NameAndDoc];
    };
    /** A stream of text messages from the audience */
    Chat: NameAndDoc;
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
            /** When the URL is not valid */
            invalid: string;
            /** The URL could not be accessed */
            unvailable: string;
            /** The response was not HTML */
            notHTML: string;
            /** There was no connection to the internet */
            noConnection: string;
            /** Too many requests to the same domain */
            limit: string;
        };
    };
};

export default InputTexts;
