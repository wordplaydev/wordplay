/**
 * UPDATING THE PROJECT SCHEMA
 *
 * The key steps are:
 * - Define a new ProjectSchema below that modifies the previous schema with a new version number and new data.
 * - Update ProjectSchemaLatestVersion to the latest version number
 * - Add the previous most recent schema to SerializedProjectUnknownVersion
 * - Update SerializedProject to the new version of the schema
 * - Update upgradeProject() to include a case to upgrade the previous version to the new current version
 * - Update Project.ts to add any default values to newly created projects.
 */

import { z } from 'zod';

/** Schema for the cursor position path */
const PathSchema = z.array(
    z.object({ type: z.string(), index: z.number().min(0) }),
);

/** Schema for a cursor position */
const CaretSchema = z.union([
    z.number().min(0),
    PathSchema,
    z.array(z.number()).length(2),
]);

/** Schema for a source file in a project */
const SourceSchema = z.object({
    names: z.string(),
    code: z.string(),
    caret: CaretSchema,
});

/** Schema for a history entry */
const SourceCheckpointSchema = z.object({
    /** When the history was recorded */
    time: z.number(),
    /** The source files at the time of recording */
    sources: z.array(SourceSchema),
});

/** Define the schema for projects */
const ProjectSchemaV1 = z.object({
    /** The version of the project schema, used for keeping track of different versions of the project schema.  */
    v: z.literal(1),
    /** A very likely unique uuid4 string */
    id: z.string(),
    /** A single Translation, serialized */
    name: z.string(),
    /** The source files in the project */
    sources: z.array(SourceSchema),
    /** A list of locales on which this project is dependent. All ISO 639-1 languaage codes, followed by a -, followed by ISO 3166-2 region code: https://en.wikipedia.org/wiki/ISO_3166-2 */
    locales: z.array(z.string()),
    /** The Firestore user ID owner of this project */
    owner: z.nullable(z.string()),
    /** A list of Firestore user IDs that have privileges to edit this project */
    collaborators: z.array(z.string()),
    /** Whether this project can be viewed by anyone */
    public: z.boolean(),
    /** True if the project is listed in a creator's list of projects */
    listed: z.boolean(),
    /** True if the project is archived */
    archived: z.boolean(),
    /** When this was lasted edited, as a unix time in milliseconds */
    timestamp: z.number(),
    /** Whether this project has ever been saved to the cloud. Needed for syncing. */
    persisted: z.boolean(),
    /** An optional gallery ID, indicating which gallery this project is in. */
    gallery: z.nullable(z.string()),
    /** Moderation state */
    flags: z.object({
        dehumanization: z.nullable(z.boolean()),
        violence: z.nullable(z.boolean()),
        disclosure: z.nullable(z.boolean()),
        misinformation: z.nullable(z.boolean()),
    }),
});

/** v2 adds a PII approved list */
const ProjectSchemaV2 = ProjectSchemaV1.omit({ v: true }).extend(
    /** A list of strings that are not considered personally identifiable by a creator */
    z.object({ v: z.literal(2), nonPII: z.array(z.string()) }).shape,
);
/** v3 adds a nullable chat ID */
const ProjectSchemaV3 = ProjectSchemaV2.omit({ v: true }).extend(
    /** The chat that corresponds to this project */
    z.object({ v: z.literal(3), chat: z.nullable(z.string()) }).shape,
);
/** v2 adds a source file history */
const ProjectSchemaV4 = ProjectSchemaV3.omit({ v: true }).extend(
    /** A list of source files in the project */
    z.object({ v: z.literal(4), history: z.array(SourceCheckpointSchema) })
        .shape,
);
/** v5 adds viewers, who can view the project but not edit or comment, and commenters, who can participate in chats
 * and allows users who have a project in the gallery to restrict who can see their project to them and their teacher
 */
const ProjectSchemaV5 = ProjectSchemaV4.omit({ v: true }).extend(
    z.object({
        v: z.literal(5),
        /** Whether the owner restricted access to the project to only the gallery curator and their collaborators (i.e., gallery creators cannot see unless specifically added) */
        restrictedGallery: z.boolean(),
        /** A list of user IDs who can view */
        viewers: z.array(z.string()),
        /** A list of user IDs who can view and participate in chat */
        commenters: z.array(z.string()),
    }).shape,
);

/** Preview metadata used by ProjectPreview / HowToPreview / GalleryPreview tiles.
 *  Either auto-populated by ProjectView's live evaluator or by the on-demand
 *  fallback queue, or pinned by the user via the share dialog. */
const PreviewSchema = z.object({
    /** 'auto' = written by ProjectView's live evaluator or the on-demand
     *           fallback queue. Overwritten by either source.
     *  'manual' = pinned by the user in the share dialog. Never overwritten. */
    mode: z.union([z.literal('auto'), z.literal('manual')]),
    /** Single grapheme to display. */
    text: z.string(),
    /** Foreground color (CSS) for auto previews — null for manual. */
    foreground: z.nullable(z.string()),
    /** Background color (CSS) for auto previews — null for manual. */
    background: z.nullable(z.string()),
    /** Font face for auto previews — null for manual. */
    face: z.nullable(z.string()),
    /** Optional Character name to render instead of text. */
    characterName: z.nullable(z.string()),
});

/** v6 adds an optional preview metadata field. See {@link PreviewSchema}. */
const ProjectSchemaV6 = ProjectSchemaV5.omit({ v: true }).extend(
    z.object({
        v: z.literal(6),
        preview: PreviewSchema.optional(),
    }).shape,
);

/**
 * Schema for a single Lamport stamp on one field.
 *
 * The pair `(counter, writer)` is what gives concurrent edits a
 * deterministic order. See VectorClock.ts for the full explanation of
 * why we use Lamport stamps and what they protect against (issue #135).
 */
const FieldStampSchema = z.object({
    /** Lamport counter at time of write. Zero is the sentinel value
     *  meaning "no one has ever written this field" — paired with an
     *  empty writer string. The merge treats it as losing to anything. */
    c: z.number().min(0),
    /** Client ID (per-device UUID from Database.getWriterID) that
     *  performed the write. Used as the tiebreak when two stamps share
     *  the same counter — without it, concurrent writes to the same
     *  field could converge to different winners on different replicas. */
    w: z.string(),
});

/**
 * Schema for the per-project stamps record. One {@link FieldStampSchema}
 * per stamped field, plus a Lamport ceiling that records the highest
 * counter we've seen anywhere in this project. The ceiling is what each
 * new bump reads to compute its `max + 1` increment.
 */
const ProjectStampsSchema = z.object({
    /** Highest counter ever observed across all fields of this project,
     *  across all merges. Used by bumpField() as the basis for the
     *  next Lamport increment. */
    lamport: z.number().min(0),
    /** Stamps for fields that have ever been written. Fields not
     *  present here are treated as NeverWritten (counter 0) — they
     *  lose to anything with a real stamp during merge. */
    fields: z.record(z.string(), FieldStampSchema),
});

/**
 * v7: per-field Lamport stamps replace the scalar `timestamp` as the
 * source of truth for reconciling two copies of the same project.
 *
 * Before v7, a sync between two replicas compared whole-project
 * timestamps and overwrote the older side wholesale — clobbering
 * concurrent edits to unrelated fields (the bug in #135). With the
 * `stamps` field in place, the merge code in Project.mergeWith picks
 * the winning value field-by-field, so edits to disjoint fields
 * preserve both sides. The legacy `timestamp` is kept for backward
 * compatibility and as a fallback when both sides have NeverWritten
 * stamps on the same field (which only happens for v6→v7 migrations
 * that haven't been touched under v7 yet).
 *
 * Source identity for CRDT bindings (added in v8) is keyed by position
 * in the sources array. A future schema bump can introduce stable
 * per-source UUIDs if source reordering becomes a real use case.
 */
const ProjectSchemaV7 = ProjectSchemaV6.omit({ v: true }).extend(
    z.object({
        v: z.literal(7),
        /** Per-field stamps used by the per-field LWW merge. See VectorClock.ts. */
        stamps: ProjectStampsSchema,
    }).shape,
);

/**
 * v8: source code is merged via a Yjs CRDT, not via stamps.
 *
 * Where stamps (v7) handle "pick one" metadata fields like `name` and
 * `public`, source code calls for character-level convergence: two
 * devices typing in different functions should *both* see both sets of
 * keystrokes, not have one side's lost to a stamp comparison. That's
 * what a CRDT does — see ProjectCRDT.ts for the full story.
 *
 * The `crdt` field on the project doc stores a base64-encoded Yjs
 * snapshot of the merged state. Every project that's being actively
 * viewed in ProjectView gets a Y.Doc spun up against this snapshot
 * (see ProjectsDatabase.activateCRDT) — including solo projects,
 * because the #135 reproduction applies to single users on two
 * devices too. Projects the user isn't viewing don't pay the CRDT
 * runtime cost; their snapshot just sits in this field until the
 * next time someone opens them. New v8 projects start with
 * `crdt: null` and get a snapshot written on first save.
 *
 * `sources[i].code` continues to hold the materialized text — it stays
 * in sync with each Y.Text so older readers still get the right
 * content. The snapshot is the *authoritative* source of truth; the
 * materialized text is a view we maintain for backwards compatibility
 * and project-tile rendering.
 */
const ProjectSchemaV8 = ProjectSchemaV7.omit({ v: true }).extend(
    z.object({
        v: z.literal(8),
        /** Base64 of Y.encodeStateAsUpdateV2(doc), or null when CRDT is inactive. */
        crdt: z.nullable(z.string()),
    }).shape,
);

/** The latest version of a project.  */
export const ProjectSchemaLatestVersion = 8;

/** How we store sources as JSON in databases */
export type SerializedCaret = z.infer<typeof CaretSchema>;
export type SerializedSource = z.infer<typeof SourceSchema>;
export type SerializedSourceCheckpoint = z.infer<typeof SourceCheckpointSchema>;
export type SerializedPreview = z.infer<typeof PreviewSchema>;
export type SerializedFieldStamp = z.infer<typeof FieldStampSchema>;
export type SerializedProjectStamps = z.infer<typeof ProjectStampsSchema>;

/** An alias for a project ID, to help clarify when a string is a project ID throughout the implementation. */
export type ProjectID = string;

/** Alias for the latest version of the schema. */
export const ProjectSchema = ProjectSchemaV8;

/** The type of the latest version of the project */
export type SerializedProject = z.infer<typeof ProjectSchemaV8>;

export type SerializedProjectUnknownVersion =
    | z.infer<typeof ProjectSchemaV1>
    | z.infer<typeof ProjectSchemaV2>
    | z.infer<typeof ProjectSchemaV3>
    | z.infer<typeof ProjectSchemaV4>
    | z.infer<typeof ProjectSchemaV5>
    | z.infer<typeof ProjectSchemaV6>
    | z.infer<typeof ProjectSchemaV7>
    | SerializedProject;

/** Project updgrader */
export function upgradeProject(
    project: SerializedProjectUnknownVersion,
): SerializedProject {
    switch (project.v) {
        case 1:
            return upgradeProject({ ...project, v: 2, nonPII: [] });
        case 2:
            return upgradeProject({ ...project, v: 3, chat: null });
        case 3:
            return upgradeProject({ ...project, v: 4, history: [] });
        case 4:
            return upgradeProject({
                ...project,
                v: 5,
                restrictedGallery: false,
                viewers: [],
                commenters: [],
            });
        case 5:
            // Leave `preview: undefined` — the first read after migration
            // triggers an on-demand compute via the preview queue (see
            // src/db/projects/previewQueue.ts).
            return upgradeProject({ ...project, v: 6, preview: undefined });
        case 6:
            // v6→v7: initialize empty stamps. The existing scalar `timestamp`
            // is kept as a fallback when both sides' stamps are NeverWritten
            // (i.e., neither replica has touched the project under v7 yet) —
            // see ProjectsDatabase.track().
            return upgradeProject({
                ...project,
                v: 7,
                stamps: { lamport: 0, fields: {} },
            });
        case 7:
            // v7→v8: CRDT snapshot is null until the project activates
            // collaboration (has at least one collaborator). See ProjectCRDT
            // and ProjectsDatabase.
            return upgradeProject({ ...project, v: 8, crdt: null });
        case ProjectSchemaLatestVersion:
            return project;
        default:
            throw new Error('Unexpected project version ' + project);
    }
}

/**
 * Whether the serialized doc was written at a schema version older than the
 * current code expects. ProjectsDatabase uses this on the load path to flag
 * a freshly-deserialized project as unsaved so persist() will write the
 * upgraded shape back without waiting on an explicit user edit — without
 * this, a doc that hasn't been touched since a schema bump stays at the
 * old `v` indefinitely and any newer fields the migration backfilled
 * never reach Firestore.
 *
 * Defensive against malformed input: missing or non-numeric `v` returns
 * false ("no upgrade signal"), not true — we don't force a rewrite on
 * something we can't confidently identify as old.
 */
export function needsSchemaUpgrade(raw: unknown): boolean {
    if (typeof raw !== 'object' || raw === null) return false;
    const v = (raw as { v?: unknown }).v;
    return typeof v === 'number' && v < ProjectSchemaLatestVersion;
}
