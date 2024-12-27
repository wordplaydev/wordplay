import { z } from 'zod';

/** Schema for the cursor position path */
const PathSchema = z.array(
    z.object({ type: z.string(), index: z.number().min(0) }),
);

/** Schema for a cursor position */
const CaretSchema = z.union([z.number().min(0), PathSchema]);

/** Schema for a source file in a project */
const SourceSchema = z.object({
    names: z.string(),
    code: z.string(),
    caret: CaretSchema,
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
const ProjectSchemaV2 = ProjectSchemaV1.omit({ v: true }).merge(
    /** A list of strings that are not considered personally identifiable by a creator */
    z.object({ v: z.literal(2), nonPII: z.array(z.string()) }),
);
/** v3 adds a nullable chat ID */
const ProjectSchemaV3 = ProjectSchemaV2.omit({ v: true }).merge(
    /** The chat that corresponds to this project */
    z.object({ v: z.literal(3), chat: z.nullable(z.string()) }),
);

/** How we store sources as JSON in databases */
export type SerializedCaret = z.infer<typeof CaretSchema>;
export type SerializedSource = z.infer<typeof SourceSchema>;

/** Inferred types for all project schema versions. */
type SerializedProjectV1 = z.infer<typeof ProjectSchemaV1>;
type SerializedProjectV2 = z.infer<typeof ProjectSchemaV2>;
type SerializedProjectV3 = z.infer<typeof ProjectSchemaV3>;

/** An alias for a project ID, to help clarify when a string is a project ID throughout the implementation. */
export type ProjectID = string;

/** The latest version of a project.  */
export const ProjectSchemaLatestVersion = 3;

/** Alias for the latest version of the schema. */
export const ProjectSchema = ProjectSchemaV3;

/** The type of the latest version of the project */
export type SerializedProject = SerializedProjectV3;

export type SerializedProjectUnknownVersion =
    | SerializedProjectV1
    | SerializedProjectV2
    | SerializedProjectV3;

/** Project updgrader */
export function upgradeProject(
    project: SerializedProjectUnknownVersion,
): SerializedProject {
    switch (project.v) {
        case 1:
            return upgradeProject({ ...project, v: 2, nonPII: [] });
        case 2:
            return upgradeProject({ ...project, v: 3, chat: null });
        case ProjectSchemaLatestVersion:
            return project;
        default:
            throw new Error('Unexpected project version ' + project);
    }
}
