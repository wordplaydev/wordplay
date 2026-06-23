import Setting from '@db/settings/Setting';
import { z } from 'zod';
import type { Path } from '@nodes/Root';

/** A serialized node path (matches Root.Path): a sequence of (parent descriptor,
 *  child index) steps from the source root. */
const PathSchema = z.array(
    z.object({ type: z.string(), index: z.number().min(0) }),
);
const PathListSchema = z.array(PathSchema);

/** Per-project, per-source folded nodes, keyed by project ID then source index.
 *  Each value is a list of node paths (one per folded node), re-resolved against
 *  the current AST on load and after edits (unresolved paths are dropped). */
export type ProjectFolds = Record<string, Record<string, Path[]>>;

/**
 * Folded nodes per project source, persisted locally so a refresh restores which
 * code was collapsed. Device-specific (never synced), mirroring
 * {@link CaretsSetting} — folds are ephemeral UI state and shouldn't churn the
 * reactive project document.
 */
export const FoldsSetting = new Setting<ProjectFolds>(
    'folds',
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
                    (paths) => PathListSchema.safeParse(paths).success,
                ),
        )
            ? (value as ProjectFolds)
            : undefined,
    (current, value) => current === value,
);
