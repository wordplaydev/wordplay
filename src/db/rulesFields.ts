/**
 * The field lists `firestore.rules` names, mirrored so a client can send exactly
 * what a rule admits. A refusal is decided on *values*, not on which keys a
 * write mentions, which is why sending a whole document fails only once some
 * field the client doesn't own has fallen behind the server's copy — and why
 * the fix is to send less rather than to send fresher.
 *
 * A leaf module so `rulesFieldsSync.test.ts` can compare these against the rules
 * without standing up Firebase.
 */

/**
 * The chat fields a participant may change (#1349). The chat update rule is an
 * allowlist, so a write carrying anything else is refused outright — and a whole
 * document carries `moderation`, which the report and moderate callables rewrite
 * out from under every participant, and `v`, which a pre-v3 document has not
 * reached. The refusal is silent: the message is not sent, and keeps not being
 * sent.
 */
export const ChatWritableFields = [
    'messages',
    'unread',
    'participants',
] as const;

/**
 * The gallery fields the server owns, which a client write must never carry
 * (#1348). `galleryServerFieldsUnchanged()` requires each to be absent or
 * identical to what is stored, and the `galleryEdited` trigger rebuilds `words`
 * on every change — so a whole-document write is denied the moment the trigger
 * has moved on.
 *
 * `galleryServerFieldsInitial()` states the same list on a create, where there
 * is nothing stored to compare against: every guard here was walkable around by
 * putting the value in the new document instead (#1352).
 *
 * The two how-to fields are derived, not decided: a curator asks by setting
 * `howToExpandedVisibility` and `howToExpandedGalleries`, which stay theirs, and
 * the trigger answers with the viewer lists.
 */
export const GalleryServerOwnedFields = [
    'moderation',
    'moderatedAt',
    'flags',
    'words',
    'howToViewers',
    'howToViewersFlat',
] as const;

/**
 * The kit fields the server owns (#8), which a client write must never carry.
 *
 * `kitServerFieldsUnchanged()` requires each to be absent or identical to what is stored,
 * and `kitServerFieldsInitial()` states the same list on a create, where there is nothing
 * stored to compare against. `moderation` and `moderatedAt` are the listing decision and
 * `words` the search index the `kitEdited` trigger rebuilds; `aliases` is the sharpest of
 * the four, since a borrow resolves `@name/kit` through aliases as well as through `name`,
 * so a client that could write its own would make its kit answer to someone else's.
 *
 */
export const KitServerOwnedFields = [
    'moderation',
    'moderatedAt',
    'flags',
    'words',
    'aliases',
    'listed',
    'listedVersion',
] as const;

/**
 * The field sets the how-to update rule admits on their own. Owners,
 * collaborators and curators may write anything; everyone else gets these two
 * openings, so a change of just those has to be *sent* as just those —
 * `withFields` bumping `v` is enough to be refused. This refusal lands on
 * readers, whose replay writes the how-to's gallery too, which they may not do.
 */
export const HowToFields = {
    Social: ['social'],
    Placement: ['xcoord', 'ycoord'],
} as const;

export type HowToFieldSet = (typeof HowToFields)[keyof typeof HowToFields];
