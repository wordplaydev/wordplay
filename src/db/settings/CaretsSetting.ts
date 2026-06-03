import Setting from '@db/settings/Setting';
import { CaretSchema, type SerializedCaret } from '@db/projects/ProjectSchemas';

/** Per-project, per-source caret positions, keyed by project ID then source
 *  index. Each value is a {@link SerializedCaret}: a text offset, a [start, end]
 *  selection range, or a node-selection path. */
export type ProjectCarets = Record<string, Record<string, SerializedCaret>>;

/**
 * Caret positions per project source, persisted locally so a refresh restores
 * where the caret was left. Device-specific (never synced): carets are
 * ephemeral UI state. Mirrors {@link LayoutsSetting}, which stores per-project
 * layouts the same way, rather than living on the project document — keeping a
 * caret move from churning the reactive project (which would force a
 * re-analysis and concept-index rebuild on every pause; see ProjectView).
 */
export const CaretsSetting = new Setting<ProjectCarets>(
    'carets',
    true,
    {},
    (value) =>
        value != null &&
        value.constructor.name === 'Object' &&
        Object.values(value).every(
            (sources) =>
                sources != null &&
                sources.constructor.name === 'Object' &&
                // Reuse the project's caret schema to validate each entry, so a
                // malformed value never reaches a Caret.
                Object.values(sources).every(
                    (caret) => CaretSchema.safeParse(caret).success,
                ),
        )
            ? (value as ProjectCarets)
            : undefined,
    (current, value) => current === value,
);
