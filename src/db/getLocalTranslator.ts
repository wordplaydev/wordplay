import type { RawTranslator, TranslationProgress } from '@db/translateMarkup';
import { findLocalTranslationPair } from '@db/localTranslatorLanguages';

/** How many strings are translated at once. The API has no batch call — one per
 *  string — so this is the only thing between a hundred-message conversation
 *  and a hundred simultaneous calls into one model. Small, because the model is
 *  the bottleneck and queueing more buys memory rather than throughput. */
const Concurrency = 4;

/** How many loaded models to keep. Each holds real resources, and a chat
 *  re-translates the same pair every time a message arrives, so throwing one
 *  away between passes would pay the load cost over and over. */
const MaxInstances = 2;

const instances = new Map<string, Promise<TranslatorInstance>>();

/** Never the bare `Translator`: reading an undeclared global is a
 *  ReferenceError, not undefined. A function rather than a constant, so it runs
 *  at call time on the client and never freezes a prerender's answer — the
 *  shape, and the reason, of supportsIndexedDB. */
function getTranslatorAPI(): TranslatorFactory | undefined {
    return typeof globalThis === 'undefined'
        ? undefined
        : globalThis.Translator;
}

/** Whether this browser can translate on its own — Chrome and Edge desktop, not
 *  mobile, not a worker. */
export function supportsLocalTranslation(): boolean {
    return getTranslatorAPI() !== undefined;
}

/**
 * The browser's own translator, wrapped as a
 * [RawTranslator](src/db/translateMarkup.ts) so it is interchangeable with the
 * network one. Free, private — nothing leaves the device — and available
 * offline, for the language pairs this browser has a model for.
 *
 * `null` means "not this backend", never "translation failed", so the chooser
 * can fall through: no API, no pair this browser can do, a model that would
 * need a download the caller hasn't allowed, or a `create()` that rejected. A
 * pair it *can* do behaves like the network one — a string it wouldn't take
 * comes back `undefined` and keeps its source words, and only a wholly failed
 * batch is `null`.
 *
 * It ignores `context`. There is nowhere to put it: the on-device model takes a
 * string and nothing else, so the project names and docs that help the network
 * backend choose domain-appropriate words don't reach this one. That is the
 * quality traded for the privacy and the price.
 */
export default function getLocalTranslator(options?: {
    /** Whether a pair whose model isn't downloaded yet may be downloaded. Only
     *  true when called from inside a user gesture: the browser requires
     *  transient activation to start a download and rejects without it. */
    allowDownload?: boolean;
    progress?: (progress: TranslationProgress) => void;
    /** How much of the model has downloaded, from 0 to 1. */
    download?: (loaded: number) => void;
}): RawTranslator {
    return async (texts, from, to) => {
        const api = getTranslatorAPI();
        if (api === undefined) return null;

        const pair = await findLocalTranslationPair(
            api,
            from,
            to,
            options?.allowDownload === true,
        );
        if (pair === undefined) return null;

        let translator: TranslatorInstance;
        try {
            translator = await instanceFor(api, pair, options?.download);
        } catch (_) {
            // A download that needed a user gesture it didn't have, or a build
            // that lists the API but can't run it. Neither is worth
            // distinguishing: both mean "not this backend", and the caller's
            // job is to ask the next one.
            return null;
        }

        // Filled rather than sparse: `new Array(n)` leaves holes, which `filter`
        // skips, so counting how many kept their source words would quietly
        // answer zero.
        const results: (string | undefined)[] = texts.map(() => undefined);
        let succeeded = false;
        let done = 0;
        let kept = 0;
        let next = 0;

        async function worker(): Promise<void> {
            for (;;) {
                const index = next++;
                if (index >= texts.length) return;
                try {
                    results[index] = await translator.translate(texts[index]);
                    succeeded = true;
                } catch (_) {
                    // One string the model wouldn't take costs that string —
                    // the bargain getFirebaseTranslator makes with a failed
                    // chunk, and the reason RawTranslator permits a per-item
                    // undefined at all.
                    kept += 1;
                }
                done += 1;
                options?.progress?.({ done, total: texts.length, kept });
            }
        }

        await Promise.all(
            Array.from({ length: Math.min(Concurrency, texts.length) }, () =>
                worker(),
            ),
        );

        return succeeded ? results : null;
    };
}

async function instanceFor(
    api: TranslatorFactory,
    pair: { source: string; target: string },
    download: ((loaded: number) => void) | undefined,
): Promise<TranslatorInstance> {
    const key = `${pair.source}>${pair.target}`;
    const existing = instances.get(key);
    if (existing !== undefined) {
        // A Map keeps insertion order, so re-inserting makes this the most
        // recently used and leaves the oldest at the front.
        instances.delete(key);
        instances.set(key, existing);
        return existing;
    }
    const creating = api.create({
        sourceLanguage: pair.source,
        targetLanguage: pair.target,
        // Spread rather than `monitor: download && …`: under
        // exactOptionalPropertyTypes an optional property can be omitted but
        // not given undefined. Same shape as getFirebaseTranslator's context.
        ...(download === undefined
            ? {}
            : {
                  monitor: (monitor: TranslatorCreateMonitor) =>
                      monitor.addEventListener('downloadprogress', (event) =>
                          download(event.loaded),
                      ),
              }),
    });
    instances.set(key, creating);
    // A rejected create must never stay cached, or one missing user gesture is
    // inherited by every later call for the rest of the session.
    creating.catch(() => instances.delete(key));

    while (instances.size > MaxInstances) {
        const oldest = instances.keys().next().value;
        if (oldest === undefined || oldest === key) break;
        const evicted = instances.get(oldest);
        instances.delete(oldest);
        void evicted?.then((t) => t.destroy()).catch(() => undefined);
    }
    return creating;
}

/** Destroy every loaded model. For tests, and for a page that knows it is done
 *  translating; they are otherwise kept, because loading one is the whole cost. */
export function releaseLocalTranslators() {
    for (const [, instance] of instances)
        void instance.then((t) => t.destroy()).catch(() => undefined);
    instances.clear();
}
