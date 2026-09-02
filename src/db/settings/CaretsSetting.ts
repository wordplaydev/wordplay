import Setting from '@db/settings/Setting';
import type { Path } from '@nodes/Root';
import {
    CaretSchema,
    PathSchema,
    type SerializedCaret,
} from '@db/projects/ProjectSchemas';

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

/** Per-project, per-source selection anchors, keyed by project ID then source
 *  index. Each value is the node path of the far end of a multiple node
 *  selection; the near end is the caret itself, in {@link CaretsSetting}. */
export type ProjectCaretAnchors = Record<string, Record<string, Path>>;

/**
 * The other end of a multiple node selection per project source, persisted
 * locally so a refresh restores the whole selection rather than one node of it.
 *
 * A sibling setting rather than a widening of {@link CaretsSetting} because that
 * setting's value is validated against the project's own caret schema, which a
 * pair would no longer satisfy; adding a key is strictly additive, so an older
 * build ignores it and restores the caret exactly as it always did.
 */
export const CaretAnchorsSetting = new Setting<ProjectCaretAnchors>(
    'caretAnchors',
    true,
    {},
    (value) =>
        value != null &&
        value.constructor.name === 'Object' &&
        Object.values(value).every(
            (sources) =>
                sources != null &&
                sources.constructor.name === 'Object' &&
                Object.values(sources).every(
                    (path) => PathSchema.safeParse(path).success,
                ),
        )
            ? (value as ProjectCaretAnchors)
            : undefined,
    (current, value) => current === value,
);
