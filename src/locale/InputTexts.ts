import type { NameAndDoc } from './Locale';

type InputTexts = {
    Random: NameAndDoc & {
        inputs: [NameAndDoc, NameAndDoc];
    };
    Choice: NameAndDoc;
    Button: NameAndDoc & { down: NameAndDoc };
    Pointer: NameAndDoc;
    Key: NameAndDoc & {
        key: NameAndDoc;
        down: NameAndDoc;
    };
    Time: NameAndDoc & { frequency: NameAndDoc };
    Volume: NameAndDoc & {
        frequency: NameAndDoc;
    };
    Pitch: NameAndDoc & {
        frequency: NameAndDoc;
    };
    Camera: NameAndDoc & {
        width: NameAndDoc;
        height: NameAndDoc;
        frequency: NameAndDoc;
    };
    Motion: NameAndDoc & {
        type: NameAndDoc;
        startplace: NameAndDoc;
        startvx: NameAndDoc;
        startvy: NameAndDoc;
        startvz: NameAndDoc;
        startvangle: NameAndDoc;
        vx: NameAndDoc;
        vy: NameAndDoc;
        vz: NameAndDoc;
        vangle: NameAndDoc;
        mass: NameAndDoc;
        gravity: NameAndDoc;
        bounciness: NameAndDoc;
    };
    Placement: NameAndDoc & {
        inputs: [NameAndDoc, NameAndDoc, NameAndDoc, NameAndDoc, NameAndDoc];
    };
    Webpage: NameAndDoc & {
        url: NameAndDoc;
        query: NameAndDoc;
        frequency: NameAndDoc;
        error: {
            /** When the URL is not valid */
            invalid: string;
            /** The URL could not be accessed */
            unvailable: string;
            /** The response was not HTML */
            notHTML: string;
            /** There was no connection to the internet */
            noConnection: string;
        };
    };
};

export default InputTexts;
