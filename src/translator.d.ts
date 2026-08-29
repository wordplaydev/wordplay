// The Translator API (Chrome 138+, Edge 148+, desktop only, not in workers) is
// not in TypeScript's DOM library, so we declare what we use.
// https://developer.chrome.com/docs/ai/translator-api
//
// Declared as a global `var` rather than a `Window` member — the shape
// eyedropper.d.ts uses — for two reasons. The API is exposed on the global
// object, not specifically on `Window`; and the unit suite runs in node, where
// there is no `window` at all, so a test standing in for the API has to be able
// to write `globalThis.Translator` and put it back afterwards. The `| undefined`
// is what makes both of those type-check.
//
// Nothing may reference the bare `Translator` identifier: reading an undeclared
// global is a ReferenceError, not undefined. Go through `globalThis.Translator`,
// as src/db/getLocalTranslator.ts does, which is always safe.

/** Whether the browser can translate a language pair right now. `downloadable`
 *  means it could, after downloading a model — which needs transient user
 *  activation. `downloading` resolves on its own. */
type TranslatorAvailability =
    'unavailable' | 'downloadable' | 'downloading' | 'available';

/** BCP 47 tags naming a direction of translation. */
interface TranslatorLanguagePair {
    sourceLanguage: string;
    targetLanguage: string;
}

/** How much of the model has downloaded, from 0 to 1. */
interface TranslatorDownloadProgressEvent {
    readonly loaded: number;
}

/** What `create`'s `monitor` callback is handed, before the download starts.
 *  Structural rather than an `EventTarget` subtype so the one event we listen
 *  for is typed exactly. */
interface TranslatorCreateMonitor {
    addEventListener(
        type: 'downloadprogress',
        listener: (event: TranslatorDownloadProgressEvent) => void,
    ): void;
}

interface TranslatorCreateOptions extends TranslatorLanguagePair {
    monitor?: (monitor: TranslatorCreateMonitor) => void;
    signal?: AbortSignal;
}

/** One loaded model, for one direction. Holds real resources until `destroy()`. */
interface TranslatorInstance {
    translate(input: string): Promise<string>;
    destroy(): void;
}

interface TranslatorFactory {
    availability(pair: TranslatorLanguagePair): Promise<TranslatorAvailability>;
    /** Rejects when a model would have to be downloaded and this is not inside a
     *  user gesture, and where the API is present but unusable. */
    create(options: TranslatorCreateOptions): Promise<TranslatorInstance>;
}

declare var Translator: TranslatorFactory | undefined;
