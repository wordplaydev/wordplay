/**
 * The five cloud-sync domains. Each name does triple duty and the three uses
 * MUST stay in lockstep:
 *  - the Firestore collection name (e.g. `doc(firestore, Domain.HowTos, id)`),
 *  - the key in the in-memory sync-status map (see `SyncDomainState`), and
 *  - the partition key in the durable `dirty` table (see `WordplayDexie`).
 *
 * Defining each string exactly once here is the single source of truth, so a
 * typo can't silently create a phantom collection/table/domain. Consumers
 * reference `Domain.X` (and the per-facade `XCollection` aliases derive from
 * it), and the `SyncDomain` type makes any stray literal a compile error.
 *
 * This module intentionally has no imports so it can be shared by both
 * `Database` and `WordplayDexie` without an import cycle.
 */
export const Domain = {
    Projects: 'projects',
    Galleries: 'galleries',
    Characters: 'characters',
    HowTos: 'howtos',
    Chats: 'chats',
} as const;

/** The cloud-sync domains, in initial-load priority order. */
export const SyncDomains = [
    Domain.Projects,
    Domain.Galleries,
    Domain.Characters,
    Domain.HowTos,
    Domain.Chats,
] as const;

export type SyncDomain = (typeof SyncDomains)[number];
