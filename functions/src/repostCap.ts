/**
 * How many galleries a how-to may be reposted into (#1065). Mirrors
 * MaxHowToReposts in src/db/rulesFields.ts, since values cannot cross the
 * `shared-types` boundary, and the rules state one placement check per repost.
 * A module of its own with no imports, so the client's sync test can reach it
 * without dragging firebase-functions into the root type check.
 */
export const MaxHowToReposts = 5;
