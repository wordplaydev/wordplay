/**
 * Globally-serialized on-demand preview compute queue.
 *
 * Background: ProjectPreview / HowToPreview / GalleryPreview tiles used to
 * construct a fresh Evaluator per tile and run it synchronously inside a
 * `$derived.by`. Loading /projects with N projects therefore meant N
 * back-to-back full evaluations on the main render path — WebKit hung.
 *
 * The new pipeline:
 *  - The persisted Project carries a {@link SerializedPreview}; tiles read
 *    that directly and never evaluate.
 *  - ProjectView's live evaluator updates the persisted preview as the
 *    project's first frame settles.
 *  - For projects that have never been visited (and so have no persisted
 *    preview yet), tiles enqueue a compute here. The queue runs one job at
 *    a time, off the main render path, so even 50 simultaneous cache
 *    misses can't lock up the page.
 *
 * The queue intentionally has no concurrency — one job at a time. Idle
 * scheduling is used to start each job, falling back to setTimeout(0) when
 * `requestIdleCallback` is unavailable (Safari < 17).
 */

import {
    extractPreview,
    type ExtractedPreview,
} from '@components/app/extractPreview';
import type { Database } from '@db/Database';
import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import Evaluator from '@runtime/Evaluator';

import type { ProjectID } from '@db/projects/ProjectSchemas';

/** Pending or completed compute promises, keyed by project ID, so concurrent
 *  callers for the same project share a single compute. Entries are cleared
 *  after the promise settles. */
const pending = new Map<ProjectID, Promise<ExtractedPreview>>();

/** Single-slot worker chain — each new job awaits the previous one so that
 *  even bursty enqueues are processed sequentially. */
let workerChain: Promise<unknown> = Promise.resolve();

/** Yield to the browser before each job so the surrounding render frame
 *  can complete. requestIdleCallback when available, setTimeout otherwise. */
function yieldToBrowser(): Promise<void> {
    return new Promise((resolve) => {
        if (
            typeof window !== 'undefined' &&
            typeof window.requestIdleCallback === 'function'
        ) {
            window.requestIdleCallback(() => resolve(), { timeout: 1000 });
        } else if (typeof setTimeout !== 'undefined') {
            setTimeout(resolve, 0);
        } else {
            resolve();
        }
    });
}

/**
 * Enqueue a preview compute for the given project. Returns a promise
 * resolving with the extracted preview. Concurrent enqueues for the same
 * project share a single compute.
 *
 * The compute runs an ephemeral non-reactive Evaluator, calls
 * `getInitialValue()`, extracts the preview, and stops the evaluator. No
 * persistence happens here — the caller decides whether to write the result
 * (e.g. via {@link ProjectsDatabase.setAutoPreview}).
 */
export function enqueuePreviewCompute(
    project: Project,
    locales: Locales,
    db: Database,
): Promise<ExtractedPreview> {
    const id = project.getID();
    const existing = pending.get(id);
    if (existing) return existing;

    const job = workerChain.then(async () => {
        await yieldToBrowser();
        const evaluator = new Evaluator(
            project,
            db,
            locales.getLocales(),
            false,
        );
        try {
            const value = evaluator.getInitialValue();
            return extractPreview(evaluator, value, locales);
        } finally {
            evaluator.stop();
        }
    });

    pending.set(id, job);
    // Chain the next job to wait for this one, but swallow this job's
    // errors here so a single failure doesn't poison the whole queue.
    workerChain = job.catch(() => undefined);
    // Clear the dedupe slot once the job is fully settled so a subsequent
    // call recomputes (the project's sources may have changed since).
    void job.finally(() => {
        if (pending.get(id) === job) pending.delete(id);
    });
    return job;
}
