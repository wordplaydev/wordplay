// WARNING: We haven't set up a shared library for these types, so these must be synchronized between
// /src/functions/functions.ts and /src/db/functions.ts any time you modify them.

// FUNCTION emailExists
export type EmailExistsInputs = string[];
export type EmailExistsOutput = Record<string, boolean> | undefined;

export type CreateClassInputs = {
    /** The uid of the teacher that should be the curator of the gallery created. */
    teacher: string;
    /** The name of the class */
    name: string;
    /** The description fo the class */
    description: string;
    /** Existing student uids to add */
    existing: string[];
    /** Information for the student accounts */
    students: {
        username: string;
        password: string;
        meta: string[];
    }[];
};

// FUNCTION createClass
export type CreateClassError = {
    kind: 'account' | 'limit' | 'generic';
    info: string;
};
export type CreateClassOutput = {
    /** The ID of the class created */
    classid: string | undefined;
    /** Any errors returned by the function */
    error: undefined | CreateClassError;
};
