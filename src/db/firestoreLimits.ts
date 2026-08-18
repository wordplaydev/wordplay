/**
 * How many gallery IDs a single `where('gallery', 'in', [...])` (or
 * `galleryId`) query may carry.
 *
 * The binding constraint is NOT Firestore's 30-value `in` cap but the
 * security rules' document-access budget: evaluating the projects/how-tos
 * read rule performs a `get()` of each matched doc's gallery, and Firestore
 * allows only 10 document-access calls per query request (repeat access to
 * the same doc is cached and free). A query spanning more distinct galleries
 * than the budget is denied ENTIRELY with permission-denied, which is
 * exactly what hit teachers curating many galleries (the current emulator
 * enforces a boundary of 20; the documented production limit for queries is
 * 10 — measured 2026-08). 8 leaves headroom for future rule edits that add
 * a get().
 *
 * Cost of smaller chunks is more concurrent listeners (one per chunk), which
 * stays trivial against Firestore's ~100-listeners-per-client guidance up to
 * several hundred galleries per user; revisit if a single account approaches
 * ~300 galleries.
 */
export const GALLERY_CHUNK_SIZE = 8;
