import type { GateBlock, GateWarning } from '@components/output/gate';
import type { Database } from '@db/Database';
import type Project from '@db/projects/Project';
import type Locale from '@locale/Locale';
import detectPhotosensitivityRisks from '@runtime/detectPhotosensitivity';

/**
 * The photosensitivity risks of a read-only project, as gate warnings. Wraps the
 * static detector and maps each risk to a {@link GateWarning}, so the three
 * gating hosts (ProjectView, PlayView, OutputPreview) don't repeat the mapping.
 */
export function getPhotosensitivityWarnings(
    project: Project,
    database: Database,
    locales: Locale[],
): GateWarning[] {
    return [...detectPhotosensitivityRisks(project, database, locales)].map(
        (risk) => ({ kind: 'photosensitivity', risk }),
    );
}

/**
 * The acknowledgment state shared by everything that blocks a read-only project
 * on load. Given getters for the current warnings and blocks, it owns the
 * `acknowledged` flag and derives:
 *
 * - `gated` — whether playback must still be held (a block, or unacknowledged
 *   warnings);
 * - `pending` — the warnings to show, cleared once acknowledged so a host whose
 *   gate visibility isn't otherwise reactive (OutputView reads the non-reactive
 *   `evaluator.isStarted()`) still hides the gate.
 *
 * Construct with thunks over the host's own memoized `$derived` so detection
 * stays memoized: `new ContentGate(() => warnings)`.
 */
export class ContentGate {
    #warnings: () => GateWarning[];
    #blocks: () => GateBlock[];
    acknowledged = $state(false);

    constructor(
        warnings: () => GateWarning[],
        blocks: () => GateBlock[] = () => [],
    ) {
        this.#warnings = warnings;
        this.#blocks = blocks;
    }

    /** Warnings still awaiting acknowledgment (empty once acknowledged). */
    get pending(): GateWarning[] {
        return this.acknowledged ? [] : this.#warnings();
    }

    get blocks(): GateBlock[] {
        return this.#blocks();
    }

    /** True while playback must be held. */
    get gated(): boolean {
        return (
            this.#blocks().length > 0 ||
            (!this.acknowledged && this.#warnings().length > 0)
        );
    }

    /** Arrow so it can be passed directly as an `onacknowledge`/`onstart` prop. */
    acknowledge = () => {
        this.acknowledged = true;
    };

    /** Re-arm the gate when the previewed project changes. */
    reset() {
        this.acknowledged = false;
    }
}
