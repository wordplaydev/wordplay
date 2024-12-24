// WARNING: We haven't set up a shared library for these types, so these must be synchronized between
// /src/functions/types.ts and /src/db/functions.ts any time you modify them.
export type EmailExistsArgs = string[];
export type EmailExistsResponse = Record<string, boolean> | undefined;
